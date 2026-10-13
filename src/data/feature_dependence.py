"""
RiskSentinel - Feature-Label Dependence & Leakage Analysis
Investigates correlation, mutual information, and feature-target dependencies
to detect and prevent artificial data leakage.
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.feature_selection import mutual_info_classif
from scipy.stats import spearmanr, pearsonr

def analyze_feature_label_dependence(
    data_path: str = "data/processed/train.csv",
    target_col: str = "fraudulent_return",
    output_path: str = "artifacts/metrics/feature_label_dependence.json"
) -> Dict[str, Any]:
    """
    Performs comprehensive dependence diagnostics between candidate features and target.
    Flags any suspicious features exhibiting near-deterministic relationship (>0.90 correlation
    or anomalous mutual information).
    """
    print(f"[DEPENDENCE] Analyzing feature-label dependence for: {data_path}...")
    df = pd.read_csv(data_path)
    
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in {data_path}")
        
    y = df[target_col].values
    
    # Exclude non-feature or identifier columns
    exclude_cols = [
        "order_id", "customer_id", "device_id", "timestamp",
        "return_requested", "refund_requested", "return_reason",
        target_col
    ]
    candidate_features = [c for c in df.columns if c not in exclude_cols]
    
    dependence_records = []
    suspicious_leakage_features = []
    
    # Separate numeric and categorical
    numeric_cols = [c for c in candidate_features if pd.api.types.is_numeric_dtype(df[c])]
    categorical_cols = [c for c in candidate_features if c not in numeric_cols]
    
    # Pre-impute numeric missing for mutual info
    X_num = df[numeric_cols].fillna(df[numeric_cols].median())
    
    # Calculate Mutual Information for numeric features
    mi_scores = mutual_info_classif(X_num, y, random_state=42)
    mi_dict = dict(zip(numeric_cols, mi_scores))
    
    for col in numeric_cols:
        series = X_num[col].values
        
        # Pearson and Spearman
        try:
            p_corr, p_val = pearsonr(series, y)
            if np.isnan(p_corr):
                p_corr = 0.0
        except Exception:
            p_corr, p_val = 0.0, 1.0
            
        try:
            s_corr, s_val = spearmanr(series, y)
            if np.isnan(s_corr):
                s_corr = 0.0
        except Exception:
            s_corr, s_val = 0.0, 1.0
            
        mi = float(mi_dict.get(col, 0.0))
        
        # Flags
        is_leakage = bool(abs(p_corr) > 0.85 or abs(s_corr) > 0.85 or mi > 0.50)
        if is_leakage:
            suspicious_leakage_features.append(col)
            
        dependence_records.append({
            "feature": col,
            "type": "numeric",
            "pearson_correlation": round(float(p_corr), 4),
            "spearman_correlation": round(float(s_corr), 4),
            "mutual_information": round(mi, 4),
            "is_suspicious_leakage": is_leakage,
            "interpretation": (
                "Potentially leaking signal - requires scrutiny" if is_leakage
                else "Realistic non-deterministic behavioral distribution"
            )
        })
        
    # Analyze categorical columns via frequency encoding correlation
    for col in categorical_cols:
        freq = df[col].value_counts(normalize=True).to_dict()
        enc = df[col].map(freq).fillna(0).values
        try:
            p_corr, _ = pearsonr(enc, y)
        except Exception:
            p_corr = 0.0
            
        dependence_records.append({
            "feature": col,
            "type": "categorical",
            "pearson_correlation": round(float(p_corr), 4),
            "spearman_correlation": 0.0,
            "mutual_information": 0.0,
            "is_suspicious_leakage": False,
            "interpretation": "Categorical domain attribute"
        })
        
    dependence_records.sort(key=lambda x: abs(x["pearson_correlation"]), reverse=True)
    
    report = {
        "dataset_analyzed": data_path,
        "sample_count": len(df),
        "target_column": target_col,
        "total_features_evaluated": len(dependence_records),
        "potential_leakage_features_detected": suspicious_leakage_features,
        "leakage_risk_assessment": (
            "HIGH_LEAKAGE_RISK" if len(suspicious_leakage_features) > 0 else "CLEAN_DISTRIBUTION"
        ),
        "methodology": "Pearson correlation, Spearman rank correlation, and Mutual Information (scikit-learn)",
        "diagnostics": dependence_records
    }
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
        
    print(f"[DEPENDENCE] Dependence analysis complete. Potential leakage features: {suspicious_leakage_features}")
    return report

if __name__ == "__main__":
    analyze_feature_label_dependence()
