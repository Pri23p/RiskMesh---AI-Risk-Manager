"""
RiskSentinel - Threshold Optimization & Policy Decisioning Engine
Evaluates operating thresholds (0.10 -> 0.90) to discover both the unconstrained cost-minimizing
cutoff and the balanced operational production threshold, accounting for false-positive friction
and fraud analyst workload constraints.
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
    thresholds: List[float] = None,
    max_acceptable_fpr: float = 0.10 # Operational ceiling: at most 10% false positive rate
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Evaluates classification thresholds from 0.10 to 0.90.
    Explicitly distinguishes:
    1. Unconstrained Cost-Minimizing Threshold: Lowest theoretical mathematical cost point.
    2. Operational Production Policy Threshold: Practical operating point enforcing manual-review
       capacity limits and customer friction constraints.
    """
    if cost_model is None:
        cost_model = BusinessCostModel()
    if thresholds is None:
        thresholds = EVAL_THRESHOLDS

    results = []
    min_cost = float("inf")
    cost_minimizing_entry = None
    operational_entry = None
    best_constrained_savings = -float("inf")

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

        # 1. Unconstrained mathematical minimum
        if cost_info["cost_with_model"] < min_cost:
            min_cost = cost_info["cost_with_model"]
            cost_minimizing_entry = entry

        # 2. Constrained operational policy: FPR <= max_acceptable_fpr (<= 10%) with highest net savings
        if fpr <= max_acceptable_fpr and cost_info["net_savings"] > best_constrained_savings:
            best_constrained_savings = cost_info["net_savings"]
            operational_entry = entry

    if operational_entry is None:
        raise ValueError("No threshold satisfies the false-positive constraint")

    cost_min_th = cost_minimizing_entry["threshold"]
    op_th = operational_entry["threshold"]

    policy_explanation = {
        "cost_minimizing_threshold": cost_min_th,
        "operational_threshold": op_th,
        "policy_rationale": (
            f"The unconstrained cost-minimizing threshold is {cost_min_th:.2f}, but produces "
            f"{cost_minimizing_entry['false_positives']:,} false positives ({cost_minimizing_entry['false_positive_rate']:.1%} FPR) "
            f"and generates {cost_minimizing_entry['manual_reviews_count']:,} review interruptions. "
            f"To protect legitimate customer experience and quantify fraud analyst workload, "
            f"production policy operates at {op_th:.2f}. This policy produces "
            f"{operational_entry['false_positives']:,} ({operational_entry['false_positive_rate']:.1%} FPR) "
            f"while preserving {operational_entry['fraud_captured_pct']:.1f}% fraud capture and delivering "
            f"INR {operational_entry['net_savings']:,.0f} in net savings."
        ),
        "tradeoff_comparison": {
            "at_cost_minimizing_cutoff": {
                "threshold": cost_min_th,
                "precision": cost_minimizing_entry["precision"],
                "recall": cost_minimizing_entry["recall"],
                "false_positives": cost_minimizing_entry["false_positives"],
                "false_positive_rate": cost_minimizing_entry["false_positive_rate"],
                "manual_reviews_generated": cost_minimizing_entry["manual_reviews_count"],
                "net_savings": cost_minimizing_entry["net_savings"]
            },
            "at_operational_policy_cutoff": {
                "threshold": op_th,
                "precision": operational_entry["precision"],
                "recall": operational_entry["recall"],
                "false_positives": operational_entry["false_positives"],
                "false_positive_rate": operational_entry["false_positive_rate"],
                "manual_reviews_generated": operational_entry["manual_reviews_count"],
                "net_savings": operational_entry["net_savings"]
            }
        }
    }

    threshold_config = {
        "optimal_threshold": op_th,  # Legacy alias for operational threshold
        "operating_threshold": op_th,
        "cost_optimal_threshold": cost_min_th,
        "low_risk_max": op_th,
        "medium_risk_min": op_th,
        "medium_risk_max": 0.70,
        "high_risk_min": 0.70,
        "policy_explanation": policy_explanation,
        "operational_metrics": operational_entry,
        "cost_minimizing_metrics": cost_minimizing_entry,
        "selection_criterion": "Operational Policy (FPR <= 10% & Maximum Net Merchant Savings)"
    }

    return results, threshold_config
