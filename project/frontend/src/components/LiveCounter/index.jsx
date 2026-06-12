import React from 'react';
import useLiveInventory from '../../hooks/useLiveInventory';
import { Layers } from 'lucide-react';

export const LiveCounter = ({ foodId, initialQuantity, className = '' }) => {
  const remainingQuantity = useLiveInventory(foodId, initialQuantity);

  const getStockColor = () => {
    if (remainingQuantity === 0) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    if (remainingQuantity <= 3) return 'text-amber-500 bg-amber-500/10 border-amber-500/20 animate-pulse';
    return 'text-secondary-500 bg-secondary-500/10 border-secondary-500/20 live-counter-badge';
  };

  return (
    <div className={`inline-flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-xs font-bold tracking-wide uppercase ${getStockColor()} ${className}`}>
      {remainingQuantity > 0 ? (
        <>
          <span className="live-indicator"></span>
          <Layers size={13} className="mr-0.5" />
          <span>{remainingQuantity} {remainingQuantity === 1 ? 'Plate' : 'Plates'} Left</span>
        </>
      ) : (
        <span className="text-gray-400 font-semibold uppercase">Sold Out</span>
      )}
    </div>
  );
};

export default LiveCounter;
