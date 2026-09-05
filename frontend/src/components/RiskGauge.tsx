import React from 'react';

interface RiskGaugeProps {
  score: number; // 0 - 100
  fraudProbability?: number; // 0.0 - 1.0
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  fraudProbability,
}) => {

  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  let colorClass = 'text-emerald-400';
  let strokeColor = '#10b981';
  let levelLabel = 'LOW RISK';
  let bgBadge = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

  if (normalizedScore >= 75) {
    colorClass = 'text-red-400';
    strokeColor = '#ef4444';
    levelLabel = 'HIGH RISK';
    bgBadge = 'bg-red-500/15 text-red-400 border-red-500/30';
  } else if (normalizedScore >= 30) {
    colorClass = 'text-amber-400';
    strokeColor = '#f59e0b';
    levelLabel = 'MEDIUM RISK';
    bgBadge = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }

  // SVG dimensions
  const strokeWidth = 10;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 110 110">
          {/* Background circle */}
          <circle
            cx="55"
            cy="55"
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated risk score arc */}
          <circle
            cx="55"
            cy="55"
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-3xl font-black tracking-tight ${colorClass}`}>
            {normalizedScore}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            / 100
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center gap-1.5">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border tracking-wider ${bgBadge}`}
        >
          {levelLabel}
        </span>
        {fraudProbability !== undefined && (
          <span className="text-xs text-slate-400 font-mono">
            Fraud Prob: {(fraudProbability * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
};
