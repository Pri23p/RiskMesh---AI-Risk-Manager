import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  trend?: {
    label: string;
    positive?: boolean;
  };
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'default';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend,
  variant = 'default',
}) => {
  const borderColors = {
    cyan: 'border-cyan-500/30 hover:border-cyan-500/60',
    emerald: 'border-emerald-500/30 hover:border-emerald-500/60',
    amber: 'border-amber-500/30 hover:border-amber-500/60',
    rose: 'border-red-500/30 hover:border-red-500/60',
    default: 'border-slate-800 hover:border-slate-700',
  }[variant];

  const iconBg = {
    cyan: 'bg-cyan-500/10 text-cyan-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-red-500/10 text-red-400',
    default: 'bg-slate-800 text-slate-300',
  }[variant];

  return (
    <div
      className={`glass-panel p-5 transition-all duration-200 ${borderColors} hover:-translate-y-0.5 shadow-lg shadow-black/20`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {icon && <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>}
      </div>

      <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white mb-1">
        {value}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
        {subtext && <span>{subtext}</span>}
        {trend && (
          <span
            className={`font-semibold ml-auto ${
              trend.positive ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {trend.label}
          </span>
        )}
      </div>
    </div>
  );
};
