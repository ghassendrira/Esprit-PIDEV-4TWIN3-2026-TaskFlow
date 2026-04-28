"""
AI Predictions Service - Enhanced with Fraud, Anomaly, and Risk Detection
"""

import os
import logging
from fastapi import FastAPI, HTTPException, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import pandas as pd
from sqlalchemy import text

from database import engine, get_columns, discover_tables
from models.prediction import (
    fraud_detector, anomaly_detector, risk_assessor,
    predict_fraud, predict_anomaly, predict_risk
)

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title='TaskFlow AI Service',
    description='AI/ML predictions for fraud, anomalies, and risk',
    version='1.0.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class PredictionRequest(BaseModel):
    """Request for fraud/risk prediction"""
    businessId: str
    amount: float
    tax: Optional[float] = 0
    description: Optional[str] = None
    category: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AnomalyRequest(BaseModel):
    """Request for anomaly detection"""
    businessId: str
    amount: float


class TrainingRequest(BaseModel):
    """Request to train models"""
    businessId: str
    model_type: str  # 'fraud', 'anomaly', 'risk', 'all'
    months: Optional[int] = 12


class PredictionResponse(BaseModel):
    """Response with prediction result"""
    type: str
    prediction: Dict[str, Any]
    businessId: str
    timestamp: str


# ============================================================================
# HEALTH & STATUS
# ============================================================================

@app.get('/health')
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "TaskFlow AI Service",
        "models": {
            "fraud_detector": "ready",
            "anomaly_detector": "ready",
            "risk_assessor": "ready"
        }
    }


@app.get('/status')
def status():
    """Service status"""
    return {
        "status": "running",
        "fraud_model_trained": fraud_detector.is_trained,
        "anomaly_model_trained": anomaly_detector.is_trained,
        "risk_model_trained": risk_assessor.is_trained
    }


# ============================================================================
# FRAUD DETECTION
# ============================================================================

@app.post('/predict/fraud')
def predict_invoice_fraud(
    request: PredictionRequest,
    x_tenant_id: str = Header(...)
) -> Dict[str, Any]:
    """
    Detect if an invoice/transaction is fraudulent
    
    - Uses Isolation Forest algorithm
    - Analyzes amount, tax, and patterns
    """
    try:
        tenant = x_tenant_id.split(',')[0].strip()
        if tenant != request.businessId:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        logger.info(f"🔍 Fraud prediction for business {request.businessId}")
        
        prediction = predict_fraud({
            "amount": request.amount,
            "tax": request.tax or 0,
            "description": request.description or ""
        })
        
        return {
            "type": "fraud_detection",
            "businessId": request.businessId,
            "prediction": prediction,
            "model_type": "IsolationForest",
            "trained": fraud_detector.is_trained
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fraud prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Fraud prediction failed: {str(e)}"
        )


@app.post('/predict/anomaly')
def predict_expense_anomaly(
    request: AnomalyRequest,
    x_tenant_id: str = Header(...)
) -> Dict[str, Any]:
    """
    Detect anomalous expenses
    
    - Uses Isolation Forest + statistical methods
    - Detects unusual amounts based on historical data
    """
    try:
        tenant = x_tenant_id.split(',')[0].strip()
        if tenant != request.businessId:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        logger.info(f"📊 Anomaly detection for business {request.businessId}: {request.amount}")
        
        prediction = predict_anomaly(request.amount)
        
        return {
            "type": "anomaly_detection",
            "businessId": request.businessId,
            "prediction": prediction,
            "model_type": "IsolationForest + Z-Score",
            "trained": anomaly_detector.is_trained
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Anomaly prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Anomaly detection failed: {str(e)}"
        )


@app.post('/predict/risk')
def predict_payment_risk(
    request: PredictionRequest,
    x_tenant_id: str = Header(...)
) -> Dict[str, Any]:
    """
    Assess payment/transaction risk
    
    - Uses Random Forest classification
    - Evaluates likelihood of payment issues
    """
    try:
        tenant = x_tenant_id.split(',')[0].strip()
        if tenant != request.businessId:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        logger.info(f"⚠️ Risk assessment for business {request.businessId}")
        
        prediction = predict_risk({
            "amount": request.amount,
            "tax": request.tax or 0
        })
        
        return {
            "type": "risk_assessment",
            "businessId": request.businessId,
            "prediction": prediction,
            "model_type": "RandomForest",
            "trained": risk_assessor.is_trained
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Risk prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Risk assessment failed: {str(e)}"
        )


# ============================================================================
# TRAINING ENDPOINTS
# ============================================================================

@app.post('/train/fraud')
def train_fraud_model(
    request: TrainingRequest,
    x_tenant_id: str = Header(...)
) -> Dict[str, Any]:
    """Train fraud detection model on historical data"""
    try:
        tenant = x_tenant_id.split(',')[0].strip()
        if tenant != request.businessId:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        logger.info(f"🎓 Training fraud model for business {request.businessId}")
        
        # Read invoice data from database
        query = text(f"""
            SELECT i."amount", i."tax", COUNT(*) as frequency
            FROM "Invoice" i
            WHERE i."businessId" = :business_id
            GROUP BY i."amount", i."tax"
            LIMIT 1000
        """)
        
        with engine.connect() as conn:
            result = conn.execute(query, {"business_id": request.businessId})
            rows = result.fetchall()
        
        if not rows:
            return {
                "success": False,
                "message": "No invoice data found",
                "businessId": request.businessId
            }
        
        df = pd.DataFrame(rows, columns=['amount', 'tax', 'frequency'])
        result = fraud_detector.train(df)
        
        return {
            "model_type": "fraud_detection",
            "businessId": request.businessId,
            **result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fraud model training error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Training failed: {str(e)}"
        )


@app.post('/train/anomaly')
def train_anomaly_model(
    request: TrainingRequest,
    x_tenant_id: str = Header(...)
) -> Dict[str, Any]:
    """Train anomaly detection model on historical expenses"""
    try:
        tenant = x_tenant_id.split(',')[0].strip()
        if tenant != request.businessId:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        logger.info(f"🎓 Training anomaly model for business {request.businessId}")
        
        # Read expense data
        query = text(f"""
            SELECT e."amount"
            FROM "Expense" e
            WHERE e."businessId" = :business_id
            ORDER BY e."createdAt" DESC
            LIMIT 1000
        """)
        
        with engine.connect() as conn:
            result = conn.execute(query, {"business_id": request.businessId})
            rows = result.fetchall()
        
        if not rows:
            return {
                "success": False,
                "message": "No expense data found",
                "businessId": request.businessId
            }
        
        df = pd.DataFrame(rows, columns=['amount'])
        result = anomaly_detector.train(df)
        
        return {
            "model_type": "anomaly_detection",
            "businessId": request.businessId,
            **result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Anomaly model training error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Training failed: {str(e)}"
        )


@app.post('/train/risk')
def train_risk_model(
    request: TrainingRequest,
    x_tenant_id: str = Header(...)
) -> Dict[str, Any]:
    """Train risk assessment model"""
    try:
        tenant = x_tenant_id.split(',')[0].strip()
        if tenant != request.businessId:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        logger.info(f"🎓 Training risk model for business {request.businessId}")
        
        # Read invoice data
        query = text(f"""
            SELECT i."amount", i."tax"
            FROM "Invoice" i
            WHERE i."businessId" = :business_id
            ORDER BY i."createdAt" DESC
            LIMIT 1000
        """)
        
        with engine.connect() as conn:
            result = conn.execute(query, {"business_id": request.businessId})
            rows = result.fetchall()
        
        if not rows:
            return {
                "success": False,
                "message": "No invoice data found",
                "businessId": request.businessId
            }
        
        df = pd.DataFrame(rows, columns=['amount', 'tax'])
        result = risk_assessor.train(df)
        
        return {
            "model_type": "risk_assessment",
            "businessId": request.businessId,
            **result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Risk model training error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Training failed: {str(e)}"
        )


# ============================================================================
# BATCH PREDICTIONS
# ============================================================================

@app.post('/predict/batch/invoices')
def batch_predict_invoices(
    request: TrainingRequest,
    x_tenant_id: str = Header(...)
) -> Dict[str, Any]:
    """Batch prediction for all invoices in a business"""
    try:
        tenant = x_tenant_id.split(',')[0].strip()
        if tenant != request.businessId:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        logger.info(f"📦 Batch prediction for business {request.businessId}")
        
        # Read invoices
        query = text(f"""
            SELECT id, "amount", "tax"
            FROM "Invoice"
            WHERE "businessId" = :business_id
            LIMIT 100
        """)
        
        with engine.connect() as conn:
            result = conn.execute(query, {"business_id": request.businessId})
            rows = result.fetchall()
        
        predictions = []
        for row in rows:
            invoice_id, amount, tax = row
            fraud_pred = predict_fraud({"amount": amount, "tax": tax or 0, "frequency": 1})
            predictions.append({
                "invoice_id": str(invoice_id),
                "fraud": fraud_pred.get("fraud", False),
                "confidence": fraud_pred.get("confidence", 0)
            })
        
        return {
            "type": "batch_fraud_detection",
            "businessId": request.businessId,
            "predictions_count": len(predictions),
            "predictions": predictions
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Batch prediction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Batch prediction failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3009)
