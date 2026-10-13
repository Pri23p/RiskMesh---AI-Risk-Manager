"""
RiskSentinel - Abuse-Ring Sentinel Graph API Routes
Identifies suspicious multi-account clusters sharing devices, shipping addresses,
and exhibiting abnormal return/chargeback velocity.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Cluster, Order, PredictionRecord

router = APIRouter(tags=["Abuse-Ring Sentinel"])

@router.get("/api/clusters")
@router.get("/clusters")
def get_abuse_clusters(db: Session = Depends(get_db)):
    clusters = db.query(Cluster).all()
    results = []
    for c in clusters:
        results.append({
            "cluster_id": c.cluster_id,
            "cluster_name": c.cluster_name,
            "risk_level": c.risk_level,
            "customer_count": c.customer_count,
            "shared_devices_count": c.shared_devices_count,
            "shared_addresses_count": c.shared_addresses_count,
            "historical_return_rate": c.historical_return_rate,
            "potential_exposure": c.potential_exposure,
            "customer_ids": c.customer_ids,
            "device_ids": c.device_ids,
            "address_ids": c.address_ids,
            "nodes_count": len(c.nodes_data) if c.nodes_data else 0,
            "links_count": len(c.links_data) if c.links_data else 0,
            "created_at": c.created_at.isoformat()
        })
    return {"clusters": results, "total_clusters": len(results)}

@router.get("/api/clusters/{cluster_id}")
def get_cluster_detail(cluster_id: str, db: Session = Depends(get_db)):
    cluster = db.query(Cluster).filter(Cluster.cluster_id == cluster_id).first()
    if not cluster:
        raise HTTPException(status_code=404, detail=f"Cluster {cluster_id} not found.")

    return {
        "cluster_id": cluster.cluster_id,
        "cluster_name": cluster.cluster_name,
        "risk_level": cluster.risk_level,
        "customer_count": cluster.customer_count,
        "shared_devices_count": cluster.shared_devices_count,
        "shared_addresses_count": cluster.shared_addresses_count,
        "historical_return_rate": cluster.historical_return_rate,
        "potential_exposure": cluster.potential_exposure,
        "customer_ids": cluster.customer_ids,
        "device_ids": cluster.device_ids,
        "address_ids": cluster.address_ids,
        "nodes": cluster.nodes_data or [],
        "links": cluster.links_data or []
    }
