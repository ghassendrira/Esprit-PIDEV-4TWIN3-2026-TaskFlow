import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pandas as pd
from sklearn.ensemble import IsolationForest
from database import get_invoices, get_expenses, save_model_params
from datetime import datetime

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
                row = inv_df[inv_df['id'] == inv_id].iloc[0]
                inv_anomalies.append({
                    **row.to_dict(),
                    'id': str(inv_id),
                    'isAnomaly': True,
                    'riskLevel': 'MEDIUM',
                    'message': '⚠️ Montant anormal',
                })

    inv_total = len(inv_df)
    exp_total = len(exp_df)
    inv_anomaly_n = len(inv_anomalies)
    exp_anomaly_n = len(exp_anomalies)

    save_model_params(business_id, 'ANOMALY', {
        'last_run': datetime.now().isoformat(),
        'inv_total': inv_total,
        'inv_anomalies': inv_anomaly_n,
        'exp_total': exp_total,
        'exp_anomalies': exp_anomaly_n,
    })

    inv_ids = {str(item['id']) for item in inv_anomalies}
    exp_ids = {str(item['id']) for item in exp_anomalies}

    inv_normal = [
        {**row.to_dict(), 'id': str(row['id']), 'isAnomaly': False, 'riskLevel': 'LOW', 'message': '✅ Normale'}
        for _, row in inv_df.iterrows() if str(row['id']) not in inv_ids
    ]
    exp_normal = [
        {**row.to_dict(), 'id': str(row['id']), 'isAnomaly': False, 'riskLevel': 'LOW', 'message': '✅ Normale'}
        for _, row in exp_df.iterrows() if str(row['id']) not in exp_ids
    ]

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
    df['amount'] = pd.to_numeric(df['totalTTC'].fillna(df['total']).fillna(0), errors='coerce').fillna(0)
    df['date'] = pd.to_datetime(df['createdAt'])
    for i in range(len(df)):
        for j in range(i + 1, len(df)):
            a = df.iloc[i]
            b = df.iloc[j]
            same_client = a['clientId'] == b['clientId']
            same_amount = abs(float(a['amount']) - float(b['amount'])) < 0.01
            same_date = abs((a['date'] - b['date']).days) <= 1
            if same_client and same_amount and same_date:
                anomalies.append({
                    **a.to_dict(),
                    'id': str(a['id']),
                    'isAnomaly': True,
                    'riskLevel': 'HIGH',
                    'message': '⚠️ Facture dupliquée',
                })
                anomalies.append({
                    **b.to_dict(),
                    'id': str(b['id']),
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
    df['date'] = pd.to_datetime(df['date'].fillna(df['createdAt']))
    for i in range(len(df)):
        for j in range(i + 1, len(df)):
            a = df.iloc[i]
            b = df.iloc[j]
            same_user = a['createdBy'] == b['createdBy']
            same_amount = abs(float(a['amount']) - float(b['amount'])) < 0.01
            same_cat = a['categoryId'] == b['categoryId']
            same_date = abs((a['date'] - b['date']).days) <= 1
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
    df['amount'] = pd.to_numeric(df['totalTTC'].fillna(df['total']).fillna(0), errors='coerce').fillna(0)
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
