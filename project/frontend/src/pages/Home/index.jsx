import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { fetchIPLocation } from '../../utils/geolocationFallback';
import FoodCard from '../../components/FoodCard';
import MapView from '../../components/MapView';
import { calculateDistance, formatDistance } from '../../utils/haversine';
import { onSnapshot, collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import LocationPickerMap from '../../components/LocationPickerMap';
import { 
  Search, 
  SlidersHorizontal, 
  MapPin, 
  Sparkles,
  AlertCircle,
  RefreshCw,
  Compass,
  X
} from 'lucide-react';

export const Home = () => {
  const { user, updateProfileState } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [foods, setFoods] = useState([]);
  const [showManualLocationPicker, setShowManualLocationPicker] = useState(false);
  const [tempLocation, setTempLocation] = useState(null);
  const [tempAddress, setTempAddress] = useState('');
  const [mapCenterCoords, setMapCenterCoords] = useState(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [maxDistance, setMaxDistance] = useState(5); // default 5km radius (range 0m to 5km)
  const [sortBy, setSortBy] = useState('nearest'); // 'nearest', 'cheapest', 'highest_rated'
  const showMap = searchParams.get('map') === 'true';
  const [loading, setLoading] = useState(true);

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // User coordinates (from profile)
  const userCoords = useMemo(() => {
    if (!user) return null;
    const lat = parseFloat(user.latitude);
    const lng = parseFloat(user.longitude);
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      return null;
    }
    return { latitude: lat, longitude: lng };
  }, [user]);



  // Active reference coordinates (falls back to map center or default Mumbai coordinates)
  const activeCoords = useMemo(() => {
    return userCoords || mapCenterCoords || { latitude: 19.0760, longitude: 72.8777 };
  }, [userCoords, mapCenterCoords]);

  // Categories list
  const categories = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'];

  // Listen to PWA installation prompts
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show simulated banner for desktop/dev testing if not standalone
    if (!window.matchMedia('(display-mode: standalone)').matches && !window.navigator.standalone) {
      // Auto-show after a small delay for presentation
      const timer = setTimeout(() => setShowInstallBanner(true), 2000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted PWA installation');
      }
      setDeferredPrompt(null);
    } else {
      // Mock acceptance for testing/evaluation
      alert("Installing FoodLoop PWA to your desktop/mobile screen...");
    }
    setShowInstallBanner(false);
  };

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Real-time ticking clock for exact-second validation expiry filter
  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasNotifiedPermission, setHasNotifiedPermission] = useState(false);

  const requestGeoLocation = async (isManual = false) => {
    if (!user) {
      setShowLocationModal(false);
      return;
    }

    const handleIPFallback = async (gpsErrorMsg) => {
      console.warn(`${gpsErrorMsg}. Trying IP geolocation fallback...`);
      const ipCoords = await fetchIPLocation();
      if (ipCoords) {
        const { latitude, longitude } = ipCoords;
        if (updateProfileState) {
          updateProfileState({ latitude, longitude });
        }
        try {
          const updates = { latitude, longitude };
          await updateDoc(doc(db, 'users', user.uid), updates);
          if (user.role === 'buyer') {
            await updateDoc(doc(db, 'buyers', user.uid), updates).catch(() => {});
          } else if (user.role === 'seller') {
            await updateDoc(doc(db, 'sellers', user.uid), updates).catch(() => {});
          }
          console.log("Updated IP-based coordinates in Firestore user profile.");
        } catch (err) {
          console.error("Failed to update IP-based coordinates in Firestore:", err);
        }
      }
      setShowLocationModal(false);
    };

    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

    if (!('geolocation' in navigator) || !isSecure) {
      if (isManual && !hasNotifiedPermission) {
        alert("Location access is not supported or not secure on this browser. Falling back to IP location.");
        setHasNotifiedPermission(true);
      }
      await handleIPFallback(!isSecure ? 'Geolocation requires a secure context (HTTPS/localhost)' : 'Geolocation not supported by browser');
      return;
    }

    // Check permission status manually if clicked
    if (isManual && !hasNotifiedPermission && 'permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'granted') {
          alert("Location access is allowed! Fetching your precise device location...");
          setHasNotifiedPermission(true);
        } else if (result.state === 'denied') {
          alert("Location access is denied. Please enable/allow location permissions in your browser or device settings to get the proper location of your device.");
          setHasNotifiedPermission(true);
        }
      } catch (err) {
        console.warn("Could not query permissions API:", err);
      }
    }

    const getPosition = async (options) => {
      if (Capacitor.isNativePlatform()) {
        const permission = await Geolocation.requestPermissions();
        if (permission.location !== 'granted') {
          const err = new Error("Location permission not granted");
          err.code = 1;
          throw err;
        }
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout
        });
        return position;
      } else {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
      }
    };

    const handleSuccess = async (position) => {
      const { latitude, longitude } = position.coords;
      console.log("Device GPS Coordinates acquired:", latitude, longitude);
      
      // Sync memory state
      if (updateProfileState) {
        updateProfileState({ latitude, longitude });
      }
      
      // Sync persistent Firestore profile
      try {
        const updates = { latitude, longitude };
        await updateDoc(doc(db, 'users', user.uid), updates);
        if (user.role === 'buyer') {
          await updateDoc(doc(db, 'buyers', user.uid), updates).catch(() => {});
        } else if (user.role === 'seller') {
          await updateDoc(doc(db, 'sellers', user.uid), updates).catch(() => {});
        }
        console.log("Updated device coordinates in Firestore user profile.");
      } catch (err) {
        console.error("Failed to update coordinates in Firestore profile:", err);
      }
      setShowLocationModal(false);
    };

    const handleError = async (error) => {
      let errorMessage = 'Failed to fetch location';
      if (error.code === 1) {
        errorMessage = 'Location access denied by user';
        if (isManual && !hasNotifiedPermission) {
          alert("Location access is denied. Please enable/allow location permissions in your browser or device settings to get the proper location of your device.");
          setHasNotifiedPermission(true);
        }
      }
      else if (error.code === 2) errorMessage = 'Location unavailable';
      else if (error.code === 3) errorMessage = 'Location fetch timeout';
      
      if (isManual && !hasNotifiedPermission && error.code !== 1) {
        alert(`Location access error: ${errorMessage}. Falling back to IP location.`);
        setHasNotifiedPermission(true);
      }
      await handleIPFallback(errorMessage);
    };

    try {
      // Try high accuracy location with a slightly longer 10s timeout
      const position = await getPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 });
      await handleSuccess(position);
    } catch (error) {
      if (error.code === 3) {
        // High accuracy timed out. Fallback to low accuracy.
        console.warn("High accuracy geolocation timed out. Retrying with enableHighAccuracy: false...");
        try {
          const position = await getPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
          await handleSuccess(position);
        } catch (retryError) {
          await handleError(retryError);
        }
      } else {
        await handleError(error);
      }
    }
  };

  const handleConfirmManualLocation = async () => {
    if (!user || !tempLocation) return;
    
    const { latitude, longitude } = tempLocation;
    
    // Sync memory state
    if (updateProfileState) {
      updateProfileState({ latitude, longitude });
    }
    
    // Sync persistent Firestore profile
    try {
      const updates = { latitude, longitude };
      await updateDoc(doc(db, 'users', user.uid), updates);
      if (user.role === 'buyer') {
        await updateDoc(doc(db, 'buyers', user.uid), updates).catch(() => {});
      } else if (user.role === 'seller') {
        await updateDoc(doc(db, 'sellers', user.uid), updates).catch(() => {});
      }
      console.log("Manually selected coordinates saved to Firestore.");
      setMapCenterCoords({ latitude, longitude });
    } catch (err) {
      console.error("Failed to update manual coordinates in Firestore:", err);
    }
    
    setShowManualLocationPicker(false);
  };

  const requestGeoLocationRef = useRef(null);
  useEffect(() => {
    requestGeoLocationRef.current = requestGeoLocation;
  });

  // Check browser geolocation permission status to decide if we show the custom modal or trigger fallbacks
  useEffect(() => {
    if (!user) return;

    const checkLocationPermission = async () => {
      // Only prompt for buyer role
      if (user.role !== 'buyer') return;

      const latVal = parseFloat(user.latitude || 0);
      const lngVal = parseFloat(user.longitude || 0);
      const isDefaultMumbai = Math.abs(latVal - 19.076) < 0.01 && Math.abs(lngVal - 72.8777) < 0.01;
      const needsUpdate = latVal === 0 || lngVal === 0 || isDefaultMumbai;

      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          if (result.state === 'prompt') {
            // User hasn't granted or denied yet, show our premium explanation modal
            setShowLocationModal(true);
          } else if (result.state === 'granted') {
            // Already granted, fetch coordinates automatically
            requestGeoLocationRef.current();
          } else if (result.state === 'denied' && needsUpdate) {
            // Permission denied but coordinates are default/empty, auto-fetch IP location fallback
            requestGeoLocationRef.current();
          }
          
          // Listen for permission change events
          result.onchange = () => {
            if (result.state === 'granted') {
              requestGeoLocationRef.current();
              setShowLocationModal(false);
            }
          };
        } catch (err) {
          console.warn("Permissions API not supported or failed. Checking needsUpdate:", err);
          if (needsUpdate) {
            requestGeoLocationRef.current();
          } else {
            setShowLocationModal(true);
          }
        }
      } else {
        if (needsUpdate) {
          requestGeoLocationRef.current();
        } else {
          setShowLocationModal(true);
        }
      }
    };

    checkLocationPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.role]);

  // Real-time Firestore active foods listener
  useEffect(() => {
    const q = query(
      collection(db, 'foods'), 
      where('status', '==', 'available')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      const now = new Date();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isExpired = new Date(data.expiryTime) <= now;
        const isSoldOut = (data.remainingQuantity ?? 0) <= 0;
        
        if (!isExpired && !isSoldOut) {
          list.push({ id: docSnap.id, ...data });
        }
      });
      setFoods(list);
      setLoading(false);
    }, (err) => {
      console.error("Failed to listen to food listings:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter and Sort Logic
  const filteredFoods = useMemo(() => {
    let result = [...foods];

    // 0. Expiry/Validation check (Filters out expired meals from the view and Leaflet map markers in real-time)
    const now = new Date(currentTime);
    result = result.filter(f => new Date(f.expiryTime) > now);

    // 1. Search term filter
    if (searchTerm) {
      result = result.filter(f => 
        f.foodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.sellerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. Category filter
    if (selectedCategory !== 'All') {
      result = result.filter(f => f.category === selectedCategory);
    }

    // 2.5. Veg Only filter
    if (isVegOnly) {
      result = result.filter(f => {
        const nonVegKeywords = ['chicken', 'mutton', 'egg', 'fish', 'meat', 'prawn', 'kebab', 'keema', 'beef', 'pork'];
        const nameLower = f.foodName.toLowerCase();
        const descLower = (f.description || '').toLowerCase();
        return !nonVegKeywords.some(kw => nameLower.includes(kw) || descLower.includes(kw));
      });
    }

    // 3. Distance filter
    if (activeCoords) {
      result = result.filter(f => {
        if (!f.location) return false;
        const dist = calculateDistance(
          activeCoords.latitude,
          activeCoords.longitude,
          f.location.latitude,
          f.location.longitude
        );
        return dist <= maxDistance;
      });
    }

    // 4. Sort logic
    result.sort((a, b) => {
      if (sortBy === 'nearest' && activeCoords) {
        const distA = calculateDistance(activeCoords.latitude, activeCoords.longitude, a.location.latitude, a.location.longitude);
        const distB = calculateDistance(activeCoords.latitude, activeCoords.longitude, b.location.latitude, b.location.longitude);
        return distA - distB;
      }
      if (sortBy === 'cheapest') {
        return a.price - b.price;
      }
      if (sortBy === 'highest_rated') {
        return (b.sellerTrustScore || 90) - (a.sellerTrustScore || 90);
      }
      return 0;
    });

    return result;
  }, [foods, searchTerm, selectedCategory, isVegOnly, maxDistance, sortBy, activeCoords, currentTime]);

  return (
    <div className="min-h-screen bg-[#060709] max-w-7xl mx-auto px-4 py-6 md:px-8 space-y-6">
      
      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="responsive-card p-4 flex flex-col md:flex-row justify-between items-center gap-4 animate-slide-in bg-gradient-to-r from-primary-500/10 via-[#060709] to-[#060709]">
          <div className="flex items-center space-x-3 text-left">
            <div className="p-2 bg-primary-500/20 text-primary-500 rounded-lg shrink-0">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Install FoodLoop Web App</h4>
              <p className="text-[11px] text-gray-300">Add to your home screen for real-time live stock notifications and offline map browsing.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-slate-950 font-bold rounded-lg text-xs transition shadow-md shadow-primary-500/15"
            >
              Install App
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="px-2.5 py-1.5 text-gray-400 hover:text-white text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Discovery & Search Controls */}
      {!showMap && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search */}
          <div className="md:col-span-5 relative flex items-center">
            <Search className="absolute left-3.5 top-3.5 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search by meal name or seller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-primary-500 focus:bg-primary-500/5 focus:outline-none text-sm transition-all"
            />
            {user && (
              <button
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('showLedger', 'true');
                  setSearchParams(newParams, { replace: true });
                }}
                className="absolute right-2.5 p-1.5 bg-primary-500/10 hover:bg-primary-500/25 border border-primary-500/20 rounded-lg text-primary-500 hover:text-primary-400 transition cursor-pointer flex items-center justify-center animate-pulse"
                title="View Eco-Hero Ledger"
              >
                <Sparkles size={15} />
              </button>
            )}
          </div>

          {/* Category selector */}
          <div className="md:col-span-4 flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                  selectedCategory === cat
                    ? 'text-primary-500 bg-primary-500/10 border-primary-500/30'
                    : 'text-gray-400 bg-transparent border-white/10 hover:bg-white/5 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
            
            <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0"></div>
            
            <button
              onClick={() => setIsVegOnly(!isVegOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all flex items-center space-x-1 shrink-0 ${
                isVegOnly
                  ? 'text-secondary-500 bg-secondary-500/10 border-secondary-500/30'
                  : 'text-gray-400 bg-transparent border-white/10 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 shrink-0"></span>
              <span>Veg Only</span>
            </button>
          </div>

          {/* Sort Controls */}
          <div className="md:col-span-3 flex justify-end">
            <div className="relative inline-block text-left">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold rounded-xl pl-3 pr-8 py-2.5 focus:outline-none cursor-pointer"
              >
                <option value="nearest">Nearest First</option>
                <option value="cheapest">Price: Low to High</option>
                <option value="highest_rated">Highly Rated</option>
              </select>
              <SlidersHorizontal className="absolute right-3 top-3 text-gray-500 pointer-events-none" size={14} />
            </div>
          </div>
        </div>
      )}

      {/* Radius Distance Slider */}
      {!showMap && (
        <div className="responsive-card px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-4 flex-grow">
            <MapPin size={16} className="text-secondary-500 shrink-0" />
            <span className="text-xs text-gray-300 whitespace-nowrap">Distance Radius: <strong className="text-white">{formatDistance(maxDistance)}</strong></span>
            <input
              type="range"
              min="0"
              max="5"
              step="0.05"
              value={maxDistance}
              onChange={(e) => setMaxDistance(parseFloat(e.target.value))}
              className="w-full accent-primary-500 h-1 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2.5 border-t sm:border-t-0 border-white/5 pt-2.5 sm:pt-0 shrink-0">
            <span className="text-[10px] text-gray-400 font-mono">
              📍 {activeCoords.latitude.toFixed(5)}, {activeCoords.longitude.toFixed(5)}
            </span>
            <button
              onClick={() => requestGeoLocation(true)}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-primary-500 hover:text-primary-400 border border-white/10 hover:border-primary-500/30 rounded-lg transition-all cursor-pointer flex items-center gap-1"
              title="Recalculate location coordinates"
            >
              <RefreshCw size={10} />
              <span>Refresh Location</span>
            </button>
          </div>
        </div>
      )}
      {/* Main Content */}
      {showMap ? (
        /* Exploration View: Live Food Map (Full width, split screen sidebar style) */
        <div className="flex flex-col md:flex-row h-[620px] overflow-hidden responsive-card relative neon-glow-primary bg-[#060709]/50">
          
          {/* Left Sidebar for compact controls and meal listing */}
          <div className="w-full md:w-[360px] border-b md:border-b-0 md:border-r border-white/10 flex flex-col h-[320px] md:h-full bg-[#060709]/90 backdrop-blur-xl shrink-0">
            
            {/* Header info */}
            <div className="p-4 border-b border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Compass className="text-secondary-500 animate-pulse" size={18} />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Food Map Exploration</span>
                </div>
                <span className="text-[10px] text-gray-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 animate-ping"></span>
                  <span><strong>{filteredFoods.length}</strong> active</span>
                </span>
              </div>

              {/* Location display & Action triggers */}
              <div className="bg-white/5 p-2 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <MapPin size={12} className="text-secondary-500 shrink-0" />
                  {userCoords ? (
                    <span className="text-[10px] text-gray-300 truncate font-mono">
                      {userCoords.latitude.toFixed(4)}, {userCoords.longitude.toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-semibold">Location not set</span>
                  )}
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => requestGeoLocation(true)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-primary-500 border border-white/10 rounded-lg transition cursor-pointer"
                    title="Get coordinates via GPS"
                  >
                    <RefreshCw size={10} />
                  </button>
                  <button
                    onClick={() => {
                      setTempLocation(userCoords);
                      setShowManualLocationPicker(true);
                    }}
                    className="px-2 py-1 bg-primary-500/10 hover:bg-primary-500/25 border border-primary-500/20 rounded-lg text-[9px] font-bold text-primary-500 hover:text-primary-400 transition cursor-pointer"
                    title="Set Location Manually"
                  >
                    Set Pin
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Compact Filters */}
            <div className="p-3 border-b border-white/5 space-y-2 bg-black/20">
              {/* Search */}
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 top-2.5 text-gray-500" size={14} />
                <input
                  type="text"
                  placeholder="Search name or kitchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none text-[11px] transition-all"
                />
              </div>

              {/* Slider for radius */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-gray-400">
                  <span>Radius: <strong>{formatDistance(maxDistance)}</strong></span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent border-0 text-gray-300 font-bold outline-none cursor-pointer text-[9px]"
                  >
                    <option value="nearest" className="bg-slate-950">Nearest First</option>
                    <option value="cheapest" className="bg-slate-950">Cheapest First</option>
                    <option value="highest_rated" className="bg-slate-950">Top Rated</option>
                  </select>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.05"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(parseFloat(e.target.value))}
                  className="w-full accent-primary-500 h-1 bg-white/5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Category selector row */}
              <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-1 rounded-lg text-[9px] font-semibold whitespace-nowrap border transition-all ${
                      selectedCategory === cat
                        ? 'text-primary-500 bg-primary-500/10 border-primary-500/30'
                        : 'text-gray-400 bg-transparent border-white/5 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {cat
                  }</button>
                ))}
                <div className="w-[1px] h-3 bg-white/10 mx-1 shrink-0"></div>
                <button
                  onClick={() => setIsVegOnly(!isVegOnly)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-semibold whitespace-nowrap border transition-all shrink-0 ${
                    isVegOnly
                      ? 'text-secondary-500 bg-secondary-500/10 border-secondary-500/30'
                      : 'text-gray-400 bg-transparent border-white/5 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Veg Only
                </button>
              </div>
            </div>

            {/* Scrollable list of foods */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredFoods.length > 0 ? (
                filteredFoods.map((food) => {
                  const distance = activeCoords && food.location
                    ? calculateDistance(
                        activeCoords.latitude,
                        activeCoords.longitude,
                        food.location.latitude,
                        food.location.longitude
                      )
                    : null;
                  const isSelected = mapCenterCoords && 
                    Math.abs(mapCenterCoords.latitude - food.location.latitude) < 0.0001 &&
                    Math.abs(mapCenterCoords.longitude - food.location.longitude) < 0.0001;

                  return (
                    <div 
                      key={food.id}
                      onClick={() => setMapCenterCoords(food.location)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left space-y-1.5 relative group ${
                        isSelected 
                          ? 'bg-primary-500/10 border-primary-500/40 shadow-[0_0_12px_rgba(255,107,53,0.12)]'
                          : 'bg-white/5 border-white/5 hover:border-white/15 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-primary-500 font-bold uppercase tracking-wider">
                              {food.category}
                            </span>
                            {food.isDonation && (
                              <span className="text-[7px] text-amber-400 font-extrabold uppercase bg-amber-400/10 border border-amber-400/20 px-1 rounded">
                                Free
                              </span>
                            )}
                          </div>
                          <h4 className="text-[11px] font-bold text-white group-hover:text-primary-400 transition-colors leading-tight truncate">
                            {food.foodName}
                          </h4>
                          <p className="text-[9px] text-gray-400 truncate">
                            🍳 {food.kitchenName || food.sellerName}
                          </p>
                        </div>
                        <span className="text-xs font-black text-white shrink-0">
                          {food.isDonation ? '🎁' : `₹${food.price}`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-gray-400 border-t border-white/5 pt-1.5">
                        <div className="flex items-center gap-1">
                          <MapPin size={9} className="text-secondary-500" />
                          <span>{distance !== null ? `${formatDistance(distance)} away` : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary-500"></span>
                          <span>{food.remainingQuantity} left</span>
                        </div>
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMapCenterCoords(food.location);
                          }}
                          className="flex-grow py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-md text-[9px] font-semibold transition flex items-center justify-center gap-1 border border-white/5 cursor-pointer"
                        >
                          <Compass size={8} className="text-secondary-500" />
                          <span>Show on Map</span>
                        </button>
                        <Link
                          to={`/food/${food.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-grow py-1 bg-primary-500 hover:bg-primary-600 text-slate-950 font-bold rounded-md text-[9px] transition text-center"
                        >
                          Order
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                  <AlertCircle size={24} className="text-amber-500/60" />
                  <p className="text-[10px] text-gray-500 max-w-[200px]">
                    No kitchen active in your distance range. Try increasing radius.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Map View */}
          <div className="flex-grow h-full relative">
            <MapView foods={filteredFoods} buyerCoords={activeCoords} centerCoords={mapCenterCoords} height="100%" radius={maxDistance} />
          </div>
        </div>
      ) : (
        /* Home View: Meal Details Grid Only */
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw size={36} className="text-primary-500 animate-spin" />
              <p className="text-xs text-gray-400">Loading delicious home-cooked meals...</p>
            </div>
          ) : filteredFoods.length > 0 ? (
            <div className="bento-grid">
              {filteredFoods.map((food, index) => (
                <div key={food.id} className={index === 0 ? 'bento-col-8' : 'bento-col-4'}>
                  <FoodCard 
                    food={food} 
                    buyerCoords={activeCoords}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="responsive-card p-12 text-center flex flex-col items-center justify-center">
              <AlertCircle size={40} className="text-amber-400/80 mb-3" />
              <h3 className="text-lg font-bold text-white">No food listings found</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Try widening your search radius, selecting a different category, or search for other food items.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Location Permission Premium Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" 
            onClick={() => setShowLocationModal(false)} 
          />
          
          {/* Modal Card */}
          <div className="relative w-full max-w-md bg-[#0f111c]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl z-10 text-center space-y-6 neon-glow-secondary animate-scale-in">
            {/* Pulsing Icon */}
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-secondary-500/10 border-2 border-secondary-500/20 text-secondary-500 shadow-[0_0_20px_rgba(46,196,182,0.15)] animate-bounce-subtle">
                <MapPin size={32} className="animate-pulse" />
                <span className="absolute inset-0 rounded-full border border-secondary-500 animate-ping opacity-25"></span>
              </div>
            </div>
            
            {/* Header & Body */}
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Enable Location Services</h3>
              <p className="text-xs text-gray-300 leading-relaxed max-w-xs mx-auto">
                Discover delicious home-cooked meals prepared in your neighborhood and explore active kitchens on the live food map.
              </p>
            </div>

            {/* Features List */}
            <div className="glass-panel-light p-3 rounded-xl text-left space-y-2 text-[10px] text-gray-400">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 shrink-0"></span>
                <span>Calculate precise delivery/pickup distances in real-time</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 shrink-0"></span>
                <span>Filter active listings by nearest distance (e.g. within 2km)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-500 shrink-0"></span>
                <span>Interactive map routing showing local seller routes</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2">
              <button
                onClick={requestGeoLocation}
                className="w-full py-2.5 bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-secondary-500/25 active:scale-[0.98] cursor-pointer"
              >
                Share My Location
              </button>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setTempLocation(userCoords || { latitude: 19.076, longitude: 72.8777 });
                  setShowManualLocationPicker(true);
                }}
                className="w-full py-2.5 bg-primary-500/10 hover:bg-primary-500/25 text-primary-500 border border-primary-500/20 font-bold rounded-xl text-xs transition active:scale-[0.98] cursor-pointer"
              >
                📍 Set Location Manually
              </button>
              <button
                onClick={() => setShowLocationModal(false)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-semibold rounded-xl text-xs transition active:scale-[0.98] cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Location Picker Modal */}
      {showManualLocationPicker && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" 
            onClick={() => setShowManualLocationPicker(false)} 
          />
          
          {/* Modal Card */}
          <div className="relative w-full max-w-lg bg-[#0f111c]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-4 neon-glow-primary animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <MapPin className="text-primary-500" size={18} />
                <span>Select Your Location Manually</span>
              </h3>
              <button 
                onClick={() => setShowManualLocationPicker(false)}
                className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              If GPS location fails or shows inaccurate coordinates on your network, use the search bar below or drag the pin on the map to set your location precisely.
            </p>

            <div className="rounded-xl overflow-hidden border border-white/5 bg-black/25 relative">
              <LocationPickerMap
                initialLocation={tempLocation || userCoords || { latitude: 19.076, longitude: 72.8777 }}
                onLocationChange={(loc) => setTempLocation(loc)}
                onAddressResolved={(addr) => setTempAddress(addr)}
                height="280px"
              />
            </div>

            {tempLocation && (
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-[10px] font-mono text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Selected Lat: {tempLocation.latitude.toFixed(6)}</span>
                  <span>Selected Lng: {tempLocation.longitude.toFixed(6)}</span>
                </div>
                {tempAddress && <p className="leading-tight text-white/70">Address: {tempAddress}</p>}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualLocationPicker(false)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmManualLocation}
                disabled={!tempLocation}
                className="flex-1 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-primary-500/25 disabled:opacity-50 cursor-pointer"
              >
                Confirm & Apply Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
