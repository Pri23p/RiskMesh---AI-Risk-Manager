import React, { useEffect, useState } from 'react';
import {
  Sliders,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
  Info,
  CheckCircle,
  XCircle,
  SlidersHorizontal
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { apiClient } from '../api/client';
import { ModelMetricsSummary, ThresholdPoint } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetricsSummary | null>(null);
  const [thresholdData, setThresholdData] = useState<{ config: any; curves: { operating_threshold: number; points: ThresholdPoint[] } } | null>(null);
  const [healthData, setHealthData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic slider state
  const [selectedThreshold, setSelectedThreshold] = useState<number>(0.45);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [metricsRes, threshRes, healthRes] = await Promise.all([
        apiClient.getModelMetrics(),
        apiClient.getModelThresholds(),
        apiClient.getModelHealth()
      ]);
      setMetrics(metricsRes);
      setThresholdData(threshRes);
      setHealthData(healthRes);
      if (threshRes.config?.optimal_threshold) {
        setSelectedThreshold(threshRes.config.optimal_threshold);
      }
    } catch (err) {
      console.error('Failed to load model analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !metrics || !thresholdData) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading model evaluation & business cost curves...</p>
        </div>
      </div>
    );
  }

  // Find currently selected threshold metrics from curve points
  const currentPoint = thresholdData.curves.points.reduce((prev, curr) =>
    Math.abs(curr.threshold - selectedThreshold) < Math.abs(prev.threshold - selectedThreshold) ? curr : prev
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              Held-Out Test Set (7,500 Unseen Orders)
            </span>
            <span className="text-xs text-slate-400">No Data Leakage Guarantee</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Analytics & Threshold Loss Optimizer</h1>
          <p className="text-sm text-slate-400">
            Evaluating the financial trade-off between catching fraud and merchant customer friction
          </p>
        </div>
      </div>

      {/* Differentiator Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
              <span>Interactive Business Loss Decision Simulator</span>
            </h3>
            <p className="text-xs text-slate-300">
              Adjusting the classification threshold dynamically recalibrates fraud captured vs operational review costs.
              Drag the slider to observe how expected merchant loss changes in real time.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-mono">Recommended Threshold</span>
            <div className="text-2xl font-bold text-indigo-400 font-mono">
              {thresholdData.config.optimal_threshold.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Threshold Slider Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-400">Aggressive Capture (Threshold 0.10)</span>
            <span className="text-indigo-300 font-bold font-mono text-sm bg-indigo-900/60 px-3 py-1 rounded-lg border border-indigo-500/40">
              Active Threshold: {selectedThreshold.toFixed(2)}
            </span>
            <span className="text-slate-400">Low Friction (Threshold 0.90)</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.90"
            step="0.05"
            value={selectedThreshold}
            onChange={(e) => setSelectedThreshold(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Dynamic Trade-off Stats at Selected Threshold */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">Fraud Captured</span>
            <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              {currentPoint.fraud_captured_pct}%
            </p>
            <span className="text-[10px] text-slate-500">Recall Rate</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">False Positive Rate</span>
            <p className="text-lg font-bold text-amber-400 font-mono mt-0.5">
              {(currentPoint.false_positive_rate * 100).toFixed(1)}%
            </p>
            <span className="text-[10px] text-slate-500">{currentPoint.false_positives} orders friction</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">Manual Reviews</span>
            <p className="text-lg font-bold text-indigo-400 font-mono mt-0.5">
              {currentPoint.manual_reviews_count.toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-500">Operational triage</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 text-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">Net Savings</span>
            <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              ₹{currentPoint.net_savings.toLocaleString()}
            </p>
            <span className="text-[10px] text-emerald-400/80 font-semibold">At threshold {currentPoint.threshold}</span>
          </div>
        </div>
      </div>

      {/* Cost & Savings Trade-off Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Threshold vs Net Financial Savings Curve</h3>
          <p className="text-xs text-slate-400">
            Finding the global cost minimum: Balancing unmitigated fraud loss (₹2,000/order) against customer friction (₹300/FP)
          </p>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={thresholdData.curves.points} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                dataKey="threshold"
                stroke="#64748B"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => val.toFixed(2)}
              />
              <YAxis
                stroke="#64748B"
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '0.75rem' }}
                formatter={(val: any, name: any) => [`₹${Number(val).toLocaleString()}`, name]}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                type="monotone"
                dataKey="net_savings"
                name="Net Estimated Savings (₹)"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="expected_cost"
                name="Operational Cost With AI (₹)"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Honest Confusion Matrix & Metrics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Held-Out Test Set Confusion Matrix</h3>
            <span className="text-xs font-mono text-slate-400">7,500 Test Samples</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* True Negatives */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30">
              <span className="text-xs text-slate-400">True Negatives (TN)</span>
              <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {metrics.confusion_matrix.true_negatives.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Legitimate orders approved without friction</p>
            </div>

            {/* False Positives */}
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30">
              <span className="text-xs text-slate-400">False Positives (FP)</span>
              <p className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {metrics.confusion_matrix.false_positives.toLocaleString()}
              </p>
              <p className="text-[11px] text-amber-400/80 mt-1">
                Operational friction cost: ₹{metrics.financial_impact.fp_cost.toLocaleString()}
              </p>
            </div>

            {/* False Negatives */}
            <div className="p-4 rounded-xl bg-slate-950 border border-red-500/30">
              <span className="text-xs text-slate-400">False Negatives (FN)</span>
              <p className="text-2xl font-bold text-red-400 font-mono mt-1">
                {metrics.confusion_matrix.false_negatives.toLocaleString()}
              </p>
              <p className="text-[11px] text-red-400/80 mt-1">
                Unmitigated fraud loss: ₹{metrics.financial_impact.fn_cost.toLocaleString()}
              </p>
            </div>

            {/* True Positives */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30">
              <span className="text-xs text-slate-400">True Positives (TP)</span>
              <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {metrics.confusion_matrix.true_positives.toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-400/80 mt-1">
                Loss prevented: ₹{metrics.financial_impact.fraud_losses_prevented.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Model Benchmark Comparison Table */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Multi-Model Benchmark Comparison</h3>
            <span className="text-xs text-slate-400">Evaluated on Validation</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Model</th>
                  <th className="py-2.5 px-3">PR-AUC</th>
                  <th className="py-2.5 px-3">Recall</th>
                  <th className="py-2.5 px-3">Precision</th>
                  <th className="py-2.5 px-3 text-right">Net Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {healthData?.candidate_models_compared?.map((m: any, idx: number) => (
                  <tr key={idx} className={idx === 0 ? 'bg-indigo-950/20 font-semibold' : ''}>
                    <td className="py-3 px-3 text-white flex items-center space-x-1.5">
                      {idx === 0 && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{m.model_name}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-indigo-300">{(m.pr_auc * 100).toFixed(1)}%</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{(m.recall * 100).toFixed(1)}%</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{(m.precision * 100).toFixed(1)}%</td>
                    <td className="py-3 px-3 font-mono text-right text-emerald-400">
                      ₹{m.net_savings?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
