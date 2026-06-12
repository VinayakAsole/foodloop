import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAvailableFoods, createOrder } from '../../firebase/firestore';
import { calculateDistance, formatDistance } from '../../utils/haversine';
import MapView from '../../components/MapView';
import LiveCounter from '../../components/LiveCounter';
import TrustScore from '../../components/TrustScore';
import TiltCard from '../../components/TiltCard';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Phone, 
  ShoppingBag, 
  ChefHat, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Star
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const FoodDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [food, setFood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Time remaining states
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  // Fetch food item
  useEffect(() => {
    const fetchFoodDetail = async () => {
      setLoading(true);
      try {
        const availableList = await getAvailableFoods();
        const found = availableList.find(f => f.id === id);
        
        if (found) {
          setFood(found);
        } else {
          setError("This food listing has sold out or expired.");
        }
      } catch (err) {
        setError("Error loading food details.");
      } finally {
        setLoading(false);
      }
    };

    fetchFoodDetail();
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (!food) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const expiry = new Date(food.expiryTime);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else {
        setTimeLeft(`${minutes}m left`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [food]);

  const userCoords = user ? { latitude: user.latitude, longitude: user.longitude } : null;

  const distance = userCoords && food?.location
    ? calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        food.location.latitude,
        food.location.longitude
      )
    : null;

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (user.role !== 'buyer') {
      setError("Only Buyers can purchase food items.");
      return;
    }

    setOrderSubmitting(true);
    setError(null);

    try {
      const orderPayload = {
        foodId: food.id,
        foodName: food.foodName,
        quantity: parseInt(quantity),
        totalPrice: food.isDonation ? 0 : food.price * quantity,
        buyerId: user.uid,
        buyerName: user.name,
        sellerId: food.sellerId,
        sellerName: food.sellerName,
        isDonation: food.isDonation,
        location: food.location,
        category: food.category || ''
      };

      await createOrder(orderPayload);

      // Success animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Redirect to tracker
      setTimeout(() => {
        navigate('/orders');
      }, 1500);
      
    } catch (err) {
      setError(err.message || "Checkout failed. Stock count might have changed.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-3">
        <RefreshCw size={36} className="text-primary-500 animate-spin" />
        <p className="text-xs text-gray-400 font-medium">Loading listing details...</p>
      </div>
    );
  }

  if (error && !food) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="text-amber-500 mx-auto" size={48} />
        <h2 className="text-xl font-bold text-white">Item Unavailable</h2>
        <p className="text-sm text-gray-400">{error}</p>
        <Link
          to="/"
          className="inline-flex items-center space-x-1 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition"
        >
          <ArrowLeft size={14} />
          <span>Browse Active Foods</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 space-y-6">
      {/* Back link */}
      <Link to="/" className="inline-flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white transition">
        <ArrowLeft size={16} />
        <span>Back to Browse</span>
      </Link>

      {error && (
        <div className="text-xs font-semibold text-rose-400 bg-rose-500/5 border border-rose-500/10 p-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Images & Info Details */}
        <div className="md:col-span-7 space-y-6">
          <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-lg">
            <img
              src={food.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'}
              alt={food.foodName}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md text-white border border-white/10 text-xs font-bold px-3 py-1.5 rounded-lg">
              {food.category}
            </div>
            <div className="absolute bottom-4 right-4">
              <LiveCounter foodId={food.id} initialQuantity={food.remainingQuantity} />
            </div>
          </div>

          {/* Core Info Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-white">{food.foodName}</h1>
                 <div className="flex items-center space-x-3 mt-1.5">
                  <span className="text-xs font-medium text-primary-500 flex items-center space-x-1">
                    <ChefHat size={14} className="mr-0.5" />
                    <span>Kitchen: {food.sellerName}</span>
                  </span>
                  <TrustScore score={food.sellerTrustScore || 90} className="scale-90" />
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-xs text-gray-400 block font-medium">Pricing</span>
                {food.isDonation ? (
                  <span className="text-lg font-black text-tertiary-500">FREE</span>
                ) : (
                  <span className="text-2xl font-black text-white">₹{food.price}</span>
                )}
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-1.5">Description</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {food.description || 'Surplus homemade food prepared freshly under high hygiene. Grab it before it goes waste!'}
              </p>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs">
              <div className="flex items-center space-x-2 text-gray-300">
                <div className="p-2 bg-primary-500/10 text-primary-500 rounded-lg">
                  <Clock size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">Freshness Expiry</span>
                  <span className={isExpired ? 'text-rose-400 font-bold' : 'font-bold'}>{timeLeft}</span>
                </div>
              </div>

              {distance !== null && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <div className="p-2 bg-secondary-500/10 text-secondary-500 rounded-lg">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase block font-semibold">Proximity Distance</span>
                    <span className="font-bold">{formatDistance(distance)} away</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Map & Order Panel */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Order Placement Panel */}
           <TiltCard className="glass-panel p-6 rounded-2xl border border-primary-500/15 shadow-xl relative overflow-hidden">
            {/* Primary glow accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl"></div>

            <h3 className="text-lg font-bold text-white flex items-center gap-1.5 mb-4">
              <ShoppingBag className="text-primary-500" size={18} />
              <span>Checkout Handoff</span>
            </h3>

            {food.remainingQuantity > 0 && !isExpired ? (
              <div className="space-y-4">
                {/* Quantity selector */}
                <div className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-white block">Quantity</span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Maximum {food.remainingQuantity} plates</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold text-white border border-white/5"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold text-white w-4 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(prev => Math.min(food.remainingQuantity, prev + 1))}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-bold text-white border border-white/5"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="space-y-1.5 text-xs text-gray-400 border-t border-white/5 pt-4">
                  <div className="flex justify-between">
                    <span>Base Price per Plate</span>
                    <span className="text-white">{food.isDonation ? 'FREE' : `₹${food.price}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected Plates</span>
                    <span className="text-white">x{quantity}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-3 text-sm font-bold">
                    <span className="text-white">Total Handoff Cost</span>
                    <span className="text-primary-500 text-base">
                      {food.isDonation ? 'FREE (Surplus Donation)' : `₹${food.price * quantity}`}
                    </span>
                  </div>
                </div>

                {/* Order trigger button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={orderSubmitting}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-500/10"
                >
                  {orderSubmitting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Creating Secure OTP Handoff...</span>
                    </>
                  ) : (
                    <span>Confirm Handoff Order</span>
                  )}
                </button>

                <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 font-bold space-y-0.5 text-center">
                  <p>🏠 SELF-PICKUP HANDOFF ONLY</p>
                  <p className="text-gray-400 font-normal">There is no home delivery option. You must collect the meal directly from the cook's kitchen location shown below.</p>
                </div>
                
                <p className="text-[10px] text-gray-500 text-center mt-2">
                  Placing an order generates a secure 6-digit verification code. Provide this code to the cook at pickup to verify handoff.
                </p>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertTriangle className="text-rose-500 mx-auto mb-2" size={36} />
                <h4 className="font-bold text-white">Sold Out or Expired</h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
                  We are sorry, this home cook listing is no longer accepting orders. Go back to discover nearby meals.
                </p>
              </div>
            )}
          </TiltCard>

          {/* Seller Location Map Panel - Enhanced */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin size={14} className="text-primary-500" />
                <span>Kitchen Location &amp; Navigation</span>
              </h4>
              {food?.location && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${food.location.latitude},${food.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 bg-secondary-500/10 border border-secondary-500/20 text-secondary-500 text-[10px] font-bold rounded-lg hover:bg-secondary-500/20 transition"
                >
                  <Phone size={10} />
                  Get Directions
                </a>
              )}
            </div>

            {/* Seller Info Details */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex items-start gap-2">
                <ChefHat size={13} className="text-primary-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Kitchen</span>
                  <span className="text-white font-bold">{food.kitchenName || food.sellerName}</span>
                </div>
              </div>
              {food.sellerAddress && (
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-secondary-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Address</span>
                    <span className="text-gray-200">{food.sellerAddress}</span>
                  </div>
                </div>
              )}
              {food?.location && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-gray-500 font-mono mt-0.5 shrink-0">📍</span>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Coordinates</span>
                    <span className="text-gray-300 font-mono text-[10px]">
                      {food.location.latitude?.toFixed(6)}, {food.location.longitude?.toFixed(6)}
                    </span>
                  </div>
                </div>
              )}
              {distance !== null && (
                <div className="flex items-start gap-2">
                  <span className="text-[10px] mt-0.5 shrink-0">🚶</span>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Your Distance</span>
                    <span className="text-secondary-500 font-bold">{formatDistance(distance)} away from you</span>
                  </div>
                </div>
              )}
            </div>

            <MapView foods={[food]} buyerCoords={userCoords} height="240px" />

            {/* Open in Google Maps full link */}
            {food?.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${food.location.latitude},${food.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-xl transition"
              >
                <MapPin size={12} className="text-primary-500" />
                View on Google Maps
              </a>
            )}
          </div>

        </div>

      </div>

      {/* Community Reviews & Handoff Photos */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4 mt-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Star className="text-tertiary-500 fill-current" size={16} />
            <span>Community Reviews & Handoff Photos ({food.sellerTrustScore ? '2' : '2'} reviews)</span>
          </h3>
          <span className="text-xs text-gray-400">Trust Index: <strong className="text-white">{food.sellerTrustScore || 90}%</strong></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-white">Amit R.</span>
                <span className="text-[9px] text-gray-500 block">Ordered 2 days ago</span>
              </div>
              <div className="flex text-tertiary-500">
                <Star size={12} className="fill-current" />
                <Star size={12} className="fill-current" />
                <Star size={12} className="fill-current" />
                <Star size={12} className="fill-current" />
                <Star size={12} className="fill-current" />
              </div>
            </div>
            <p className="text-xs text-gray-300">"Piping hot biryani with soft paneer cubes. The handoff was extremely smooth and took less than 2 minutes!"</p>
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shrink-0">
              <img src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=120" className="w-full h-full object-cover" alt="Handoff Food" />
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-white">Kiran K.</span>
                <span className="text-[9px] text-gray-500 block">Ordered 5 days ago</span>
              </div>
              <div className="flex text-tertiary-500">
                <Star size={12} className="fill-current" />
                <Star size={12} className="fill-current" />
                <Star size={12} className="fill-current" />
                <Star size={12} className="fill-current" />
                <Star size={12} className="fill-current" />
              </div>
            </div>
            <p className="text-xs text-gray-300">"Authentic local taste. Great packaging, very clean container. Highly recommend this chef to everyone nearby!"</p>
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shrink-0">
              <img src="https://images.unsplash.com/photo-1626857003408-251f28741366?w=120" className="w-full h-full object-cover" alt="Handoff Food" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FoodDetail;
