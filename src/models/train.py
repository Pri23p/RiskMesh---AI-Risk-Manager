"""
RiskSentinel - Multi-Model Training, Early-Stopping Benchmark & Calibration Pipeline
Trains Logistic Regression, Random Forest, and FraudModel (XGBoost with early stopping).
Calibrates probabilities, evaluates threshold sensitivity under business costs,
and registers the production model.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import time
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix
)

from src.models.fraud_model import FraudModel
from src.models.calibration import CalibratedFraudScorer
from src.monitoring.drift_monitor import ProductionDriftMonitor
from src.features.engineer import (
    RiskSentinelFeatureEngineer, build_preprocessing_pipeline
)
from src.evaluation.cost_model import BusinessCostModel
from src.evaluation.threshold import evaluate_threshold_grid

def train_and_compare_models(
    train_path: str = "data/processed/train.csv",
    val_path: str = "data/processed/val.csv",
    artifacts_dir: str = "artifacts"
):
    print("=" * 75, flush=True)
    print("RiskSentinel - Multi-Model Training, Early-Stopping & Calibration Pipeline", flush=True)
    print("=" * 75, flush=True)

    # 1. Load data
    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)

    # Reserve chronological calibration and policy folds before model selection.
    cut = len(val_df) // 3
    val_df, cal_df, policy_df = val_df.iloc[:cut], val_df.iloc[cut:2*cut], val_df.iloc[2*cut:]
    y_train = train_df["fraudulent_return"].values
    y_val = val_df["fraudulent_return"].values

    print(f"[TRAIN] Training records: {len(train_df):,} | Positives: {y_train.sum():,} ({y_train.mean():.2%})", flush=True)
    print(f"[VAL]   Validation records: {len(val_df):,} | Positives: {y_val.sum():,} ({y_val.mean():.2%})", flush=True)

    # 2. Build feature engineering & preprocessing
    feat_engineer, preprocessor = build_preprocessing_pipeline()

    # Fit strictly on training data
    train_engineered = feat_engineer.fit_transform(train_df)
    X_train_trans = preprocessor.fit_transform(train_engineered)

    val_engineered = feat_engineer.transform(val_df)
    X_val_trans = preprocessor.transform(val_engineered)

    print(f"[PREPROCESS] Preprocessed training matrix shape: {X_train_trans.shape}", flush=True)
    print(f"[PREPROCESS] Preprocessed validation matrix shape: {X_val_trans.shape}", flush=True)

    cost_model = BusinessCostModel(
        fraud_loss_per_order=2000.0,
        false_positive_cost=300.0,
        manual_review_cost=40.0,
        false_negative_cost=2000.0
    )

    # 3. Candidate Models with Verified Early Stopping
    models_to_train = {
        "Logistic Regression (Baseline)": LogisticRegression(
            max_iter=1000, class_weight="balanced", random_state=42
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=120, max_depth=12, min_samples_split=8,
            class_weight="balanced", random_state=42, n_jobs=2
        ),
        "FraudModel (XGBoost Early-Stopping)": FraudModel(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            scale_pos_weight=float((len(y_train) - y_train.sum()) / max(1, y_train.sum())),
            early_stopping_rounds=15, random_state=42
        )
    }

    comparison_results = []
    trained_pipelines = {}

    for name, clf in models_to_train.items():
        print(f"\n[MODEL] Training candidate: {name}...", flush=True)
        t0 = time.time()

        # Support both FraudModel.train with early stopping and standard fit
        if hasattr(clf, "train"):
            clf.train(
                X_train_trans, y_train,
                eval_set=[(X_val_trans, y_val)],
                early_stopping_rounds=15,
                verbose=False
            )
            summary = clf.get_training_summary()
            best_iter = summary.get("best_iteration")
            stopped_early = summary.get("stopped_early")
            print(f"        -> XGBoost Early Stopping: halted at iteration {best_iter} / {summary['configured_max_estimators']} (stopped early: {stopped_early})", flush=True)
        else:
            clf.fit(X_train_trans, y_train)
            best_iter = None
            stopped_early = False

        fit_time = round(time.time() - t0, 3)

        # Benchmark inference time on validation batch
        t_infer_start = time.time()
        val_proba = clf.predict_proba(X_val_trans)[:, 1]
        infer_duration = time.time() - t_infer_start
        latency_ms_per_record = round((infer_duration / len(val_df)) * 1000.0, 4)
        throughput_rec_sec = int(len(val_df) / max(0.0001, infer_duration))

        # Default 0.50 threshold metrics on validation
        val_pred = (val_proba >= 0.50).astype(int)
        cm = confusion_matrix(y_val, val_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()

        prec = float(precision_score(y_val, val_pred, zero_division=0))
        rec = float(recall_score(y_val, val_pred, zero_division=0))
        f1 = float(f1_score(y_val, val_pred, zero_division=0))
        roc_auc = float(roc_auc_score(y_val, val_proba))
        pr_auc = float(average_precision_score(y_val, val_proba))
        fpr = float(fp / max(1, fp + tn))
        fnr = float(fn / max(1, fn + tp))

        cost_eval = cost_model.calculate_cost(fp=int(fp), fn=int(fn), tp=int(tp), tn=int(tn))

        entry = {
            "model_name": name,
            "fit_time_seconds": fit_time,
            "inference_latency_ms": latency_ms_per_record,
            "throughput_records_per_sec": throughput_rec_sec,
            "best_iteration": best_iter,
            "early_stopping_used": bool(best_iter is not None),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
            "pr_auc": round(pr_auc, 4),
            "false_positive_rate": round(fpr, 4),
            "false_negative_rate": round(fnr, 4),
            "true_positives": int(tp),
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "loss_without_model": cost_eval["loss_without_model"],
            "cost_with_model": cost_eval["cost_with_model"],
            "fraud_losses_prevented": cost_eval["fraud_losses_prevented"],
            "fp_cost": cost_eval["fp_cost"],
            "fn_cost": cost_eval["fn_cost"],
            "net_savings": cost_eval["net_savings"],
            "roi_percentage": cost_eval["roi_percentage"]
        }
        comparison_results.append(entry)

        full_pipeline = {
            "feature_engineer": feat_engineer,
            "preprocessor": preprocessor,
            "classifier": clf,
            "model_name": name
        }
        trained_pipelines[name] = full_pipeline

        print(f"        Val PR-AUC: {pr_auc:.4f} | F1: {f1:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | Net Savings: INR {cost_eval['net_savings']:,.0f}", flush=True)

    # Select best candidate based on highest validation Net Savings
    comparison_results.sort(key=lambda x: x["net_savings"], reverse=True)
    best_candidate_name = comparison_results[0]["model_name"]
    print(f"\n[SELECTION] Best model selected on validation business savings: {best_candidate_name}", flush=True)

    best_pipeline = trained_pipelines[best_candidate_name]
    best_clf = best_pipeline["classifier"]

    # 4. Probability Calibration
    calibrator = CalibratedFraudScorer(method="isotonic")
    X_cal = preprocessor.transform(feat_engineer.transform(cal_df))
    calibrator.fit(best_clf, X_cal, cal_df["fraudulent_return"].values)
    best_pipeline["calibrator"] = calibrator
    best_pipeline["split_provenance"] = {
        "training": len(train_df), "model_selection": len(val_df),
        "calibration": len(cal_df), "threshold_selection": len(policy_df),
        "method": "Chronological non-overlapping folds; test excluded"
    }
    X_policy = preprocessor.transform(feat_engineer.transform(policy_df))
    threshold_grid, threshold_config = evaluate_threshold_grid(
        policy_df["fraudulent_return"].values,
        calibrator.predict_proba(X_policy)[:, 1], cost_model=cost_model
    )
    threshold_config["selection_dataset"] = "Dedicated chronological policy fold"
    threshold_config["selection_sample_count"] = len(policy_df)
    calib_report = {"status": "Awaiting untouched test evaluation",
                    "split_provenance": best_pipeline["split_provenance"]}

    # 6. Save Artifacts
    models_dir = os.path.join(artifacts_dir, "models")
    metrics_dir = os.path.join(artifacts_dir, "metrics")
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(metrics_dir, exist_ok=True)

    for name, pipe in trained_pipelines.items():
        clean_file_name = name.lower().replace(" ", "_").replace("(", "").replace(")", "").replace("-", "_") + ".joblib"
        save_p = os.path.join(models_dir, clean_file_name)
        joblib.dump(pipe, save_p)

    best_pipe_path = os.path.join(models_dir, "best_model_pipeline.joblib")
    joblib.dump(best_pipeline, best_pipe_path)
    print(f"[ARTIFACTS] Best pipeline saved to {best_pipe_path}", flush=True)

    with open(os.path.join(metrics_dir, "model_comparison.json"), "w") as f:
        json.dump({
            "selected_model": best_candidate_name,
            "models": comparison_results,
            "comparison_timestamp": pd.Timestamp.now().isoformat()
        }, f, indent=2)

    with open(os.path.join(metrics_dir, "threshold_config.json"), "w") as f:
        json.dump(threshold_config, f, indent=2)

    with open(os.path.join(metrics_dir, "threshold_grid_validation.json"), "w") as f:
        json.dump(threshold_grid, f, indent=2)

    with open(os.path.join(metrics_dir, "calibration_metrics.json"), "w") as f:
        json.dump(calib_report, f, indent=2)

    # 7. Model Registry Update
    drift_mon = ProductionDriftMonitor(
        reference_data_path=train_path,
        registry_path=os.path.join(models_dir, "registry.json")
    )
    drift_mon.update_model_registry(
        model_version="v1.2.0",
        model_name=best_candidate_name,
        metrics=comparison_results[0],
        best_iteration=comparison_results[0].get("best_iteration"),
        early_stopping_used=comparison_results[0].get("early_stopping_used", True),
        calibration_method="isotonic",
        notes="FraudModel XGBoost with verified early stopping and isotonic posterior calibration."
    )

    print(f"[REGISTRY] Model v1.2.0 registered in {os.path.join(models_dir, 'registry.json')}", flush=True)
    print(f"[ARTIFACTS] All training and calibration artifacts written successfully.", flush=True)
    return best_pipeline, comparison_results, threshold_config

if __name__ == "__main__":
    train_and_compare_models()
