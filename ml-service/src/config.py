from pathlib import Path
import os

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
ARTIFACTS_DIR = BASE_DIR / "artifacts"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

# Data file paths
RAW_DATA_PATH = DATA_DIR / "raw_dataset.csv"
TRAIN_DATA_PATH = DATA_DIR / "train.csv"
VAL_DATA_PATH = DATA_DIR / "val.csv"
TEST_DATA_PATH = DATA_DIR / "test.csv"

# Model artifact paths
MODEL_PATH = ARTIFACTS_DIR / "model.json"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"
METADATA_PATH = ARTIFACTS_DIR / "metadata.json"
FEATURE_CONFIG_PATH = ARTIFACTS_DIR / "feature_config.json"

# Model hyperparameters
RANDOM_STATE = 42
MODEL_VERSION = "v1"

# Feature configuration definitions
RAW_NUMERICAL_FEATURES = [
    "amount",
    "customerAvgAmount",
    "transactionsLast10Min",
    "transactionsLast24Hours",
    "failedAttempts",
    "accountAge",
    "previousFraudCount",
]

RAW_CATEGORICAL_FEATURES = [
    "paymentMethod",
    "currency",
]

RAW_BOOLEAN_FEATURES = [
    "isNewDevice",
    "isNewIp",
]

# Engineered numerical features
ENGINEERED_FEATURES = [
    "amountRatio",
    "logAmount",
    "velocityRatio",
    "failureRate",
    "anomalyScore",
]

# Final Model Feature Column Order
MODEL_FEATURE_NAMES = (
    RAW_NUMERICAL_FEATURES
    + RAW_BOOLEAN_FEATURES
    + ENGINEERED_FEATURES
    + [
        "paymentMethod_CARD",
        "paymentMethod_UPI",
        "paymentMethod_NET_BANKING",
        "paymentMethod_WALLET",
        "currency_INR",
        "currency_USD",
        "currency_EUR",
    ]
)
