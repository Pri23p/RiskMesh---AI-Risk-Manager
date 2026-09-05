"""FastAPI Service for RiskSentinel Real-Time Fraud Prediction & Explainability."""

import json
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from src.config import (
    MODEL_PATH,
    METRICS_PATH,
    MODEL_VERSION,
    MODEL_FEATURE_NAMES,
)
from src.preprocessing import FraudPreprocessor
from src.model import FraudModel
from src.explainability import FraudExplainer


# Global instances initialized at startup
preprocessor: Optional[FraudPreprocessor] = None
model: Optional[FraudModel] = None
explainer: Optional[FraudExplainer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager to load models and preprocessors at startup."""
    global preprocessor, model, explainer
    preprocessor = FraudPreprocessor(feature_names=MODEL_FEATURE_NAMES)
    model = FraudModel()

    if MODEL_PATH.exists():
        model.load(MODEL_PATH)
        explainer = FraudExplainer(model, feature_names=MODEL_FEATURE_NAMES)
        print(f"[OK] Loaded XGBoost model from {MODEL_PATH}")
    else:
        print(f"[WARN] Model artifact not found at {MODEL_PATH}. Train model before inference.")


    yield


app = FastAPI(
    title="RiskMesh ML Prediction & Explainability API",
    description="Real-time AI Fraud Risk Scoring and SHAP-based feature attribution for high-velocity merchants.",
    version="1.0.0",
    lifespan=lifespan,
)


class TransactionFeatures(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount")
    currency: str = Field(default="INR", description="3-letter currency code")
    paymentMethod: str = Field(default="CARD", description="Payment method: CARD, UPI, NET_BANKING, WALLET")
    customerAvgAmount: Optional[float] = Field(default=100.0, ge=0, description="Customer historical average transaction amount")
    transactionsLast10Min: Optional[int] = Field(default=0, ge=0, description="Velocity in last 10 minutes")
    transactionsLast24Hours: Optional[int] = Field(default=1, ge=0, description="Velocity in last 24 hours")
    failedAttempts: Optional[int] = Field(default=0, ge=0, description="Failed payment attempts in recent window")
    accountAge: Optional[int] = Field(default=30, ge=0, description="Account age in days")
    isNewDevice: Optional[int] = Field(default=0, ge=0, le=1, description="1 if novel device fingerprint, else 0")
    isNewIp: Optional[int] = Field(default=0, ge=0, le=1, description="1 if novel IP address, else 0")
    previousFraudCount: Optional[int] = Field(default=0, ge=0, description="Historical confirmed fraud cases")


class PredictRequest(BaseModel):
    features: TransactionFeatures


class PredictResponse(BaseModel):
    fraudProbability: float = Field(..., description="Estimated fraud probability [0.0 - 1.0]")
    riskScore: int = Field(..., description="Normalized risk score [0 - 100]")
    modelVersion: str = Field(..., description="Active model version identifier")


class RiskFactor(BaseModel):
    feature: str
    impact: str
    contribution: Optional[float] = None
    value: Optional[Any] = None


class ExplainResponse(BaseModel):
    fraudProbability: float
    riskScore: int
    modelVersion: str
    riskFactors: List[RiskFactor]


@app.get("/health")
def health_check():
    """Health check endpoint."""
    is_model_loaded = model is not None and model.model is not None
    return {
        "status": "ok",
        "service": "riskmesh-ml-service",
        "modelLoaded": is_model_loaded,
        "modelVersion": MODEL_VERSION,
    }


@app.get("/metrics")
def get_metrics():
    """Returns genuine evaluation metrics from the held-out test set."""
    if not METRICS_PATH.exists():
        raise HTTPException(status_code=404, detail="Evaluation metrics file not found. Please train the model first.")
    with open(METRICS_PATH, "r") as f:
        return json.load(f)


@app.post("/predict", response_model=PredictResponse)
def predict_fraud(request: PredictRequest):
    """Predicts real-time fraud probability and calculates risk score."""
    if model is None or model.model is None or preprocessor is None:
        raise HTTPException(status_code=503, detail="Model is not loaded. Train the model first.")

    raw_dict = request.features.model_dump()
    X_features = preprocessor.transform(raw_dict)

    prob = float(model.predict_proba(X_features)[0])
    risk_score = int(round(prob * 100))

    return PredictResponse(
        fraudProbability=round(prob, 4),
        riskScore=risk_score,
        modelVersion=MODEL_VERSION,
    )


@app.post("/explain", response_model=ExplainResponse)
def explain_fraud(request: PredictRequest):
    """Returns fraud probability along with top SHAP feature attribution risk factors."""
    if model is None or model.model is None or preprocessor is None:
        raise HTTPException(status_code=503, detail="Model is not loaded. Train the model first.")

    global explainer
    if explainer is None:
        explainer = FraudExplainer(model, feature_names=MODEL_FEATURE_NAMES)

    raw_dict = request.features.model_dump()
    X_features = preprocessor.transform(raw_dict)

    prob = float(model.predict_proba(X_features)[0])
    risk_score = int(round(prob * 100))

    factors = explainer.explain_instance(X_features, top_k=5)

    return ExplainResponse(
        fraudProbability=round(prob, 4),
        riskScore=risk_score,
        modelVersion=MODEL_VERSION,
        riskFactors=[RiskFactor(**f) for f in factors],
    )
