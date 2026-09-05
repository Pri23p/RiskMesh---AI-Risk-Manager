"""End-to-End Training & Evaluation Pipeline for RiskMesh AI Fraud Detector."""

import json
from pathlib import Path
import pandas as pd
from src.config import (
    TRAIN_DATA_PATH,
    VAL_DATA_PATH,
    TEST_DATA_PATH,
    MODEL_PATH,
    METRICS_PATH,
    METADATA_PATH,
    FEATURE_CONFIG_PATH,
    MODEL_VERSION,
    MODEL_FEATURE_NAMES,
)
from src.preprocessing import FraudPreprocessor
from src.model import FraudModel
from src.evaluation import evaluate_model
from data.dataset_builder import create_and_save_dataset_splits


def run_training_pipeline() -> dict:
    """Executes full ML lifecycle: Data Split -> Preprocessing -> Training -> Test Evaluation -> Artifact Saving."""
    print("============================================================")
    print("RiskMesh ML Pipeline - Training & Evaluation")
    print("============================================================")

    # 1. Ensure Data Splits Exist
    if not (TRAIN_DATA_PATH.exists() and VAL_DATA_PATH.exists() and TEST_DATA_PATH.exists()):
        train_df, val_df, test_df = create_and_save_dataset_splits()
    else:
        print("[INFO] Loading existing dataset splits...")
        train_df = pd.read_csv(TRAIN_DATA_PATH)
        val_df = pd.read_csv(VAL_DATA_PATH)
        test_df = pd.read_csv(TEST_DATA_PATH)

    print(f"Dataset summary: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    # 2. Preprocess & Feature Engineering
    preprocessor = FraudPreprocessor(feature_names=MODEL_FEATURE_NAMES)

    X_train = preprocessor.transform(train_df)
    y_train = train_df["isFraud"].values

    X_val = preprocessor.transform(val_df)
    y_val = val_df["isFraud"].values

    X_test = preprocessor.transform(test_df)
    y_test = test_df["isFraud"].values

    print(f"Engineered Feature matrix shape: {X_train.shape}")

    # 3. Handle Class Imbalance with scale_pos_weight
    n_neg = (y_train == 0).sum()
    n_pos = (y_train == 1).sum()
    scale_pos_weight = float(n_neg / max(1, n_pos))
    print(f"Class distribution in training: Non-Fraud={n_neg}, Fraud={n_pos} (scale_pos_weight={scale_pos_weight:.2f})")

    # 4. Train Model
    print("[INFO] Training XGBoost Binary Classifier...")
    model = FraudModel.create_classifier(
        scale_pos_weight=scale_pos_weight,
        n_estimators=250,
        max_depth=5,
        learning_rate=0.04,
    )
    training_info = model.train(X_train, y_train, X_val, y_val)
    print(f"[OK] Training complete. Features: {training_info['n_features_in']}")

    # 5. Evaluate on HELD-OUT TEST SET
    print("[INFO] Evaluating on Held-Out Test Set (No data leakage)...")
    y_test_proba = model.predict_proba(X_test)
    evaluation_results = evaluate_model(y_test, y_test_proba, threshold=0.5)

    print("\n" + "=" * 45)
    print("HELD-OUT TEST EVALUATION METRICS")
    print("=" * 45)
    print(f"Precision: {evaluation_results['metrics']['precision']:.4f}")
    print(f"Recall:    {evaluation_results['metrics']['recall']:.4f}")
    print(f"F1 Score:  {evaluation_results['metrics']['f1_score']:.4f}")
    print(f"PR-AUC:    {evaluation_results['metrics']['pr_auc']:.4f}")
    print(f"ROC-AUC:   {evaluation_results['metrics']['roc_auc']:.4f}")
    print("Confusion Matrix:")
    print(f"  TN: {evaluation_results['confusion_matrix']['true_negatives']} | FP: {evaluation_results['confusion_matrix']['false_positives']}")
    print(f"  FN: {evaluation_results['confusion_matrix']['false_negatives']} | TP: {evaluation_results['confusion_matrix']['true_positives']}")
    print("=" * 45 + "\n")

    # 6. Save Artifacts
    print("[INFO] Saving model artifacts...")
    model.save(MODEL_PATH)

    # Save feature configuration
    feature_config = {
        "model_features": MODEL_FEATURE_NAMES,
        "n_features": len(MODEL_FEATURE_NAMES),
    }
    with open(FEATURE_CONFIG_PATH, "w") as f:
        json.dump(feature_config, f, indent=2)

    # Save actual metrics
    with open(METRICS_PATH, "w") as f:
        json.dump(evaluation_results, f, indent=2)

    # Save metadata
    metadata = {
        "model_version": MODEL_VERSION,
        "algorithm": "XGBoost Classifier (XGBClassifier)",
        "feature_count": len(MODEL_FEATURE_NAMES),
        "scale_pos_weight": scale_pos_weight,
        "training_samples": len(train_df),
        "validation_samples": len(val_df),
        "test_samples": len(test_df),
        "test_metrics": evaluation_results["metrics"],
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[OK] Saved model to {MODEL_PATH}")
    print(f"[OK] Saved metrics to {METRICS_PATH}")
    print(f"[OK] Saved metadata to {METADATA_PATH}")


    return evaluation_results


if __name__ == "__main__":
    run_training_pipeline()
