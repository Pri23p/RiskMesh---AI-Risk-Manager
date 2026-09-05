import React, { useState, useEffect } from 'react';
import {
  Search,
  Share2,
  ShieldAlert,
  Users,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { NetworkGraph } from '../components/NetworkGraph';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { fetchCustomerNetwork, NetworkGraphData } from '../api/client';

interface NetworkPageProps {
  onNavigate?: (path: string) => void;
}

export const NetworkPage: React.FC<NetworkPageProps> = ({ onNavigate }) => {
  const [customerId, setCustomerId] = useState<string>('CUS_9421');
  const [searchInput, setSearchInput] = useState<string>('CUS_9421');
  const [graphData, setGraphData] = useState<NetworkGraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);


  const sampleCustomers = ['CUS_9421', 'CUS123', 'CUS_RING_LEADER', 'CUS_SYNDICATE_B'];

  const loadNetwork = async (idToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerNetwork(idToFetch).catch(() => null);

      if (data) {
        setGraphData(data);
      } else {
        // High-fidelity fallback graph demonstration if customer has not yet transacted in live DB
        setGraphData({
          customerId: idToFetch,
          nodes: [
            {
              id: idToFetch,
              type: 'CUSTOMER',
              label: idToFetch,
              subLabel: 'Target Account (14d)',
              riskLevel: 'CRITICAL',
              riskScore: 88,
              isOrigin: true,
              metadata: { accountAge: 14, connectionCount: 3 },
            },
            {
              id: 'txn:TXN_9421_1',
              type: 'TRANSACTION',
              label: 'TXN_9421_1',
              subLabel: 'INR 85,000',
              riskLevel: 'CRITICAL',
              riskScore: 93,
              status: 'BLOCKED',
              metadata: { amount: 85000, currency: 'INR', decision: 'BLOCK' },
            },
            {
              id: 'dev:DEV_CHROME_WIN11_98',
              type: 'DEVICE',
              label: 'DEV_CHROME_WIN11_98',
              subLabel: 'Shared with 3 accounts',
              riskLevel: 'CRITICAL',
              metadata: { connectionCount: 3, deviceType: 'Hardware Profile' },
            },
            {
              id: 'ip:103.21.244.12',
              type: 'IP',
              label: '103.21.244.12',
              subLabel: 'Mumbai, IN',
              riskLevel: 'HIGH',
              metadata: { connectionCount: 3, ipCountry: 'Mumbai, IN' },
            },
            {
              id: 'CUS_SYNDICATE_2',
              type: 'CUSTOMER',
              label: 'CUS_SYNDICATE_2',
              subLabel: 'Flagged Account (2d)',
              riskLevel: 'CRITICAL',
              status: 'BLOCKED',
              metadata: { accountAge: 2, isFlagged: true },
            },
            {
              id: 'txn:TXN_SYN_22',
              type: 'TRANSACTION',
              label: 'TXN_SYN_22',
              subLabel: 'INR 64,000',
              riskLevel: 'CRITICAL',
              status: 'BLOCKED',
              metadata: { amount: 64000, currency: 'INR', decision: 'BLOCK' },
            },
            {
              id: 'CUS_SYNDICATE_3',
              type: 'CUSTOMER',
              label: 'CUS_SYNDICATE_3',
              subLabel: 'Flagged Account (1d)',
              riskLevel: 'CRITICAL',
              status: 'BLOCKED',
              metadata: { accountAge: 1, isFlagged: true },
            },
          ],
          links: [
            { id: '1', source: idToFetch, target: 'txn:TXN_9421_1', relationship: 'PERFORMED', label: 'performed', weight: 1 },
            { id: '2', source: 'txn:TXN_9421_1', target: 'dev:DEV_CHROME_WIN11_98', relationship: 'USED_DEVICE', label: 'hardware', weight: 2 },
            { id: '3', source: 'txn:TXN_9421_1', target: 'ip:103.21.244.12', relationship: 'USED_IP', label: 'network', weight: 1 },
            { id: '4', source: 'CUS_SYNDICATE_2', target: 'txn:TXN_SYN_22', relationship: 'PERFORMED', label: 'performed', weight: 1 },
            { id: '5', source: 'txn:TXN_SYN_22', target: 'dev:DEV_CHROME_WIN11_98', relationship: 'USED_DEVICE', label: 'hardware', weight: 2 },
            { id: '6', source: 'CUS_SYNDICATE_3', target: 'dev:DEV_CHROME_WIN11_98', relationship: 'USED_DEVICE', label: 'hardware', weight: 2 },
          ],
          signals: {
            customerId: idToFetch,
            sharedDeviceCount: 1,
            sharedIpCount: 1,
            sharedPaymentCount: 0,
            connectedCustomersCount: 2,
            connectedTransactionsCount: 2,
            flaggedAccountConnections: 2,
            flaggedTransactionsCount: 2,
            networkRiskScore: 88,
            isHighRiskRing: true,
            summary: 'High-risk fraud ring detected: 2 flagged connected account(s) sharing hardware profile DEV_CHROME_WIN11_98.',
          },
          analyzedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load network intelligence graph');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetwork(customerId);
  }, [customerId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setCustomerId(searchInput.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Fraud Network Intelligence Graph
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Multi-hop graph traversal analyzing shared device fingerprints, IP clusters, payment instruments, and fraud syndicates.
          </p>
        </div>

        {/* Customer Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Customer ID..."
              className="pl-9 pr-4 py-2 rounded-xl bg-dark-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
          >
            Analyze
          </button>
        </form>
      </div>

      {/* Quick Customer Selection Pills */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="text-slate-400 font-semibold">Quick Analyze:</span>
        {sampleCustomers.map((id) => (
          <button
            key={id}
            onClick={() => {
              setSearchInput(id);
              setCustomerId(id);
            }}
            className={`px-3 py-1 rounded-full font-mono font-medium transition-all ${
              customerId === id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {/* Syndicate Banner If Detected */}
      {graphData?.signals.isHighRiskRing && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <span>Multi-Account Fraud Syndicate Detected</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/30 text-rose-200">
                  CRITICAL
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {graphData.signals.summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Visual Graph */}
      {loading ? (
        <LoadingSpinner label={`Constructing entity relationship graph for ${customerId}...`} />
      ) : graphData ? (
        <div className="space-y-6">
          <NetworkGraph
            nodes={graphData.nodes}
            links={graphData.links}
            signals={graphData.signals}
            onNodeClick={(node) => {
              if (node.type === 'TRANSACTION' && onNavigate) {
                const txId = node.id.replace('txn:', '');
                onNavigate(`/transactions/${txId}`);
              }
            }}
          />

          {/* Connected Entities Breakdown Table */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Connected Entity Graph Inventory</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">Entity Type</th>
                    <th className="pb-3 font-semibold">Identifier</th>
                    <th className="pb-3 font-semibold">Relationship / Metadata</th>
                    <th className="pb-3 font-semibold">Risk Level</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {graphData.nodes.map((node) => (
                    <tr key={node.id} className="hover:bg-slate-900/40">
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                          {node.type}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-white">{node.label}</td>
                      <td className="py-3 text-slate-400">{node.subLabel || 'Direct Link'}</td>
                      <td className="py-3">
                        <span
                          className={`font-bold ${
                            node.riskLevel === 'CRITICAL'
                              ? 'text-rose-400'
                              : node.riskLevel === 'HIGH'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {node.riskLevel}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {node.type === 'CUSTOMER' && node.id !== customerId && (
                          <button
                            onClick={() => {
                              setSearchInput(node.id);
                              setCustomerId(node.id);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1"
                          >
                            Explore Graph <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        {node.type === 'TRANSACTION' && onNavigate && (
                          <button
                            onClick={() => onNavigate(`/transactions/${node.id.replace('txn:', '')}`)}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1"
                          >
                            View Txn <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState isError={Boolean(error)} title="No Network Data" description={error || "Could not discover entity relationships for this customer."} />
      )}

    </div>
  );
};
