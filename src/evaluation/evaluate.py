"""
RiskSentinel - Held-out Test Set Final Honest Evaluation & Calibration Validation
Evaluates chosen model on unseen test set (7,500 records), tests probability calibration,
computes precision-recall curve, ROC curve, comprehensive financial threshold sensitivity,
and writes honest metrics artifacts.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any

from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix, precision_recall_curve,
    roc_curve, brier_score_loss
)

from src.evaluation.cost_model import BusinessCostModel
from src.features.engineer import get_feature_names

def evaluate_held_out_test_set(
    test_path: str = "data/processed/test.csv",
    model_pipeline_path: str = "artifacts/models/best_model_pipeline.joblib",
    threshold_config_path: str = "artifacts/metrics/threshold_config.json",
    metrics_output_dir: str = "artifacts/metrics"
):
    print("=" * 75, flush=True)
    print("RiskSentinel - Held-Out Test Set Final Honest Evaluation", flush=True)
    print("=" * 75, flush=True)
    
    # 1. Load test data
    test_df = pd.read_csv(test_path)
    y_test = test_df["fraudulent_return"].values
    
    print(f"[TEST] Held-out test records: {len(test_df):,}", flush=True)
    print(f"[TEST] Actual high-risk fraudulent return positives: {y_test.sum():,} ({y_test.mean():.2%})", flush=True)
    
    # 2. Load model pipeline and threshold config
    pipeline = joblib.load(model_pipeline_path)
    feat_engineer = pipeline["feature_engineer"]
    preprocessor = pipeline["preprocessor"]
    clf = pipeline["classifier"]
    calibrator = pipeline.get("calibrator", None)
    model_name = pipeline.get("model_name", "Best Model")
    
    with open(threshold_config_path, "r") as f:
        threshold_config = json.load(f)
    
    operating_threshold = threshold_config.get("optimal_threshold", 0.45)
    print(f"[MODEL] Loaded pipeline: {model_name}", flush=True)
    print(f"[MODEL] Operating classification threshold: {operating_threshold:.2f}", flush=True)
    
    # 3. Transform test features & predict probabilities
    test_engineered = feat_engineer.transform(test_df)
    X_test_trans = preprocessor.transform(test_engineered)
    
    if calibrator is not None and hasattr(calibrator, "predict_proba"):
        test_proba = calibrator.predict_proba(X_test_trans)[:, 1]
        print("[CALIBRATION] Using isotonic calibrated probabilities for evaluation.", flush=True)
    else:
        test_proba = clf.predict_proba(X_test_trans)[:, 1]
        
    test_preds = (test_proba >= operating_threshold).astype(int)
    
    # 4. Calculate core metrics on held-out test data
    cm = confusion_matrix(y_test, test_preds, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    
    prec = float(precision_score(y_test, test_preds, zero_division=0))
    rec = float(recall_score(y_test, test_preds, zero_division=0))
    f1 = float(f1_score(y_test, test_preds, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, test_proba))
    pr_auc = float(average_precision_score(y_test, test_proba))
    fpr = float(fp / max(1, fp + tn))
    fnr = float(fn / max(1, fn + tp))
    accuracy = float((tp + tn) / len(y_test))
    brier = float(brier_score_loss(y_test, test_proba))
    
    cost_model = BusinessCostModel(
        fraud_loss_per_order=2000.0,
        false_positive_cost=300.0,
        manual_review_cost=40.0,
        false_negative_cost=2000.0
    )
    
    low_band = threshold_config.get("low_risk_max", 0.39)
    high_band = threshold_config.get("high_risk_min", 0.70)
    review_count = int(np.sum((test_proba >= low_band) & (test_proba < high_band)))
    
    cost_metrics = cost_model.calculate_cost(
        fp=int(fp), fn=int(fn), tp=int(tp), tn=int(tn), reviews_count=review_count
    )
    
    print("\n" + "-" * 55, flush=True)
    print(f"HELD-OUT TEST SET METRICS ({model_name} @ Threshold={operating_threshold:.2f}):", flush=True)
    print(f"  Test Dataset Size:   {len(y_test):,} orders", flush=True)
    print(f"  Accuracy:            {accuracy:.4f} ({accuracy*100:.1f}%)", flush=True)
    print(f"  Precision:           {prec:.4f} ({prec*100:.1f}%)", flush=True)
    print(f"  Recall:              {rec:.4f} ({rec*100:.1f}%)", flush=True)
    print(f"  F1 Score:            {f1:.4f}", flush=True)
    print(f"  PR-AUC:              {pr_auc:.4f}", flush=True)
    print(f"  ROC-AUC:             {roc_auc:.4f}", flush=True)
    print(f"  Brier Score:         {brier:.4f}", flush=True)
    print(f"  False Positive Rate: {fpr:.4f} ({fpr*100:.1f}%)", flush=True)
    print(f"  False Negative Rate: {fnr:.4f} ({fnr*100:.1f}%)", flush=True)
    print(f"  True Positives (TP):  {tp:,}", flush=True)
    print(f"  True Negatives (TN):  {tn:,}", flush=True)
    print(f"  False Positives (FP): {fp:,} -> Friction Cost: INR {cost_metrics['fp_cost']:,.0f}", flush=True)
    print(f"  False Negatives (FN): {fn:,} -> Unmitigated Fraud Loss: INR {cost_metrics['fn_cost']:,.0f}", flush=True)
    print(f"  Net Estimated Savings: INR {cost_metrics['net_savings']:,.0f} (ROI: {cost_metrics['roi_percentage']:.1f}%)", flush=True)
    print("-" * 55 + "\n", flush=True)
    
    # 5. Precision-Recall Curve Coordinates
    precisions, recalls, pr_thresholds = precision_recall_curve(y_test, test_proba)
    step = max(1, len(pr_thresholds) // 40)
    pr_curve_data = []
    for i in range(0, len(pr_thresholds), step):
        pr_curve_data.append({
            "recall": round(float(recalls[i]), 4),
            "precision": round(float(precisions[i]), 4),
            "threshold": round(float(pr_thresholds[i]), 3)
        })
    pr_curve_data.append({
        "recall": round(float(recalls[-1]), 4),
        "precision": round(float(precisions[-1]), 4),
        "threshold": 1.0
    })
    
    # 6. ROC Curve Coordinates
    fpr_arr, tpr_arr, roc_thresholds = roc_curve(y_test, test_proba)
    step_roc = max(1, len(roc_thresholds) // 40)
    roc_curve_data = []
    for i in range(0, len(roc_thresholds), step_roc):
        th_val = float(roc_thresholds[i])
        if np.isinf(th_val) or np.isnan(th_val):
            th_val = 1.0
        roc_curve_data.append({
            "fpr": round(float(fpr_arr[i]), 4),
            "tpr": round(float(tpr_arr[i]), 4),
            "threshold": round(th_val, 3)
        })
        
    # 7. Comprehensive Threshold Sensitivity Analysis
    threshold_curve_points = []
    threshold_steps = [round(t, 2) for t in np.arange(0.10, 0.95, 0.05)]
    for th in threshold_steps:
        th_pred = (test_proba >= th).astype(int)
        th_cm = confusion_matrix(y_test, th_pred, labels=[0, 1])
        t_tn, t_fp, t_fn, t_tp = th_cm.ravel()
        t_p = float(precision_score(y_test, th_pred, zero_division=0))
        t_r = float(recall_score(y_test, th_pred, zero_division=0))
        t_f1 = float(f1_score(y_test, th_pred, zero_division=0))
        t_cost = cost_model.calculate_cost(fp=int(t_fp), fn=int(t_fn), tp=int(t_tp), tn=int(t_tn))
        
        threshold_curve_points.append({
            "threshold": th,
            "precision": round(t_p, 4),
            "recall": round(t_r, 4),
            "f1_score": round(t_f1, 4),
            "false_positive_rate": round(float(t_fp / max(1, t_fp + t_tn)), 4),
            "false_negative_rate": round(float(t_fn / max(1, t_fn + t_tp)), 4),
            "fraud_captured_pct": round(t_r * 100.0, 1),
            "manual_reviews_count": int(t_tp + t_fp),
            "fp_cost": t_cost["fp_cost"],
            "fn_cost": t_cost["fn_cost"],
            "expected_cost": t_cost["cost_with_model"],
            "net_savings": t_cost["net_savings"],
            "true_positives": int(t_tp),
            "false_positives": int(t_fp),
            "false_negatives": int(t_fn)
        })

    # Find cost-optimal threshold from sweep
    min_cost_point = min(threshold_curve_points, key=lambda x: x["expected_cost"])
    
    # 8. Feature Importances
    feature_names = get_feature_names(preprocessor)
    feat_importance_list = []
    if hasattr(clf, "feature_importances_"):
        imps = clf.feature_importances_
        for fname, imp in zip(feature_names, imps):
            clean_name = fname.replace("cat__", "").replace("num__", "")
            feat_importance_list.append({
                "feature": clean_name,
                "importance": round(float(imp), 4)
            })
    elif hasattr(clf, "coef_"):
        coefs = np.abs(clf.coef_[0])
        for fname, coef in zip(feature_names, coefs):
            clean_name = fname.replace("cat__", "").replace("num__", "")
            feat_importance_list.append({
                "feature": clean_name,
                "importance": round(float(coef), 4)
            })
    feat_importance_list.sort(key=lambda x: x["importance"], reverse=True)
    
    confusion_matrix_payload = {
        "layout": {
            "top_label": "ACTUAL",
            "side_label": "PREDICTED",
            "categories": ["Legitimate Kept / Normal Return", "Abusive / Fraudulent Return"]
        },
        "matrix": [
            [int(tn), int(fn)],
            [int(fp), int(tp)]
        ],
        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "true_positives": int(tp),
        "total_evaluated": len(y_test)
    }

    os.makedirs(metrics_output_dir, exist_ok=True)
    
    metrics_summary = {
        "model_name": model_name,
        "evaluation_dataset": "Held-Out Test Set (15% Chronological Split)",
        "operating_threshold": operating_threshold,
        "cost_optimal_threshold": min_cost_point["threshold"],
        "total_test_records": len(y_test),
        "actual_high_risk_positives": int(y_test.sum()),
        "accuracy": round(accuracy, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "pr_auc": round(pr_auc, 4),
        "roc_auc": round(roc_auc, 4),
        "brier_score": round(brier, 4),
        "false_positive_rate": round(fpr, 4),
        "false_negative_rate": round(fnr, 4),
        "confusion_matrix": confusion_matrix_payload,
        "financial_impact": cost_metrics,
        "cost_optimal_metrics": min_cost_point,
        "risk_bands": {
            "low_risk_max": low_band,
            "medium_risk_min": low_band,
            "medium_risk_max": high_band,
            "high_risk_min": high_band
        },
        "evaluation_timestamp": pd.Timestamp.now().isoformat()
    }
    
    with open(os.path.join(metrics_output_dir, "metrics_summary.json"), "w") as f:
        json.dump(metrics_summary, f, indent=2)
        
    with open(os.path.join(metrics_output_dir, "confusion_matrix.json"), "w") as f:
        json.dump(confusion_matrix_payload, f, indent=2)
        
    with open(os.path.join(metrics_output_dir, "pr_curve.json"), "w") as f:
        json.dump({
            "pr_auc": round(pr_auc, 4),
            "operating_threshold": operating_threshold,
            "operating_precision": round(prec, 4),
            "operating_recall": round(rec, 4),
            "curve_points": pr_curve_data
        }, f, indent=2)
        
    with open(os.path.join(metrics_output_dir, "roc_curve.json"), "w") as f:
        json.dump({
            "roc_auc": round(roc_auc, 4),
            "curve_points": roc_curve_data
        }, f, indent=2)
        
    with open(os.path.join(metrics_output_dir, "threshold_curves.json"), "w") as f:
        json.dump({
            "operating_threshold": operating_threshold,
            "cost_optimal_threshold": min_cost_point["threshold"],
            "points": threshold_curve_points
        }, f, indent=2)
        
    with open(os.path.join(metrics_output_dir, "threshold_sensitivity.json"), "w") as f:
        json.dump({
            "operating_threshold": operating_threshold,
            "cost_optimal_threshold": min_cost_point["threshold"],
            "sensitivity_grid": threshold_curve_points
        }, f, indent=2)

    with open(os.path.join(metrics_output_dir, "feature_importances.json"), "w") as f:
        json.dump(feat_importance_list[:15], f, indent=2)
        
    print(f"[ARTIFACTS] All held-out test evaluation artifacts written to {metrics_output_dir}/", flush=True)
    return metrics_summary

if __name__ == "__main__":
    evaluate_held_out_test_set()
