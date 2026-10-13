import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface PRCurveChartProps {
  curvePoints: Array<{ recall: number; precision: number; threshold: number }>;
  operatingThreshold: number;
  operatingPrecision: number;
  operatingRecall: number;
  prAuc: number;
}

export const PRCurveChart: React.FC<PRCurveChartProps> = ({
  curvePoints,
  operatingThreshold,
  operatingPrecision,
  operatingRecall,
  prAuc,
}) => {
  // Sort by recall ascending for smooth Area rendering
  const sortedData = [...curvePoints].sort((a, b) => a.recall - b.recall);

  return (
    <div className="glass-card rounded-2xl p-6 border border-slate-800">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Precision-Recall Curve</span>
            <span className="text-2xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
              PR-AUC = {prAuc.toFixed(4)}
            </span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluates trade-off across imbalanced positive high-risk return cases.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-2xs font-mono">
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Selected Thresh: <span className="text-amber-400 font-bold">{operatingThreshold.toFixed(2)}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Precision: <span className="text-emerald-400 font-bold">{(operatingPrecision * 100).toFixed(1)}%</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Recall: <span className="text-blue-400 font-bold">{(operatingRecall * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sortedData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="prGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis
              dataKey="recall"
              type="number"
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              stroke="#64748B"
              tick={{ fontSize: 11 }}
              label={{ value: 'Recall (Catch Rate)', position: 'insideBottom', offset: -5, fill: '#94A3B8', fontSize: 11 }}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              stroke="#64748B"
              tick={{ fontSize: 11 }}
              label={{ value: 'Precision', angle: -90, position: 'insideLeft', offset: 30, fill: '#94A3B8', fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs font-mono space-y-1">
                      <div className="text-slate-400">Threshold: <span className="text-amber-400 font-bold">{data.threshold.toFixed(3)}</span></div>
                      <div className="text-emerald-400">Precision: {(data.precision * 100).toFixed(1)}%</div>
                      <div className="text-blue-400">Recall: {(data.recall * 100).toFixed(1)}%</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine x={operatingRecall} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Operating Point', fill: '#F59E0B', fontSize: 10, position: 'top' }} />
            <Area
              type="monotone"
              dataKey="precision"
              stroke="#3B82F6"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#prGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
