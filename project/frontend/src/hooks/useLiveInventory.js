import { useState, useEffect } from 'react';
import { syncLiveCounter } from '../firebase/rtdb';

/**
 * Custom Hook to listen to a specific food listing's stock quantity in real-time
 * @param {string} foodId 
 * @param {number} initialQuantity 
 */
export const useLiveInventory = (foodId, initialQuantity) => {
  const [remainingQuantity, setRemainingQuantity] = useState(initialQuantity);

  useEffect(() => {
    if (!foodId) return;

    // Connect real-time synchronization listener
    const unsubscribe = syncLiveCounter(foodId, (qty) => {
      setRemainingQuantity(qty);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [foodId]);

  return remainingQuantity;
};

export default useLiveInventory;
