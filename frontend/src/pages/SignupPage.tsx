import React, { useState } from 'react';
import { Shield, Building2, Mail, Lock, DollarSign, ArrowRight, CheckCircle2, Tag } from 'lucide-react';

interface SignupPageProps {
  onSignup: (merchant: { businessName: string; email: string; role: string; merchantId: string }) => void;
  onNavigateToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onNavigateToLogin }) => {
  const [businessName, setBusinessName] = useState<string>('Nexus Retail Enterprises Ltd');
  const [mccCategory, setMccCategory] = useState<string>('5732_ELECTRONICS');
  const [email, setEmail] = useState<string>('risk.compliance@nexus-retail.in');
  const [password, setPassword] = useState<string>('RiskMesh#2026');
  const [settlementCurrency, setSettlementCurrency] = useState<string>('INR');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !email || !password) {
      setError('Please fill out all required merchant fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate merchant onboarding & provisioning ML tenant
    await new Promise((r) => setTimeout(r, 600));

    const randomMID = `MID_${businessName.toUpperCase().slice(0, 5)}_${Math.floor(1000 + Math.random() * 9000)}`;

    onSignup({
      businessName: businessName.trim(),
      email: email.trim(),
      role: 'Merchant Principal Admin',
      merchantId: randomMID,
    });

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-100">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/25 border border-cyan-400/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Risk<span className="text-cyan-400">Mesh</span>
            </h1>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-0.5">
              Merchant Account Registration
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel p-8 space-y-6 border border-slate-700/80 shadow-2xl backdrop-blur-xl">
          <div className="space-y-1 text-center">
            <h2 className="text-lg font-bold text-white">Create Merchant Account</h2>
            <p className="text-xs text-slate-400">
              Set up your merchant identity, configure risk bands, and activate zero-latency decisioning.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                Merchant Business Legal Name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Nexus Retail Enterprises Ltd"
                className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  Industry / MCC
                </label>
                <select
                  value={mccCategory}
                  onChange={(e) => setMccCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="5732_ELECTRONICS">Electronics (5732)</option>
                  <option value="5651_APPAREL">Apparel & Fashion (5651)</option>
                  <option value="6012_FINANCIAL">BFSI / Fintech (6012)</option>
                  <option value="5311_DEPARTMENT">General Retail (5311)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  Base Currency
                </label>
                <select
                  value={settlementCurrency}
                  onChange={(e) => setSettlementCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                Work Email (Risk & Admin)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="risk.admin@nexus-retail.in"
                className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Security Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'Provisioning Merchant Risk Tenant...' : 'Initialize Merchant Risk Shield'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Switch to Login */}
          <div className="text-center pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-400">
              Already have an enterprise merchant account?{' '}
              <button
                onClick={onNavigateToLogin}
                className="font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 ml-1"
              >
                Sign In &rarr;
              </button>
            </p>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Real-Time Ingestion Sandbox Provisioned Automatically</span>
        </div>
      </div>
    </div>
  );
};
