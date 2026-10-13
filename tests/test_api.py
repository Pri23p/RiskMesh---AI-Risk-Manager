"""
RiskSentinel - Integration Tests for API Endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "RiskSentinel" in data["service"]

def test_analytics_endpoint():
    resp = client.get("/api/analytics")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_orders" in data
    assert "high_risk_orders" in data
    assert "risk_distribution" in data
    assert "net_savings" in data

def test_model_metrics_endpoints():
    resp = client.get("/api/model/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "precision" in data
    assert "recall" in data
    assert "pr_auc" in data
    assert "confusion_matrix" in data

def test_orders_list_and_detail():
    resp = client.get("/api/orders?page_size=10")
    assert resp.status_code == 200
    data = resp.json()
    assert "orders" in data
    assert len(data["orders"]) > 0
    
    first_oid = data["orders"][0]["order_id"]
    resp_det = client.get(f"/api/orders/{first_oid}")
    assert resp_det.status_code == 200
    det = resp_det.json()
    assert det["order"]["order_id"] == first_oid
    assert "prediction" in det
    assert "risk_score" in det["prediction"]

def test_high_risk_queue():
    resp = client.get("/api/risk/high")
    assert resp.status_code == 200
    data = resp.json()
    assert "high_risk_orders" in data

def test_single_predict_endpoint():
    order_payload = {
        "order_id": "ORD-TEST-9999",
        "customer_id": "CUST-TEST-01",
        "order_amount": 8499.0,
        "product_category": "Electronics & Gadgets",
        "payment_method": "Cash on Delivery (COD)",
        "is_cod": 1,
        "account_age_days": 5,
        "customer_previous_orders": 8,
        "customer_previous_returns": 6,
        "customer_previous_chargebacks": 2,
        "customer_return_rate": 0.75,
        "customer_chargeback_rate": 0.25,
        "average_order_value": 2800.0,
        "current_vs_average_order_ratio": 3.035,
        "billing_shipping_match": 0,
        "device_id": "DEV-RING-8899",
        "customers_from_device": 8,
        "orders_from_device": 28
    }
    
    resp = client.post("/api/predict", json=order_payload)
    assert resp.status_code == 200
    pred = resp.json()
    assert pred["order_id"] == "ORD-TEST-9999"
    assert "risk_score" in pred
    assert pred["risk_score"] >= 70 # Should score High risk
    assert pred["risk_level"] == "HIGH"
    assert len(pred["risk_factors"]) > 0

def test_clusters_endpoint():
    resp = client.get("/api/clusters")
    assert resp.status_code == 200
    data = resp.json()
    assert "clusters" in data
    assert len(data["clusters"]) >= 1

def test_alerts_endpoint():
    resp = client.get("/api/alerts")
    assert resp.status_code == 200
    data = resp.json()
    assert "alerts" in data
    assert len(data["alerts"]) >= 1

def test_merchant_decision_flow():
    resp_orders = client.get("/api/orders?page_size=1")
    oid = resp_orders.json()["orders"][0]["order_id"]
    
    resp_dec = client.post(f"/api/orders/{oid}/decision", json={
        "decision": "Request Verification",
        "analyst_name": "Senior Fraud Ops",
        "notes": "Requested customer identity and shipping confirmation before dispatch."
    })
    assert resp_dec.status_code == 200
    assert resp_dec.json()["status"] == "success"
    
    # Verify in audit log
    resp_audit = client.get("/api/audit")
    assert resp_audit.status_code == 200
    assert any(a["entity_id"] == oid for a in resp_audit.json()["audit_logs"])
