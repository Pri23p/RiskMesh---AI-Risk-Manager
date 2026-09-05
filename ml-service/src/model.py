"""XGBoost Classifier Model for Fraud Risk Prediction."""

from pathlib import Path
from typing import Optional, Union, Dict, Any
import numpy as np
import pandas as pd
import xgboost as xgb
from .config import RANDOM_STATE, MODEL_PATH


class FraudModel:
    """XGBoost Binary Classifier for transaction fraud probability scoring."""

    def __init__(self, model: Optional[xgb.XGBClassifier] = None):
        self.model = model

    @classmethod
    def create_classifier(
        cls,
        scale_pos_weight: float = 1.0,
        n_estimators: int = 200,
        max_depth: int = 6,
        learning_rate: float = 0.05,
        subsample: float = 0.8,
        colsample_bytree: float = 0.8,
    ) -> "FraudModel":
        """Instantiates configured XGBClassifier optimized for imbalanced fraud risk."""
        classifier = xgb.XGBClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            subsample=subsample,
            colsample_bytree=colsample_bytree,
            scale_pos_weight=scale_pos_weight,
            eval_metric=["logloss", "aucpr"],
            random_state=RANDOM_STATE,
            n_jobs=-1,
            tree_method="hist",
        )
        return cls(model=classifier)

    def train(
        self,
        X_train: Union[pd.DataFrame, np.ndarray],
        y_train: Union[pd.Series, np.ndarray],
        X_val: Optional[Union[pd.DataFrame, np.ndarray]] = None,
        y_val: Optional[Union[pd.Series, np.ndarray]] = None,
        early_stopping_rounds: int = 20,
    ) -> Dict[str, Any]:
        """Trains XGBoost model with validation monitoring."""
        if self.model is None:
            raise ValueError("Model is not initialized.")

        eval_set = [(X_train, y_train)]
        if X_val is not None and y_val is not None:
            eval_set.append((X_val, y_val))

        self.model.fit(
            X_train,
            y_train,
            eval_set=eval_set,
            verbose=False,
        )

        return {
            "best_iteration": getattr(self.model, "best_iteration", None),
            "n_features_in": self.model.n_features_in_,
        }

    def predict_proba(self, X: Union[pd.DataFrame, np.ndarray]) -> np.ndarray:
        """Returns 1D array of fraud probabilities (class 1)."""
        if self.model is None:
            raise ValueError("Model is not trained or loaded.")
        probabilities = self.model.predict_proba(X)
        return probabilities[:, 1]

    def predict(self, X: Union[pd.DataFrame, np.ndarray], threshold: float = 0.5) -> np.ndarray:
        """Returns binary predictions based on decision threshold."""
        probs = self.predict_proba(X)
        return (probs >= threshold).astype(int)

    def save(self, filepath: Union[str, Path] = MODEL_PATH) -> None:
        """Saves model in native XGBoost JSON format."""
        if self.model is None:
            raise ValueError("No model to save.")
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        self.model.save_model(str(path))

    def load(self, filepath: Union[str, Path] = MODEL_PATH) -> None:
        """Loads model from saved JSON format."""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"Model file not found at {path}")
        classifier = xgb.XGBClassifier()
        classifier.load_model(str(path))
        self.model = classifier
