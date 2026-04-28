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
    """Payment Risk Assessment"""
    
    def __init__(self):
        self.features_scaler = StandardScaler()
        self.model = None
        self.is_trained = False
    
    def train(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Train risk assessment model"""
        try:
            features = self._extract_features(data)
            
            if len(features) < 10:
                return {
                    "success": False,
                    "message": "Not enough data to train model"
                }
            
            # Dummy labels: if amount > mean, risk = 1
            mean_amount = data['amount'].mean()
            labels = (data['amount'] > mean_amount).astype(int).values
            
            scaled_features = self.features_scaler.fit_transform(features)
            self.model = RandomForestClassifier(
                n_estimators=100,
                random_state=42,
                max_depth=10
            )
            self.model.fit(scaled_features, labels)
            self.is_trained = True
            
            logger.info(f"✅ Risk assessor trained on {len(features)} records")
            return {
                "success": True,
                "message": "Model trained successfully",
                "records": len(features)
            }
        except Exception as e:
            logger.error(f"❌ Risk assessment training error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def predict(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Assess payment risk"""
        try:
            if not self.is_trained:
                # Simple heuristic: high amount = high risk
                amount = float(record.get('amount', 0))
                risk_score = min(amount / 10000, 1.0)
                return {
                    "risk_level": "high" if risk_score > 0.7 else "medium" if risk_score > 0.3 else "low",
                    "risk_score": risk_score,
                    "reason": "Based on amount heuristic"
                }
            
            features = self._extract_single_features(record)
            scaled = self.features_scaler.transform([features])
            probabilities = self.model.predict_proba(scaled)[0]
            
            risk_score = probabilities[1]  # Probability of class 1
            
            return {
                "risk_level": "high" if risk_score > 0.7 else "medium" if risk_score > 0.3 else "low",
                "risk_score": float(risk_score),
                "reason": self._get_risk_reason(record, risk_score)
            }
        except Exception as e:
            logger.error(f"❌ Risk prediction error: {e}")
            return {
                "risk_level": "unknown",
                "risk_score": 0,
                "error": str(e)
            }
    
    def _extract_features(self, df: pd.DataFrame) -> np.ndarray:
        """Extract features from dataframe"""
        features = []
        for _, row in df.iterrows():
            features.append(self._extract_single_features(row))
        return np.array(features)
    
    def _extract_single_features(self, record: Dict[str, Any]) -> List[float]:
        """Extract features for risk assessment"""
        amount = float(record.get('amount', 0))
        tax = float(record.get('tax', 0))
        
        return [
            amount,
            tax,
            amount + tax
        ]
    
    def _get_risk_reason(self, record: Dict[str, Any], risk_score: float) -> str:
        """Generate explanation for risk score"""
        if risk_score > 0.7:
            return "High-value transaction detected"
        elif risk_score > 0.3:
            return "Moderate risk based on transaction patterns"
        else:
            return "Low-risk transaction"


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
