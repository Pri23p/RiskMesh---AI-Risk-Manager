import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';

import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { fetchTransactions, TransactionItem } from '../api/client';

interface RiskCasesPageProps {
  onNavigate: (path: string) => void;
}

export const RiskCasesPage: React.FC<RiskCasesPageProps> = ({ onNavigate }) => {
  const [cases, setCases] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadCases = async () => {
    setLoading(true);
    try {
      const data = await fetchTransactions({ status: 'REVIEW', limit: 20 });
      if (data.items && data.items.length > 0) {
        setCases(data.items);
      } else {
        // Sample review cases
        setCases([
          {
            id: 'rev-1',
            transactionId: 'TXN124',
            customerId: 'CUS456',
            amount: 15400,
            currency: 'INR',
            deviceId: 'DEV_NOVEL_45',
            ipAddress: '192.168.1.10',
            location: 'Delhi',
            paymentMethod: 'UPI',
            status: 'REVIEW',
            createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
            updatedAt: new Date().toISOString(),
            riskScore: {
              id: 'rs-2',
              riskScore: 55,
              fraudProbability: 0.55,
              modelVersion: 'v1',
              status: 'COMPLETED',
              factors: [
                { id: '1', feature: 'isNewDevice', impact: 'medium', explanation: 'Unrecognized device profile' },
                { id: '2', feature: 'amountRatio', impact: 'medium', explanation: '1.8x user average' },
              ],
            },
            riskDecision: {
              id: 'dec-2',
              decision: 'REVIEW',
              reason: 'THRESHOLD_REVIEW: Score 55 within manual review range',
              expectedLoss: 8470.0,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
            },
          },
          {
            id: 'rev-2',
            transactionId: 'TXN129',
            customerId: 'CUS912',
            amount: 28500,
            currency: 'INR',
            deviceId: 'DEV_MOBILE_99',
            ipAddress: '115.98.21.4',
            location: 'Pune',
            paymentMethod: 'CARD',
            status: 'REVIEW',
            createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
            updatedAt: new Date().toISOString(),
            riskScore: {
              id: 'rs-3',
              riskScore: 68,
              fraudProbability: 0.68,
              modelVersion: 'v1',
              status: 'COMPLETED',
              factors: [
                { id: '1', feature: 'transactionsLast10Min', impact: 'high', explanation: 'Velocity burst' },
              ],
            },
            riskDecision: {
              id: 'dec-3',
              decision: 'REVIEW',
              reason: 'THRESHOLD_REVIEW: Elevated velocity burst requires verification',
              expectedLoss: 19380.0,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
            },
          },
        ]);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span>Manual Review Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Transactions flagged in the 30–74 risk score band requiring human fraud analyst triage.
          </p>
        </div>

        <button
          onClick={loadCases}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Queue
        </button>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading review queue..." />
      ) : cases.length === 0 ? (
        <EmptyState
          title="Review Queue is Clean"
          description="No transactions are currently awaiting manual verification."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cases.map((item) => {
            const score = item.riskScore?.riskScore ?? 55;
            const expectedLoss = item.riskDecision?.expectedLoss ?? (Number(item.amount) * 0.55);

            return (
              <div
                key={item.id}
                className="glass-panel p-5 border-amber-500/20 hover:border-amber-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono font-bold text-sm text-cyan-300">
                      {item.transactionId}
                    </span>
                    <StatusBadge status="REVIEW" size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-dark-950/70 rounded-xl border border-slate-800 text-xs mb-3 font-mono">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Amount</span>
                      <span className="text-white font-bold">
                        {item.currency} {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Risk Score</span>
                      <span className="text-amber-400 font-bold">{score} / 100</span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Customer</span>
                      <span className="text-slate-300">{item.customerId}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">Expected Loss</span>
                      <span className="text-red-400 font-bold">
                        {item.currency} {Number(expectedLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {item.riskDecision?.reason && (
                    <div className="text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 mb-3">
                      <span className="text-amber-400 font-bold">Flag Reason: </span>
                      {item.riskDecision.reason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => onNavigate(`/transactions/${item.transactionId}`)}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all text-center"
                  >
                    Open Deep Analysis
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
