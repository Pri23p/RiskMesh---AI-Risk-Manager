import React, { ReactNode } from 'react';
import { Inbox, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  isError?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Found',
  description = 'No transaction or risk records currently match your query criteria.',
  icon,
  action,
  isError = false,
}) => {
  return (
    <div
      className={`glass-panel p-10 flex flex-col items-center justify-center text-center space-y-3 ${
        isError ? 'border-red-500/20 bg-red-950/10' : ''
      }`}
    >
      <div
        className={`p-3.5 rounded-2xl ${
          isError ? 'bg-red-500/15 text-red-400' : 'bg-slate-800 text-slate-400'
        }`}
      >
        {icon ? icon : isError ? <AlertCircle className="w-8 h-8" /> : <Inbox className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
