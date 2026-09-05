import React, { useState } from 'react';
import {
  PackageX,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

interface ReturnAssessment {
  score: number;
  decision: 'INSTANT_REFUND' | 'INSPECT_FIRST' | 'REJECT_REFUND' | 'REQUIRE_VIDEO_EVIDENCE';
  fraudType: string;
  expectedLossSaved: number;
  factors: Array<{ label: string; impact: 'high' | 'medium' | 'low'; description: string }>;
}

export const ReturnRiskScorerPage: React.FC = () => {
  // Input fields
  const [customerId, setCustomerId] = useState<string>('CUST-8812');
  const [orderAmount, setOrderAmount] = useState<number>(45990);
  const [itemCategory, setItemCategory] = useState<string>('ELECTRONICS');
  const [returnReason, setReturnReason] = useState<string>('EMPTY_BOX');
  const [accountAgeDays, setAccountAgeDays] = useState<number>(12);
  const [historicalReturns, setHistoricalReturns] = useState<number>(7);
  const [totalOrders, setTotalOrders] = useState<number>(9);
  const [daysSinceDelivery, setDaysSinceDelivery] = useState<number>(1);

  // Result state
  const [assessment, setAssessment] = useState<ReturnAssessment | null>({
    score: 91,
    decision: 'REQUIRE_VIDEO_EVIDENCE',
    fraudType: 'Organized Empty-Box / Serial Refund Abuse',
    expectedLossSaved: 45990,
    factors: [
      {
        label: 'Excessive Return Ratio',
        impact: 'high',
        description: '77.8% historical return rate (7 returns out of 9 total orders).',
      },
      {
        label: 'High-Value Empty Box Claim',
        impact: 'high',
        description: 'Electronics item (₹45,990) claimed empty within 24h of delivery.',
      },
      {
        label: 'Young Account Profile',
        impact: 'medium',
        description: 'Account created 12 days ago with high-ticket velocity.',
      },
    ],
  });

  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const loadPreset = (preset: 'serial' | 'wardrobing' | 'legit') => {
    if (preset === 'serial') {
      setCustomerId('CUST-8812');
      setOrderAmount(45990);
      setItemCategory('ELECTRONICS');
      setReturnReason('EMPTY_BOX');
      setAccountAgeDays(12);
      setHistoricalReturns(7);
      setTotalOrders(9);
      setDaysSinceDelivery(1);
    } else if (preset === 'wardrobing') {
      setCustomerId('CUST-4029');
      setOrderAmount(18500);
      setItemCategory('LUXURY_APPAREL');
      setReturnReason('SIZE_FIT');
      setAccountAgeDays(45);
      setHistoricalReturns(4);
      setTotalOrders(6);
      setDaysSinceDelivery(13); // Returned on day 13/14
    } else if (preset === 'legit') {
      setCustomerId('CUST-1092');
      setOrderAmount(2800);
      setItemCategory('HOME_GOODS');
      setReturnReason('DEFECTIVE');
      setAccountAgeDays(620);
      setHistoricalReturns(1);
      setTotalOrders(34);
      setDaysSinceDelivery(3);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEvaluating(true);
    await new Promise((r) => setTimeout(r, 400));

    const returnRate = totalOrders > 0 ? (historicalReturns / totalOrders) * 100 : 0;
    const isElectronicsOrLuxury = itemCategory === 'ELECTRONICS' || itemCategory === 'LUXURY_APPAREL';
    const isEmptyBox = returnReason === 'EMPTY_BOX';

    let score = 15;
    if (returnRate > 50) score += 35;
    if (isEmptyBox) score += 30;
    if (isElectronicsOrLuxury && orderAmount > 20000) score += 20;
    if (accountAgeDays < 30) score += 10;
    if (daysSinceDelivery > 10 && itemCategory === 'LUXURY_APPAREL') score += 25; // Wardrobing signal

    score = Math.min(score, 98);

    let decision: ReturnAssessment['decision'] = 'INSTANT_REFUND';
    let fraudType = 'Low Risk Clean Return';

    if (score >= 75) {
      decision = isEmptyBox ? 'REQUIRE_VIDEO_EVIDENCE' : 'REJECT_REFUND';
      fraudType = isEmptyBox ? 'Organized Empty-Box / Serial Refund Abuse' : 'Serial Return Abuser';
    } else if (score >= 40) {
      decision = 'INSPECT_FIRST';
      fraudType = itemCategory === 'LUXURY_APPAREL' ? 'Potential Wardrobing (Wear & Return)' : 'Elevated Return Frequency';
    }

    setAssessment({
      score,
      decision,
      fraudType,
      expectedLossSaved: Number(orderAmount),
      factors: [
        {
          label: 'Customer Return Ratio',
          impact: returnRate > 40 ? 'high' : 'low',
          description: `${returnRate.toFixed(1)}% return frequency (${historicalReturns} of ${totalOrders} orders).`,
        },
        {
          label: 'Category & Claim Vector',
          impact: isEmptyBox || isElectronicsOrLuxury ? 'high' : 'medium',
          description: `${itemCategory} claimed with reason '${returnReason}'.`,
        },
        {
          label: 'Account History',
          impact: accountAgeDays < 60 ? 'medium' : 'low',
          description: `${accountAgeDays} days account tenure.`,
        },
      ],
    });

    setIsEvaluating(false);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              AI Direction 2 &bull; E-Commerce Protection
            </span>
            <span className="text-xs text-slate-500 font-mono">Wardrobing &bull; Empty-Box Prevention</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <PackageX className="w-6 h-6 text-purple-400" />
            Return-Risk Scorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Predicts return abuse, wardrobing, and serial refund claims before issuing payouts, protecting merchant operating margins.
          </p>
        </div>

        {/* Preset Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => loadPreset('serial')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-all"
          >
            Empty-Box Syndicate
          </button>
          <button
            type="button"
            onClick={() => loadPreset('wardrobing')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all"
          >
            Apparel Wardrobing
          </button>
          <button
            type="button"
            onClick={() => loadPreset('legit')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all"
          >
            Legitimate Buyer
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Inputs (6 Cols) */}
        <div className="lg:col-span-6 glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Return Claim Parameters
              </h2>
            </div>
          </div>

          <form onSubmit={handleEvaluate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Customer ID
                </label>
                <input
                  type="text"
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Order Value (INR ₹)
                </label>
                <input
                  type="number"
                  required
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Item Category
                </label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-400"
                >
                  <option value="ELECTRONICS">High-Value Electronics (Smartphones/Laptops)</option>
                  <option value="LUXURY_APPAREL">Luxury Apparel & Designer Wear</option>
                  <option value="BEAUTY">Beauty & Cosmetics</option>
                  <option value="HOME_GOODS">Home Goods & Appliances</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1.5">
                  Claimed Reason
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-950/80 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-400"
                >
                  <option value="EMPTY_BOX">Box Empty / Missing Contents</option>
                  <option value="DEFECTIVE">Item Defective / Not Functioning</option>
                  <option value="WRONG_ITEM">Wrong Item in Package</option>
                  <option value="SIZE_FIT">Size / Fit Unsuitable</option>
                </select>
              </div>
            </div>

            {/* Shopper Track Record */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Past Returns
                </label>
                <input
                  type="number"
                  value={historicalReturns}
                  onChange={(e) => setHistoricalReturns(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs font-mono text-white text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Total Orders
                </label>
                <input
                  type="number"
                  value={totalOrders}
                  onChange={(e) => setTotalOrders(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs font-mono text-white text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Claim Window (Days)
                </label>
                <input
                  type="number"
                  value={daysSinceDelivery}
                  onChange={(e) => setDaysSinceDelivery(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-xs font-mono text-white text-center"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isEvaluating}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>{isEvaluating ? 'Evaluating Risk Model...' : 'Score Return Claim'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Risk Assessment Result (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          {assessment ? (
            <div
              className={`glass-panel p-6 space-y-6 border-2 transition-all ${
                assessment.score >= 75
                  ? 'border-red-500/40 bg-gradient-to-b from-red-950/20 to-transparent'
                  : assessment.score >= 40
                  ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-transparent'
                  : 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-transparent'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      assessment.score >= 75
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : assessment.score >= 40
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {assessment.score >= 75 ? (
                      <ShieldAlert className="w-7 h-7" />
                    ) : assessment.score >= 40 ? (
                      <AlertTriangle className="w-7 h-7" />
                    ) : (
                      <ShieldCheck className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Return Decision Policy
                    </div>
                    <div className="text-base font-black text-white font-mono">
                      {assessment.decision.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Return Risk Score</div>
                  <div
                    className={`text-2xl font-black font-mono ${
                      assessment.score >= 75
                        ? 'text-red-400'
                        : assessment.score >= 40
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {assessment.score}/100
                  </div>
                </div>
              </div>

              {/* Diagnosis Banner */}
              <div className="p-3.5 rounded-xl bg-dark-950 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">AI Diagnosis Pattern</div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>{assessment.fraudType}</span>
                </div>
              </div>

              {/* Contributing Signals */}
              <div className="space-y-2">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Risk Signal Contributors
                </div>
                {assessment.factors.map((f, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-dark-950 border border-slate-800/80 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-200">{f.label}</div>
                      <div className="text-[11px] text-slate-400">{f.description}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        f.impact === 'high'
                          ? 'bg-red-500/20 text-red-400'
                          : f.impact === 'medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {f.impact}
                    </span>
                  </div>
                ))}
              </div>

              {/* Automated Protection Action */}
              <div className="pt-2">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200 flex items-center justify-between">
                  <span>Protected Merchant Margin:</span>
                  <span className="font-mono font-bold text-white">
                    ₹{assessment.expectedLossSaved.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
