import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  getSellerFoods, 
  getSellerOrders, 
  addFoodListing, 
  toggleDonation, 
  updateOrderStatus,
  getCategoryAveragePrice,
  deleteFoodListing,
  createAnnouncement,
  getSellerAnnouncements,
  deleteAnnouncement
} from '../../firebase/firestore';
import { uploadImage } from '../../firebase/storage';
import KitchenToggle from '../../components/KitchenToggle';
import OTPModal from '../../components/OTPModal';
import TrustScore from '../../components/TrustScore';
import LocationPickerMap from '../../components/LocationPickerMap';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { subscribeToChat } from '../../firebase/rtdb';
import ChatDrawer from '../../components/ChatDrawer';
import TiltCard from '../../components/TiltCard';
import { 
  Plus, 
  TrendingUp, 
  ShoppingBag, 
  Gift, 
  Trash2, 
  Sparkles, 
  Camera, 
  RefreshCw, 
  AlertCircle,
  Clock,
  CheckCircle2,
  DollarSign,
  ChefHat,
  FileSpreadsheet,
  Download,
  X,
  MapPin,
  Image as ImageIcon,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Tag,
  IndianRupee
} from 'lucide-react';
import { simulateLocalNotification } from '../../firebase/messaging';

// ─── Simple, reliable image resize before upload ─────────────────────────
const resizeImage = (file, maxWidth = 450) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', 0.7);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

// ─── Category default prices ─────────────────────────────────────────────
const CATEGORY_PRICES = { Breakfast: 30, Lunch: 60, Dinner: 70, Snacks: 35 };

export const SellerDashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard'; // 'dashboard' or 'orders'
  const [foods, setFoods]             = useState([]);
  const [orders, setOrders]           = useState([]);
  const [kitchenStatus, setKitchenStatus] = useState(user?.kitchenStatus || 'ready');
  const [loading, setLoading]         = useState(true);

  // ── Form visibility ──────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [listingsTab, setListingsTab] = useState('active'); // 'active' or 'history'

  // ── Form field states ────────────────────────────────────────────────
  const [foodName,    setFoodName]    = useState('');
  const [category,   setCategory]    = useState('Lunch');
  const [description, setDescription] = useState('');
  const [price,       setPrice]       = useState('');
  const [quantity,   setQuantity]    = useState('');
  const [expiryHours, setExpiryHours] = useState('4');

  // ── Image ────────────────────────────────────────────────────────────
  const [foodImage,    setFoodImage]    = useState(null);   // File object
  const [imagePreview, setImagePreview] = useState(null);   // blob URL

  // ── Location ─────────────────────────────────────────────────────────
  const [pickedLocation, setPickedLocation] = useState(null);

  // ── AI hint (non-blocking, purely cosmetic) ──────────────────────────
  const [aiLoading, setAiLoading]           = useState(false);
  const [aiMessage, setAiMessage]           = useState(null);
  const [priceRecommendation, setPriceRecommendation] = useState(null);

  // ── Submission state ─────────────────────────────────────────────────
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [submitError,    setSubmitError]    = useState(null);

  // ── OTP modal ────────────────────────────────────────────────────────
  const [selectedOrderForOtp, setSelectedOrderForOtp] = useState(null);

  // ── Coordination Chat ────────────────────────────────────────────────
  const [activeChatOrderId, setActiveChatOrderId] = useState(null);
  const [activeChatRecipient, setActiveChatRecipient] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // ─── Debounce timer ref for price suggestion ─────────────────────────
  const priceTimerRef = useRef(null);

  // Announcements and Quick Relist states
  const [announcements, setAnnouncements] = useState([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);

  const fetchAnnouncements = async () => {
    if (!user) return;
    try {
      const data = await getSellerAnnouncements(user.uid);
      setAnnouncements(data);
    } catch (e) {
      console.error("Failed to load announcements:", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementText.trim() || !user) return;
    setPostingAnnouncement(true);
    try {
      await createAnnouncement(user.uid, announcementText.trim());
      setAnnouncementText('');
      await fetchAnnouncements();
    } catch (e) {
      console.error("Failed to post announcement:", e);
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (annId) => {
    try {
      await deleteAnnouncement(annId);
      await fetchAnnouncements();
    } catch (e) {
      console.error("Failed to delete announcement:", e);
    }
  };

  const handleRelist = (foodItem) => {
    setShowAddForm(true);
    setFoodName(foodItem.foodName || '');
    setCategory(foodItem.category || 'Lunch');
    setDescription(foodItem.description || '');
    setPrice(foodItem.isDonation ? '0' : String(foodItem.price || ''));
    setQuantity(String(foodItem.quantity || ''));
    setExpiryHours('4');
    setFoodImage(null);
    setImagePreview(null);
    if (foodItem.location) {
      setPickedLocation({
        lat: foodItem.location.latitude,
        lng: foodItem.location.longitude
      });
    }
  };

  const playOrderSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playTone = (freq, time, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.02);
        
        osc.start(time);
        osc.stop(time + duration);
      };
      
      const now = ctx.currentTime;
      playTone(523.25, now, 0.15); // C5
      playTone(659.25, now + 0.12, 0.15); // E5
      playTone(783.99, now + 0.24, 0.3); // G5
    } catch (e) {
      console.warn("Audio context failed or blocked by browser:", e);
    }
  };

  // ─── Load seller data ─────────────────────────────────────────────────
  const loadSellerData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Still load foods manually
      const foodsData = await getSellerFoods(user.uid);
      setFoods(foodsData);
      
      // Load orders initially
      const ordersData = await getSellerOrders(user.uid);
      setOrders(ordersData);

      // Load announcements
      const annData = await getSellerAnnouncements(user.uid);
      setAnnouncements(annData);
    } catch (e) {
      console.error('loadSellerData error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Real-time Firestore active orders listener for Sellers
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const q = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      const sorted = data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setOrders((prevOrders) => {
        if (prevOrders && prevOrders.length > 0) {
          // Check for brand new orders
          sorted.forEach((order) => {
            const exists = prevOrders.some(o => o.id === order.id);
            if (!exists && order.status === 'placed' && (Date.now() - new Date(order.createdAt).getTime()) < 10 * 60 * 1000) {
              simulateLocalNotification(
                "New Order Received! 🛍️",
                `"${order.foodName}" ordered by ${order.buyerName || 'Buyer'}. OTP: ${order.otpCode}`,
                "success"
              );
              playOrderSound();
            }
          });
        }
        return sorted;
      });
      setLoading(false);
    }, (err) => {
      console.error("Seller orders listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Background Chat Notifications for Sellers
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
                `Message from Buyer ${lastMsg.senderName}`,
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

  useEffect(() => { loadSellerData(); }, [user?.uid]);

  // ─── Reset form helper ────────────────────────────────────────────────
  const resetForm = () => {
    setFoodName('');
    setDescription('');
    setPrice('');
    setQuantity('');
    setExpiryHours('4');
    setCategory('Lunch');
    setFoodImage(null);
    setImagePreview(null);
    setPickedLocation(null);
    setAiMessage(null);
    setAiLoading(false);
    setPriceRecommendation(null);
    setSubmitError(null);
  };

  const openForm = () => { resetForm(); setShowAddForm(true); };
  const closeForm = () => { resetForm(); setShowAddForm(false); };

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      openForm();
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  // ─── Image picker — resize + quick AI hint ───────────────────────────
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setSubmitError('Please select a valid image file.');
      return;
    }
    // Validate size (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError('Image is too large. Please use an image under 10 MB.');
      return;
    }

    setSubmitError(null);
    setAiLoading(true);
    setAiMessage('Analyzing image...');

    // Show preview immediately
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    
    // Compress and resize the image immediately in the background so there is zero delay on submission
    try {
      resizeImage(file, 450).then(compressedFile => {
        setFoodImage(compressedFile);
      }).catch(() => {
        setFoodImage(file);
      });
    } catch (_) {
      setFoodImage(file);
    }

    // Non-blocking AI hint via filename / color heuristic
    setTimeout(() => {
      try {
        const name = file.name.toLowerCase();
        let hint = '';
        if (name.includes('biryani') || name.includes('rice'))   hint = 'Looks like Biryani / Rice dish';
        else if (name.includes('dosa') || name.includes('idli')) hint = 'Looks like Dosa / Idli';
        else if (name.includes('roti') || name.includes('paratha')) hint = 'Looks like Roti / Paratha';
        else if (name.includes('poha') || name.includes('upma')) hint = 'Looks like Poha / Upma';
        else if (name.includes('sabzi') || name.includes('curry')) hint = 'Looks like a Curry dish';
        else hint = 'Food detected ✓';

        setAiMessage(`${hint} — fill in details below.`);
        setPriceRecommendation(CATEGORY_PRICES[category] || 50);
      } catch (_) { /* ignore */ }
      setAiLoading(false);
    }, 500);
  };

  // ─── Debounced price suggestion on category change ────────────────────
  useEffect(() => {
    clearTimeout(priceTimerRef.current);
    priceTimerRef.current = setTimeout(async () => {
      try {
        const avg = await getCategoryAveragePrice(category);
        setPriceRecommendation(avg || CATEGORY_PRICES[category] || 50);
      } catch (_) {
        setPriceRecommendation(CATEGORY_PRICES[category] || 50);
      }
    }, 800);
    return () => clearTimeout(priceTimerRef.current);
  }, [category]);

  // ─── SUBMIT ───────────────────────────────────────────────────────────
  const handleAddFoodSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Guard: ensure authenticated user profile is fully loaded
    if (!user || !user.uid) {
      setSubmitError('You must be logged in with a valid seller profile to publish food listings.');
      return;
    }

    // Client-side validation
    const nameClean = foodName.trim();
    const qtyNum    = parseInt(quantity, 10);
    const priceNum  = parseFloat(price);

    if (!nameClean)           { setSubmitError('Please enter a meal name.');        return; }
    if (!quantity || isNaN(qtyNum) || qtyNum < 1) { setSubmitError('Quantity must be at least 1.'); return; }
    if (price === '' || isNaN(priceNum) || priceNum < 0) { setSubmitError('Enter a valid price (0 for free/donation).'); return; }

    // Location — parse as float and fallback to Mumbai coordinates if invalid
    const lat = parseFloat(pickedLocation?.latitude || user?.latitude || 19.0760);
    const lng = parseFloat(pickedLocation?.longitude || user?.longitude || 72.8777);
    const finalLat = isNaN(lat) || lat === 0 ? 19.0760 : lat;
    const finalLng = isNaN(lng) || lng === 0 ? 72.8777 : lng;
    const resolvedLocation = { latitude: finalLat, longitude: finalLng };

    const expiryTime = new Date(
      Date.now() + parseFloat(expiryHours || 4) * 60 * 60 * 1000
    ).toISOString();

    setFormSubmitting(true);
    try {
      // 1. Upload image (already pre-compressed on selection)
      let imageUrl = null;
      if (foodImage) {
        imageUrl = await uploadImage(foodImage, 'foods');
      }

      // 2. Write to Firestore
      await addFoodListing({
        sellerId:         user.uid,
        sellerName:       user.name  || '',
        sellerUsername:   user.username || user.email?.split('@')[0] || '',
        sellerTrustScore: user.trustScore || 100,
        sellerAddress:    user.kitchenAddress || '',
        kitchenName:      user.kitchenName || user.name || '',
        foodName:         nameClean,
        category,
        description:      description.trim(),
        price:            priceNum,
        quantity:         qtyNum,
        expiryTime,
        imageUrl,
        isDonation:       priceNum === 0,
        location:         resolvedLocation,
      });

      // 3. Close + reload
      closeForm();
      await loadSellerData();

      simulateLocalNotification(
        'Meal Posted ✓',
        `"${nameClean}" is now live on the FoodLoop map.`,
        'success'
      );
    } catch (err) {
      console.error('Meal post error:', err);
      setSubmitError(err?.message || 'Failed to post meal. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDonationToggle = async (foodId, isDonation) => {
    try {
      await toggleDonation(foodId, isDonation);
      await loadSellerData();
      simulateLocalNotification(
        isDonation ? 'Donation Mode On' : 'Donation Mode Off',
        isDonation
          ? 'This meal is now listed as a free donation.'
          : 'This meal is back to paid listing.',
        'info'
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      await loadSellerData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteListing = async (foodId, foodName) => {
    if (!window.confirm(`Are you sure you want to delete "${foodName}"? It will be removed from buyer views and stored only in history.`)) return;
    try {
      await deleteFoodListing(foodId);
      await loadSellerData();
      simulateLocalNotification(
        'Meal Removed ✓',
        `"${foodName}" has been deleted and archived.`,
        'info'
      );
    } catch (e) {
      console.error(e);
      alert('Failed to delete listing: ' + e.message);
    }
  };

  // ─── Derived stats ────────────────────────────────────────────────────
  const now = new Date();
  const activeFoods = foods.filter(f => 
    f.status === 'available' && 
    new Date(f.expiryTime) > now && 
    (f.remainingQuantity ?? 0) > 0
  );
  const pastFoods = foods.filter(f => 
    f.status !== 'available' || 
    new Date(f.expiryTime) <= now || 
    (f.remainingQuantity ?? 0) <= 0
  );
  const totalOrders     = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const pendingOrders   = orders.filter(o => o.status === 'placed' || o.status === 'preparing' || o.status === 'ready_for_pickup');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 space-y-6">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ChefHat className="text-primary-500" size={24} />
            <span>Seller Kitchen</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage your active listings, incoming orders and kitchen status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <KitchenToggle
            sellerId={user?.uid}
            currentStatus={kitchenStatus}
            onChange={setKitchenStatus}
          />
          <button
            onClick={openForm}
            className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-700 text-white font-bold rounded-xl transition shadow-lg shadow-primary-500/20 text-sm"
          >
            <Plus size={16} />
            Add Meal
          </button>
          <button
            onClick={loadSellerData}
            disabled={loading}
            className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition disabled:opacity-40"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Dashboard view contents ── */}
      {activeTab === 'dashboard' && (
        <>
          {/* ── Trust Score ───────────────────────────────────────────────── */}
          {user?.trustScore !== undefined && (
            <TrustScore score={user.trustScore} />
          )}

          {/* ── Stats cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: ShoppingBag, color: 'text-blue-400',      bg: 'bg-blue-500/10',      label: 'Active Listings',   value: activeFoods.length },
          { icon: Clock,       color: 'text-amber-400',     bg: 'bg-amber-500/10',     label: 'Pending Orders',    value: pendingOrders.length },
          { icon: CheckCircle2,color: 'text-secondary-500', bg: 'bg-secondary-500/10', label: 'Completed',         value: completedOrders },
          { icon: TrendingUp,  color: 'text-primary-500',   bg: 'bg-primary-500/10',   label: 'Total Orders',      value: totalOrders },
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

      {/* ── Kitchen Announcements Board ────────────────────────────────── */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl my-4">
        <button
          onClick={() => setIsAnnouncementsOpen(!isAnnouncementsOpen)}
          className="w-full flex items-center justify-between p-4 bg-white/3 hover:bg-white/5 transition text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Megaphone size={16} className="text-primary-500 animate-bounce" />
            <span>Kitchen Announcements ({announcements.length})</span>
          </div>
          {isAnnouncementsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {isAnnouncementsOpen && (
          <div className="p-4 space-y-4 border-t border-white/5 bg-[#0f111c]/30">
            {/* Create Announcement Form */}
            <form onSubmit={handlePostAnnouncement} className="flex gap-2">
              <textarea
                placeholder="Post a new announcement to your kitchen profile (e.g., 'Fresh batch of biryani ready at 5 PM!', 'Special discounts for bulk orders today!')"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                required
                rows={1}
                className="flex-grow px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none text-xs resize-none"
              />
              <button
                type="submit"
                disabled={postingAnnouncement || !announcementText.trim()}
                className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-700 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-primary-500/20 shrink-0 self-end cursor-pointer"
              >
                {postingAnnouncement ? 'Posting...' : 'Post'}
              </button>
            </form>

            {/* List Announcements */}
            {announcements.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {announcements.map((ann) => (
                  <div key={ann.id} className="flex justify-between items-start gap-4 p-3 bg-white/5 border border-white/5 rounded-xl text-xs animate-slide-up">
                    <div className="space-y-1">
                      <p className="text-gray-200 leading-relaxed font-medium">{ann.message}</p>
                      <span className="text-[9px] text-gray-500 block">
                        {new Date(ann.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-1 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 rounded-lg transition cursor-pointer self-start"
                      title="Delete Announcement"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-xs text-gray-500">No active announcements. Post one to keep your buyers updated!</p>
            )}
          </div>
        )}
      </div>

      {/* ── Pending orders ────────────────────────────────────────────── */}
      {pendingOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            Incoming Orders ({pendingOrders.length})
          </h2>
          {pendingOrders.map(order => (
            <div key={order.id} className="glass-panel p-4 rounded-xl border border-amber-500/15 flex flex-col md:flex-row justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">{order.foodName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    order.status === 'placed'           ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    order.status === 'preparing'        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                         'bg-secondary-500/10 text-secondary-500 border border-secondary-500/20'
                  }`}>{order.status.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-gray-400">
                  Buyer: {order.buyerName || 'Anonymous'} · Qty: {order.quantity} · 
                  {order.isDonation ? ' Free (Donation)' : ` ₹${order.totalPrice}`}
                </p>
                <p className="text-[10px] text-gray-500 font-mono">OTP: {order.otpCode}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => {
                    setActiveChatOrderId(order.id);
                    setActiveChatRecipient(order.buyerName || 'Buyer');
                    setIsChatOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-primary-500 hover:text-primary-600 border border-white/10 font-bold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
                  title="Chat with Buyer"
                >
                  <MessageSquare size={13} />
                  <span>Chat</span>
                </button>

                {order.status === 'placed' && (
                  <button
                    onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition"
                  >
                    Start Preparing
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')}
                    className="px-3 py-1.5 bg-secondary-500 hover:bg-secondary-600 text-slate-950 font-bold rounded-lg text-xs transition"
                  >
                    Mark Ready
                  </button>
                )}
                {order.status === 'ready_for_pickup' && (
                  <button
                    onClick={() => setSelectedOrderForOtp(order)}
                    className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-lg text-xs transition"
                  >
                    Verify OTP &amp; Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* ── Orders view contents (My Listings) ── */}
      {activeTab === 'orders' && (
        <div className="space-y-4 animate-slide-up">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag size={14} className="text-primary-500" />
            <span>My Listings</span>
          </h2>
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setListingsTab('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                listingsTab === 'active'
                  ? 'bg-primary-500 text-slate-950 shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Active ({activeFoods.length})
            </button>
            <button
              onClick={() => setListingsTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                listingsTab === 'history'
                  ? 'bg-primary-500 text-slate-950 shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Meal History ({pastFoods.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw size={28} className="text-primary-500 animate-spin" />
          </div>
        ) : (listingsTab === 'active' ? activeFoods : pastFoods).length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-white/5 text-center">
            <ChefHat size={40} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {listingsTab === 'active' 
                ? 'No active listings currently. Click Add Meal to publish a new one.' 
                : 'No expired or sold out listings in history.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(listingsTab === 'active' ? activeFoods : pastFoods).map(food => (
              <div key={food.id} className="glass-panel rounded-xl border border-white/10 overflow-hidden flex flex-col">
                {food.imageUrl ? (
                  <img src={food.imageUrl} alt={food.foodName} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-white/5 flex items-center justify-center">
                    <ImageIcon size={28} className="text-gray-600" />
                  </div>
                )}
                <div className="p-4 flex flex-col flex-grow space-y-2">
                  <div className="flex justify-between items-start w-full">
                    <h3 className="font-bold text-white text-sm leading-tight">{food.foodName}</h3>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        food.status === 'available' ? 'bg-secondary-500/10 text-secondary-500 border border-secondary-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>{food.status}</span>
                      {listingsTab === 'active' && (
                        <button
                          onClick={() => handleDeleteListing(food.id, food.foodName)}
                          className="p-1 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 rounded-lg transition"
                          title="Delete Listing"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{food.isDonation ? '🎁 Free' : `₹${food.price}`}</span>
                    <span>{food.remainingQuantity}/{food.quantity} left</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <Clock size={10} />
                    Expires: {new Date(food.expiryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="mt-auto pt-2">
                    {listingsTab === 'active' ? (
                      <button
                        onClick={() => handleDonationToggle(food.id, !food.isDonation)}
                        className={`w-full py-1.5 text-xs font-bold rounded-lg border transition ${
                          food.isDonation
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {food.isDonation ? '🎁 Listed as Donation' : 'Mark as Donation'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRelist(food)}
                        className="w-full py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-700 text-white flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-primary-500/10 cursor-pointer"
                      >
                        <RefreshCw size={12} className="animate-spin-hover" />
                        <span>Quick Relist</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          ADD MEAL MODAL
      ════════════════════════════════════════════════════════════════ */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            onClick={closeForm}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-lg bg-[#0f111c]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-2 shadow-2xl max-h-[90vh] overflow-y-auto neon-glow-primary animate-scale-in">

            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 pt-5 pb-3 bg-transparent backdrop-blur-sm">
              <h2 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wider">
                <ChefHat size={18} className="text-primary-500 animate-pulse" />
                <span>Add New Meal</span>
              </h2>
              <button
                onClick={closeForm}
                className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddFoodSubmit} className="px-6 pb-6 space-y-5">

              {/* Error banner */}
              {submitError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-400 text-xs font-semibold animate-pulse">
                  <AlertCircle size={14} className="shrink-0" />
                  {submitError}
                </div>
              )}

              {/* ── Image upload ─────────────────────────────────────── */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-400 ml-1">Food Photo (optional)</label>
                <label className="flex items-center gap-4 cursor-pointer group">
                  <div className="relative w-20 h-20 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 group-hover:border-primary-500/50 flex items-center justify-center overflow-hidden shrink-0 transition-all shadow-inner">
                    {imagePreview ? (
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <Camera size={20} className="text-gray-500 group-hover:text-primary-500 transition-colors" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="text-xs space-y-1 flex-grow">
                    <p className="text-gray-300 font-medium leading-tight">
                      {imagePreview ? 'Photo selected ✓ — click to change' : 'Upload a fresh photo of your meal'}
                    </p>
                    {aiLoading && (
                      <div className="flex items-center space-x-1.5 text-primary-500 font-semibold animate-pulse mt-1">
                        <RefreshCw size={11} className="animate-spin" />
                        <span>Analyzing with AI Vision...</span>
                      </div>
                    )}
                    {aiMessage && !aiLoading && (
                      <div className="px-2.5 py-1.5 bg-secondary-500/10 border border-secondary-500/20 text-secondary-500 rounded-xl flex items-center gap-1.5 mt-1 max-w-max">
                        <Sparkles size={11} className="shrink-0" />
                        <span className="font-semibold text-[10px]">{aiMessage}</span>
                      </div>
                    )}
                    <p className="text-[9px] text-gray-600">JPG, PNG, WEBP · max 10 MB</p>
                  </div>
                </label>
              </div>

              {/* ── Meal Name ────────────────────────────────────────── */}
              <div className="space-y-1.5 text-left w-full">
                <label className="text-xs font-bold uppercase text-gray-400 ml-1">
                  Meal Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                  <ChefHat className="absolute left-5 text-gray-500" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Masala Dosa, Rice Plate, Poha"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className="w-full bg-transparent border-none py-3 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                  />
                </div>
              </div>

              {/* ── Category & Expiry ────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold uppercase text-gray-400 ml-1">Category</label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <Tag className="absolute left-5 text-gray-500" size={18} />
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-transparent border-none py-3 pl-12 pr-8 text-white focus:outline-none text-sm focus:ring-0 appearance-none cursor-pointer"
                    >
                      <option value="Breakfast" className="bg-[#0f111c]">Breakfast</option>
                      <option value="Lunch" className="bg-[#0f111c]">Lunch</option>
                      <option value="Dinner" className="bg-[#0f111c]">Dinner</option>
                      <option value="Snacks" className="bg-[#0f111c]">Snacks</option>
                    </select>
                    <ChevronDown className="absolute right-4 text-gray-500 pointer-events-none" size={16} />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold uppercase text-gray-400 ml-1">Available For</label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <Clock className="absolute left-5 text-gray-500" size={18} />
                    <select
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(e.target.value)}
                      className="w-full bg-transparent border-none py-3 pl-12 pr-8 text-white focus:outline-none text-sm focus:ring-0 appearance-none cursor-pointer"
                    >
                      <option value="1" className="bg-[#0f111c]">1 Hour</option>
                      <option value="2" className="bg-[#0f111c]">2 Hours</option>
                      <option value="4" className="bg-[#0f111c]">4 Hours</option>
                      <option value="6" className="bg-[#0f111c]">6 Hours</option>
                      <option value="12" className="bg-[#0f111c]">12 Hours</option>
                    </select>
                    <ChevronDown className="absolute right-4 text-gray-500 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* ── Price & Quantity ─────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-bold uppercase text-gray-400">
                      Price (₹) <span className="text-rose-500">*</span>
                    </label>
                    {priceRecommendation && (
                      <button
                        type="button"
                        onClick={() => setPrice(String(priceRecommendation))}
                        className="text-[10px] text-primary-500 font-semibold hover:text-primary-400 transition cursor-pointer"
                      >
                        Use ₹{priceRecommendation}
                      </button>
                    )}
                  </div>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <IndianRupee className="absolute left-5 text-gray-500" size={18} />
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="0 = free donation"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-transparent border-none py-3 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                    />
                  </div>
                  {price === '0' && (
                    <p className="text-[10px] text-secondary-500 font-bold ml-1 animate-pulse">🎁 Listed as free donation</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold uppercase text-gray-400 ml-1">
                    Quantity (plates) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative glass-input-pill rounded-full overflow-hidden flex items-center">
                    <ShoppingBag className="absolute left-5 text-gray-500" size={18} />
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      placeholder="e.g. 5"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full bg-transparent border-none py-3 pl-12 pr-5 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0"
                    />
                  </div>
                </div>
              </div>

              {/* ── Description ──────────────────────────────────────── */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold uppercase text-gray-400 ml-1">Description</label>
                <div className="relative glass-input-pill rounded-2xl overflow-hidden flex items-start p-3">
                  <MessageSquare className="text-gray-500 mt-1 shrink-0" size={18} />
                  <textarea
                    placeholder="Ingredients, allergens, spice level, packaging info..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-transparent border-none p-0 pl-3 text-white placeholder-gray-600 focus:outline-none text-sm focus:ring-0 resize-none"
                  />
                </div>
              </div>

              {/* ── Map Location Picker ─────────────────────────────── */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-gray-400 ml-1">Pin Kitchen Coordinates</label>
                <div className="rounded-2xl overflow-hidden border border-white/10">
                  <LocationPickerMap
                    initialLocation={
                      pickedLocation || 
                      (user?.latitude && user?.longitude && user.latitude !== 0 && user.longitude !== 0
                        ? { latitude: user.latitude, longitude: user.longitude }
                        : null)
                    }
                    onLocationChange={(loc) => setPickedLocation(loc)}
                    height="200px"
                  />
                </div>
              </div>

              {/* ── Action buttons ───────────────────────────────────── */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={formSubmitting}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-full border border-white/10 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-2 flex-grow py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-slate-950 font-black rounded-full transition-all shadow-md shadow-primary-500/25 active:scale-[0.98] cursor-pointer disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500"
                >
                  {formSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Posting...
                    </span>
                  ) : (
                    'Publish Meal Listing'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP Modal */}
      {selectedOrderForOtp && (
        <OTPModal
          order={selectedOrderForOtp}
          sellerId={user.uid}
          onClose={() => setSelectedOrderForOtp(null)}
          onSuccess={loadSellerData}
        />
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
          isSeller={true}
        />
      )}
    </div>
  );
};

export default SellerDashboard;
