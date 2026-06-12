import { useState, useEffect } from 'react';

// Default fallback coordinates (Mumbai, India) if user blocks location services
const DEFAULT_COORDS = {
  latitude: 19.0760,
  longitude: 72.8777
};

export const useGeolocation = (autoFetch = false) => {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        setError('Geolocation is not supported by your browser');
        setCoords(DEFAULT_COORDS);
        resolve(DEFAULT_COORDS);
        return;
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const fetchedCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCoords(fetchedCoords);
          setError(null);
          setLoading(false);
          resolve(fetchedCoords);
        },
        (err) => {
          let errorMessage = 'Failed to fetch location';
          if (err.code === 1) errorMessage = 'Location access denied by user';
          else if (err.code === 2) errorMessage = 'Location unavailable';
          else if (err.code === 3) errorMessage = 'Location fetch timeout';
          
          setError(errorMessage);
          setCoords(DEFAULT_COORDS);
          setLoading(false);
          // Return default location on failure so the app doesn't break
          resolve(DEFAULT_COORDS);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  useEffect(() => {
    if (autoFetch) {
      getCoordinates();
    }
  }, [autoFetch]);

  return { coords, error, loading, getCoordinates, defaultCoords: DEFAULT_COORDS };
};

export default useGeolocation;
