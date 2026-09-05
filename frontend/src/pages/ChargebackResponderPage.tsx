import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  Award,
  Clock,
  Send,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface ChargebackCase {
  id: string;
  disputeId: string;
  transactionId: string;
  customerId: string;
  amount: number;
  currency: string;
  reasonCode: string;
  reasonDescription: string;
  network: string;
  deadlineDays: number;
  status: 'ACTION_REQUIRED' | 'EVIDENCE_GENERATED' | 'SUBMITTED' | 'WON';
  winProbability: number;
}

export const ChargebackResponderPage: React.FC = () => {
  const [cases] = useState<ChargebackCase[]>([
    {
      id: 'cb-1',
      disputeId: 'DSP-88219',
      transactionId: 'TXN-92831',
      customerId: 'CUST-1001',
      amount: 84500,
      currency: 'INR',
      reasonCode: '10.4',
      reasonDescription: 'Fraudulent Transaction - Card Not Present (Friendly Fraud)',
      network: 'VISA',
      deadlineDays: 3,
      status: 'ACTION_REQUIRED',
      winProbability: 88,
    },
    {
      id: 'cb-2',
      disputeId: 'DSP-77104',
      transactionId: 'TXN-40192',
      customerId: 'CUST-3902',
      amount: 24900,
      currency: 'INR',
      reasonCode: '13.1',
      reasonDescription: 'Merchandise Not Received (False Delivery Dispute)',
      network: 'MASTERCARD',
      deadlineDays: 6,
      status: 'ACTION_REQUIRED',
      winProbability: 92,
    },
    {
      id: 'cb-3',
      disputeId: 'DSP-66281',
      transactionId: 'TXN-11920',
      customerId: 'CUST-8812',
      amount: 14200,
      currency: 'INR',
      reasonCode: '10.3',
      reasonDescription: 'Other Fraud - Unrecognized Card Billing',
      network: 'RUPAY',
      deadlineDays: 8,
      status: 'WON',
      winProbability: 95,
    },
  ]);

  const [selectedCase, setSelectedCase] = useState<ChargebackCase>(cases[0]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleGeneratePacket = async () => {
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsGenerating(false);
  };

  const handleCopyLetter = () => {
    const letter = `FORMAL CHARGEBACK REBUTTAL & EVIDENCE PACKET
Case Ref: ${selectedCase.disputeId} | Transaction: ${selectedCase.transactionId}
Merchant: RiskMesh Enterprise Store
Dispute Amount: ${selectedCase.currency} ${selectedCase.amount.toLocaleString()}
Reason Code: ${selectedCase.reasonCode} (${selectedCase.reasonDescription})

EVIDENCE SUMMARY:
1. Cardholder Authentication: 3D Secure 2.0 Liability Shift (SCA Authenticated, ECI: 05, Cryptogram Verified).
2. Hardware Footprint: Device ID verified matching past authorized logins (SHA-256: 8f9b2...7a1).
3. Network Telemetry: IP Geo-Location matched customer verified delivery address (Mumbai, India).
4. Fulfillment Proof: Carrier Proof of Delivery confirmed with digital OTP acknowledgement.

CONCLUSION:
The cardholder authenticated the transaction via Two-Factor Authentication. Liability rests with the card issuer per payment scheme rules. We request immediate dispute dismissal.`;

    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AI Direction 1 &bull; Automated Defense
            </span>
            <span className="text-xs text-slate-500 font-mono">Liability Shift &bull; Win Rate 89%+</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-400" />
            Chargeback Evidence Responder
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automatically synthesizes digital telemetry, 3DS authentication proofs, and formal rebuttal letters to overturn fraudulent chargebacks.
          </p>
        </div>

        <button
          onClick={handleGeneratePacket}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all self-start md:self-auto disabled:opacity-50"
        >
          {isGenerating ? (
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Sparkles className="w-4 h-4 text-white" />
          )}
          <span>{isGenerating ? 'Synthesizing Evidence...' : 'Re-Generate AI Evidence Packet'}</span>
        </button>
      </div>

      {/* Case Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cases.map((c) => {
          const isSelected = selectedCase.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedCase(c)}
              className={`glass-panel p-4 cursor-pointer transition-all border-2 ${
                isSelected
                  ? 'border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/40'
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-cyan-300">{c.disputeId}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  {c.network}
                </span>
              </div>

              <div className="text-sm font-black text-white mb-1">
                {c.currency} {c.amount.toLocaleString()}
              </div>

              <div className="text-[11px] text-slate-400 mb-3 line-clamp-1">
                Code {c.reasonCode}: {c.reasonDescription}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                <span className="text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {c.deadlineDays}d deadline
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {c.winProbability}% Win Likelihood
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Evidence Dossier & Rebuttal Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Evidence Telemetry Breakdown (7 Cols) */}
        <div className="lg:col-span-7 glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Automated Dispute Evidence Dossier
              </h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-400">
              <span>Win Likelihood:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40">
                {selectedCase.winProbability}%
              </span>
            </div>
          </div>

          {/* Evidence Pillars Grid */}
          <div className="space-y-3">
            {/* 1. 3DS Authentication */}
            <div className="p-4 rounded-xl bg-dark-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">
                    1. 3D Secure 2.0 & SCA Liability Shift
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                  VERIFIED SHIFT
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Cardholder successfully completed OTP challenge verification (ECI: 05). Card issuer holds primary liability under Visa/Mastercard Core Rules.
              </p>
              <div className="p-2 rounded bg-slate-900 font-mono text-[10px] text-slate-300">
                CAVV / Cryptogram: <span className="text-cyan-400">AAABBBkAAAAACCCDAAAAACAAAAA=</span> &bull; Status: Authenticated
              </div>
            </div>

            {/* 2. Device Fingerprint & Telemetry */}
            <div className="p-4 rounded-xl bg-dark-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200">
                    2. Device & Network Digital Footprint
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                  MATCH CONFIRMED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Device hardware hash matched customer's regular profile. IP address (103.45.12.89) geolocated to cardholder's primary residential zone.
              </p>
              <div className="p-2 rounded bg-slate-900 font-mono text-[10px] text-slate-300 flex items-center justify-between">
                <span>Device Fingerprint: DEV-781 (Apple WebKit / Safari 17.2)</span>
                <span className="text-emerald-400 font-bold">100% Match</span>
              </div>
            </div>

            {/* 3. Delivery & Fulfillment Confirmation */}
            <div className="p-4 rounded-xl bg-dark-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">
                    3. Proof of Delivery & Service Log
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                  OTP CONFIRMED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Carrier BlueDart delivered to billing address with recipient delivery OTP confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* Right: AI Formal Representation Letter (5 Cols) */}
        <div className="lg:col-span-5 glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Formal Representation Letter
              </h2>
            </div>
            <button
              onClick={handleCopyLetter}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Letter'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-dark-950 border border-slate-800 text-[11px] font-mono leading-relaxed text-slate-300 space-y-3 max-h-[380px] overflow-y-auto">
            <p className="font-bold text-white border-b border-slate-800 pb-2">
              TO: {selectedCase.network} DISPUTE RESOLUTION BOARD<br />
              RE: Dispute ID {selectedCase.disputeId} &bull; TXN {selectedCase.transactionId}
            </p>
            <p>
              Dear Dispute Resolution Specialist,
            </p>
            <p>
              We are contesting Dispute <strong>{selectedCase.disputeId}</strong> for <strong>{selectedCase.currency} {selectedCase.amount.toLocaleString()}</strong> under reason code <strong>{selectedCase.reasonCode}</strong>.
            </p>
            <p>
              The transaction was authorized with full <strong>3-D Secure 2.0 Strong Customer Authentication</strong>. The cardholder completed dynamic OTP verification, fulfilling European and RBI regulatory requirements and shifting financial liability to the issuing bank.
            </p>
            <p>
              Digital device telemetry confirms hardware hash <code>DEV-781</code> was used from verified IP <code>103.45.12.89</code> matching prior verified customer activity. Delivery fulfillment is confirmed with carrier tracking logs.
            </p>
            <p className="text-emerald-400 font-bold">
              We respectfully request an immediate reversal of this chargeback in favor of the merchant.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleCopyLetter}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-white" />
              <span>Submit Rebuttal to Razorpay Dispute API</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
