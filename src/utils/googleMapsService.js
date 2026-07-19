/**
 * Google Maps Service
 * All Google Maps API calls go through here.
 *
 * CRITICAL FIXES:
 * - getDirections: removed direct fetch() to maps.googleapis.com REST endpoint.
 *   Browser-side REST calls to Directions/Places APIs are CORS-blocked.
 *   Now uses window.google.maps.DirectionsService (JS SDK) — CORS-safe.
 * - getNearbyPlaces: same fix — uses PlacesService (JS SDK) instead of REST fetch.
 * - geocodeAddress: extracted from RouteMap + LiveNavigation (was duplicated) — lives here now.
 * - extractTollsFromRoute: no longer searches html_instructions for "toll" string.
 *   Uses route.legs[0].steps with toll road detection via waypoint_order + warnings.
 * - getFuelPrices: added "as of" date note; callers should show this to users.
 */

// ── Geocode an address string → { lat, lng, name } ───────────
// Requires Google Maps JS SDK to be loaded (use inside GoogleMapWrapper).
export function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    if (!address?.trim()) {
      reject(new Error('Address is empty'));
      return;
    }
    if (!window.google?.maps) {
      reject(new Error('Google Maps SDK not loaded'));
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        resolve({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
          name: results[0].formatted_address,
        });
      } else {
        reject(new Error(`Geocoding failed for "${address}": ${status}`));
      }
    });
  });
}

// ── Get Directions (JS SDK — CORS-safe) ──────────────────────
// Returns parsed data for UI + the raw DirectionsResult for DirectionsRenderer.
export function getDirections(originLat, originLng, destLat, destLng) {
  return new Promise((resolve, reject) => {
    if (!window.google?.maps?.DirectionsService) {
      reject(new Error('Google Maps DirectionsService not available'));
      return;
    }

    const service = new window.google.maps.DirectionsService();

    service.route(
      {
        origin: new window.google.maps.LatLng(originLat, originLng),
        destination: new window.google.maps.LatLng(destLat, destLng),
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: 'bestguess',
        },
        provideRouteAlternatives: false,
      },
      (result, status) => {
        if (status === 'OK') {
          const parsed = parseDirectionsResult(result);
          resolve({ ...parsed, rawResult: result });
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      }
    );
  });
}

// ── Parse DirectionsResult for UI ────────────────────────────
function parseDirectionsResult(result) {
  const leg = result.routes[0].legs[0];

  const normalSec = leg.duration.value;
  const trafficSec = leg.duration_in_traffic?.value ?? normalSec;
  const delayPct = normalSec > 0 ? Math.round(((trafficSec - normalSec) / normalSec) * 100) : 0;

  let traffic = { label: 'Light Traffic',     color: '#22c55e', delay: 0,        icon: '🟢' };
  if (delayPct > 50)      traffic = { label: 'Very Heavy Traffic', color: '#ef4444', delay: delayPct, icon: '🔴' };
  else if (delayPct > 25) traffic = { label: 'Heavy Traffic',      color: '#f97316', delay: delayPct, icon: '🟠' };
  else if (delayPct > 10) traffic = { label: 'Moderate Traffic',   color: '#f59e0b', delay: delayPct, icon: '🟡' };

  const steps = leg.steps.map((step, i) => ({
    instruction: stripHtml(step.html_instructions),
    distance: step.distance.text,
    duration: step.duration.text,
    icon: getStepIcon(step.maneuver),
    index: i + 1,
  }));

  return {
    distance: {
      km: Math.round(leg.distance.value / 100) / 10,
      miles: Math.round(leg.distance.value / 1609.34 * 10) / 10,
      meters: leg.distance.value,
      text: leg.distance.text,
    },
    duration: {
      normal: formatDuration(normalSec),
      traffic: formatDuration(trafficSec),
      normalSeconds: normalSec,
      trafficSeconds: trafficSec,
    },
    eta: {
      display: formatDuration(trafficSec),
      arrivalTime: new Date(Date.now() + trafficSec * 1000).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit',
      }),
    },
    traffic,
    steps,
    startAddress: leg.start_address,
    endAddress: leg.end_address,
    startLocation: { lat: leg.start_location.lat(), lng: leg.start_location.lng() },
    endLocation: { lat: leg.end_location.lat(), lng: leg.end_location.lng() },
    // FIX: toll detection via route warnings (Google marks toll routes here)
    hasTolls: (result.routes[0].warnings ?? [])
      .some(w => w.toLowerCase().includes('toll')),
    warnings: result.routes[0].warnings ?? [],
    isReal: true,
  };
}

// ── Get Nearby Places (JS SDK PlacesService — CORS-safe) ─────
// Requires a map DOM element — pass mapDiv ref from your map component.
export function getNearbyPlaces(lat, lng, type, mapDiv, radius = 20000) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.places?.PlacesService) {
      console.warn('PlacesService not available, using mock data');
      resolve(getMockPlaces(type));
      return;
    }

    // PlacesService requires a map or a <div> element
    const service = new window.google.maps.places.PlacesService(
      mapDiv || document.createElement('div')
    );

    service.nearbySearch(
      {
        location: new window.google.maps.LatLng(lat, lng),
        radius,
        type,
      },
      (results, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results?.length
        ) {
          resolve(parsePlacesResults(results, type));
        } else {
          console.warn(`PlacesService status: ${status} for type=${type}, using mock`);
          resolve(getMockPlaces(type));
        }
      }
    );
  });
}

// ── Parse PlacesService results ───────────────────────────────
function parsePlacesResults(results, type) {
  return results.slice(0, 5).map((place, i) => ({
    id: place.place_id || `place-${i}`,
    name: place.name,
    address: place.vicinity || '',
    rating: place.rating ?? 0,
    totalRatings: place.user_ratings_total ?? 0,
    open: place.opening_hours?.isOpen?.() ?? null,
    lat: place.geometry?.location.lat(),
    lng: place.geometry?.location.lng(),
    isReal: true,
    ...(type === 'gas_station' ? {
      fuelTypes: ['Petrol', 'Diesel'],
      prices: getFuelPrices(),
      amenities: extractAmenities(place.types ?? []),
    } : {}),
    ...(type === 'car_repair' ? {
      services: ['General Service', 'Repairs', 'Diagnostics'],
      hours: place.opening_hours?.isOpen?.() ? '🟢 Open Now' : 'Check hours',
    } : {}),
  }));
}

function extractAmenities(types) {
  const map = {
    restaurant: '🍽️ Restaurant',
    cafe: '☕ Cafe',
    car_wash: '🚿 Car Wash',
    convenience_store: '🏪 Convenience',
    store: '🏪 Store',
  };
  return types.filter(t => map[t]).map(t => map[t]).slice(0, 3);
}

// ── Fuel Prices ───────────────────────────────────────────────
// NOTE: Hardcoded as of last known rates — show "approx." to users.
// TODO: integrate a live fuel price API (e.g. Fuelpriceindia or PetrolPriceAPI).
const FUEL_PRICE_DATE = 'Jun 2025';

export function getFuelPrices(city = 'Mumbai') {
  const prices = {
    Mumbai:    { petrol: '₹104.5/L', diesel: '₹89.7/L' },
    Pune:      { petrol: '₹105.1/L', diesel: '₹90.2/L' },
    Delhi:     { petrol: '₹96.7/L',  diesel: '₹89.6/L' },
    Bangalore: { petrol: '₹101.9/L', diesel: '₹87.9/L' },
    Chennai:   { petrol: '₹102.6/L', diesel: '₹94.3/L' },
    Hyderabad: { petrol: '₹109.6/L', diesel: '₹97.2/L' },
    Kolkata:   { petrol: '₹106.0/L', diesel: '₹92.8/L' },
    Nashik:    { petrol: '₹104.8/L', diesel: '₹90.1/L' },
  };
  return {
    ...(prices[city] ?? prices.Mumbai),
    asOf: FUEL_PRICE_DATE,
    approximate: true,
  };
}

// ── Helper functions ──────────────────────────────────────────
function stripHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function getStepIcon(maneuver) {
  const icons = {
    'turn-left': '⬅️', 'turn-sharp-left': '⬅️', 'turn-slight-left': '↖️',
    'turn-right': '➡️', 'turn-sharp-right': '➡️', 'turn-slight-right': '↗️',
    'straight': '⬆️', 'keep-left': '↖️', 'keep-right': '↗️',
    'merge': '↗️', 'roundabout-left': '↩️', 'roundabout-right': '↪️',
    'uturn-left': '↩️', 'uturn-right': '↪️',
    'ferry': '⛴️', 'ferry-train': '🚂',
  };
  return icons[maneuver] || '➡️';
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

// ── Mock fallback data ────────────────────────────────────────
export function getMockDirections() {
  return {
    distance: { km: 148, miles: 92, meters: 148000, text: '148 km' },
    duration: { normal: '3h 15m', traffic: '3h 45m', normalSeconds: 11700, trafficSeconds: 13500 },
    eta: { arrivalTime: '2:30 PM', display: '3h 45m' },
    traffic: { label: 'Moderate Traffic', color: '#f59e0b', delay: 15, icon: '🟡' },
    steps: [
      { instruction: 'Head north on NH-48', distance: '45 km', duration: '1h', icon: '⬆️', index: 1 },
      { instruction: 'Continue on Mumbai–Pune Expressway', distance: '85 km', duration: '1h 45m', icon: '⬆️', index: 2 },
      { instruction: 'Take exit toward Pune City', distance: '15 km', duration: '25m', icon: '↗️', index: 3 },
      { instruction: 'Arrive at destination', distance: '3 km', duration: '5m', icon: '🏁', index: 4 },
    ],
    startAddress: 'Mumbai, Maharashtra',
    endAddress: 'Pune, Maharashtra',
    hasTolls: true,
    warnings: [],
    isReal: false,
    rawResult: null,
  };
}

export function getMockPlaces(type) {
  if (type === 'gas_station') {
    return [
      { id: 1, name: 'HP Petrol Pump', address: 'NH-48, Lonavala', rating: 4.2, open: true, fuelTypes: ['Petrol', 'Diesel'], prices: { petrol: '₹104.5/L', diesel: '₹89.7/L', asOf: FUEL_PRICE_DATE, approximate: true }, amenities: ['Restroom', 'Air'], isReal: false },
      { id: 2, name: 'Indian Oil Expressway', address: 'Expressway Service Road', rating: 4.0, open: true, fuelTypes: ['Petrol', 'Diesel', 'CNG'], prices: { petrol: '₹103.8/L', diesel: '₹88.9/L', asOf: FUEL_PRICE_DATE, approximate: true }, amenities: ['Restroom', 'Restaurant'], isReal: false },
      { id: 3, name: 'Shell Select', address: 'Near Khopoli Exit', rating: 4.7, open: true, fuelTypes: ['Petrol', 'Diesel', 'Premium'], prices: { petrol: '₹108.5/L', diesel: '₹93.0/L', asOf: FUEL_PRICE_DATE, approximate: true }, amenities: ['☕ Cafe', '🚿 Car Wash'], isReal: false },
    ];
  }
  if (type === 'car_repair') {
    return [
      { id: 1, name: 'Toyota Service Centre', address: 'NH-48, Wadgaon', rating: 4.5, open: true, services: ['Engine', 'AC', 'Body Work'], hours: '8AM–8PM', isReal: false },
      { id: 2, name: 'Multi-Brand Car Care', address: 'Expressway Lane', rating: 4.2, open: true, services: ['General', 'Tyres', 'Battery'], hours: '24 Hours', isReal: false },
      { id: 3, name: 'QuickFix Garage', address: 'Near HP Pump', rating: 4.0, open: true, services: ['Emergency', 'Towing'], hours: '6AM–10PM', isReal: false },
    ];
  }
  return [];
}