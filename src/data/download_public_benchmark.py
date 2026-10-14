"""Download the complete ULB/Worldline dataset without class resampling."""
import hashlib
import json
from pathlib import Path
import urllib.request
import pandas as pd

GENUINE_DATASET_URL = "https://storage.googleapis.com/download.tensorflow.org/data/creditcard.csv"
SOURCE_URL = "https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud"

def download_and_prepare_genuine_benchmark(dest_path="data/benchmark/creditcard_full.csv"):
    path = Path(dest_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        temporary = path.with_suffix(".download")
        urllib.request.urlretrieve(GENUINE_DATASET_URL, temporary)
        temporary.replace(path)
    df = pd.read_csv(path)
    expected = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount", "Class"]
    if list(df.columns) != expected or len(df) != 284807 or int(df.Class.sum()) != 492:
        raise ValueError("Unexpected ULB dataset schema or counts; refusing altered sample")
    if df.isna().any().any() or not df.Class.isin([0, 1]).all():
        raise ValueError("Invalid dataset values")
    metadata = {"source_url": SOURCE_URL, "download_url": GENUINE_DATASET_URL,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "records": len(df), "frauds": int(df.Class.sum()), "sampling": "none"}
    path.with_suffix(".provenance.json").write_text(json.dumps(metadata, indent=2))
    return df

if __name__ == "__main__":
    download_and_prepare_genuine_benchmark()
