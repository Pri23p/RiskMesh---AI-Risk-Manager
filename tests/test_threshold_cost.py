"""
RiskSentinel - Unit Tests for Threshold Grid Optimization & Financial Cost Modeling
"""

import pytest
import numpy as np
from src.evaluation.cost_model import BusinessCostModel
from src.evaluation.threshold import evaluate_threshold_grid

def test_business_cost_calculation():
    cm = BusinessCostModel(fraud_loss_per_order=2000.0, false_positive_cost=300.0, manual_review_cost=40.0, false_negative_cost=2000.0)
    
    cost_res = cm.calculate_cost(fp=10, fn=5, tp=20, tn=65, reviews_count=30)
    
    # 10 * 300 = 3000
    assert cost_res["fp_cost"] == 3000.0
    # 5 * 2000 = 10000
    assert cost_res["fn_cost"] == 10000.0
    # 30 * 40 = 1200
    assert cost_res["manual_review_cost_total"] == 1200.0
    # Loss without model = (20 + 5) * 2000 = 50000
    assert cost_res["loss_without_model"] == 50000.0
    # Cost with model = 10000 + 3000 + 1200 = 14200
    assert cost_res["cost_with_model"] == 14200.0
    # Net savings = 50000 - 14200 = 35800
    assert cost_res["net_savings"] == 35800.0

def test_threshold_grid_evaluation():
    y_true = np.array([0, 0, 0, 1, 1, 1, 0, 1, 0, 1])
    y_proba = np.array([0.1, 0.2, 0.35, 0.7, 0.85, 0.9, 0.25, 0.65, 0.4, 0.8])
    
    grid, config = evaluate_threshold_grid(y_true, y_proba, thresholds=[0.30, 0.50, 0.70])
    
    assert len(grid) == 3
    assert "optimal_threshold" in config
    assert config["optimal_threshold"] in [0.30, 0.50, 0.70]
    assert "low_risk_max" in config
    assert "high_risk_min" in config
