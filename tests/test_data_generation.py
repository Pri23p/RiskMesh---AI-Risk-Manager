"""
RiskSentinel - Unit Tests for Synthetic Data Generation
"""

import pytest
import pandas as pd
import numpy as np
from src.data.generate_data import generate_risksentinel_dataset
from src.features.engineer import RAW_NUMERIC_FEATURES, CATEGORICAL_FEATURES, EXCLUDED_LEAKAGE_COLUMNS

def test_data_generation_shape_and_columns(tmp_path):
    output_dir = str(tmp_path / "data")
    df, train_df, val_df, test_df = generate_risksentinel_dataset(num_records=200, seed=42, output_dir=output_dir)
    
    assert len(df) == 200
    assert len(train_df) == 140
    assert len(val_df) == 30
    assert len(test_df) == 30
    
    # Check all required core features exist
    for col in RAW_NUMERIC_FEATURES:
        assert col in df.columns, f"Missing numeric column: {col}"
    for col in CATEGORICAL_FEATURES:
        assert col in df.columns, f"Missing categorical column: {col}"
        
    assert "fraudulent_return" in df.columns
    assert "order_id" in df.columns
    assert "customer_id" in df.columns

def test_data_generation_reproducibility(tmp_path):
    dir1 = str(tmp_path / "data1")
    dir2 = str(tmp_path / "data2")
    df1, _, _, _ = generate_risksentinel_dataset(num_records=100, seed=123, output_dir=dir1)
    df2, _, _, _ = generate_risksentinel_dataset(num_records=100, seed=123, output_dir=dir2)
    
    pd.testing.assert_frame_equal(df1, df2)

def test_target_distribution_and_validity(tmp_path):
    output_dir = str(tmp_path / "data")
    df, _, _, _ = generate_risksentinel_dataset(num_records=500, seed=42, output_dir=output_dir)
    
    # Target must be strictly binary
    assert set(df["fraudulent_return"].unique()).issubset({0, 1})
    prevalence = df["fraudulent_return"].mean()
    assert 0.10 <= prevalence <= 0.40, f"Unrealistic prevalence: {prevalence}"
