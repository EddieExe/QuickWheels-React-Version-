/**
 * Location Service
 * Handles GPS, distance calculations, and navigation utilities
 *
 * FIXES:
 * - getUserLocation: NO silent Mumbai fallback — rejects with clear message.
 *   Callers must handle the error and show it to the user.
 * - getTrafficConditions: removed random return — function now clearly documented
 *   as a placeholder that returns a neutral state. Real traffic comes from
 *   the Google Directions API (duration_in_traffic) in googleMapsService.js.
 * - simulateCarMovement: removed random jitter — interpolates cleanly.
 *   Use only for demo/fallback mode; real tracking uses watchUserLocation.
 * - watchUserLocation: unchanged but documented more clearly.
 */

// ── Get User's Current Position ──────────────────────────────
// FIX: rejects on failure — never silently falls back to Mumbai.
// Wrap every call site in try/catch and surface the error to the user.
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser or device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading ?? null,
          speed: position.coords.speed ?? null,
          timestamp: position.timestamp,
          isMock: false,
        });
      },
      (error) => {
        const messages = {
          1: 'Location permission denied. Please enable GPS in your browser settings.',
          2: 'Location unavailable. Please check your GPS signal.',
          3: 'Location request timed out. Please try again.',
        };
        reject(new Error(messages[error.code] || 'Unable to get your location.'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}

// ── Watch User's Position (live tracking) ────────────────────
// Returns a cleanup function — call it to stop watching.
export function watchUserLocation(onUpdate, onError) {
  if (!navigator.geolocation) {
    onError?.(new Error('Geolocation not supported'));
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading ?? null,
        speed: position.coords.speed ?? null,
        timestamp: position.timestamp,
        isMock: false,
      });
    },
    (error) => {
      console.warn('watchPosition error:', error.message);
      onError?.(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    }
  );

  // Return cleanup so callers can call stopWatching() in useEffect cleanup
  return () => navigator.geolocation.clearWatch(watchId);
}

// ── Haversine Distance ────────────────────────────────────────
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return {
    km: Math.round(distance * 10) / 10,
    miles: Math.round(distance * 0.621371 * 10) / 10,
    meters: Math.round(distance * 1000),
  };
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// ── Calculate ETA from distance ───────────────────────────────
export function calculateETA(distanceKm, speedKmh = 60) {
  const hours = distanceKm / speedKmh;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const eta = new Date(Date.now() + hours * 3600000);

  return {
    hours: h,
    minutes: m,
    totalMinutes: Math.round(hours * 60),
    display: h > 0 ? `${h}h ${m}m` : `${m} min`,
    arrivalTime: eta.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

// ── Interpolated Car Position (demo / fallback only) ─────────
// FIX: no random jitter — smooth linear interpolation only.
// For real tracking use watchUserLocation instead.
export function simulateCarMovement(startLat, startLng, endLat, endLng, progress) {
  const t = Math.max(0, Math.min(1, progress / 100));
  return {
    lat: startLat + (endLat - startLat) * t,
    lng: startLng + (endLng - startLng) * t,
  };
}

// ── Straight-line Fallback Distance ──────────────────────────
// Used when Directions API is unavailable
export function straightLineDistance(originLat, originLng, destLat, destLng) {
  return calculateDistance(originLat, originLng, destLat, destLng);
}

// ── Traffic Conditions ────────────────────────────────────────
// NOTE: This does NOT return real traffic data.
// Real traffic delay comes from Google Directions API (duration_in_traffic).
// This function is only used as a neutral placeholder when the API is unavailable.
export function getTrafficConditions() {
  return { label: 'Unavailable', color: '#94a3b8', delay: 0, icon: '⚪' };
}

// ── Route Waypoints (linear interpolation) ───────────────────
export function getRouteWaypoints(origin, destination, count = 3) {
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1);
    return {
      lat: origin.lat + (destination.lat - origin.lat) * t,
      lng: origin.lng + (destination.lng - origin.lng) * t,
      name: i === Math.floor(count / 2) ? 'Midway Point' : `Waypoint ${i + 1}`,
    };
  });
}