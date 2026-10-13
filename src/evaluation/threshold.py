"""
RiskSentinel - Threshold Optimization & Grid Evaluation
Evaluates operating thresholds (0.10 -> 0.90) to discover the optimal business operating point
that minimizes total merchant operational cost.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix
from src.evaluation.cost_model import BusinessCostModel

EVAL_THRESHOLDS = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90]

def evaluate_threshold_grid(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    cost_model: BusinessCostModel = None,
    thresholds: List[float] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Evaluates classification thresholds from 0.10 to 0.90 and computes business cost trade-offs.
    """
    if cost_model is None:
        cost_model = BusinessCostModel()
    if thresholds is None:
        thresholds = EVAL_THRESHOLDS

    results = []
    best_cost = float("inf")
    best_threshold_entry = None

    for th in thresholds:
        y_pred = (y_proba >= th).astype(int)
        
        cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()
        
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        rec = float(recall_score(y_true, y_pred, zero_division=0))
        f1 = float(f1_score(y_true, y_pred, zero_division=0))
        fpr = float(fp / max(1, fp + tn))
        fnr = float(fn / max(1, fn + tp))
        
        cost_info = cost_model.calculate_cost(fp=int(fp), fn=int(fn), tp=int(tp), tn=int(tn))
        
        entry = {
            "threshold": round(th, 2),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "false_positive_rate": round(fpr, 4),
            "false_negative_rate": round(fnr, 4),
            "fraud_captured_pct": round(rec * 100.0, 1),
            "manual_reviews_count": int(tp + fp),
            "true_positives": int(tp),
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "fp_cost": cost_info["fp_cost"],
            "fn_cost": cost_info["fn_cost"],
            "manual_review_cost": cost_info["manual_review_cost_total"],
            "expected_cost": cost_info["cost_with_model"],
            "loss_without_model": cost_info["loss_without_model"],
            "fraud_losses_prevented": cost_info["fraud_losses_prevented"],
            "net_savings": cost_info["net_savings"],
            "roi_percentage": cost_info["roi_percentage"]
        }
        results.append(entry)
        
        if cost_info["cost_with_model"] < best_cost:
            best_cost = cost_info["cost_with_model"]
            best_threshold_entry = entry

    opt_th = best_threshold_entry["threshold"] if best_threshold_entry else 0.45
    
    threshold_config = {
        "optimal_threshold": opt_th,
        "low_risk_max": 0.39,
        "medium_risk_min": 0.40,
        "medium_risk_max": 0.69,
        "high_risk_min": 0.70,
        "recommended_threshold": opt_th,
        "best_metrics": best_threshold_entry,
        "selection_criterion": "Minimum Total Expected Merchant Cost (Validation Set)"
    }
    
    return results, threshold_config
