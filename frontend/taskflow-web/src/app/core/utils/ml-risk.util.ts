import type { AnomalyResponse } from '../services/ml.service';

/** Score 0–100 et probabilité affichée à partir de la réponse ML anomalies */
export function anomalyToPaymentRisk(r: AnomalyResponse) {
  const level = (r.risk_level || 'LOW').toUpperCase();
  let score = 30;
  let probability = 0.35;
  if (level === 'HIGH') {
    score = 88;
    probability = 0.86;
  } else if (level === 'MEDIUM') {
    score = 58;
    probability = 0.62;
  } else {
    score = Math.min(35, Math.max(5, 35 + (r.anomaly_score || 0) * 40));
    probability = 0.28;
  }
  if (r.is_anomaly) score = Math.min(100, score + 8);
  return {
    score: Math.round(score),
    probability,
    level: level as 'HIGH' | 'MEDIUM' | 'LOW',
    label:
      level === 'HIGH' ? 'Élevé' : level === 'MEDIUM' ? 'Modéré' : 'Faible',
  };
}

export function riskLevelColor(level: string): string {
  const u = (level || '').toUpperCase();
  if (u === 'HIGH') return '#ef4444';
  if (u === 'MEDIUM') return '#f59e0b';
  return '#22c55e';
}
