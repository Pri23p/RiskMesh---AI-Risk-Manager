import React, { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { fetchTransactions, TransactionItem } from '../api/client';

interface TransactionsPageProps {
  onNavigate: (path: string) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({ onNavigate }) => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTransactions({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit: 50,
      });

      if (data.items && data.items.length > 0) {
        setTransactions(data.items);
      } else {
        // Fallback sample data if DB has few rows
        setTransactions([
          {
            id: '1',
            transactionId: 'TXN123',
            customerId: 'CUS123',
            amount: 85000,
            currency: 'INR',
            deviceId: 'DEV123',
            ipAddress: '10.0.0.1',
            location: 'Mumbai',
            paymentMethod: 'CARD',
            status: 'BLOCKED',
            createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
            updatedAt: new Date().toISOString(),
            riskScore: {
              id: 'rs-1',
              riskScore: 93,
              fraudProbability: 0.93,
              modelVersion: 'v1',
              status: 'COMPLETED',
              factors: [
                { id: '1', feature: 'amountRatio', impact: 'high', explanation: '8.5x average' },
                { id: '2', feature: 'isNewDevice', impact: 'high', explanation: 'Unrecognized device' },
              ],
            },
            riskDecision: {
              id: 'dec-1',
              decision: 'BLOCK',
              reason: 'THRESHOLD_BLOCK: Risk score 93 exceeds 75',
              expectedLoss: 79050.0,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
            },
          },
          {
            id: '2',
            transactionId: 'TXN124',
            customerId: 'CUS456',
            amount: 15400,
            currency: 'INR',
            deviceId: 'DEV456',
            ipAddress: '192.168.1.10',
            location: 'Delhi',
            paymentMethod: 'UPI',
            status: 'REVIEW',
            createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
            updatedAt: new Date().toISOString(),
            riskScore: {
              id: 'rs-2',
              riskScore: 55,
              fraudProbability: 0.55,
              modelVersion: 'v1',
              status: 'COMPLETED',
            },
            riskDecision: {
              id: 'dec-2',
              decision: 'REVIEW',
              reason: 'THRESHOLD_REVIEW: Risk score 55 in review band',
              expectedLoss: 8470.0,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
            },
          },
          {
            id: '3',
            transactionId: 'TXN125',
            customerId: 'CUS789',
            amount: 1250,
            currency: 'INR',
            deviceId: 'DEV789',
            ipAddress: '172.16.0.4',
            location: 'Bengaluru',
            paymentMethod: 'CARD',
            status: 'APPROVED',
            createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
            updatedAt: new Date().toISOString(),
            riskScore: {
              id: 'rs-3',
              riskScore: 12,
              fraudProbability: 0.12,
              modelVersion: 'v1',
              status: 'COMPLETED',
            },
            riskDecision: {
              id: 'dec-3',
              decision: 'APPROVE',
              reason: 'THRESHOLD_APPROVE: Clean transaction profile',
              expectedLoss: 150.0,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
            },
          },
        ]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [statusFilter]);

  const filteredTransactions = transactions.filter((tx) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      tx.transactionId.toLowerCase().includes(q) ||
      tx.customerId.toLowerCase().includes(q) ||
      (tx.location && tx.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Live Transaction Feed</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Searchable log of merchant transactions, ML risk scores, and decisioning audit trail.
          </p>
        </div>

        <div className="flex flex-row flex-nowrap items-center gap-2.5 shrink-0 self-start md:self-auto">
          <button
            onClick={() => onNavigate('/analyze')}
            className="h-10 inline-flex items-center justify-center gap-2 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all whitespace-nowrap shrink-0"
          >
            <span>+ Analyze Transaction</span>
          </button>
          <button
            onClick={loadTransactions}
            className="h-10 inline-flex items-center justify-center gap-2 px-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Transaction ID or Customer ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-dark-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {['ALL', 'APPROVED', 'REVIEW', 'BLOCKED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/40'
                  : 'bg-dark-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      {loading ? (
        <LoadingSpinner label="Fetching transactions..." />
      ) : error ? (
        <EmptyState isError title="Query Error" description={error} />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          title="No Transactions Match Criteria"
          description="Try changing the filter or search keyword."
        />
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-dark-950/60 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Decision</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredTransactions.map((tx) => {
                  const score =
                    tx.riskScore?.riskScore ??
                    (tx.status === 'BLOCKED' ? 95 : tx.status === 'REVIEW' ? 55 : 12);
                  const decision = tx.riskDecision?.decision ?? tx.status;
                  const level = score >= 75 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => onNavigate(`/transactions/${tx.transactionId}`)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                        {tx.transactionId}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {tx.customerId}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {tx.currency}{' '}
                        {Number(tx.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            score >= 75
                              ? 'bg-red-500/20 text-red-400'
                              : score >= 30
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {score} / 100
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={level} type="risk-level" size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={decision} type="decision" size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(tx.createdAt).toLocaleDateString()} &bull;{' '}
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-cyan-400 hover:text-cyan-300 font-semibold">
                          View &rarr;
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
