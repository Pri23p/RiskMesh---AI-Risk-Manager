"""
RiskSentinel - Feature Engineering & Preprocessing Pipeline
Defensive transaction-time feature extraction with zero post-outcome target leakage.
"""

import numpy as np
import pandas as pd
from typing import List, Tuple, Dict, Any
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

# Explicit raw numeric transaction-time features
RAW_NUMERIC_FEATURES = [
    "order_amount",
    "is_cod",
    "account_age_days",
    "customer_previous_orders",
    "customer_previous_returns",
    "customer_previous_chargebacks",
    "customer_return_rate",
    "customer_chargeback_rate",
    "average_order_value",
    "current_vs_average_order_ratio",
    "billing_shipping_match",
    "shipping_distance",
    "number_of_addresses",
    "orders_from_device",
    "customers_from_device",
    "orders_last_24h",
    "orders_last_7d",
    "customer_orders_last_30d",
    "high_value_item",
    "delivery_attempts",
    "previous_failed_deliveries",
    "device_risk_history",
]

CATEGORICAL_FEATURES = [
    "product_category",
    "payment_method",
    "ip_region",
    "customer_region",
]

# Excluded target & post-outcome columns to prevent future leakage
EXCLUDED_LEAKAGE_COLUMNS = [
    "order_id",
    "customer_id",
    "device_id",
    "timestamp",
    "return_requested",
    "refund_requested",
    "return_reason",
    "fraudulent_return",
]

class RiskSentinelFeatureEngineer(BaseEstimator, TransformerMixin):
    """
    Computes time-safe derived behavioral signals and composite risk interactions.
    """
    def __init__(self):
        pass

    def fit(self, X: pd.DataFrame, y=None):
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        df = X.copy()
        
        # 1. Device cluster sharing density
        if "customers_from_device" in df.columns:
            df["device_sharing_density"] = (df["customers_from_device"] >= 3).astype(float)
        else:
            df["device_sharing_density"] = 0.0
            
        # 2. Short-term order velocity concentration (24h vs 7d)
        if "orders_last_24h" in df.columns and "orders_last_7d" in df.columns:
            df["velocity_24h_ratio"] = df["orders_last_24h"] / np.maximum(1, df["orders_last_7d"])
        else:
            df["velocity_24h_ratio"] = 0.0

        # 3. Order value surge flag (> 2.2x customer average)
        if "current_vs_average_order_ratio" in df.columns:
            df["is_order_value_surge"] = (df["current_vs_average_order_ratio"] > 2.2).astype(float)
        else:
            df["is_order_value_surge"] = 0.0

        # 4. Dangerous combination: High Return Rate + COD / BNPL
        if "customer_return_rate" in df.columns and "is_cod" in df.columns:
            df["cod_high_return_risk"] = ((df["customer_return_rate"] > 0.35) & (df["is_cod"] == 1)).astype(float)
        else:
            df["cod_high_return_risk"] = 0.0

        # 5. Geolocation / IP mismatch indicator
        if "ip_region" in df.columns and "customer_region" in df.columns:
            df["region_mismatch_flag"] = (df["ip_region"] != df["customer_region"]).astype(float)
        else:
            df["region_mismatch_flag"] = 0.0

        # 6. Account maturity protection factor
        if "account_age_days" in df.columns and "customer_return_rate" in df.columns:
            df["account_maturity_trust"] = np.log1p(df["account_age_days"]) / (1.0 + df["customer_return_rate"])
        else:
            df["account_maturity_trust"] = 1.0

        return df


ALL_NUMERIC_FEATURES = RAW_NUMERIC_FEATURES + [
    "device_sharing_density",
    "velocity_24h_ratio",
    "is_order_value_surge",
    "cod_high_return_risk",
    "region_mismatch_flag",
    "account_maturity_trust"
]

def build_preprocessing_pipeline() -> Tuple[RiskSentinelFeatureEngineer, ColumnTransformer]:
    """
    Builds the complete scikit-learn preprocessing ColumnTransformer.
    """
    feature_engineer = RiskSentinelFeatureEngineer()
    
    numeric_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])
    
    categorical_transformer = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="constant", fill_value="Unknown")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, ALL_NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ],
        remainder="drop"
    )
    
    return feature_engineer, preprocessor

def get_feature_names(preprocessor: ColumnTransformer) -> List[str]:
    """
    Extracts output feature names after ColumnTransformer fitting.
    """
    feature_names = list(ALL_NUMERIC_FEATURES)
    cat_encoder = preprocessor.named_transformers_["cat"].named_steps["onehot"]
    cat_feature_names = cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES)
    feature_names.extend(cat_feature_names)
    return feature_names
