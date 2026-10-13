import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Zap,
  TrendingUp,
  Clock,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Layers,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { apiClient } from '../api/client';
import { AlertItem } from '../types';

interface AlertsPageProps {
  onNavigateToQueue?: () => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onNavigateToQueue }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getAlerts();
      setAlerts(res.alerts);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const filteredAlerts = filterSeverity === 'ALL'
    ? alerts
    : alerts.filter((a) => a.severity === filterSeverity);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Monitoring temporal velocity and spike detection streams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Temporal Anomaly Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Spike Detector & Alerts Center</h1>
          <p className="text-sm text-slate-400">
            Real-time anomaly monitoring flagging return velocity bursts, chargeback spikes, and category abuse
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Severities</option>
            <option value="HIGH">High Severity Only</option>
            <option value="MEDIUM">Medium Severity Only</option>
          </select>
          <button
            onClick={fetchAlerts}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.alert_id}
            className={`p-6 rounded-2xl border transition-all ${
              alert.severity === 'HIGH'
                ? 'bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border-red-500/40 shadow-xl shadow-red-500/5'
                : 'bg-slate-900/90 border-slate-800 shadow-lg'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-start space-x-3">
                <div className={`p-2.5 rounded-xl border shrink-0 ${
                  alert.severity === 'HIGH'
                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      alert.severity === 'HIGH'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {alert.severity} SEVERITY
                    </span>
                    <span className="text-xs font-mono text-slate-400">{alert.alert_id}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{alert.title}</h3>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-right">
                <div>
                  <span className="text-xs text-slate-400">Affected Orders</span>
                  <p className="text-base font-bold text-white font-mono">{alert.affected_orders_count}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Potential Exposure</span>
                  <p className="text-base font-bold text-red-400 font-mono">₹{alert.potential_exposure.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Alert Body */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Anomaly Detection Evidence:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  {alert.reason}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Merchant Action Recommendation:
                </span>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs space-y-2">
                  <div className="flex items-center space-x-2 text-amber-300 font-semibold">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Apply Step-Up Verification</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Require pre-shipment OTP verification and inspect returns in category <strong>{alert.category}</strong> before processing refunds.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Detected: {alert.timestamp}</span>
              </span>
              {onNavigateToQueue && (
                <button
                  onClick={onNavigateToQueue}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <span>Filter Orders in Risk Queue</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
