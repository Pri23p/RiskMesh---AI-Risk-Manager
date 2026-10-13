"""
Test Suite for FraudModel and XGBoost Early Stopping Implementation
"""

import pytest
import numpy as np
from src.models.fraud_model import FraudModel

def test_fraud_model_early_stopping():
    np.random.seed(42)
    # Generate simple synthetic dataset with noisy validation set
    n_samples = 400
    n_features = 10
    X_train = np.random.randn(n_samples, n_features)
    y_train = (X_train[:, 0] + X_train[:, 1] > 0).astype(int)
    
    # Validation data with high noise to induce early stopping
    X_val = np.random.randn(150, n_features)
    y_val = (X_val[:, 0] + X_val[:, 1] > 0).astype(int)
    
    # Configure FraudModel with large n_estimators and aggressive early stopping
    model = FraudModel(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.08,
        early_stopping_rounds=8,
        random_state=42
    )
    
    model.train(
        X_train=X_train,
        y_train=y_train,
        eval_set=[(X_val, y_val)],
        early_stopping_rounds=8,
        verbose=False
    )
    
    summary = model.get_training_summary()
    assert model.is_fitted_ is True
    assert summary["is_fitted"] is True
    assert summary["configured_max_estimators"] == 300
    assert summary["best_iteration"] is not None
    # Verify that training halted early prior to reaching 300 estimators
    assert summary["best_iteration"] < 250
    assert summary["stopped_early"] is True
    
    # Test predictions
    probas = model.predict_proba(X_val)
    assert probas.shape == (150, 2)
    preds = model.predict(X_val, threshold=0.45)
    assert len(preds) == 150
    assert set(preds).issubset({0, 1})
    assert len(model.feature_importances_) == n_features
