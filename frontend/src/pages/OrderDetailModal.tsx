import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  User,
  Smartphone,
  MapPin,
  Clock,
  CreditCard,
  Package,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileText,
  History,
  Send,
  AlertOctagon
} from 'lucide-react';
import { apiClient } from '../api/client';
import { OrderDetail } from '../types';

interface OrderDetailModalProps {
  orderId: string;
  onClose: () => void;
  onDecisionSuccess?: () => void;
  onNavigateToCluster?: (clusterId: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  orderId,
  onClose,
  onDecisionSuccess,
  onNavigateToCluster
}) => {
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getOrderDetail(orderId);
      setDetail(data);
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchDetail();
    }
  }, [orderId]);

  const handleDecision = async (decision: string) => {
    try {
      setActionLoading(true);
      await apiClient.recordDecision(orderId, decision, 'Merchant Ops Specialist', decisionNotes);
      setSuccessMessage(`Decision '${decision}' executed and logged in immutable audit trail.`);
      if (onDecisionSuccess) onDecisionSuccess();
      await fetchDetail();
      setDecisionNotes('');
    } catch (err) {
      console.error('Decision execution failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white font-mono">{orderId}</h2>
                {detail && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    detail.prediction.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                    detail.prediction.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}>
                    {detail.prediction.risk_score}/100 {detail.prediction.risk_level} RISK
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Order Investigation Dossier & Explainability Report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading || !detail ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-400">Synthesizing behavioral signals & SHAP explanations...</p>
            </div>
          ) : (
            <>
              {/* Success Notification */}
              {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{successMessage}</span>
                  </div>
                  <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Top Summary Banner */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Risk Score & Exposure */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-xs text-slate-400">Risk Score & Exposure</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <h3 className="text-2xl font-bold text-white font-mono">{detail.prediction.risk_score}/100</h3>
                    <span className="text-sm font-bold text-red-400 font-mono">₹{detail.order.order_amount.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Fraud Prob: <span className="text-white font-mono font-medium">{(detail.prediction.fraud_probability * 100).toFixed(1)}%</span>
                  </p>
                </div>

                {/* Customer History */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-xs text-slate-400">Customer Return Profile</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <h3 className="text-lg font-bold text-white">{detail.order.customer_id}</h3>
                    <span className="text-xs text-amber-400 font-semibold font-mono">
                      {(detail.order.customer_return_rate * 100).toFixed(0)}% Return Rate
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Returned <span className="text-white font-medium">{detail.order.customer_previous_returns}</span> of {detail.order.customer_previous_orders} orders ({detail.order.customer_previous_chargebacks} chargebacks)
                  </p>
                </div>

                {/* Value Ratio */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-xs text-slate-400">Order vs Average Value</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <h3 className="text-lg font-bold text-white font-mono">{detail.order.current_vs_average_order_ratio.toFixed(2)}x</h3>
                    <span className="text-xs text-slate-400 font-mono">Avg: ₹{detail.order.average_order_value.toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {detail.order.current_vs_average_order_ratio > 2.0 ? (
                      <span className="text-red-400 font-medium">Significant value surge detected</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">Within normal spending profile</span>
                    )}
                  </p>
                </div>

                {/* Recommended Action */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-xs text-slate-400">AI Recommendation</span>
                  <h4 className="text-xs font-bold text-amber-300 mt-1">{detail.prediction.recommended_action}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Requires Review: <span className="text-white">{detail.prediction.requires_human_review ? 'Yes' : 'No'}</span>
                  </p>
                </div>
              </div>

              {/* Related Abuse Ring Cluster Warning */}
              {detail.related_cluster && (
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-300">
                        Associated with Coordinated Abuse Cluster: {detail.related_cluster.cluster_name}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        This customer account shares device <strong>{detail.order.device_id}</strong> with {detail.related_cluster.customer_count} other accounts exhibiting an aggregate {detail.related_cluster.historical_return_rate * 100}% return rate.
                      </p>
                    </div>
                  </div>
                  {onNavigateToCluster && (
                    <button
                      onClick={() => onNavigateToCluster(detail.related_cluster!.cluster_id)}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs whitespace-nowrap shadow-md"
                    >
                      View Abuse Graph
                    </button>
                  )}
                </div>
              )}

              {/* SHAP Explainability & Risk Drivers */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Model Explainability (SHAP Directional Attribution)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Why the model assigned this risk score. Factors that increased vs decreased merchant risk.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">Faithful Model Explainability</span>
                </div>

                {/* Positive & Negative Factors Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Risk-Increasing Factors */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                      <span>Risk-Increasing Contributors (+)</span>
                    </h4>
                    <div className="space-y-2">
                      {detail.prediction.top_contributing_factors.map((factor, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-red-950/20 border border-red-900/30 text-xs"
                        >
                          <span className="text-slate-200 font-medium">{factor.readable_name}</span>
                          <span className="font-mono font-bold text-red-400">+{Math.abs(factor.impact).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Protective Factors */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Protective Factors (-)</span>
                    </h4>
                    <div className="space-y-2">
                      {detail.prediction.top_protective_factors.length > 0 ? (
                        detail.prediction.top_protective_factors.map((factor, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-xs"
                          >
                            <span className="text-slate-200 font-medium">{factor.readable_name}</span>
                            <span className="font-mono font-bold text-emerald-400">-{Math.abs(factor.impact).toFixed(2)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-500 text-center">
                          No significant protective history detected for this transaction.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Natural Language Narrative Box */}
                <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs text-slate-300">
                  <p className="leading-relaxed">
                    <strong className="text-indigo-400">AI Risk Assessment Narrative: </strong>
                    {detail.prediction.decision_narrative}
                  </p>
                </div>
              </div>

              {/* Transaction & Device Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500">Payment Method</span>
                  <p className="text-slate-200 font-semibold mt-0.5">{detail.order.payment_method}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500">Category</span>
                  <p className="text-slate-200 font-semibold mt-0.5">{detail.order.product_category}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500">Device ID</span>
                  <p className="text-slate-200 font-mono text-[11px] truncate mt-0.5">{detail.order.device_id}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500">Billing / Shipping Match</span>
                  <p className={`font-semibold mt-0.5 ${detail.order.billing_shipping_match === 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {detail.order.billing_shipping_match === 1 ? 'Match (Consistent)' : 'Mismatch Detected'}
                  </p>
                </div>
              </div>

              {/* Merchant Decision Action Bar */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-700 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Merchant Operational Decision</h4>
                  <span className="text-xs text-slate-400">Select an action to update risk queue & audit log</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    placeholder="Optional analyst notes (e.g. Identity verified via customer support)..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDecision('Approve')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition-colors flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDecision('Request Verification')}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition-colors flex items-center space-x-1"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Request Verification</span>
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDecision('Manual Review')}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow transition-colors flex items-center space-x-1"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Manual Review</span>
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDecision('Reject Refund')}
                      className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs shadow transition-colors flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject / Hold</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Audit Trail Log */}
              {detail.audit_trail && detail.audit_trail.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                  <h4 className="font-semibold text-slate-300 flex items-center space-x-1.5">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit Trail Log</span>
                  </h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {detail.audit_trail.map((audit) => (
                      <div key={audit.id} className="p-2 rounded bg-slate-900 border border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">{audit.action_summary}</span>
                        <span className="text-slate-500 font-mono shrink-0 ml-2">{audit.created_at.split('T')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
