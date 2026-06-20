/**
 * Fetches the user's approximate coordinates based on their IP address.
 * This is used as a fallback when browser geolocation is unavailable,
 * blocked, or in non-secure (HTTP) contexts like accessing the local server on mobile.
 */
export const fetchIPLocation = async () => {
  // Try ipapi.co first
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        console.log("Acquired fallback coordinates from ipapi.co:", lat, lng);
        return { latitude: lat, longitude: lng };
      }
    }
  } catch (e) {
    console.warn("ipapi.co geolocation fallback failed:", e);
  }

  // Try ipwhois.app as a secondary fallback
  try {
    const response = await fetch('https://ipwhois.app/json/');
    if (response.ok) {
      const data = await response.json();
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        console.log("Acquired fallback coordinates from ipwhois.app:", lat, lng);
        return { latitude: lat, longitude: lng };
      }
    }
  } catch (e) {
    console.warn("ipwhois.app geolocation fallback failed:", e);
  }

  return null;
};
