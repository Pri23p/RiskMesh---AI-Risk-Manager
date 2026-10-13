"""
RiskSentinel - SQLAlchemy Database Schema
Defines relational models for Orders, Customers, Devices, Addresses, Predictions,
Merchant Decisions, Abuse Ring Clusters, Anomaly Alerts, and Audit Trails.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(64), unique=True, index=True, nullable=False)
    customer_id = Column(String(64), index=True, nullable=False)
    timestamp = Column(String(64), nullable=False)
    order_amount = Column(Float, nullable=False)
    product_category = Column(String(128), nullable=False)
    payment_method = Column(String(64), default="UPI")
    is_cod = Column(Integer, default=0)
    
    # Customer Behavioral History
    account_age_days = Column(Integer, default=0)
    customer_previous_orders = Column(Integer, default=1)
    customer_previous_returns = Column(Integer, default=0)
    customer_previous_chargebacks = Column(Integer, default=0)
    customer_return_rate = Column(Float, default=0.0)
    customer_chargeback_rate = Column(Float, default=0.0)
    average_order_value = Column(Float, default=0.0)
    current_vs_average_order_ratio = Column(Float, default=1.0)
    
    # Shipping & Geolocation
    billing_shipping_match = Column(Integer, default=1)
    shipping_distance = Column(Float, default=100.0)
    number_of_addresses = Column(Integer, default=1)
    
    # Device & Velocity
    device_id = Column(String(64), index=True, default="DEV-DEFAULT")
    orders_from_device = Column(Integer, default=1)
    customers_from_device = Column(Integer, default=1)
    orders_last_24h = Column(Integer, default=0)
    orders_last_7d = Column(Integer, default=0)
    customer_orders_last_30d = Column(Integer, default=1)
    high_value_item = Column(Integer, default=0)
    delivery_attempts = Column(Integer, default=1)
    
    # Post-outcome / Simulation Fields
    refund_requested = Column(Integer, default=0)
    return_requested = Column(Integer, default=0)
    return_reason = Column(String(128), default="None")
    previous_failed_deliveries = Column(Integer, default=0)
    ip_region = Column(String(64), default="North")
    customer_region = Column(String(64), default="North")
    device_risk_history = Column(Float, default=0.1)
    
    # Ground Truth Label (for evaluation validation)
    fraudulent_return = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(64), unique=True, index=True, nullable=False)
    risk_score = Column(Integer, nullable=False) # 0-100
    risk_score_pct = Column(Float, nullable=False)
    fraud_probability = Column(Float, nullable=False)
    risk_level = Column(String(32), nullable=False) # LOW, MEDIUM, HIGH
    recommended_action = Column(String(128), nullable=False)
    estimated_exposure = Column(Float, nullable=False)
    requires_human_review = Column(Boolean, default=False)
    review_reason = Column(String(256), nullable=True)
    risk_factors = Column(JSON, nullable=True)
    top_contributing_factors = Column(JSON, nullable=True)
    top_protective_factors = Column(JSON, nullable=True)
    all_contributions = Column(JSON, nullable=True)
    decision_narrative = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MerchantDecision(Base):
    __tablename__ = "merchant_decisions"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(64), index=True, nullable=False)
    customer_id = Column(String(64), nullable=False)
    order_amount = Column(Float, nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String(32), nullable=False)
    decision = Column(String(64), nullable=False) # "Approve", "Request Verification", "Manual Review", "Reject Refund"
    status = Column(String(32), default="Processed")
    analyst_name = Column(String(64), default="Merchant Ops")
    notes = Column(Text, nullable=True)
    loss_saved_estimate = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(256), nullable=False)
    severity = Column(String(32), nullable=False) # HIGH, MEDIUM, LOW
    category = Column(String(128), nullable=False)
    reason = Column(Text, nullable=False)
    potential_exposure = Column(Float, nullable=False)
    affected_orders_count = Column(Integer, default=1)
    status = Column(String(32), default="Active") # Active, Investigating, Resolved
    timestamp = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(String(64), unique=True, index=True, nullable=False)
    cluster_name = Column(String(128), nullable=False)
    risk_level = Column(String(32), default="HIGH")
    customer_count = Column(Integer, default=1)
    shared_devices_count = Column(Integer, default=1)
    shared_addresses_count = Column(Integer, default=1)
    historical_return_rate = Column(Float, default=0.0)
    potential_exposure = Column(Float, default=0.0)
    customer_ids = Column(JSON, nullable=True)
    device_ids = Column(JSON, nullable=True)
    address_ids = Column(JSON, nullable=True)
    nodes_data = Column(JSON, nullable=True)
    links_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64), nullable=False) # PREDICTION, MERCHANT_DECISION, ALERT_TRIGGER, THRESHOLD_OVERRIDE
    entity_id = Column(String(64), index=True, nullable=False)
    actor = Column(String(64), default="System")
    action_summary = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
