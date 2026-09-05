"""Dataset Generation and Partitioning for RiskMesh Fraud Detection.

Generates a realistic benchmark transaction dataset based on empirical merchant fraud patterns:
- Heavy-tailed transaction amounts (Lognormal)
- Velocity bursts (transactions in last 10min / 24h)
- Credential stuffing and failed attempt spikes
- Device and IP novelty indicators
- Prior fraud history signals
- Realistic fraud prevalence (~3.0%)

Produces:
- raw_dataset.csv
- train.csv (70%)
- val.csv (15%)
- test.csv (15% held-out)
"""

from pathlib import Path
from typing import Tuple
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from src.config import (
    RAW_DATA_PATH,
    TRAIN_DATA_PATH,
    VAL_DATA_PATH,
    TEST_DATA_PATH,
    RANDOM_STATE,
)


def generate_fraud_dataset(n_samples: int = 15000, fraud_ratio: float = 0.03) -> pd.DataFrame:
    """Generates synthetic high-fidelity merchant transaction records with realistic fraud signatures."""
    np.random.seed(RANDOM_STATE)

    n_fraud = int(n_samples * fraud_ratio)
    n_legit = n_samples - n_fraud

    # 1. Generate Legitimate Transactions
    legit_account_age = np.random.exponential(scale=250, size=n_legit) + 30
    legit_customer_avg = np.random.lognormal(mean=4.5, sigma=0.8, size=n_legit) + 10.0
    # Legit amount close to user average
    legit_amount = np.maximum(
        5.0,
        legit_customer_avg * np.random.normal(loc=1.0, scale=0.35, size=n_legit),
    )
    legit_tx_24h = np.random.poisson(lam=2.5, size=n_legit)
    legit_tx_10m = np.random.binomial(n=legit_tx_24h, p=0.15)
    legit_failed = np.random.binomial(n=3, p=0.04, size=n_legit)
    legit_new_device = np.random.binomial(n=1, p=0.08, size=n_legit)
    legit_new_ip = np.random.binomial(n=1, p=0.12, size=n_legit)
    legit_prev_fraud = np.random.binomial(n=1, p=0.005, size=n_legit)
    legit_pm = np.random.choice(["CARD", "UPI", "NET_BANKING", "WALLET"], p=[0.5, 0.3, 0.1, 0.1], size=n_legit)
    legit_curr = np.random.choice(["INR", "USD", "EUR"], p=[0.6, 0.3, 0.1], size=n_legit)

    df_legit = pd.DataFrame(
        {
            "amount": np.round(legit_amount, 2),
            "customerAvgAmount": np.round(legit_customer_avg, 2),
            "transactionsLast10Min": legit_tx_10m,
            "transactionsLast24Hours": np.maximum(legit_tx_10m, legit_tx_24h),
            "failedAttempts": legit_failed,
            "accountAge": np.round(legit_account_age).astype(int),
            "isNewDevice": legit_new_device,
            "isNewIp": legit_new_ip,
            "previousFraudCount": legit_prev_fraud,
            "paymentMethod": legit_pm,
            "currency": legit_curr,
            "isFraud": 0,
        }
    )

    # 2. Generate Fraudulent Transactions (Patterns: Account takeover, card testing, velocity spikes)
    fraud_account_age = np.random.exponential(scale=60, size=n_fraud) + 1  # Often newer accounts
    fraud_customer_avg = np.random.lognormal(mean=4.2, sigma=0.9, size=n_fraud) + 10.0
    # Fraud amount significantly higher than average (high amountRatio) or sudden micro-testing
    fraud_multiplier = np.random.choice([0.05, 4.5, 8.2, 12.0], p=[0.1, 0.4, 0.3, 0.2], size=n_fraud)
    fraud_amount = np.maximum(
        1.0,
        fraud_customer_avg * fraud_multiplier * np.random.normal(loc=1.0, scale=0.2, size=n_fraud),
    )
    fraud_tx_24h = np.random.poisson(lam=8.0, size=n_fraud) + 1
    fraud_tx_10m = np.random.poisson(lam=3.5, size=n_fraud) + 1
    fraud_failed = np.random.poisson(lam=2.5, size=n_fraud)
    fraud_new_device = np.random.binomial(n=1, p=0.75, size=n_fraud)  # 75% new device
    fraud_new_ip = np.random.binomial(n=1, p=0.82, size=n_fraud)  # 82% new IP
    fraud_prev_fraud = np.random.binomial(n=3, p=0.35, size=n_fraud)
    fraud_pm = np.random.choice(["CARD", "UPI", "NET_BANKING", "WALLET"], p=[0.7, 0.15, 0.05, 0.1], size=n_fraud)
    fraud_curr = np.random.choice(["INR", "USD", "EUR"], p=[0.4, 0.5, 0.1], size=n_fraud)

    df_fraud = pd.DataFrame(
        {
            "amount": np.round(fraud_amount, 2),
            "customerAvgAmount": np.round(fraud_customer_avg, 2),
            "transactionsLast10Min": fraud_tx_10m,
            "transactionsLast24Hours": np.maximum(fraud_tx_10m, fraud_tx_24h),
            "failedAttempts": fraud_failed,
            "accountAge": np.round(fraud_account_age).astype(int),
            "isNewDevice": fraud_new_device,
            "isNewIp": fraud_new_ip,
            "previousFraudCount": fraud_prev_fraud,
            "paymentMethod": fraud_pm,
            "currency": fraud_curr,
            "isFraud": 1,
        }
    )

    # Combine and shuffle
    df_all = pd.concat([df_legit, df_fraud], ignore_index=True)
    df_all = df_all.sample(frac=1.0, random_state=RANDOM_STATE).reset_index(drop=True)
    df_all["transactionId"] = [f"TXN_{i+100000}" for i in range(len(df_all))]
    df_all["customerId"] = [f"CUS_{np.random.randint(1000, 9999)}" for _ in range(len(df_all))]

    return df_all


def create_and_save_dataset_splits() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Generates dataset, performs stratified train/val/test split (70/15/15), and saves CSVs."""
    print("[INFO] Generating high-fidelity fraud transaction dataset...")
    df = generate_fraud_dataset(n_samples=15000, fraud_ratio=0.03)

    # Save raw dataset
    RAW_DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(RAW_DATA_PATH, index=False)
    print(f"[OK] Raw dataset saved to {RAW_DATA_PATH} ({len(df)} records, {df['isFraud'].sum()} fraud)")

    # Stratified split: Train (70%), Val (15%), Test (15%)
    train_df, temp_df = train_test_split(
        df,
        test_size=0.30,
        random_state=RANDOM_STATE,
        stratify=df["isFraud"],
    )

    val_df, test_df = train_test_split(
        temp_df,
        test_size=0.50,
        random_state=RANDOM_STATE,
        stratify=temp_df["isFraud"],
    )

    train_df.to_csv(TRAIN_DATA_PATH, index=False)
    val_df.to_csv(VAL_DATA_PATH, index=False)
    test_df.to_csv(TEST_DATA_PATH, index=False)

    print(f"[OK] Train set: {len(train_df)} rows ({train_df['isFraud'].sum()} fraud)")
    print(f"[OK] Val set:   {len(val_df)} rows ({val_df['isFraud'].sum()} fraud)")
    print(f"[OK] Test set:  {len(test_df)} rows ({test_df['isFraud'].sum()} fraud)")

    return train_df, val_df, test_df



if __name__ == "__main__":
    create_and_save_dataset_splits()
