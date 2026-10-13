"""
RiskSentinel - Probability Calibration & Business Risk Score Calibration
Provides Platt scaling and Isotonic regression calibration, computes Expected Calibration Error (ECE),
Brier score, reliability diagrams, and maps calibrated probabilities into validated business risk scores.
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List, Optional
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import brier_score_loss

class CalibratedFraudScorer:
    """
    Calibrates raw classification probabilities into true empirical posteriors
    and calibrated merchant business risk scores.
    """
    def __init__(self, method: str = "isotonic"):
        """
        method: 'isotonic' (non-parametric, robust for large datasets) or 'sigmoid' (Platt scaling)
        """
        self.method = method
        self.calibrator = None
        self.is_fitted = False
        self.brier_score_uncalibrated = None
        self.brier_score_calibrated = None
        self.ece = None
        self.reliability_curve = []

    def fit(self, base_classifier, X_val: np.ndarray, y_val: np.ndarray) -> "CalibratedFraudScorer":
        """
        Fit calibrator using validation dataset.
        """
        estimator_to_calibrate = getattr(base_classifier, "clf", base_classifier)
        self.calibrator = CalibratedClassifierCV(
            estimator=estimator_to_calibrate,
            method=self.method,
            cv="prefit"
        )
        self.calibrator.fit(X_val, y_val)
        self.is_fitted = True

        # Diagnostic calibration assessment
        raw_proba = base_classifier.predict_proba(X_val)[:, 1]
        cal_proba = self.calibrator.predict_proba(X_val)[:, 1]

        self.brier_score_uncalibrated = round(float(brier_score_loss(y_val, raw_proba)), 4)
        self.brier_score_calibrated = round(float(brier_score_loss(y_val, cal_proba)), 4)

        # Compute Expected Calibration Error (ECE) with 10 equal-width bins
        prob_true, prob_pred = calibration_curve(y_val, cal_proba, n_bins=10, strategy="uniform")
        
        bin_edges = np.linspace(0, 1, 11)
        bin_assignments = np.digitize(cal_proba, bin_edges) - 1
        bin_assignments = np.clip(bin_assignments, 0, 9)
        
        ece_sum = 0.0
        n_total = len(y_val)
        curve_data = []

        for b in range(10):
            mask = (bin_assignments == b)
            bin_size = np.sum(mask)
            if bin_size > 0:
                bin_acc = float(np.mean(y_val[mask]))
                bin_conf = float(np.mean(cal_proba[mask]))
                ece_sum += (bin_size / n_total) * abs(bin_acc - bin_conf)
                curve_data.append({
                    "bin": b,
                    "bin_range": f"{bin_edges[b]:.1f}-{bin_edges[b+1]:.1f}",
                    "mean_predicted_prob": round(bin_conf, 4),
                    "fraction_of_positives": round(bin_acc, 4),
                    "count": int(bin_size)
                })

        self.ece = round(float(ece_sum), 4)
        self.reliability_curve = curve_data
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Return calibrated probability array (n_samples, 2)."""
        if not self.is_fitted or self.calibrator is None:
            raise RuntimeError("CalibratedFraudScorer is not fitted.")
        return self.calibrator.predict_proba(X)

    def calculate_business_risk_score(self, calibrated_prob: float, exposure_multiplier: float = 1.0) -> int:
        """
        Converts calibrated probability into validated business risk score (0-100).
        Applies progressive risk scaling so low-probability items stay safe,
        while high-probability items reflect true merchant exposure severity.
        """
        prob = np.clip(calibrated_prob, 0.0, 1.0)
        
        # Piecewise logistic curve mapping calibrated empirical probability to actionable score
        if prob < 0.20:
            # Low risk region (0 to 39 score range)
            score = (prob / 0.20) * 39.0
        elif prob < 0.65:
            # Medium uncertainty band (40 to 69 score range)
            score = 40.0 + ((prob - 0.20) / 0.45) * 29.0
        else:
            # High risk alert band (70 to 100 score range)
            score = 70.0 + ((prob - 0.65) / 0.35) * 30.0

        if exposure_multiplier > 1.5:
            score = min(100.0, score * 1.1)

        return int(np.clip(round(score), 0, 100))

    def get_calibration_report(self) -> Dict[str, Any]:
        """Return structured calibration diagnostic payload."""
        return {
            "method": self.method,
            "is_fitted": self.is_fitted,
            "brier_score_uncalibrated": self.brier_score_uncalibrated,
            "brier_score_calibrated": self.brier_score_calibrated,
            "brier_score_improvement": round(
                (self.brier_score_uncalibrated - self.brier_score_calibrated)
                if self.brier_score_uncalibrated else 0.0, 4
            ),
            "expected_calibration_error_ece": self.ece,
            "calibration_quality": (
                "EXCELLENT" if self.ece and self.ece < 0.05
                else "GOOD" if self.ece and self.ece < 0.10
                else "MODERATE"
            ),
            "reliability_diagram": self.reliability_curve
        }
