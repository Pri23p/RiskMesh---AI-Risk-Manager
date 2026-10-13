import React from 'react';
import { FeatureContribution } from '../types';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface FeatureWaterfallProps {
  contributions: FeatureContribution[];
  limit?: number;
}

export const FeatureWaterfall: React.FC<FeatureWaterfallProps> = ({ contributions, limit = 8 }) => {
  const displayItems = contributions.slice(0, limit);
  const maxImpact = Math.max(...displayItems.map((c) => Math.abs(c.impact)), 0.01);

  return (
    <div className="space-y-3">
      {displayItems.map((item, idx) => {
        const isPos = item.impact > 0;
        const widthPct = Math.min(100, Math.max(8, (Math.abs(item.impact) / maxImpact) * 100));

        return (
          <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs font-mono">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-1.5 truncate max-w-[70%]">
                {isPos ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="text-slate-200 font-sans font-medium truncate">{item.readable_name}</span>
              </div>
              <span className={`font-bold ${isPos ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isPos ? '+' : ''}
                {item.impact.toFixed(3)}
              </span>
            </div>

            {/* Impact Bar */}
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPos
                    ? 'bg-gradient-to-r from-rose-500 to-red-400'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            {item.raw_value !== undefined && item.raw_value !== null && (
              <div className="mt-1 text-3xs text-slate-500 truncate">
                Raw Value: <span className="text-slate-400">{String(item.raw_value)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
