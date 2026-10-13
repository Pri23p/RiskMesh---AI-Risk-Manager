"""
RiskSentinel - End-to-End Pipeline & Integration Test
"""

import pytest
import os
import pandas as pd
from src.data.generate_data import generate_risksentinel_dataset
from src.features.engineer import build_preprocessing_pipeline
from src.models.explainer import RiskSentinelExplainer
from app.services.risk_service import RiskScoringService

def test_full_pipeline_end_to_end(tmp_path):
    out_dir = str(tmp_path / "e2e_data")
    df, train_df, val_df, test_df = generate_risksentinel_dataset(num_records=150, seed=99, output_dir=out_dir)
    
    assert len(train_df) == 105
    assert len(val_df) == 22
    assert len(test_df) == 23
    assert len(train_df) + len(val_df) + len(test_df) == 150
    
    service = RiskScoringService.get_instance()
    results = service.score_batch(test_df)
    assert len(results) == len(test_df)
    
    for r in results:
        assert 0 <= r["risk_score"] <= 100
        assert r["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
        assert len(r["decision_narrative"]) > 10
