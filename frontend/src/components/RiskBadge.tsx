import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, Clock } from 'lucide-react';

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  size?: 'sm' | 'md' | 'lg';
  scorePct?: number;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md', scorePct }) => {
  const norm = (level || '').toUpperCase();

  const getStyles = () => {
    switch (norm) {
      case 'HIGH':
        return {
          bg: 'bg-rose-950/50 border-rose-500/40 text-rose-300',
          dot: 'bg-rose-500',
          icon: ShieldAlert,
          label: 'HIGH RISK',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-amber-950/50 border-amber-500/40 text-amber-300',
          dot: 'bg-amber-500',
          icon: AlertTriangle,
          label: 'REVIEW REQUIRED',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300',
          dot: 'bg-emerald-500',
          icon: CheckCircle,
          label: 'LOW RISK',
        };
    }
  };

  const { bg, dot, icon: Icon, label } = getStyles();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 space-x-1',
    md: 'text-xs px-2.5 py-1 space-x-1.5',
    lg: 'text-sm px-3.5 py-1.5 space-x-2 font-medium',
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${bg} ${sizeClasses[size]} font-mono font-semibold tracking-wide`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />
      <span>{label}</span>
      {scorePct !== undefined && <span className="opacity-75 font-normal">({scorePct.toFixed(1)}%)</span>}
    </span>
  );
};
