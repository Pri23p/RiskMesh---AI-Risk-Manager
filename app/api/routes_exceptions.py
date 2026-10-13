"""
RiskGuard AI - Human Review & Exception Routing Endpoints
Enables human risk analysts to review borderline, ambiguous, or anomalous cases and update review status.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import ExceptionRecord, Order, PredictionRecord
from app.schemas.schemas import ExceptionResponse, ExceptionUpdateRequest

router = APIRouter(prefix="/api", tags=["Human Review Exceptions"])

@router.get("/exceptions")
def list_exceptions(
    status: Optional[str] = None, # Pending, Approved, Escalated, Reviewed
    db: Session = Depends(get_db)
):
    query = db.query(ExceptionRecord)
    if status and status.lower() != "all":
        query = query.filter(ExceptionRecord.review_status == status.capitalize())
        
    records = query.order_by(desc(ExceptionRecord.created_at)).all()
    
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "order_id": r.order_id,
            "customer_id": r.customer_id,
            "total_order_value": r.total_order_value,
            "risk_score": r.risk_score,
            "risk_level": r.risk_level,
            "review_status": r.review_status,
            "escalation_reason": r.escalation_reason,
            "assigned_analyst": r.assigned_analyst,
            "analyst_notes": r.analyst_notes,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
            "updated_at": r.updated_at.strftime("%Y-%m-%d %H:%M:%S") if r.updated_at else ""
        })
    return {
        "total_exceptions": len(results),
        "pending_count": sum(1 for r in results if r["review_status"] == "Pending"),
        "exceptions": results
    }

@router.patch("/exceptions/{order_id}")
def update_exception_status(
    order_id: str,
    update: ExceptionUpdateRequest,
    db: Session = Depends(get_db)
):
    valid_statuses = ["Pending", "Approved", "Escalated", "Reviewed"]
    if update.review_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{update.review_status}'. Allowed statuses: {', '.join(valid_statuses)}"
        )

    record = db.query(ExceptionRecord).filter(ExceptionRecord.order_id == order_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Exception record for order {order_id} not found.")

    record.review_status = update.review_status
    if update.analyst_notes:
        record.analyst_notes = update.analyst_notes
        
    db.commit()
    db.refresh(record)

    return {
        "status": "success",
        "message": f"Order {order_id} review status updated to {update.review_status}.",
        "order_id": record.order_id,
        "review_status": record.review_status,
        "analyst_notes": record.analyst_notes,
        "updated_at": record.updated_at.strftime("%Y-%m-%d %H:%M:%S")
    }
