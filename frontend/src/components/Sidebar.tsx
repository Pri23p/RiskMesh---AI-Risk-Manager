import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Share2,
  AlertTriangle,
  SlidersHorizontal,
  Activity,
  Bot,
  Zap,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeAlertsCount?: number;
  highRiskCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeAlertsCount = 2,
  highRiskCount = 0,
}) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'queue',
      label: 'Risk Queue',
      icon: ShieldAlert,
      badge: highRiskCount > 0 ? `${highRiskCount}` : undefined,
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30'
    },
    { id: 'abuse-network', label: 'Abuse Network', icon: Share2, highlight: true },
    {
      id: 'alerts',
      label: 'Spike Alerts',
      icon: AlertTriangle,
      badge: activeAlertsCount > 0 ? `${activeAlertsCount}` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    { id: 'analytics', label: 'Analytics & Optimizer', icon: SlidersHorizontal },
    { id: 'model-health', label: 'Model Health', icon: Activity },
    { id: 'analyst', label: 'AI Risk Copilot', icon: Bot },
    { id: 'demo', label: 'Live Hackathon Demo', icon: Zap, special: true },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#080C15] flex flex-col justify-between p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <p className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Loss Prevention Platform
        </p>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition group ${
                isActive
                  ? item.special
                    ? 'bg-gradient-to-r from-red-500/20 to-indigo-500/20 text-white border border-indigo-500/40 shadow-sm'
                    : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? item.special
                        ? 'text-amber-400'
                        : 'text-indigo-400'
                      : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}

              {item.highlight && !isActive && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  GRAPH
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer System Info */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5 font-mono">
          <div className="flex justify-between items-center">
            <span>DATASET</span>
            <span className="text-slate-200 font-semibold">50,000 Orders</span>
          </div>
          <div className="flex justify-between items-center">
            <span>HELD-OUT TEST</span>
            <span className="text-slate-200">7,500 Orders</span>
          </div>
          <div className="flex justify-between items-center">
            <span>DEFENSE MANDATE</span>
            <span className="text-emerald-400 font-semibold">Strictly Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
