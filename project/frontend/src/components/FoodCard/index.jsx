import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Tag } from 'lucide-react';
import { calculateDistance, formatDistance } from '../../utils/haversine';
import LiveCounter from '../LiveCounter';
import TrustScore from '../TrustScore';
import TiltCard from '../TiltCard';

export const FoodCard = ({ food, buyerCoords = null, onActionClick = null, actionLabel = 'Order Now' }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  // Expiry countdown calculation
  useEffect(() => {
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
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [food.expiryTime]);

  const distance = buyerCoords && food.location
    ? calculateDistance(
        buyerCoords.latitude,
        buyerCoords.longitude,
        food.location.latitude,
        food.location.longitude
      )
    : null;

  return (
    <TiltCard className={`group glass-panel border border-white/10 hover:border-primary-500/30 rounded-2xl overflow-hidden flex flex-col h-full ${food.isDonation ? 'donation-card' : ''}`}>
      {/* Food Image */}
      <div className="relative h-48 overflow-hidden bg-slate-950">
        <img
          src={food.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'}
          alt={food.foodName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Category tag */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white border border-white/10 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center space-x-1">
          <Tag size={12} className="text-primary-500" />
          <span>{food.category}</span>
        </div>

        {/* Live inventory Counter overlay */}
        <div className="absolute bottom-3 right-3">
          <LiveCounter foodId={food.id} initialQuantity={food.remainingQuantity} />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Seller Info & Trust Score */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-primary-500 font-medium">By {food.sellerName}</span>
          <TrustScore score={food.sellerTrustScore || 90} showIcon={false} className="scale-90 origin-right" />
        </div>

        {/* Food Name */}
        <h3 className="text-lg font-bold text-white mb-1 leading-tight group-hover:text-primary-500 transition-colors">
          {food.foodName}
        </h3>

        {/* Description preview */}
        <p className="text-xs text-gray-400 line-clamp-2 mb-4 flex-grow">
          {food.description || 'No description provided.'}
        </p>

        {/* Info Row: Distance & Expiry */}
        <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3 mb-4 text-xs">
          <div className="flex items-center space-x-1.5 text-gray-300">
            <Clock size={14} className="text-primary-500" />
            <span className={isExpired ? 'text-rose-400 font-medium' : ''}>{timeLeft}</span>
          </div>

          {distance !== null && (
            <div className="flex items-center justify-end space-x-1.5 text-gray-300">
              <MapPin size={14} className="text-primary-500" />
              <span>{formatDistance(distance)} away</span>
            </div>
          )}
        </div>

        {/* Price & Action Footer */}
        <div className="flex items-center justify-between mt-auto border-t border-white/5 pt-3">
          <div>
            <span className="text-xs text-gray-400 block">Price</span>
            {food.isDonation ? (
              <span className="text-sm font-extrabold text-tertiary-500 tracking-wider uppercase flex items-center gap-1">
                <span>🎁</span>
                <span>FREE</span>
              </span>
            ) : (
              <span className="text-lg font-black text-white">₹{food.price}</span>
            )}
          </div>

          {onActionClick ? (
            <button
              onClick={() => onActionClick(food)}
              disabled={isExpired || food.remainingQuantity === 0}
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-500 hover:to-primary-700 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md shadow-primary-500/10 hover:shadow-primary-500/20"
            >
              {actionLabel}
            </button>
          ) : (
            <Link
              to={`/food/${food.id}`}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white hover:text-primary-500 border border-white/10 hover:border-primary-500/30 text-xs font-bold rounded-xl transition-all duration-200"
            >
              Details
            </Link>
          )}
        </div>
      </div>
    </TiltCard>
  );
};

export default FoodCard;
