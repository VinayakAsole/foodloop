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
      <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-900 shadow-md transition-transform hover:scale-110 duration-250 cursor-pointer" style="background-color: ${color};">
        ${svgContent}
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// SVG templates & Legend definitions
export const LEGEND_ITEMS = [
  {
    name: 'Veg Only',
    color: '#10b981',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 22C2 12 10 4 22 2c-2 10-10 18-20 20Z"/>
        <path d="M2 22 16 8"/>
      </svg>
    `
  },
  {
    name: 'Breakfast',
    color: '#f59e0b',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
        <line x1="6" y1="2" x2="6" y2="4"/>
        <line x1="10" y1="2" x2="10" y2="4"/>
        <line x1="14" y1="2" x2="14" y2="4"/>
      </svg>
    `
  },
  {
    name: 'Lunch',
    color: '#f97316',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12h18A9 9 0 0 1 3 12Z"/>
        <path d="M12 3v3"/>
        <path d="m8 4 1.5 2"/>
        <path d="m16 4-1.5 2"/>
      </svg>
    `
  },
  {
    name: 'Dinner',
    color: '#8b5cf6',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 20h20"/>
        <path d="M20 16A8 8 0 0 0 4 16h16Z"/>
        <circle cx="12" cy="8" r="1.5"/>
      </svg>
    `
  },
  {
    name: 'Snacks',
    color: '#ec4899',
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 11h.01"/>
        <path d="M11 15h.01"/>
        <path d="M16 16h.01"/>
        <path d="m2 16 20 6-6-20A20 20 0 0 0 2 16Z"/>
        <path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/>
      </svg>
    `
  }
];

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

const VEG_ONLY_SVG_MARKER = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 22C2 12 10 4 22 2c-2 10-10 18-20 20Z"/>
    <path d="M2 22 16 8"/>
  </svg>
`;
const BREAKFAST_SVG_MARKER = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
    <line x1="6" y1="2" x2="6" y2="4"/>
    <line x1="10" y1="2" x2="10" y2="4"/>
    <line x1="14" y1="2" x2="14" y2="4"/>
  </svg>
`;
const LUNCH_SVG_MARKER = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12h18A9 9 0 0 1 3 12Z"/>
    <path d="M12 3v3"/>
    <path d="m8 4 1.5 2"/>
    <path d="m16 4-1.5 2"/>
  </svg>
`;
const DINNER_SVG_MARKER = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 20h20"/>
    <path d="M20 16A8 8 0 0 0 4 16h16Z"/>
    <circle cx="12" cy="8" r="1.5"/>
  </svg>
`;
const SNACKS_SVG_MARKER = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15 11h.01"/>
    <path d="M11 15h.01"/>
    <path d="M16 16h.01"/>
    <path d="m2 16 20 6-6-20A20 20 0 0 0 2 16Z"/>
    <path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/>
  </svg>
`;

const buyerIcon = createSvgIcon('#3b82f6', BUYER_SVG);
const vegOnlyIcon = createSvgIcon('#10b981', VEG_ONLY_SVG_MARKER);
const breakfastIcon = createSvgIcon('#f59e0b', BREAKFAST_SVG_MARKER);
const lunchIcon = createSvgIcon('#f97316', LUNCH_SVG_MARKER);
const dinnerIcon = createSvgIcon('#8b5cf6', DINNER_SVG_MARKER);
const snacksIcon = createSvgIcon('#ec4899', SNACKS_SVG_MARKER);
const defaultFoodIcon = createSvgIcon('#2EC4B6', FOOD_SVG);

// Helper function to resolve category-wise icon with Veg Only priority
const getFoodIcon = (food) => {
  const nonVegKeywords = ['chicken', 'mutton', 'egg', 'fish', 'meat', 'prawn', 'kebab', 'keema', 'beef', 'pork'];
  const nameLower = (food.foodName || '').toLowerCase();
  const descLower = (food.description || '').toLowerCase();
  const isVegOnly = !nonVegKeywords.some(kw => nameLower.includes(kw) || descLower.includes(kw));

  if (isVegOnly) {
    return vegOnlyIcon;
  }

  const categoryLower = (food.category || '').toLowerCase();
  switch (categoryLower) {
    case 'breakfast':
      return breakfastIcon;
    case 'lunch':
      return lunchIcon;
    case 'dinner':
      return dinnerIcon;
    case 'snacks':
      return snacksIcon;
    default:
      return defaultFoodIcon;
  }
};


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

export const MapView = ({
  foods = [],
  buyerCoords = null,
  centerCoords = null,
  routeCoords = null,
  height = '400px',
  showLegend = null
}) => {
  const defaultCenter = [19.0760, 72.8777];

  const isValidCoords = (coords) => {
    if (!coords) return false;
    const lat = parseFloat(coords.latitude);
    const lng = parseFloat(coords.longitude);
    return !isNaN(lat) && !isNaN(lng);
  };

  const mapCenter = isValidCoords(buyerCoords)
    ? [parseFloat(buyerCoords.latitude), parseFloat(buyerCoords.longitude)]
    : isValidCoords(centerCoords)
      ? [parseFloat(centerCoords.latitude), parseFloat(centerCoords.longitude)]
      : defaultCenter;

  const displayLegend = showLegend !== null ? showLegend : (foods.length > 0 && parseInt(height) >= 300);

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
        {isValidCoords(buyerCoords) && (
          <Marker position={[parseFloat(buyerCoords.latitude), parseFloat(buyerCoords.longitude)]} icon={buyerIcon}>
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-blue-400">You Are Here</p>
                <p className="text-gray-400 mt-0.5">Mock Location Coordinates: {parseFloat(buyerCoords.latitude).toFixed(4)}, {parseFloat(buyerCoords.longitude).toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render Food Sellers Markers */}
        {foods.map((food) => {
          if (!food.location || !isValidCoords(food.location)) return null;
          return (
            <Marker
              key={food.id}
              position={[parseFloat(food.location.latitude), parseFloat(food.location.longitude)]}
              icon={getFoodIcon(food)}
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

      {/* Dynamic Glassmorphic Map Legend */}
      {displayLegend && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-[#0c0f1d]/90 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 max-w-[150px] transition-all duration-300 hover:border-white/20">
          <h5 className="font-bold text-[9px] text-gray-400 tracking-wider uppercase mb-0.5 select-none">
            Meal Legend
          </h5>
          <div className="flex flex-col gap-2">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center border border-slate-950/40 shadow-sm scale-95 shrink-0"
                  style={{ backgroundColor: item.color }}
                  dangerouslySetInnerHTML={{ __html: item.svg }}
                />
                <span className="text-gray-300 font-bold text-[10px] select-none">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
