import React from 'react';

interface RiskGaugeProps {
  scorePct: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ scorePct, level, size = 160 }) => {
  const norm = (level || '').toUpperCase();
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scorePct / 100) * circumference;

  const getColor = () => {
    switch (norm) {
      case 'HIGH':
        return '#EF4444';
      case 'MEDIUM':
        return '#F59E0B';
      case 'LOW':
      default:
        return '#10B981';
    }
  };

  const strokeColor = getColor();

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E293B"
          strokeWidth="10"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
          {scorePct.toFixed(1)}%
        </span>
        <span
          className="text-2xs font-mono font-bold uppercase tracking-wider mt-0.5"
          style={{ color: strokeColor }}
        >
          {norm === 'HIGH' ? 'HIGH RISK' : norm === 'MEDIUM' ? 'REVIEW' : 'LOW RISK'}
        </span>
      </div>
    </div>
  );
};
