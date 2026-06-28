import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import TrustScore from '../../components/TrustScore';
import MapView from '../../components/MapView';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  Award,
  LogOut,
  Compass,
  TrendingUp,
  RefreshCw,
  Lock,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSellerOrders, recalculateSellerEarnings } from '../../firebase/firestore';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import LocationPickerMap from '../../components/LocationPickerMap';

export const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showRelocationModal, setShowRelocationModal] = useState(false);
  const [newLocation, setNewLocation] = useState(null);
  const [newAddress, setNewAddress] = useState('');
  const [relocationReason, setRelocationReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [latestRequest, setLatestRequest] = useState(null);

  const [userFinancials, setUserFinancials] = useState(user?.financials || null);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [financialsLoading, setFinancialsLoading] = useState(false);

  const loadFinancialRecords = useCallback(async () => {
    if (user?.role !== 'seller') return;
    setFinancialsLoading(prev => prev ? prev : true);
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
  }, [user]);

  const fetchLatestRelocationRequest = useCallback(async () => {
    if (user?.role !== 'seller') return;
    try {
      const q = query(
        collection(db, 'locationChangeRequests'),
        where('sellerId', '==', user.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setLatestRequest(list[0]);
      }
    } catch (err) {
      console.error("Failed to fetch relocation request:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'seller') {
      const timer = setTimeout(() => {
        loadFinancialRecords();
        fetchLatestRelocationRequest();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, loadFinancialRecords, fetchLatestRelocationRequest]);

  const handleSignOut = async () => {
    await logout();
    navigate('/auth');
  };

  const handleSubmitRelocation = async (e) => {
    e.preventDefault();
    if (!newLocation) {
      alert("Please select a new kitchen location on the map.");
      return;
    }
    if (!relocationReason.trim()) {
      alert("Please enter a reason for relocation.");
      return;
    }

    setSubmittingRequest(true);
    try {
      const requestData = {
        sellerId: user.uid,
        sellerName: user.name,
        kitchenName: user.kitchenName || user.name,
        currentLocation: { latitude: user.latitude, longitude: user.longitude },
        currentAddress: user.kitchenAddress || '',
        requestedLocation: { latitude: parseFloat(newLocation.latitude), longitude: parseFloat(newLocation.longitude) },
        requestedAddress: newAddress || 'Selected Map Location',
        reason: relocationReason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'locationChangeRequests'), requestData);
      alert("Relocation request submitted successfully. Admin review is pending.");
      setShowRelocationModal(false);
      setNewLocation(null);
      setNewAddress('');
      setRelocationReason('');
      await fetchLatestRelocationRequest();
    } catch (err) {
      console.error("Failed to submit relocation request:", err);
      alert("Error submitting request: " + err.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const userCoords = useMemo(() => {
    if (!user) return null;
    const lat = parseFloat(user.latitude);
    const lng = parseFloat(user.longitude);
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      return null;
    }
    return { latitude: lat, longitude: lng };
  }, [user]);

  return (
    <div className="min-h-screen bg-[#060709] py-6">
      <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-6">
        
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
              <div className="responsive-card p-6 text-center space-y-4">
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
              <div className="responsive-card p-6 space-y-4">
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
                      <span className="text-white font-medium">{Number(user.latitude || 0).toFixed(6)}, {Number(user.longitude || 0).toFixed(6)}</span>
                    </div>
                  </div>
                </div>

                {/* Location locking / Relocation section for Sellers */}
                {user.role === 'seller' && (
                  <div className="border-t border-white/5 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Lock size={12} className="text-primary-500" />
                        Locked Location
                      </span>
                      <button
                        onClick={() => setShowRelocationModal(true)}
                        disabled={latestRequest?.status === 'pending'}
                        className="px-3.5 py-1.5 bg-[#00F5FF]/10 hover:bg-[#00F5FF]/20 disabled:bg-white/5 disabled:text-gray-500 border border-[#00F5FF]/20 disabled:border-white/5 text-[#00F5FF] disabled:cursor-not-allowed text-[11px] font-bold rounded-xl transition cursor-pointer"
                      >
                        Request Location Change
                      </button>
                    </div>

                    {latestRequest && latestRequest.status === 'pending' && (
                      <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-xl flex items-start gap-2 text-amber-200/90 text-[11px] leading-relaxed">
                        <span>⏳</span>
                        <div>
                          <strong>Location change request pending admin review.</strong>
                          <p className="text-[10px] text-gray-400 mt-0.5">Requested Coordinates: {Number(latestRequest.requestedLocation?.latitude).toFixed(5)}, {Number(latestRequest.requestedLocation?.longitude).toFixed(5)}</p>
                        </div>
                      </div>
                    )}

                    {latestRequest && latestRequest.status === 'rejected' && (
                      <div className="bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl flex items-start gap-2 text-rose-300 text-[11px] leading-relaxed">
                        <span>❌</span>
                        <div>
                          <strong>Previous relocation request rejected by Admin.</strong>
                          <p className="text-[10px] text-rose-300/80 mt-0.5">Reason: "{latestRequest.adminComment || 'No explanation provided'}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
            <div className="responsive-card p-6 space-y-6">
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
                            <td className="p-3">{new Date(o.createdAt || o.completedAt || 0).toLocaleDateString('en-IN')}</td>
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
          <div className="responsive-card p-12 text-center text-gray-400">
            Please login to view your profile coordinates.
          </div>
        )}

        {/* Relocation Request Modal */}
        {showRelocationModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowRelocationModal(false)}
            />
            <div className="relative w-full max-w-lg responsive-card p-6 shadow-2xl z-10 flex flex-col space-y-4">
              <button
                onClick={() => setShowRelocationModal(false)}
                className="absolute top-4 right-4 p-2 bg-slate-900/50 hover:bg-slate-900 text-gray-400 hover:text-white rounded-full border border-white/10 transition cursor-pointer"
              >
                <X size={16} />
              </button>

              <header className="border-b border-white/5 pb-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="text-[#00F5FF]" size={20} />
                  <span>Request Coordinate Relocation</span>
                </h2>
                <p className="text-[11px] text-gray-400 mt-1">Select your new kitchen location and provide a reason for the relocation request.</p>
              </header>

              <form onSubmit={handleSubmitRelocation} className="space-y-4">
                {/* Map location picker */}
                <div className="rounded-xl overflow-hidden border border-white/5 bg-black/25 relative">
                  <LocationPickerMap
                    initialLocation={userCoords}
                    onLocationChange={(loc) => setNewLocation(loc)}
                    onAddressResolved={(addr) => setNewAddress(addr)}
                    height="220px"
                  />
                </div>

                {newLocation && (
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-[10px] font-mono text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Requested Lat: {newLocation.latitude.toFixed(6)}</span>
                      <span>Requested Lng: {newLocation.longitude.toFixed(6)}</span>
                    </div>
                    {newAddress && <p className="leading-tight text-white/70">Address: {newAddress}</p>}
                  </div>
                )}

                {/* Relocation Reason */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Reason for relocation *</label>
                  <textarea
                    required
                    placeholder="Provide a reason for the address/coordinate change (e.g. Moved to a new house, correction, kitchen relocated...)"
                    rows={3}
                    value={relocationReason}
                    onChange={(e) => setRelocationReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white placeholder-gray-600 focus:outline-none text-xs resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRelocationModal(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-full border border-white/10 text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest || !newLocation}
                    className="flex-2 flex-grow py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-slate-950 font-black rounded-full text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {submittingRequest ? <RefreshCw className="animate-spin text-slate-950" size={14} /> : 'Submit Request'}
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

export default Profile;
