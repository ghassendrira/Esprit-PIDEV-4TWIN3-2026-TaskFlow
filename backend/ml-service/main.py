import os
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler
from fastapi import FastAPI, HTTPException, Header
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from models.segmentation import train_segmentation
from models.cashflow import train_cashflow
from models.anomaly import detect_anomalies
from models.prediction import predict_risk
from database import (
    init_table_names, engine, discover_tables, get_columns,
    TABLE_NAMES, get_invoices, invoice_engine,
)

load_dotenv()

app = FastAPI(title='TaskFlow ML Service')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


# ============================================================================
# REQUEST MODELS
# ============================================================================

class SegmentRequest(BaseModel):
    recency: float
    frequency: float
    monetary: float
    business_id: str


# ============================================================================
# SHARED HELPERS
# ============================================================================

def get_business_id_from_req(x_tenant_id: str = None, x_business_id: str = None, businessId: str = None) -> str:
    val = x_business_id or businessId or x_tenant_id
    if not val:
        raise HTTPException(status_code=400, detail='Business ID manquant')
    return val.split(',')[0].strip()

def clean_header(value: str) -> str:
    if not value:
        raise HTTPException(status_code=400, detail='x-tenant-id manquant')
    return value.split(',')[0].strip()


def _assign_labels(centers: np.ndarray) -> dict:
    """Assign semantic labels to KMeans clusters based on RFM scores."""
    scores = {i: (-centers[i][0] + centers[i][1] + centers[i][2]) for i in range(len(centers))}
    ordered = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    label_map = [
        {'label': 'Champion', 'color': '#22c55e', 'emoji': '⭐', 'action': 'Offrir avantages premium'},
        {'label': 'Fidèle', 'color': '#3b82f6', 'emoji': '💙', 'action': 'Maintenir la relation'},
        {'label': 'À Risque', 'color': '#f97316', 'emoji': '⚠️', 'action': 'Relance commerciale urgente'},
        {'label': 'Perdu', 'color': '#ef4444', 'emoji': '❌', 'action': 'Campagne de réactivation'},
    ]
    result = {}
    for rank, (cluster_id, _) in enumerate(ordered):
        result[str(cluster_id)] = label_map[rank] if rank < len(label_map) else {
            'label': f'Segment {rank}', 'color': '#64748b', 'emoji': '❓', 'action': ''
        }
    return result


def _compute_rfm_for_clients(clients_df: pd.DataFrame, invoices_df: pd.DataFrame) -> pd.DataFrame:
    """Compute RFM features for all clients. Returns a DataFrame."""
    if clients_df.empty:
        return pd.DataFrame()
    now = pd.Timestamp.now()
    clients_df = clients_df.copy()
    clients_df['last_invoice_date'] = pd.to_datetime(clients_df['last_invoice_date'], errors='coerce')
    clients_df['recency'] = (now - clients_df['last_invoice_date']).dt.days.fillna(9999)
    clients_df['frequency'] = clients_df['invoice_count'].fillna(0)
    clients_df['monetary'] = clients_df['total_monetary'].fillna(0)
    return clients_df


def _cluster_clients(df: pd.DataFrame) -> pd.DataFrame:
    """Apply KMeans clustering and assign semantic labels based on cluster scores."""
    scaler = MinMaxScaler()
    X = scaler.fit_transform(df[['recency', 'frequency', 'monetary']])
    n_clusters = min(4, len(df))
    if n_clusters < 2:
        df['cluster'] = 0
        df['cluster_score'] = 0
    else:
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        df['cluster'] = kmeans.fit_predict(X)
        centers = scaler.transform(df[['recency', 'frequency', 'monetary']])
        df['cluster_score'] = -centers[:, 0] + centers[:, 1] + centers[:, 2]
    # Assign labels by score ranking
    label_map = {
        'Champion': ('⭐', 'Offrir avantages premium'),
        'Fidèle': ('💙', 'Maintenir la relation'),
        'À Risque': ('⚠️', 'Relance commerciale urgente'),
        'Perdu': ('❌', 'Campagne de réactivation'),
    }
    cluster_scores = df.groupby('cluster')['cluster_score'].mean().to_dict()
    sorted_clusters = sorted(cluster_scores.items(), key=lambda x: x[1], reverse=True)
    cluster_to_label = {cid: lbl for rank, (cid, _) in enumerate(sorted_clusters) if (lbl := list(label_map.keys())[rank])}
    def _get_label(row):
        cid = row['cluster']
        lbl = cluster_to_label.get(cid, 'Inconnu')
        emoji, action = label_map.get(lbl, ('❓', ''))
        return pd.Series({'label': lbl, 'emoji': emoji, 'action': action})
    labeled = df.apply(_get_label, axis=1, result_type='expand')
    df['label'] = labeled['label']
    df['emoji'] = labeled['emoji']
    df['action'] = labeled['action']
    return df



def _segment_for_client(row: pd.Series, labels: dict) -> dict:
    """Get segment info for a single client row."""
    cluster_key = str(row.get('cluster', 0))
    label_info = labels.get(cluster_key, {'label': 'Inconnu', 'color': '#64748b', 'emoji': '❓', 'action': ''})
    return {
        'client_id': str(row['id']),
        'segment': int(row.get('cluster', 0)),
        'segment_label': label_info.get('label', 'Inconnu'),
        'color': label_info.get('color', '#64748b'),
        'emoji': label_info.get('emoji', '❓'),
        'action': label_info.get('action', ''),
    }


def _get_clients_df(business_id: str) -> pd.DataFrame:
    """Fetch clients with invoice aggregates for a business."""
    client_query = pd.read_sql(text("""
        SELECT id, "businessId", name, email, "createdAt"
        FROM "Client"
        WHERE "businessId" = :bid AND "deletedAt" IS NULL
    """), engine, params={'bid': business_id})

    if client_query.empty:
        return pd.DataFrame()

    invoice_query = pd.read_sql(text("""
        SELECT "clientId", "totalAmount", "createdAt" AS invoice_date
        FROM "Invoice"
        WHERE "businessId" = :bid AND "deletedAt" IS NULL
    """), invoice_engine, params={'bid': business_id})

    if invoice_query.empty:
        client_query['invoice_count'] = 0
        client_query['total_monetary'] = 0.0
        client_query['last_invoice_date'] = pd.NaT
    else:
        agg = invoice_query.groupby('clientId').agg(
            invoice_count=('totalAmount', 'count'),
            total_monetary=('totalAmount', 'sum'),
            last_invoice_date=('invoice_date', 'max'),
        ).reset_index()
        client_query = client_query.merge(agg, left_on='id', right_on='clientId', how='left')
        client_query['invoice_count'] = client_query['invoice_count'].fillna(0).astype(int)
        client_query['total_monetary'] = client_query['total_monetary'].fillna(0.0)
        client_query['last_invoice_date'] = pd.to_datetime(client_query['last_invoice_date'])

     # Convert UUID objects to strings for comparison
    client_query['id'] = client_query['id'].astype(str)

    return client_query


# ✅ MODULE-LEVEL INIT - Tables discovered BEFORE any route handler runs
try:
    init_table_names()
    print(f"✅ Tables discovered: {TABLE_NAMES}")
except Exception as e:
    print(f"⚠️ Table discovery failed: {e}, using defaults")
    TABLE_NAMES = {
          'client': '"Client"',
          'invoice': '"Invoice"',
          'expense': '"Expense"',
          'business': '"Business"',
       }
print(f"✅ TABLE_NAMES: {TABLE_NAMES}")

# ✅ STARTUP EVENT - Log only (tables already initialized above)
@app.on_event("startup")
def startup_event():
    print("🚀 ML Service fully ready.")


@app.get('/')
def root():
    return {'status': '✅ Running', 'tables': TABLE_NAMES}


# ✅ DEBUG ENDPOINT - Show discovered tables and columns
@app.get('/debug/tables')
def debug_tables():
    """Debug endpoint to inspect discovered tables and their columns"""
    try:
        all_tables = discover_tables()
        details = {}
        
        for table in all_tables:
            try:
                cols = get_columns(table)
                details[table] = cols
            except Exception as e:
                details[table] = f"Error: {str(e)}"
        
        return {
            "status": "✅ Table discovery successful",
            "tables": all_tables,
            "details": details,
            "mapping": TABLE_NAMES,
            "count": len(all_tables)
        }
    except Exception as e:
        return {
            "status": "❌ Error",
            "error": str(e),
            "mapping": TABLE_NAMES
        }


@app.get('/ml/segmentation')
def get_segmentation(x_tenant_id: str = Header(None), x_business_id: str = Header(None), businessId: str = None):
    business_id = get_business_id_from_req(x_tenant_id, x_business_id, businessId)
    return train_segmentation(business_id)


# ============================================================================
# PER-CLIENT SEGMENTATION (called by frontend segmentation component)
# ============================================================================

@app.post('/ml/segmentation/{client_id}')
def segment_client(client_id: str, request: SegmentRequest, x_tenant_id: str = Header(...)):
    """Segment a single client using RFM + KMeans clustering for their business."""
    business_id = request.business_id
    try:
        # Fetch all clients + invoices for the business
        clients_df = _get_clients_df(business_id)
        if clients_df.empty:
            return {
                 'client_id': client_id,
                 'segment': -1,
                 'segment_label': 'Aucun client',
                 'color': '#64748b',
                 'emoji': '❓',
                 'action': '—',
            }

        # Compute RFM for all clients
        rfm_df = _compute_rfm_for_clients(clients_df, pd.DataFrame())

        # Cluster
        if len(rfm_df) >= 4:
            rfm_df = _cluster_clients(rfm_df)
        else:
            # Heuristic fallback for small datasets
            now = pd.Timestamp.now()
            rfm_df['recency_days'] = (now - rfm_df['last_invoice_date']).dt.days.fillna(9999)
            labels = {}
            for idx, row in rfm_df.iterrows():
                rec = row['recency_days']
                freq = row['frequency']
                if rec <= 30 and freq >= 3:
                    lbl = 'Champion'
                elif rec <= 90 and freq >= 2:
                    lbl = 'Fidèle'
                elif rec <= 180:
                    lbl = 'À Risque'
                else:
                    lbl = 'Perdu'
                rfm_df.at[idx, 'cluster'] = 0  # placeholder
                rfm_df.at[idx, 'cluster_label'] = {'label': lbl, 'color': '#64748b', 'emoji': '❓', 'action': ''}
            labels = {'0': {}}

        # Find the requested client
        client_row = rfm_df[rfm_df['id'] == client_id]
        if client_row.empty:
            return {
                 'client_id': client_id,
                 'segment': -1,
                 'segment_label': 'Client inconnu',
                 'color': '#64748b',
                 'emoji': '❓',
                 'action': '—',
            }

        row = client_row.iloc[0]
        # cluster_info removed, using label directly
        return {
             'client_id': client_id,
             'segment': int(row.get('cluster', 0)),
             'segment_label': row.get('label', 'Inconnu'),
             'color': '#64748b',
             'emoji': row.get('emoji', '❓'),
             'action': row.get('action', ''),
        }
    except Exception as e:
        return {
             'client_id': client_id,
             'segment': -1,
             'segment_label': 'Erreur ML',
             'color': '#ef4444',
             'emoji': '⚠️',
             'action': f'Erreur: {str(e)[:80]}',
        }


@app.get('/ml/cashflow')
def get_cashflow(x_tenant_id: str = Header(None), x_business_id: str = Header(None), businessId: str = None):
    business_id = get_business_id_from_req(x_tenant_id, x_business_id, businessId)
    
    # Bypass cache to ensure real-time auto-updates when database changes
    # existing = get_model_params(business_id, 'CASHFLOW')
    # if existing:
    #     return existing['params']

    # Train new model in real-time
    try:
        from models.cashflow import train_cashflow
        result = train_cashflow(business_id)
        return result
    except Exception as e:
        print(f"❌ Error in get_cashflow: {e}")
        return {}


@app.get('/ml/anomalies')
def get_anomalies(x_tenant_id: str = Header(None), x_business_id: str = Header(None), businessId: str = None):
    business_id = get_business_id_from_req(x_tenant_id, x_business_id, businessId)
    return detect_anomalies(business_id)


@app.get('/ml/risk')
def get_all_risks(x_tenant_id: str = Header(None), x_business_id: str = Header(None), businessId: str = None):
    """Get payment risk assessment for all invoices"""
    business_id = get_business_id_from_req(x_tenant_id, x_business_id, businessId)
    try:
        invoices_df = get_invoices(business_id)
        if invoices_df.empty:
            return {'invoices': [], 'total': 0, 'message': 'No invoices found'}
        
        # Always recalibrate — each business has its own average amount
        from models.prediction import risk_assessor
        risk_assessor.train(invoices_df)
            
        invoices = invoices_df.to_dict('records')
        risks = []
        for inv in invoices:
            amount = float(inv.get('amount', 0))
            risk_data = predict_risk(inv)
            
            risk_level_raw = risk_data.get('risk_level', 'low')
            risk_level = risk_level_raw.upper() if isinstance(risk_level_raw, str) else 'LOW'

            risks.append({
                'id': str(inv.get('id')),
                'invoiceId': str(inv.get('id')),
                'invoiceNumber': f"INV-{str(inv.get('id'))[:8]}",
                'clientName': inv.get('client_name', 'Unknown'),
                'amount': amount,
                'totalAmount': amount,
                'totalTTC': amount,
                'status': inv.get('status', ''),
                'dueDate': str(inv.get('dueDate', '')),
                'createdAt': str(inv.get('createdAt', '')),
                'riskLevel': risk_level,
                'riskScore': risk_data.get('risk_score', 0),
                'reason': risk_data.get('reason', ''),
                'message': risk_data.get('reason', ''),
                'factors': risk_data.get('factors', {}),
                'risk_level': risk_level,
                'risk_score': risk_data.get('risk_score', 0)
            })
            
        high = sum(1 for r in risks if r['riskLevel'] == 'HIGH')
        medium = sum(1 for r in risks if r['riskLevel'] == 'MEDIUM')
        low = sum(1 for r in risks if r['riskLevel'] == 'LOW')

        return {
            'invoices': risks,
            'total': len(risks),
            'stats': {
                'total': len(risks),
                'high': high,
                'medium': medium,
                'low': low
            },
            'message': '✅ Risk assessment completed'
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'error': str(e), 'invoices': [], 'stats': {'total':0, 'high':0, 'medium':0, 'low':0}}


@app.get('/ml/risk/{invoice_id}')
def get_invoice_risk(invoice_id: str, x_tenant_id: str = Header(None), x_business_id: str = Header(None), businessId: str = None):
    """Get payment risk for specific invoice"""
    business_id = get_business_id_from_req(x_tenant_id, x_business_id, businessId)
    try:
        invoices_df = get_invoices(business_id)
        if invoices_df.empty:
            return {'error': 'Invoice not found', 'invoiceId': invoice_id}
            
        # Train ML model on the fly
        from models.prediction import risk_assessor
        if not risk_assessor.is_trained:
            risk_assessor.train(invoices_df)
            
        invoices = invoices_df.to_dict('records')
        invoice = next((inv for inv in invoices if str(inv.get('id')) == invoice_id), None)
        
        if not invoice:
            return {'error': 'Invoice not found', 'invoiceId': invoice_id}
        
        amount = float(invoice.get('amount', 0))
        risk_data = predict_risk(invoice)
        
        risk_level_raw = risk_data.get('risk_level', 'low')
        risk_level = risk_level_raw.upper() if isinstance(risk_level_raw, str) else 'LOW'
        
        return {
            'invoice_id': invoice_id,
            'invoiceId': invoice_id,
            'clientName': invoice.get('client_name', 'Unknown'),
            'amount': amount,
            'riskLevel': risk_level,
            'riskScore': risk_data.get('risk_score', 0),
            'reason': risk_data.get('reason'),
            'risk_level': risk_level,
            'is_anomaly': risk_data.get('risk_score', 0) > 0.8,
            'anomaly_score': risk_data.get('risk_score', 0),
            'message': risk_data.get('reason') or '✅ Risk assessment completed'
        }
    except Exception as e:
        return {'error': str(e), 'invoiceId': invoice_id}


@app.get('/health')
def health():
    return {'status': '✅ Running', 'tables_configured': bool(TABLE_NAMES), 'tables': TABLE_NAMES}


if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('ML_PORT', '8000'))
    uvicorn.run(app, host='0.0.0.0', port=port)
