import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, RefreshCw, Search, Crosshair, X } from 'lucide-react';
import { fetchIPLocation } from '../../utils/geolocationFallback';

// Auto-center map to new position
const AutoCenter = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  return null;
};

// Panning map centerer for async updates
const MapCenterer = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

// Invalidate map size after initialization to fix rendering inside hidden/transitioning modals
const InvalidateMapSize = () => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 600);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [map]);
  return null;
};

// Click handler that fires callback with new lat/lng
const ClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    }
  });
  return null;
};

// Custom pin icon for selected/pinned pickup location
const selectedIcon = L.divIcon({
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="
        width: 36px; height: 36px;
        background: linear-gradient(135deg, #FF6B35, #e05a27);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid #fff;
        box-shadow: 0 4px 15px rgba(255,107,53,0.5);
      "></div>
      <div style="
        position:absolute;
        width:14px;height:14px;
        background:white;
        border-radius:50%;
        top:50%;left:50%;
        transform:translate(-50%,-50%);
      "></div>
    </div>
  `,
  className: 'custom-pin-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -38]
});

// Pulsing "You Are Here" GPS marker (buyer exploration-style blue dot)
const gpsIcon = L.divIcon({
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px;">
      <div style="
        position:absolute;
        width:32px;height:32px;
        background:rgba(59,130,246,0.15);
        border-radius:50%;
        animation: gpsPulse 2s ease-out infinite;
      "></div>
      <div style="
        width:14px;height:14px;
        background:linear-gradient(135deg, #3b82f6, #2563eb);
        border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 2px 8px rgba(59,130,246,0.6);
        z-index:2;
      "></div>
    </div>
  `,
  className: 'gps-location-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18]
});

// Debounce utility
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// Reverse geocode using Nominatim (free, no key needed)
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
};

// Forward geocode using Nominatim (search address → coords)
const forwardGeocode = async (query) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    return await res.json();
  } catch {
    return [];
  }
};

export const LocationPickerMap = ({ 
  initialLocation = null, 
  onLocationChange,
  onAddressResolved,
  height = '280px',
  readOnly = false
}) => {
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation ? [initialLocation.latitude, initialLocation.longitude] : null
  );

  const [mapCenter, setMapCenter] = useState(
    initialLocation
      ? [initialLocation.latitude, initialLocation.longitude]
      : [19.076, 72.8777] // Fallback to Mumbai initially
  );

  const [locating, setLocating] = useState(false);

  // GPS "You Are Here" marker (separate from pinned pickup location)
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  // Address display from reverse geocoding
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);

  // Location error feedback
  const [locationError, setLocationError] = useState(null);

  // Address search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 800);

  // Use a ref for onLocationChange to avoid re-creating triggerGeolocation on every render
  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  // Reverse geocode whenever selected location changes
  useEffect(() => {
    if (!selectedLocation) {
      setResolvedAddress(null);
      return;
    }
    let cancelled = false;
    const doReverse = async () => {
      setAddressLoading(true);
      const addr = await reverseGeocode(selectedLocation[0], selectedLocation[1]);
      if (!cancelled) {
        setResolvedAddress(addr);
        setAddressLoading(false);
        if (onAddressResolved) onAddressResolved(addr);
      }
    };
    doReverse();
    return () => { cancelled = true; };
  }, [selectedLocation?.[0], selectedLocation?.[1]]);

  // Forward geocode search
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    let cancelled = false;
    const doSearch = async () => {
      setSearchLoading(true);
      const results = await forwardGeocode(debouncedSearch);
      if (!cancelled) {
        setSearchResults(results);
        setShowSearchResults(results.length > 0);
        setSearchLoading(false);
      }
    };
    doSearch();
    return () => { cancelled = true; };
  }, [debouncedSearch]);

  // Close search results on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to apply location to all relevant states
  const applyLocation = useCallback((latitude, longitude, accuracy = null) => {
    setMapCenter([latitude, longitude]);
    setSelectedLocation([latitude, longitude]);
    setGpsPosition([latitude, longitude]);
    setGpsAccuracy(accuracy);
    setLocationError(null);
    onLocationChangeRef.current && onLocationChangeRef.current({ latitude, longitude });
  }, []);

  // Core locating routine supporting both browser GPS and IP fallbacks
  const triggerGeolocation = useCallback(async (isManual = false) => {
    setLocating(true);
    setLocationError(null);

    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

    const runIPFallback = async (reason = '') => {
      try {
        const ipCoords = await fetchIPLocation();
        if (ipCoords) {
          applyLocation(ipCoords.latitude, ipCoords.longitude, null);
          setLocating(false);
          return true;
        }
      } catch (e) {
        console.warn('IP fallback error:', e);
      }
      // Both GPS and IP failed
      setLocationError(
        reason
          ? `${reason}. Tap on the map to manually pin your kitchen location.`
          : 'Could not detect location. Tap on the map to manually pin your kitchen location.'
      );
      setLocating(false);
      return false;
    };

    if (!('geolocation' in navigator) || !isSecure) {
      const reason = !isSecure
        ? 'GPS requires HTTPS — using IP location'
        : 'GPS not supported by browser';
      await runIPFallback(reason);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyLocation(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy || null
        );
        setLocating(false);
      },
      async (err) => {
        let reason = 'Location detection failed';
        if (err.code === 1) reason = 'Location access denied';
        else if (err.code === 2) reason = 'Location unavailable';
        else if (err.code === 3) reason = 'Location request timed out';
        console.warn(`${isManual ? 'Manual' : 'Auto'} locate GPS failed:`, err.message);
        await runIPFallback(reason);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: isManual ? 0 : 30000 }
    );
  }, [applyLocation]);

  // Track whether we've already initialized to prevent re-triggering
  const hasInitialized = useRef(false);
  const initialLocationRef = useRef(initialLocation);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const isDefaultMumbai = (lat, lng) => {
      return Math.abs(lat - 19.076) < 0.01 && Math.abs(lng - 72.8777) < 0.01;
    };

    const loc = initialLocationRef.current;
    if (readOnly) {
      if (loc) {
        const lat = parseFloat(loc.latitude);
        const lng = parseFloat(loc.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          setMapCenter([lat, lng]);
          setSelectedLocation([lat, lng]);
        }
      }
      return;
    }

    if (loc) {
      const lat = parseFloat(loc.latitude);
      const lng = parseFloat(loc.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && !isDefaultMumbai(lat, lng)) {
        setMapCenter([lat, lng]);
        setSelectedLocation([lat, lng]);
      } else {
        triggerGeolocation(false);
      }
    } else {
      triggerGeolocation(false);
    }
  }, [triggerGeolocation, readOnly]);

  // Update parent when location changes (map click)
  const handleLocationSelect = ({ latitude, longitude }) => {
    setSelectedLocation([latitude, longitude]);
    setLocationError(null);
    onLocationChangeRef.current && onLocationChangeRef.current({ latitude, longitude });
  };

  // Handle search result selection
  const handleSearchResultSelect = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setMapCenter([lat, lng]);
    setSelectedLocation([lat, lng]);
    setLocationError(null);
    onLocationChangeRef.current && onLocationChangeRef.current({ latitude: lat, longitude: lng });
    setSearchQuery(result.display_name.split(',').slice(0, 3).join(','));
    setShowSearchResults(false);
  };

  const isDefaultMumbaiCoords = selectedLocation && 
                                Math.abs(selectedLocation[0] - 19.076) < 0.01 && 
                                Math.abs(selectedLocation[1] - 72.8777) < 0.01;

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1.5">
          <MapPin size={12} className="text-secondary-500" />
          Meal Pickup Location
        </label>
        {selectedLocation ? (
          <span className="text-[10px] text-secondary-500 font-semibold">
            📍 {selectedLocation[0].toFixed(5)}, {selectedLocation[1].toFixed(5)}
          </span>
        ) : (
          <span className="text-[10px] text-gray-500 animate-pulse">{readOnly ? 'No kitchen coordinates set' : 'Click map to set location'}</span>
        )}
      </div>

      {/* Address search bar */}
      {!readOnly && (
        <div className="relative" ref={searchRef}>
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-gray-500 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Search address or landmark..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-9 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}
                className="absolute right-3 text-gray-500 hover:text-white transition cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
            {searchLoading && (
              <RefreshCw size={12} className="absolute right-3 text-primary-500 animate-spin" />
            )}
          </div>

          {/* Search results dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-[2000] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSearchResultSelect(result)}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/5 text-xs text-gray-300 hover:text-white transition border-b border-white/5 last:border-b-0 flex items-start gap-2 cursor-pointer"
                >
                  <MapPin size={12} className="text-primary-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{result.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* "Use My Current Location" prominent button */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => triggerGeolocation(true)}
          disabled={locating}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 hover:border-blue-500/30 text-blue-400 hover:text-blue-300 rounded-xl text-xs font-bold transition active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {locating ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Detecting your location...</span>
            </>
          ) : (
            <>
              <Crosshair size={14} />
              <span>Use My Current Location</span>
            </>
          )}
        </button>
      )}

      {/* Location error feedback */}
      {locationError && (
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse">
          <span className="text-amber-400 text-[10px] shrink-0 mt-0.5">⚠️</span>
          <p className="text-[10px] text-amber-300 font-semibold leading-relaxed">{locationError}</p>
        </div>
      )}

      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-inner" style={{ height }}>
        {/* Instruction overlay when no location is set */}
        {!selectedLocation && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
            <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center gap-2 text-xs text-white font-semibold shadow-xl">
              <Navigation size={14} className="text-primary-500 animate-bounce" />
              Tap anywhere on the map to pin pickup location
            </div>
          </div>
        )}

        <MapContainer
          center={mapCenter}
          zoom={15}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ cursor: readOnly ? 'default' : 'crosshair' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <InvalidateMapSize />
          <MapCenterer center={mapCenter} />
          {!readOnly && <ClickHandler onLocationSelect={handleLocationSelect} />}
          {selectedLocation && <AutoCenter position={selectedLocation} />}

          {/* GPS accuracy radius circle */}
          {gpsPosition && gpsAccuracy && gpsAccuracy < 5000 && (
            <Circle
              center={gpsPosition}
              radius={gpsAccuracy}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.08,
                weight: 1,
                opacity: 0.3,
                dashArray: '4, 6'
              }}
            />
          )}

          {/* GPS "You Are Here" pulsing blue marker */}
          {gpsPosition && (
            <Marker position={gpsPosition} icon={gpsIcon}>
              <Popup>
                <div className="text-xs p-1">
                  <p className="font-bold text-blue-500">📍 You Are Here</p>
                  <p className="text-gray-500 mt-0.5 text-[10px]">
                    GPS: {gpsPosition[0].toFixed(6)}, {gpsPosition[1].toFixed(6)}
                  </p>
                  {gpsAccuracy && (
                    <p className="text-gray-400 text-[10px]">
                      Accuracy: ~{Math.round(gpsAccuracy)}m
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Pinned pickup location marker (orange pin) */}
          {selectedLocation && (
            <Marker position={selectedLocation} icon={selectedIcon}>
              <Popup>
                <div className="text-xs p-1 text-gray-800">
                  <p className="font-bold text-orange-600">📍 Meal Pickup Point</p>
                  <p className="text-gray-600 mt-0.5 text-[10px]">
                    Lat: {selectedLocation[0].toFixed(6)}<br />
                    Lng: {selectedLocation[1].toFixed(6)}
                  </p>
                  {resolvedAddress && (
                    <p className="text-gray-500 mt-1 text-[10px] leading-relaxed max-w-[200px]">
                      {resolvedAddress}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Locate Me floating button (kept as quick secondary option) */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => triggerGeolocation(true)}
            disabled={locating}
            className="absolute bottom-3 right-3 z-[1000] p-2.5 bg-slate-900/90 hover:bg-slate-800 text-primary-500 hover:text-primary-400 rounded-full border border-white/10 shadow-2xl flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Locate my current position"
          >
            {locating ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Navigation size={14} />
            )}
          </button>
        )}
      </div>

      {/* Resolved address display */}
      {addressLoading && (
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 animate-pulse">
          <RefreshCw size={10} className="animate-spin" />
          <span>Resolving address...</span>
        </div>
      )}
      {resolvedAddress && !addressLoading && (
        <div className="flex items-start gap-1.5 px-3 py-2 bg-white/5 border border-white/5 rounded-xl">
          <MapPin size={11} className="text-secondary-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-300 leading-relaxed">{resolvedAddress}</p>
        </div>
      )}

      {/* Status messages */}
      <p className="text-[10px]">
        {readOnly ? (
          <span className="text-secondary-400 font-semibold flex items-center gap-1">
            <span>🔒</span>
            <span>Visual Confirmation: Pinned at your verified kitchen location.</span>
          </span>
        ) : isDefaultMumbaiCoords ? (
          <span className="text-amber-400 font-bold flex items-center gap-1">
            <span>⚠️</span>
            <span>Warning: Pinned at default Mumbai location. Tap map or click Locate button to select your kitchen pickup location!</span>
          </span>
        ) : selectedLocation ? (
          <span className="text-secondary-400 font-semibold flex items-center gap-1">
            <span>✅</span>
            <span>Pickup location pinned. Tap another spot or search an address to adjust.</span>
          </span>
        ) : (
          <span className="text-gray-500 animate-pulse flex items-center gap-1">
            <span>⚠️</span>
            <span>No location set — your profile GPS coordinates will be used by default.</span>
          </span>
        )}
      </p>
    </div>
  );
};

export default LocationPickerMap;
