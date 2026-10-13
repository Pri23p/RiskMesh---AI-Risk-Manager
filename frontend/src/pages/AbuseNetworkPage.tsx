import React, { useEffect, useState } from 'react';
import {
  Share2,
  Smartphone,
  MapPin,
  Users,
  ShieldAlert,
  AlertTriangle,
  Layers,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ClusterItem, ClusterDetail } from '../types';

interface AbuseNetworkPageProps {
  onSelectOrder?: (orderId: string) => void;
  selectedClusterId?: string;
}

export const AbuseNetworkPage: React.FC<AbuseNetworkPageProps> = ({ onSelectOrder, selectedClusterId }) => {
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [activeCluster, setActiveCluster] = useState<ClusterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClusters = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getClusters();
      setClusters(res.clusters);
      if (res.clusters.length > 0) {
        const targetId = selectedClusterId || res.clusters[0].cluster_id;
        const detail = await apiClient.getClusterDetail(targetId);
        setActiveCluster(detail);
      }
    } catch (err) {
      console.error('Failed to load abuse clusters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, [selectedClusterId]);

  const handleSelectCluster = async (clusterId: string) => {
    try {
      const detail = await apiClient.getClusterDetail(clusterId);
      setActiveCluster(detail);
    } catch (err) {
      console.error('Failed to load cluster detail:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Analyzing relational graph & multi-account clusters...</p>
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
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              Relational Intelligence Layer
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Abuse-Ring Sentinel</h1>
          <p className="text-sm text-slate-400">
            Detects coordinated fraud rings and suspicious clusters sharing devices, addresses, and return patterns
          </p>
        </div>
      </div>

      {/* Cluster Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clusters.map((cluster) => (
          <div
            key={cluster.cluster_id}
            onClick={() => handleSelectCluster(cluster.cluster_id)}
            className={`p-5 rounded-2xl cursor-pointer border transition-all ${
              activeCluster?.cluster_id === cluster.cluster_id
                ? 'bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                  <Share2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">{cluster.cluster_name}</h3>
                  <span className="text-[11px] font-mono text-slate-400">{cluster.cluster_id}</span>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                cluster.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {cluster.risk_level} RISK
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4 text-center">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase">Accounts</span>
                <p className="text-sm font-bold text-white mt-0.5">{cluster.customer_count}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase">Shared Dev</span>
                <p className="text-sm font-bold text-white mt-0.5">{cluster.shared_devices_count}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase">Return Rate</span>
                <p className="text-sm font-bold text-amber-400 mt-0.5">{(cluster.historical_return_rate * 100).toFixed(0)}%</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase">Exposure</span>
                <p className="text-sm font-bold text-red-400 font-mono mt-0.5">₹{cluster.potential_exposure.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Cluster Graph Explorer */}
      {activeCluster && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">{activeCluster.cluster_name}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-semibold">
                  {activeCluster.customer_count} Linked Accounts
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Visualizing relationships between Customer IDs, Shared Hardware Devices, and Shipping Destinations
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Total Ring Potential Exposure</span>
              <p className="text-xl font-bold text-red-400 font-mono">₹{activeCluster.potential_exposure.toLocaleString()}</p>
            </div>
          </div>

          {/* Interactive Visual Graph Canvas */}
          <div className="relative rounded-2xl bg-slate-950 border border-slate-800 p-6 min-h-[380px] overflow-hidden flex flex-col justify-between">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none" />

            {/* Central Shared Device Node */}
            <div className="relative z-10 flex flex-col items-center justify-center my-6">
              <div className="p-4 rounded-2xl bg-indigo-950/80 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/30 flex flex-col items-center text-center max-w-xs animate-pulse">
                <Smartphone className="w-8 h-8 text-indigo-400 mb-1" />
                <span className="text-xs font-bold text-white">{activeCluster.device_ids?.[0] || 'DEV-RING-8899'}</span>
                <span className="text-[10px] text-indigo-300">Shared Hardware Fingerprint</span>
                <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300 font-bold">
                  {activeCluster.customer_count} Accounts Connected
                </span>
              </div>
            </div>

            {/* Linked Customer Nodes */}
            <div className="relative z-10">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                Identified Customer Accounts in Cluster:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activeCluster.customer_ids?.map((cid, i) => (
                  <div
                    key={cid}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-white">{cid}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Return Rate</span>
                      <span className="font-mono font-bold text-red-400">{(activeCluster.historical_return_rate * 100).toFixed(0)}%</span>
                    </div>
                    {cid === 'CUST-99201' && (
                      <div className="mt-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => onSelectOrder && onSelectOrder('ORD-10239')}
                          className="w-full text-center py-1 rounded bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white text-[10px] font-semibold transition-colors"
                        >
                          Investigate Order ORD-10239
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Associated Addresses */}
            <div className="relative z-10 mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-400 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>Shared Delivery Addresses:</span>
              </span>
              {activeCluster.address_ids?.map((addr) => (
                <span
                  key={addr}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300"
                >
                  {addr}
                </span>
              ))}
            </div>
          </div>

          {/* Defensive Explanation Note */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start space-x-3 text-xs text-slate-400">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              <strong>Defensive Operations Advisory: </strong>
              RiskSentinel flags multi-account coordination to help merchants enforce single-account policies and require step-up authentication. No bypass or evasion mechanisms are accessible.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
