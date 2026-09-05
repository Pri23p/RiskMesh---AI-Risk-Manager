"""Model Evaluation Metrics on Held-out Test Data.

Calculates genuine metrics from ground truth labels and model predictions:
- Precision
- Recall
- F1 Score
- PR-AUC (Precision-Recall Area Under Curve / average_precision_score)
- ROC-AUC
- Confusion Matrix (True Positives, False Positives, True Negatives, False Negatives)
"""

from typing import Dict, Any, Union
import numpy as np
import pandas as pd
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    precision_recall_curve,
    auc,
    roc_auc_score,
    confusion_matrix,
)


def evaluate_model(
    y_true: Union[pd.Series, np.ndarray],
    y_pred_proba: Union[pd.Series, np.ndarray],
    threshold: float = 0.5,
) -> Dict[str, Any]:
    """Computes comprehensive evaluation metrics on held-out test data."""
    y_true_arr = np.asarray(y_true).astype(int)
    y_proba_arr = np.asarray(y_pred_proba).astype(float)
    y_pred_arr = (y_proba_arr >= threshold).astype(int)

    # Standard classification metrics
    precision = float(precision_score(y_true_arr, y_pred_arr, zero_division=0))
    recall = float(recall_score(y_true_arr, y_pred_arr, zero_division=0))
    f1 = float(f1_score(y_true_arr, y_pred_arr, zero_division=0))

    # Precision-Recall Curve AUC (Critical for imbalanced fraud detection)
    precisions, recalls, _ = precision_recall_curve(y_true_arr, y_proba_arr)
    pr_auc = float(auc(recalls, precisions))

    # ROC AUC
    roc_auc = float(roc_auc_score(y_true_arr, y_proba_arr))

    # Confusion Matrix
    cm = confusion_matrix(y_true_arr, y_pred_arr)
    tn, fp, fn, tp = [int(v) for v in cm.ravel()]

    total_samples = len(y_true_arr)
    fraud_samples = int(np.sum(y_true_arr == 1))
    non_fraud_samples = int(np.sum(y_true_arr == 0))

    return {
        "dataset_summary": {
            "total_test_samples": total_samples,
            "fraud_samples": fraud_samples,
            "non_fraud_samples": non_fraud_samples,
            "fraud_prevalence_pct": round((fraud_samples / total_samples) * 100, 3),
        },
        "threshold": threshold,
        "metrics": {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "pr_auc": round(pr_auc, 4),
            "roc_auc": round(roc_auc, 4),
        },
        "confusion_matrix": {
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "true_positives": tp,
            "matrix_2x2": [[tn, fp], [fn, tp]],
        },
    }
