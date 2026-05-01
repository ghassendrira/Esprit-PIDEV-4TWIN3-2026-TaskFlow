import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler
from database import get_clients, save_model_params


def train_segmentation(business_id: str) -> dict:
    df = get_clients(business_id)
    if len(df) < 4:
        return segment_without_ml(df)

    now = pd.Timestamp.now()
    df['last_invoice_date'] = pd.to_datetime(df['last_invoice_date'])
    df['recency'] = (now - df['last_invoice_date']).dt.days.fillna(9999)
    df['frequency'] = df['invoice_count'].fillna(0)
    df['monetary'] = df['total_monetary'].fillna(0)

    scaler = MinMaxScaler()
    X = scaler.fit_transform(df[['recency', 'frequency', 'monetary']])

    n_clusters = 4
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df['segment'] = kmeans.fit_predict(X)

    centers = kmeans.cluster_centers_
    segment_labels = assign_segment_labels(centers)

    params = {
        'cluster_centers': centers.tolist(),
        'scaler_min': scaler.data_min_.tolist(),
        'scaler_max': scaler.data_max_.tolist(),
        'n_clusters': n_clusters,
        'segment_labels': segment_labels,
        'trained_at': datetime.now().isoformat(),
    }
    save_model_params(business_id, 'SEGMENTATION', params)

    clients = []
    label_to_segment_id = {
        'Champion': 'champion',
        'Fidèle': 'fidele',
        'À Risque': 'aRisque',
        'Perdu': 'perdu',
    }
    for _, row in df.iterrows():
        label_info = segment_labels.get(str(row['segment']), {})
        label = label_info.get('label', 'Inconnu')
        clients.append({
            'id': str(row['id']),
            'name': row.get('name', ''),
            'label': label,
            'segment_id': label_to_segment_id.get(label, 'fidele'),
            'segmentId': label_to_segment_id.get(label, 'fidele'),
            'segment_label': label,
            'color': label_info.get('color', 'gray'),
            'emoji': label_info.get('emoji', '❓'),
            'action': label_info.get('action', ''),
            'recency': int(row['recency']),
            'frequency': int(row['frequency']),
            'monetary': round(float(row['monetary']), 2),
        })

    segments = {
        'champion': sum(1 for c in clients if c['label'] == 'Champion'),
        'fidele': sum(1 for c in clients if c['label'] == 'Fidèle'),
        'aRisque': sum(1 for c in clients if c['label'] == 'À Risque'),
        'perdus': sum(1 for c in clients if c['label'] == 'Perdu'),
    }
    return {'segments': segments, 'clients': clients}


def assign_segment_labels(centers: np.ndarray) -> dict:
    scores = {i: (-centers[i][0] + centers[i][1] + centers[i][2]) for i in range(len(centers))}
    ordered = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    label_map = [
        {'label': 'Champion', 'color': 'green', 'emoji': '⭐', 'action': 'Offrir avantages premium'},
        {'label': 'Fidèle', 'color': 'blue', 'emoji': '💙', 'action': 'Maintenir la relation'},
        {'label': 'À Risque', 'color': 'orange', 'emoji': '⚠️', 'action': 'Relance commerciale urgente'},
        {'label': 'Perdu', 'color': 'red', 'emoji': '❌', 'action': 'Campagne de réactivation'},
    ]
    result = {}
    for rank, (cluster_id, _) in enumerate(ordered):
        result[str(cluster_id)] = label_map[rank] if rank < len(label_map) else {
            'label': f'Segment {rank}',
            'color': 'gray',
            'emoji': '❓',
            'action': '',
        }
    return result


def segment_without_ml(df: pd.DataFrame) -> dict:
    now = pd.Timestamp.now()
    label_to_segment_id = {
        'Champion': 'champion',
        'Fidèle': 'fidele',
        'À Risque': 'aRisque',
        'Perdu': 'perdu',
    }
    label_to_action = {
        'Champion': 'Offrir avantages premium',
        'Fidèle': 'Maintenir la relation',
        'À Risque': 'Relance commerciale urgente',
        'Perdu': 'Campagne de réactivation',
    }

    clients = []
    for _, row in df.iterrows():
        last = pd.to_datetime(row['last_invoice_date']) if pd.notna(row.get('last_invoice_date')) else None
        recency = int((now - last).days) if last is not None else 9999
        frequency = int(row.get('invoice_count') or 0)
        monetary = float(row.get('total_monetary') or 0)

        if recency <= 30 and frequency >= 3:
            label, color, emoji = 'Champion', 'green', '⭐'
        elif recency <= 90 and frequency >= 2:
            label, color, emoji = 'Fidèle', 'blue', '💙'
        elif recency <= 180:
            label, color, emoji = 'À Risque', 'orange', '⚠️'
        else:
            label, color, emoji = 'Perdu', 'red', '❌'

        clients.append({
            'id': str(row['id']),
            'name': row.get('name', ''),
            'label': label,
            'segment_id': label_to_segment_id.get(label, 'fidele'),
            'segmentId': label_to_segment_id.get(label, 'fidele'),
            'segment_label': label,
            'color': color,
            'emoji': emoji,
            'action': label_to_action.get(label, ''),
            'recency': recency,
            'frequency': frequency,
            'monetary': round(monetary, 2),
        })

    segments = {
        'champion': sum(1 for c in clients if c['label'] == 'Champion'),
        'fidele': sum(1 for c in clients if c['label'] == 'Fidèle'),
        'aRisque': sum(1 for c in clients if c['label'] == 'À Risque'),
        'perdus': sum(1 for c in clients if c['label'] == 'Perdu'),
    }
    return {'segments': segments, 'clients': clients}


if __name__ == "__main__":
    # Test with mock data instead of DB
    import pandas as pd
    from datetime import datetime, timedelta

    # Mock client data
    mock_clients = pd.DataFrame({
        'id': ['client1', 'client2', 'client3', 'client4', 'client5'],
        'businessId': ['test-business-123'] * 5,
        'name': ['Client A', 'Client B', 'Client C', 'Client D', 'Client E'],
        'email': ['a@test.com', 'b@test.com', 'c@test.com', 'd@test.com', 'e@test.com'],
        'createdAt': [datetime.now() - timedelta(days=i*10) for i in range(5)],
        'invoice_count': [5, 2, 10, 1, 8],
        'total_monetary': [5000.0, 2000.0, 15000.0, 500.0, 8000.0],
        'last_invoice_date': [datetime.now() - timedelta(days=i*5) for i in [1, 30, 60, 120, 10]]
    })

    # Patch the get_clients and save_model_params functions before calling train_segmentation
    original_get_clients = get_clients
    original_save_model_params = save_model_params
    def get_clients_mock(business_id: str) -> pd.DataFrame:
        return mock_clients
    def save_model_params_mock(*args, **kwargs):
        pass  # Do nothing for testing
    globals()['get_clients'] = get_clients_mock
    globals()['save_model_params'] = save_model_params_mock

    try:
        result = train_segmentation("test-business-123")
        print("Segmentation Test Result with Mock Data:")
        print(result)
    finally:
        # Restore original
        globals()['get_clients'] = original_get_clients
        globals()['save_model_params'] = original_save_model_params
