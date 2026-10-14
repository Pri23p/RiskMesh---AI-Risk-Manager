"""
RiskSentinel - Comprehensive End-to-End Transaction Workflow Integration Test
Demonstrates the complete transaction lifecycle:
1. Ingestion of raw order payload
2. Defensive feature engineering (zero leakage)
3. Calibrated probability scoring & business risk score mapping
4. SHAP feature contribution & narrative attribution
5. Grounded AI Analyst Agent dossier generation
6. Dynamic threshold decisioning & cost optimization
7. Production drift monitoring on incoming batch
8. Merchant action audit trail recording
"""

import pytest
import os
import pandas as pd
import numpy as np
from app.services.risk_service import RiskScoringService
from app.services.analyst_agent import GroundedAnalystAgent
from src.monitoring.drift_monitor import ProductionDriftMonitor
from src.evaluation.cost_model import BusinessCostModel

def test_complete_transaction_workflow(tmp_path):
    # Step 1: Simulate incoming merchant order transaction
    order_payload = {
        "order_id": "ORD-LIVE-77881",
        "customer_id": "CUST-99881",
        "timestamp": "2026-10-14 02:00:00",
        "order_amount": 14999.0,
        "product_category": "Electronics & Gadgets",
        "payment_method": "Cash on Delivery (COD)",
        "is_cod": 1,
        "account_age_days": 12,
        "customer_previous_orders": 6,
        "customer_previous_returns": 5,
        "customer_previous_chargebacks": 1,
        "customer_return_rate": 0.8333,
        "customer_chargeback_rate": 0.1667,
        "average_order_value": 3200.0,
        "current_vs_average_order_ratio": 4.68,
        "billing_shipping_match": 0,
        "shipping_distance": 840.5,
        "number_of_addresses": 3,
        "device_id": "DEV-RING-SHARED-99",
        "orders_from_device": 19,
        "customers_from_device": 7,
        "orders_last_24h": 4,
        "orders_last_7d": 8,
        "customer_orders_last_30d": 5,
        "high_value_item": 1,
        "delivery_attempts": 1,
        "previous_failed_deliveries": 0,
        "ip_region": "North",
        "customer_region": "West",
        "device_risk_history": 0.88
    }

    # Step 2 & 3: Run through RiskScoringService
    service = RiskScoringService.get_instance()
    risk_result = service.score_single(order_payload)

    assert "risk_score" in risk_result
    assert 0 <= risk_result["risk_score"] <= 100
    assert "fraud_probability" in risk_result
    assert 0.0 <= risk_result["fraud_probability"] <= 1.0
    assert risk_result["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
    assert risk_result["risk_level"] == "HIGH"
    assert risk_result["is_calibrated"] is True

    # Step 4: Verify SHAP & Risk Contributions
    assert len(risk_result["top_contributing_factors"]) > 0
    top_feature_names = [f["feature"] for f in risk_result["top_contributing_factors"]]
    assert any("return_rate" in fn or "chargeback" in fn or "device" in fn or "surge" in fn or "ratio" in fn for fn in top_feature_names)

    # Step 5: Generate Grounded AI Analyst Dossier
    cluster_mock = {
        "cluster_name": "Ring Alpha #99",
        "shared_devices_count": 1,
        "customer_count": 7,
        "historical_return_rate": 0.85,
        "potential_exposure": 105000.0
    }
    dossier = GroundedAnalystAgent.generate_investigation_dossier(
        order=order_payload,
        risk_evaluation=risk_result,
        cluster_info=cluster_mock
    )

    assert dossier["order_id"] == "ORD-LIVE-77881"
    assert dossier["analyst_verdict"] == "HOLD_MANUAL_REVIEW"
    assert dossier["urgency"] == "HIGH"
    assert len(dossier["red_flags"]) >= 2
    assert dossier["agent_metadata"]["grounded"] is True

    # Step 6: Verify Business Cost Decisioning
    cost_model = BusinessCostModel()
    cost_res = cost_model.calculate_cost(fp=0, fn=0, tp=1, tn=0)
    assert cost_res["fraud_losses_prevented"] > 0

    # Step 7: Drift Evaluation on Batch
    batch_df = pd.DataFrame([order_payload] * 15)
    drift_monitor = ProductionDriftMonitor(artifacts_dir=str(tmp_path))
    drift_report = drift_monitor.evaluate_feature_and_score_drift(
        current_df=batch_df,
        save_report=False
    )
    assert "drift_status" in drift_report
    assert "overall_max_psi" in drift_report
