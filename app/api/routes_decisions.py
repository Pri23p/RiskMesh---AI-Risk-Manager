"""
RiskSentinel - Merchant Decision & Audit Log Routes
Records merchant actions, feedback loops, and immutable audit logs.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Order, PredictionRecord, MerchantDecision, AuditLog

router = APIRouter(tags=["Merchant Decisions & Feedback Loop"])

class DecisionRequest(BaseModel):
    decision: str # "Approve", "Request Verification", "Manual Review", "Reject Refund"
    analyst_name: Optional[str] = "Merchant Ops Analyst"
    notes: Optional[str] = None

@router.post("/api/orders/{order_id}/decision")
@router.post("/orders/{order_id}/decision")
def record_order_decision(order_id: str, payload: DecisionRequest, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found.")

    pred = db.query(PredictionRecord).filter(PredictionRecord.order_id == order_id).first()
    risk_score = pred.risk_score if pred else 50
    risk_level = pred.risk_level if pred else "MEDIUM"
    
    # Calculate estimated loss saved if action is defensive (Reject Refund or Request Verification on high risk)
    loss_saved = 0.0
    if payload.decision in ["Request Verification", "Reject Refund", "Manual Review"]:
        if risk_level == "HIGH":
            loss_saved = order.order_amount
        elif risk_level == "MEDIUM":
            loss_saved = order.order_amount * 0.5

    decision_record = MerchantDecision(
        order_id=order_id,
        customer_id=order.customer_id,
        order_amount=order.order_amount,
        risk_score=risk_score,
        risk_level=risk_level,
        decision=payload.decision,
        status="Completed",
        analyst_name=payload.analyst_name,
        notes=payload.notes or f"Merchant executed {payload.decision} based on RiskSentinel recommendation.",
        loss_saved_estimate=loss_saved
    )
    db.add(decision_record)

    # Add to Audit Log
    audit_entry = AuditLog(
        event_type="MERCHANT_DECISION",
        entity_id=order_id,
        actor=payload.analyst_name,
        action_summary=f"Merchant executed action '{payload.decision}' on Order {order_id} (Risk Score: {risk_score}/100). Estimated loss saved: ₹{loss_saved:,.2f}",
        details={
            "order_id": order_id,
            "decision": payload.decision,
            "risk_score": risk_score,
            "loss_saved": loss_saved,
            "notes": payload.notes
        }
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "success",
        "order_id": order_id,
        "decision": payload.decision,
        "loss_saved_estimate": loss_saved,
        "message": f"Decision '{payload.decision}' successfully recorded for order {order_id}."
    }

@router.get("/api/audit")
@router.get("/audit")
def get_audit_trail(limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()
    return {
        "count": len(logs),
        "audit_logs": [
            {
                "id": l.id,
                "event_type": l.event_type,
                "entity_id": l.entity_id,
                "actor": l.actor,
                "action_summary": l.action_summary,
                "details": l.details,
                "created_at": l.created_at.isoformat()
            } for l in logs
        ]
    }
