"""Feature Engineering & Preprocessing Pipeline for RiskMesh Fraud Detection.

Explicit 3-Stage Pipeline:
1. Raw Features (Input validation and extraction)
2. Engineered Features (Domain ratios, velocities, logarithmic transforms, anomaly heuristics)
3. Model Features (Encoded, structured feature matrix matching model input schema)
"""

from typing import Any, Dict, List, Union
import numpy as np
import pandas as pd
from .config import (
    RAW_NUMERICAL_FEATURES,
    RAW_BOOLEAN_FEATURES,
    RAW_CATEGORICAL_FEATURES,
    MODEL_FEATURE_NAMES,
)


class FraudPreprocessor:
    """Preprocesses raw transaction features into engineered model feature vectors."""

    def __init__(self, feature_names: List[str] = MODEL_FEATURE_NAMES):
        self.feature_names = feature_names

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transforms raw features into engineered risk & velocity signals."""
        data = df.copy()

        # 1. Ensure all raw numerical columns exist and have numeric types
        for col in RAW_NUMERICAL_FEATURES:
            if col not in data.columns:
                data[col] = 0.0
            else:
                data[col] = pd.to_numeric(data[col], errors="coerce").fillna(0.0)

        # 2. Ensure all raw boolean columns exist and are numeric (0 or 1)
        for col in RAW_BOOLEAN_FEATURES:
            if col not in data.columns:
                data[col] = 0
            else:
                data[col] = data[col].fillna(0).astype(int)

        # 3. Domain Engineered Features
        # Amount Ratio: Ratio of current transaction to user baseline
        customer_avg = data["customerAvgAmount"].replace(0, 1.0)
        data["amountRatio"] = data["amount"] / (customer_avg + 1e-5)

        # Log Amount: Normalizes heavy-tailed transaction distributions
        data["logAmount"] = np.log1p(np.maximum(0, data["amount"]))

        # Velocity Ratio: Burst velocity in 10-min window compared to expected 10-min window in 24h
        expected_10min = (data["transactionsLast24Hours"] / 144.0) + 0.05
        data["velocityRatio"] = data["transactionsLast10Min"] / expected_10min

        # Failure Rate: Ratio of failed attempts relative to 24h activity
        data["failureRate"] = data["failedAttempts"] / (data["transactionsLast24Hours"] + 1.0)


        # Compound Anomaly Score Heuristic (Domain signal)
        data["anomalyScore"] = (
            (data["isNewDevice"] * 2.0)
            + (data["isNewIp"] * 1.5)
            + ((data["amountRatio"] > 3.0).astype(int) * 2.5)
            + ((data["failedAttempts"] >= 3).astype(int) * 2.0)
            + (data["previousFraudCount"] * 3.5)
        )

        return data

    def encode_categoricals(self, df: pd.DataFrame) -> pd.DataFrame:
        """One-hot encodes categorical dimensions (paymentMethod, currency)."""
        data = df.copy()

        # Payment Methods
        methods = ["CARD", "UPI", "NET_BANKING", "WALLET"]
        pm_series = data.get("paymentMethod", pd.Series(["CARD"] * len(data))).str.upper()
        for m in methods:
            data[f"paymentMethod_{m}"] = (pm_series == m).astype(int)

        # Currencies
        currencies = ["INR", "USD", "EUR"]
        curr_series = data.get("currency", pd.Series(["INR"] * len(data))).str.upper()
        for c in currencies:
            data[f"currency_{c}"] = (curr_series == c).astype(int)

        return data

    def transform(self, raw_input: Union[Dict[str, Any], List[Dict[str, Any]], pd.DataFrame]) -> pd.DataFrame:
        """End-to-end transformation: Raw Features -> Engineered Features -> Model Features."""
        if isinstance(raw_input, dict):
            df = pd.DataFrame([raw_input])
        elif isinstance(raw_input, list):
            df = pd.DataFrame(raw_input)
        elif isinstance(raw_input, pd.DataFrame):
            df = raw_input.copy()
        else:
            raise TypeError(f"Unsupported input type: {type(raw_input)}")

        # Step 1: Feature Engineering
        df_engineered = self.engineer_features(df)

        # Step 2: Categorical Encoding
        df_encoded = self.encode_categoricals(df_engineered)

        # Step 3: Align with exact Model Feature Schema
        for col in self.feature_names:
            if col not in df_encoded.columns:
                df_encoded[col] = 0.0

        # Return strictly aligned dataframe
        return df_encoded[self.feature_names].astype(float)
