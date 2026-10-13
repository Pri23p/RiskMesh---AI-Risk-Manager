"""
RiskGuard AI - Pydantic Request & Response Schemas
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- Order Schemas ---
class OrderItem(BaseModel):
    order_id: str
    customer_id: str
    order_date: str
    product_category: str
    product_price: float
    quantity: int
    discount_percentage: float = 0.0
    total_order_value: Optional[float] = None
    customer_account_age_days: int = 30
    customer_total_orders: int = 1
    customer_total_returns: int = 0
    customer_return_rate: float = 0.0
    customer_avg_order_value: float = 2000.0
    returns_last_30_days: int = 0
    returns_last_90_days: int = 0
    orders_last_30_days: int = 1
    orders_last_90_days: int = 1
    previous_refunds: int = 0
    average_days_to_return: float = 0.0
    current_order_value_vs_customer_average: float = 1.0
    product_category_return_rate: float = 0.15
    historical_high_value_orders: int = 0
    days_since_previous_order: int = 30
    payment_method: str = "UPI"
    shipping_region: str = "North"
    is_guest_checkout: int = 0
    device_type: str = "Mobile App"
    order_hour: int = 14
    delivery_speed: str = "Standard"
    target_high_risk_return: Optional[int] = None

class FeatureContribution(BaseModel):
    feature: str
    readable_name: str
    impact: float
    direction: str
    raw_value: Optional[Any] = None

class SinglePredictionResponse(BaseModel):
    order_id: str
    risk_score: float
    risk_score_pct: float
    risk_level: str
    recommended_action: str
    requires_human_review: bool
    review_reason: Optional[str] = None
    exception_flags: List[str] = []
    top_contributing_factors: List[FeatureContribution] = []
    top_protective_factors: List[FeatureContribution] = []
    all_contributions: List[FeatureContribution] = []
    decision_narrative: str

class BatchPredictionResponse(BaseModel):
    batch_id: str
    records_processed: int
    low_count: int
    medium_count: int
    high_count: int
    review_required_count: int
    processing_time_seconds: float
    throughput_records_per_sec: float
    sample_predictions: List[SinglePredictionResponse] = []

# --- Dashboard & Metrics Schemas ---
class RiskOverview(BaseModel):
    total_orders_analyzed: int
    high_risk_orders: int
    medium_risk_orders: int
    low_risk_orders: int
    review_queue_count: int
    avg_risk_score_pct: float

class ModelHealthMetrics(BaseModel):
    model_name: str
    operating_threshold: float
    precision: float
    recall: float
    f1_score: float
    pr_auc: float
    roc_auc: float
    false_positive_rate: float
    false_negative_rate: float

class BusinessImpactMetrics(BaseModel):
    synthetic_assumptions_label: str
    currency: str
    cost_per_fp: float
    cost_per_fn: float
    manual_review_cost: float
    false_positives: int
    false_negatives: int
    true_positives: int
    true_negatives: int
    fp_cost: float
    fn_cost: float
    total_error_cost: float
    estimated_net_savings: float
    savings_percentage: float

class ThroughputStats(BaseModel):
    records_processed: int
    last_batch_time_seconds: float
    throughput_records_per_sec: float

class DashboardResponse(BaseModel):
    risk_overview: RiskOverview
    model_health: ModelHealthMetrics
    business_impact: BusinessImpactMetrics
    throughput: ThroughputStats
    risk_distribution: List[Dict[str, Any]]
    category_risk_distribution: List[Dict[str, Any]]
    risk_score_histogram: List[Dict[str, Any]]

# --- Exception Review Schemas ---
class ExceptionUpdateRequest(BaseModel):
    review_status: str # "Approved", "Escalated", "Reviewed"
    analyst_notes: Optional[str] = None

class ExceptionResponse(BaseModel):
    id: int
    order_id: str
    customer_id: str
    total_order_value: float
    risk_score: float
    risk_level: str
    review_status: str
    escalation_reason: str
    assigned_analyst: str
    analyst_notes: Optional[str] = None
    created_at: str
    updated_at: str

# --- AI Analyst Chat Schemas ---
class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class StructuredQueryResult(BaseModel):
    query_type: str
    data: Any
    title: str

class ChatResponse(BaseModel):
    reply: str
    query_result: Optional[StructuredQueryResult] = None
    sources: List[str] = []
