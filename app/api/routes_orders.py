"""
RiskSentinel - Orders & Risk Queue API Routes
Search, filter, paginate orders and fetch comprehensive order investigation dossiers.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.database import get_db
from app.models import Order, PredictionRecord, MerchantDecision, Cluster, AuditLog

router = APIRouter(tags=["Orders & Risk Queue"])

@router.get("/api/orders")
@router.get("/orders")
def get_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    risk_level: Optional[str] = None, # LOW, MEDIUM, HIGH
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    payment_method: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: Optional[str] = "risk_score", # risk_score, order_amount, timestamp
    sort_order: Optional[str] = "desc", # asc, desc
    db: Session = Depends(get_db)
):
    query = db.query(Order, PredictionRecord).outerjoin(
        PredictionRecord, Order.order_id == PredictionRecord.order_id
    )

    if search:
        s_term = f"%{search.strip()}%"
        query = query.filter((Order.order_id.ilike(s_term)) | (Order.customer_id.ilike(s_term)) | (Order.device_id.ilike(s_term)))

    if risk_level and risk_level.upper() in ["LOW", "MEDIUM", "HIGH"]:
        query = query.filter(PredictionRecord.risk_level == risk_level.upper())

    if min_amount is not None:
        query = query.filter(Order.order_amount >= min_amount)

    if max_amount is not None:
        query = query.filter(Order.order_amount <= max_amount)

    if payment_method:
        query = query.filter(Order.payment_method == payment_method)

    if category:
        query = query.filter(Order.product_category == category)

    # Sorting
    if sort_by == "risk_score":
        sort_col = PredictionRecord.risk_score
    elif sort_by == "order_amount":
        sort_col = Order.order_amount
    else:
        sort_col = Order.id

    if sort_order == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    total_records = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    results = []
    for order, pred in items:
        # Check if merchant took a decision
        decision = db.query(MerchantDecision).filter(MerchantDecision.order_id == order.order_id).first()
        status = decision.decision if decision else "Pending"

        top_factor = "Normal Profile"
        if pred and pred.risk_factors and len(pred.risk_factors) > 0:
            top_factor = pred.risk_factors[0]
        elif pred and pred.top_contributing_factors and len(pred.top_contributing_factors) > 0:
            top_factor = pred.top_contributing_factors[0].get("readable_name", "Risk Factor")

        results.append({
            "order_id": order.order_id,
            "customer_id": order.customer_id,
            "timestamp": order.timestamp,
            "order_amount": order.order_amount,
            "product_category": order.product_category,
            "payment_method": order.payment_method,
            "is_cod": order.is_cod,
            "risk_score": pred.risk_score if pred else 50,
            "risk_level": pred.risk_level if pred else "MEDIUM",
            "fraud_probability": pred.fraud_probability if pred else 0.50,
            "primary_risk_factor": top_factor,
            "recommended_action": pred.recommended_action if pred else "Review Order",
            "estimated_exposure": order.order_amount,
            "status": status,
            "device_id": order.device_id,
            "billing_shipping_match": order.billing_shipping_match
        })

    return {
        "page": page,
        "page_size": page_size,
        "total_records": total_records,
        "total_pages": max(1, (total_records + page_size - 1) // page_size),
        "orders": results
    }

@router.get("/api/risk/high")
@router.get("/risk/high")
def get_high_risk_orders(limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(Order, PredictionRecord).join(
        PredictionRecord, Order.order_id == PredictionRecord.order_id
    ).filter(PredictionRecord.risk_level == "HIGH").order_by(desc(PredictionRecord.risk_score)).limit(limit).all()

    results = []
    for order, pred in query:
        decision = db.query(MerchantDecision).filter(MerchantDecision.order_id == order.order_id).first()
        results.append({
            "order_id": order.order_id,
            "customer_id": order.customer_id,
            "timestamp": order.timestamp,
            "order_amount": order.order_amount,
            "product_category": order.product_category,
            "payment_method": order.payment_method,
            "risk_score": pred.risk_score,
            "risk_level": pred.risk_level,
            "fraud_probability": pred.fraud_probability,
            "primary_risk_factor": pred.risk_factors[0] if pred.risk_factors else "High return risk",
            "recommended_action": pred.recommended_action,
            "estimated_exposure": order.order_amount,
            "status": decision.decision if decision else "Pending"
        })
    return {"high_risk_orders": results, "count": len(results)}

@router.get("/api/orders/{order_id}")
@router.get("/orders/{order_id}")
def get_order_details(order_id: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found.")

    pred = db.query(PredictionRecord).filter(PredictionRecord.order_id == order_id).first()
    decisions = db.query(MerchantDecision).filter(MerchantDecision.order_id == order_id).all()
    audit_trail = db.query(AuditLog).filter(AuditLog.entity_id == order_id).order_by(desc(AuditLog.created_at)).all()
    
    # Check if part of any suspicious cluster
    related_cluster = None
    clusters = db.query(Cluster).all()
    for cl in clusters:
        if cl.customer_ids and order.customer_id in cl.customer_ids:
            related_cluster = {
                "cluster_id": cl.cluster_id,
                "cluster_name": cl.cluster_name,
                "risk_level": cl.risk_level,
                "customer_count": cl.customer_count,
                "shared_devices_count": cl.shared_devices_count,
                "historical_return_rate": cl.historical_return_rate,
                "potential_exposure": cl.potential_exposure
            }
            break

    return {
        "order": {
            "order_id": order.order_id,
            "customer_id": order.customer_id,
            "timestamp": order.timestamp,
            "order_amount": order.order_amount,
            "product_category": order.product_category,
            "payment_method": order.payment_method,
            "is_cod": order.is_cod,
            "account_age_days": order.account_age_days,
            "customer_previous_orders": order.customer_previous_orders,
            "customer_previous_returns": order.customer_previous_returns,
            "customer_previous_chargebacks": order.customer_previous_chargebacks,
            "customer_return_rate": order.customer_return_rate,
            "customer_chargeback_rate": order.customer_chargeback_rate,
            "average_order_value": order.average_order_value,
            "current_vs_average_order_ratio": order.current_vs_average_order_ratio,
            "billing_shipping_match": order.billing_shipping_match,
            "shipping_distance": order.shipping_distance,
            "number_of_addresses": order.number_of_addresses,
            "device_id": order.device_id,
            "orders_from_device": order.orders_from_device,
            "customers_from_device": order.customers_from_device,
            "orders_last_24h": order.orders_last_24h,
            "orders_last_7d": order.orders_last_7d,
            "customer_orders_last_30d": order.customer_orders_last_30d,
            "high_value_item": order.high_value_item,
            "delivery_attempts": order.delivery_attempts,
            "previous_failed_deliveries": order.previous_failed_deliveries,
            "ip_region": order.ip_region,
            "customer_region": order.customer_region,
            "device_risk_history": order.device_risk_history
        },
        "prediction": {
            "risk_score": pred.risk_score if pred else 50,
            "risk_score_pct": pred.risk_score_pct if pred else 50.0,
            "fraud_probability": pred.fraud_probability if pred else 0.50,
            "risk_level": pred.risk_level if pred else "MEDIUM",
            "recommended_action": pred.recommended_action if pred else "Review Order",
            "estimated_exposure": pred.estimated_exposure if pred else order.order_amount,
            "requires_human_review": pred.requires_human_review if pred else True,
            "review_reason": pred.review_reason if pred else None,
            "risk_factors": pred.risk_factors if pred else [],
            "top_contributing_factors": pred.top_contributing_factors if pred else [],
            "top_protective_factors": pred.top_protective_factors if pred else [],
            "all_contributions": pred.all_contributions if pred else [],
            "decision_narrative": pred.decision_narrative if pred else ""
        },
        "related_cluster": related_cluster,
        "decisions": [
            {
                "id": d.id,
                "decision": d.decision,
                "status": d.status,
                "analyst_name": d.analyst_name,
                "notes": d.notes,
                "loss_saved_estimate": d.loss_saved_estimate,
                "created_at": d.created_at.isoformat()
            } for d in decisions
        ],
        "audit_trail": [
            {
                "id": a.id,
                "event_type": a.event_type,
                "actor": a.actor,
                "action_summary": a.action_summary,
                "details": a.details,
                "created_at": a.created_at.isoformat()
            } for a in audit_trail
        ]
    }
