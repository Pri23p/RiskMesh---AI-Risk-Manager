"""
RiskSentinel - Production Drift Monitoring & Model Lifecycle Manager
Computes Population Stability Index (PSI) and Kolmogorov-Smirnov (KS) drift statistics
for prediction scores and critical features. Triggers model retraining alerts and tracks versioning.
"""

import os
import sys
import json
import hashlib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from scipy.stats import ks_2samp

class ProductionDriftMonitor:
    """
    Monitors data drift, prediction score drift, and model degradation in production.
    """
    def __init__(
        self,
        reference_data_path: str = "data/processed/train.csv",
        registry_path: str = "artifacts/models/registry.json",
        artifacts_dir: str = "artifacts/monitoring"
    ):
        self.reference_data_path = reference_data_path
        self.registry_path = registry_path
        self.artifacts_dir = artifacts_dir
        os.makedirs(self.artifacts_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.registry_path), exist_ok=True)

    def calculate_psi(self, baseline: np.ndarray, current: np.ndarray, num_bins: int = 10) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Calculates Population Stability Index (PSI) between baseline and current distributions.
        PSI < 0.10: No significant shift (Stable)
        0.10 <= PSI < 0.20: Moderate drift, monitor closely (Warning)
        PSI >= 0.20: Significant drift, model retraining required (Action Required)
        """
        baseline_clean = baseline[~np.isnan(baseline)]
        current_clean = current[~np.isnan(current)]

        if len(baseline_clean) == 0 or len(current_clean) == 0:
            raise ValueError("Drift requires nonempty finite samples")

        quantiles = np.linspace(0, 100, num_bins + 1)
        bin_edges = np.percentile(baseline_clean, quantiles)
        bin_edges = np.unique(bin_edges)

        if len(bin_edges) < 2:
            value = bin_edges[0]
            bin_edges = np.array([-np.inf, value, np.nextafter(value, np.inf), np.inf])

        bin_edges = np.unique(np.concatenate(([-np.inf], bin_edges, [np.inf])))

        base_counts, _ = np.histogram(baseline_clean, bins=bin_edges)
        curr_counts, _ = np.histogram(current_clean, bins=bin_edges)

        base_pct = np.maximum(base_counts / max(1, len(baseline_clean)), 1e-4)
        curr_pct = np.maximum(curr_counts / max(1, len(current_clean)), 1e-4)

        psi_components = (curr_pct - base_pct) * np.log(curr_pct / base_pct)
        total_psi = float(np.sum(psi_components))

        bin_breakdown = []
        for i in range(len(base_counts)):
            bin_breakdown.append({
                "bin_index": i,
                "baseline_percentage": round(float(base_pct[i]), 4),
                "current_percentage": round(float(curr_pct[i]), 4),
                "psi_contribution": round(float(psi_components[i]), 5)
            })

        return round(total_psi, 4), bin_breakdown

    def evaluate_feature_and_score_drift(
        self,
        current_df: pd.DataFrame,
        current_scores: Optional[np.ndarray] = None,
        reference_scores: Optional[np.ndarray] = None,
        save_report: bool = True,
        output_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates drift across key numeric features and output risk scores.
        """
        ref_df = pd.read_csv(self.reference_data_path)

        key_numeric_features = [
            "order_amount",
            "account_age_days",
            "customer_return_rate",
            "customer_chargeback_rate",
            "current_vs_average_order_ratio",
            "orders_last_24h"
        ]

        missing = [f for f in key_numeric_features if f not in ref_df or f not in current_df]
        if missing:
            raise ValueError(f"Drift schema mismatch: missing {missing}")
        for frame in (ref_df, current_df):
            if frame.empty or not np.isfinite(frame[key_numeric_features].to_numpy(dtype=float)).all():
                raise ValueError("Drift requires nonempty finite numeric features")

        feature_drift_results = []
        max_psi = 0.0
        drifted_features = []

        for feat in key_numeric_features:
            if feat in ref_df.columns and feat in current_df.columns:
                ref_vals = ref_df[feat].dropna().values
                curr_vals = current_df[feat].dropna().values

                psi_val, _ = self.calculate_psi(ref_vals, curr_vals)
                ks_stat, ks_pval = ks_2samp(ref_vals, curr_vals)

                status = "STABLE"
                if psi_val >= 0.20:
                    status = "SIGNIFICANT_DRIFT"
                    drifted_features.append(feat)
                elif psi_val >= 0.10:
                    status = "MODERATE_DRIFT"

                max_psi = max(max_psi, psi_val)
                feature_drift_results.append({
                    "feature": feat,
                    "psi": psi_val,
                    "ks_statistic": round(float(ks_stat), 4),
                    "ks_pvalue": round(float(ks_pval), 6),
                    "status": status
                })

        # Score drift
        score_drift_summary = None
        if current_scores is not None and reference_scores is not None:
            score_psi, _ = self.calculate_psi(reference_scores, current_scores)
            s_stat, s_pval = ks_2samp(reference_scores, current_scores)
            score_drift_summary = {
                "score_psi": score_psi,
                "ks_statistic": round(float(s_stat), 4),
                "ks_pvalue": round(float(s_pval), 6),
                "status": "STABLE" if score_psi < 0.10 else "MODERATE_DRIFT" if score_psi < 0.20 else "DRIFTED"
            }
            max_psi = max(max_psi, score_psi)

        # Overall recommendation
        if max_psi >= 0.20 or len(drifted_features) >= 2:
            drift_status = "CRITICAL_DRIFT"
            retraining_recommended = True
            action = "Investigate population changes and outcome performance before approving retraining."
        elif max_psi >= 0.10:
            drift_status = "WARNING_DRIFT"
            retraining_recommended = False
            action = "Monitor production metrics closely. Mild distributional shift detected."
        else:
            drift_status = "HEALTHY"
            retraining_recommended = False
            action = "Model and feature distributions remain stable within operating tolerances."

        report = {
            "evaluation_timestamp": pd.Timestamp.now().isoformat(),
            "reference_sample_size": len(ref_df),
            "feature_schema": key_numeric_features,
            "comparison_scope": "Same raw feature definitions and units required; distribution drift is not proof of accuracy degradation",
            "current_sample_size": len(current_df),
            "drift_status": drift_status,
            "overall_max_psi": max_psi,
            "retraining_recommended": retraining_recommended,
            "recommended_action": action,
            "drifted_features": drifted_features,
            "feature_metrics": feature_drift_results,
            "prediction_score_drift": score_drift_summary
        }

        if save_report:
            target_path = output_file or os.path.join(self.artifacts_dir, "drift_report.json")
            with open(target_path, "w") as f:
                json.dump(report, f, indent=2)

        return report

    def update_model_registry(
        self,
        model_version: str,
        model_name: str,
        metrics: Dict[str, Any],
        best_iteration: Optional[int] = None,
        early_stopping_used: bool = True,
        calibration_method: str = "isotonic",
        notes: str = ""
    ) -> Dict[str, Any]:
        """
        Updates the model registry with version metadata, training checksums, and deployment flags.
        """
        registry = {"active_version": model_version, "models": []}
        if os.path.exists(self.registry_path):
            try:
                with open(self.registry_path, "r") as f:
                    registry = json.load(f)
            except Exception:
                pass

        entry = {
            "version": model_version,
            "model_name": model_name,
            "created_at": pd.Timestamp.now().isoformat(),
            "best_iteration": best_iteration,
            "early_stopping_used": early_stopping_used,
            "calibration_method": calibration_method,
            "metrics": {
                "precision": metrics.get("precision"),
                "recall": metrics.get("recall"),
                "f1_score": metrics.get("f1_score"),
                "pr_auc": metrics.get("pr_auc"),
                "roc_auc": metrics.get("roc_auc")
            },
            "status": "ACTIVE_PRODUCTION",
            "notes": notes
        }

        for m in registry.get("models", []):
            if m.get("status") == "ACTIVE_PRODUCTION":
                m["status"] = "ARCHIVED"

        registry["models"].insert(0, entry)
        registry["active_version"] = model_version
        registry["last_updated"] = pd.Timestamp.now().isoformat()

        with open(self.registry_path, "w") as f:
            json.dump(registry, f, indent=2)

        return registry

def generate_production_baseline_drift_report(
    train_path: str = "data/processed/train.csv",
    test_path: str = "data/processed/test.csv",
    artifacts_dir: str = "artifacts/monitoring"
) -> Dict[str, Any]:
    """
    Generates verified production baseline drift report comparing held-out test transactions
    against the training baseline distribution.
    """
    monitor = ProductionDriftMonitor(
        reference_data_path=train_path,
        artifacts_dir=artifacts_dir
    )
    test_df = pd.read_csv(test_path)

    # Evaluate sample of 1,000 held-out test transactions
    sample_df = test_df.sample(n=min(1000, len(test_df)), random_state=42)
    report = monitor.evaluate_feature_and_score_drift(
        current_df=sample_df,
        save_report=True
    )
    print(f"[DRIFT] Generated production baseline drift report: Status={report['drift_status']} (Max PSI={report['overall_max_psi']})")
    return report

if __name__ == "__main__":
    generate_production_baseline_drift_report()
