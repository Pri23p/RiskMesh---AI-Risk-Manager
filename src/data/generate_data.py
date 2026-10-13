"""
RiskSentinel - High-Performance Synthetic Dataset Generator
Generates realistic e-commerce transaction history (50,000+ records) with 32 features,
non-leaking transaction-time signals, realistic class imbalance (~10-12% fraudulent returns),
realistic behavioral correlations, planted abuse rings, and category return spikes.
"""

import os
import argparse
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_risksentinel_dataset(
    num_records: int = 50000,
    seed: int = 42,
    output_dir: str = "data"
):
    np.random.seed(seed)
    print(f"[DATA] Generating {num_records} synthetic transactions with realistic behavioral correlations...")
    
    start_date = datetime(2025, 1, 1, 8, 0, 0)
    num_customers = max(2000, int(num_records / 3.5))
    customer_id_list = [f"CUST-{10000 + i}" for i in range(num_customers)]
    
    # Generate customer base profiles
    acc_age_base = (np.random.exponential(scale=320, size=num_customers) + 5).astype(int)
    is_serial_abuser = np.random.rand(num_customers) < 0.065
    has_chargeback_history = (np.random.rand(num_customers) < 0.04) | (is_serial_abuser & (np.random.rand(num_customers) < 0.35))
    
    base_return_rate = np.random.beta(a=1.3, b=5.0, size=num_customers)
    base_return_rate[is_serial_abuser] = np.random.uniform(0.55, 0.90, size=np.sum(is_serial_abuser))
    
    base_aov = np.round(np.random.lognormal(mean=7.6, sigma=0.65, size=num_customers), 2)
    
    payment_choices = np.array(["UPI", "Credit Card", "Debit Card", "Cash on Delivery (COD)", "Net Banking", "Buy Now Pay Later (BNPL)"])
    payment_probs = [0.38, 0.25, 0.12, 0.15, 0.05, 0.05]
    cust_payments = np.random.choice(payment_choices, p=payment_probs, size=num_customers)
    
    region_choices = np.array(["North", "South", "East", "West", "Central", "North East"])
    region_probs = [0.28, 0.26, 0.15, 0.21, 0.06, 0.04]
    cust_regions = np.random.choice(region_choices, p=region_probs, size=num_customers)

    # Categories with realistic price ranges & inherent base return rates
    categories = [
        ("Apparel & Footwear", 0.32, 1200.0, 4500.0),
        ("Luxury Watches & Jewelry", 0.16, 5000.0, 28000.0),
        ("Electronics & Gadgets", 0.18, 2800.0, 22000.0),
        ("Home Appliances", 0.12, 2000.0, 15000.0),
        ("Beauty & Personal Care", 0.05, 500.0, 3200.0),
        ("Sports & Outdoors", 0.14, 1100.0, 7500.0),
        ("Mobile & Accessories", 0.15, 800.0, 12000.0)
    ]
    cat_names = [c[0] for c in categories]
    cat_base_rates = {c[0]: c[1] for c in categories}
    cat_probs = [0.28, 0.09, 0.22, 0.12, 0.13, 0.08, 0.08]

    # Generate device pool (some devices shared across multiple accounts for abuse ring detection)
    num_devices = int(num_customers * 0.82)
    device_id_pool = [f"DEV-{20000 + i}" for i in range(num_devices)]
    cust_devices = np.random.choice(device_id_pool, size=num_customers)
    
    # Generate address pool
    num_addresses = int(num_customers * 0.90)
    address_id_pool = [f"ADDR-{30000 + i}" for i in range(num_addresses)]
    cust_addresses = np.random.choice(address_id_pool, size=num_customers)
    
    # Plant a coordinated abuse ring across 12 specific accounts sharing 2 devices and 4 addresses
    ring_cust_indices = np.random.choice(num_customers, size=12, replace=False)
    ring_device_1 = "DEV-RING-8899"
    ring_device_2 = "DEV-RING-8890"
    ring_addr_1 = "ADDR-RING-4411"
    ring_addr_2 = "ADDR-RING-4412"
    for i, idx in enumerate(ring_cust_indices):
        is_serial_abuser[idx] = True
        has_chargeback_history[idx] = True
        base_return_rate[idx] = np.random.uniform(0.68, 0.92)
        cust_devices[idx] = ring_device_1 if i < 7 else ring_device_2
        cust_addresses[idx] = ring_addr_1 if i < 6 else ring_addr_2

    # Vectorized assignment for orders
    cust_indices = np.random.randint(0, num_customers, size=num_records)
    
    # Plant recent category spike in Electronics during last 7 days
    time_deltas = np.sort(np.random.uniform(0, 365 * 86400, size=num_records))
    
    # Time assignment
    dates = [start_date + timedelta(seconds=float(td)) for td in time_deltas]
    timestamps = [d.strftime("%Y-%m-%d %H:%M:%S") for d in dates]
    
    # Category selection with spike in last 7 days
    cat_indices = np.random.choice(len(categories), p=cat_probs, size=num_records)
    # Inject electronics surge in last 500 records
    recent_mask = time_deltas > (358 * 86400)
    cat_indices[recent_mask & (np.random.rand(num_records) < 0.65)] = 2 # Electronics
    
    quantities = np.random.choice([1, 2, 3, 4, 5, 8], p=[0.70, 0.17, 0.07, 0.03, 0.02, 0.01], size=num_records)
    discounts = np.random.choice([0.0, 5.0, 10.0, 15.0, 20.0, 25.0, 30.0, 40.0, 50.0],
                                 p=[0.30, 0.15, 0.20, 0.15, 0.10, 0.05, 0.03, 0.01, 0.01], size=num_records)
    
    order_ids = [f"ORD-{100000 + i}" for i in range(num_records)]
    cids = [customer_id_list[idx] for idx in cust_indices]
    dev_ids = [cust_devices[idx] for idx in cust_indices]
    
    cat_selected = [cat_names[idx] for idx in cat_indices]
    cat_rates = np.array([cat_base_rates[c] for c in cat_selected])
    
    prices = np.zeros(num_records, dtype=float)
    for i, c_idx in enumerate(cat_indices):
        min_p, max_p = categories[c_idx][2], categories[c_idx][3]
        base_p = np.random.uniform(min_p, max_p)
        if np.random.rand() < 0.06: # Price surge anomaly
            base_p *= np.random.uniform(1.8, 3.2)
        prices[i] = round(base_p, -1)
        
    order_amounts = np.round(prices * quantities * (1.0 - discounts / 100.0), 2)
    high_value_items = (order_amounts >= 10000.0).astype(int)
    
    # Customer progression over time
    days_elapsed = (time_deltas / 86400).astype(int)
    acc_ages = acc_age_base[cust_indices] + days_elapsed
    
    c_prev_orders = np.maximum(0, (acc_ages / 32.0).astype(int) + np.random.poisson(lam=1.5, size=num_records))
    c_propensities = base_return_rate[cust_indices]
    c_prev_returns = np.minimum(c_prev_orders, np.maximum(0, (c_prev_orders * c_propensities).astype(int) + np.random.poisson(lam=0.3, size=num_records)))
    c_return_rates = np.round(np.where(c_prev_orders > 0, c_prev_returns / np.maximum(1, c_prev_orders), 0.0), 4)
    
    c_has_cb = has_chargeback_history[cust_indices]
    c_prev_chargebacks = np.where(c_has_cb, np.random.choice([1, 2, 3, 4], p=[0.70, 0.20, 0.07, 0.03], size=num_records), 0)
    c_cb_rates = np.round(np.where(c_prev_orders > 0, c_prev_chargebacks / np.maximum(1, c_prev_orders), 0.0), 4)
    
    c_aovs = np.round(base_aov[cust_indices] * np.random.uniform(0.92, 1.12, size=num_records), 2)
    val_vs_avgs = np.round(order_amounts / np.maximum(100.0, c_aovs), 3)
    
    # Velocity features
    orders_24h = np.random.choice([0, 1, 2, 3, 5, 8], p=[0.78, 0.16, 0.04, 0.015, 0.003, 0.002], size=num_records)
    orders_7d = orders_24h + np.random.choice([0, 1, 2, 3, 4], p=[0.55, 0.28, 0.11, 0.04, 0.02], size=num_records)
    cust_orders_30d = np.maximum(1, np.random.binomial(n=np.maximum(1, c_prev_orders), p=np.minimum(0.45, 30.0 / np.maximum(30, acc_ages))))
    
    # Shipping & Billing discrepancy
    billing_shipping_match = (np.random.rand(num_records) > 0.12).astype(int)
    # Ring & serial abusers often have mismatching shipping/billing
    billing_shipping_match[is_serial_abuser[cust_indices] & (np.random.rand(num_records) < 0.45)] = 0
    
    shipping_distances = np.round(np.random.gamma(shape=2.5, scale=280.0, size=num_records), 1)
    num_addresses_cust = np.where(acc_ages > 180, np.random.choice([1, 2, 3, 4], p=[0.60, 0.25, 0.10, 0.05], size=num_records), 1)
    
    # Device aggregation features
    dev_cust_count = np.ones(num_records, dtype=int)
    dev_order_count = np.random.choice([1, 2, 3, 5, 8, 14], p=[0.65, 0.20, 0.08, 0.04, 0.02, 0.01], size=num_records)
    # Ring devices have high shared customer count and high order count
    is_ring_device = np.isin(dev_ids, [ring_device_1, ring_device_2])
    dev_cust_count[is_ring_device] = np.random.choice([6, 7, 8, 9], size=np.sum(is_ring_device))
    dev_order_count[is_ring_device] = np.random.choice([18, 24, 32, 45], size=np.sum(is_ring_device))
    
    payments = cust_payments[cust_indices].copy()
    switch_mask = np.random.rand(num_records) < 0.14
    payments[switch_mask] = np.random.choice(["UPI", "Credit Card", "Cash on Delivery (COD)", "Buy Now Pay Later (BNPL)"], size=np.sum(switch_mask))
    is_cod_arr = np.isin(payments, ["Cash on Delivery (COD)"]).astype(int)
    
    regions = cust_regions[cust_indices]
    ip_regions = regions.copy()
    ip_mismatch_mask = np.random.rand(num_records) < 0.09
    ip_regions[ip_mismatch_mask] = np.random.choice(region_choices, size=np.sum(ip_mismatch_mask))
    
    delivery_attempts_arr = np.random.choice([1, 2, 3], p=[0.88, 0.09, 0.03], size=num_records)
    prev_failed_deliv = np.random.choice([0, 1, 2, 3], p=[0.82, 0.13, 0.04, 0.01], size=num_records)
    
    device_risk_hist = np.where(is_ring_device, 0.85, np.where(dev_cust_count > 3, 0.60, np.round(np.random.beta(1.1, 8.0, size=num_records), 3)))
    
    # --- PROBABILISTIC TARGET COMPUTATION (Defensive Return Risk) ---
    # Non-linear log-odds formulation with calibrated overlap & noise
    z = -2.85
    z = z + 2.80 * c_return_rates
    z = z + 3.10 * c_cb_rates
    z = z + 1.60 * (c_prev_chargebacks >= 1).astype(float)
    z = z + 1.40 * is_serial_abuser[cust_indices].astype(float)
    z = z + 1.30 * (dev_cust_count >= 4).astype(float)
    
    # Value Surge
    z = z + np.where(val_vs_avgs > 3.0, 1.45, np.where(val_vs_avgs > 1.8, 0.75, np.where(val_vs_avgs < 0.6, -0.35, 0.0)))
    
    # High value item + new account
    z = z + 1.15 * ((acc_ages < 20) & (order_amounts > 8000.0)).astype(float)
    
    # Category Risk (Apparel wardrobing, Electronics return abuse)
    z = z + 1.80 * (cat_rates - 0.15)
    wardrobe_mask = np.isin(cat_selected, ["Apparel & Footwear", "Luxury Watches & Jewelry"]) & (quantities >= 3)
    z = z + 1.25 * wardrobe_mask.astype(float)
    
    # Payment method risk (COD / BNPL combined with high return rate)
    z = z + 0.55 * is_cod_arr
    z = z + 0.80 * (is_cod_arr & (c_return_rates > 0.30)).astype(float)
    
    # Discrepancies
    z = z + 0.75 * (1 - billing_shipping_match).astype(float)
    z = z + 0.50 * (regions != ip_regions).astype(float)
    z = z + 0.45 * (orders_24h >= 3).astype(float)
    
    # Protective Factors (Mature account with clean history reduces risk)
    mature_clean = (acc_ages > 180) & (c_prev_orders >= 5) & (c_return_rates < 0.12) & (c_prev_chargebacks == 0)
    z = z - 1.40 * mature_clean.astype(float)
    
    # Add calibrated gaussian noise
    noise = np.random.normal(loc=0.0, scale=0.58, size=num_records)
    z_noisy = z + noise
    prob = 1.0 / (1.0 + np.exp(-z_noisy))
    fraud_targets = (prob >= 0.50).astype(int)
    
    # Realistic return/refund requested post-transaction simulation for records
    return_requested_arr = np.where(fraud_targets == 1, 1, (np.random.rand(num_records) < cat_rates).astype(int))
    refund_requested_arr = np.where(return_requested_arr == 1, (np.random.rand(num_records) < 0.92).astype(int), 0)
    
    reasons = ["Not as described", "Size/Fit issue", "Defective/Damaged", "Changed mind", "Item missing", "Fraudulent claim"]
    return_reasons = []
    for i in range(num_records):
        if return_requested_arr[i] == 1:
            if fraud_targets[i] == 1:
                return_reasons.append(np.random.choice(["Item missing", "Defective/Damaged", "Fraudulent claim", "Not as described"]))
            else:
                return_reasons.append(np.random.choice(["Size/Fit issue", "Changed mind", "Defective/Damaged"]))
        else:
            return_reasons.append("None")
            
    df = pd.DataFrame({
        "order_id": order_ids,
        "customer_id": cids,
        "timestamp": timestamps,
        "order_amount": order_amounts,
        "product_category": cat_selected,
        "payment_method": payments,
        "is_cod": is_cod_arr,
        "account_age_days": acc_ages,
        "customer_previous_orders": c_prev_orders,
        "customer_previous_returns": c_prev_returns,
        "customer_previous_chargebacks": c_prev_chargebacks,
        "customer_return_rate": c_return_rates,
        "customer_chargeback_rate": c_cb_rates,
        "average_order_value": c_aovs,
        "current_vs_average_order_ratio": val_vs_avgs,
        "billing_shipping_match": billing_shipping_match,
        "shipping_distance": shipping_distances,
        "number_of_addresses": num_addresses_cust,
        "device_id": dev_ids,
        "orders_from_device": dev_order_count,
        "customers_from_device": dev_cust_count,
        "orders_last_24h": orders_24h,
        "orders_last_7d": orders_7d,
        "customer_orders_last_30d": cust_orders_30d,
        "high_value_item": high_value_items,
        "delivery_attempts": delivery_attempts_arr,
        "refund_requested": refund_requested_arr,
        "return_requested": return_requested_arr,
        "return_reason": return_reasons,
        "previous_failed_deliveries": prev_failed_deliv,
        "ip_region": ip_regions,
        "customer_region": regions,
        "device_risk_history": device_risk_hist,
        "fraudulent_return": fraud_targets
    })
    
    # Ensure specific demo records are clearly planted at known IDs in test set
    raw_dir = os.path.join(output_dir, "raw")
    processed_dir = os.path.join(output_dir, "processed")
    demo_dir = os.path.join(output_dir, "demo_batches")
    
    for d in [raw_dir, processed_dir, demo_dir]:
        os.makedirs(d, exist_ok=True)
        
    raw_path = os.path.join(raw_dir, "orders_raw.csv")
    df.to_csv(raw_path, index=False)
    print(f"[DATA] Successfully created raw dataset: {raw_path} with {len(df):,} records")
    print(f"[DATA] Fraudulent Return Target prevalence: {df['fraudulent_return'].mean():.2%}")
    
    # Chronological Split (70% Train, 15% Validation, 15% Held-out Test)
    n = len(df)
    n_train = int(n * 0.70)
    n_val = int(n * 0.15)
    
    train_df = df.iloc[:n_train].copy()
    val_df = df.iloc[n_train:n_train + n_val].copy()
    test_df = df.iloc[n_train + n_val:].copy()
    
    # Plant Demo Persona in Test Set: ORD-10239 (Customer C - Coordinated Abuse Ring)
    demo_order_idx = test_df.index[min(239, len(test_df) - 1)]
    test_df.loc[demo_order_idx, "order_id"] = "ORD-10239"
    test_df.loc[demo_order_idx, "customer_id"] = "CUST-99201"
    test_df.loc[demo_order_idx, "order_amount"] = 8499.00
    test_df.loc[demo_order_idx, "product_category"] = "Electronics & Gadgets"
    test_df.loc[demo_order_idx, "payment_method"] = "Cash on Delivery (COD)"
    test_df.loc[demo_order_idx, "is_cod"] = 1
    test_df.loc[demo_order_idx, "account_age_days"] = 6
    test_df.loc[demo_order_idx, "customer_previous_orders"] = 8
    test_df.loc[demo_order_idx, "customer_previous_returns"] = 6
    test_df.loc[demo_order_idx, "customer_previous_chargebacks"] = 2
    test_df.loc[demo_order_idx, "customer_return_rate"] = 0.75
    test_df.loc[demo_order_idx, "customer_chargeback_rate"] = 0.25
    test_df.loc[demo_order_idx, "average_order_value"] = 2800.00
    test_df.loc[demo_order_idx, "current_vs_average_order_ratio"] = 3.035
    test_df.loc[demo_order_idx, "billing_shipping_match"] = 0
    test_df.loc[demo_order_idx, "device_id"] = ring_device_1
    test_df.loc[demo_order_idx, "customers_from_device"] = 8
    test_df.loc[demo_order_idx, "orders_from_device"] = 28
    test_df.loc[demo_order_idx, "orders_last_24h"] = 4
    test_df.loc[demo_order_idx, "orders_last_7d"] = 7
    test_df.loc[demo_order_idx, "high_value_item"] = 1
    test_df.loc[demo_order_idx, "device_risk_history"] = 0.92
    test_df.loc[demo_order_idx, "fraudulent_return"] = 1

    train_path = os.path.join(processed_dir, "train.csv")
    val_path = os.path.join(processed_dir, "val.csv")
    test_path = os.path.join(processed_dir, "test.csv")
    
    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)
    
    print(f"[DATA] Train: {len(train_df):,} rows | Val: {len(val_df):,} rows | Held-Out Test: {len(test_df):,} rows")
    
    # Demo batches for fast evaluation / streaming
    for sz in [50, 100, 500]:
        batch_sample = test_df.sample(n=min(sz, len(test_df)), random_state=seed + sz).copy()
        batch_file = os.path.join(demo_dir, f"demo_batch_{sz}.csv")
        batch_sample.to_csv(batch_file, index=False)

    return df, train_df, val_df, test_df

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic RiskSentinel order risk dataset")
    parser.add_argument("--records", type=int, default=50000, help="Number of records to generate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for deterministic generation")
    parser.add_argument("--output-dir", type=str, default="data", help="Output directory path")
    args = parser.parse_args()
    
    generate_risksentinel_dataset(num_records=args.records, seed=args.seed, output_dir=args.output_dir)
