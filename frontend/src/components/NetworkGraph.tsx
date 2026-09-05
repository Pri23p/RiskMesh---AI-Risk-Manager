import React, { useState, useMemo } from 'react';
import {
  NetworkNodeItem,
  NetworkLinkItem,
  NetworkSignalsItem,
} from '../api/client';
import {
  User,
  Smartphone,
  Globe,
  CreditCard,
  Zap,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';


interface NetworkGraphProps {
  nodes: NetworkNodeItem[];
  links: NetworkLinkItem[];
  signals?: NetworkSignalsItem;
  onNodeClick?: (node: NetworkNodeItem) => void;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  links,
  signals,
  onNodeClick,
}) => {
  const [selectedNode, setSelectedNode] = useState<NetworkNodeItem | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [zoom, setZoom] = useState<number>(1);

  // Compute 2D node coordinates using deterministic radial/force distribution
  const graphPositions = useMemo(() => {
    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    const positions: Record<string, { x: number; y: number; node: NetworkNodeItem }> = {};

    // 1. Locate Origin Customer in center
    const originNode = nodes.find((n) => n.isOrigin) || nodes[0];
    if (originNode) {
      positions[originNode.id] = { x: centerX, y: centerY, node: originNode };
    }

    // 2. Group nodes by type for organized concentric rings
    const devices = nodes.filter((n) => n.type === 'DEVICE');
    const ips = nodes.filter((n) => n.type === 'IP');
    const transactions = nodes.filter((n) => n.type === 'TRANSACTION');
    const otherCustomers = nodes.filter((n) => n.type === 'CUSTOMER' && !n.isOrigin);
    const payments = nodes.filter((n) => n.type === 'PAYMENT_INSTRUMENT');

    // Ring 1: Transactions (Radius ~130)
    transactions.forEach((tx, idx) => {
      const angle = (idx / Math.max(1, transactions.length)) * 2 * Math.PI - Math.PI / 2;
      const radius = 130 + (idx % 2 === 0 ? 0 : 25);
      positions[tx.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        node: tx,
      };
    });

    // Ring 2: Devices & IPs (Radius ~230)
    const hardwareAndIps = [...devices, ...ips];
    hardwareAndIps.forEach((item, idx) => {
      const angle = (idx / Math.max(1, hardwareAndIps.length)) * 2 * Math.PI - Math.PI / 4;
      const radius = 230 + (idx % 2 === 0 ? -15 : 20);
      positions[item.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        node: item,
      };
    });

    // Ring 3: Connected Customers & Payments (Radius ~320)
    const outerRing = [...otherCustomers, ...payments];
    outerRing.forEach((item, idx) => {
      const angle = (idx / Math.max(1, outerRing.length)) * 2 * Math.PI;
      const radius = 320 + (idx % 2 === 0 ? 0 : 20);
      positions[item.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        node: item,
      };
    });

    return positions;
  }, [nodes]);

  const handleSelect = (node: NetworkNodeItem) => {
    setSelectedNode(node);
    if (onNodeClick) onNodeClick(node);
  };

  const getNodeIcon = (type: NetworkNodeItem['type']) => {

    switch (type) {
      case 'CUSTOMER':
        return <User className="w-4 h-4" />;
      case 'DEVICE':
        return <Smartphone className="w-4 h-4" />;
      case 'IP':
        return <Globe className="w-4 h-4" />;
      case 'PAYMENT_INSTRUMENT':
        return <CreditCard className="w-4 h-4" />;
      case 'TRANSACTION':
        return <Zap className="w-4 h-4" />;
    }
  };

  const filteredNodes = useMemo(() => {
    if (filterType === 'ALL') return nodes;
    return nodes.filter((n) => n.type === filterType);
  }, [nodes, filterType]);

  return (
    <div className="relative glass-panel overflow-hidden border border-slate-800 rounded-2xl bg-dark-950/80 flex flex-col">
      {/* Top Graph Controls Bar */}
      <div className="p-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-dark-900/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Entity Relationship Topology ({nodes.length} Nodes &bull; {links.length} Links)
            </h3>
          </div>
          {signals?.isHighRiskRing && (
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1 animate-pulse">
              <ShieldAlert className="w-3 h-3" />
              Syndicate Ring Suspected
            </span>
          )}
        </div>

        {/* Filter Tabs & Zoom Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-dark-950/90 rounded-lg p-1 border border-slate-800 text-xs">
            {(['ALL', 'CUSTOMER', 'DEVICE', 'IP', 'TRANSACTION'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterType === type
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-dark-950/90 rounded-lg p-1 border border-slate-800">
            <button
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas SVG Area */}
      <div className="relative w-full h-[520px] overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] flex items-center justify-center">
        <svg
          viewBox="0 0 800 500"
          className="w-full h-full transition-transform duration-300 select-none"
          style={{ transform: `scale(${zoom})` }}
        >
          <defs>
            {/* Glow filters for high risk nodes */}
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Links Lines */}
          <g className="links">
            {links.map((link) => {
              const src = graphPositions[link.source];
              const tgt = graphPositions[link.target];
              if (!src || !tgt) return null;

              const isHighlighted =
                selectedNode &&
                (link.source === selectedNode.id || link.target === selectedNode.id);

              const strokeColor = isHighlighted
                ? '#38bdf8'
                : link.weight > 1
                ? '#f43f5e'
                : '#334155';

              return (
                <g key={link.id}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={strokeColor}
                    strokeWidth={isHighlighted ? 2.5 : link.weight > 1 ? 2 : 1.2}
                    strokeDasharray={link.weight > 1 ? '4 2' : undefined}
                    opacity={isHighlighted ? 1 : 0.65}
                  />
                  {link.label && (
                    <text
                      x={(src.x + tgt.x) / 2}
                      y={(src.y + tgt.y) / 2 - 4}
                      fill="#64748b"
                      fontSize="9"
                      textAnchor="middle"
                      className="font-mono font-medium pointer-events-none"
                    >
                      {link.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Nodes Circles & Glyphs */}
          <g className="nodes">
            {filteredNodes.map((node) => {
              const pos = graphPositions[node.id];
              if (!pos) return null;

              const isSelected = selectedNode?.id === node.id;
              const isOrigin = node.isOrigin;
              const nodeRadius = isOrigin ? 26 : node.type === 'CUSTOMER' ? 22 : 18;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => handleSelect(node)}
                  className="cursor-pointer group"
                >
                  {/* Outer Pulsing Ring if Origin or Critical */}
                  {(isOrigin || node.riskLevel === 'CRITICAL') && (
                    <circle
                      r={nodeRadius + 6}
                      fill="none"
                      stroke={isOrigin ? '#06b6d4' : '#f43f5e'}
                      strokeWidth="1.5"
                      opacity="0.4"
                      className="animate-ping"
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={nodeRadius}
                    fill={
                      isOrigin
                        ? '#082f49'
                        : node.riskLevel === 'CRITICAL'
                        ? '#4c0519'
                        : node.riskLevel === 'HIGH'
                        ? '#451a03'
                        : '#0f172a'
                    }
                    stroke={
                      isSelected
                        ? '#38bdf8'
                        : isOrigin
                        ? '#06b6d4'
                        : node.riskLevel === 'CRITICAL'
                        ? '#f43f5e'
                        : node.riskLevel === 'HIGH'
                        ? '#f59e0b'
                        : '#10b981'
                    }
                    strokeWidth={isSelected ? 3 : 2}
                    filter={node.riskLevel === 'CRITICAL' ? 'url(#glow-red)' : undefined}
                    className="transition-all duration-200 group-hover:stroke-cyan-300"
                  />

                  {/* Icon label */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#f8fafc"
                    fontSize={isOrigin ? '13' : '11'}
                    className="font-bold pointer-events-none select-none font-mono"
                  >
                    {node.type === 'CUSTOMER'
                      ? '👤'
                      : node.type === 'DEVICE'
                      ? '📱'
                      : node.type === 'IP'
                      ? '🌐'
                      : node.type === 'PAYMENT_INSTRUMENT'
                      ? '💳'
                      : '⚡'}
                  </text>

                  {/* Node Label Text */}
                  <text
                    y={nodeRadius + 14}
                    textAnchor="middle"
                    fill={isSelected ? '#38bdf8' : '#cbd5e1'}
                    fontSize="10"
                    className="font-mono font-semibold pointer-events-none select-none"
                  >
                    {node.label.length > 14 ? `${node.label.substring(0, 12)}…` : node.label}
                  </text>

                  {/* Sub-label */}
                  {node.subLabel && (
                    <text
                      y={nodeRadius + 25}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="8"
                      className="font-mono pointer-events-none select-none"
                    >
                      {node.subLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 glass-panel p-4 bg-dark-900/95 border border-cyan-500/30 shadow-2xl rounded-xl space-y-3 z-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  {getNodeIcon(selectedNode.type)}
                  <span>{selectedNode.type}</span>
                </span>
                {selectedNode.isOrigin && (
                  <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 text-[10px] font-bold rounded">
                    Target
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white text-xs font-mono font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="text-white font-bold break-all">{selectedNode.label}</div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Risk Level:</span>
                <span
                  className={`font-bold ${
                    selectedNode.riskLevel === 'CRITICAL'
                      ? 'text-rose-400'
                      : selectedNode.riskLevel === 'HIGH'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {selectedNode.riskLevel}
                </span>
              </div>

              {selectedNode.metadata &&
                Object.entries(selectedNode.metadata).map(([key, val]) => {
                  if (val === undefined || val === null) return null;
                  return (
                    <div key={key} className="flex justify-between items-center text-slate-400">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="text-slate-200 font-semibold">{String(val)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Network Signals KPI Strip Footer */}
      {signals && (
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px]">Shared Devices</span>
            <div className="text-white font-bold text-base flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>{signals.sharedDeviceCount}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px]">Shared IPs</span>
            <div className="text-white font-bold text-base flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>{signals.sharedIpCount}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px]">Flagged Connections</span>
            <div
              className={`font-bold text-base flex items-center gap-1.5 ${
                signals.flaggedAccountConnections > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{signals.flaggedAccountConnections} Accounts</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px]">Network Risk Index</span>
            <div
              className={`font-bold text-base flex items-center gap-1.5 ${
                signals.networkRiskScore >= 65
                  ? 'text-rose-400'
                  : signals.networkRiskScore >= 35
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              <span>{signals.networkRiskScore} / 100</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
