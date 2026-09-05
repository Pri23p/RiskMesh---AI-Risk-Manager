import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'decision' | 'risk-level';
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'decision',
  size = 'md',
}) => {
  const norm = (status || '').toUpperCase();

  let styles = 'bg-slate-800/80 text-slate-300 border-slate-700';
  let label = norm;

  if (type === 'risk-level') {
    const num = Number(norm);
    const isNum = !isNaN(num) && norm.trim() !== '';

    if (norm === 'HIGH' || norm === 'CRITICAL' || (isNum && num >= 75)) {
      styles = 'bg-red-500/10 text-red-400 border-red-500/30';
      label = 'HIGH RISK';
    } else if (norm === 'MEDIUM' || (isNum && num >= 30 && num < 75)) {
      styles = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      label = 'MEDIUM RISK';
    } else {
      styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      label = 'LOW RISK';
    }
  } else {
    // Decision / Transaction Status
    if (norm === 'BLOCK' || norm === 'BLOCKED') {
      styles = 'bg-red-500/15 text-red-400 border-red-500/40 shadow-sm shadow-red-950/50';
      label = 'BLOCKED';
    } else if (norm === 'REVIEW' || norm === 'IN_REVIEW') {
      styles = 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-950/50';
      label = 'REVIEW';
    } else if (norm === 'APPROVE' || norm === 'APPROVED') {
      styles = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-950/50';
      label = 'APPROVED';
    } else if (norm === 'ESCALATED') {
      styles = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-950/50';
      label = 'ESCALATED';
    } else {
      styles = 'bg-slate-800 text-slate-400 border-slate-700';
      label = norm || 'PENDING';
    }
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wide',
    lg: 'text-sm px-3.5 py-1.5 font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${styles}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-pulse" />
      {label}
    </span>
  );
};
