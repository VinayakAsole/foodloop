import { calculateDistance } from './haversine';

/**
 * Creates a smooth direct walking path between two points as a fallback
 * when external routing servers are unavailable.
 */
const generateFallbackRoute = (start, end) => {
  const startLat = parseFloat(start.latitude);
  const startLng = parseFloat(start.longitude);
  const endLat = parseFloat(end.latitude);
  const endLng = parseFloat(end.longitude);

  const distKm = calculateDistance(startLat, startLng, endLat, endLng);
  const distMeters = Math.max(10, Math.round(distKm * 1000));
  
  // Average human walking speed: 4.5 km/h = 1.25 m/s
  const durationSec = Math.max(30, Math.round(distMeters / 1.25));

  // Generate 5 intermediate waypoints with slight natural jitter
  const numSteps = 5;
  const coordinates = [];
  for (let i = 0; i <= numSteps; i++) {
    const ratio = i / numSteps;
    const lat = startLat + (endLat - startLat) * ratio;
    const lng = startLng + (endLng - startLng) * ratio;
    coordinates.push([lat, lng]);
  }

  const steps = [
    {
      instruction: 'Start walking towards the kitchen pickup location',
      distance: Math.round(distMeters * 0.3),
      duration: Math.round(durationSec * 0.3)
    },
    {
      instruction: 'Continue straight along the route towards destination',
      distance: Math.round(distMeters * 0.5),
      duration: Math.round(durationSec * 0.5)
    },
    {
      instruction: 'Arrive at the kitchen for meal collection',
      distance: Math.round(distMeters * 0.2),
      duration: Math.round(durationSec * 0.2)
    }
  ];

  return {
    coordinates,
    distance: distMeters,
    duration: durationSec,
    steps,
    isFallback: true
  };
};

/**
 * Fetches walking route geometry, distance, and duration between two coordinates
 * using the public Open Source Routing Machine (OSRM) API with automatic resilient fallback.
 * 
 * @param {Object} start - { latitude, longitude }
 * @param {Object} end - { latitude, longitude }
 * @returns {Promise<Object>} { coordinates, distance, duration, steps }
 */
export const fetchWalkingRoute = async (start, end) => {
  if (!start || !end) {
    throw new Error('Start and end coordinates are required.');
  }

  const startLat = parseFloat(start.latitude);
  const startLng = parseFloat(start.longitude);
  const endLat = parseFloat(end.latitude);
  const endLng = parseFloat(end.longitude);

  if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
    throw new Error('Invalid coordinate values provided for routing.');
  }

  // OSRM coordinates are specified as longitude,latitude
  const url = `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for fast response

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM API response status: ${response.status}`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found from OSRM.');
    }

    const route = data.routes[0];
    
    // OSRM returns coordinates as [lng, lat]. We need [lat, lng] for Leaflet
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const distance = route.distance; // in meters
    const duration = route.duration; // in seconds

    // Map route steps to human readable instructions
    const steps = (route.legs?.[0]?.steps || []).map((step) => {
      const type = step.maneuver.type;
      const modifier = step.maneuver.modifier || '';
      const street = step.name ? `on ${step.name}` : '';
      
      let instruction;
      if (type === 'depart') {
        instruction = `Head ${modifier} ${street}`.trim();
      } else if (type === 'arrive') {
        instruction = 'Arrive at destination';
      } else if (type === 'turn') {
        instruction = `Turn ${modifier} ${street}`.trim();
      } else if (type === 'new name') {
        instruction = `Continue onto ${step.name || 'road'}`;
      } else {
        const action = type.charAt(0).toUpperCase() + type.slice(1);
        instruction = `${action} ${modifier} ${street}`.trim();
      }

      return {
        instruction,
        distance: step.distance,
        duration: step.duration
      };
    });

    return {
      coordinates,
      distance,
      duration,
      steps,
      isFallback: false
    };
  } catch (err) {
    console.warn('OSRM routing unavailable or timed out, activating geodetic walking fallback:', err.message);
    return generateFallbackRoute(start, end);
  }
};

