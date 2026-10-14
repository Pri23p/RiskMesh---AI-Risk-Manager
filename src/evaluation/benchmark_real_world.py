"""
RiskSentinel - Real-World Public Fraud Benchmark & Stress-Test Pipeline
Evaluates FraudModel (XGBoost with Early Stopping) on:
1. Primary Benchmark: Genuine ULB / Kaggle Credit Card Fraud Detection Dataset (284,807 transactions, 492 frauds).
2. Secondary Stress Test: Synthetic non-separable extreme-overlap dataset.

Documents source provenance, feature mapping, domain differences, and honest held-out metrics.
"""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix, precision_recall_curve,
    roc_curve
)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from src.models.fraud_model import FraudModel
from src.evaluation.cost_model import BusinessCostModel
from src.data.download_public_benchmark import download_and_prepare_genuine_benchmark

def load_genuine_public_dataset(
    path: str = "data/benchmark/creditcard_full.csv"
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Loads the genuine Machine Learning Group - ULB Credit Card Fraud dataset.
    Downloads automatically if not locally cached.
    """
    df = download_and_prepare_genuine_benchmark(dest_path=path)

    provenance = {
        "dataset_name": "Credit Card Fraud Detection Dataset",
        "primary_source": "Machine Learning Group (ULB - Université Libre de Bruxelles) & Worldline",
        "mirror": "TensorFlow public mirror: https://storage.googleapis.com/download.tensorflow.org/data/creditcard.csv",
        "license": "See original dataset terms: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud",
        "total_records": len(df),
        "actual_fraud_records": int(df["Class"].sum()),
        "fraud_prevalence_pct": round(float(df["Class"].mean() * 100.0), 3),
        "feature_mapping": {
            "Time": "Seconds elapsed between current transaction and first transaction in the dataset",
            "V1_to_V28": "28 anonymized PCA components; original semantics are undisclosed. No mapping to merchant features is inferred.",
            "Amount": "Transaction value in EUR",
            "Class": "Binary ground-truth fraud label (1 = Fraudulent, 0 = Legitimate)"
        }
    }
    return df, provenance

def generate_stress_test_dataset(
    n_samples: int = 15000,
    fraud_rate: float = 0.02,
    seed: int = 42
) -> pd.DataFrame:
    """
    Generates a synthetic stress-test benchmark with high class overlap and 5% label noise
    specifically to test model robustness under degraded signal conditions.
    """
    np.random.seed(seed)
    n_fraud = int(n_samples * fraud_rate)
    n_legit = n_samples - n_fraud

    X_legit = np.random.randn(n_legit, 15)
    X_fraud = np.random.normal(loc=0.35, scale=1.3, size=(n_fraud, 15))

    X_all = np.vstack([X_legit, X_fraud])
    y_all = np.concatenate([np.zeros(n_legit, dtype=int), np.ones(n_fraud, dtype=int)])

    # 5% label noise
    flip_idx = np.random.choice(n_samples, size=int(0.05 * n_samples), replace=False)
    y_all[flip_idx] = 1 - y_all[flip_idx]

    cols = [f"signal_{i+1}" for i in range(15)]
    df = pd.DataFrame(X_all, columns=cols)
    df["Class"] = y_all
    return df

def run_genuine_real_world_benchmark(
    output_dir: str = "artifacts/metrics"
) -> Dict[str, Any]:
    """
    Trains FraudModel with XGBoost early stopping on the genuine ULB Credit Card Fraud dataset
    and evaluates on untouched held-out test data.
    """
    print("=" * 75, flush=True)
    print("RiskSentinel - Genuine Public Fraud Dataset Benchmark (ULB Credit Card)", flush=True)
    print("=" * 75, flush=True)

    df, provenance = load_genuine_public_dataset()
    print(f"[DATASET] Sourced from {provenance['primary_source']}")
    print(f"[DATASET] Records: {len(df):,} | Real Fraud Count: {provenance['actual_fraud_records']} ({provenance['fraud_prevalence_pct']}%)")

    X = df.drop(columns=["Class"]).values
    y = df["Class"].values

    # 70% Train, 15% Validation (for Early Stopping), 15% Held-Out Test
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    # Scale features
    scaler = StandardScaler()
    X_train_trans = scaler.fit_transform(X_train)
    X_val_trans = scaler.transform(X_val)
    X_test_trans = scaler.transform(X_test)

    print(f"[SPLIT] Train: {len(X_train):,} (Fraud: {y_train.sum()}) | "
          f"Val: {len(X_val):,} (Fraud: {y_val.sum()}) | "
          f"Held-Out Test: {len(X_test):,} (Fraud: {y_test.sum()})", flush=True)

    # Configure FraudModel with XGBoost and early stopping
    scale_weight = float((len(y_train) - y_train.sum()) / max(1, y_train.sum()))
    model = FraudModel(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        scale_pos_weight=scale_weight,
        early_stopping_rounds=15,
        random_state=42
    )

    t0 = time.time()
    model.train(
        X_train=X_train_trans,
        y_train=y_train,
        eval_set=[(X_val_trans, y_val)],
        early_stopping_rounds=15,
        verbose=False
    )
    train_time = round(time.time() - t0, 3)
    summary = model.get_training_summary()
    print(f"[MODEL] Fitted in {train_time}s | Early stopping stopped at best iteration {summary['best_iteration']} / {summary['configured_max_estimators']}", flush=True)

    # Evaluate on held-out test data
    test_proba = model.predict_proba(X_test_trans)[:, 1]

    # Determine optimal threshold on validation data using PR curve F1
    prec_val, rec_val, th_val = precision_recall_curve(y_val, model.predict_proba(X_val_trans)[:, 1])
    f1_val = 2 * (prec_val * rec_val) / np.maximum(1e-6, prec_val + rec_val)
    best_th_idx = np.argmax(f1_val[:-1])
    op_threshold = float(th_val[best_th_idx])
    test_preds = (test_proba >= op_threshold).astype(int)
    cm = confusion_matrix(y_test, test_preds, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    prec = float(precision_score(y_test, test_preds, zero_division=0))
    rec = float(recall_score(y_test, test_preds, zero_division=0))
    f1 = float(f1_score(y_test, test_preds, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, test_proba))
    pr_auc = float(average_precision_score(y_test, test_proba))

    print("-" * 55, flush=True)
    print(f"GENUINE REAL-WORLD BENCHMARK RESULTS (@ Threshold={op_threshold:.2f}):", flush=True)
    print(f"  Test Sample Count:   {len(y_test):,}")
    print(f"  Actual Real Frauds:  {int(y_test.sum())}")
    print(f"  Precision:           {prec:.4f} ({prec*100:.1f}%)")
    print(f"  Recall:              {rec:.4f} ({rec*100:.1f}%)")
    print(f"  F1 Score:            {f1:.4f}")
    print(f"  PR-AUC:              {pr_auc:.4f}")
    print(f"  ROC-AUC:             {roc_auc:.4f}")
    print(f"  Confusion Matrix:    TN={tn}, FP={fp}, FN={fn}, TP={tp}")
    print("-" * 55, flush=True)

    # Run separate synthetic stress-test benchmark
    df_stress = generate_stress_test_dataset()
    X_s = df_stress.drop(columns=["Class"]).values
    y_s = df_stress["Class"].values
    X_s_train, X_s_test, y_s_train, y_s_test = train_test_split(X_s, y_s, test_size=0.20, random_state=42)

    stress_model = FraudModel(n_estimators=100, max_depth=4, early_stopping_rounds=10, random_state=42)
    X_s_train, X_s_val, y_s_train, y_s_val = train_test_split(X_s_train, y_s_train, test_size=0.2, random_state=42, stratify=y_s_train)
    stress_model.train(X_s_train, y_s_train, eval_set=[(X_s_val, y_s_val)], early_stopping_rounds=10, verbose=False)
    s_proba = stress_model.predict_proba(X_s_test)[:, 1]
    stress_results = {
        "benchmark_type": "Synthetic Degraded Signal Stress-Test (High Class Overlap & 5% Label Noise)",
        "samples": len(y_s_test),
        "pr_auc": round(float(average_precision_score(y_s_test, s_proba)), 4),
        "roc_auc": round(float(roc_auc_score(y_s_test, s_proba)), 4),
        "interpretation": "Evaluates defensive model performance under severe signal degradation and label corruption."
    }

    # Financial cost calculation on genuine benchmark
    cost_model = BusinessCostModel(
        fraud_loss_per_order=2500.0,
        false_positive_cost=250.0,
        manual_review_cost=35.0,
        false_negative_cost=2500.0
    )
    cost_metrics = cost_model.calculate_cost(fp=int(fp), fn=int(fn), tp=int(tp), tn=int(tn))

    # PR Curve points
    p_arr, r_arr, pr_ths = precision_recall_curve(y_test, test_proba)
    step_pr = max(1, len(pr_ths) // 30)
    pr_curve_data = []
    for i in range(0, len(pr_ths), step_pr):
        pr_curve_data.append({
            "recall": round(float(r_arr[i]), 4),
            "precision": round(float(p_arr[i]), 4),
            "threshold": round(float(pr_ths[i]), 3)
        })

    # ROC Curve points
    fpr_arr, tpr_arr, roc_ths = roc_curve(y_test, test_proba)
    step_roc = max(1, len(roc_ths) // 30)
    roc_curve_data = []
    for i in range(0, len(roc_ths), step_roc):
        th_val = float(roc_ths[i])
        if np.isinf(th_val) or np.isnan(th_val):
            th_val = 1.0
        roc_curve_data.append({
            "fpr": round(float(fpr_arr[i]), 4),
            "tpr": round(float(tpr_arr[i]), 4),
            "threshold": round(th_val, 3)
        })

    benchmark_payload = {
        "dataset_provenance": provenance,
        "is_genuine_public_dataset": True,
        "split": {"method": "stratified random", "seed": 42, "train": len(y_train), "validation": len(y_val), "test": len(y_test)},
        "domain_differences": {
            "riskmesh_primary_domain": "E-Commerce Return & Dispute Abuse (Customer return histories, wardrobing, COD abuse, device-sharing rings)",
            "benchmark_domain": "Genuine Payment Transaction Fraud (Anonymized credit card PCA components, card-not-present unauthorized usage, natural class imbalance)",
            "cross_domain_significance": "Independent retraining benchmark of the model family, not external validation of the deployed merchant model."
        },
        "early_stopping_summary": summary,
        "operating_threshold": op_threshold,
        "test_sample_size": len(y_test),
        "actual_fraud_positives": int(y_test.sum()),
        "accuracy": round(float((tp + tn) / len(y_test)), 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "pr_auc": round(pr_auc, 4),
        "roc_auc": round(roc_auc, 4),
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp)
        },
        "financial_cost_evaluation": cost_metrics,
        "pr_curve": pr_curve_data,
        "roc_curve": roc_curve_data,
        "stress_test_benchmark": stress_results,
        "timestamp": pd.Timestamp.now().isoformat()
    }

    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, "synthetic_stress_test.json"), "w") as f:
        json.dump(stress_results, f, indent=2)
    report_path = os.path.join(output_dir, "real_world_benchmark.json")
    with open(report_path, "w") as f:
        json.dump(benchmark_payload, f, indent=2)

    print(f"[BENCHMARK] Saved genuine real-world benchmark report to {report_path}", flush=True)
    return benchmark_payload

if __name__ == "__main__":
    run_genuine_real_world_benchmark()
