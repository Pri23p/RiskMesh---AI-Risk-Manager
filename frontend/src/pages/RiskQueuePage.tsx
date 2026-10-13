import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { apiClient } from '../api/client';
import { OrderItem } from '../types';

interface RiskQueuePageProps {
  onSelectOrder: (orderId: string) => void;
}

export const RiskQueuePage: React.FC<RiskQueuePageProps> = ({ onSelectOrder }) => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filter states
  const [search, setSearch] = useState('');
  const [riskLevel, setRiskLevel] = useState<string>('ALL');
  const [paymentMethod, setPaymentMethod] = useState<string>('ALL');
  const [category, setCategory] = useState<string>('ALL');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('risk_score');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getOrders({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        risk_level: riskLevel !== 'ALL' ? riskLevel : undefined,
        payment_method: paymentMethod !== 'ALL' ? paymentMethod : undefined,
        category: category !== 'ALL' ? category : undefined,
        min_amount: minAmount ? parseFloat(minAmount) : undefined,
        max_amount: maxAmount ? parseFloat(maxAmount) : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setOrders(res.orders);
      setTotalRecords(res.total_records);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error('Failed to load orders queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, riskLevel, paymentMethod, category, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleClearFilters = () => {
    setSearch('');
    setRiskLevel('ALL');
    setPaymentMethod('ALL');
    setCategory('ALL');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('risk_score');
    setSortOrder('desc');
    setPage(1);
  };

  const getRiskBadge = (score: number, level: string) => {
    if (level === 'HIGH' || score >= 70) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
          <ShieldAlert className="w-3.5 h-3.5 mr-1" />
          {score}/100 HIGH
        </span>
      );
    } else if (level === 'MEDIUM' || score >= 40) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          {score}/100 MEDIUM
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          {score}/100 LOW
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Merchant Risk Queue</h1>
          <p className="text-sm text-slate-400">
            Real-time defensive triage of transactions with AI explainability scores
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchOrders}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order ID, Customer ID, or Device ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Risk Level Filter */}
            <select
              value={riskLevel}
              onChange={(e) => {
                setRiskLevel(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">🔴 High Risk (70-100)</option>
              <option value="MEDIUM">🟡 Medium Risk (40-69)</option>
              <option value="LOW">🟢 Low Risk (0-39)</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
              <option value="UPI">UPI</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Buy Now Pay Later (BNPL)">Buy Now Pay Later (BNPL)</option>
            </select>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="Electronics & Gadgets">Electronics & Gadgets</option>
              <option value="Apparel & Footwear">Apparel & Footwear</option>
              <option value="Luxury Watches & Jewelry">Luxury Watches & Jewelry</option>
              <option value="Home Appliances">Home Appliances</option>
              <option value="Beauty & Personal Care">Beauty & Personal Care</option>
            </select>

            {/* Sort Filter */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="risk_score-desc">Highest Risk First</option>
              <option value="risk_score-asc">Lowest Risk First</option>
              <option value="order_amount-desc">Highest Value First</option>
              <option value="order_amount-asc">Lowest Value First</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Orders Table */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Risk Score</th>
                <th className="py-3.5 px-4">Primary Factor</th>
                <th className="py-3.5 px-4">Recommended Action</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Loading risk queue...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No orders matching your criteria found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.order_id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectOrder(order.order_id)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 group-hover:text-indigo-300">
                      {order.order_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">{order.customer_id}</div>
                      <div className="text-[10px] text-slate-500">{order.payment_method}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      ₹{order.order_amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {getRiskBadge(order.risk_score, order.risk_level)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                      {order.primary_risk_factor}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {order.recommended_action}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                        order.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        order.status === 'Request Verification' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' :
                        order.status === 'Reject Refund' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOrder(order.order_id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-3 border-t border-slate-800">
          <div>
            Showing <span className="text-white font-semibold">{orders.length}</span> of{' '}
            <span className="text-white font-semibold">{totalRecords.toLocaleString()}</span> orders (Page{' '}
            <span className="text-white font-semibold">{page}</span> of{' '}
            <span className="text-white font-semibold">{totalPages}</span>)
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 rounded bg-slate-950 font-mono text-slate-300">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
