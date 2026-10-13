"""
RiskSentinel - End-to-End Live API Server Verification
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_live_endpoints():
    print("Testing RiskSentinel FastAPI Live Endpoints:")
    
    # 1. Health
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health error: {r.text}"
    print("  [OK] /api/health ->", r.json()["service"])
    
    # 2. Analytics
    r = client.get("/api/analytics")
    assert r.status_code == 200, f"Analytics error: {r.text}"
    d = r.json()
    print(f"  [OK] /api/analytics -> Orders: {d['total_orders']}, High-Risk: {d['high_risk_orders']}, Net Savings: INR {d['net_savings']:,.0f}")
    
    # 3. Model Metrics
    r = client.get("/api/model/metrics")
    assert r.status_code == 200
    p = r.json()
    print(f"  [OK] /api/model/metrics -> Model: {p['model_name']}, PR-AUC: {p['pr_auc']:.4f}, Recall: {p['recall']:.2%}, Precision: {p['precision']:.2%}")
    
    # 4. Model Thresholds
    r = client.get("/api/model/thresholds")
    assert r.status_code == 200
    t = r.json()
    print(f"  [OK] /api/model/thresholds -> Optimal Threshold: {t['config']['optimal_threshold']}, Curve Points: {len(t['curves']['points'])}")
    
    # 5. Orders Query & Detail
    r = client.get("/api/orders?page_size=5")
    assert r.status_code == 200
    orders_data = r.json()
    first_oid = orders_data['orders'][0]['order_id']
    print(f"  [OK] /api/orders -> Total: {orders_data['total_records']}, First: {first_oid}")
    
    r_det = client.get(f"/api/orders/{first_oid}")
    assert r_det.status_code == 200
    det = r_det.json()
    print(f"  [OK] /api/orders/{first_oid} -> Risk: {det['prediction']['risk_score']}/100, Action: {det['prediction']['recommended_action']}")
    
    # 6. Abuse-Ring Sentinel Clusters
    r_cl = client.get("/api/clusters")
    assert r_cl.status_code == 200
    cl_data = r_cl.json()
    print(f"  [OK] /api/clusters -> Total Clusters: {cl_data['total_clusters']}, Ring 1: {cl_data['clusters'][0]['cluster_name']}")
    
    # 7. Spike Detector Alerts
    r_al = client.get("/api/alerts")
    assert r_al.status_code == 200
    al_data = r_al.json()
    print(f"  [OK] /api/alerts -> Active Alerts: {al_data['active_alerts_count']}, Top Alert: {al_data['alerts'][0]['title']}")

    # 8. Single Prediction
    r_pred = client.post("/api/predict", json={
        "order_id": "ORD-10239",
        "customer_id": "CUST-99201",
        "order_amount": 8499.0,
        "product_category": "Electronics & Gadgets",
        "payment_method": "Cash on Delivery (COD)",
        "is_cod": 1,
        "account_age_days": 6,
        "customer_previous_orders": 8,
        "customer_previous_returns": 6,
        "customer_previous_chargebacks": 2,
        "customer_return_rate": 0.75,
        "current_vs_average_order_ratio": 3.035,
        "billing_shipping_match": 0,
        "device_id": "DEV-RING-8899",
        "customers_from_device": 8
    })
    assert r_pred.status_code == 200
    pred_res = r_pred.json()
    print(f"  [OK] /api/predict (ORD-10239) -> Score: {pred_res['risk_score']}/100 ({pred_res['risk_level']}), Action: {pred_res['recommended_action']}")

    # 9. Merchant Decision
    r_dec = client.post(f"/api/orders/{first_oid}/decision", json={
        "decision": "Request Verification",
        "analyst_name": "Fraud Operations Lead",
        "notes": "Triggered pre-shipment OTP verification."
    })
    assert r_dec.status_code == 200
    print(f"  [OK] /api/orders/{first_oid}/decision -> Status: {r_dec.json()['status']}")

    # 10. AI Copilot Chat
    r_chat = client.post("/api/chat", json={"message": "Why was order ORD-10239 flagged?"})
    assert r_chat.status_code == 200
    print("  [OK] /api/chat -> Response length:", len(r_chat.json()["reply"]))

    print("\n>>> ALL 10 RISK SENTINEL LIVE ENDPOINTS VERIFIED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_full_live_endpoints()
