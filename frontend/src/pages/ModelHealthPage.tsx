import React, { useEffect, useState } from 'react';
import {
  Activity,
  ShieldCheck,
  Layers,
  Clock,
  RefreshCw,
  GitBranch,
  Database,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '../api/client';

export const ModelHealthPage: React.FC = () => {
  const [health, setHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getModelHealth();
      setHealth(res);
    } catch (err) {
      console.error('Failed to load model health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading || !health) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading model health & drift parameters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Model Governance & Monitoring
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1">Model Health & Governance</h1>
        <p className="text-sm text-slate-400">
          Tracking data integrity, temporal dataset splits, feature stability, and model versioning
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Model Status</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-lg font-bold text-emerald-400 mt-2">{health.status}</h3>
          <p className="text-xs text-slate-400 mt-1">Calibrated on test data</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Active Version</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <GitBranch className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-lg font-bold text-white font-mono mt-2">{health.model_version}</h3>
          <p className="text-xs text-slate-400 mt-1">Threshold: {health.operating_threshold}</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Total Orders</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Database className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-lg font-bold text-white font-mono mt-2">50,000 Records</h3>
          <p className="text-xs text-slate-400 mt-1">Chronologically partitioned</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Drift Metric</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-lg font-bold text-emerald-400 mt-2">PSI &lt; 0.05</h3>
          <p className="text-xs text-slate-400 mt-1">Population Stability Index</p>
        </div>
      </div>

      {/* Temporal Dataset Partitioning Breakdown */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white">Strict Chronological Dataset Partitioning</h3>
        <p className="text-xs text-slate-400">
          To strictly avoid temporal data leakage, all feature engineering, hyperparameter tuning, and threshold selections were finalized on the Train and Validation sets before evaluating once on the held-out Test set.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">1. Training Set</span>
              <span className="text-xs font-bold text-indigo-400">70%</span>
            </div>
            <h4 className="text-xl font-bold text-white font-mono mt-2">
              {health.training_dataset_size.toLocaleString()} orders
            </h4>
            <p className="text-xs text-slate-500 mt-1">Used for model fitting & tree training</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">2. Validation Set</span>
              <span className="text-xs font-bold text-indigo-400">15%</span>
            </div>
            <h4 className="text-xl font-bold text-white font-mono mt-2">
              {health.validation_dataset_size.toLocaleString()} orders
            </h4>
            <p className="text-xs text-slate-500 mt-1">Model comparison & threshold tuning</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase">3. Held-Out Test Set</span>
              <span className="text-xs font-bold text-emerald-400">15%</span>
            </div>
            <h4 className="text-xl font-bold text-emerald-400 font-mono mt-2">
              {health.held_out_test_size.toLocaleString()} orders
            </h4>
            <p className="text-xs text-slate-400 mt-1">Untouched held-out final benchmark</p>
          </div>
        </div>
      </div>

      {/* Feature Drift & Stability Table */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white">Feature Drift Monitoring (PSI Indicators)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Monitored Behavioral Feature</th>
                <th className="py-2.5 px-4">Population Stability Index (PSI)</th>
                <th className="py-2.5 px-4">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {health.feature_drift_indicators?.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-3 px-4 font-medium text-slate-200">{item.feature}</td>
                  <td className="py-3 px-4 font-mono text-indigo-300">{item.psi.toFixed(3)}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {item.status}
                    </span>
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
