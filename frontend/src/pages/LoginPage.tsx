import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Sparkles, CheckCircle2, KeyRound } from 'lucide-react';

interface LoginPageProps {
  onLogin: (merchant: { businessName: string; email: string; role: string; merchantId: string }) => void;
  onNavigateToSignup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToSignup }) => {
  const [email, setEmail] = useState<string>('merchant.admin@nexus-retail.in');
  const [password, setPassword] = useState<string>('RiskMesh#2026');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your work email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Simulate authenticating against Merchant IAM
    await new Promise((r) => setTimeout(r, 450));

    onLogin({
      businessName: 'Nexus Retail Enterprises Ltd',
      email: email.trim(),
      role: 'Head of Fraud Risk & Compliance',
      merchantId: 'MID_NEXUS_9981',
    });

    setIsLoading(false);
  };

  const handleDemoLogin = () => {
    onLogin({
      businessName: 'Nexus Retail Enterprises Ltd',
      email: 'demo.risk.officer@riskmesh.io',
      role: 'Merchant Principal Risk Admin',
      merchantId: 'MID_DEMO_MERCHANT_01',
    });
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-slate-100">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Icon & Logo */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/25 border border-cyan-400/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Risk<span className="text-cyan-400">Mesh</span>
            </h1>
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-0.5">
              Merchant Command Center & Risk Engine
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-panel p-8 space-y-6 border border-slate-700/80 shadow-2xl backdrop-blur-xl">
          <div className="space-y-1 text-center">
            <h2 className="text-lg font-bold text-white">Merchant Admin Sign In</h2>
            <p className="text-xs text-slate-400">
              Access real-time transaction decisioning, loss prevention, and fraud telemetry.
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
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                Work Email / Merchant ID
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@merchant-corp.com"
                className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Password
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

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'Authenticating Security Session...' : 'Sign In to Merchant Dashboard'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* 1-Click Demo Merchant Login */}
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-cyan-300 font-bold text-xs border border-cyan-500/40 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>⚡ 1-Click Instant Demo Login</span>
              </button>
            </div>
          </form>

          {/* Switch to Signup */}
          <div className="text-center pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-400">
              New merchant on RiskMesh?{' '}
              <button
                onClick={onNavigateToSignup}
                className="font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 ml-1"
              >
                Register Business Account &rarr;
              </button>
            </p>
          </div>
        </div>

        {/* Security Assurance Footer */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            SOC-2 Type II Certified
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            PCI-DSS Level 1 Encrypted
          </span>
        </div>
      </div>
    </div>
  );
};
