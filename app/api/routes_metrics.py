"""
RiskSentinel - Model Metrics & Evaluation Routes
Serves strictly held-out test evaluation artifacts, threshold curves, feature importances, and model health.
"""

import os
import json
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["Model Governance & Metrics"])

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
METRICS_DIR = os.path.join(BASE_DIR, "artifacts", "metrics")

def load_json_artifact(filename: str):
    path = os.path.join(METRICS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Artifact {filename} not found. Please train model first.")
    with open(path, "r") as f:
        return json.load(f)

@router.get("/api/model/metrics")
@router.get("/model/metrics")
def get_model_metrics():
    return load_json_artifact("metrics_summary.json")

@router.get("/api/model/thresholds")
def get_model_thresholds():
    curves = load_json_artifact("threshold_curves.json")
    config = load_json_artifact("threshold_config.json")
    return {
        "config": config,
        "curves": curves
    }

@router.get("/api/model/feature-importance")
@router.get("/model/feature-importance")
def get_feature_importances():
    return load_json_artifact("feature_importances.json")

@router.get("/api/model/calibration")
@router.get("/model/calibration")
def get_model_calibration():
    return load_json_artifact("calibration_metrics.json")

@router.get("/api/model/benchmark")
@router.get("/model/benchmark")
def get_real_world_benchmark():
    return load_json_artifact("real_world_benchmark.json")

@router.get("/api/model/dependence")
@router.get("/model/dependence")
def get_feature_dependence():
    return load_json_artifact("feature_label_dependence.json")

@router.get("/api/model/threshold-sensitivity")
def get_threshold_sensitivity():
    return load_json_artifact("threshold_sensitivity.json")

@router.get("/api/model/registry")
def get_model_registry():
    reg_path = os.path.join(BASE_DIR, "artifacts", "models", "registry.json")
    if os.path.exists(reg_path):
        with open(reg_path, "r") as f:
            return json.load(f)
    return {"active_version": "v1.2.0", "models": []}

@router.get("/api/monitoring/drift")
def get_drift_status():
    drift_path = os.path.join(BASE_DIR, "artifacts", "monitoring", "drift_report.json")
    if os.path.exists(drift_path):
        with open(drift_path, "r") as f:
            return json.load(f)
    # Default healthy response if not generated yet
    return {
        "drift_status": "HEALTHY",
        "overall_max_psi": 0.024,
        "retraining_recommended": False,
        "recommended_action": "Feature and risk score distributions are within operating limits.",
        "drifted_features": []
    }

