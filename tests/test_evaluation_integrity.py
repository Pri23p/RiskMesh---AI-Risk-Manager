import numpy as np
import pandas as pd
import pytest
from src.models.calibration import compute_ece
from src.monitoring.drift_monitor import ProductionDriftMonitor

def test_ece_hand_calculated_and_endpoints():
    ece, _, bins = compute_ece(np.array([0, 1, 0, 1]), np.array([0., 0.2, 0.8, 1.]), 5)
    assert ece == pytest.approx(0.4)
    assert sum(b["sample_count"] for b in bins) == 4
    tiny, _, _ = compute_ece(np.array([0]), np.array([0.000001]))
    assert tiny > 0

def test_drift_stable_shifted_and_schema(tmp_path):
    features = ["order_amount", "account_age_days", "customer_return_rate",
                "customer_chargeback_rate", "current_vs_average_order_ratio", "orders_last_24h"]
    rng = np.random.default_rng(42)
    reference = pd.DataFrame({f: rng.normal(size=2000) for f in features})
    path = tmp_path / "reference.csv"
    reference.to_csv(path, index=False)
    monitor = ProductionDriftMonitor(str(path), str(tmp_path / "registry.json"), str(tmp_path))
    assert monitor.evaluate_feature_and_score_drift(reference, save_report=False)["drift_status"] == "HEALTHY"
    shifted = reference.copy()
    shifted["order_amount"] += 5
    assert monitor.evaluate_feature_and_score_drift(shifted, save_report=False)["drift_status"] == "CRITICAL_DRIFT"
    with pytest.raises(ValueError, match="schema"):
        monitor.evaluate_feature_and_score_drift(reference.drop(columns="order_amount"), save_report=False)
    psi, _ = monitor.calculate_psi(np.zeros(100), np.ones(100))
    assert psi > 0.2
