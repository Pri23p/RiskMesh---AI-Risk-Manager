"""
RiskSentinel - Database Seeder
Seeds SQLite database with historical orders, predictions, abuse ring clusters,
temporal anomaly alerts, and initial audit logs.
"""

import os
import sys
import uuid
import json
import pandas as pd
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database import SessionLocal, init_db
from app.models import Order, PredictionRecord, MerchantDecision, Alert, Cluster, AuditLog
from app.services.risk_service import RiskScoringService

def seed_database(test_data_path: str = "data/processed/test.csv", max_records: int = 1500):
    init_db()
    db = SessionLocal()
    
    existing_count = db.query(Order).count()
    if existing_count >= 500:
        print(f"[DB] Database already seeded with {existing_count} orders.")
        db.close()
        return

    if not os.path.exists(test_data_path):
        print(f"[DB] Seed file {test_data_path} not found. Skipping auto-seed.")
        db.close()
        return

    print(f"[DB] Seeding RiskSentinel database with records from {test_data_path}...")
    df = pd.read_csv(test_data_path)
    if max_records and len(df) > max_records:
        df = df.iloc[:max_records]

    risk_service = RiskScoringService.get_instance()
    scored_results = risk_service.score_batch(df)
    
    orders_to_add = []
    preds_to_add = []
    
    for i, row in df.iterrows():
        order_obj = Order(
            order_id=str(row["order_id"]),
            customer_id=str(row["customer_id"]),
            timestamp=str(row["timestamp"]),
            order_amount=float(row["order_amount"]),
            product_category=str(row["product_category"]),
            payment_method=str(row["payment_method"]),
            is_cod=int(row["is_cod"]),
            account_age_days=int(row["account_age_days"]),
            customer_previous_orders=int(row["customer_previous_orders"]),
            customer_previous_returns=int(row["customer_previous_returns"]),
            customer_previous_chargebacks=int(row["customer_previous_chargebacks"]),
            customer_return_rate=float(row["customer_return_rate"]),
            customer_chargeback_rate=float(row["customer_chargeback_rate"]),
            average_order_value=float(row["average_order_value"]),
            current_vs_average_order_ratio=float(row["current_vs_average_order_ratio"]),
            billing_shipping_match=int(row["billing_shipping_match"]),
            shipping_distance=float(row["shipping_distance"]),
            number_of_addresses=int(row["number_of_addresses"]),
            device_id=str(row["device_id"]),
            orders_from_device=int(row["orders_from_device"]),
            customers_from_device=int(row["customers_from_device"]),
            orders_last_24h=int(row["orders_last_24h"]),
            orders_last_7d=int(row["orders_last_7d"]),
            customer_orders_last_30d=int(row["customer_orders_last_30d"]),
            high_value_item=int(row["high_value_item"]),
            delivery_attempts=int(row["delivery_attempts"]),
            refund_requested=int(row["refund_requested"]),
            return_requested=int(row["return_requested"]),
            return_reason=str(row["return_reason"]),
            previous_failed_deliveries=int(row["previous_failed_deliveries"]),
            ip_region=str(row["ip_region"]),
            customer_region=str(row["customer_region"]),
            device_risk_history=float(row["device_risk_history"]),
            fraudulent_return=int(row["fraudulent_return"]) if "fraudulent_return" in row else None
        )
        orders_to_add.append(order_obj)
        
        pred_meta = scored_results[i]
        pred_obj = PredictionRecord(
            order_id=str(row["order_id"]),
            risk_score=pred_meta["risk_score"],
            risk_score_pct=pred_meta["risk_score_pct"],
            fraud_probability=pred_meta["fraud_probability"],
            risk_level=pred_meta["risk_level"],
            recommended_action=pred_meta["recommended_action"],
            estimated_exposure=float(row["order_amount"]),
            requires_human_review=pred_meta["requires_human_review"],
            review_reason=pred_meta["review_reason"],
            risk_factors=pred_meta["risk_factors"],
            top_contributing_factors=pred_meta["top_contributing_factors"],
            top_protective_factors=pred_meta["top_protective_factors"],
            all_contributions=pred_meta["all_contributions"],
            decision_narrative=pred_meta["decision_narrative"]
        )
        preds_to_add.append(pred_obj)

    # 2. Seed Coordinated Abuse Ring Clusters
    cluster_1_nodes = [
        {"id": "DEV-RING-8899", "label": "Device: DEV-RING-8899", "type": "device", "risk": "HIGH"},
        {"id": "ADDR-RING-4411", "label": "Address: 4411 Sector 14", "type": "address", "risk": "HIGH"},
        {"id": "ADDR-RING-4412", "label": "Address: 4412 Sector 14", "type": "address", "risk": "HIGH"},
        {"id": "CUST-99201", "label": "Customer: CUST-99201 (ORD-10239)", "type": "customer", "risk": "HIGH", "return_rate": 0.75},
        {"id": "CUST-99202", "label": "Customer: CUST-99202", "type": "customer", "risk": "HIGH", "return_rate": 0.80},
        {"id": "CUST-99203", "label": "Customer: CUST-99203", "type": "customer", "risk": "HIGH", "return_rate": 0.70},
        {"id": "CUST-99204", "label": "Customer: CUST-99204", "type": "customer", "risk": "HIGH", "return_rate": 0.65},
        {"id": "CUST-99205", "label": "Customer: CUST-99205", "type": "customer", "risk": "HIGH", "return_rate": 0.72},
        {"id": "CUST-99206", "label": "Customer: CUST-99206", "type": "customer", "risk": "HIGH", "return_rate": 0.68},
        {"id": "CUST-99207", "label": "Customer: CUST-99207", "type": "customer", "risk": "HIGH", "return_rate": 0.75},
        {"id": "CUST-99208", "label": "Customer: CUST-99208", "type": "customer", "risk": "HIGH", "return_rate": 0.71}
    ]
    cluster_1_links = [
        {"source": "CUST-99201", "target": "DEV-RING-8899", "relationship": "SHARED_DEVICE"},
        {"source": "CUST-99202", "target": "DEV-RING-8899", "relationship": "SHARED_DEVICE"},
        {"source": "CUST-99203", "target": "DEV-RING-8899", "relationship": "SHARED_DEVICE"},
        {"source": "CUST-99204", "target": "DEV-RING-8899", "relationship": "SHARED_DEVICE"},
        {"source": "CUST-99205", "target": "DEV-RING-8899", "relationship": "SHARED_DEVICE"},
        {"source": "CUST-99206", "target": "DEV-RING-8899", "relationship": "SHARED_DEVICE"},
        {"source": "CUST-99207", "target": "DEV-RING-8899", "relationship": "SHARED_DEVICE"},
        {"source": "CUST-99208", "target": "DEV-RING-8899", "relationship": "SHARED_DEVICE"},
        {"source": "CUST-99201", "target": "ADDR-RING-4411", "relationship": "SHIPPING_DEST"},
        {"source": "CUST-99202", "target": "ADDR-RING-4411", "relationship": "SHIPPING_DEST"},
        {"source": "CUST-99203", "target": "ADDR-RING-4411", "relationship": "SHIPPING_DEST"},
        {"source": "CUST-99204", "target": "ADDR-RING-4412", "relationship": "SHIPPING_DEST"},
        {"source": "CUST-99205", "target": "ADDR-RING-4412", "relationship": "SHIPPING_DEST"},
        {"source": "CUST-99206", "target": "ADDR-RING-4412", "relationship": "SHIPPING_DEST"}
    ]

    cluster_1 = Cluster(
        cluster_id="CLUSTER-RING-8899",
        cluster_name="Coordinated Wardrobing & Electronic Return Ring #8899",
        risk_level="HIGH",
        customer_count=8,
        shared_devices_count=1,
        shared_addresses_count=2,
        historical_return_rate=0.71,
        potential_exposure=48500.0,
        customer_ids=["CUST-99201", "CUST-99202", "CUST-99203", "CUST-99204", "CUST-99205", "CUST-99206", "CUST-99207", "CUST-99208"],
        device_ids=["DEV-RING-8899"],
        address_ids=["ADDR-RING-4411", "ADDR-RING-4412"],
        nodes_data=cluster_1_nodes,
        links_data=cluster_1_links
    )

    cluster_2 = Cluster(
        cluster_id="CLUSTER-RING-8890",
        cluster_name="Multi-Account Luxury Sizing Cluster #8890",
        risk_level="MEDIUM",
        customer_count=4,
        shared_devices_count=1,
        shared_addresses_count=1,
        historical_return_rate=0.62,
        potential_exposure=26800.0,
        customer_ids=["CUST-99209", "CUST-99210", "CUST-99211", "CUST-99212"],
        device_ids=["DEV-RING-8890"],
        address_ids=["ADDR-RING-4413"],
        nodes_data=[],
        links_data=[]
    )

    # 3. Seed Anomaly Alerts
    alert_1 = Alert(
        alert_id="ALERT-901",
        title="Abnormal Spike in Electronics Return Requests",
        severity="HIGH",
        category="Electronics & Gadgets",
        reason="Suspicious return requests are 3.2 standard deviations above historical baseline during the last 6 hours (230% velocity increase).",
        potential_exposure=240000.0,
        affected_orders_count=28,
        status="Active",
        timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    )

    alert_2 = Alert(
        alert_id="ALERT-902",
        title="Multi-Account Shared Device Concentration",
        severity="HIGH",
        category="Device Security",
        reason="Device DEV-RING-8899 generated 8 new customer accounts with 100% COD payment methods and immediate large orders.",
        potential_exposure=48500.0,
        affected_orders_count=8,
        status="Active",
        timestamp=(datetime.utcnow() - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
    )

    alert_3 = Alert(
        alert_id="ALERT-903",
        title="High-Value Apparel Wardrobing Pattern",
        severity="MEDIUM",
        category="Apparel & Footwear",
        reason="Elevated 3-quantity luxury dress orders with short return turnaround time (< 3 days).",
        potential_exposure=34000.0,
        affected_orders_count=12,
        status="Active",
        timestamp=(datetime.utcnow() - timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")
    )

    # 4. Seed Initial Audit Logs
    audit_1 = AuditLog(
        event_type="SYSTEM_BOOT",
        entity_id="SYSTEM-01",
        actor="RiskSentinel Engine",
        action_summary="RiskSentinel ML Engine initialized with Gradient Boosting model pipeline (PR-AUC 0.8920, Optimal Threshold 0.45).",
        details={"model_version": "v1.0.0-xgb", "threshold": 0.45}
    )

    db.bulk_save_objects(orders_to_add)
    db.bulk_save_objects(preds_to_add)
    db.add(cluster_1)
    db.add(cluster_2)
    db.add(alert_1)
    db.add(alert_2)
    db.add(alert_3)
    db.add(audit_1)
    db.commit()
    db.close()
    
    print(f"[DB] Successfully seeded {len(orders_to_add)} orders, {len(preds_to_add)} predictions, 2 clusters, and 3 anomaly alerts.")

if __name__ == "__main__":
    seed_database()
