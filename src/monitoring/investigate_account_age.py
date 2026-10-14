"""Diagnose known synthetic aging without suppressing raw drift alerts."""
import json
from pathlib import Path
import pandas as pd
from src.monitoring.drift_monitor import ProductionDriftMonitor


def investigate():
    monitor = ProductionDriftMonitor()
    reference = pd.read_csv("data/processed/train.csv")
    current = pd.read_csv("data/processed/test.csv")
    current = current.loc[current.order_id != "ORD-10239"]
    epoch = pd.Timestamp("2025-01-01 08:00:00")

    def initial_age(frame):
        elapsed = (pd.to_datetime(frame.timestamp) - epoch).dt.total_seconds() // 86400
        return frame.account_age_days.to_numpy() - elapsed.to_numpy()

    report = {
        "scope": "Synthetic generator diagnostic only; raw production alert retained",
        "reference_rows": len(reference), "current_rows": len(current),
        "raw_account_age_psi": monitor.calculate_psi(reference.account_age_days.to_numpy(), current.account_age_days.to_numpy())[0],
        "generator_epoch_adjusted_psi": monitor.calculate_psi(initial_age(reference), initial_age(current))[0],
        "reference_mean_age": float(reference.account_age_days.mean()),
        "current_mean_age": float(current.account_age_days.mean()),
        "explanation": "Generator adds floor(elapsed days since 2025-01-01 08:00) to fixed customer age. Subtracting that known synthetic term isolates cohort composition; it is not an inference-time feature change.",
    }
    Path("artifacts/monitoring/account_age_investigation.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


if __name__ == "__main__":
    print(json.dumps(investigate(), indent=2))
