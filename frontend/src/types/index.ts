export interface FeatureContribution {
  feature: string;
  readable_name: string;
  impact: number;
  direction: 'RISK_INCREASING' | 'RISK_REDUCING';
  raw_value?: any;
}

export interface OrderItem {
  order_id: string;
  customer_id: string;
  timestamp: string;
  order_amount: number;
  product_category: string;
  payment_method: string;
  is_cod?: number;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  fraud_probability: number;
  primary_risk_factor: string;
  recommended_action: string;
  estimated_exposure: number;
  status: string;
  device_id?: string;
  billing_shipping_match?: number;
}

export interface OrderDetail {
  order: {
    order_id: string;
    customer_id: string;
    timestamp: string;
    order_amount: number;
    product_category: string;
    payment_method: string;
    is_cod: number;
    account_age_days: number;
    customer_previous_orders: number;
    customer_previous_returns: number;
    customer_previous_chargebacks: number;
    customer_return_rate: number;
    customer_chargeback_rate: number;
    average_order_value: number;
    current_vs_average_order_ratio: number;
    billing_shipping_match: number;
    shipping_distance: number;
    number_of_addresses: number;
    device_id: string;
    orders_from_device: number;
    customers_from_device: number;
    orders_last_24h: number;
    orders_last_7d: number;
    customer_orders_last_30d: number;
    high_value_item: number;
    delivery_attempts: number;
    previous_failed_deliveries: number;
    ip_region: string;
    customer_region: string;
    device_risk_history: number;
  };
  prediction: {
    risk_score: number;
    risk_score_pct: number;
    fraud_probability: number;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
    recommended_action: string;
    estimated_exposure: number;
    requires_human_review: boolean;
    review_reason?: string;
    risk_factors: string[];
    top_contributing_factors: FeatureContribution[];
    top_protective_factors: FeatureContribution[];
    all_contributions: FeatureContribution[];
    decision_narrative: string;
  };
  related_cluster?: {
    cluster_id: string;
    cluster_name: string;
    risk_level: string;
    customer_count: number;
    shared_devices_count: number;
    historical_return_rate: number;
    potential_exposure: number;
  };
  decisions: Array<{
    id: number;
    decision: string;
    status: string;
    analyst_name: string;
    notes?: string;
    loss_saved_estimate: number;
    created_at: string;
  }>;
  audit_trail: Array<{
    id: number;
    event_type: string;
    actor: string;
    action_summary: string;
    details?: any;
    created_at: string;
  }>;
}

export interface AnalyticsOverview {
  total_orders: number;
  orders_analyzed: number;
  high_risk_orders: number;
  medium_risk_orders: number;
  low_risk_orders: number;
  estimated_loss_exposure: number;
  total_exposure: number;
  estimated_loss_prevented: number;
  merchant_decision_savings: number;
  net_savings: number;
  precision: number;
  recall: number;
  pr_auc: number;
  risk_distribution: Array<{ name: string; count: number; value: number; color: string; percentage: number }>;
  category_breakdown: Array<{
    category: string;
    total_orders: number;
    avg_risk_score: number;
    total_volume_inr: number;
  }>;
  temporal_trends: Array<{
    date: string;
    total_orders: number;
    high_risk_orders: number;
    loss_prevented_inr: number;
    loss_exposure_inr: number;
  }>;
}

export interface ClusterItem {
  cluster_id: string;
  cluster_name: string;
  risk_level: string;
  customer_count: number;
  shared_devices_count: number;
  shared_addresses_count: number;
  historical_return_rate: number;
  potential_exposure: number;
  customer_ids?: string[];
  device_ids?: string[];
  address_ids?: string[];
  nodes_count: number;
  links_count: number;
  created_at: string;
}

export interface ClusterDetail extends ClusterItem {
  nodes: Array<{ id: string; label: string; type: string; risk: string; return_rate?: number }>;
  links: Array<{ source: string; target: string; relationship: string }>;
}

export interface AlertItem {
  alert_id: string;
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  reason: string;
  potential_exposure: number;
  affected_orders_count: number;
  status: string;
  timestamp: string;
  created_at: string;
}

export interface ThresholdPoint {
  threshold: number;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  false_negative_rate: number;
  fraud_captured_pct: number;
  manual_reviews_count: number;
  fp_cost: number;
  fn_cost: number;
  expected_cost: number;
  net_savings: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
}

export interface ModelMetricsSummary {
  model_name: string;
  evaluation_dataset: string;
  operating_threshold: number;
  total_test_records: number;
  actual_high_risk_positives: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  pr_auc: number;
  roc_auc: number;
  false_positive_rate: number;
  false_negative_rate: number;
  confusion_matrix: {
    layout: any;
    matrix: number[][];
    true_negatives: number;
    false_positives: number;
    false_negatives: number;
    true_positives: number;
    total_evaluated: number;
  };
  financial_impact: {
    currency: string;
    loss_without_model: number;
    cost_with_model: number;
    fraud_losses_prevented: number;
    fp_cost: number;
    fn_cost: number;
    manual_review_cost_total: number;
    net_savings: number;
    roi_percentage: number;
  };
  risk_bands: {
    low_risk_max: number;
    medium_risk_min: number;
    medium_risk_max: number;
    high_risk_min: number;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggested_actions?: string[];
}
