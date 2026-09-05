import React from 'react';
import { CheckCircle2, ShieldAlert, FileText, Activity, AlertOctagon } from 'lucide-react';
import { AuditEventItem } from '../api/client';

interface AuditTimelineProps {
  events: AuditEventItem[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-4 bg-slate-900/30 border border-slate-800 rounded-lg text-slate-400 text-xs text-center">
        No audit events recorded yet for this transaction.
      </div>
    );
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'transaction.created':
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case 'risk.evaluated':
        return <Activity className="w-4 h-4 text-indigo-400" />;
      case 'risk.decision.created':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      case 'transaction.approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'transaction.blocked':
        return <AlertOctagon className="w-4 h-4 text-red-400" />;
      case 'transaction.review_required':
        return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'transaction.approved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'transaction.blocked':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'transaction.review_required':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {events.map((evt) => (
        <div key={evt.id} className="relative group">
          {/* Dot icon */}
          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-dark-900 border border-slate-700 flex items-center justify-center">
            {getEventIcon(evt.eventType)}
          </div>

          <div className="glass-panel p-3.5 border-slate-800/90 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getEventBadge(evt.eventType)}`}>
                {evt.eventType}
              </span>
              <span className="text-[11px] text-slate-400">
                {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {evt.metadata && Object.keys(evt.metadata).length > 0 && (
              <div className="mt-2 p-2 bg-slate-950/60 rounded border border-slate-900 font-mono text-[11px] text-slate-300 space-y-1 overflow-x-auto">
                {Object.entries(evt.metadata).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-slate-400">{k}:</span>
                    <span className="text-cyan-300 font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
