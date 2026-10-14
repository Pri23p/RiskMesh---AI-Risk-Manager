"""
RiskSentinel - Explainable AI Engine
Generates model-grounded feature attribution scores and merchant-friendly plain English rationale
for individual transaction predictions (positive risk drivers & protective negative factors).
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple

# Merchant-friendly human readable feature descriptions
FEATURE_DESCRIPTIONS = {
    "customer_return_rate": "Customer Historical Return Rate",
    "customer_chargeback_rate": "Customer Historical Chargeback Rate",
    "customer_previous_chargebacks": "Previous Chargeback Claims",
    "customer_previous_returns": "Lifetime Previous Returns",
    "customer_previous_orders": "Lifetime Completed Orders",
    "average_order_value": "Customer Historical Average Order Value",
    "current_vs_average_order_ratio": "Order Value vs Customer Average Ratio",
    "order_amount": "Total Order Transaction Value",
    "high_value_item": "High-Value Item Flag (> ₹10,000)",
    "account_age_days": "Customer Account Age (Days)",
    "billing_shipping_match": "Billing and Shipping Address Consistency",
    "shipping_distance": "Delivery Transit Distance",
    "number_of_addresses": "Customer Associated Addresses Count",
    "orders_from_device": "Total Orders Placed From Device",
    "customers_from_device": "Accounts Associated With Same Device",
    "device_sharing_density": "Device Shared Across Multiple Customer Accounts",
    "orders_last_24h": "Orders Placed in Last 24 Hours",
    "orders_last_7d": "Orders Placed in Last 7 Days",
    "customer_orders_last_30d": "Orders Placed in Last 30 Days",
    "velocity_24h_ratio": "24-Hour Velocity Spike vs 7-Day Velocity",
    "is_order_value_surge": "Sudden Order Amount Surge (> 2.2x Average)",
    "cod_high_return_risk": "Cash on Delivery with High Return History",
    "region_mismatch_flag": "IP Region Differs from Shipping Region",
    "account_maturity_trust": "Account Age & Trust Score",
    "device_risk_history": "Historical Device Abuse Propensity",
    "delivery_attempts": "Carrier Delivery Attempts",
    "previous_failed_deliveries": "Previous Delivery Failures",
    "is_cod": "Payment Method is Cash on Delivery",
    "product_category": "Merchandise Product Category",
    "payment_method": "Payment Method",
    "ip_region": "Customer IP Geolocation Region",
    "customer_region": "Shipping Destination Region"
}

class RiskSentinelExplainer:
    """
    Computes feature contribution scores and generates transparent, merchant-friendly decision explanations.
    """
    def __init__(self, model, preprocessor, feature_engineer):
        self.model = model
        self.preprocessor = preprocessor
        self.feature_engineer = feature_engineer
        self.feature_names = None
        self._extract_feature_metadata()

    def _extract_feature_metadata(self):
        try:
            from src.features.engineer import get_feature_names
            self.feature_names = get_feature_names(self.preprocessor)
        except Exception:
            self.feature_names = []

    def explain_instance(
        self,
        raw_record: Dict[str, Any],
        risk_probability: float,
        threshold_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Explains an individual order prediction using directional feature attribution.
        """
        df_raw = pd.DataFrame([raw_record])
        df_engineered = self.feature_engineer.transform(df_raw)
        X_trans = self.preprocessor.transform(df_engineered)

        contributions = []

        # Method 1: If linear model (Logistic Regression)
        if hasattr(self.model, "coef_"):
            coefs = self.model.coef_[0]
            if len(coefs) == X_trans.shape[1]:
                x_row = X_trans[0]
                for idx, feat_name in enumerate(self.feature_names):
                    val = float(x_row[idx])
                    weight = float(coefs[idx])
                    impact = round(val * weight, 4)

                    clean_name = feat_name.replace("cat__", "").replace("num__", "")
                    readable = FEATURE_DESCRIPTIONS.get(clean_name, clean_name.replace("_", " ").title())

                    contributions.append({
                        "feature": clean_name,
                        "readable_name": readable,
                        "impact": impact,
                        "direction": "RISK_INCREASING" if impact > 0 else "RISK_REDUCING",
                        "raw_value": raw_record.get(clean_name, df_engineered[clean_name].iloc[0] if clean_name in df_engineered else None)
                    })
        else:
            # Method 2: Tree-based ensemble / Gradient Boosting
            x_row = X_trans[0]
            importances = getattr(self.model, "feature_importances_", np.ones(X_trans.shape[1]) / X_trans.shape[1])

            for idx, feat_name in enumerate(self.feature_names):
                val = float(x_row[idx])
                imp = float(importances[idx]) if idx < len(importances) else 0.01
                impact = round(val * imp * 2.8, 4)

                clean_name = feat_name.replace("cat__", "").replace("num__", "")
                readable = FEATURE_DESCRIPTIONS.get(clean_name, clean_name.replace("_", " ").title())

                contributions.append({
                    "feature": clean_name,
                    "readable_name": readable,
                    "impact": impact,
                    "direction": "RISK_INCREASING" if impact > 0 else "RISK_REDUCING",
                    "raw_value": raw_record.get(clean_name, df_engineered[clean_name].iloc[0] if clean_name in df_engineered else None)
                })

        contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
        top_positive = [c for c in contributions if c["impact"] > 0][:6]
        top_negative = [c for c in contributions if c["impact"] < 0][:5]

        # Risk tier assignment (Low: 0-39, Medium: 40-69, High: 70-100)
        risk_score_int = int(round(risk_probability * 100.0))

        policy = threshold_config or {}
        if risk_probability < policy.get("operating_threshold", 0.35):
            risk_level = "LOW"
            recommended_action = "Approve normally"
            requires_human_review = False
            review_reason = None
        elif risk_probability >= policy.get("high_risk_min", 0.70):
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
        c_prev_cb = float(raw_record.get("customer_previous_chargebacks", 0))
        c_ret_rate = float(raw_record.get("customer_return_rate", 0.0))
        c_prev_orders = float(raw_record.get("customer_previous_orders", 0))
        c_prev_returns = float(raw_record.get("customer_previous_returns", 0))
        acc_age = float(raw_record.get("account_age_days", 100))
        val_ratio = float(raw_record.get("current_vs_average_order_ratio", 1.0))
        dev_custs = float(raw_record.get("customers_from_device", 1))
        bill_ship_match = float(raw_record.get("billing_shipping_match", 1))

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
            for factor in top_positive[:3]:
                risk_factors_narrative.append(f"{factor['readable_name']}")

        decision_narrative = (
            f"RiskSentinel evaluated Order {raw_record.get('order_id', 'UNKNOWN')} with Risk Score {risk_score_int}/100 ({risk_level}). "
            f"Key risk contributors: {'; '.join(risk_factors_narrative[:3])}. "
            f"Recommended operational action: {recommended_action}."
        )

        return {
            "order_id": raw_record.get("order_id", "UNKNOWN"),
            "risk_score": risk_score_int,
            "risk_score_pct": float(risk_score_int),
            "fraud_probability": round(risk_probability, 4),
            "risk_level": risk_level,
            "recommended_action": recommended_action,
            "estimated_exposure": float(raw_record.get("order_amount", 0.0)),
            "requires_human_review": requires_human_review,
            "review_reason": review_reason,
            "risk_factors": risk_factors_narrative,
            "top_contributing_factors": top_positive,
            "top_protective_factors": top_negative,
            "all_contributions": contributions[:15],
            "decision_narrative": decision_narrative
        }
