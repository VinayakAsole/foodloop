import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import MapView from '../../components/MapView';
import { 
  ShieldCheck, 
  FileText, 
  AlertCircle,
  Gift,
  RefreshCw,
  FileSpreadsheet,
  ShieldAlert,
  ChefHat,
  ShoppingBag,
  AtSign,
  Phone,
  Mail,
  MapPin,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Plus
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { simulateLocalNotification } from '../../firebase/messaging';
import {
  getAllOrders,
  createCoupon,
  getAllCoupons,
  toggleCouponStatus,
  addAuditLog,
  getAuditLogs,
  getDisputes,
  resolveDispute
} from '../../firebase/firestore';

// ── Status Badge ────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    verified:  { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: '✓ Verified' },
    pending:   { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   label: '⏳ Pending' },
    suspended: { cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',     label: '✗ Suspended' },
  };
  const { cls, label } = map[status] || map.pending;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${cls}`}>{label}</span>
  );
};

// ── Role Badge ──────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  if (role === 'seller') return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary-500/10 text-primary-500 border border-primary-500/20">
      <ChefHat size={10} /> Home Cook
    </span>
  );
  if (role === 'buyer') return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
      <ShoppingBag size={10} /> Buyer
    </span>
  );
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
      🛡 Admin
    </span>
  );
};

// ── Safe Date Formatter ──────────────────────────────────────────────────
const formatDate = (dateVal, includeTime = false) => {
  if (!dateVal) return 'N/A';
  try {
    let dateObj;
    if (typeof dateVal.toDate === 'function') {
      dateObj = dateVal.toDate();
    } else if (dateVal.seconds !== undefined) {
      dateObj = new Date(dateVal.seconds * 1000);
    } else {
      dateObj = new Date(dateVal);
    }

    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }

    if (includeTime) {
      return dateObj.toLocaleDateString('en-IN');
    }
    return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return 'N/A';
  }
};

const SVGBarChart = ({ data, labels, color = 'primary', height = 150 }) => {
  const max = Math.max(...data, 1);
  const chartWidth = data.length * 60;
  const colors = {
    primary: { fill: 'url(#grad-primary)', text: '#FF6B35' },
    secondary: { fill: 'url(#grad-secondary)', text: '#2EC4B6' }
  };
  const activeColor = colors[color] || colors.primary;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${chartWidth} ${height + 40}`} className="w-full min-w-[350px]" style={{ height: height + 40 }}>
        <defs>
          <linearGradient id="grad-primary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="grad-secondary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2EC4B6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2EC4B6" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {data.map((val, i) => {
          const barHeight = (val / max) * height;
          const x = i * 60 + 20;
          const y = height - barHeight + 20;

          return (
            <g key={i} className="group cursor-pointer">
              {/* Bar Value Tooltip */}
              <text
                x={x + 15}
                y={y - 6}
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                {val}
              </text>

              {/* Bar */}
              <rect
                x={x}
                y={y}
                width="30"
                height={barHeight}
                fill={activeColor.fill}
                rx="4"
                className="transition-all duration-300 hover:brightness-125"
              />

              {/* X Axis Label */}
              <text
                x={x + 15}
                y={height + 35}
                fill="#94A3B8"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
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

export const Admin = () => {
  const { user } = useAuth();
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'registrations';
  const setActiveTab = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState(null);
  const [relocations, setRelocations]   = useState([]);

  useEffect(() => {
    const resetFilters = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      setSelectedRoleFilter(null);
      setSearchQuery('');
    };
    resetFilters();
  }, [activeTab]);

  // Load all user records from Firestore
  const loadUsersData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const list = [];
      querySnapshot.forEach((d) => list.push({ uid: d.id, ...d.data() }));
      // Sort: sellers first, then buyers, then admins
      list.sort((a, b) => {
        const order = { seller: 0, buyer: 1, admin: 2 };
        return (order[a.role] ?? 3) - (order[b.role] ?? 3);
      });
      setUsers(list);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadRelocationsData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'locationChangeRequests'));
      const list = [];
      querySnapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRelocations(list);
    } catch (e) {
      console.error('Failed to load relocation requests:', e);
    }
  };

  useEffect(() => { 
    const init = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      loadUsersData(); 
      loadRelocationsData();
    };
    init();
  }, []);

  const handleVerifySeller = async (uid, approve = true) => {
    try {
      const status = approve ? 'verified' : 'suspended';
      await updateDoc(doc(db, 'users', uid), { status });
      await updateDoc(doc(db, 'sellers', uid), { status }).catch(() => {});
      
      const targetUser = users.find(u => u.uid === uid);
      await addAuditLog(
        user?.name || 'Admin', 
        approve ? 'VERIFY_SELLER' : 'SUSPEND_SELLER', 
        `${approve ? 'Approved' : 'Suspended'} chef kitchen: ${targetUser?.kitchenName || targetUser?.name || uid}`
      );

      simulateLocalNotification(
        approve ? 'Seller Verified!' : 'Seller Suspended',
        `Home Cook has been ${approve ? 'verified and activated' : 'suspended'}.`,
        approve ? 'success' : 'warning'
      );
      await loadUsersData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleApproveRelocation = async (requestId, sellerId, newCoords, newAddress) => {
    try {
      await updateDoc(doc(db, 'locationChangeRequests', requestId), { status: 'approved' });
      await updateDoc(doc(db, 'users', sellerId), { 
        latitude: parseFloat(newCoords.latitude), 
        longitude: parseFloat(newCoords.longitude),
        kitchenAddress: newAddress
      });
      await updateDoc(doc(db, 'sellers', sellerId), { 
        latitude: parseFloat(newCoords.latitude), 
        longitude: parseFloat(newCoords.longitude),
        kitchenAddress: newAddress
      }).catch(() => {});

      await addAuditLog(
        user?.name || 'Admin', 
        'APPROVE_RELOCATION', 
        `Approved kitchen relocation for seller ${sellerId} to ${newCoords.latitude}, ${newCoords.longitude}`
      );

      simulateLocalNotification(
        'Relocation Approved!',
        `Seller's kitchen location has been updated to new coordinates.`,
        'success'
      );
      await loadRelocationsData();
      await loadUsersData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleRejectRelocation = async (requestId, sellerId) => {
    const comment = prompt("Please enter rejection reason / comment:");
    if (comment === null) return;

    try {
      await updateDoc(doc(db, 'locationChangeRequests', requestId), { 
        status: 'rejected',
        adminComment: comment.trim() || 'Declined by Administrator'
      });

      await addAuditLog(
        user?.name || 'Admin', 
        'REJECT_RELOCATION', 
        `Rejected relocation request for seller ${sellerId}. Reason: ${comment}`
      );

      simulateLocalNotification(
        'Relocation Rejected',
        `Request declined. Comment saved: "${comment}"`,
        'warning'
      );
      await loadRelocationsData();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleExport = (format) => {
    simulateLocalNotification(
      `Exporting ${format}...`,
      `Generating platform database records as ${format} file.`,
      'info'
    );
    setTimeout(() => {
      alert(`Export ready: foodloop_platform_audit.${format.toLowerCase()}`);
    }, 1000);
  };

  // Derived lists
  const sellers       = users.filter(u => u.role === 'seller');
  const buyers        = users.filter(u => u.role === 'buyer');
  const pendingSellers = sellers.filter(u => u.status === 'pending');
  const lowTrustSellers = sellers.filter(u => (u.trustScore || 100) < 80);

  const totalRevenue = sellers.reduce((acc, s) => acc + (s.financials?.total || 0), 0);
  const topCook = sellers.length > 0 
    ? sellers.reduce((top, s) => (s.financials?.total || 0) > (top?.financials?.total || 0) ? s : top, null)
    : null;

  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilterType, setAuditFilterType] = useState('ALL');
  const [showManualLogModal, setShowManualLogModal] = useState(false);
  const [manualAction, setManualAction] = useState('MANUAL_OVERRIDE');
  const [manualDetails, setManualDetails] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);
  const [disputes, setDisputes] = useState([]);

  // Coupon form state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [couponMaxUses, setCouponMaxUses] = useState('');
  const [couponExpiry, setCouponExpiry] = useState('');

  // Dispute resolution state
  const [resolvingDisputeId, setResolvingDisputeId] = useState(null);
  const [disputeResolution, setDisputeResolution] = useState('');

  const loadAnalyticsData = async () => {
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (e) {
      console.error("Failed to load platform orders:", e);
    }
  };

  const loadCouponsData = async () => {
    try {
      const data = await getAllCoupons();
      setCoupons(data);
    } catch (e) {
      console.error("Failed to load coupons:", e);
    }
  };

  const loadAuditLogsData = async () => {
    try {
      const data = await getAuditLogs();
      setAuditLogs(data);
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    }
  };

  const handleAddManualLog = async (e) => {
    e.preventDefault();
    if (!manualDetails.trim()) return;
    setSubmittingLog(true);
    try {
      await addAuditLog(
        user?.name || 'Admin',
        manualAction,
        manualDetails.trim()
      );
      setManualDetails('');
      setShowManualLogModal(false);
      simulateLocalNotification(
        "Audit Log Created",
        "A manual security/override log entry has been recorded.",
        "success"
      );
      await loadAuditLogsData();
    } catch (err) {
      alert("Error adding audit log: " + err.message);
    } finally {
      setSubmittingLog(false);
    }
  };

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = 
      (log.adminName || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.actionType || '').toLowerCase().includes(auditSearch.toLowerCase());
      
    const matchesType = auditFilterType === 'ALL' || log.actionType === auditFilterType;
    
    return matchesSearch && matchesType;
  });

  const loadDisputesData = async () => {
    try {
      const data = await getDisputes();
      setDisputes(data);
    } catch (e) {
      console.error("Failed to load disputes:", e);
    }
  };

  useEffect(() => {
    const loadTab = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (activeTab === 'analytics') loadAnalyticsData();
      if (activeTab === 'coupons') loadCouponsData();
      if (activeTab === 'audit') loadAuditLogsData();
      if (activeTab === 'disputes') loadDisputesData();
      if (activeTab === 'relocations') loadRelocationsData();
    };
    loadTab();
  }, [activeTab]);

  // Load disputes count on mount for badges
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const dList = await getDisputes();
        setDisputes(dList);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCounts();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    try {
      await createCoupon({
        code: couponCode.trim().toUpperCase(),
        discountPercent: parseInt(couponDiscount),
        maxUses: parseInt(couponMaxUses) || 999,
        expiryDate: couponExpiry
      });
      await addAuditLog(user?.name || 'Admin', 'CREATE_COUPON', `Created coupon: ${couponCode.toUpperCase()}`);
      setCouponCode('');
      setCouponDiscount('');
      setCouponMaxUses('');
      setCouponExpiry('');
      loadCouponsData();
      simulateLocalNotification("Coupon Created!", `Promo code ${couponCode.toUpperCase()} is active.`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCoupon = async (couponId, code, active) => {
    try {
      await toggleCouponStatus(couponId, active);
      await addAuditLog(user?.name || 'Admin', 'TOGGLE_COUPON', `${active ? 'Activated' : 'Deactivated'} coupon: ${code}`);
      loadCouponsData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    if (!disputeResolution.trim() || !resolvingDisputeId) return;
    try {
      await resolveDispute(resolvingDisputeId, disputeResolution.trim());
      await addAuditLog(user?.name || 'Admin', 'RESOLVE_DISPUTE', `Resolved dispute ID: ${resolvingDisputeId}`);
      setResolvingDisputeId(null);
      setDisputeResolution('');
      loadDisputesData();
      simulateLocalNotification("Dispute Resolved", "Resolution updated successfully.", "success");
    } catch (err) {
      console.error(err);
    }
  };

  const getAnalyticsChartsData = () => {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const dailySignups = last7Days.map(dateStr => {
      return users.filter(u => u.createdAt && u.createdAt.startsWith(dateStr)).length;
    });

    const dailyOrders = last7Days.map(dateStr => {
      return orders.filter(o => o.createdAt && o.createdAt.startsWith(dateStr)).length;
    });

    const dayLabels = last7Days.map(dateStr => {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}`;
    });

    return { dailySignups, dailyOrders, dayLabels };
  };

  const chartsData = getAnalyticsChartsData();

  // Search filter for "all users" tab
  const q = searchQuery.toLowerCase();
  const filteredUsers = users.filter(u => {
    if (selectedRoleFilter && u.role !== selectedRoleFilter) {
      return false;
    }
    return (
      !q ||
      String(u.name || '').toLowerCase().includes(q) ||
      String(u.username || '').toLowerCase().includes(q) ||
      String(u.email || '').toLowerCase().includes(q) ||
      String(u.mobile || '').includes(q) ||
      String(u.role || '').includes(q)
    );
  });

  const openDisputes = disputes.filter(d => d.status === 'open');

  const pendingRelocations = relocations.filter(r => r.status === 'pending');

  const TABS = [
    { key: 'registrations', label: 'Pending Approval',  badge: pendingSellers.length },
    { key: 'relocations',   label: 'Location Changes',  badge: pendingRelocations.length },
    { key: 'users',         label: 'All Users',         badge: users.length },
    { key: 'watchlist',     label: 'Trust Watchlist',   badge: lowTrustSellers.length },
    { key: 'analytics',     label: 'Analytics',         badge: null },
    { key: 'coupons',       label: 'Coupons',           badge: coupons.length },
    { key: 'disputes',      label: 'Disputes',          badge: openDisputes.length },
    { key: 'audit',         label: 'Audit Log',         badge: null },
    { key: 'reports',       label: 'Reports',           badge: null },
  ];

  return (
    <div className="min-h-screen bg-[#060709] py-6">
      <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="text-primary-500" size={24} />
              <span>Platform Admin Panel</span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Manage users, verify sellers, monitor trust scores &amp; compile audits.
            </p>
          </div>
          <button
            onClick={loadUsersData}
            disabled={loading}
            className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Bento Grid Stats & Digest */}
        <div className="bento-grid">
          {/* Digest Banner (spans 8 cols on desktop) */}
          <div className="responsive-card bento-col-12 md:bento-col-8 p-6 bg-gradient-to-r from-primary-500/5 via-slate-900/40 to-slate-950/60 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-[10px] text-secondary-500 font-bold uppercase tracking-wider">
                <ShieldAlert size={12} />
                <span>Weekly Admin Digest Insights</span>
              </div>
              <h3 className="text-sm font-black text-white">Platform Weekly Performance Summary</h3>
              <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
                Admin notifications are filtered for high-level digests. Relaunch or simulate the weekly analytics report and trust scans below.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  simulateLocalNotification(
                    "Weekly Admin Digest 📊",
                    `Weekly growth: +12% active users. Database registry totals: ${buyers.length} Buyers, ${sellers.length} verified Home Cooks. Pending Verification: ${pendingSellers.length}.`,
                    "info"
                  );
                }}
                className="px-3.5 py-2 bg-primary-500 hover:bg-primary-600 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer"
              >
                Trigger Weekly Report
              </button>
              <button
                onClick={() => {
                  simulateLocalNotification(
                    "Trust Watchlist Alert 🛡️",
                    `Platform trust index scan done. Flagged accounts on watchlist: ${lowTrustSellers.length} Cooks below 75%.`,
                    "warning"
                  );
                }}
                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Run Trust Scan
              </button>
            </div>
          </div>

          {/* Buyers Stats (spans 4 cols on desktop) */}
          <div className="responsive-card bento-col-12 md:bento-col-4 p-5 flex items-center space-x-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg shrink-0"><ShoppingBag size={20} /></div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">Buyers</span>
              <span className="text-2xl font-black text-white">{buyers.length}</span>
            </div>
          </div>

          {/* Home Cooks Stats (spans 4 cols on desktop) */}
          <div className="responsive-card bento-col-12 md:bento-col-4 p-5 flex items-center space-x-3">
            <div className="p-3 bg-primary-500/10 text-primary-500 rounded-lg shrink-0"><ChefHat size={20} /></div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">Home Cooks</span>
              <span className="text-2xl font-black text-white">{sellers.length}</span>
            </div>
          </div>

          {/* Pending Review Stats (spans 4 cols on desktop) */}
          <div className="responsive-card bento-col-12 md:bento-col-4 p-5 flex items-center space-x-3">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg shrink-0"><AlertCircle size={20} /></div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">Pending Review</span>
              <span className="text-2xl font-black text-white">{pendingSellers.length}</span>
            </div>
          </div>

          {/* Low Trust Stats (spans 4 cols on desktop) */}
          <div className="responsive-card bento-col-12 md:bento-col-4 p-5 flex items-center space-x-3">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-lg shrink-0"><ShieldAlert size={20} /></div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">Low Trust</span>
              <span className="text-2xl font-black text-white">{lowTrustSellers.length}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 space-x-1 overflow-x-auto">
          {TABS.map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`pb-2 px-1 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === key
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {label}
              {badge !== null && badge > 0 && (
                <span className={`px-1.5 py-0.5 text-[9px] font-black rounded-full ${
                  activeTab === key ? 'bg-primary-500 text-slate-950' : 'bg-white/10 text-gray-300'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ PENDING REGISTRATIONS ══════════════════════════════════════════ */}
        {activeTab === 'registrations' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-400" />
                Pending Seller Registrations
                {pendingSellers.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded-full">
                    {pendingSellers.length}
                  </span>
                )}
              </h2>

              {loading ? (
                <div className="flex justify-center py-10"><RefreshCw size={24} className="text-primary-500 animate-spin" /></div>
              ) : pendingSellers.length > 0 ? (
                <div className="space-y-3">
                  {pendingSellers.map(seller => (
                    <div key={seller.uid} className="responsive-card p-4 flex flex-col md:flex-row justify-between gap-4 border border-amber-500/25">
                      <div className="space-y-2 flex-grow">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white text-sm leading-tight">{seller.name}</h4>
                          {seller.username && (
                            <span className="text-[10px] font-mono text-secondary-500 bg-secondary-500/10 px-1.5 py-0.5 rounded border border-secondary-500/20">
                              @{seller.username}
                            </span>
                          )}
                          <StatusBadge status={seller.status} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1"><Mail size={11} className="text-gray-600" />{seller.email}</span>
                          <span className="flex items-center gap-1"><Phone size={11} className="text-gray-600" />{seller.mobile}</span>
                          {seller.kitchenName && <span className="flex items-center gap-1"><ChefHat size={11} className="text-primary-500" />{seller.kitchenName}</span>}
                          {seller.kitchenAddress && <span className="flex items-center gap-1"><MapPin size={11} className="text-gray-600" />{seller.kitchenAddress}</span>}
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <MapPin size={11} className="text-secondary-500" />
                            {Number(seller.latitude || 0).toFixed(5)}, {Number(seller.longitude || 0).toFixed(5)}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            Joined: {formatDate(seller.createdAt, true)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => handleVerifySeller(seller.uid, true)}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleVerifySeller(seller.uid, false)}
                          className="px-3.5 py-1.5 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 border border-white/10 rounded-lg text-xs font-semibold text-gray-300 transition cursor-pointer"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="responsive-card p-8 text-center text-gray-400 text-sm">
                  ✅ All registered home cooks have been reviewed. No pending approvals.
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText size={16} className="text-secondary-500" />Audit Reports
              </h2>
              <div className="responsive-card p-5 space-y-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Compile user lists, active food counts, and reviews for offline documentation.
                </p>
                <div className="space-y-2.5">
                  {[['PDF', 'text-rose-400'], ['Excel', 'text-secondary-500']].map(([fmt, cls]) => (
                    <button key={fmt} onClick={() => handleExport(fmt)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileText size={15} className={cls} />
                        Export Platform Audit ({fmt})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ ALL USERS DIRECTORY ════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          selectedRoleFilter === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Buyers category column */}
              <button
                onClick={() => setSelectedRoleFilter('buyer')}
                className="responsive-card p-8 hover:border-blue-500/35 hover:bg-blue-500/5 transition-all cursor-pointer flex flex-col items-center space-y-4 group text-left"
              >
                <div className="p-5 bg-blue-500/10 text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
                  <ShoppingBag size={36} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">Buyer Users Directory</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                    Browse profiles, contact information, account statuses, and coordinate pins for all platform buyers.
                  </p>
                </div>
                <div className="px-4 py-1.5 bg-blue-500/15 border border-blue-500/20 text-blue-400 font-extrabold text-xs rounded-full">
                  {buyers.length} Active Buyers
                </div>
              </button>

              {/* Sellers category column */}
              <button
                onClick={() => setSelectedRoleFilter('seller')}
                className="responsive-card p-8 hover:border-primary-500/35 hover:bg-primary-500/5 transition-all cursor-pointer flex flex-col items-center space-y-4 group text-left"
              >
                <div className="p-5 bg-primary-500/10 text-primary-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <ChefHat size={36} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white group-hover:text-primary-500 transition-colors">Seller Users Directory</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                    Browse kitchen details, approve/reject pending registrations, monitor trust watchlist, and audit earnings.
                  </p>
                </div>
                <div className="px-4 py-1.5 bg-primary-500/15 border border-primary-500/20 text-primary-500 font-extrabold text-xs rounded-full">
                  {sellers.length} Active Cooks
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header row with Back button and count */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedRoleFilter(null)}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  ← Back to User Categories
                </button>
                <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                  selectedRoleFilter === 'seller' ? 'bg-primary-500/10 text-primary-500 border border-primary-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {selectedRoleFilter === 'seller' ? `Sellers Directory (${filteredUsers.length})` : `Buyers Directory (${filteredUsers.length})`}
                </span>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder={`Search ${selectedRoleFilter === 'seller' ? 'sellers' : 'buyers'} by name, @username, email or mobile...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none text-sm transition-all"
                />
              </div>

              {loading ? (
                <div className="flex justify-center py-10"><RefreshCw size={24} className="text-primary-500 animate-spin" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="responsive-card p-8 text-center text-gray-400">No users found.</div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map(u => (
                    <div
                      key={u.uid}
                      className={`responsive-card p-4 border flex flex-col md:flex-row gap-4 ${
                        u.role === 'seller' && u.status === 'pending'
                          ? 'border-amber-500/35 bg-amber-500/[0.02]'
                          : u.status === 'suspended'
                          ? 'border-rose-500/35 bg-rose-500/[0.02]'
                          : ''
                      }`}
                    >
                      {/* Avatar / Role icon */}
                      <div className="shrink-0 flex items-start">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                          u.role === 'seller' ? 'bg-primary-500/15 text-primary-500' :
                          u.role === 'buyer' ? 'bg-blue-500/15 text-blue-400' :
                                               'bg-purple-500/15 text-purple-400'
                        }`}>
                          {String(u.name || '?')[0].toUpperCase()}
                        </div>
                      </div>

                      {/* Core info */}
                      <div className="flex-grow space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{u.name}</span>
                          {u.username && (
                            <span className="text-[10px] font-mono text-secondary-500 flex items-center gap-0.5">
                              <AtSign size={9} />{u.username}
                            </span>
                          )}
                          <RoleBadge role={u.role} />
                          <StatusBadge status={u.status} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1 truncate"><Mail size={10} className="shrink-0 text-gray-600" />{u.email}</span>
                          {u.mobile && <span className="flex items-center gap-1"><Phone size={10} className="shrink-0 text-gray-600" />{u.mobile}</span>}
                          {u.role === 'seller' && u.kitchenName && (
                            <span className="flex items-center gap-1 truncate"><ChefHat size={10} className="shrink-0 text-primary-500" />{u.kitchenName}</span>
                          )}
                          {u.role === 'seller' && u.kitchenAddress && (
                            <span className="flex items-center gap-1 truncate"><MapPin size={10} className="shrink-0 text-gray-600" />{u.kitchenAddress}</span>
                          )}
                          {u.latitude && u.longitude && (
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <MapPin size={10} className="shrink-0 text-secondary-500" />
                              {Number(u.latitude || 0).toFixed(4)}, {Number(u.longitude || 0).toFixed(4)}
                            </span>
                          )}
                          {u.role === 'seller' && u.trustScore !== undefined && (
                            <span className="flex items-center gap-1">
                              <Star size={10} className="shrink-0 text-amber-400" />
                              Trust Score: <strong className={u.trustScore < 80 ? 'text-rose-400' : 'text-emerald-400'}>{u.trustScore}%</strong>
                            </span>
                          )}
                          {u.role === 'seller' && (
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold" title="Weekly / Monthly / Yearly Earnings">
                              <span>💰 Earnings:</span>
                              <span className="text-gray-300">
                                W: ₹{u.financials?.weekly || 0} · 
                                M: ₹{u.financials?.monthly || 0} · 
                                Y: ₹{u.financials?.yearly || 0}
                              </span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-gray-500">
                            <Clock size={10} className="shrink-0" />
                            {formatDate(u.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions (for sellers only) */}
                      {u.role === 'seller' && (
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {u.status !== 'verified' && (
                            <button
                              onClick={() => handleVerifySeller(u.uid, true)}
                              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold rounded-lg text-[10px] transition cursor-pointer"
                            >
                              <CheckCircle2 size={12} className="inline mr-0.5" /> Verify
                            </button>
                          )}
                          {u.status !== 'suspended' && (
                            <button
                              onClick={() => handleVerifySeller(u.uid, false)}
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold rounded-lg text-[10px] transition cursor-pointer"
                            >
                              <XCircle size={12} className="inline mr-0.5" /> Suspend
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {/* ══ TRUST WATCHLIST ════════════════════════════════════════════════ */}
        {activeTab === 'watchlist' && (
          <div className="space-y-4">
            <div className="responsive-card p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldAlert className="text-rose-400" size={16} />
                <span>Low-Trust Cook Watchlist</span>
              </h3>
              <p className="text-xs text-gray-400">
                Sellers flagged automatically for trust score below 80%.
              </p>

              {loading ? (
                <div className="flex justify-center py-10"><RefreshCw size={24} className="text-primary-500 animate-spin" /></div>
              ) : lowTrustSellers.length > 0 ? (
                <div className="space-y-3">
                  {lowTrustSellers.map(seller => (
                    <div key={seller.uid} className="bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-white">{seller.name}</h4>
                          {seller.username && <span className="text-[10px] font-mono text-gray-400">@{seller.username}</span>}
                          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold rounded">
                            ⚠ {seller.trustScore || 100}% Trust
                          </span>
                          <StatusBadge status={seller.status} />
                        </div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Mail size={10} className="text-gray-600" />{seller.email}
                          {seller.kitchenName && <> · <ChefHat size={10} className="text-primary-500" />{seller.kitchenName}</>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => handleVerifySeller(seller.uid, false)}
                          className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          Suspend Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="responsive-card p-8 text-center text-gray-400 text-sm">
                  ✅ No low-trust cooks flagged. All profiles meet quality metrics.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ LOCATION CHANGES (RELOCATIONS) ══════════════════════════════════ */}
        {activeTab === 'relocations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Kitchen Relocation Requests</h3>
                <p className="text-[11px] text-gray-400">Review and authorize seller requests to change their permanent kitchen coordinates.</p>
              </div>
              <span className="text-xs bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/20 px-3 py-1 rounded-full font-bold">
                {pendingRelocations.length} Pending
              </span>
            </div>

            {relocations.length === 0 ? (
              <div className="responsive-card p-12 text-center text-xs text-gray-500">
                No kitchen relocation requests have been submitted yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {relocations.map((req) => (
                  <div 
                    key={req.id} 
                    className={`responsive-card p-5 border flex flex-col justify-between gap-4 ${
                      req.status === 'pending'
                        ? 'border-amber-500/35 bg-amber-500/[0.02]'
                        : req.status === 'approved'
                          ? 'border-emerald-500/25 bg-emerald-500/[0.02]'
                          : ''
                    }`}
                  >
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-extrabold text-white text-sm">{req.kitchenName}</h4>
                          <span className="text-[10px] text-gray-400">Seller Name: {req.sellerName}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          req.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            : req.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      <div className="bg-black/25 p-3 rounded-xl space-y-2 border border-white/5 leading-normal">
                        <p className="text-gray-400">
                          <strong>Relocation Reason:</strong>
                          <span className="text-white block mt-0.5 font-medium">"{req.reason}"</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-[10px] border-t border-white/5 pt-2">
                          <div>
                            <strong className="text-gray-500 block uppercase tracking-wider text-[8px]">Current Location</strong>
                            <span className="text-gray-300 block truncate">{req.currentAddress}</span>
                            <span className="text-gray-500 font-mono">{req.currentLocation?.latitude.toFixed(5)}, {req.currentLocation?.longitude.toFixed(5)}</span>
                          </div>
                          <div>
                            <strong className="text-[#00F5FF] block uppercase tracking-wider text-[8px]">Requested Location</strong>
                            <span className="text-white block truncate">{req.requestedAddress}</span>
                            <span className="text-[#00F5FF] font-mono">{req.requestedLocation?.latitude.toFixed(5)}, {req.requestedLocation?.longitude.toFixed(5)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Preview map showing current and requested pins */}
                      {req.currentLocation && req.requestedLocation && (
                        <div className="h-36 rounded-xl overflow-hidden border border-white/5 bg-slate-950/20 relative">
                          <MapView
                            foods={[
                              {
                                id: 'current',
                                foodName: `Current: ${req.kitchenName}`,
                                location: req.currentLocation,
                                sellerName: 'Current Location',
                                status: 'available'
                              },
                              {
                                id: 'requested',
                                foodName: `Requested: ${req.kitchenName}`,
                                location: req.requestedLocation,
                                sellerName: 'Requested Location',
                                status: 'available'
                              }
                            ]}
                            buyerCoords={null}
                            height="144px"
                          />
                        </div>
                      )}

                      {req.status === 'rejected' && req.adminComment && (
                        <div className="bg-rose-500/5 p-2 rounded-lg text-rose-300/80 text-[10px] border border-rose-500/10">
                          <strong>Rejection Reason:</strong> "{req.adminComment}"
                        </div>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => handleRejectRelocation(req.id, req.sellerId)}
                          className="flex-1 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[11px] font-bold rounded-xl transition cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveRelocation(req.id, req.sellerId, req.requestedLocation, req.requestedAddress)}
                          className="flex-2 flex-grow py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[11px] font-black rounded-xl transition cursor-pointer shadow-md shadow-emerald-500/10"
                        >
                          Approve Change
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ REPORTS ════════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="responsive-card p-5 md:col-span-8 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Platform Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-xl text-center">
                  <span className="text-2xl font-black text-secondary-500 block">{buyers.length}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Buyers</span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center">
                  <span className="text-2xl font-black text-primary-500 block">{sellers.length}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Sellers</span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center">
                  <span className="text-2xl font-black text-emerald-400 block">{sellers.filter(s => s.status === 'verified').length}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Verified Cooks</span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center">
                  <span className="text-2xl font-black text-amber-400 block">{pendingSellers.length}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Pending Review</span>
                </div>
                <div className="bg-white/5 p-4 rounded-xl text-center col-span-2">
                  <span className="text-2xl font-black text-emerald-400 block">₹{totalRevenue}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Platform Revenue</span>
                </div>
                {topCook && topCook.financials?.total > 0 && (
                  <div className="bg-white/5 p-4 rounded-xl text-center col-span-2">
                    <span className="text-lg font-black text-primary-500 block truncate">{topCook.name}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Top Earning Cook (₹{topCook.financials?.total || 0})</span>
                  </div>
                )}
              </div>
            </div>

            <div className="responsive-card p-5 md:col-span-4 flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText size={16} className="text-primary-500" />
                  Audit &amp; Exports
                </h3>
                <p className="text-[11px] text-gray-400">
                  Compile database spreadsheets, cook reviews, and handoff transaction logs.
                </p>
              </div>
              <div className="space-y-2">
                {[['PDF', 'text-rose-400'], ['Excel', 'text-secondary-500']].map(([fmt, cls]) => (
                  <button key={fmt} onClick={() => handleExport(fmt)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-bold text-white transition cursor-pointer"
                  >
                    <span>Export Audit Report ({fmt})</span>
                    <FileSpreadsheet size={14} className={cls} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ ANALYTICS ════════════════════════════════════════════════════ */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="responsive-card p-4 bg-slate-900/40 text-center">
                <span className="text-2xl font-black text-primary-500 block">
                  {orders.reduce((acc, o) => acc + (o.quantity || 0), 0)}
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Plates Saved</span>
              </div>
              <div className="responsive-card p-4 bg-slate-900/40 text-center">
                <span className="text-2xl font-black text-secondary-500 block">
                  {(orders.reduce((acc, o) => acc + (o.quantity || 0), 0) * 0.5).toFixed(1)} kg
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Food Waste Saved</span>
              </div>
              <div className="responsive-card p-4 bg-slate-900/40 text-center">
                <span className="text-2xl font-black text-emerald-400 block">
                  ₹{orders.reduce((acc, o) => acc + (o.totalPrice || 0), 0)}
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Platform GMV</span>
              </div>
              <div className="responsive-card p-4 bg-slate-900/40 text-center">
                <span className="text-2xl font-black text-purple-400 block">
                  {users.length}
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Registered Users</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="responsive-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">Daily Signups (Last 7 Days)</h3>
                  <span className="text-[10px] text-primary-500 font-bold">Users</span>
                </div>
                <SVGBarChart data={chartsData.dailySignups} labels={chartsData.dayLabels} color="primary" />
              </div>

              <div className="responsive-card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">Orders Handovers (Last 7 Days)</h3>
                  <span className="text-[10px] text-secondary-500 font-bold">Orders</span>
                </div>
                <SVGBarChart data={chartsData.dailyOrders} labels={chartsData.dayLabels} color="secondary" />
              </div>
            </div>
          </div>
        )}

        {/* ══ COUPONS ══════════════════════════════════════════════════════ */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-slide-up">
            <div className="responsive-card p-5 md:col-span-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Gift size={16} className="text-primary-500" />
                Create Promo Code
              </h3>
              <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-gray-400 font-bold uppercase">Promo Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SAVER20"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Discount (%)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      placeholder="20"
                      value={couponDiscount}
                      onChange={(e) => setCouponDiscount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-bold uppercase">Max Uses</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="100"
                      value={couponMaxUses}
                      onChange={(e) => setCouponMaxUses(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-bold uppercase">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={couponExpiry}
                    onChange={(e) => setCouponExpiry(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-700 text-white font-bold rounded-xl transition shadow-lg shadow-primary-500/20 cursor-pointer"
                >
                  Activate Coupon
                </button>
              </form>
            </div>

            <div className="responsive-card p-5 md:col-span-7 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Promotional Coupons</h3>
              {coupons.length > 0 ? (
                <div className="divide-y divide-white/5 max-h-96 overflow-y-auto pr-1">
                  {coupons.map((coupon) => (
                    <div key={coupon.id} className="py-3 flex justify-between items-center gap-4 text-xs">
                      <div>
                        <span className="font-mono font-black text-sm text-white bg-white/5 px-2 py-1 rounded border border-white/10">{coupon.code}</span>
                        <div className="text-[10px] text-gray-400 mt-1.5 space-x-3">
                          <span>🏷️ {coupon.discountPercent}% OFF</span>
                          <span>👥 Uses: {coupon.usedCount || 0}/{coupon.maxUses}</span>
                          <span className="text-rose-400">📅 Exp: {formatDate(coupon.expiryDate)}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleToggleCoupon(coupon.id, coupon.code, !coupon.active)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition cursor-pointer border ${
                          coupon.active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20'
                            : 'bg-white/5 text-gray-500 border-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                        }`}
                      >
                        {coupon.active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-12 text-xs text-gray-500">No promo coupons created yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ══ DISPUTES ═════════════════════════════════════════════════════ */}
        {activeTab === 'disputes' && (
          <div className="responsive-card p-5 space-y-4 animate-slide-up">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Handoff Dispute Center</h3>
            {disputes.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {disputes.map((d) => (
                  <div key={d.id} className="p-4 bg-white/5 border border-white/5 rounded-xl text-xs space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-white block">Dispute #{d.id.slice(-6)}</span>
                        <span className="text-[9px] text-gray-500">Created: {formatDate(d.createdAt)}</span>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        d.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {d.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-2.5 text-[11px]">
                      <div>
                        <span className="text-gray-500 block">Buyer Name</span>
                        <span className="font-semibold text-gray-200">{d.buyerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Seller Kitchen</span>
                        <span className="font-semibold text-gray-200">{d.sellerName}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-500 text-[10px] block font-bold uppercase">Complaint / Dispute Issue</span>
                      <p className="text-gray-300 font-medium bg-black/20 p-2.5 rounded-lg">"{d.complaint}"</p>
                    </div>

                    {d.status === 'resolved' ? (
                      <div className="bg-emerald-500/5 border-l-2 border-emerald-500 p-3 rounded-r-xl space-y-1 text-[11px]">
                        <span className="font-bold text-emerald-400">Resolution Update</span>
                        <p className="text-gray-400 italic">"{d.resolution}"</p>
                      </div>
                    ) : (
                      resolvingDisputeId === d.id ? (
                        <form onSubmit={handleResolveDispute} className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Provide dispute resolution verdict..."
                            value={disputeResolution}
                            onChange={(e) => setDisputeResolution(e.target.value)}
                            className="flex-grow px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition cursor-pointer"
                          >
                            Submit
                          </button>
                          <button
                            type="button"
                            onClick={() => setResolvingDisputeId(null)}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => {
                            setResolvingDisputeId(d.id);
                            setDisputeResolution('');
                          }}
                          className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg transition text-[10px] uppercase cursor-pointer"
                        >
                          Resolve Dispute
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-12 text-xs text-gray-500">✅ Clean slate! No open complaints or disputes reported.</p>
            )}
          </div>
        )}

        {/* ══ AUDIT LOG ═════════════════════════════════════════════════════ */}
        {activeTab === 'audit' && (
          <div className="responsive-card p-5 space-y-4 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Platform Security Audit Log</h3>
                <p className="text-[10px] text-gray-400">Immutable ledger tracking administrative actions and security overrides.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowManualLogModal(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-slate-950 text-xs font-bold rounded-lg transition active:scale-[0.98] cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add Log Entry</span>
                </button>
                <button
                  onClick={loadAuditLogsData}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-lg border border-white/10 transition cursor-pointer"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                <input
                  type="text"
                  placeholder="Search logs by admin, details, or action..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-secondary-500/50"
                />
              </div>
              <select
                value={auditFilterType}
                onChange={(e) => setAuditFilterType(e.target.value)}
                className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-secondary-500/50 cursor-pointer"
              >
                {['ALL', 'CREATE_COUPON', 'TOGGLE_COUPON', 'VERIFY_SELLER', 'SUSPEND_SELLER', 'APPROVE_RELOCATION', 'REJECT_RELOCATION', 'RESOLVE_DISPUTE', 'MANUAL_OVERRIDE', 'SECURITY_NOTICE'].map(type => (
                  <option key={type} value={type} className="bg-slate-950">{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {filteredAuditLogs.length > 0 ? (
              <div className="overflow-x-auto responsive-card border border-white/5 bg-slate-950/20 backdrop-blur-md rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-[#0e1017]/80 text-[10px] text-gray-400 uppercase tracking-widest font-black">
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Admin</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.04] transition-colors duration-150">
                        <td className="p-4 text-gray-500 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : 'N/A'}
                        </td>
                        <td className="p-4 font-semibold text-white whitespace-nowrap">{log.adminName}</td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            log.actionType === 'CREATE_COUPON' ? 'bg-primary-500/10 text-primary-500 border-primary-500/20' :
                            log.actionType === 'VERIFY_SELLER' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            log.actionType === 'SUSPEND_SELLER' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            log.actionType === 'SECURITY_NOTICE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {log.actionType}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-12 text-xs text-gray-500">No matching audit logs found.</p>
            )}
          </div>
        )}

        {/* Manual Audit Log Entry Modal */}
        {showManualLogModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowManualLogModal(false)} />
            <div className="relative w-full max-w-md responsive-card p-6 shadow-2xl z-10 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Record Audit Entry</h3>
              <form onSubmit={handleAddManualLog} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Action Type</label>
                  <select
                    value={manualAction}
                    onChange={(e) => setManualAction(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-secondary-500/50 cursor-pointer"
                  >
                    <option value="MANUAL_OVERRIDE" className="bg-slate-950">Manual Override</option>
                    <option value="SECURITY_NOTICE" className="bg-slate-950">Security Notice</option>
                    <option value="SYSTEM_OVERRIDE" className="bg-slate-950">System Override</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Audit Details / Reason</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter details explaining this administrative action or security notice..."
                    value={manualDetails}
                    onChange={(e) => setManualDetails(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-secondary-500/50 placeholder:text-gray-600"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualLogModal(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingLog}
                    className="px-4 py-2 bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {submittingLog && <RefreshCw size={12} className="animate-spin" />}
                    <span>Record Log</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Admin;
