import React from 'react';
import {
  Sparkles,
  Zap,
  ArrowRight,
  ShieldAlert,
  Layers,
  Share2,
  CheckCircle2,
  DollarSign,
  SlidersHorizontal,
  FileText
} from 'lucide-react';

interface DemoPresentationPageProps {
  onNavigateToTab: (tab: string) => void;
  onOpenOrder: (orderId: string) => void;
  onOpenCluster: (clusterId: string) => void;
}

export const DemoPresentationPage: React.FC<DemoPresentationPageProps> = ({
  onNavigateToTab,
  onOpenOrder,
  onOpenCluster
}) => {
  const demoSteps = [
    {
      time: '0:00',
      title: 'Phase 1: The Problem (Merchant Financial Exposure)',
      description: 'Open the Overview Dashboard. Observe ₹32.38 Lakh in unmitigated baseline fraud risk across 50,000 transactions. Merchants cannot manually review thousands of daily orders without causing extreme customer friction.',
      actionLabel: '1. Open Overview Dashboard',
      action: () => onNavigateToTab('overview'),
      icon: DollarSign,
      color: 'text-red-400 bg-red-500/10 border-red-500/30'
    },
    {
      time: '1:00',
      title: 'Phase 2: Detection (AI Return Risk Scoring)',
      description: 'A suspicious transaction arrives: Order ORD-10239 (Customer C). RiskSentinel scores it 91/100 HIGH RISK with an estimated loss exposure of ₹8,499.',
      actionLabel: '2. Investigate Order ORD-10239',
      action: () => onOpenOrder('ORD-10239'),
      icon: ShieldAlert,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    },
    {
      time: '2:00',
      title: 'Phase 3: Explainable AI (SHAP Directional Attribution)',
      description: 'Observe the exact behavioral drivers: Customer returned 6 of last 8 orders (+24), previous chargebacks (+20), new account (+14), 3x order value surge (+11), and billing/shipping mismatch (+8).',
      actionLabel: '3. View SHAP Waterfall in Dossier',
      action: () => onOpenOrder('ORD-10239'),
      icon: Layers,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
    },
    {
      time: '2:45',
      title: 'Phase 4: Abuse-Ring Sentinel (Relational Graph)',
      description: 'Click into the related cluster (Ring #8899). See that 8 distinct customer accounts share the exact same hardware device DEV-RING-8899 and 2 addresses, driving an aggregate 71% return rate.',
      actionLabel: '4. Open Abuse-Ring Sentinel Graph',
      action: () => {
        onNavigateToTab('abuse-network');
        onOpenCluster('CLUSTER-RING-8899');
      },
      icon: Share2,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
    },
    {
      time: '3:30',
      title: 'Phase 5: Merchant Action & Feedback Loop',
      description: 'Merchant executes "Request Verification" to demand pre-shipment identity & OTP confirmation. The action is recorded in the immutable audit log, saving ₹8,499 in potential loss.',
      actionLabel: '5. Take Action in Order Dossier',
      action: () => onOpenOrder('ORD-10239'),
      icon: CheckCircle2,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    },
    {
      time: '4:15',
      title: 'Phase 6: Business Impact & Threshold Optimizer',
      description: 'Navigate to Analytics. Adjust the threshold slider from 0.10 to 0.90 to observe how expected merchant loss changes dynamically. Demonstrates ₹26.87 Lakh in Net Savings (487.9% ROI).',
      actionLabel: '6. Open Threshold Optimizer',
      action: () => onNavigateToTab('analytics'),
      icon: SlidersHorizontal,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 py-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>Interactive 5-Minute Hackathon Demo Script</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          RiskSentinel: Detect → Explain → Act → Measure
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Follow this guided 6-step walkthrough to present the end-to-end merchant loss prevention workflow to judges.
        </p>
      </div>

      {/* Demo Timeline Grid */}
      <div className="space-y-4">
        {demoSteps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-indigo-500/50 transition-all"
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-xl border shrink-0 ${step.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs font-bold">
                      {step.time}
                    </span>
                    <h3 className="text-base font-bold text-white">{step.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                    {step.description}
                  </p>
                </div>
              </div>

              <button
                onClick={step.action}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs whitespace-nowrap shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-1.5 shrink-0 self-end md:self-center"
              >
                <span>{step.actionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Closing Statement Callout */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/60 to-slate-950 border border-indigo-500/40 text-center space-y-2">
        <h3 className="text-lg font-bold text-white">
          "RiskSentinel doesn't ask whether a transaction looks suspicious. It asks whether taking action is worth the cost."
        </h3>
        <p className="text-xs text-slate-400">
          Built for modern e-commerce merchants to turn return-risk data into quantifiable bottom-line financial savings.
        </p>
      </div>
    </div>
  );
};
