import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from database import get_invoices, save_model_params


def train_cashflow(business_id: str) -> dict:
    df = get_invoices(business_id)
    if df.empty:
        return empty_cashflow()

    df['amount'] = pd.to_numeric(df['totalTTC'].fillna(df['total']).fillna(0), errors='coerce').fillna(0)
    df['date'] = pd.to_datetime(df['createdAt'])
    df = df.sort_values('date')
    df['month'] = df['date'].dt.to_period('M')

    monthly = df.groupby('month').agg(
        revenue=('amount', 'sum'),
        invoice_count=('id', 'count')
    ).reset_index()
    monthly['label'] = monthly['month'].astype(str)

    slope = 0.0
    intercept = 0.0
    if len(monthly) >= 2:
        X = np.arange(len(monthly), dtype=float)
        y = monthly['revenue'].to_numpy(dtype=float)
        x_mean = X.mean()
        y_mean = y.mean()
        slope = np.sum((X - x_mean) * (y - y_mean)) / np.sum((X - x_mean) ** 2)
        intercept = y_mean - slope * x_mean
    else:
        intercept = float(monthly['revenue'].mean()) if len(monthly) > 0 else 0.0

    now = datetime.now()
    forecast = []
    for i in range(1, 7):
        future_date = (now + timedelta(days=30 * i)).replace(day=1)
        predicted = max(0.0, intercept + slope * (len(monthly) + i))
        forecast.append({
            'month': i,
            'label': future_date.strftime('%B %Y'),
            'revenue': round(predicted, 2),
            'lower': round(predicted * 0.85, 2),
            'upper': round(predicted * 1.15, 2),
        })

    avg_monthly = float(monthly['revenue'].mean()) if len(monthly) > 0 else 0.0
    last3_avg = float(monthly['revenue'].tail(3).mean()) if len(monthly) > 0 else 0.0
    total_forecast = sum(item['revenue'] for item in forecast)
    trend_pct = round(((last3_avg - avg_monthly) / avg_monthly * 100) if avg_monthly > 0 else 0.0, 1)

    save_model_params(business_id, 'CASHFLOW', {
        'slope': slope,
        'intercept': intercept,
        'avg_monthly': avg_monthly,
        'trend_pct': trend_pct,
        'trained_at': datetime.now().isoformat(),
    })

    historical = [
        {'label': row['label'], 'revenue': round(float(row['revenue']), 2)}
        for _, row in monthly.iterrows()
    ]

    return {
        'historical': historical,
        'monthly_forecast': forecast,
        'total_revenue': round(total_forecast, 2),
        'avg_monthly': round(avg_monthly, 2),
        'trend_pct': trend_pct,
        'trend_direction': '↑' if trend_pct >= 0 else '↓',
    }


def empty_cashflow() -> dict:
    return {
        'historical': [],
        'monthly_forecast': [],
        'total_revenue': 0.0,
        'avg_monthly': 0.0,
        'trend_pct': 0.0,
        'trend_direction': '→',
    }


if __name__ == "__main__":
    # Test with mock data instead of DB
    import pandas as pd
    from datetime import datetime, timedelta

    # Mock invoice data with monthly data
    base_date = datetime.now().replace(day=1)
    mock_invoices = pd.DataFrame({
        'id': [f'inv{i}' for i in range(12)],
        'businessId': ['test-business-123'] * 12,
        'clientId': [f'client{i%3+1}' for i in range(12)],
        'totalTTC': [1000 + i*100 for i in range(12)],  # Increasing trend
        'total': [1000 + i*100 for i in range(12)],
        'status': ['paid'] * 12,
        'createdAt': [base_date - timedelta(days=30*i) for i in range(12)],
        'dueDate': [base_date - timedelta(days=30*i) + timedelta(days=30) for i in range(12)],
        'client_name': [f'Client {i%3+1}' for i in range(12)],
        'client_email': [f'client{i%3+1}@test.com' for i in range(12)]
    })

    # Patch the get_invoices and save_model_params functions before calling train_cashflow
    original_get_invoices = get_invoices
    original_save_model_params = save_model_params
    def get_invoices_mock(business_id: str) -> pd.DataFrame:
        return mock_invoices
    def save_model_params_mock(*args, **kwargs):
        pass  # Do nothing for testing
    globals()['get_invoices'] = get_invoices_mock
    globals()['save_model_params'] = save_model_params_mock

    try:
        result = train_cashflow("test-business-123")
        print("Cashflow Test Result with Mock Data:")
        print(result)
    finally:
        # Restore
        globals()['get_invoices'] = original_get_invoices
        globals()['save_model_params'] = original_save_model_params
