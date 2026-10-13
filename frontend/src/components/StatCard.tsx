import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'neutral',
  color = 'blue',
  badge,
}) => {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className="glass-card glass-card-hover rounded-xl p-5 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline space-x-2">
            <h3 className="text-2xl font-bold tracking-tight text-white font-mono">{value}</h3>
            {badge && (
              <span className="text-2xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center text-xs">
          <span
            className={`font-medium ${
              trendType === 'positive'
                ? 'text-emerald-400'
                : trendType === 'negative'
                ? 'text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};
