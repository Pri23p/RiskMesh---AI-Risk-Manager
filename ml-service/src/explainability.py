"""SHAP-based Explainability Module for RiskMesh Fraud Risk Scoring."""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
import shap
from .model import FraudModel


class FraudExplainer:
    """Provides local and global feature attribution using SHAP TreeExplainer."""

    def __init__(self, fraud_model: FraudModel, feature_names: List[str]):
        if fraud_model.model is None:
            raise ValueError("FraudModel must have a trained or loaded model instance.")
        self.fraud_model = fraud_model
        self.feature_names = feature_names
        # Initialize TreeExplainer for tree models
        self.explainer = shap.TreeExplainer(self.fraud_model.model)

    def explain_instance(
        self,
        X_df: pd.DataFrame,
        top_k: int = 5,
        threshold_low: float = 0.1,
        threshold_high: float = 0.5,
    ) -> List[Dict[str, Any]]:
        """Calculates SHAP values for a single preprocessed transaction and returns ranked risk factors."""
        if len(X_df) != 1:
            raise ValueError("explain_instance expects a single-row DataFrame.")

        shap_values = self.explainer.shap_values(X_df)

        # Handle different SHAP output formats (1D or 2D)
        if isinstance(shap_values, list):
            sv = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
        elif len(shap_values.shape) == 2:
            sv = shap_values[0]
        elif len(shap_values.shape) == 3:
            sv = shap_values[0, :, 1]
        else:
            sv = shap_values.flatten()

        row_values = X_df.iloc[0].to_dict()

        # Build attribution list
        attributions = []
        for feat_name, shap_val in zip(self.feature_names, sv):
            # We focus on factors pushing RISK UPWARDS (positive SHAP values)
            if shap_val > 0:
                abs_val = float(shap_val)
                if abs_val >= threshold_high:
                    impact = "high"
                elif abs_val >= threshold_low:
                    impact = "medium"
                else:
                    impact = "low"

                attributions.append(
                    {
                        "feature": feat_name,
                        "impact": impact,
                        "contribution": round(abs_val, 4),
                        "value": row_values.get(feat_name, None),
                    }
                )

        # Rank by contribution descending
        attributions.sort(key=lambda x: x["contribution"], reverse=True)

        return attributions[:top_k]
