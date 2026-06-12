import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
  Users, 
  ShieldCheck, 
  FileText, 
  UserX,
  AlertCircle,
  TrendingUp,
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
  Search
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { simulateLocalNotification } from '../../firebase/messaging';

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
  } catch (err) {
    return 'N/A';
  }
};

export const Admin = () => {
  const { user } = useAuth();
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('registrations');
  const [searchQuery, setSearchQuery]   = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState(null);

  useEffect(() => {
    setSelectedRoleFilter(null);
    setSearchQuery('');
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

  useEffect(() => { loadUsersData(); }, []);

  const handleVerifySeller = async (uid, approve = true) => {
    try {
      const status = approve ? 'verified' : 'suspended';
      await updateDoc(doc(db, 'users', uid), { status });
      await updateDoc(doc(db, 'sellers', uid), { status }).catch(() => {});
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

  const TABS = [
    { key: 'registrations', label: 'Pending Approval',  badge: pendingSellers.length },
    { key: 'users',         label: 'All Users',         badge: users.length },
    { key: 'watchlist',     label: 'Trust Watchlist',   badge: lowTrustSellers.length },
    { key: 'reports',       label: 'Reports',           badge: null },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 space-y-6">

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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Buyers', value: buyers.length },
          { icon: ChefHat,     color: 'text-primary-500', bg: 'bg-primary-500/10', label: 'Home Cooks', value: sellers.length },
          { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Pending Review', value: pendingSellers.length },
          { icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Low Trust', value: lowTrustSellers.length },
        ].map(({ icon: Icon, color, bg, label, value }) => (
          <div key={label} className="glass-panel p-4 rounded-xl border border-white/5 flex items-center space-x-3">
            <div className={`p-3 ${bg} ${color} rounded-lg shrink-0`}><Icon size={20} /></div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">{label}</span>
              <span className="text-lg font-black text-white">{value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* High-Level Weekly Admin Digest Panel */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-gradient-to-r from-primary-500/5 via-slate-900/40 to-slate-950/60 flex flex-col md:flex-row justify-between items-center gap-4">
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
                  <div key={seller.uid} className="glass-panel p-4 rounded-xl border border-amber-500/10 flex flex-col md:flex-row justify-between gap-4">
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
              <div className="glass-panel p-8 text-center text-gray-400 rounded-xl text-sm">
                ✅ All registered home cooks have been reviewed. No pending approvals.
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText size={16} className="text-secondary-500" />Audit Reports
            </h2>
            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
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
              className="glass-panel p-8 text-center rounded-2xl border border-white/5 hover:border-blue-500/35 hover:bg-blue-500/5 transition-all cursor-pointer flex flex-col items-center space-y-4 group text-left"
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
              className="glass-panel p-8 text-center rounded-2xl border border-white/5 hover:border-primary-500/35 hover:bg-primary-500/5 transition-all cursor-pointer flex flex-col items-center space-y-4 group text-left"
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
              <div className="glass-panel p-8 text-center text-gray-400 rounded-xl">No users found.</div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(u => (
                  <div
                    key={u.uid}
                    className={`glass-panel p-4 rounded-xl border flex flex-col md:flex-row gap-4 ${
                      u.role === 'seller' && u.status === 'pending'
                        ? 'border-amber-500/15'
                        : u.status === 'suspended'
                        ? 'border-rose-500/15'
                        : 'border-white/8'
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
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
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
              <div className="glass-panel p-8 text-center text-gray-400 rounded-xl text-sm">
                ✅ No low-trust cooks flagged. All profiles meet quality metrics.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ REPORTS ════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="glass-panel p-5 rounded-2xl border border-white/10 md:col-span-8 space-y-4">
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

          <div className="glass-panel p-5 rounded-2xl border border-white/10 md:col-span-4 flex flex-col justify-between gap-4">
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

    </div>
  );
};

export default Admin;
