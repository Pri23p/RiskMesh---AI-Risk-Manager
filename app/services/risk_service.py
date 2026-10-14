"""
RiskSentinel - Real-Time Risk Scoring & Explainability Service
Singleton service for sub-millisecond transaction risk evaluation, SHAP explainability,
recommended merchant actions, and financial exposure calculations.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.models.explainer import RiskSentinelExplainer, FEATURE_DESCRIPTIONS
from src.features.engineer import RiskSentinelFeatureEngineer, get_feature_names

class RiskScoringService:
    _instance = None

    def __init__(self):
        self.model_pipeline = None
        self.threshold_config = None
        self.explainer = None
        self.feature_names = []
        self._load_artifacts()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_artifacts(self):
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
        model_path = os.path.join(base_dir, "artifacts", "models", "best_model_pipeline.joblib")
        thresh_path = os.path.join(base_dir, "artifacts", "metrics", "threshold_config.json")

        if os.path.exists(model_path):
            self.model_pipeline = joblib.load(model_path)
            with open(thresh_path, "r") as f:
                self.threshold_config = json.load(f)

            self.explainer = RiskSentinelExplainer(
                model=self.model_pipeline["classifier"],
                preprocessor=self.model_pipeline["preprocessor"],
                feature_engineer=self.model_pipeline["feature_engineer"]
            )
            try:
                self.feature_names = get_feature_names(self.model_pipeline["preprocessor"])
            except Exception:
                self.feature_names = []
            print("[SERVICE] RiskSentinel RiskScoringService loaded successfully.")
        else:
            print("[SERVICE] Warning: artifacts not yet generated.")

    def score_single(self, order_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates 0-100 score, risk tier, recommended action, estimated exposure,
        and merchant-friendly SHAP factor explanations for an individual order.
        """
        if self.model_pipeline is None:
            self._load_artifacts()

        df_raw = pd.DataFrame([order_dict])
        feat_eng = self.model_pipeline["feature_engineer"]
        preproc = self.model_pipeline["preprocessor"]
        clf = self.model_pipeline["classifier"]
        calibrator = self.model_pipeline.get("calibrator", None)

        df_eng = feat_eng.transform(df_raw)
        X_trans = preproc.transform(df_eng)

        if calibrator is not None and hasattr(calibrator, "predict_proba"):
            proba = float(calibrator.predict_proba(X_trans)[0, 1])
            risk_score = calibrator.calculate_business_risk_score(proba)
        else:
            proba = float(clf.predict_proba(X_trans)[0, 1])
            risk_score = int(round(proba * 100.0))

        explanation = self.explainer.explain_instance(
            raw_record=order_dict,
            risk_probability=proba,
            threshold_config=self.threshold_config
        )
        explanation["risk_score"] = risk_score
        explanation["risk_score_pct"] = float(risk_score)
        explanation["is_calibrated"] = calibrator is not None
        return explanation

    def score_batch(self, orders_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Vectorized high-throughput batch scoring.
        """
        if self.model_pipeline is None:
            self._load_artifacts()

        feat_eng = self.model_pipeline["feature_engineer"]
        preproc = self.model_pipeline["preprocessor"]
        clf = self.model_pipeline["classifier"]
        calibrator = self.model_pipeline.get("calibrator", None)

        df_eng = feat_eng.transform(orders_df)
        X_trans = preproc.transform(df_eng)

        if calibrator is not None and hasattr(calibrator, "predict_proba"):
            probas = calibrator.predict_proba(X_trans)[:, 1]
        else:
            probas = clf.predict_proba(X_trans)[:, 1]

        results = []
        n_rows = len(orders_df)

        importances = getattr(clf, "feature_importances_", None)
        if importances is None and hasattr(clf, "coef_"):
            importances = np.abs(clf.coef_[0])
        if importances is None:
            importances = np.ones(X_trans.shape[1]) / X_trans.shape[1]

        for i in range(n_rows):
            prob = float(probas[i])
            row_raw = orders_df.iloc[i].to_dict()
            if calibrator is not None and hasattr(calibrator, "calculate_business_risk_score"):
                risk_score_int = calibrator.calculate_business_risk_score(prob)
            else:
                risk_score_int = int(round(prob * 100.0))

            if prob < self.threshold_config["operating_threshold"]:
                risk_level = "LOW"
                recommended_action = "Approve normally"
                requires_human_review = False
                review_reason = None
            elif prob >= self.threshold_config.get("high_risk_min", 0.70):
                risk_level = "HIGH"
                recommended_action = "Hold for manual review before shipment/refund"
                requires_human_review = True
                review_reason = "Elevated return/chargeback risk signals detected"
            else:
                risk_level = "MEDIUM"
                recommended_action = "Perform additional verification before shipment"
                requires_human_review = True
                review_reason = "Uncertainty band / moderate return risk signals"

            # Check explicit merchant-side defensive triggers
            risk_factors_narrative = []
            c_prev_cb = float(row_raw.get("customer_previous_chargebacks", 0))
            c_ret_rate = float(row_raw.get("customer_return_rate", 0.0))
            c_prev_orders = float(row_raw.get("customer_previous_orders", 0))
            c_prev_returns = float(row_raw.get("customer_previous_returns", 0))
            acc_age = float(row_raw.get("account_age_days", 100))
            val_ratio = float(row_raw.get("current_vs_average_order_ratio", 1.0))
            dev_custs = float(row_raw.get("customers_from_device", 1))
            bill_ship_match = float(row_raw.get("billing_shipping_match", 1))

            if c_prev_cb >= 1:
                risk_factors_narrative.append(f"Customer has {int(c_prev_cb)} previous chargeback record(s)")
            if c_ret_rate > 0.45 and c_prev_orders >= 3:
                risk_factors_narrative.append(f"Customer returned {int(c_prev_returns)} of last {int(c_prev_orders)} orders ({c_ret_rate:.0%})")
            if val_ratio > 2.0:
                risk_factors_narrative.append(f"Order value is {val_ratio:.1f}x significantly above customer average")
            if bill_ship_match == 0:
                risk_factors_narrative.append("Billing and shipping locations differ")
            if dev_custs >= 3:
                risk_factors_narrative.append(f"Multiple recent customer accounts ({int(dev_custs)}) originated from the same device")
            if acc_age < 15:
                risk_factors_narrative.append("Customer account is newly created")

            if not risk_factors_narrative:
                risk_factors_narrative.append("Normal transactional profile")

            # Vector row contributions
            x_row = X_trans[i]
            contributions = []
            for f_idx, fn in enumerate(self.feature_names):
                val = float(x_row[f_idx])
                imp = float(importances[f_idx]) if f_idx < len(importances) else 0.01
                impact = round(val * imp * 2.8, 4)
                clean_name = fn.replace("cat__", "").replace("num__", "")
                readable = FEATURE_DESCRIPTIONS.get(clean_name, clean_name.replace("_", " ").title())
                contributions.append({
                    "feature": clean_name,
                    "readable_name": readable,
                    "impact": impact,
                    "direction": "RISK_INCREASING" if impact > 0 else "RISK_REDUCING",
                    "raw_value": row_raw.get(clean_name, None)
                })

            contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
            top_pos = [c for c in contributions if c["impact"] > 0][:5]
            top_neg = [c for c in contributions if c["impact"] < 0][:5]

            narrative = (
                f"RiskSentinel evaluated Order {row_raw.get('order_id', 'UNKNOWN')} with Risk Score {risk_score_int}/100 ({risk_level}). "
                f"Key drivers: {'; '.join(risk_factors_narrative[:2])}."
            )

            results.append({
                "order_id": row_raw.get("order_id", "UNKNOWN"),
                "risk_score": risk_score_int,
                "risk_score_pct": float(risk_score_int),
                "fraud_probability": round(prob, 4),
                "risk_level": risk_level,
                "recommended_action": recommended_action,
                "estimated_exposure": float(row_raw.get("order_amount", 0.0)),
                "requires_human_review": requires_human_review,
                "review_reason": review_reason,
                "risk_factors": risk_factors_narrative,
                "top_contributing_factors": top_pos,
                "top_protective_factors": top_neg,
                "all_contributions": contributions[:10],
                "decision_narrative": narrative
            })

        return results
