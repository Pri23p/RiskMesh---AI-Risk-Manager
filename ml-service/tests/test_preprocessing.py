"""Unit Tests for Feature Engineering & Preprocessing."""

import pytest
import pandas as pd
import numpy as np
from src.preprocessing import FraudPreprocessor
from src.config import MODEL_FEATURE_NAMES


def test_feature_engineering_calculations():
    preprocessor = FraudPreprocessor(feature_names=MODEL_FEATURE_NAMES)

    raw_sample = {
        "amount": 25000.0,
        "customerAvgAmount": 5000.0,
        "transactionsLast10Min": 3,
        "transactionsLast24Hours": 6,
        "failedAttempts": 2,
        "accountAge": 10,
        "isNewDevice": 1,
        "isNewIp": 1,
        "previousFraudCount": 1,
        "paymentMethod": "CARD",
        "currency": "INR",
    }

    df_transformed = preprocessor.transform(raw_sample)

    assert isinstance(df_transformed, pd.DataFrame)
    assert len(df_transformed) == 1
    assert list(df_transformed.columns) == MODEL_FEATURE_NAMES

    # Verify amountRatio = amount / (customerAvgAmount + 1e-5) ~ 25000 / 5000 = 5.0
    assert np.isclose(df_transformed["amountRatio"].iloc[0], 5.0, atol=0.1)

    # Verify one-hot encoding
    assert df_transformed["paymentMethod_CARD"].iloc[0] == 1.0
    assert df_transformed["paymentMethod_UPI"].iloc[0] == 0.0
    assert df_transformed["currency_INR"].iloc[0] == 1.0
    assert df_transformed["currency_USD"].iloc[0] == 0.0


def test_preprocessor_handles_missing_optional_fields():
    preprocessor = FraudPreprocessor(feature_names=MODEL_FEATURE_NAMES)

    minimal_sample = {
        "amount": 100.0,
        "customerAvgAmount": 100.0,
    }

    df_transformed = preprocessor.transform(minimal_sample)

    assert len(df_transformed) == 1
    assert df_transformed.shape[1] == len(MODEL_FEATURE_NAMES)
    assert not df_transformed.isna().any().any()
