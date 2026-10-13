import React from 'react';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface ConfusionMatrixProps {
  matrix: number[][];
  tn: number;
  fp: number;
  fn: number;
  tp: number;
  total: number;
  fpCost?: number;
  fnCost?: number;
}

export const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({
  tn,
  fp,
  fn,
  tp,
  total,
  fpCost = 56700,
  fnCost = 118400,
}) => {
  const tnPct = total > 0 ? (tn / total) * 100 : 0;
  const fpPct = total > 0 ? (fp / total) * 100 : 0;
  const fnPct = total > 0 ? (fn / total) * 100 : 0;
  const tpPct = total > 0 ? (tp / total) * 100 : 0;

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Honest Confusion Matrix</span>
            <span className="text-2xs font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300">
              Held-Out Test (N={total.toLocaleString()})
            </span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparently displaying true positives, true negatives, and visible error costs.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          {/* Top ACTUAL Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold mb-2">
            <div className="col-span-2"></div>
            <div className="col-span-5 bg-slate-900/80 border border-slate-800 py-1 rounded-lg text-slate-300 tracking-wider font-mono">
              ACTUAL GROUND TRUTH
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono font-medium text-slate-400 mb-2">
            <div className="col-span-2"></div>
            <div className="col-span-2 bg-slate-900/40 py-1.5 rounded text-slate-300">
              Normal Kept (0)
            </div>
            <div className="col-span-3 bg-slate-900/40 py-1.5 rounded text-slate-300">
              High-Risk Return (1)
            </div>
          </div>

          {/* ROW 1: PREDICTED NORMAL */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            <div className="col-span-2 bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex flex-col justify-center text-right pr-4">
              <span className="text-2xs text-slate-400 font-mono">PREDICTED</span>
              <span className="text-xs font-bold text-slate-200">Normal (0)</span>
            </div>

            {/* True Negative */}
            <div className="col-span-2 p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-mono font-bold text-emerald-400">TN</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="my-1.5">
                <span className="text-xl font-bold font-mono text-white">{tn.toLocaleString()}</span>
                <span className="text-2xs text-emerald-400/80 font-mono ml-1.5">({tnPct.toFixed(1)}%)</span>
              </div>
              <p className="text-3xs text-slate-400">Normal orders approved.</p>
            </div>

            {/* False Negative */}
            <div className="col-span-3 p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-mono font-bold text-rose-400">FN (Missed Loss)</span>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="my-1.5">
                <span className="text-xl font-bold font-mono text-rose-200">{fn.toLocaleString()}</span>
                <span className="text-2xs text-rose-400/80 font-mono ml-1.5">({fnPct.toFixed(1)}%)</span>
              </div>
              <div className="text-3xs text-rose-300 font-mono bg-rose-900/30 px-2 py-0.5 rounded border border-rose-800/40">
                Missed Loss: ₹{fnCost.toLocaleString()}
              </div>
            </div>
          </div>

          {/* ROW 2: PREDICTED HIGH RISK */}
          <div className="grid grid-cols-7 gap-2">
            <div className="col-span-2 bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex flex-col justify-center text-right pr-4">
              <span className="text-2xs text-slate-400 font-mono">PREDICTED</span>
              <span className="text-xs font-bold text-rose-300">High Risk (1)</span>
            </div>

            {/* False Positive */}
            <div className="col-span-2 p-3.5 rounded-xl bg-amber-950/25 border border-amber-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-mono font-bold text-amber-400">FP (Friction)</span>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="my-1.5">
                <span className="text-xl font-bold font-mono text-amber-200">{fp.toLocaleString()}</span>
                <span className="text-2xs text-amber-400/80 font-mono ml-1.5">({fpPct.toFixed(1)}%)</span>
              </div>
              <div className="text-3xs text-amber-300 font-mono bg-amber-900/30 px-2 py-0.5 rounded border border-amber-800/40">
                Friction: ₹{fpCost.toLocaleString()}
              </div>
            </div>

            {/* True Positive */}
            <div className="col-span-3 p-3.5 rounded-xl bg-blue-950/25 border border-blue-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-mono font-bold text-blue-400">TP (Averted)</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="my-1.5">
                <span className="text-xl font-bold font-mono text-white">{tp.toLocaleString()}</span>
                <span className="text-2xs text-blue-400/80 font-mono ml-1.5">({tpPct.toFixed(1)}%)</span>
              </div>
              <p className="text-3xs text-slate-400">Losses successfully averted.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
