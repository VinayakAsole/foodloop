import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getSellerOrders } from '../../firebase/firestore';
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
  Target,
  LayoutDashboard
} from 'lucide-react';

// ── Mini Bar Chart (pure SVG, no libraries) ─────────────────────────────
const MiniBarChart = ({ data, labels, height = 200, color = 'primary' }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const max = Math.max(...data, 1);
  
  const gradientId = `bar-gradient-${color}`;
  const gradientColors = {
    primary: ['#FF6B35', '#e0521d'],
    secondary: ['#2EC4B6', '#20a89c'],
    tertiary: ['#FFBF69', '#e09f4a'],
    emerald: ['#34d399', '#059669']
  };
  const [c1, c2] = gradientColors[color] || gradientColors.primary;

  return (
    <div className="w-full space-y-3">
      {/* Interactive Info Banner */}
      <div className="h-9 flex items-center justify-between px-4 text-xs bg-white/5 border border-white/10 rounded-xl transition-all duration-300">
        {hoveredIdx !== null ? (
          <div className="flex justify-between items-center w-full font-bold">
            <span className="text-gray-400">Period: <strong className="text-white font-black">{labels[hoveredIdx]}</strong></span>
            <span className="text-primary-500 font-black text-sm bg-primary-500/10 px-2 py-0.5 rounded-lg border border-primary-500/20">₹{data[hoveredIdx].toLocaleString('en-IN')}</span>
          </div>
        ) : (
          <span className="text-[11px] text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-ping"></span>
            Hover or tap on the bars to inspect details
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${data.length * 60} ${height + 30}`} className="w-full" style={{ height: height + 30 }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={hoveredIdx === null ? c1 : '#ff8554'} stopOpacity="1" />
            <stop offset="100%" stopColor={c2} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {data.map((val, i) => {
          const barH = (val / max) * height;
          const x = i * 60 + 10;
          const y = height - barH;
          const isHovered = hoveredIdx === i;
          return (
            <g 
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onTouchStart={() => setHoveredIdx(i)}
              className="cursor-pointer"
            >
              {/* Glow effect behind the hovered bar */}
              {isHovered && (
                <rect
                  x={x - 4}
                  y={y - 4}
                  width={44}
                  height={barH + 8}
                  rx={8}
                  fill={c1}
                  opacity="0.15"
                  className="transition-all duration-300 animate-pulse"
                />
              )}
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={36}
                height={barH}
                rx={6}
                fill={`url(#${gradientId})`}
                opacity={hoveredIdx === null || isHovered ? 1 : 0.45}
                className="transition-all duration-300"
                style={{ 
                  filter: isHovered ? 'drop-shadow(0 0 10px rgba(255,107,53,0.6))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
                  transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                  transformOrigin: `${x + 18}px ${height}px`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
              {/* Value label */}
              {val > 0 && (
                <text
                  x={x + 18}
                  y={isHovered ? y - 12 : y - 6}
                  textAnchor="middle"
                  fill={isHovered ? 'white' : '#e5e7eb'}
                  fontSize={isHovered ? '12' : '11'}
                  fontWeight={isHovered ? '900' : '700'}
                  fontFamily="Inter, sans-serif"
                  className="transition-all duration-300"
                >
                  ₹{val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                </text>
              )}
              {/* Day label */}
              <text
                x={x + 18}
                y={height + 18}
                textAnchor="middle"
                fill={isHovered ? 'white' : '#6b7280'}
                fontSize={isHovered ? '11' : '10'}
                fontWeight={isHovered ? '800' : '600'}
                fontFamily="Inter, sans-serif"
                className="transition-all duration-300"
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
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('weekly');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ordersData = await getSellerOrders(user.uid);
      setOrders(ordersData);
    } catch (e) {
      console.error('Analytics data load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // ── Revenue calculations (Static high-level metrics cards) ─────────────
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

  // ── Dynamic Timeframe-Filtered Calculations ───────────────────────────
  const getFilteredData = () => {
    let tfCompletedOrders = [];
    let tfAllOrders = [];
    let chartData = [];
    let chartLabels = [];
    let chartTitle = '';

    const cutoffDate = new Date();
    if (timeframe === 'weekly') {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      tfCompletedOrders = completedOrders.filter(o => new Date(o.createdAt) >= cutoffDate);
      tfAllOrders = orders.filter(o => new Date(o.createdAt) >= cutoffDate);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
      });
      chartData = last7Days.map(day => {
        return completedOrders
          .filter(o => new Date(o.createdAt).toDateString() === day.toDateString())
          .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0);
      });
      chartLabels = last7Days.map(d =>
        d.toLocaleDateString('en-IN', { weekday: 'short' })
      );
      chartTitle = "Daily Revenue — Last 7 Days";

    } else if (timeframe === 'monthly') {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      tfCompletedOrders = completedOrders.filter(o => new Date(o.createdAt) >= cutoffDate);
      tfAllOrders = orders.filter(o => new Date(o.createdAt) >= cutoffDate);

      chartLabels = ["4 Wks Ago", "3 Wks Ago", "2 Wks Ago", "This Week"];
      for (let i = 3; i >= 0; i--) {
        const startDaysAgo = (i + 1) * 7 - 1;
        const endDaysAgo = i * 7;

        const startLimit = new Date();
        startLimit.setDate(startLimit.getDate() - startDaysAgo);
        startLimit.setHours(0, 0, 0, 0);

        const endLimit = new Date();
        endLimit.setDate(endLimit.getDate() - endDaysAgo);
        endLimit.setHours(23, 59, 59, 999);

        const weekSum = completedOrders
          .filter(o => {
            const d = new Date(o.createdAt);
            return d >= startLimit && d <= endLimit;
          })
          .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0);
        chartData.push(weekSum);
      }
      chartTitle = "Weekly Revenue — Last 4 Weeks";

    } else if (timeframe === 'yearly') {
      cutoffDate.setDate(cutoffDate.getDate() - 365);
      tfCompletedOrders = completedOrders.filter(o => new Date(o.createdAt) >= cutoffDate);
      tfAllOrders = orders.filter(o => new Date(o.createdAt) >= cutoffDate);

      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleDateString('en-IN', { month: 'short' });
        const yearSuffix = d.getFullYear().toString().slice(-2);
        chartLabels.push(`${monthName} '${yearSuffix}`);

        const monthSum = completedOrders
          .filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate.getFullYear() === d.getFullYear() && orderDate.getMonth() === d.getMonth();
          })
          .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0);
        chartData.push(monthSum);
      }
      chartTitle = "Monthly Revenue — Last 12 Months";
    }

    const chartTotal = chartData.reduce((sum, val) => sum + val, 0);

    return {
      tfCompletedOrders,
      tfAllOrders,
      chartData,
      chartLabels,
      chartTitle,
      chartTotal
    };
  };

  const {
    tfCompletedOrders,
    tfAllOrders,
    chartData,
    chartLabels,
    chartTitle,
    chartTotal
  } = getFilteredData();

  // ── Top selling items ─────────────────────────────────────────────────
  const foodOrderCounts = {};
  tfCompletedOrders.forEach(o => {
    const name = o.foodName || 'Unknown';
    foodOrderCounts[name] = (foodOrderCounts[name] || 0) + (o.quantity || 1);
  });
  const topItems = Object.entries(foodOrderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ── Performance metrics ───────────────────────────────────────────────
  const avgOrderValue = tfCompletedOrders.length > 0
    ? Math.round(tfCompletedOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice) || 0), 0) / tfCompletedOrders.length)
    : 0;

  const uniqueDays = new Set(tfCompletedOrders.map(o => new Date(o.createdAt).toDateString()));
  const ordersPerDay = uniqueDays.size > 0
    ? (tfCompletedOrders.length / uniqueDays.size).toFixed(1)
    : '0';

  const completionRate = tfAllOrders.length > 0
    ? Math.round((tfCompletedOrders.length / tfAllOrders.length) * 100)
    : 0;

  // ── Customer insights ─────────────────────────────────────────────────
  const buyerCounts = {};
  tfCompletedOrders.forEach(o => {
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
    <div className="relative overflow-hidden max-w-6xl mx-auto px-4 py-6 md:px-8 space-y-6">
      {/* Background Decorative Neon Glows */}
      <div className="absolute top-[10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-primary-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[350px] h-[350px] rounded-full bg-secondary-500/10 blur-[130px] pointer-events-none" />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 relative z-10">
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
          className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Sub Navigation Tabs (Desktop & Tablet) ────────────────────── */}
      <div className="hidden md:flex items-center gap-2 border-b border-white/5 pb-2 relative z-10">
        <Link
          to="/seller-dashboard"
          className="px-4 py-2 rounded-xl text-xs font-bold border border-transparent text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 hover:translate-x-0.5"
        >
          <div className="flex items-center gap-2">
            <LayoutDashboard size={14} />
            <span>Overview Dashboard</span>
          </div>
        </Link>
        <Link
          to="/seller-dashboard?tab=orders"
          className="px-4 py-2 rounded-xl text-xs font-bold border border-transparent text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 hover:translate-x-0.5"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={14} />
            <span>Orders Record ({orders.length})</span>
          </div>
        </Link>
        <Link
          to="/seller-analytics"
          className="px-4 py-2 rounded-xl text-xs font-bold border bg-primary-500/10 border-primary-500/30 text-primary-500 shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={14} />
            <span>Kitchen Analytics</span>
          </div>
        </Link>
      </div>

      {/* ── Revenue Overview Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
        {[
          { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Today', value: `₹${todayRevenue}` },
          { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'This Week', value: `₹${weekRevenue}` },
          { icon: ShoppingBag, color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'This Month', value: `₹${monthRevenue}` },
          { icon: Star, color: 'text-tertiary-500', bg: 'bg-tertiary-500/10', label: 'All Time', value: `₹${allTimeRevenue}` },
        ].map(({ icon: Icon, color, bg, label, value }) => (
          <TiltCard 
            key={label} 
            className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-primary-500/20 hover:bg-white/[0.08] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 group cursor-pointer flex items-center space-x-4"
          >
            <div className={`p-3.5 ${bg} ${color} rounded-xl shrink-0 group-hover:scale-110 transition-transform duration-300`}><Icon size={20} /></div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold group-hover:text-gray-300 transition-colors">{label}</span>
              <span className="text-xl font-black text-white">{value}</span>
            </div>
          </TiltCard>
        ))}
      </div>

      {/* ── Revenue Chart & Filters ─────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 hover:border-white/20 transition-all duration-300 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 size={14} className="text-primary-500" />
            {chartTitle}
          </h2>
          
          <div className="flex items-center gap-3">
            {/* Timeframe Selector */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0 shadow-inner">
              {[
                { key: 'weekly', label: 'Weekly' },
                { key: 'monthly', label: 'Monthly' },
                { key: 'yearly', label: 'Yearly' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeframe(key)}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    timeframe === key
                      ? 'bg-primary-500 text-white shadow-md scale-105'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 shrink-0">
              <ArrowUpRight size={11} className="text-emerald-400" />
              <span className="font-semibold">₹{chartTotal.toLocaleString('en-IN')} total</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto pt-2">
          <MiniBarChart data={chartData} labels={chartLabels} height={160} color="primary" />
        </div>
      </div>

      {/* ── Two-column layout: Top Items + Performance ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">

        {/* Top Selling Items */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 hover:border-white/20 transition-all duration-300">
          <h2 className="text-sm font-bold text-white flex items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-primary-500" />
              <span>Top Selling Items</span>
            </div>
            <span className="text-[10px] text-gray-400 font-semibold bg-white/5 px-2 py-0.5 rounded-md capitalize tracking-wider">
              {timeframe}
            </span>
          </h2>
          {topItems.length > 0 ? (
            <div className="space-y-3">
              {topItems.map(([name, count], i) => (
                <div 
                  key={name} 
                  className="flex items-center justify-between bg-white/5 hover:bg-white/[0.08] hover:translate-x-1.5 px-4 py-3.5 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 group/item cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black group-hover/item:scale-110 transition-all duration-300 ${
                      i === 0 ? 'bg-primary-500/15 text-primary-500 border border-primary-500/20 shadow-md' :
                      i === 1 ? 'bg-secondary-500/15 text-secondary-500 border border-secondary-500/20' :
                      'bg-white/10 text-gray-400 border border-white/5'
                    }`}>
                      #{i + 1}
                    </span>
                    <span className="text-sm font-bold text-white group-hover/item:text-primary-400 transition-colors">{name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-gray-300">{count}</span>
                    <span className="text-[10px] text-gray-500">orders</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              <ChefHat size={28} className="mx-auto mb-2 text-gray-600 animate-bounce" />
              No orders completed yet in this range.
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 hover:border-white/20 transition-all duration-300">
          <h2 className="text-sm font-bold text-white flex items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-secondary-500" />
              <span>Performance Metrics</span>
            </div>
            <span className="text-[10px] text-gray-400 font-semibold bg-white/5 px-2 py-0.5 rounded-md capitalize tracking-wider">
              {timeframe}
            </span>
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Average Order Value', value: `₹${avgOrderValue.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Orders per Active Day', value: ordersPerDay, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Completion Rate', value: `${completionRate}%`, icon: Award, color: 'text-primary-500', bg: 'bg-primary-500/10' },
              { label: 'Total Completed', value: tfCompletedOrders.length, icon: ShoppingBag, color: 'text-tertiary-500', bg: 'bg-tertiary-500/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div 
                key={label} 
                className="flex items-center justify-between bg-white/5 hover:bg-white/[0.08] hover:translate-x-1.5 px-4 py-3.5 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 group/metric cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 ${bg} ${color} rounded-xl group-hover/metric:scale-110 transition-transform duration-300`}><Icon size={14} /></div>
                  <span className="text-xs font-semibold text-gray-300">{label}</span>
                </div>
                <span className="text-sm font-black text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Customer Insights ────────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 hover:border-white/20 transition-all duration-300 relative z-10">
        <h2 className="text-sm font-bold text-white flex items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-secondary-500" />
            <span>Customer Insights</span>
          </div>
          <span className="text-[10px] text-gray-400 font-semibold bg-white/5 px-2 py-0.5 rounded-md capitalize tracking-wider">
            {timeframe}
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', value: totalCustomers, label: 'Total Customers' },
            { icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', value: repeatCustomers, label: 'Repeat Customers' },
            { icon: UserPlus, color: 'text-primary-500', bg: 'bg-primary-500/10', value: newCustomers, label: 'New Customers' }
          ].map(({ icon: Icon, color, bg, value, label }) => (
            <div 
              key={label} 
              className="bg-white/5 hover:bg-white/[0.08] p-5 rounded-2xl text-center space-y-2 border border-white/5 hover:border-white/10 hover:shadow-lg transition-all duration-300 group/cust cursor-pointer"
            >
              <div className={`p-3.5 ${bg} ${color} rounded-2xl w-fit mx-auto group-hover/cust:scale-110 transition-transform duration-300`}><Icon size={24} /></div>
              <div>
                <span className="text-3xl font-black text-white block tracking-tight group-hover/cust:text-primary-400 transition-colors">{value}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold">{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Repeat rate bar */}
        {totalCustomers > 0 && (
          <div className="bg-white/5 p-5 rounded-2xl space-y-3 border border-white/5">
            <div className="flex justify-between text-xs items-center">
              <span className="text-gray-400 font-bold">Repeat Customer Loyalty Rate</span>
              <span className="text-emerald-400 font-black bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                {Math.round((repeatCustomers / totalCustomers) * 100)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-secondary-500 to-primary-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(46,196,182,0.5)]"
                style={{ width: `${Math.round((repeatCustomers / totalCustomers) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 italic mt-1">
              Percentage of completed orders placed by returning buyers in this timeframe.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerAnalytics;
