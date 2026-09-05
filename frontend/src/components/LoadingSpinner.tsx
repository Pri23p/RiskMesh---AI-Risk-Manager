import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ label?: string }> = ({
  label = 'Loading risk intelligence...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-3">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      <span className="text-xs text-slate-400 font-medium tracking-wide">
        {label}
      </span>
    </div>
  );
};
