"""
AI Prediction Models for TaskFlow
- Fraud Detection
- Expense Anomaly Detection
- Payment Risk Assessment
- Expense Categorization
"""

import json
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class FraudDetector:
    """Fraud Detection using Isolation Forest"""
    
    def __init__(self):
        self.model = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def train(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Train fraud detection model"""
        try:
            # Features for fraud detection
            features = self._extract_features(data)
            if len(features) < 10:
                return {
                    "success": False,
                    "message": "Not enough data to train model",
                    "confidence": 0
                }
            
            scaled_features = self.scaler.fit_transform(features)
            self.model.fit(scaled_features)
            self.is_trained = True
            
            logger.info(f"✅ Fraud detector trained on {len(features)} records")
            return {
                "success": True,
                "message": "Model trained successfully",
                "records": len(features)
            }
        except Exception as e:
            logger.error(f"❌ Fraud detection training error: {e}")
            return {
                "success": False,
                "error": str(e),
                "confidence": 0
            }
    
    def predict(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Predict if a transaction is fraudulent"""
        try:
            if not self.is_trained:
                return {
                    "fraud": False,
                    "confidence": 0,
                    "reason": "Model not trained"
                }
            
            feature = self._extract_single_features(record)
            scaled = self.scaler.transform([feature])
            
            # -1 = anomaly/fraud, 1 = normal
            prediction = self.model.predict(scaled)[0]
            anomaly_score = self.model.score_samples(scaled)[0]
            
            is_fraud = prediction == -1
            confidence = abs(anomaly_score)
            
            return {
                "fraud": is_fraud,
                "confidence": min(float(confidence), 1.0),
                "anomaly_score": float(anomaly_score),
                "reason": "Anomalous transaction pattern detected" if is_fraud else "Normal transaction"
            }
        except Exception as e:
            logger.error(f"❌ Fraud prediction error: {e}")
            return {
                "fraud": False,
                "confidence": 0,
                "error": str(e)
            }
    
    def _extract_features(self, df: pd.DataFrame) -> np.ndarray:
        """Extract features from dataframe"""
        features = []
        for _, row in df.iterrows():
            features.append(self._extract_single_features(row))
        return np.array(features)
    
    def _extract_single_features(self, record: Dict[str, Any]) -> List[float]:
        """Extract features from single record"""
        amount = float(record.get('amount', 0))
        tax = float(record.get('tax', 0))
        frequency = float(record.get('frequency', 1))
        
        # Features: [amount, tax, frequency, amount*tax, tax/amount]
        return [
            amount,
            tax,
            frequency,
            amount * tax if amount > 0 else 0,
            tax / amount if amount > 0 else 0
        ]


class AnomalyDetector:
    """Expense Anomaly Detection"""
    
    def __init__(self):
        self.model = IsolationForest(
            contamination=0.15,
            random_state=42,
            n_estimators=50
        )
        self.scaler = StandardScaler()
        self.mean_expense = 0
        self.std_expense = 1
        self.is_trained = False
    
    def train(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Train anomaly detection model"""
        try:
            amounts = data['amount'].astype(float).values.reshape(-1, 1)
            
            if len(amounts) < 5:
                self.mean_expense = amounts.mean()
                self.std_expense = amounts.std() or 1
                return {
                    "success": True,
                    "message": "Using statistical method (insufficient data)",
                    "records": len(amounts)
                }
            
            self.mean_expense = amounts.mean()
            self.std_expense = amounts.std() or 1
            
            scaled = self.scaler.fit_transform(amounts)
            self.model.fit(scaled)
            self.is_trained = True
            
            logger.info(f"✅ Anomaly detector trained on {len(amounts)} expenses")
            return {
                "success": True,
                "message": "Model trained successfully",
                "records": len(amounts),
                "mean": float(self.mean_expense),
                "std": float(self.std_expense)
            }
        except Exception as e:
            logger.error(f"❌ Anomaly detection training error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def predict(self, amount: float) -> Dict[str, Any]:
        """Detect if expense is anomalous"""
        try:
            # Z-score method
            z_score = (amount - self.mean_expense) / self.std_expense if self.std_expense > 0 else 0
            
            # ML method (if trained)
            if self.is_trained:
                scaled = self.scaler.transform([[amount]])
                prediction = self.model.predict(scaled)[0]
                is_anomaly = prediction == -1
            else:
                # Statistical threshold: |z-score| > 3
                is_anomaly = abs(z_score) > 3
            
            confidence = min(abs(z_score) / 3, 1.0)
            
            return {
                "anomaly": is_anomaly,
                "confidence": float(confidence),
                "z_score": float(z_score),
                "expected_range": [
                    float(self.mean_expense - 2 * self.std_expense),
                    float(self.mean_expense + 2 * self.std_expense)
                ]
            }
        except Exception as e:
            logger.error(f"❌ Anomaly prediction error: {e}")
            return {
                "anomaly": False,
                "confidence": 0,
                "error": str(e)
            }


class RiskAssessment:
    """
    Payment Risk Assessment — Multi-Factor Weighted Scoring Model.

    Instead of a binary classifier (Random Forest outputs ~0 or ~1), this model
    computes a **continuous risk score** from 0.0 to 1.0 using four weighted
    factors, each producing a smooth value via sigmoid / logarithmic curves:

      1. Time Pressure   (weight 0.40) — sigmoid on days-to-due
      2. Amount Risk      (weight 0.20) — log-scaled relative to avg
      3. Status Factor    (weight 0.25) — categorical with smooth nuance
      4. Invoice Age      (weight 0.15) — days since creation

    The result is a natural distribution of LOW / MEDIUM / HIGH scores.
    """

    # ── Weights ──────────────────────────────────────────────────────────
    W_TIME   = 0.30
    W_AMOUNT = 0.15
    W_STATUS = 0.40
    W_AGE    = 0.15

    def __init__(self):
        self.avg_amount: float = 500.0  # default, recalculated on train
        self.is_trained = False

    # ── Sigmoid helper (smooth S-curve 0→1) ──────────────────────────────
    @staticmethod
    def _sigmoid(x: float, midpoint: float = 0.0, steepness: float = 1.0) -> float:
        """Returns value in (0, 1). When x == midpoint → 0.5."""
        z = -steepness * (x - midpoint)
        if z > 500:
            return 0.0
        if z < -500:
            return 1.0
        return 1.0 / (1.0 + np.exp(z))

    # ── Train: just learn the average amount from real data ──────────────
    def train(self, data: pd.DataFrame) -> Dict[str, Any]:
        try:
            if data.empty:
                return {"success": False, "message": "No data"}
            amounts = data['amount'].astype(float)
            self.avg_amount = float(amounts.mean()) or 500.0
            self.is_trained = True
            logger.info(f"✅ Risk scorer calibrated on {len(data)} invoices (avg={self.avg_amount:.0f})")
            return {"success": True, "records": len(data), "avg_amount": self.avg_amount}
        except Exception as e:
            logger.error(f"❌ Risk train error: {e}")
            return {"success": False, "error": str(e)}

    # ── Predict ──────────────────────────────────────────────────────────
    def predict(self, record: Dict[str, Any]) -> Dict[str, Any]:
        try:
            now = pd.Timestamp.now()

            # ── Parse fields ────────────────────────────────────────────
            amount   = float(record.get('amount', 0))
            status   = str(record.get('status', '')).upper()

            due_date = self._parse_date(record.get('dueDate'), now + pd.Timedelta(days=30))
            created  = self._parse_date(record.get('createdAt'), now)

            days_to_due  = (due_date - now).total_seconds() / 86400.0   # float days
            invoice_age  = (now - created).total_seconds() / 86400.0

            # ────────────────────────────────────────────────────────────
            # Factor 1 — Time Pressure  (asymmetric sigmoid)
            #   We negate days_to_due so overdue (negative) → positive → high risk
            #   Overdue side uses steeper curve (risk rises fast)
            #   Future side uses gentler curve (risk drops slowly)
            # ────────────────────────────────────────────────────────────
            if days_to_due < 0:
                # Overdue: 10 days late → ~0.86, 20 days → ~0.97, 30 days → ~0.99
                f_time = self._sigmoid(-days_to_due, midpoint=0.0, steepness=0.18)
            else:
                # Future:  3d → ~0.45, 7d → ~0.38, 14d → ~0.27, 30d → ~0.11, 60d → ~0.01
                f_time = self._sigmoid(-days_to_due, midpoint=0.0, steepness=0.07)

            # ────────────────────────────────────────────────────────────
            # Factor 2 — Amount Risk  (log-scaled relative to business avg)
            #   amount == avg  → 0.35
            #   amount == 3×avg → ~0.70
            #   amount == 0.3×avg → ~0.15
            # ────────────────────────────────────────────────────────────
            ratio = amount / self.avg_amount if self.avg_amount > 0 else 1.0
            f_amount = self._sigmoid(np.log(max(ratio, 0.01)), midpoint=0.0, steepness=1.2)

            # ────────────────────────────────────────────────────────────
            # Factor 3 — Status
            # ────────────────────────────────────────────────────────────
            status_scores = {
                'PAID':     0.02,
                'CANCELED': 0.00,
                'DRAFT':    0.55,   # not sent yet → moderate uncertainty
                'SENT':     0.40,   # sent, awaiting payment
                'OVERDUE':  0.95,   # explicitly overdue
            }
            f_status = status_scores.get(status, 0.50)

            # Boost SENT invoices that are close to or past due
            if status == 'SENT':
                if days_to_due < 0:
                    f_status = 0.80 + min(abs(days_to_due) / 60.0, 0.15)
                elif days_to_due < 7:
                    f_status = 0.60
                elif days_to_due < 14:
                    f_status = 0.50

            # Boost DRAFT invoices past due
            if status == 'DRAFT' and days_to_due < 0:
                f_status = 0.70 + min(abs(days_to_due) / 90.0, 0.20)

            # ────────────────────────────────────────────────────────────
            # Factor 4 — Invoice Age (older unpaid = riskier)
            #   <7 days old   → ~0.10
            #   30 days old   → ~0.30
            #   60 days old   → ~0.50
            #   120 days old  → ~0.75
            #   300+ days old → ~0.95
            # For PAID invoices, age doesn't matter.
            # ────────────────────────────────────────────────────────────
            if status == 'PAID':
                f_age = 0.05
            else:
                f_age = self._sigmoid(invoice_age, midpoint=60.0, steepness=0.025)

            # ────────────────────────────────────────────────────────────
            # Weighted combination
            # ────────────────────────────────────────────────────────────
            raw_score = (
                self.W_TIME   * f_time   +
                self.W_AMOUNT * f_amount +
                self.W_STATUS * f_status +
                self.W_AGE    * f_age
            )

            # Hard override for PAID / CANCELED
            if status == 'PAID':
                raw_score = min(raw_score, 0.08)
            elif status == 'CANCELED':
                raw_score = 0.0

            risk_score = float(min(max(raw_score, 0.0), 1.0))

            # ── Human-readable reason ───────────────────────────────────
            reason = self._build_reason(status, days_to_due, amount, risk_score, f_time, f_amount)

            level = 'high' if risk_score > 0.66 else 'medium' if risk_score > 0.33 else 'low'

            return {
                "risk_level": level,
                "risk_score": round(risk_score, 4),
                "reason": reason,
                "factors": {
                    "time_pressure": round(f_time, 3),
                    "amount_risk":   round(f_amount, 3),
                    "status_factor": round(f_status, 3),
                    "age_factor":    round(f_age, 3),
                },
            }
        except Exception as e:
            logger.error(f"❌ Risk prediction error: {e}")
            return {"risk_level": "unknown", "risk_score": 0, "error": str(e)}

    # ── Helpers ──────────────────────────────────────────────────────────
    @staticmethod
    def _parse_date(raw, default):
        try:
            if raw is None or (isinstance(raw, str) and not raw.strip()):
                return default
            dt = pd.to_datetime(raw)
            if dt.tz is not None:
                dt = dt.tz_localize(None)
            return dt
        except Exception:
            return default

    @staticmethod
    def _build_reason(status, days_to_due, amount, score, f_time, f_amount):
        if status == 'PAID':
            return "Facture réglée — aucun risque."
        if status == 'CANCELED':
            return "Facture annulée."

        parts = []

        if days_to_due < -30:
            parts.append(f"Échéance dépassée de {int(abs(days_to_due))} jours — retard critique.")
        elif days_to_due < -7:
            parts.append(f"En retard de {int(abs(days_to_due))} jours.")
        elif days_to_due < 0:
            parts.append(f"Échéance dépassée de {int(abs(days_to_due))} jour(s).")
        elif days_to_due < 3:
            parts.append("Échéance imminente (< 3 jours).")
        elif days_to_due < 7:
            parts.append("Échéance dans moins d'une semaine.")
        elif days_to_due < 14:
            parts.append("Échéance dans moins de 2 semaines.")
        elif days_to_due < 30:
            parts.append("Échéance dans le mois.")
        else:
            parts.append(f"Échéance dans {int(days_to_due)} jours.")

        if f_amount > 0.6:
            parts.append(f"Montant élevé ({amount:.0f} TND) par rapport à la moyenne.")
        elif f_amount > 0.4:
            parts.append(f"Montant modéré ({amount:.0f} TND).")

        if status == 'DRAFT':
            parts.append("Facture encore en brouillon, non envoyée.")
        elif status == 'OVERDUE':
            parts.append("Statut marqué comme impayé/en retard.")

        if score > 0.66:
            parts.append("⚠️ Suivi urgent recommandé.")
        elif score > 0.33:
            parts.append("Envoyer un rappel au client.")

        return " ".join(parts)


# Global model instances
fraud_detector = FraudDetector()
anomaly_detector = AnomalyDetector()
risk_assessor = RiskAssessment()


def predict_fraud(record: Dict[str, Any]) -> Dict[str, Any]:
    """Public API for fraud prediction"""
    return fraud_detector.predict(record)


def predict_anomaly(amount: float) -> Dict[str, Any]:
    """Public API for anomaly prediction"""
    return anomaly_detector.predict(amount)


def predict_risk(record: Dict[str, Any]) -> Dict[str, Any]:
    """Public API for risk prediction"""
    return risk_assessor.predict(record)
