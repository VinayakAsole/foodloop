import { calculateDistance, formatDistance } from './haversine';

// Eco impact constants matching EcoImpactWidget
const CO2_PER_MEAL = 2.5; 
const WATER_PER_MEAL = 150; 

/**
 * Calculates eco impact values from completed plates count.
 */
export const calculateEcoImpact = (completedPlates) => {
  const co2Saved = completedPlates * CO2_PER_MEAL;
  const waterSaved = completedPlates * WATER_PER_MEAL;
  const treeDays = Math.round(co2Saved / 0.06);
  const smartphoneCharges = Math.round(co2Saved * 122);
  const carKmSaved = co2Saved * 4;

  return {
    co2Saved,
    waterSaved,
    treeDays,
    smartphoneCharges,
    carKmSaved
  };
};

/**
 * Simulates the Date countdown timer logic
 */
export const calculateTimeRemaining = (expiryTime, nowTime = new Date()) => {
  const expiry = new Date(expiryTime);
  const diff = expiry - nowTime;

  if (diff <= 0) {
    return { text: 'Expired', isExpired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  const text = hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
  return { text, isExpired: false };
};

/**
 * Runs all validation unit tests
 */
export const runTestSuite = () => {
  console.group('🧪 FoodLoop Diagnostics Self-Test Suite');
  let passed = 0;
  let failed = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`%c[PASS] ${description}`, 'color: #10b981; font-weight: bold;');
      passed++;
    } else {
      console.error(`[FAIL] ${description}`);
      failed++;
    }
  };

  try {
    // 1. Haversine Distance Tests
    assert(calculateDistance(19.076, 72.8777, 19.076, 72.8777) === 0, 'Haversine: Zero distance for identical coords');
    
    // Mumbai to Pune is ~120 km
    const distanceMumbaiPune = calculateDistance(19.076, 72.8777, 18.5204, 73.8567);
    assert(distanceMumbaiPune >= 110 && distanceMumbaiPune <= 130, `Haversine: Mumbai to Pune distance lies in expected bounds (${distanceMumbaiPune} km)`);

    assert(formatDistance(0.5) === '500 m', 'Distance Formatting: Sub-kilometer converted to meters');
    assert(formatDistance(2.3) === '2.3 km', 'Distance Formatting: Kilometer formatting correct');

    // 2. Eco Impact calculations tests
    const impact5 = calculateEcoImpact(5);
    assert(impact5.co2Saved === 12.5, 'Eco Impact: CO2 math correct');
    assert(impact5.waterSaved === 750, 'Eco Impact: Water math correct');
    assert(impact5.treeDays === Math.round(12.5 / 0.06), 'Eco Impact: Tree absorption days correct');
    assert(impact5.smartphoneCharges === Math.round(12.5 * 122), 'Eco Impact: Smartphone charges equivalent correct');
    assert(impact5.carKmSaved === 50, 'Eco Impact: Car mileage offset correct');

    // 3. Countdown Ticker calculations tests
    const now = new Date();
    const expiryFuture = new Date(now.getTime() + 1000 * 60 * 95); // 1h 35m in future
    const resFuture = calculateTimeRemaining(expiryFuture.toISOString(), now);
    assert(resFuture.text === '1h 35m left' && !resFuture.isExpired, 'Countdown: Future expiration calculates correct hours/minutes');

    const expiryPast = new Date(now.getTime() - 1000 * 60 * 10); // 10m in past
    const resPast = calculateTimeRemaining(expiryPast.toISOString(), now);
    assert(resPast.text === 'Expired' && resPast.isExpired, 'Countdown: Past expiration sets Expired state');

    console.log(`%cTotal Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`, 'font-weight: bold; color: #3b82f6;');
  } catch (err) {
    console.error('Test Suite crashed with unexpected error:', err);
    failed++;
  }
  
  console.groupEnd();
  return { passed, failed };
};
