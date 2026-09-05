import React, { useState } from 'react';
import {
  TrendingUp,
  ShieldAlert,
  Activity,
  Lock,
  Flame,
} from 'lucide-react';

interface SpikeThreat {
  id: string;
  type: 'CARD_TESTING_BOT' | 'CREDENTIAL_STUFFING' | 'GEO_VELOCITY_BURST' | 'NORMAL';
  title: string;
  intensity: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'NORMAL';
  currentVelocity: number; // req/min
  baselineVelocity: number;
  ipClusterCount: number;
  automatedMitigation: string;
}

export const SpikeDetectorPage: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<
    'CARD_TESTING' | 'CREDENTIAL_STUFFING' | 'FLASH_SALE' | 'NORMAL'
  >('CARD_TESTING');

  const [threat, setThreat] = useState<SpikeThreat>({
    id: 'thr-1',
    type: 'CARD_TESTING_BOT',
    title: 'Distributed Card-Testing Bot Wave',
    intensity: 'CRITICAL',
    currentVelocity: 340,
    baselineVelocity: 24,
    ipClusterCount: 42,
    automatedMitigation: 'Dynamic CAPTCHA & Adaptive Rate Limit (10 req/IP/min) Engaged',
  });

  const [livePoints, setLivePoints] = useState<number[]>([
    24, 22, 28, 25, 30, 45, 120, 260, 340, 310, 325, 340,
  ]);

  const setScenario = (scenario: typeof activeScenario) => {
    setActiveScenario(scenario);
    if (scenario === 'CARD_TESTING') {
      setThreat({
        id: 'thr-1',
        type: 'CARD_TESTING_BOT',
        title: 'Distributed Card-Testing Bot Attack',
        intensity: 'CRITICAL',
        currentVelocity: 340,
        baselineVelocity: 24,
        ipClusterCount: 42,
        automatedMitigation: 'Adaptive Subnet Block & 3DS Step-up Enforced for BIN Range 4111xx',
      });
      setLivePoints([24, 25, 28, 45, 110, 240, 310, 340, 320, 335, 340]);
    } else if (scenario === 'CREDENTIAL_STUFFING') {
      setThreat({
        id: 'thr-2',
        type: 'CREDENTIAL_STUFFING',
        title: 'Coordinated Account Takeover Surge',
        intensity: 'HIGH',
        currentVelocity: 195,
        baselineVelocity: 24,
        ipClusterCount: 18,
        automatedMitigation: 'Device Fingerprint Token Invalidation & MFA Challenge Triggered',
      });
      setLivePoints([24, 26, 30, 60, 120, 180, 195, 190, 185, 195]);
    } else if (scenario === 'FLASH_SALE') {
      setThreat({
        id: 'thr-3',
        type: 'NORMAL',
        title: 'Legitimate Flash Sale Volume Surge (Benign)',
        intensity: 'ELEVATED',
        currentVelocity: 160,
        baselineVelocity: 24,
        ipClusterCount: 155,
        automatedMitigation: 'Decision Engine Throughput Auto-Scaled & Zero False-Positive Guard Active',
      });
      setLivePoints([24, 30, 50, 90, 130, 150, 160, 155, 160]);
    } else {
      setThreat({
        id: 'thr-4',
        type: 'NORMAL',
        title: 'Normal Operational Flow',
        intensity: 'NORMAL',
        currentVelocity: 26,
        baselineVelocity: 24,
        ipClusterCount: 3,
        automatedMitigation: 'Baseline ML Continuous Stream Active',
      });
      setLivePoints([24, 25, 26, 23, 27, 24, 26, 25, 26]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
              AI Direction 3 &bull; Velocity & Bot Defense
            </span>
            <span className="text-xs text-slate-500 font-mono">Real-Time Anomaly & DDoS Ingestion</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-red-400" />
            Fraud-Spike Detector
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Detects real-time velocity surges, distributed card-testing bot attacks, and automated attack waves before merchant gateway limits trip.
          </p>
        </div>

        {/* Scenarios Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Simulate Attack:</span>
          <button
            onClick={() => setScenario('CARD_TESTING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeScenario === 'CARD_TESTING'
                ? 'bg-red-500/20 text-red-300 border border-red-500/50 shadow-md shadow-red-950/50'
                : 'bg-dark-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            Card-Testing Bot Wave
          </button>
          <button
            onClick={() => setScenario('CREDENTIAL_STUFFING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeScenario === 'CREDENTIAL_STUFFING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-dark-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Account Takeover Surge
          </button>
          <button
            onClick={() => setScenario('FLASH_SALE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeScenario === 'FLASH_SALE'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'bg-dark-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Benign Flash Sale
          </button>
          <button
            onClick={() => setScenario('NORMAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeScenario === 'NORMAL'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'bg-dark-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Normal Baseline
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Current Ingestion Rate</div>
          <div className="text-2xl font-black font-mono text-white flex items-center gap-2">
            <span>{threat.currentVelocity}</span>
            <span className="text-xs text-slate-400 font-normal">tx/min</span>
          </div>
          <div className="text-[11px] text-red-400 font-mono mt-1">
            +{(threat.currentVelocity / threat.baselineVelocity).toFixed(1)}x normal baseline
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Threat Status</div>
          <div className="text-2xl font-black font-mono">
            <span
              className={`px-2 py-0.5 rounded text-sm ${
                threat.intensity === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : threat.intensity === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {threat.intensity}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{threat.title}</div>
        </div>

        <div className="glass-panel p-4">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Active IP Clusters</div>
          <div className="text-2xl font-black font-mono text-cyan-300">
            {threat.ipClusterCount} Subnets
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Datacenter proxy nodes</div>
        </div>

        <div className="glass-panel p-4">
          <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Defense Automation</div>
          <div className="text-2xl font-black font-mono text-emerald-400 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            <span>ACTIVE</span>
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1">Zero-touch mitigation</div>
        </div>
      </div>

      {/* Visual Velocity Waveform & Live Mitigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Waveform Chart (7 Cols) */}
        <div className="lg:col-span-7 glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Real-Time Payment Velocity Waveform (Last 120s)
              </h2>
            </div>
            <div className="text-[11px] font-mono text-cyan-400">1-Second Window</div>
          </div>

          {/* Simulated CSS Bar Chart */}
          <div className="h-48 flex items-end gap-2 pt-6 pb-2 px-2 bg-dark-950 rounded-xl border border-slate-800">
            {livePoints.map((val, idx) => {
              const heightPct = Math.min(Math.max((val / 360) * 100, 8), 100);
              const isSpike = val > 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${
                      isSpike
                        ? 'bg-gradient-to-t from-red-600 to-red-400 shadow-lg shadow-red-500/30'
                        : 'bg-gradient-to-t from-cyan-600 to-cyan-400'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-500">{val}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-cyan-400" />
              Normal Baseline (24 tx/min)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-red-400" />
              Spike Threshold (&gt;100 tx/min)
            </span>
          </div>
        </div>

        {/* Live Attack Vector Details & Dynamic Rules (5 Cols) */}
        <div className="lg:col-span-5 glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Automated Defense Enforcement
              </h2>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-dark-950 border border-slate-800 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Triggered Mitigation</div>
              <div className="text-xs font-mono text-emerald-300 font-bold">
                {threat.automatedMitigation}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-dark-950 border border-slate-800 space-y-2 text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400">Active Protective Measures</div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span>1. IP Rate Limiter:</span>
                  <span className="text-emerald-400 font-bold">10 req / 60s</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>2. 3DS Step-Up Challenge:</span>
                  <span className="text-amber-400 font-bold">100% Mandatory</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>3. Bot Fingerprint Check:</span>
                  <span className="text-purple-400 font-bold">TLS Ja3 Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
