import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  Activity,
  Layers,
  ChevronRight,
  Zap,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { apiClient } from '../api/client';
import { AnalyticsOverview, OrderItem, AlertItem } from '../types';

interface OverviewPageProps {
  onSelectOrder: (orderId: string) => void;
  onNavigate: (page: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onSelectOrder, onNavigate }) => {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [highRiskOrders, setHighRiskOrders] = useState<OrderItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoTriggered, setDemoTriggered] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, highRiskRes, alertsRes] = await Promise.all([
        apiClient.getAnalytics(),
        apiClient.getHighRiskOrders(),
        apiClient.getAlerts()
      ]);
      setData(analyticsRes);
      setHighRiskOrders(highRiskRes.high_risk_orders.slice(0, 5));
      setAlerts(alertsRes.alerts.slice(0, 2));
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLaunchDemo = () => {
    setDemoTriggered(true);
    // Launch ORD-10239 investigation modal directly
    onSelectOrder('ORD-10239');
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading RiskSentinel Engine...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Top Hackathon Demo Action Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/90 via-slate-900 to-slate-900 p-6 border border-indigo-500/30 shadow-2xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Core Philosophy
              </span>
              <span className="text-xs text-slate-400 font-mono">DETECT → EXPLAIN → ACT → MEASURE</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              "We optimize merchant loss, not model accuracy."
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Defensive AI risk intelligence preventing fraudulent returns, wardrobing, chargebacks, and coordinated abuse rings.
            </p>
          </div>
          <button
            onClick={handleLaunchDemo}
            className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-red-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Investigate High-Risk Order (ORD-10239)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Anomaly Alerts Ticker */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert) => (
            <div
              key={alert.alert_id}
              onClick={() => onNavigate('alerts')}
              className="cursor-pointer group flex items-start space-x-3 p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-500/60 transition-all shadow-md"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    {alert.severity} SEVERITY ANOMALY
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{alert.timestamp.split(' ')[1] || 'Recent'}</span>
                </div>
                <h4 className="text-sm font-semibold text-white truncate mt-0.5">{alert.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{alert.reason}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Exposure</span>
                <p className="text-xs font-bold text-red-400 font-mono">₹{alert.potential_exposure.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Savings */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Estimated Net Savings</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-emerald-400 font-mono">
              ₹{data.net_savings.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center">
              <span className="text-emerald-400 font-semibold inline-flex items-center mr-1">
                <TrendingUp className="w-3 h-3 mr-0.5" /> 487.9% ROI
              </span>
              over unmitigated baseline
            </p>
          </div>
        </div>

        {/* Potential Loss Exposure */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-red-500/30 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Potential Risk Exposure</span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-red-400 font-mono">
              ₹{data.estimated_loss_exposure.toLocaleString()}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Across <span className="text-red-400 font-semibold">{data.high_risk_orders}</span> high-risk transactions
            </p>
          </div>
        </div>

        {/* High-Risk Orders */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">High-Risk Orders</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-white font-mono">{data.high_risk_orders}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {((data.high_risk_orders / Math.max(1, data.orders_analyzed)) * 100).toFixed(1)}% of {data.orders_analyzed.toLocaleString()} orders analyzed
            </p>
          </div>
        </div>

        {/* Model Accuracy vs Business Impact */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Held-Out Test PR-AUC</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-indigo-400 font-mono">{(data.pr_auc * 100).toFixed(1)}%</h3>
            <p className="text-xs text-slate-400 mt-1">
              Recall: <span className="text-white font-medium">{(data.recall * 100).toFixed(1)}%</span> | Precision: <span className="text-white font-medium">{(data.precision * 100).toFixed(1)}%</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loss Prevention Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Financial Loss Prevention Over Time</h3>
              <p className="text-xs text-slate-400">Potential Exposure vs Estimated Losses Prevented (₹ INR)</p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
            >
              <span>Explore Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.temporal_trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="preventedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="exposureGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748B"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '0.75rem' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="loss_exposure_inr"
                  name="Potential Exposure"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#exposureGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="loss_prevented_inr"
                  name="Losses Prevented"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#preventedGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Donut */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Order Risk Distribution</h3>
            <p className="text-xs text-slate-400">Categorized by 0–100 Risk Score Bands</p>
          </div>
          <div className="h-[200px] my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.risk_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.risk_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '0.75rem' }}
                  formatter={(val: any, name: any) => [`${val} orders`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {data.risk_distribution.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <div className="font-mono text-slate-400">
                  <span className="text-white font-semibold">{item.count}</span> ({item.percentage}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Risk Queue */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">High-Risk Orders Requiring Merchant Action</h3>
            <p className="text-xs text-slate-400">Transactions with score ≥ 70/100 flagged for defensive triage</p>
          </div>
          <button
            onClick={() => onNavigate('queue')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>View Full Risk Queue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Primary Risk Factor</th>
                <th className="py-3 px-4">Recommended Action</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {highRiskOrders.map((order) => (
                <tr
                  key={order.order_id}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  onClick={() => onSelectOrder(order.order_id)}
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 group-hover:text-indigo-300">
                    {order.order_id}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{order.customer_id}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-white">
                    ₹{order.order_amount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                      {order.risk_score}/100 HIGH
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                    {order.primary_risk_factor}
                  </td>
                  <td className="py-3.5 px-4 text-amber-300 font-medium">
                    {order.recommended_action}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrder(order.order_id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
