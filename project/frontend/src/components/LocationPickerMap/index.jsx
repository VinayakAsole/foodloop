import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';

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

// Invalidate map size after initialization to fix rendering inside hidden/transitioning modals
const InvalidateMapSize = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
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

// Custom pin icon for selected location
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

export const LocationPickerMap = ({ 
  initialLocation = null, 
  onLocationChange,
  height = '220px'
}) => {
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation ? [initialLocation.latitude, initialLocation.longitude] : null
  );

  // Update parent when location changes
  const handleLocationSelect = ({ latitude, longitude }) => {
    setSelectedLocation([latitude, longitude]);
    onLocationChange && onLocationChange({ latitude, longitude });
  };

  // Default map center: Mumbai if no initial location
  const defaultCenter = initialLocation
    ? [initialLocation.latitude, initialLocation.longitude]
    : [19.076, 72.8777];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1.5">
          <MapPin size={12} className="text-secondary-500" />
          Pickup Location on Map
        </label>
        {selectedLocation ? (
          <span className="text-[10px] text-secondary-500 font-semibold">
            📍 {selectedLocation[0].toFixed(5)}, {selectedLocation[1].toFixed(5)}
          </span>
        ) : (
          <span className="text-[10px] text-gray-500 animate-pulse">Click map to set location</span>
        )}
      </div>

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
          center={defaultCenter}
          zoom={15}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ cursor: 'crosshair' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <InvalidateMapSize />
          <ClickHandler onLocationSelect={handleLocationSelect} />
          {selectedLocation && <AutoCenter position={selectedLocation} />}

          {selectedLocation && (
            <Marker position={selectedLocation} icon={selectedIcon}>
              <Popup>
                <div className="text-xs p-1 text-gray-800">
                  <p className="font-bold text-orange-600">📍 Food Pickup Point</p>
                  <p className="text-gray-600 mt-0.5 text-[10px]">
                    Lat: {selectedLocation[0].toFixed(6)}<br />
                    Lng: {selectedLocation[1].toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <p className="text-[10px] text-gray-500">
        {selectedLocation
          ? '✅ Location pinned. Click again to adjust the pickup point.'
          : '⚠️ No location set — your profile GPS coordinates will be used by default.'}
      </p>
    </div>
  );
};

export default LocationPickerMap;
