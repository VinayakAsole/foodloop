/**
 * Fetches walking route geometry, distance, and duration between two coordinates
 * using the public Open Source Routing Machine (OSRM) API.
 * 
 * @param {Object} start - { latitude, longitude }
 * @param {Object} end - { latitude, longitude }
 * @returns {Promise<Object>} { coordinates, distance, duration, steps }
 */
export const fetchWalkingRoute = async (start, end) => {
  if (!start || !end) {
    throw new Error('Start and end coordinates are required.');
  }

  const { latitude: startLat, longitude: startLng } = start;
  const { latitude: endLat, longitude: endLng } = end;

  // OSRM coordinates are specified as longitude,latitude
  const url = `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found.');
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
      
      // Simple instruction synthesis
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
        // Fallback capitalize first letter
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
      steps
    };
  } catch (err) {
    console.error('Failed to fetch walking route:', err);
    throw err;
  }
};
