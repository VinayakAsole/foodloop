import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getSellerOrders, getSellerFoods } from '../../firebase/firestore';
import TiltCard from '../../components/TiltCard';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  BarChart3,
  Users,
  RefreshCw,
  ArrowUpRight,
  Clock,
  Star,
  ChefHat,
  Flame,
  UserCheck,
  UserPlus,
  Award,
  Target
} from 'lucide-react';

// ── Mini Bar Chart (pure SVG, no libraries) ─────────────────────────────
const MiniBarChart = ({ data, labels, height = 200, color = 'primary' }) => {
  const max = Math.max(...data, 1);
  const barWidth = 100 / data.length;
  
  const gradientId = `bar-gradient-${color}`;
  const gradientColors = {
    primary: ['#FF6B35', '#e0521d'],
    secondary: ['#2EC4B6', '#20a89c'],
    tertiary: ['#FFBF69', '#e09f4a'],
    emerald: ['#34d399', '#059669']
  };
  const [c1, c2] = gradientColors[color] || gradientColors.primary;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${data.length * 60} ${height + 30}`} className="w-full" style={{ height: height + 30 }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={c1} stopOpacity="1" />
            <stop offset="100%" stopColor={c2} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {data.map((val, i) => {
          const barH = (val / max) * height;
          const x = i * 60 + 10;
          const y = height - barH;
          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={36}
                height={barH}
                rx={6}
                fill={`url(#${gradientId})`}
                className="transition-all duration-500"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
              />
              {/* Value label */}
              {val > 0 && (
                <text
                  x={x + 18}
                  y={y - 6}
                  textAnchor="middle"
                  fill="white"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="Inter, sans-serif"
                >
                  ₹{val}
                </text>
              )}
              {/* Day label */}
              <text
                x={x + 18}
                y={height + 18}
                textAnchor="middle"
                fill="#6b7280"
                fontSize="10"
                fontWeight="600"
                fontFamily="Inter, sans-serif"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const SellerAnalytics = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ordersData, foodsData] = await Promise.all([
        getSellerOrders(user.uid),
        getSellerFoods(user.uid)
      ]);
      setOrders(ordersData);
      setFoods(foodsData);
    } catch (e) {
      console.error('Analytics data load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user?.uid]);

  // ── Revenue calculations ──────────────────────────────────────────────
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const completedOrders = orders.filter(o => o.status === 'completed');

  const todayRevenue = completedOrders
    .filter(o => {
      const d = new Date(o.createdAt);
      return d.toDateString() === now.toDateString();
    })
    .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0);

  const weekRevenue = completedOrders
    .filter(o => (now - new Date(o.createdAt)) / oneDayMs <= 7)
    .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0);

  const monthRevenue = completedOrders
    .filter(o => (now - new Date(o.createdAt)) / oneDayMs <= 30)
    .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0);

  const allTimeRevenue = user?.financials?.total || completedOrders
    .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0);

  // ── Last 7 days revenue chart data ────────────────────────────────────
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const last7DaysRevenue = last7Days.map(day => {
    return completedOrders
      .filter(o => new Date(o.createdAt).toDateString() === day.toDateString())
      .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0);
  });

  const last7DaysLabels = last7Days.map(d =>
    d.toLocaleDateString('en-IN', { weekday: 'short' })
  );

  // ── Top selling items ─────────────────────────────────────────────────
  const foodOrderCounts = {};
  completedOrders.forEach(o => {
    const name = o.foodName || 'Unknown';
    foodOrderCounts[name] = (foodOrderCounts[name] || 0) + (o.quantity || 1);
  });
  const topItems = Object.entries(foodOrderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ── Performance metrics ───────────────────────────────────────────────
  const avgOrderValue = completedOrders.length > 0
    ? Math.round(completedOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0) / completedOrders.length)
    : 0;

  const uniqueDays = new Set(completedOrders.map(o => new Date(o.createdAt).toDateString()));
  const ordersPerDay = uniqueDays.size > 0
    ? (completedOrders.length / uniqueDays.size).toFixed(1)
    : '0';

  const completionRate = orders.length > 0
    ? Math.round((completedOrders.length / orders.length) * 100)
    : 0;

  // ── Customer insights ─────────────────────────────────────────────────
  const buyerCounts = {};
  completedOrders.forEach(o => {
    const buyerId = o.buyerId || 'unknown';
    buyerCounts[buyerId] = (buyerCounts[buyerId] || 0) + 1;
  });
  const totalCustomers = Object.keys(buyerCounts).length;
  const repeatCustomers = Object.values(buyerCounts).filter(c => c > 1).length;
  const newCustomers = totalCustomers - repeatCustomers;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex justify-center">
        <RefreshCw size={32} className="text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 space-y-6">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="text-primary-500" size={24} />
            <span>Seller Analytics</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Revenue insights, top items, performance metrics & customer analytics.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition disabled:opacity-40"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Revenue Overview Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Today', value: `₹${todayRevenue}` },
          { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'This Week', value: `₹${weekRevenue}` },
          { icon: ShoppingBag, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'This Month', value: `₹${monthRevenue}` },
          { icon: Star, color: 'text-tertiary-500', bg: 'bg-tertiary-500/10', label: 'All Time', value: `₹${allTimeRevenue}` },
        ].map(({ icon: Icon, color, bg, label, value }) => (
          <TiltCard key={label} className="glass-panel p-4 rounded-xl border border-white/5 flex items-center space-x-3">
            <div className={`p-3 ${bg} ${color} rounded-lg shrink-0`}><Icon size={20} /></div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">{label}</span>
              <span className="text-lg font-black text-white">{value}</span>
            </div>
          </TiltCard>
        ))}
      </div>

      {/* ── Revenue Chart (Last 7 Days) ─────────────────────────────── */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 size={14} className="text-primary-500" />
            Revenue — Last 7 Days
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <ArrowUpRight size={11} className="text-emerald-400" />
            <span className="font-semibold">₹{weekRevenue} total</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <MiniBarChart data={last7DaysRevenue} labels={last7DaysLabels} height={160} color="primary" />
        </div>
      </div>

      {/* ── Two-column layout: Top Items + Performance ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Top Selling Items */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Flame size={14} className="text-primary-500" />
            Top Selling Items
          </h2>
          {topItems.length > 0 ? (
            <div className="space-y-2.5">
              {topItems.map(([name, count], i) => (
                <div key={name} className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${
                      i === 0 ? 'bg-primary-500/15 text-primary-500' :
                      i === 1 ? 'bg-secondary-500/15 text-secondary-500' :
                      'bg-white/10 text-gray-400'
                    }`}>
                      #{i + 1}
                    </span>
                    <span className="text-sm font-bold text-white">{name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-300">{count}</span>
                    <span className="text-[10px] text-gray-500">orders</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              <ChefHat size={28} className="mx-auto mb-2 text-gray-600" />
              No orders completed yet.
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Target size={14} className="text-secondary-500" />
            Performance Metrics
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Average Order Value', value: `₹${avgOrderValue}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Orders per Active Day', value: ordersPerDay, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Completion Rate', value: `${completionRate}%`, icon: Award, color: 'text-primary-500', bg: 'bg-primary-500/10' },
              { label: 'Total Completed', value: completedOrders.length, icon: ShoppingBag, color: 'text-tertiary-500', bg: 'bg-tertiary-500/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${bg} ${color} rounded-lg`}><Icon size={14} /></div>
                  <span className="text-xs font-semibold text-gray-300">{label}</span>
                </div>
                <span className="text-sm font-black text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Customer Insights ────────────────────────────────────────── */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Users size={14} className="text-secondary-500" />
          Customer Insights
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 p-5 rounded-xl text-center space-y-1">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl w-fit mx-auto">
              <Users size={22} />
            </div>
            <span className="text-2xl font-black text-white block">{totalCustomers}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Customers</span>
          </div>
          <div className="bg-white/5 p-5 rounded-xl text-center space-y-1">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit mx-auto">
              <UserCheck size={22} />
            </div>
            <span className="text-2xl font-black text-white block">{repeatCustomers}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Repeat Customers</span>
          </div>
          <div className="bg-white/5 p-5 rounded-xl text-center space-y-1">
            <div className="p-3 bg-primary-500/10 text-primary-500 rounded-xl w-fit mx-auto">
              <UserPlus size={22} />
            </div>
            <span className="text-2xl font-black text-white block">{newCustomers}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">New Customers</span>
          </div>
        </div>

        {/* Repeat rate bar */}
        {totalCustomers > 0 && (
          <div className="bg-white/5 p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 font-semibold">Repeat Customer Rate</span>
              <span className="text-emerald-400 font-black">{Math.round((repeatCustomers / totalCustomers) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-secondary-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.round((repeatCustomers / totalCustomers) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default SellerAnalytics;
