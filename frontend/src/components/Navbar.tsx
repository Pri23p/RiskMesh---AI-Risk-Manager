import React from 'react';
import { ShieldCheck, Cpu, Play, Sparkles, Layers, Activity, Zap } from 'lucide-react';

interface NavbarProps {
  onLaunchDemoMode: () => void;
  isDemoMode: boolean;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onLaunchDemoMode,
  isDemoMode,
  activeTab
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand & Tagline */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-rose-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
          <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg tracking-tight text-white">
              RiskSentinel<span className="text-indigo-400 font-mono">.ai</span>
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono">
              MERCHANT LOSS PREVENTION
            </span>
          </div>
          <p className="text-[11px] text-slate-400">AI Return Risk Scoring & Coordinated Abuse Prevention</p>
        </div>
      </div>

      {/* Model & System Status Pills */}
      <div className="hidden lg:flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400">Model:</span>
          <span className="font-mono font-medium text-slate-200">Gradient Boosting (XGB)</span>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Operating Threshold:</span>
          <span className="font-mono font-bold text-amber-300">0.45</span>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-300 font-mono text-[11px] font-semibold">LIVE DEFENSE</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onLaunchDemoMode}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
            isDemoMode
              ? 'bg-gradient-to-r from-red-500 to-indigo-600 text-white ring-2 ring-indigo-400 shadow-indigo-500/25'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>{isDemoMode ? 'Active 5-Min Demo Flow' : '5-Min Hackathon Demo'}</span>
        </button>
      </div>
    </header>
  );
};
