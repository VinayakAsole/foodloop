import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getUserProfile } from '../../firebase/auth';
import { getSellerFoods, getSellerReviews } from '../../firebase/firestore';
import FoodCard from '../../components/FoodCard';
import MapView from '../../components/MapView';
import TrustScore from '../../components/TrustScore';
import TiltCard from '../../components/TiltCard';
import ChatDrawer from '../../components/ChatDrawer';
import {
  ChefHat,
  ShieldCheck,
  Star,
  MapPin,
  MessageSquare,
  Clock,
  ArrowLeft,
  AlertCircle,
  UtensilsCrossed,
  RefreshCw
} from 'lucide-react';

export const SellerProfile = () => {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [seller, setSeller] = useState(null);
  const [foods, setFoods] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' or 'reviews'

  // Chat coordination state
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const fetchSellerData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profile, activeFoods, sellerReviews] = await Promise.all([
          getUserProfile(sellerId),
          getSellerFoods(sellerId),
          getSellerReviews(sellerId)
        ]);

        if (profile) {
          setSeller(profile);
          // Only show foods that are available
          setFoods(activeFoods.filter(f => f.status === 'available'));
          setReviews(sellerReviews);
        } else {
          setError("Seller profile not found.");
        }
      } catch (err) {
        console.error("Error fetching seller profile data:", err);
        setError("Failed to load seller profile details.");
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      fetchSellerData();
    }
  }, [sellerId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-3">
        <RefreshCw size={36} className="text-primary-500 animate-spin" />
        <p className="text-xs text-gray-400 font-medium">Loading kitchen profile...</p>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="text-rose-500 mx-auto" size={48} />
        <h2 className="text-xl font-bold text-white">Profile Unavailable</h2>
        <p className="text-sm text-gray-400">{error || "Could not retrieve this kitchen's profile."}</p>
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Browse</span>
        </Link>
      </div>
    );
  }

  // Haversine calculation user coordinates
  const userCoords = React.useMemo(() => {
    if (!user) return null;
    const lat = parseFloat(user.latitude);
    const lng = parseFloat(user.longitude);
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      return null;
    }
    return { latitude: lat, longitude: lng };
  }, [user?.latitude, user?.longitude]);

  // Check kitchen status badge styling
  const getKitchenStatusBadge = (status) => {
    const kStatus = status || seller.kitchenStatus || 'ready';
    const mapping = {
      ready: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: '🟢 Open / Ready' },
      cooking: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: '👨‍🍳 Preparing Meals' },
      closed: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20', label: '🔴 Closed for Today' }
    };
    return mapping[kStatus] || mapping.ready;
  };

  const statusBadge = getKitchenStatusBadge(seller.kitchenStatus);

  // Compute average review rating
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : 'N/A';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 space-y-6 text-white pb-24 pt-20">
      {/* Back link */}
      <Link to="/" className="inline-flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white transition">
        <ArrowLeft size={16} />
        <span>Back to Browse</span>
      </Link>

      {/* Profile Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Kitchen Info Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <TiltCard className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col items-center text-center relative overflow-hidden shadow-2xl">
            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl"></div>

            {/* Avatar / Photo */}
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-900 border-2 border-white/10 mb-4 flex items-center justify-center">
              {seller.profilePhoto ? (
                <img src={seller.profilePhoto} alt={seller.kitchenName} className="w-full h-full object-cover" />
              ) : (
                <ChefHat size={44} className="text-primary-500" />
              )}
            </div>

            {/* Verification Badge */}
            {seller.status === 'verified' && (
              <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full mb-2.5 flex items-center gap-1 tracking-wider">
                <ShieldCheck size={12} />
                <span>Verified Home Chef</span>
              </div>
            )}

            {/* Kitchen Name */}
            <h1 className="text-xl font-black text-white leading-tight">{seller.kitchenName || seller.name}</h1>
            <p className="text-xs text-gray-400 mt-1 font-medium flex items-center justify-center gap-1">
              <MapPin size={12} className="text-primary-500" />
              <span>{seller.kitchenAddress || 'Home Kitchen'}</span>
            </p>

            {/* Kitchen Status Badge */}
            <div className={`mt-3.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.bg}`}>
              {statusBadge.label}
            </div>

            {/* Trust Score & Avg Rating */}
            <div className="grid grid-cols-2 gap-4 w-full border-t border-b border-white/5 py-4 my-4 text-xs font-semibold">
              <div className="flex flex-col items-center justify-center border-r border-white/5">
                <span className="text-gray-400 text-[10px] uppercase block font-bold mb-1">Trust Score</span>
                <TrustScore score={seller.trustScore || 100} showIcon={true} className="scale-90" />
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-gray-400 text-[10px] uppercase block font-bold mb-1">Kitchen Rating</span>
                <div className="flex items-center gap-1 text-sm font-black text-tertiary-500">
                  <Star size={16} className="fill-current text-tertiary-500" />
                  <span>{avgRating}</span>
                  <span className="text-[10px] text-gray-500 font-normal">({reviews.length})</span>
                </div>
              </div>
            </div>

            {/* Message Chat Action */}
            {user && user.uid !== sellerId && (
              <button
                onClick={() => setIsChatOpen(true)}
                className="w-full py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <MessageSquare size={14} />
                Chat with Kitchen Coordinator
              </button>
            )}
          </TiltCard>

          {/* Kitchen Location Map Card */}
          {seller.latitude && seller.longitude && (
            <div className="glass-panel p-4 rounded-3xl border border-white/10 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Kitchen Location</span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <MapPin size={10} className="text-primary-500" />
                  <span>Map View</span>
                </span>
              </div>
              <div className="h-56 rounded-2xl overflow-hidden border border-white/5 bg-slate-950 relative">
                {/* Fake single listing object for MapView display */}
                <MapView 
                  foods={[{
                    id: 'kitchen-loc',
                    foodName: seller.kitchenName || seller.name,
                    location: { latitude: seller.latitude, longitude: seller.longitude },
                    sellerName: seller.name,
                    status: 'available'
                  }]} 
                  buyerCoords={userCoords} 
                  height="224px" 
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Tabbed Content (Active Menu / Customer Reviews) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs Navigation */}
          <div className="flex border-b border-white/10 gap-6">
            <button
              onClick={() => setActiveTab('menu')}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
                activeTab === 'menu' ? 'text-primary-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              Menu Items ({foods.length})
              {activeTab === 'menu' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full shadow-[0_0_8px_#FF6B35]"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
                activeTab === 'reviews' ? 'text-primary-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              Reviews ({reviews.length})
              {activeTab === 'reviews' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full shadow-[0_0_8px_#FF6B35]"></span>
              )}
            </button>
          </div>

          {/* Tab contents */}
          {activeTab === 'menu' ? (
            foods.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {foods.map((food) => (
                  <FoodCard key={food.id} food={food} buyerCoords={userCoords} />
                ))}
              </div>
            ) : (
              <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center">
                <UtensilsCrossed size={40} className="text-gray-500 mb-3" />
                <h3 className="text-md font-bold text-white">No active menu listings</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  This kitchen doesn't have any meals listed as available right now. Check back soon!
                </p>
              </div>
            )
          ) : (
            reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="glass-panel p-5 rounded-2xl border border-white/5 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-white block">{rev.buyerName || 'Verified Buyer'}</span>
                        <span className="text-[9px] text-gray-500">{new Date(rev.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex text-tertiary-500 bg-tertiary-500/5 px-2 py-1 rounded-lg border border-tertiary-500/10">
                        {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                          <Star key={i} size={11} className="fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">"{rev.comment || 'Good food, smooth coordination.'}"</p>
                    
                    {/* Reply rendering */}
                    {rev.reply && (
                      <div className="bg-white/3 border-l-2 border-primary-500 p-3 rounded-r-xl space-y-1 mt-2">
                        <span className="text-[10px] font-bold text-primary-500 flex items-center gap-1">
                          <ChefHat size={11} />
                          Chef's Reply
                        </span>
                        <p className="text-[11px] text-gray-400 italic">"{rev.reply}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center flex flex-col items-center justify-center">
                <Star size={40} className="text-gray-500 mb-3" />
                <h3 className="text-md font-bold text-white">No reviews posted yet</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  No buyer reviews have been submitted for this home chef. Be the first to try their meal!
                </p>
              </div>
            )
          )}
        </div>

      </div>

      {/* Chat koordinations drawer overlay */}
      {isChatOpen && user && seller && (
        <ChatDrawer
          orderId={`coordinate-${sellerId}`} // Custom coordination room
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentUserId={user.uid}
          currentUserName={user.name || user.email?.split('@')[0]}
          recipientName={seller.kitchenName || seller.name}
          isSeller={false}
        />
      )}
    </div>
  );
};

export default SellerProfile;
