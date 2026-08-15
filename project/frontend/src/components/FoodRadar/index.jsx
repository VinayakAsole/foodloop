import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { calculateDistance, formatDistance } from '../../utils/haversine';
import { 
  Navigation, 
  Compass, 
  MapPin, 
  Clock, 
  Sparkles, 
  ExternalLink, 
  ChevronRight, 
  ShoppingBag, 
  Plus, 
  Minus,
  ChefHat,
  X
} from 'lucide-react';

/**
 * Computes initial bearing from start coordinate to end coordinate in degrees (0 - 360)
 */
const calculateBearing = (startLat, startLng, destLat, destLng) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const phi1 = toRad(startLat);
  const phi2 = toRad(destLat);
  const deltaLambda = toRad(destLng - startLng);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  let brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
};

// Category Colors & SVG Icons
const CATEGORY_STYLES = {
  breakfast: { color: '#f59e0b', label: 'Breakfast', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' },
  lunch: { color: '#f97316', label: 'Lunch', bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316' },
  dinner: { color: '#8b5cf6', label: 'Dinner', bg: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6' },
  snacks: { color: '#ec4899', label: 'Snacks', bg: 'rgba(236, 72, 153, 0.15)', border: '#ec4899' },
  default: { color: '#2EC4B6', label: 'Meal', bg: 'rgba(46, 196, 182, 0.15)', border: '#2EC4B6' }
};

export const FoodRadar = ({
  foods = [],
  buyerCoords = null,
  maxRangeKm = 5,
  onFoodSelect = null,
  height = '520px'
}) => {
  const [selectedFood, setSelectedFood] = useState(null);
  const [radarRange, setRadarRange] = useState(maxRangeKm || 5);
  const [isScanning, setIsScanning] = useState(true);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');

  // Fallback default coordinates if buyer coordinates not available
  const centerCoords = useMemo(() => {
    if (buyerCoords && !isNaN(buyerCoords.latitude) && !isNaN(buyerCoords.longitude)) {
      return buyerCoords;
    }
    return { latitude: 19.0760, longitude: 72.8777 }; // Mumbai fallback
  }, [buyerCoords]);

  // Compute relative polar positions for all foods on radar
  const radarNodes = useMemo(() => {
    if (!centerCoords) return [];

    return foods
      .filter((food) => {
        if (!food.location || isNaN(food.location.latitude) || isNaN(food.location.longitude)) {
          return false;
        }
        if (food.kitchenStatus === 'sold_out') return false;
        if (activeCategoryFilter !== 'All' && (food.category || '').toLowerCase() !== activeCategoryFilter.toLowerCase()) {
          return false;
        }
        return true;
      })
      .map((food) => {
        const distKm = calculateDistance(
          centerCoords.latitude,
          centerCoords.longitude,
          food.location.latitude,
          food.location.longitude
        );

        const bearingDeg = calculateBearing(
          centerCoords.latitude,
          centerCoords.longitude,
          food.location.latitude,
          food.location.longitude
        );

        // Normalize distance onto circular radar (0% at center to 90% at outer ring)
        const normalizedRadius = Math.min(1, distKm / radarRange);
        // Convert polar (radius, bearing) to Cartesian (x, y in % from center)
        const angleRad = ((bearingDeg - 90) * Math.PI) / 180;
        const xPercent = 50 + normalizedRadius * 42 * Math.cos(angleRad);
        const yPercent = 50 + normalizedRadius * 42 * Math.sin(angleRad);

        const catKey = (food.category || '').toLowerCase();
        const style = CATEGORY_STYLES[catKey] || CATEGORY_STYLES.default;

        // Approximate walk time (at 4.5 km/h = 75m / min)
        const walkMins = Math.max(1, Math.round((distKm * 1000) / 75));

        return {
          ...food,
          distanceKm: distKm,
          distanceFormatted: formatDistance(distKm),
          walkMinutes: walkMins,
          bearing: Math.round(bearingDeg),
          x: xPercent,
          y: yPercent,
          style
        };
      });
  }, [foods, centerCoords, radarRange, activeCategoryFilter]);

  // Open external native Google Maps turn-by-turn directions
  const handleOpenGoogleMaps = (food, e) => {
    if (e) e.stopPropagation();
    if (!food.location) return;
    const destLat = food.location.latitude;
    const destLng = food.location.longitude;
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=walking`;
    window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-[#080a12]/90 backdrop-blur-xl shadow-2xl flex flex-col select-none"
      style={{ height, minHeight: '480px' }}
    >
      {/* Radar Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-secondary-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-primary-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 p-4 border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-secondary-500/20 text-secondary-400 border border-secondary-500/30 shadow-[0_0_15px_rgba(46,196,182,0.3)]">
            <Compass size={16} className={isScanning ? "animate-spin" : ""} style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-sm text-white tracking-wide">Hyperlocal Food Radar</h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono">
              Live proximity scanner • {radarNodes.length} active meals within {radarRange}km
            </p>
          </div>
        </div>

        {/* Radar Controls: Range Zoom & Filter */}
        <div className="flex items-center gap-2">
          {/* Zoom buttons */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setRadarRange(prev => Math.max(1, prev - 1))}
              disabled={radarRange <= 1}
              className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition disabled:opacity-30 cursor-pointer"
              title="Zoom in radar"
            >
              <Minus size={13} />
            </button>
            <span className="px-2 text-[11px] font-mono font-bold text-secondary-400">
              {radarRange}km
            </span>
            <button
              onClick={() => setRadarRange(prev => Math.min(15, prev + 1))}
              disabled={radarRange >= 15}
              className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition disabled:opacity-30 cursor-pointer"
              title="Zoom out radar"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Sweep Toggle */}
          <button
            onClick={() => setIsScanning(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
              isScanning 
                ? 'bg-secondary-500/20 border-secondary-500/30 text-secondary-400 shadow-[0_0_10px_rgba(46,196,182,0.2)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">{isScanning ? 'Scanning' : 'Paused'}</span>
          </button>
        </div>
      </div>

      {/* Main Radar Screen Viewport */}
      <div 
        className="relative flex-1 flex items-center justify-center overflow-hidden cursor-crosshair"
        onClick={() => setSelectedFood(null)}
      >
        {/* Radar Grid Circles */}
        <div className="absolute inset-4 rounded-full border border-secondary-500/10 pointer-events-none" />
        <div className="absolute w-[80%] h-[80%] rounded-full border border-secondary-500/15 pointer-events-none" />
        <div className="absolute w-[55%] h-[55%] rounded-full border border-secondary-500/20 pointer-events-none" />
        <div className="absolute w-[30%] h-[30%] rounded-full border border-secondary-500/25 pointer-events-none" />

        {/* Crosshair Axes */}
        <div className="absolute w-full h-[1px] bg-secondary-500/15 pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-secondary-500/15 pointer-events-none" />

        {/* Cardinal Direction Indicators */}
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-gray-500 tracking-widest pointer-events-none">N</span>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-gray-500 tracking-widest pointer-events-none">S</span>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-gray-500 tracking-widest pointer-events-none">E</span>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-gray-500 tracking-widest pointer-events-none">W</span>

        {/* Distance Range Ring Labels */}
        <span className="absolute top-[8%] left-1/2 translate-x-2 text-[9px] font-mono text-secondary-500/60 pointer-events-none">{radarRange}km</span>
        <span className="absolute top-[22%] left-1/2 translate-x-2 text-[9px] font-mono text-secondary-500/60 pointer-events-none">{(radarRange * 0.75).toFixed(1)}km</span>
        <span className="absolute top-[35%] left-1/2 translate-x-2 text-[9px] font-mono text-secondary-500/60 pointer-events-none">{(radarRange * 0.5).toFixed(1)}km</span>

        {/* Animated Sweeper Laser Line */}
        {isScanning && (
          <div 
            className="absolute top-1/2 left-1/2 w-[45%] h-[45%] origin-top-left pointer-events-none"
            style={{
              background: 'conic-gradient(from 0deg, rgba(46, 196, 182, 0.4) 0deg, rgba(46, 196, 182, 0) 60deg)',
              borderRadius: '100% 0 0 0',
              animation: 'radarSweep 4s linear infinite'
            }}
          />
        )}

        {/* Center: "You Are Here" Beacon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
          <div className="absolute w-8 h-8 rounded-full bg-blue-500/20 animate-ping" />
          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_15px_#3b82f6] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <span className="absolute top-5 whitespace-nowrap text-[9px] font-mono font-black uppercase text-blue-400 bg-slate-950/80 px-1.5 py-0.5 rounded border border-blue-500/30">
            YOU
          </span>
        </div>

        {/* Plotted Dish Radar Nodes */}
        {radarNodes.map((node) => {
          const isSelected = selectedFood?.id === node.id;
          return (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFood(node);
                onFoodSelect && onFoodSelect(node);
              }}
              style={{
                top: `${node.y}%`,
                left: `${node.x}%`
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer transition-all duration-300 hover:scale-125"
            >
              {/* Pulsing ring for hot fresh meals */}
              {node.kitchenStatus === 'cooking' && (
                <div 
                  className="absolute -inset-2 rounded-full animate-ping opacity-75"
                  style={{ backgroundColor: node.style.color }}
                />
              )}

              {/* Node Icon Circle */}
              <div 
                className={`relative flex items-center justify-center w-7 h-7 rounded-full border-2 border-slate-950 shadow-lg transition-transform ${
                  isSelected ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-950' : ''
                }`}
                style={{ 
                  backgroundColor: node.style.color,
                  boxShadow: `0 0 15px ${node.style.color}80`
                }}
              >
                <span className="text-[11px] font-extrabold text-slate-950">
                  {node.category === 'Breakfast' ? '🍳' : node.category === 'Lunch' ? '🍛' : node.category === 'Dinner' ? '🍲' : '🥪'}
                </span>
              </div>

              {/* Small Proximity Tag */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-white/10 text-[9px] font-mono text-gray-200 flex items-center gap-1 shadow-md pointer-events-none group-hover:border-white/30">
                <span className="font-extrabold text-white">₹{node.price}</span>
                <span className="text-secondary-400">• {node.distanceFormatted}</span>
              </div>
            </div>
          );
        })}

        {/* Empty state when no food within radar range */}
        {radarNodes.length === 0 && (
          <div className="relative z-10 text-center p-6 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-white/10 max-w-xs animate-fade-in">
            <Compass size={24} className="mx-auto text-secondary-500 animate-pulse mb-2" />
            <h4 className="font-bold text-xs text-white">No Active Dishes in {radarRange}km</h4>
            <p className="text-[11px] text-gray-400 mt-1">
              Try increasing the radar range or switching category filters.
            </p>
            <button
              onClick={() => setRadarRange(prev => Math.min(15, prev + 3))}
              className="mt-3 px-3 py-1.5 bg-secondary-500/20 hover:bg-secondary-500/30 text-secondary-400 border border-secondary-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Expand Range to {Math.min(15, radarRange + 3)}km
            </button>
          </div>
        )}
      </div>

      {/* Selected Dish Floating Preview Modal / Drawer */}
      {selectedFood && (
        <div 
          className="relative z-30 m-3 p-3.5 bg-slate-950/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 min-w-0">
            {selectedFood.imageUrl ? (
              <img 
                src={selectedFood.imageUrl} 
                alt={selectedFood.foodName}
                className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" 
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-secondary-500/20 border border-secondary-500/30 flex items-center justify-center text-xl shrink-0">
                🍲
              </div>
            )}
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-secondary-500/15 text-secondary-400 border border-secondary-500/20">
                  {selectedFood.category}
                </span>
                {selectedFood.kitchenStatus === 'cooking' && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    👨‍🍳 Cooking Fresh
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sm text-white truncate mt-0.5">{selectedFood.foodName}</h4>
              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                <span className="text-white font-black text-xs">₹{selectedFood.price}</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">🚶 ~{selectedFood.walkMinutes} min walk ({selectedFood.distanceFormatted})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
            {/* 1-Tap Native Free Google Maps Walking Directions */}
            <button
              onClick={(e) => handleOpenGoogleMaps(selectedFood, e)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
              title="Open Google Maps Turn-by-Turn GPS Directions"
            >
              <Navigation size={13} />
              <span>Directions</span>
            </button>

            {/* View Full Meal Page */}
            <Link
              to={`/food/${selectedFood.id}`}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-slate-950 rounded-xl text-xs font-extrabold transition active:scale-95 shadow-md shadow-primary-500/20"
            >
              <span>Order Now</span>
              <ChevronRight size={13} />
            </Link>

            <button
              onClick={() => setSelectedFood(null)}
              className="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Radar Animation Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes radarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default FoodRadar;
