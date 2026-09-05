import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export interface FactorItem {
  feature: string;
  impact: 'high' | 'medium' | 'low';
  explanation?: string;
  contribution?: number;
  value?: any;
}

interface RiskFactorListProps {
  factors?: FactorItem[];
}

export const RiskFactorList: React.FC<RiskFactorListProps> = ({ factors = [] }) => {
  if (!factors || factors.length === 0) {
    return (
      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg text-slate-400 text-xs text-center">
        No significant anomaly risk factors detected.
      </div>
    );
  }

  const formatFeatureName = (feat: string) => {
    return feat
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="space-y-2.5">
      {factors.map((factor, idx) => {
        const isHigh = factor.impact === 'high';
        const isMedium = factor.impact === 'medium';

        return (
          <div
            key={idx}
            className={`p-3 rounded-lg border transition-all ${
              isHigh
                ? 'bg-red-500/10 border-red-500/30'
                : isMedium
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-slate-800/40 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                {isHigh ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                ) : isMedium ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="font-semibold text-xs text-slate-200">
                  {formatFeatureName(factor.feature)}
                </span>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  isHigh
                    ? 'bg-red-500/20 text-red-400'
                    : isMedium
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {factor.impact} IMPACT
              </span>
            </div>

            {factor.explanation && (
              <p className="text-xs text-slate-400 pl-6 leading-relaxed">
                {factor.explanation}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
