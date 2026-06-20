import { useState, useEffect } from 'react';
import { fetchIPLocation } from '../utils/geolocationFallback';

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
      const handleIPFallback = async (gpsErrorMsg) => {
        setError(`${gpsErrorMsg}. Trying IP geolocation...`);
        const ipCoords = await fetchIPLocation();
        if (ipCoords) {
          setCoords(ipCoords);
          setError(null);
          setLoading(false);
          resolve(ipCoords);
        } else {
          setError(`${gpsErrorMsg}. IP geolocation fallback also failed.`);
          setCoords(DEFAULT_COORDS);
          setLoading(false);
          resolve(DEFAULT_COORDS);
        }
      };

      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        handleIPFallback('Geolocation is not supported by your browser');
        return;
      }

      // Check if we are in secure context, otherwise getCurrentPosition will fail silently or reject on many mobile browsers
      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';

      if (!isSecure) {
        handleIPFallback('Geolocation requires a secure context (HTTPS/localhost)');
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
          
          handleIPFallback(errorMessage);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
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
