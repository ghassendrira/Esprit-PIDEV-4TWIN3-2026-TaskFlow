import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pandas as pd
from sklearn.ensemble import IsolationForest
from database import get_invoices, get_expenses, save_model_params
from datetime import datetime

def _safe_dict(row_dict: dict) -> dict:
    """Ensure all values in the dict are JSON-serializable."""
    import pandas as pd
    result = {}
    for k, v in row_dict.items():
        if isinstance(v, float) and (pd.isna(v)):
            result[k] = None
        elif hasattr(v, 'isoformat'):      # datetime / Timestamp
            result[k] = v.isoformat()
        elif hasattr(v, 'hex'):            # UUID
            result[k] = str(v)
        elif isinstance(v, (int, float, str, bool)) or v is None:
            result[k] = v
        else:
            result[k] = str(v)
    return result


def detect_anomalies(business_id: str) -> dict:
    inv_df = get_invoices(business_id)
    exp_df = get_expenses(business_id)

    inv_anomalies = detect_invoice_duplicates(inv_df)
    exp_anomalies = detect_expense_duplicates(exp_df)

    if len(inv_df) >= 10:
        iso_ids = detect_with_isolation_forest(inv_df)
        existing_ids = {item['id'] for item in inv_anomalies}
        for inv_id in iso_ids:
            if str(inv_id) not in existing_ids:
                row = inv_df[inv_df['id'].astype(str) == str(inv_id)]
                if row.empty:
                    continue
                row = row.iloc[0]
                inv_anomalies.append({
                    **_safe_dict(row.to_dict()),
                    'id': str(inv_id),
                    'invoiceNumber': str(row.get('invoiceNumber', f"INV-{str(inv_id)[:8]}")),
                    'isAnomaly': True,
                    'riskLevel': 'MEDIUM',
                    'message': '⚠️ Montant anormal (IA)',
                })

    inv_total = len(inv_df)
    exp_total = len(exp_df)
    inv_anomaly_n = len(inv_anomalies)
    exp_anomaly_n = len(exp_anomalies)

    try:
        save_model_params(business_id, 'ANOMALY', {
            'last_run': datetime.now().isoformat(),
            'inv_total': inv_total,
            'inv_anomalies': inv_anomaly_n,
            'exp_total': exp_total,
            'exp_anomalies': exp_anomaly_n,
        })
    except Exception as e:
        print(f"⚠️ Could not save model params: {e}")

    inv_ids = {str(item['id']) for item in inv_anomalies}
    exp_ids = {str(item['id']) for item in exp_anomalies}

    inv_normal = [
        {**_safe_dict(row.to_dict()), 'id': str(row['id']), 'isAnomaly': False, 'riskLevel': 'LOW', 'message': '✅ Normale'}
        for _, row in inv_df.iterrows() if str(row['id']) not in inv_ids
    ]
    exp_normal = [
        {**_safe_dict(row.to_dict()), 'id': str(row['id']), 'isAnomaly': False, 'riskLevel': 'LOW', 'message': '✅ Normale'}
        for _, row in exp_df.iterrows() if str(row['id']) not in exp_ids
    ]

    # Serialize anomaly rows
    inv_anomalies = [{**_safe_dict(a), 'id': str(a['id'])} for a in inv_anomalies]
    exp_anomalies = [{**_safe_dict(a), 'id': str(a['id'])} for a in exp_anomalies]

    return {
        'summary': {
            'totalInvoices': inv_total,
            'invoiceAnomalies': inv_anomaly_n,
            'totalExpenses': exp_total,
            'expenseAnomalies': exp_anomaly_n,
            'totalAnomalies': inv_anomaly_n + exp_anomaly_n,
        },
        'invoices': {'anomalies': inv_anomalies, 'normal': inv_normal},
        'expenses': {'anomalies': exp_anomalies, 'normal': exp_normal},
    }

def detect_invoice_duplicates(df: pd.DataFrame) -> list:
    anomalies = []
    if len(df) < 2:
        return anomalies
    df = df.copy()

    # 'amount' column (alias of totalAmount from get_invoices query)
    if 'amount' in df.columns:
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)
    elif 'totalAmount' in df.columns:
        df['amount'] = pd.to_numeric(df['totalAmount'], errors='coerce').fillna(0)
    else:
        df['amount'] = 0.0

    # date: our query aliases issueDate -> createdAt
    date_col = 'createdAt' if 'createdAt' in df.columns else ('issueDate' if 'issueDate' in df.columns else None)
    if date_col:
        df['_date_parsed'] = pd.to_datetime(df[date_col], errors='coerce')
    else:
        df['_date_parsed'] = pd.NaT

    # clientId column (case-insensitive lookup)
    col_map = {c.lower(): c for c in df.columns}
    client_col = col_map.get('clientid', col_map.get('client_id', None))

    for i in range(len(df)):
        for j in range(i + 1, len(df)):
            a = df.iloc[i]
            b = df.iloc[j]

            same_client = (client_col is None) or (a[client_col] == b[client_col])
            same_amount = abs(float(a['amount']) - float(b['amount'])) < 0.01

            date_a = a['_date_parsed']
            date_b = b['_date_parsed']
            if pd.isna(date_a) or pd.isna(date_b):
                same_date = False
            else:
                same_date = abs((date_a - date_b).days) <= 1

            if same_client and same_amount and same_date:
                for row in (a, b):
                    anomalies.append({
                        **row.to_dict(),
                        'id': str(row['id']),
                        'invoiceNumber': str(row.get('invoiceNumber', f"INV-{str(row['id'])[:8]}")),
                        'isAnomaly': True,
                        'riskLevel': 'HIGH',
                        'message': '⚠️ Facture dupliquée',
                    })
    unique = {item['id']: item for item in anomalies}
    return list(unique.values())

def detect_expense_duplicates(df: pd.DataFrame) -> list:
    anomalies = []
    if len(df) < 2:
        return anomalies
    df = df.copy()
    df['amount'] = pd.to_numeric(df['amount'].fillna(0), errors='coerce').fillna(0)

    # Normalize column names (psycopg2/SQLAlchemy may lowercase them)
    col_map = {c.lower(): c for c in df.columns}
    created_by_col = col_map.get('createdby', col_map.get('created_by', None))
    category_col   = col_map.get('categoryid', col_map.get('category_id', None))

    # Parse date — use 'date' column, fallback to 'createdAt'
    date_col = 'date' if 'date' in df.columns else 'createdAt'
    df['_date_parsed'] = pd.to_datetime(df[date_col], errors='coerce')

    for i in range(len(df)):
        for j in range(i + 1, len(df)):
            a = df.iloc[i]
            b = df.iloc[j]

            same_user   = (created_by_col is None) or (a[created_by_col] == b[created_by_col])
            same_amount = abs(float(a['amount']) - float(b['amount'])) < 0.01
            same_cat    = (category_col is None) or (a[category_col] == b[category_col])

            date_a = a['_date_parsed']
            date_b = b['_date_parsed']
            if pd.isna(date_a) or pd.isna(date_b):
                same_date = False
            else:
                same_date = abs((date_a - date_b).days) <= 1

            if same_user and same_amount and same_cat and same_date:
                anomalies.append({
                    **a.to_dict(),
                    'id': str(a['id']),
                    'isAnomaly': True,
                    'riskLevel': 'HIGH',
                    'message': '⚠️ Dépense dupliquée',
                })
                anomalies.append({
                    **b.to_dict(),
                    'id': str(b['id']),
                    'isAnomaly': True,
                    'riskLevel': 'HIGH',
                    'message': '⚠️ Dépense dupliquée',
                })
    unique = {item['id']: item for item in anomalies}
    return list(unique.values())

def detect_with_isolation_forest(df: pd.DataFrame) -> list:
    if df.empty:
        return []
    df = df.copy()
    if 'amount' not in df.columns:
        df['amount'] = pd.to_numeric(df.get('totalTTC', df.get('total', 0)), errors='coerce').fillna(0)
    else:
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0)
    iso = IsolationForest(contamination=0.05, random_state=42)
    labels = iso.fit_predict(df[['amount']])
    return [str(df.iloc[i]['id']) for i, label in enumerate(labels) if label == -1]


if __name__ == "__main__":
    # Test with mock data instead of DB
    import pandas as pd
    from datetime import datetime, timedelta

    # Mock invoice data
    mock_invoices = pd.DataFrame({
        'id': ['inv1', 'inv2', 'inv3', 'inv4', 'inv5'],
        'businessId': ['test-business-123'] * 5,
        'clientId': ['client1', 'client1', 'client2', 'client3', 'client4'],
        'totalTTC': [1000.0, 1000.0, 2000.0, 1500.0, 500.0],
        'total': [1000.0, 1000.0, 2000.0, 1500.0, 500.0],
        'status': ['paid'] * 5,
        'createdAt': [datetime.now() - timedelta(days=i*2) for i in range(5)],
        'dueDate': [datetime.now() + timedelta(days=30) for _ in range(5)],
        'client_name': ['Client A', 'Client A', 'Client B', 'Client C', 'Client D'],
        'client_email': ['a@test.com', 'a@test.com', 'b@test.com', 'c@test.com', 'd@test.com']
    })

    # Mock expense data
    mock_expenses = pd.DataFrame({
        'id': ['exp1', 'exp2', 'exp3'],
        'businessId': ['test-business-123'] * 3,
        'createdBy': ['user1', 'user1', 'user2'],
        'amount': [500.0, 500.0, 300.0],
        'date': [datetime.now() - timedelta(days=i*3) for i in range(3)],
        'description': ['Office supplies', 'Office supplies', 'Travel'],
        'status': ['approved'] * 3,
        'categoryId': ['cat1', 'cat1', 'cat2'],
        'createdAt': [datetime.now() - timedelta(days=i*3) for i in range(3)],
        'category_name': ['Supplies', 'Supplies', 'Travel']
    })

    # Patch the functions before calling detect_anomalies
    original_get_invoices = get_invoices
    original_get_expenses = get_expenses
    original_save_model_params = save_model_params
    def get_invoices_mock(business_id: str) -> pd.DataFrame:
        return mock_invoices
    def get_expenses_mock(business_id: str) -> pd.DataFrame:
        return mock_expenses
    def save_model_params_mock(*args, **kwargs):
        pass  # Do nothing for testing
    globals()['get_invoices'] = get_invoices_mock
    globals()['get_expenses'] = get_expenses_mock
    globals()['save_model_params'] = save_model_params_mock

    try:
        result = detect_anomalies("test-business-123")
        print("Anomaly Detection Test Result with Mock Data:")
        print(result)
    finally:
        # Restore
        globals()['get_invoices'] = original_get_invoices
        globals()['get_expenses'] = original_get_expenses
        globals()['save_model_params'] = original_save_model_params
