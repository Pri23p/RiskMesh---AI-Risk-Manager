"""
RiskSentinel - Prediction API Routes
Real-time scoring endpoint accepting single order or batch requests.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Order, PredictionRecord, AuditLog
from app.services.risk_service import RiskScoringService

router = APIRouter(tags=["Prediction"])

class OrderPredictRequest(BaseModel):
    order_id: Optional[str] = "ORD-MANUAL-001"
    customer_id: Optional[str] = "CUST-MANUAL-001"
    timestamp: Optional[str] = "2025-06-15 14:30:00"
    order_amount: float = Field(default=8499.0, description="Order total amount in INR")
    product_category: Optional[str] = "Electronics & Gadgets"
    payment_method: Optional[str] = "Cash on Delivery (COD)"
    is_cod: Optional[int] = 1
    account_age_days: Optional[int] = 6
    customer_previous_orders: Optional[int] = 8
    customer_previous_returns: Optional[int] = 6
    customer_previous_chargebacks: Optional[int] = 2
    customer_return_rate: Optional[float] = 0.75
    customer_chargeback_rate: Optional[float] = 0.25
    average_order_value: Optional[float] = 2800.0
    current_vs_average_order_ratio: Optional[float] = 3.035
    billing_shipping_match: Optional[int] = 0
    shipping_distance: Optional[float] = 450.0
    number_of_addresses: Optional[int] = 2
    device_id: Optional[str] = "DEV-RING-8899"
    orders_from_device: Optional[int] = 28
    customers_from_device: Optional[int] = 8
    orders_last_24h: Optional[int] = 4
    orders_last_7d: Optional[int] = 7
    customer_orders_last_30d: Optional[int] = 5
    high_value_item: Optional[int] = 1
    delivery_attempts: Optional[int] = 1
    previous_failed_deliveries: Optional[int] = 1
    ip_region: Optional[str] = "West"
    customer_region: Optional[str] = "North"
    device_risk_history: Optional[float] = 0.92

@router.post("/api/predict")
@router.post("/predict")
def predict_risk(order: OrderPredictRequest, db: Session = Depends(get_db)):
    try:
        service = RiskScoringService.get_instance()
        data_dict = order.model_dump()
        explanation = service.score_single(data_dict)
        
        # Log prediction event in audit log
        audit = AuditLog(
            event_type="PREDICTION",
            entity_id=str(explanation.get("order_id", "UNKNOWN")),
            actor="RiskSentinel Engine",
            action_summary=f"Scored Order {explanation.get('order_id')} with Risk Score {explanation.get('risk_score')}/100 ({explanation.get('risk_level')}). Action: {explanation.get('recommended_action')}",
            details={
                "risk_score": explanation.get("risk_score"),
                "risk_level": explanation.get("risk_level"),
                "estimated_exposure": explanation.get("estimated_exposure"),
                "recommended_action": explanation.get("recommended_action")
            }
        )
        db.add(audit)
        db.commit()
        
        return explanation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")
