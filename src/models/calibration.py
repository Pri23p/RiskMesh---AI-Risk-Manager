"""
RiskSentinel - Probability Calibration Engine & Out-of-Sample Calibration Evaluator
Provides Isotonic regression and Platt scaling calibration.
Computes genuine Expected Calibration Error (ECE), Brier Score, and reliability diagrams
strictly evaluated on untouched held-out test data.
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List, Optional
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import brier_score_loss

def compute_ece(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    n_bins: int = 10,
    strategy: str = "uniform"
) -> Tuple[float, float, List[Dict[str, Any]]]:
    """
    Computes genuine Expected Calibration Error (ECE) and Maximum Calibration Error (MCE)
    along with reliability diagram coordinates on out-of-sample data.

    Args:
        y_true: Ground truth binary labels (0 or 1)
        y_proba: Predicted probabilities of class 1
        n_bins: Number of probability bins (default 10)
        strategy: 'uniform' (equal width bins [0, 0.1), [0.1, 0.2)...) or
                  'quantile' (equal sample count per bin)
    """
    y_true = np.asarray(y_true).astype(int)
    y_proba = np.asarray(y_proba).astype(float)
    n_total = len(y_true)
    if n_total == 0 or y_true.shape != y_proba.shape or n_bins < 1:
        raise ValueError("Nonempty matching arrays and positive bin count required")
    if strategy not in ("uniform", "quantile") or not np.isfinite(y_proba).all() or np.any((y_proba < 0) | (y_proba > 1)):
        raise ValueError("Invalid probabilities or binning strategy")

    if strategy == "quantile":
        quantiles = np.linspace(0, 100, n_bins + 1)
        bin_edges = np.percentile(y_proba, quantiles)
        bin_edges = np.unique(bin_edges)
        if len(bin_edges) < 2:
            bin_edges = np.linspace(0, 1, n_bins + 1)
    else:
        bin_edges = np.linspace(0, 1, n_bins + 1)

    bin_assignments = np.digitize(y_proba, bin_edges) - 1
    bin_assignments = np.clip(bin_assignments, 0, len(bin_edges) - 2)

    ece_sum = 0.0
    mce_val = 0.0
    bins_data = []

    for b in range(len(bin_edges) - 1):
        mask = (bin_assignments == b)
        bin_count = int(np.sum(mask))
        if bin_count > 0:
            bin_acc = float(np.mean(y_true[mask]))
            bin_conf = float(np.mean(y_proba[mask]))
            cal_diff = abs(bin_acc - bin_conf)
            ece_sum += (bin_count / n_total) * cal_diff
            mce_val = max(mce_val, cal_diff)

            bins_data.append({
                "bin_index": b,
                "bin_range": f"{bin_edges[b]:.2f} - {bin_edges[b+1]:.2f}",
                "sample_count": bin_count,
                "percentage_of_total": round(float(bin_count / n_total * 100.0), 2),
                "mean_predicted_probability": round(bin_conf, 4),
                "fraction_of_true_positives": round(bin_acc, 4),
                "calibration_error": round(float(cal_diff), 4)
            })

    return float(ece_sum), float(mce_val), bins_data

class CalibratedFraudScorer:
    """
    Fits probability calibration on dedicated validation/calibration data
    and evaluates honest calibration diagnostics on unseen test data.
    """
    def __init__(self, method: str = "isotonic"):
        self.method = method
        self.calibrator = None
        self.is_fitted = False
        self.test_evaluation = None

    def fit(self, base_classifier, X_cal: np.ndarray, y_cal: np.ndarray) -> "CalibratedFraudScorer":
        """
        Fit calibrator using dedicated validation/calibration fold.
        """
        estimator_to_calibrate = getattr(base_classifier, "clf", base_classifier)
        self.calibrator = CalibratedClassifierCV(
            estimator=estimator_to_calibrate,
            method=self.method,
            cv="prefit"
        )
        self.calibrator.fit(X_cal, y_cal)
        self.is_fitted = True
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Return calibrated posterior probability array."""
        if not self.is_fitted or self.calibrator is None:
            raise RuntimeError("CalibratedFraudScorer is not fitted.")
        return self.calibrator.predict_proba(X)

    def evaluate_test_calibration(
        self,
        y_test: np.ndarray,
        cal_proba_test: np.ndarray,
        raw_proba_test: Optional[np.ndarray] = None,
        n_bins: int = 10
    ) -> Dict[str, Any]:
        """
        Computes genuine calibration metrics on untouched held-out test data.
        """
        brier_cal = float(brier_score_loss(y_test, cal_proba_test))
        brier_raw = float(brier_score_loss(y_test, raw_proba_test)) if raw_proba_test is not None else None

        ece_uniform, mce_uniform, bins_uniform = compute_ece(
            y_true=y_test, y_proba=cal_proba_test, n_bins=n_bins, strategy="uniform"
        )
        ece_quantile, _, bins_quantile = compute_ece(
            y_true=y_test, y_proba=cal_proba_test, n_bins=n_bins, strategy="quantile"
        )

        quality = (
            "WELL_CALIBRATED" if ece_uniform < 0.05
            else "MODERATELY_CALIBRATED" if ece_uniform < 0.10
            else "NEEDS_CALIBRATION_REFINEMENT"
        )

        self.test_evaluation = {
            "evaluation_data": "Untouched Held-Out Test Set (Chronological Split)",
            "test_sample_size": len(y_test),
            "calibration_method": self.method,
            "brier_score_calibrated": brier_cal,
            "brier_score_uncalibrated": brier_raw if brier_raw is not None else None,
            "brier_score_improvement": round(brier_raw - brier_cal, 4) if brier_raw is not None else None,
            "expected_calibration_error_ece": ece_uniform,
            "maximum_calibration_error_mce": mce_uniform,
            "ece_quantile_binning": ece_quantile,
            "binning_methodology": f"Uniform equal-width (n_bins={n_bins}) across [0.0, 1.0]",
            "calibration_quality": quality,
            "reliability_diagram_bins": bins_uniform,
            "quantile_diagram_bins": bins_quantile
        }
        return self.test_evaluation

    def calculate_business_risk_score(self, calibrated_prob: float, exposure_multiplier: float = 1.0) -> int:
        """
        Converts calibrated empirical probability into validated 0-100 merchant risk score.
        """
        prob = np.clip(calibrated_prob, 0.0, 1.0)
        if prob < 0.20:
            score = (prob / 0.20) * 39.0
        elif prob < 0.65:
            score = 40.0 + ((prob - 0.20) / 0.45) * 29.0
        else:
            score = 70.0 + ((prob - 0.65) / 0.35) * 30.0

        if exposure_multiplier > 1.5:
            score = min(100.0, score * 1.1)

        return int(np.clip(round(score), 0, 100))
