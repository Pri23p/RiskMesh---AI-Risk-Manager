import React, { useState } from 'react';
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sliders,
  Activity,
  Sparkles,
  Share2,
  User,
  CreditCard,
  Smartphone,
  Globe,
  MapPin,
  DollarSign,
  CircleDollarSign,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { createAndAnalyzeTransaction, TransactionItem } from '../api/client';

interface AnalyzeTransactionPageProps {
  onNavigate: (path: string) => void;
}

export const AnalyzeTransactionPage: React.FC<AnalyzeTransactionPageProps> = ({ onNavigate }) => {
  // Form State initialized with realistic demo defaults (matching screenshot)
  const [customerId, setCustomerId] = useState<string>('CUST-1001');
  const [transactionId, setTransactionId] = useState<string>('TXN-92831');
  const [amount, setAmount] = useState<number | string>(84500);
  const [currency, setCurrency] = useState<string>('INR');
  const [deviceId, setDeviceId] = useState<string>('DEV-781');
  const [ipAddress, setIpAddress] = useState<string>('103.45.12.89');
  const [location, setLocation] = useState<string>('Mumbai');
  const [paymentMethod, setPaymentMethod] = useState<string>('CARD');

  // Execution State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [analyzedResult, setAnalyzedResult] = useState<TransactionItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate a random transaction ID helper
  const handleRandomTxId = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    setTransactionId(`TXN-${randomNum}`);
  };

  // Quick Preset Scenarios for Hackathon / Demonstration
  const loadPresetScenario = (type: 'high-risk' | 'low-risk' | 'review' | 'velocity') => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    if (type === 'high-risk') {
      setCustomerId('CUST-1001');
      setTransactionId(`TXN-92${randomSuffix}`);
      setAmount(84500);
      setCurrency('INR');
      setDeviceId('DEV-781');
      setIpAddress('103.45.12.89');
      setLocation('Mumbai');
      setPaymentMethod('CARD');
    } else if (type === 'low-risk') {
      setCustomerId('CUST-7890');
      setTransactionId(`TXN-10${randomSuffix}`);
      setAmount(1250);
      setCurrency('INR');
      setDeviceId('DEV-TRUSTED-APPLE');
      setIpAddress('122.161.44.20');
      setLocation('Bengaluru');
      setPaymentMethod('UPI');
    } else if (type === 'review') {
      setCustomerId('CUST-4560');
      setTransactionId(`TXN-55${randomSuffix}`);
      setAmount(18400);
      setCurrency('INR');
      setDeviceId('DEV-NEW-ANDROID');
      setIpAddress('117.200.18.5');
      setLocation('Delhi');
      setPaymentMethod('CARD');
    } else if (type === 'velocity') {
      setCustomerId('CUST-9921');
      setTransactionId(`TXN-77${randomSuffix}`);
      setAmount(49999);
      setCurrency('INR');
      setDeviceId('DEV-781');
      setIpAddress('185.220.101.5');
      setLocation('Kolkata');
      setPaymentMethod('NET_BANKING');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || !customerId || !amount) {
      setError('Please fill in Customer ID, Transaction ID, and Amount.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setAnalyzedResult(null);

    // Pipeline step simulation for ultra-responsive feedback
    setPipelineStep(1); // 1. Features extraction
    await new Promise((r) => setTimeout(r, 200));

    setPipelineStep(2); // 2. ML Inference & SHAP
    await new Promise((r) => setTimeout(r, 250));

    setPipelineStep(3); // 3. Network graph & rules
    await new Promise((r) => setTimeout(r, 200));

    try {
      const result = await createAndAnalyzeTransaction({
        transactionId: transactionId.trim(),
        customerId: customerId.trim(),
        amount: Number(amount),
        currency: currency.trim(),
        deviceId: deviceId.trim() || undefined,
        ipAddress: ipAddress.trim() || undefined,
        location: location.trim() || undefined,
        paymentMethod: paymentMethod.trim(),
      });

      setPipelineStep(4); // 4. Decision finalized
      setAnalyzedResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to complete transaction analysis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const decision = analyzedResult?.riskDecision?.decision || analyzedResult?.status;
  const riskScore = analyzedResult?.riskScore?.riskScore ?? 0;
  const fraudProbability = analyzedResult?.riskScore?.fraudProbability ?? 0;
  const expectedLoss = analyzedResult?.riskDecision?.expectedLoss ?? 0;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Merchant Decisioning Sandbox
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-cyan-400 fill-cyan-400/20" />
            Analyze Transaction
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate inbound payment payloads in real-time through the multi-layer AI fraud detection engine.
          </p>
        </div>

        {/* Quick Scenario Buttons */}
        <div className="flex shrink-0 items-center gap-1 flex-nowrap whitespace-nowrap">
          <span className="shrink-0 text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">
            Quick Scenarios:
          </span>
          <button
            type="button"
            onClick={() => loadPresetScenario('high-risk')}
            className="shrink-0 px-1.5 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-all flex items-center gap-1"
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            High-Risk Fraud
          </button>
          <button
            type="button"
            onClick={() => loadPresetScenario('review')}
            className="shrink-0 px-1.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all"
          >
            Suspicious Review
          </button>
          <button
            type="button"
            onClick={() => loadPresetScenario('low-risk')}
            className="shrink-0 px-1.5 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all"
          >
            Legitimate User
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold ml-4">
            &times;
          </button>
        </div>
      )}

      {/* Main Grid: Form on Left, Live Result & Pipeline on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Input Form Panel */}
        <div className="lg:col-span-6 glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Transaction Input Parameters
              </h2>
            </div>
            <button
              type="button"
              onClick={handleRandomTxId}
              className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Generate New ID
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer ID & Transaction ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  Customer ID
                </label>
                <input
                  type="text"
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="e.g. CUST-1001"
                  className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  Transaction ID
                </label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. TXN-92831"
                  className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  Amount
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 84500"
                  className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CircleDollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            {/* Device ID & IP Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  Device ID
                </label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="e.g. DEV-781"
                  className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  IP Address
                </label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="e.g. 103.45.12.89"
                  className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Location & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Location / City
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                >
                  <option value="CARD">CARD (Credit/Debit)</option>
                  <option value="UPI">UPI / Instant Pay</option>
                  <option value="NET_BANKING">NET_BANKING</option>
                  <option value="WALLET">DIGITAL WALLET</option>
                </select>
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-cyan-500/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Running Multi-Layer AI Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Analyze Transaction</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Output & Pipeline Visualizer */}
        <div className="lg:col-span-6 space-y-6">
          {/* Real-time Pipeline Progress Tracker */}
          <div className="glass-panel p-5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Decisioning Pipeline Trace</span>
              <span className="font-mono text-cyan-400">
                {isSubmitting ? 'Processing...' : analyzedResult ? 'Completed in 18ms' : 'Idle'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
              <div
                className={`p-2 rounded-lg border transition-all ${
                  pipelineStep >= 1
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                1. Feature Eng.
              </div>
              <div
                className={`p-2 rounded-lg border transition-all ${
                  pipelineStep >= 2
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                2. ML Model
              </div>
              <div
                className={`p-2 rounded-lg border transition-all ${
                  pipelineStep >= 3
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                3. Graph & Rules
              </div>
              <div
                className={`p-2 rounded-lg border transition-all ${
                  pipelineStep >= 4
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                4. Decision
              </div>
            </div>
          </div>

          {/* Result Card or Placeholder */}
          {analyzedResult ? (
            <div
              className={`glass-panel p-6 space-y-6 border-2 transition-all ${
                decision === 'BLOCK'
                  ? 'border-red-500/40 bg-gradient-to-b from-red-950/20 to-transparent'
                  : decision === 'REVIEW'
                  ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-transparent'
                  : 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-transparent'
              }`}
            >
              {/* Decision Header Banner */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  {decision === 'BLOCK' ? (
                    <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                  ) : decision === 'REVIEW' ? (
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                      Automated Decision Result
                    </div>
                    <div className="text-xl font-black text-white flex items-center gap-2">
                      <span>{decision}</span>
                      <StatusBadge status={decision || 'PENDING'} type="decision" size="sm" />
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Transaction ID</div>
                  <div className="text-xs font-mono font-bold text-cyan-300">
                    {analyzedResult.transactionId}
                  </div>
                </div>
              </div>

              {/* Score Gauges Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-dark-950 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Risk Score
                  </div>
                  <div
                    className={`text-2xl font-black font-mono ${
                      riskScore >= 75
                        ? 'text-red-400'
                        : riskScore >= 30
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {riskScore}
                    <span className="text-xs text-slate-500">/100</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-950 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Fraud Probability
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {(fraudProbability * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-950 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Expected Loss
                  </div>
                  <div className="text-2xl font-black font-mono text-cyan-300">
                    {currency}{' '}
                    {Number(expectedLoss).toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              </div>

              {/* Decision Reason */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Engine Decision Rationale
                </div>
                <div className="text-slate-200 font-mono">
                  {analyzedResult.riskDecision?.reason || 'Calculated via real-time risk pipeline.'}
                </div>
              </div>

              {/* SHAP Factor Breakdown */}
              {analyzedResult.riskScore?.factors && analyzedResult.riskScore.factors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Key Risk Factors (SHAP Contributions)</span>
                    <span className="font-mono text-cyan-400">ML Model Explainability</span>
                  </div>

                  <div className="space-y-2">
                    {analyzedResult.riskScore.factors.map((factor, idx) => (
                      <div
                        key={factor.id || idx}
                        className="p-3 rounded-lg bg-dark-950 border border-slate-800/80 text-xs flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-slate-200 flex items-center gap-2">
                            <span>{factor.feature}</span>
                            <span
                              className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase ${
                                factor.impact === 'high'
                                  ? 'bg-red-500/20 text-red-400'
                                  : factor.impact === 'medium'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {factor.impact}
                            </span>
                          </div>
                          <div className="text-slate-400 text-[11px]">{factor.explanation}</div>
                        </div>

                        {factor.contribution !== undefined && (
                          <div className="text-right font-mono text-xs font-bold text-cyan-300">
                            +{(factor.contribution * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate(`/transactions/${analyzedResult.transactionId}`)}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  View Full Transaction Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/network')}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                  Inspect Fraud Graph
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-10 text-center space-y-4 border border-dashed border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Awaiting Transaction Input</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Fill in the merchant parameters on the left and click{' '}
                  <strong className="text-cyan-400">Analyze Transaction</strong> or select one of the
                  preset scenarios above to see instant AI risk evaluation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
