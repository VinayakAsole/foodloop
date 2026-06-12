import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';

// Custom Map center and bounds controller
const MapController = ({ center, routeCoords }) => {
  const map = useMap();
  useEffect(() => {
    if (routeCoords && routeCoords.length > 0) {
      map.fitBounds(routeCoords, { padding: [40, 40] });
    } else if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, routeCoords, map]);
  return null;
};

// Create custom markers using SVG icons to avoid asset path errors in Vite
const createSvgIcon = (color, svgContent) => {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-900 shadow-md" style="background-color: ${color};">
        ${svgContent}
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// SVG templates
const BUYER_SVG = `<span class="w-3.5 h-3.5 rounded-full bg-white animate-pulse"></span>`;
const FOOD_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 21.5c-4.14 0-7.5-3.36-7.5-7.5c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5c0 4.14-3.36 7.5-7.5 7.5z"/>
    <path d="M12 2v4.5"/>
    <path d="M12 10v4"/>
    <path d="M9 12h6"/>
  </svg>
`;

const buyerIcon = createSvgIcon('#3b82f6', BUYER_SVG);
const foodIcon = createSvgIcon('#2EC4B6', FOOD_SVG);

// Real-time countdown clock component to show ticking seconds inside Leaflet Popup
const LiveCountdown = ({ expiryTime }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = Date.now();
      const expiry = new Date(expiryTime).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      const hStr = h > 0 ? `${h}h ` : '';
      const mStr = m > 0 || h > 0 ? `${m}m ` : '';
      const sStr = `${s}s`;

      setTimeLeft(`${hStr}${mStr}${sStr}`);
      setIsExpired(false);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  return (
    <span className={`font-bold ${isExpired ? 'text-rose-500 bg-rose-500/10 border-rose-500/20 px-1.5 py-0.5 rounded' : 'text-amber-400'}`}>
      {isExpired ? 'Expired' : `⏳ ${timeLeft}`}
    </span>
  );
};

export const MapView = ({ foods = [], buyerCoords = null, centerCoords = null, routeCoords = null, height = '400px' }) => {
  // Map center will prioritize buyerCoords, then centerCoords, then default Mumbai
  const defaultCenter = [19.0760, 72.8777];
  const mapCenter = buyerCoords
    ? [buyerCoords.latitude, buyerCoords.longitude]
    : centerCoords
      ? [centerCoords.latitude, centerCoords.longitude]
      : defaultCenter;

  return (
    <div className="w-full relative border border-white/10 rounded-2xl overflow-hidden shadow-inner" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Gorgeous Dark Mode map layer!
        />

        <MapController center={mapCenter} routeCoords={routeCoords} />

        {routeCoords && routeCoords.length > 0 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: '#2EC4B6',
              weight: 5,
              opacity: 0.85,
              dashArray: '8, 12',
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />
        )}

        {/* Render Buyer GPS Location Marker */}
        {buyerCoords && (
          <Marker position={[buyerCoords.latitude, buyerCoords.longitude]} icon={buyerIcon}>
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-blue-400">You Are Here</p>
                <p className="text-gray-400 mt-0.5">Mock Location Coordinates: {buyerCoords.latitude.toFixed(4)}, {buyerCoords.longitude.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render Food Sellers Markers */}
        {foods.map((food) => {
          if (!food.location) return null;
          return (
            <Marker
              key={food.id}
              position={[food.location.latitude, food.location.longitude]}
              icon={foodIcon}
            >
              <Popup>
                <div className="text-xs min-w-[180px] p-1 text-gray-200">
                  <span className="text-[10px] text-secondary-500 font-semibold tracking-wider uppercase bg-secondary-500/10 px-1.5 py-0.5 rounded border border-secondary-500/20">
                    {food.category}
                  </span>
                  <h4 className="font-bold text-white mt-1.5 leading-tight">{food.foodName}</h4>
                  
                  <p className="text-gray-400 mt-0.5 text-[10px] flex items-center gap-1">
                    🍳 {food.kitchenName || food.sellerName}
                  </p>
                  {food.sellerAddress && (
                    <p className="text-gray-500 text-[10px] flex items-start gap-1 mt-0.5">
                      📍 {food.sellerAddress}
                    </p>
                  )}

                  <div className="flex justify-between items-center mt-1.5 text-[10px]">
                    <span className="text-gray-400">
                      Qty: <strong className="text-white">{food.remainingQuantity}</strong> left
                    </span>
                    <span className="font-extrabold text-white">
                      {food.isDonation ? '🎁 FREE' : `₹${food.price}`}
                    </span>
                  </div>

                  {food.expiryTime && (
                    <div className="flex justify-between items-center mt-1.5 text-[10px]">
                      <span className="text-gray-400">Expires:</span>
                      <LiveCountdown expiryTime={food.expiryTime} />
                    </div>
                  )}

                  {food.location && (
                    <p className="text-[9px] text-gray-600 font-mono mt-1">
                      {food.location.latitude?.toFixed(5)}, {food.location.longitude?.toFixed(5)}
                    </p>
                  )}

                  <div className="flex gap-1 mt-2 pt-2 border-t border-white/5">
                    <Link
                      to={`/food/${food.id}`}
                      className="flex-1 text-center py-1 bg-primary-500 text-slate-950 font-bold rounded text-[10px] hover:bg-primary-600 transition"
                    >
                      Order Now
                    </Link>
                    {food.location && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${food.location.latitude},${food.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-1 bg-secondary-500/20 text-secondary-500 font-bold rounded text-[10px] hover:bg-secondary-500/30 transition border border-secondary-500/30"
                      >
                        Directions
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
