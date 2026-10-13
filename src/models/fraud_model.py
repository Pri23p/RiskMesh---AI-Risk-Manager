"""
RiskSentinel - FraudModel with XGBoost & Verified Early Stopping
Provides production-grade gradient boosted decision trees with early stopping on validation loss,
iteration tracking, and business-calibrated scoring.
"""

import numpy as np
import pandas as pd
from typing import Optional, Tuple, List, Dict, Any
import xgboost as xgb
from sklearn.base import BaseEstimator, ClassifierMixin

class FraudModel(BaseEstimator, ClassifierMixin):
    """
    XGBoost-powered Fraud Detection Model with verified early stopping and iteration tracking.
    """
    def __init__(
        self,
        n_estimators: int = 300,
        max_depth: int = 6,
        learning_rate: float = 0.05,
        subsample: float = 0.85,
        colsample_bytree: float = 0.85,
        scale_pos_weight: float = 1.0,
        early_stopping_rounds: Optional[int] = 15,
        eval_metric: str = "logloss",
        random_state: int = 42,
        n_jobs: int = -1
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.subsample = subsample
        self.colsample_bytree = colsample_bytree
        self.scale_pos_weight = scale_pos_weight
        self.early_stopping_rounds = early_stopping_rounds
        self.eval_metric = eval_metric
        self.random_state = random_state
        self.n_jobs = n_jobs
        
        self.clf = None
        self.best_iteration_: Optional[int] = None
        self.best_score_: Optional[float] = None
        self.evals_result_: Dict[str, Any] = {}
        self.is_fitted_: bool = False

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        eval_set: Optional[List[Tuple[np.ndarray, np.ndarray]]] = None,
        early_stopping_rounds: Optional[int] = None,
        verbose: bool = False
    ) -> "FraudModel":
        """
        Train the XGBoost classifier with explicit early stopping using validation data.
        
        Args:
            X_train: Feature matrix for training
            y_train: Labels for training
            eval_set: Optional list of (X_val, y_val) tuples for monitoring early stopping
            early_stopping_rounds: Number of rounds without validation improvement before stopping.
                                  Defaults to self.early_stopping_rounds.
            verbose: Verbosity flag
        """
        es_rounds = early_stopping_rounds if early_stopping_rounds is not None else self.early_stopping_rounds
        
        # Configure XGBClassifier with supported early stopping parameter
        params = {
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "learning_rate": self.learning_rate,
            "subsample": self.subsample,
            "colsample_bytree": self.colsample_bytree,
            "scale_pos_weight": self.scale_pos_weight,
            "random_state": self.random_state,
            "n_jobs": self.n_jobs,
            "eval_metric": self.eval_metric
        }
        
        if eval_set is not None and es_rounds is not None and es_rounds > 0:
            params["early_stopping_rounds"] = es_rounds

        self.clf = xgb.XGBClassifier(**params)
        
        if eval_set is not None:
            self.clf.fit(
                X_train,
                y_train,
                eval_set=eval_set,
                verbose=verbose
            )
            # Record early stopping attributes
            self.best_iteration_ = getattr(self.clf, "best_iteration", None)
            self.best_score_ = getattr(self.clf, "best_score", None)
            self.evals_result_ = getattr(self.clf, "evals_result_", {})
        else:
            self.clf.fit(X_train, y_train, verbose=verbose)
            self.best_iteration_ = self.n_estimators - 1
            self.best_score_ = None

        self.classes_ = self.clf.classes_
        self.n_features_in_ = getattr(self.clf, "n_features_in_", X_train.shape[1])
        self.is_fitted_ = True
        return self

    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs) -> "FraudModel":
        """Standard scikit-learn fit interface."""
        eval_set = kwargs.get("eval_set", None)
        early_stopping_rounds = kwargs.get("early_stopping_rounds", self.early_stopping_rounds)
        return self.train(X, y, eval_set=eval_set, early_stopping_rounds=early_stopping_rounds)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predict class probabilities, utilizing best_iteration."""
        if not self.is_fitted_ or self.clf is None:
            raise RuntimeError("FraudModel is not fitted. Call train() or fit() before predict_proba().")
        
        # XGBoost automatically uses best_iteration when early stopping was active
        return self.clf.predict_proba(X)

    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        """Predict class labels with configurable decision threshold."""
        proba = self.predict_proba(X)[:, 1]
        return (proba >= threshold).astype(int)

    @property
    def feature_importances_(self) -> np.ndarray:
        """Return feature importances from fitted XGBoost model."""
        if not self.is_fitted_ or self.clf is None:
            raise RuntimeError("FraudModel is not fitted.")
        return self.clf.feature_importances_

    def get_training_summary(self) -> Dict[str, Any]:
        """Return diagnostic metrics about early stopping and training rounds."""
        return {
            "is_fitted": self.is_fitted_,
            "configured_max_estimators": self.n_estimators,
            "early_stopping_rounds": self.early_stopping_rounds,
            "best_iteration": self.best_iteration_,
            "best_score": float(self.best_score_) if self.best_score_ is not None else None,
            "stopped_early": bool(self.best_iteration_ is not None and self.best_iteration_ < (self.n_estimators - 1))
        }
