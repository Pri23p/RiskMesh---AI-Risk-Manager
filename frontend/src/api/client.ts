/**
 * RiskSentinel - Frontend API Client
 */

import {
  AnalyticsOverview,
  ModelMetricsSummary,
  ThresholdPoint,
  ClusterItem,
  ClusterDetail,
  AlertItem,
  OrderDetail,
  OrderItem,
  FeatureContribution
} from '../types';

const API_BASE = '/api';

export const apiClient = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getAnalytics(): Promise<AnalyticsOverview> {
    const res = await fetch(`${API_BASE}/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics overview');
    return res.json();
  },

  async getOrders(params: {
    page?: number;
    page_size?: number;
    search?: string;
    risk_level?: string;
    category?: string;
    payment_method?: string;
    min_amount?: number;
    max_amount?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<{ page: number; page_size: number; total_records: number; total_pages: number; orders: OrderItem[] }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.page_size) query.set('page_size', params.page_size.toString());
    if (params.search) query.set('search', params.search);
    if (params.risk_level && params.risk_level !== 'ALL') query.set('risk_level', params.risk_level);
    if (params.category && params.category !== 'ALL') query.set('category', params.category);
    if (params.payment_method && params.payment_method !== 'ALL') query.set('payment_method', params.payment_method);
    if (params.min_amount) query.set('min_amount', params.min_amount.toString());
    if (params.max_amount) query.set('max_amount', params.max_amount.toString());
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.sort_order) query.set('sort_order', params.sort_order);

    const res = await fetch(`${API_BASE}/orders?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  async getHighRiskOrders(): Promise<{ high_risk_orders: OrderItem[]; count: number }> {
    const res = await fetch(`${API_BASE}/risk/high`);
    if (!res.ok) throw new Error('Failed to fetch high-risk orders');
    return res.json();
  },

  async getOrderDetail(orderId: string): Promise<OrderDetail> {
    const res = await fetch(`${API_BASE}/orders/${orderId}`);
    if (!res.ok) throw new Error(`Failed to fetch order ${orderId}`);
    return res.json();
  },

  async recordDecision(orderId: string, decision: string, analystName?: string, notes?: string) {
    const res = await fetch(`${API_BASE}/orders/${orderId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, analyst_name: analystName || 'Merchant Ops', notes }),
    });
    if (!res.ok) throw new Error(`Failed to record decision for ${orderId}`);
    return res.json();
  },

  async getModelMetrics(): Promise<ModelMetricsSummary> {
    const res = await fetch(`${API_BASE}/model/metrics`);
    if (!res.ok) throw new Error('Failed to fetch model metrics');
    return res.json();
  },

  async getModelThresholds(): Promise<{ config: any; curves: { operating_threshold: number; points: ThresholdPoint[] } }> {
    const res = await fetch(`${API_BASE}/model/thresholds`);
    if (!res.ok) throw new Error('Failed to fetch model threshold curves');
    return res.json();
  },

  async getFeatureImportances(): Promise<Array<{ feature: string; importance: number }>> {
    const res = await fetch(`${API_BASE}/model/feature-importance`);
    if (!res.ok) throw new Error('Failed to fetch feature importances');
    return res.json();
  },

  async getModelHealth(): Promise<any> {
    const res = await fetch(`${API_BASE}/model/health`);
    if (!res.ok) throw new Error('Failed to fetch model health');
    return res.json();
  },

  async getClusters(): Promise<{ clusters: ClusterItem[]; total_clusters: number }> {
    const res = await fetch(`${API_BASE}/clusters`);
    if (!res.ok) throw new Error('Failed to fetch abuse clusters');
    return res.json();
  },

  async getClusterDetail(clusterId: string): Promise<ClusterDetail> {
    const res = await fetch(`${API_BASE}/clusters/${clusterId}`);
    if (!res.ok) throw new Error(`Failed to fetch cluster ${clusterId}`);
    return res.json();
  },

  async getAlerts(): Promise<{ alerts: AlertItem[]; active_alerts_count: number }> {
    const res = await fetch(`${API_BASE}/alerts`);
    if (!res.ok) throw new Error('Failed to fetch anomaly alerts');
    return res.json();
  },

  async getAuditTrail(): Promise<any> {
    const res = await fetch(`${API_BASE}/audit`);
    if (!res.ok) throw new Error('Failed to fetch audit trail');
    return res.json();
  },

  async predictOrder(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Prediction request failed');
    return res.json();
  },

  async sendChatMessage(message: string) {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error('Failed to communicate with AI Risk Analyst');
    return res.json();
  },
};
