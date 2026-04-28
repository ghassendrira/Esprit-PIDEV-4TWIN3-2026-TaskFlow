import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from models.segmentation import train_segmentation
from models.cashflow import train_cashflow
from models.anomaly import detect_anomalies
from database import init_table_names, discover_tables, get_columns, TABLE_NAMES

load_dotenv()

app = FastAPI(title='TaskFlow ML Service')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


def clean_header(value: str) -> str:
    if not value:
        raise HTTPException(status_code=400, detail='x-tenant-id manquant')
    return value.split(',')[0].strip()


# ✅ STARTUP EVENT - Initialize table discovery
@app.on_event("startup")
def startup_event():
    print("🚀 ML Service starting...")
    try:
        init_table_names()
        print("✅ ML Service ready! Database tables configured.")
    except Exception as e:
        print(f"⚠️  ML Service startup warning: {e}")
        print("⚠️  Falling back to default table names")


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
def get_segmentation(x_tenant_id: str = Header(...)):
    business_id = clean_header(x_tenant_id)
    return train_segmentation(business_id)


@app.get('/ml/cashflow')
def get_cashflow(x_tenant_id: str = Header(...)):
    business_id = clean_header(x_tenant_id)
    return train_cashflow(business_id)


@app.get('/ml/anomalies')
def get_anomalies(x_tenant_id: str = Header(...)):
    business_id = clean_header(x_tenant_id)
    return detect_anomalies(business_id)


@app.get('/health')
def health():
    return {'status': '✅ Running', 'tables_configured': bool(TABLE_NAMES)}


if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('ML_PORT', '8000'))
    uvicorn.run(app, host='0.0.0.0', port=port)
