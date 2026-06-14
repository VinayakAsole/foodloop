import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getBuyerOrders, addReview, updateOrderStatus } from '../../firebase/firestore';
import { Link } from 'react-router-dom';
import MapView from '../../components/MapView';
import ChatDrawer from '../../components/ChatDrawer';
import { fetchWalkingRoute } from '../../utils/routing';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { subscribeToChat } from '../../firebase/rtdb';
import { simulateLocalNotification } from '../../firebase/messaging';
import TiltCard from '../../components/TiltCard';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  ShieldAlert, 
  Star, 
  Send,
  RefreshCw,
  Gift,
  Bell,
  ChefHat,
  Navigation,
  Flame,
  PackageCheck,
  CircleDot,
  Timer,
  MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ── Tracking Steps Config ─────────────────────────────────────────────
const TRACK_STEPS = [
  { key: 'placed',           label: 'Order Placed',     icon: CircleDot,    color: 'text-blue-400',      bg: 'bg-blue-500/10',      border: 'border-blue-500/20' },
  { key: 'preparing',        label: 'Preparing',        icon: Flame,        color: 'text-amber-400',     bg: 'bg-amber-500/10',     border: 'border-amber-500/20' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: PackageCheck, color: 'text-secondary-500', bg: 'bg-secondary-500/10', border: 'border-secondary-500/20' },
  { key: 'completed',        label: 'Completed',        icon: CheckCircle2, color: 'text-emerald-400',   bg: 'bg-emerald-500/10',   border: 'border-emerald-500/20' },
];
const STATUS_INDEX = { placed: 0, preparing: 1, ready_for_pickup: 2, completed: 3, cancelled: -1 };

// ── Elapsed Time Timer ────────────────────────────────────────────────
const ElapsedTimer = ({ createdAt }) => {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(createdAt).getTime();
      const m = Math.floor(diff / 60000);
      const h = Math.floor(m / 60);
      setElapsed(h > 0 ? `${h}h ${m % 60}m ago` : `${m}m ago`);
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [createdAt]);
  return <span className="text-[10px] text-gray-500 font-mono">{elapsed}</span>;
};

export const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const [activeTab, setActiveTab] = useState('orders');
  const [notificationLogs, setNotificationLogs] = useState([]);

  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Coordination Chat & Routing States
  const [activeChatOrderId, setActiveChatOrderId] = useState(null);
  const [activeChatRecipient, setActiveChatRecipient] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [routeData, setRouteData] = useState({}); // { [orderId]: { coords, distance, duration, steps, showMap, loading, error } }

  const userCoords = React.useMemo(() => {
    if (!user) return null;
    const lat = parseFloat(user.latitude);
    const lng = parseFloat(user.longitude);
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      return null;
    }
    return { latitude: lat, longitude: lng };
  }, [user?.latitude, user?.longitude]);

  const handleToggleRoute = async (order) => {
    const orderId = order.id;
    const current = routeData[orderId] || {};
    
    if (current.showMap) {
      setRouteData(prev => ({
        ...prev,
        [orderId]: { ...prev[orderId], showMap: false }
      }));
      return;
    }

    if (current.coords) {
      setRouteData(prev => ({
        ...prev,
        [orderId]: { ...prev[orderId], showMap: true }
      }));
      return;
    }

    if (!userCoords) {
      setRouteData(prev => ({
        ...prev,
        [orderId]: { ...prev[orderId], showMap: true, error: "Please update your GPS location in profile/settings to enable routing." }
      }));
      return;
    }

    if (!order.location) {
      setRouteData(prev => ({
        ...prev,
        [orderId]: { ...prev[orderId], showMap: true, error: "Seller did not provide GPS coordinates for this listing." }
      }));
      return;
    }

    setRouteData(prev => ({
      ...prev,
      [orderId]: { ...prev[orderId], showMap: true, loading: true, error: null }
    }));

    try {
      const res = await fetchWalkingRoute(userCoords, order.location);
      setRouteData(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          showMap: true,
          loading: false,
          coords: res.coordinates,
          distance: res.distance,
          duration: res.duration,
          steps: res.steps,
          error: null
        }
      }));
    } catch (err) {
      setRouteData(prev => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          showMap: true,
          loading: false,
          error: "Routing server is currently busy. Please try again in a moment."
        }
      }));
    }
  };

  useEffect(() => {
    const reloadLogs = () => {
      const logs = JSON.parse(localStorage.getItem('foodloop_notification_logs') || '[]');
      setNotificationLogs(logs);
    };

    reloadLogs();
    window.addEventListener('notification-logged', reloadLogs);
    return () => window.removeEventListener('notification-logged', reloadLogs);
  }, [activeTab]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getBuyerOrders(user.uid);
      setOrders(data);
      setLastRefresh(Date.now());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Real-time Firestore active orders status listener
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const q = query(collection(db, 'orders'), where('buyerId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      const sorted = data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setOrders((prevOrders) => {
        if (prevOrders && prevOrders.length > 0) {
          sorted.forEach((order) => {
            const oldOrder = prevOrders.find(o => o.id === order.id);
            if (oldOrder && oldOrder.status !== order.status) {
              if (order.status === 'preparing') {
                simulateLocalNotification(
                  "Order Preparing! 🍳", 
                  `Chef ${order.sellerName} started preparing your "${order.foodName}".`, 
                  "info"
                );
              } else if (order.status === 'ready_for_pickup') {
                simulateLocalNotification(
                  "Meal Ready for Pickup! 🎁", 
                  `"${order.foodName}" is ready at ${order.sellerName}'s kitchen. Show OTP: ${order.otpCode}.`, 
                  "success"
                );
              } else if (order.status === 'completed') {
                simulateLocalNotification(
                  "Order Completed! ✓", 
                  `Your order of "${order.foodName}" is picked up. Enjoy your zero-waste meal!`, 
                  "success"
                );
              } else if (order.status === 'cancelled') {
                simulateLocalNotification(
                  "Order Cancelled ✗", 
                  `Your order of "${order.foodName}" has been cancelled.`, 
                  "warning"
                );
              }
            }
          });
        }
        return sorted;
      });
      
      setLastRefresh(Date.now());
      setLoading(false);
    }, (err) => {
      console.error("Orders listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Background Chat Notifications for Active Orders
  useEffect(() => {
    if (!user || orders.length === 0) return;

    const activeOrdersList = orders.filter(
      o => o.status !== 'completed' && o.status !== 'cancelled'
    );

    const unsubscribes = [];
    const lastMessageTimestamps = {};

    activeOrdersList.forEach((order) => {
      lastMessageTimestamps[order.id] = Date.now();

      const unsub = subscribeToChat(order.id, (messages) => {
        if (messages && messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          if (
            lastMsg.senderId !== user.uid && 
            lastMsg.timestamp > lastMessageTimestamps[order.id]
          ) {
            lastMessageTimestamps[order.id] = lastMsg.timestamp;
            if (activeChatOrderId !== order.id || !isChatOpen) {
              simulateLocalNotification(
                `Message from Chef ${lastMsg.senderName}`,
                lastMsg.text,
                "info"
              );
            }
          }
        }
      });
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [orders, user?.uid, activeChatOrderId, isChatOpen]);

  const handleSubmitReview = async (e, order) => {
    e.preventDefault();
    setReviewSubmitting(true);
    try {
      await addReview({ orderId: order.id, buyerId: user.uid, sellerId: order.sellerId, rating, comment });
      confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } });
      setReviewOrderId(null); setComment(''); setRating(5);
      await fetchOrders();
    } catch (err) { console.error(err); }
    finally { setReviewSubmitting(false); }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await updateOrderStatus(orderId, 'cancelled');
      await fetchOrders();
    } catch (e) { alert('Failed to cancel: ' + e.message); }
  };

  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const pastOrders   = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:px-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ShoppingBag className="text-primary-500" size={24} />
            <span>My Orders &amp; Tracker</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Live tracking · auto-refreshes every 30s
            <span className="ml-2 text-gray-600 font-mono">
              Last: {new Date(lastRefresh).toLocaleTimeString()}
            </span>
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-white/5 space-x-4">
        {[['orders', 'Active & History'], ['notifications', 'Notifications']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === key
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {label}
            {key === 'notifications' && notificationLogs.length > 0 && (
              <span className="px-1.5 py-0.5 bg-primary-500 text-slate-950 text-[9px] font-black rounded-full">
                {notificationLogs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════ ORDERS TAB ══════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw size={30} className="text-primary-500 animate-spin" />
            <p className="text-xs text-gray-400">Loading order logs...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-panel p-16 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center">
            <ShoppingBag size={48} className="text-gray-600 mb-3" />
            <h3 className="text-lg font-bold text-white">No orders yet</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Go back to the homepage map to discover delicious, affordable homemade food.
            </p>
            <Link
              to="/"
              className="mt-6 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-primary-500/10"
            >
              Find Nearby Food
            </Link>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── ACTIVE ORDERS (live tracker cards) ── */}
            {activeOrders.length > 0 && (
              <section className="space-y-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-ping inline-block" />
                  Live Active Orders ({activeOrders.length})
                </h2>

                {activeOrders.map(order => {
                  const stepIdx    = STATUS_INDEX[order.status] ?? 0;
                  const progressPct = Math.round((stepIdx / (TRACK_STEPS.length - 1)) * 100);

                  return (
                    <TiltCard key={order.id} className="glass-panel rounded-2xl border border-primary-500/20 overflow-hidden shadow-xl shadow-primary-500/5">

                      {/* Order Header */}
                      <div className="px-5 pt-5 pb-3 flex flex-col md:flex-row justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                              #{order.id.slice(-6)}
                            </span>
                            <ElapsedTimer createdAt={order.createdAt} />
                          </div>
                          <h3 className="text-lg font-black text-white">{order.foodName}</h3>
                          <p className="text-xs text-primary-500 font-medium flex items-center gap-1 mt-0.5">
                            <ChefHat size={12} /> {order.sellerName}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-gray-400 block">Qty: {order.quantity} plates</span>
                          <span className="text-xl font-black text-white">
                            {order.isDonation
                              ? <span className="text-tertiary-500 text-sm flex items-center gap-1 justify-end"><Gift size={14} /> FREE</span>
                              : `₹${order.totalPrice}`}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="px-5 pb-2">
                        <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-700"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1 text-right font-mono">{progressPct}% complete</div>
                      </div>

                      {/* Step Cards */}
                      <div className="px-5 pb-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {TRACK_STEPS.map((step, idx) => {
                            const StepIcon = step.icon;
                            const done   = idx < stepIdx;
                            const active = idx === stepIdx;
                            return (
                              <div
                                key={step.key}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                                  active  ? `${step.bg} ${step.border} shadow-md` :
                                  done    ? 'bg-emerald-500/8 border-emerald-500/15' :
                                            'bg-white/3 border-white/5 opacity-35'
                                }`}
                              >
                                <div className={`p-2 rounded-lg ${active ? step.bg : done ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                                  <StepIcon
                                    size={16}
                                    className={`${
                                      active ? `${step.color}${idx === 1 ? ' animate-pulse' : ''}` :
                                      done   ? 'text-emerald-400' :
                                               'text-gray-600'
                                    }`}
                                  />
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-wide text-center leading-tight ${
                                  active ? step.color : done ? 'text-emerald-400' : 'text-gray-600'
                                }`}>
                                  {step.label}
                                </span>
                                {done   && <span className="text-[8px] text-emerald-500 font-bold">✓ Done</span>}
                                {active && <span className={`text-[8px] font-bold animate-pulse ${step.color}`}>● Now</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Bottom Panel: OTP + Location */}
                      <div className="border-t border-white/5 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">

                        {/* OTP */}
                        <div className="px-5 py-4 flex items-center gap-4">
                          <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl shrink-0">
                            <ShieldAlert size={22} className="text-primary-500 animate-bounce" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Handoff OTP</span>
                            <span className="text-2xl font-black tracking-widest text-primary-500">
                              {order.otpCode?.slice(0,3)} {order.otpCode?.slice(3)}
                            </span>
                            <p className="text-[10px] text-gray-500 mt-0.5">Show to seller at pickup</p>
                            <span className="inline-block mt-1.5 text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">Self-Pickup Handoff Only</span>
                          </div>
                        </div>

                        {/* Location / Directions */}
                        <div className="px-5 py-4 flex items-center gap-4">
                          <div className="p-3 bg-secondary-500/10 border border-secondary-500/20 rounded-xl shrink-0">
                            <Navigation size={22} className="text-secondary-500" />
                          </div>
                          <div className="flex-grow">
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Pickup Coordination</span>
                            {order.location ? (
                              <div className="flex flex-wrap gap-2 mt-2">
                                <button
                                  onClick={() => handleToggleRoute(order)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary-500 hover:bg-secondary-600 text-slate-950 text-[10px] font-black rounded-lg transition cursor-pointer"
                                >
                                  <MapPin size={10} />
                                  <span>{routeData[order.id]?.showMap ? 'Hide Route' : 'Show Walk Route'}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveChatOrderId(order.id);
                                    setActiveChatRecipient(order.sellerName);
                                    setIsChatOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-slate-950 text-[10px] font-black rounded-lg transition cursor-pointer"
                                >
                                  <MessageSquare size={10} />
                                  <span>Chat with Chef</span>
                                </button>
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${order.location.latitude},${order.location.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-lg border border-white/10 transition"
                                >
                                  Google Maps
                                </a>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 mt-0.5">Location not set</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Interactive Routing Display */}
                      {routeData[order.id]?.showMap && (
                        <div className="px-5 pb-5 pt-3 border-t border-white/5 space-y-3">
                          <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                            <MapPin size={12} className="text-secondary-500" />
                            <span>In-App Walk Directions</span>
                          </h4>
                          
                          {routeData[order.id].loading ? (
                            <div className="flex flex-col items-center justify-center py-6 space-y-2 bg-white/3 rounded-xl border border-white/5">
                              <RefreshCw size={20} className="text-secondary-500 animate-spin" />
                              <p className="text-[10px] text-gray-400">Querying walk route from OSRM...</p>
                            </div>
                          ) : routeData[order.id].error ? (
                            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
                              {routeData[order.id].error}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Route stats */}
                              <div className="grid grid-cols-3 gap-2.5 text-xs bg-white/3 p-2.5 border border-white/5 rounded-xl font-mono">
                                <div>
                                  <span className="text-[9px] text-gray-500 uppercase block font-semibold">Walk Distance</span>
                                  <span className="text-white font-black">{(routeData[order.id].distance / 1000).toFixed(2)} km</span>
                                </div>
                                <div className="border-l border-white/5 pl-2.5">
                                  <span className="text-[9px] text-gray-500 uppercase block font-semibold">Walking Time</span>
                                  <span className="text-secondary-500 font-black">{Math.round(routeData[order.id].duration / 60)} mins</span>
                                </div>
                                <div className="border-l border-white/5 pl-2.5">
                                  <span className="text-[9px] text-gray-500 uppercase block font-semibold">Walk Speed</span>
                                  <span className="text-blue-400 font-black">~5 km/h</span>
                                </div>
                              </div>

                              {/* Map Widget */}
                              <div className="rounded-xl overflow-hidden border border-white/10 shadow-inner">
                                <MapView
                                  foods={[{
                                    id: order.id,
                                    foodName: order.foodName,
                                    sellerName: order.sellerName,
                                    category: 'Cook Kitchen',
                                    price: order.totalPrice,
                                    remainingQuantity: order.quantity,
                                    location: order.location
                                  }]}
                                  buyerCoords={userCoords}
                                  routeCoords={routeData[order.id].coords}
                                  height="220px"
                                />
                              </div>

                              {/* Direction Steps */}
                              {routeData[order.id].steps && routeData[order.id].steps.length > 0 && (
                                <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-950/40 p-3 rounded-xl border border-white/5 scrollbar-thin scrollbar-thumb-white/5">
                                  <span className="text-[9px] text-gray-500 uppercase font-black block mb-1">Walking Steps</span>
                                  {routeData[order.id].steps.map((step, sIdx) => (
                                    <div key={sIdx} className="flex justify-between items-start text-[10px] text-gray-300 gap-3 font-mono leading-relaxed">
                                      <span>{sIdx + 1}. {step.instruction}</span>
                                      <span className="text-gray-500 shrink-0">{Math.round(step.distance)}m</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cancel (only when just placed) */}
                      {order.status === 'placed' && (
                        <div className="px-5 pb-4">
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-xs font-bold text-rose-400 transition cursor-pointer"
                          >
                            Cancel Order
                          </button>
                        </div>
                      )}
                    </TiltCard>
                  );
                })}
              </section>
            )}

            {/* ── PAST ORDERS ── */}
            {pastOrders.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Timer size={13} /> Order History ({pastOrders.length})
                </h2>
                {pastOrders.map(order => {
                  const isCompleted = order.status === 'completed';
                  return (
                    <TiltCard key={order.id} className={`glass-panel p-5 rounded-2xl border flex flex-col md:flex-row gap-5 ${
                      isCompleted ? 'border-emerald-500/10' : 'border-rose-500/10'
                    }`}>
                      <div className="flex-grow space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">#{order.id.slice(-6)}</span>
                            <h3 className="text-base font-black text-white">{order.foodName}</h3>
                            <p className="text-xs text-gray-400">by {order.sellerName}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {isCompleted ? '✓ Completed' : '✗ Cancelled'}
                            </span>
                            <div className="text-sm font-extrabold text-white mt-1">
                              {order.isDonation ? <span className="text-tertiary-500 text-xs">🎁 FREE</span> : `₹${order.totalPrice}`}
                            </div>
                          </div>
                        </div>

                        {isCompleted && (
                          <div className="border-t border-white/5 pt-3">
                            {reviewOrderId === order.id ? (
                              <form onSubmit={(e) => handleSubmitReview(e, order)} className="space-y-3">
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Rate {order.sellerName}</h4>
                                <div className="flex items-center space-x-1">
                                  {[1,2,3,4,5].map(star => (
                                    <button key={star} type="button" onClick={() => setRating(star)} className="text-tertiary-500 hover:scale-110 transition-transform">
                                      <Star size={20} fill={star <= rating ? 'currentColor' : 'none'} />
                                    </button>
                                  ))}
                                </div>
                                <div className="relative">
                                  <input
                                    type="text" required placeholder="Describe your experience..."
                                    value={comment} onChange={e => setComment(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:outline-none text-xs"
                                  />
                                  <button type="submit" disabled={reviewSubmitting}
                                    className="absolute right-2 top-1.5 p-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-800 text-slate-950 rounded"
                                  >
                                    <Send size={14} />
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button onClick={() => setReviewOrderId(order.id)}
                                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-primary-500 hover:text-primary-600 transition"
                              >
                                ⭐ Rate Your Experience
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className={`w-full md:w-44 shrink-0 rounded-xl p-4 flex flex-col items-center justify-center text-center ${
                        isCompleted ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-rose-500/5 border border-rose-500/10'
                      }`}>
                        {isCompleted
                          ? <CheckCircle2 size={28} className="text-emerald-400 mb-2" />
                          : <XCircle size={28} className="text-rose-400 mb-2" />
                        }
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {isCompleted ? 'Handoff Done' : 'Cancelled'}
                        </span>
                        <ElapsedTimer createdAt={order.createdAt} />
                      </div>
                    </TiltCard>
                  );
                })}
              </section>
            )}
          </div>
        )
      )}

      {/* ══════════ NOTIFICATIONS TAB ═══════════════════════════════════ */}
      {activeTab === 'notifications' && (
        <div className="space-y-3">
          {notificationLogs.length > 0 ? (
            notificationLogs.map(log => (
              <div key={log.id} className="glass-panel p-4 rounded-xl border border-white/5 flex gap-3">
                <div className="p-2 rounded-lg shrink-0 bg-primary-500/10 text-primary-500"><Bell size={18} /></div>
                <div className="flex-grow space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-white leading-tight">{log.title}</h4>
                    <span className="text-[9px] text-gray-500 font-medium">{log.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-normal">{log.body}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="glass-panel p-12 text-center text-gray-400 rounded-xl">
              No notifications yet. Order status updates will appear here.
            </div>
          )}
        </div>
      )}

      {/* Real-Time Coordination Chat Drawer */}
      {user && (
        <ChatDrawer
          orderId={activeChatOrderId}
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setActiveChatOrderId(null);
          }}
          currentUserId={user.uid}
          currentUserName={user.name || user.email?.split('@')[0]}
          recipientName={activeChatRecipient}
          isSeller={false}
        />
      )}

    </div>
  );
};

export default Orders;

