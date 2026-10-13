"""
RiskSentinel - Unit Tests for Feature Engineering & Pipeline Transformation
"""

import pytest
import pandas as pd
import numpy as np
from src.features.engineer import RiskSentinelFeatureEngineer, build_preprocessing_pipeline, ALL_NUMERIC_FEATURES

def test_feature_engineering_derived_features():
    df = pd.DataFrame([{
        "order_amount": 8499.0,
        "is_cod": 1,
        "account_age_days": 120,
        "customer_previous_orders": 10,
        "customer_previous_returns": 4,
        "customer_previous_chargebacks": 1,
        "customer_return_rate": 0.40,
        "customer_chargeback_rate": 0.10,
        "average_order_value": 2800.0,
        "current_vs_average_order_ratio": 3.035,
        "billing_shipping_match": 0,
        "shipping_distance": 450.0,
        "number_of_addresses": 2,
        "device_id": "DEV-RING-8899",
        "orders_from_device": 28,
        "customers_from_device": 8,
        "orders_last_24h": 4,
        "orders_last_7d": 7,
        "customer_orders_last_30d": 5,
        "high_value_item": 1,
        "delivery_attempts": 1,
        "previous_failed_deliveries": 1,
        "device_risk_history": 0.92,
        "product_category": "Electronics & Gadgets",
        "payment_method": "Cash on Delivery (COD)",
        "ip_region": "West",
        "customer_region": "North"
    }])
    
    fe = RiskSentinelFeatureEngineer()
    res = fe.transform(df)
    
    assert "device_sharing_density" in res.columns
    assert res["device_sharing_density"].iloc[0] == 1.0 # 8 >= 3
    assert res["is_order_value_surge"].iloc[0] == 1.0 # 3.035 > 2.2
    assert res["cod_high_return_risk"].iloc[0] == 1.0 # 0.40 > 0.35 and is_cod == 1
    assert res["region_mismatch_flag"].iloc[0] == 1.0 # West != North

def test_pipeline_transformation_handles_missing_values():
    fe, preprocessor = build_preprocessing_pipeline()
    
    train_df = pd.DataFrame([{
        "order_amount": 2500.0,
        "is_cod": 0,
        "account_age_days": 100,
        "customer_previous_orders": 4,
        "customer_previous_returns": 1,
        "customer_previous_chargebacks": 0,
        "customer_return_rate": 0.25,
        "customer_chargeback_rate": 0.0,
        "average_order_value": 2500.0,
        "current_vs_average_order_ratio": 1.0,
        "billing_shipping_match": 1,
        "shipping_distance": 150.0,
        "number_of_addresses": 1,
        "orders_from_device": 2,
        "customers_from_device": 1,
        "orders_last_24h": 1,
        "orders_last_7d": 2,
        "customer_orders_last_30d": 1,
        "high_value_item": 0,
        "delivery_attempts": 1,
        "previous_failed_deliveries": 0,
        "device_risk_history": 0.1,
        "product_category": "Apparel & Footwear",
        "payment_method": "UPI",
        "ip_region": "North",
        "customer_region": "North"
    }])
    
    df_eng = fe.fit_transform(train_df)
    preprocessor.fit(df_eng)
    
    test_record = pd.DataFrame([{
        "order_amount": np.nan,
        "is_cod": 1,
        "account_age_days": 50,
        "customer_previous_orders": 2,
        "customer_previous_returns": 0,
        "customer_previous_chargebacks": 0,
        "customer_return_rate": 0.0,
        "customer_chargeback_rate": 0.0,
        "average_order_value": np.nan,
        "current_vs_average_order_ratio": 1.0,
        "billing_shipping_match": 1,
        "shipping_distance": 200.0,
        "number_of_addresses": 1,
        "orders_from_device": 1,
        "customers_from_device": 1,
        "orders_last_24h": 0,
        "orders_last_7d": 1,
        "customer_orders_last_30d": 1,
        "high_value_item": 0,
        "delivery_attempts": 1,
        "previous_failed_deliveries": 0,
        "device_risk_history": 0.05,
        "product_category": "Unknown New Cat",
        "payment_method": "UPI",
        "ip_region": "South",
        "customer_region": "South"
    }])
    
    test_eng = fe.transform(test_record)
    X_trans = preprocessor.transform(test_eng)
    assert not np.isnan(X_trans).any()
    assert X_trans.shape[0] == 1
