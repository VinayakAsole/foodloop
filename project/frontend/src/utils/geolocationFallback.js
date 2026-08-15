/**
 * Fetches the user's approximate coordinates based on their IP address.
 * This is used as a fallback when browser geolocation is unavailable,
 * blocked, or taking too long on mobile/desktop browsers.
 */
export const fetchIPLocation = async () => {
  const fetchWithTimeout = async (url, timeoutMs = 2500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch {
      clearTimeout(timer);
      return null;
    }
  };

  // Tier 1: ipapi.co
  try {
    const response = await fetchWithTimeout('https://ipapi.co/json/');
    if (response && response.ok) {
      const data = await response.json();
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        return { latitude: lat, longitude: lng };
      }
    }
  } catch (e) {
    console.warn("ipapi.co fallback failed:", e);
  }

  // Tier 2: ipwhois.app
  try {
    const response = await fetchWithTimeout('https://ipwhois.app/json/');
    if (response && response.ok) {
      const data = await response.json();
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        return { latitude: lat, longitude: lng };
      }
    }
  } catch (e) {
    console.warn("ipwhois.app fallback failed:", e);
  }

  // Tier 3: freeipapi.com
  try {
    const response = await fetchWithTimeout('https://freeipapi.com/api/json');
    if (response && response.ok) {
      const data = await response.json();
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        return { latitude: lat, longitude: lng };
      }
    }
  } catch (e) {
    console.warn("freeipapi.com fallback failed:", e);
  }

  return null;
};

