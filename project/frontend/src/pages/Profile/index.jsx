import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import TrustScore from '../../components/TrustScore';
import MapView from '../../components/MapView';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldAlert, 
  ShoppingBag, 
  Award,
  LogOut,
  Compass,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSellerOrders, recalculateSellerEarnings } from '../../firebase/firestore';

export const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [userFinancials, setUserFinancials] = useState(user?.financials || null);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [financialsLoading, setFinancialsLoading] = useState(false);

  const loadFinancialRecords = async () => {
    if (user?.role !== 'seller') return;
    setFinancialsLoading(true);
    try {
      const freshFinancials = await recalculateSellerEarnings(user.uid);
      if (freshFinancials) {
        setUserFinancials(freshFinancials);
      }
      
      const allOrders = await getSellerOrders(user.uid);
      const completed = allOrders.filter(o => o.status === 'completed');
      setCompletedOrders(completed);
    } catch (e) {
      console.error("Failed to load financial records:", e);
    } finally {
      setFinancialsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'seller') {
      loadFinancialRecords();
    }
  }, [user]);

  const handleSignOut = async () => {
    await logout();
    navigate('/auth');
  };

  const userCoords = user ? { latitude: user.latitude, longitude: user.longitude } : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:px-8 space-y-6">
      
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <User className="text-primary-500" size={24} />
          <span>My Profile Portal</span>
        </h1>
        <p className="text-xs text-gray-400">View and manage your account details and coordinate pinning.</p>
      </div>

      {user ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Side Card: Profile details */}
          <div className="md:col-span-5 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 text-center space-y-4">
              {/* Avatar */}
              <div className="relative w-24 h-24 mx-auto rounded-full bg-primary-500/10 border-2 border-primary-500/30 flex items-center justify-center text-primary-500">
                <User size={40} />
              </div>

              {/* Name & Role */}
              <div>
                <h3 className="text-xl font-bold text-white">{user.name}</h3>
                <span className="inline-block px-2.5 py-0.5 mt-1 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary-500/10 text-secondary-500 border border-secondary-500/20">
                  {user.role === 'seller' ? 'Home Cook / Seller' : user.role === 'admin' ? 'Platform Admin' : 'Buyer / Eco-Hero'}
                </span>
              </div>

              {/* Seller Trust Score */}
              {user.role === 'seller' && (
                <div className="pt-2">
                  <TrustScore score={user.trustScore || 100} className="mx-auto" />
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-4 text-xs text-left">
                <div className="bg-white/5 p-3 rounded-xl text-center">
                  <ShoppingBag className="mx-auto text-primary-500 mb-1" size={18} />
                  <span className="text-sm font-extrabold text-white block">
                    {user.role === 'seller' ? 'Seller Mode' : user.role === 'admin' ? 'Admin Mode' : 'Buyer Mode'}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">User Role</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl text-center">
                  <Award className="mx-auto text-secondary-500 mb-1" size={18} />
                  <span className="text-sm font-extrabold text-white block">
                    {user.role === 'seller' ? 'Top Chef' : user.role === 'admin' ? 'Super Admin' : 'Eco Saver'}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Rank Tier</span>
                </div>
              </div>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign Out of FoodLoop</span>
              </button>
            </div>
          </div>

          {/* Right Side: Detailed fields & GPS coordinates */}
          <div className="md:col-span-7 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Account Credentials</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <Mail className="text-gray-500" size={18} />
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Email Address</span>
                    <span className="text-white font-medium">{user.email}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <Phone className="text-gray-500" size={18} />
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">Mobile Phone</span>
                    <span className="text-white font-medium">{user.mobile || 'Not set'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-sm">
                  <Compass className="text-gray-500" size={18} />
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold">GPS Coordinates</span>
                    <span className="text-white font-medium">{user.latitude.toFixed(6)}, {user.longitude.toFixed(6)}</span>
                  </div>
                </div>
              </div>

              {/* Mini Coordinates Map */}
              <div className="border-t border-white/5 pt-4 space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <MapPin size={14} className="text-secondary-500" />
                  <span>Pinned Home Coordinate Pin</span>
                </h4>
                {userCoords && (
                  <MapView foods={[]} buyerCoords={userCoords} height="240px" />
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Financial Statements Section (Sellers only) */}
        {user.role === 'seller' && (
          <div className="glass-panel p-6 rounded-2xl border border-primary-500/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <TrendingUp className="text-primary-500" size={20} />
                  <span>Financial Statements &amp; Records</span>
                </h3>
                <p className="text-xs text-gray-400">Statement breakdown of your home-cooked meal earnings.</p>
              </div>
              {financialsLoading ? (
                <RefreshCw className="animate-spin text-primary-500" size={16} />
              ) : (
                <button
                  onClick={loadFinancialRecords}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-xs transition cursor-pointer"
                >
                  <RefreshCw size={12} /> Sync Statement
                </button>
              )}
            </div>

            {/* Earnings Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Weekly Earnings', value: userFinancials?.weekly || 0, color: 'text-blue-400', period: 'Last 7 days' },
                { label: 'Monthly Earnings', value: userFinancials?.monthly || 0, color: 'text-amber-400', period: 'Last 30 days' },
                { label: 'Yearly Earnings', value: userFinancials?.yearly || 0, color: 'text-secondary-500', period: 'Last 365 days' },
                { label: 'Total Revenue', value: userFinancials?.total || 0, color: 'text-primary-500', period: 'All time' },
              ].map(({ label, value, color, period }) => (
                <div key={label} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">{label}</span>
                  <span className={`text-2xl font-black ${color}`}>₹{value}</span>
                  <span className="text-[9px] text-gray-500 block">{period}</span>
                </div>
              ))}
            </div>

            {/* Completed Orders List (Financial Statement Table) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Itemized Statement List</h4>
              {completedOrders.length === 0 ? (
                <div className="bg-white/2 border border-white/5 p-8 rounded-xl text-center text-xs text-gray-500">
                  No completed order transactions found. Complete orders via OTP to see statements.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5 text-[10px] text-gray-400 uppercase font-semibold">
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Meal Name</th>
                        <th className="p-3">Quantity</th>
                        <th className="p-3 text-right">Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {completedOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-white/2">
                          <td className="p-3 font-mono text-gray-500">#{o.id.slice(-6)}</td>
                          <td className="p-3">{new Date(o.createdAt || o.completedAt || Date.now()).toLocaleDateString('en-IN')}</td>
                          <td className="p-3 font-semibold text-white">{o.foodName}</td>
                          <td className="p-3">{o.quantity} plates</td>
                          <td className="p-3 text-right font-black text-emerald-400">₹{o.totalPrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </div>
        )}
        </>
      ) : (
        <div className="glass-panel p-12 text-center text-gray-400 rounded-2xl">
          Please login to view your profile coordinates.
        </div>
      )}

    </div>
  );
};

export default Profile;
