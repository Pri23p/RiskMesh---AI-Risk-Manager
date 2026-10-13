"""
RiskSentinel - Spike Detector API Routes
Real-time temporal anomaly detection monitoring return velocity surges, chargeback spikes,
and high-risk category bursts.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Alert

router = APIRouter(tags=["Spike Detector & Alerts"])

@router.get("/api/alerts")
@router.get("/alerts")
def get_anomaly_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(desc(Alert.created_at)).all()
    results = []
    for a in alerts:
        results.append({
            "alert_id": a.alert_id,
            "title": a.title,
            "severity": a.severity,
            "category": a.category,
            "reason": a.reason,
            "potential_exposure": a.potential_exposure,
            "affected_orders_count": a.affected_orders_count,
            "status": a.status,
            "timestamp": a.timestamp,
            "created_at": a.created_at.isoformat()
        })
    return {"alerts": results, "active_alerts_count": len([r for r in results if r["status"] == "Active"])}
