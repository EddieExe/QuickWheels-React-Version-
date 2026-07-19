/**
 * emergencyHubService.js — Production Grade
 *
 * KEY FIXES:
 * - getNearbyHospitals / getNearbyPoliceStations: calls the Places API (New)
 *   directly via HTTPS with the API key in the header. This works from browser
 *   as long as your Google Cloud Console has the Places API (New) enabled AND
 *   the API key's HTTP referrer restrictions include your domain.
 *   Remove the /maps-api proxy path — it was causing silent failures if the
 *   Vite proxy wasn't running or misconfigured.
 *
 * - generateAttractionContext (AttractionsNearby): the Anthropic API cannot be
 *   called directly from the browser due to CORS. Route it through your own
 *   backend: POST /api/claude-proxy. If that endpoint isn't available, the
 *   function silently returns {} — attractions still show without AI context.
 *
 * - logEmergencyEvent: uses serverTimestamp(), safe top-level imports.
 * - sendEmergencyEmail: POSTs to /api/emergency-email; no mailto fallback.
 * - getUserEmergencyContact: localStorage fallback for offline scenarios.
 */

import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const PLACES_API_BASE = 'https://places.googleapis.com/v1/places:searchText';

// ── Emergency Services (India) ────────────────────────────────────────────────
export const EMERGENCY_SERVICES = {
  AMBULANCE: { id: 'ambulance', name: 'Ambulance',          icon: '🚑', phone: '108',           color: '#ef4444' },
  POLICE:    { id: 'police',    name: 'Police',              icon: '🚔', phone: '100',           color: '#3b82f6' },
  FIRE:      { id: 'fire',      name: 'Fire Brigade',        icon: '🚒', phone: '101',           color: '#f97316' },
  NATIONAL:  { id: 'national',  name: 'National Emergency',  icon: '🆘', phone: '112',           color: '#ef4444' },
  ROADSIDE:  { id: 'roadside',  name: 'Roadside Help',       icon: '🔧', phone: '1800-123-4567', color: '#f59e0b' },
  TOW:       { id: 'tow',       name: 'Tow Service',         icon: '🛞', phone: '1800-123-4568', color: '#a855f7' },
  SUPPORT:   { id: 'support',   name: 'QuickWheels Support', icon: '🎧', phone: '1800-123-9999', color: '#4ce3f7' },
  WOMEN:     { id: 'women',     name: 'Women Helpline',      icon: '👩', phone: '1091',          color: '#ec4899' },
};

// ── Get User's Emergency Contact ──────────────────────────────────────────────
export async function getUserEmergencyContact(userId) {
  try {
    const ref = doc(db, 'emergency_contacts', userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      try { localStorage.setItem(`emergency_contact_${userId}`, JSON.stringify(data)); } catch (_) {}
      return data;
    }
    // Doc doesn't exist — try localStorage
    try {
      const local = localStorage.getItem(`emergency_contact_${userId}`);
      if (local) return JSON.parse(local);
    } catch (_) {}
    return null;
  } catch (error) {
    console.warn('[getUserEmergencyContact] Firestore failed, using localStorage:', error.message);
    try {
      const local = localStorage.getItem(`emergency_contact_${userId}`);
      return local ? JSON.parse(local) : null;
    } catch (_) { return null; }
  }
}

// ── Get Current GPS Location ──────────────────────────────────────────────────
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
        googleMapsUrl: `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`,
      }),
      err => {
        const msgs = {
          1: 'Location permission denied. Enable GPS in browser settings.',
          2: 'Location unavailable. Check GPS signal.',
          3: 'Location timed out. Please try again.',
        };
        reject(new Error(msgs[err.code] || 'Unable to get location.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

// ── Format Emergency Message ──────────────────────────────────────────────────
export function formatLocationMessage(location, bookingInfo = null) {
  let msg = '🚨 EMERGENCY ALERT\n\n';
  if (location) {
    msg += `📍 Location: ${location.googleMapsUrl}\n`;
    msg += `📍 Coordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}\n`;
    msg += `🎯 Accuracy: ±${Math.round(location.accuracy)}m\n`;
  } else {
    msg += '📍 Location: Not available\n';
  }
  msg += `⏰ Time: ${new Date().toLocaleString('en-IN')}\n`;
  if (bookingInfo) {
    msg += `\n📋 Booking:\n`;
    msg += `🚗 Vehicle: ${bookingInfo.carModel || 'N/A'}\n`;
    msg += `🔢 Plate: ${bookingInfo.carNumberPlate || 'N/A'}\n`;
    msg += `📅 Trip: ${bookingInfo.pickupDate || 'N/A'} → ${bookingInfo.dropoffDate || 'N/A'}\n`;
    msg += `🆔 Booking ID: ${bookingInfo.bookingId || 'N/A'}\n`;
  }
  msg += '\n🚨 Please send help immediately!';
  return msg;
}

// ── Send SMS ──────────────────────────────────────────────────────────────────
export async function sendEmergencySMS(phoneNumber, message) {
  try {
    const res = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phoneNumber, message }),
    });
    if (res.ok) return { success: true, method: 'backend_sms' };
  } catch (_) { /* fallthrough */ }

  // Mobile fallback: open native SMS app
  try {
    window.open(`sms:${phoneNumber}?body=${encodeURIComponent(message)}`, '_blank');
    return { success: true, method: 'sms_uri' };
  } catch (_) {}

  return { success: false };
}

// ── Send Emergency Email ──────────────────────────────────────────────────────
export async function sendEmergencyEmail(userInfo, location, bookingInfo) {
  const body = formatLocationMessage(location, bookingInfo);
  try {
    const res = await fetch('/api/emergency-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'support@quickwheels.com',
        subject: '🚨 EMERGENCY — QuickWheels SOS Alert',
        body,
        userId: userInfo?.uid,
        userEmail: userInfo?.email,
      }),
    });
    if (res.ok) return { success: true };
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err) {
    console.warn('[sendEmergencyEmail] failed:', err.message);
    return { success: false, error: err.message };
  }
}

// ── Log Emergency Event ───────────────────────────────────────────────────────
export async function logEmergencyEvent(userId, eventData) {
  try {
    await addDoc(collection(db, 'emergency_events'), {
      userId,
      ...eventData,
      location: eventData.location
        ? {
            lat: eventData.location.lat,
            lng: eventData.location.lng,
            accuracy: eventData.location.accuracy ?? null,
            googleMapsUrl: eventData.location.googleMapsUrl ?? null,
          }
        : null,
      createdAt: serverTimestamp(),
      status: 'active',
    });
    return { success: true };
  } catch (err) {
    console.error('[logEmergencyEvent] failed:', err);
    return { success: false };
  }
}

// ── Haversine helper ──────────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

// ── Nearby Hospitals ──────────────────────────────────────────────────────────
/**
 * FIX: calls Places API (New) directly via HTTPS — not through /maps-api proxy.
 * The proxy path was the root cause of the blank EmergencyHub:
 *   - Vite's dev proxy rewrites /maps-api → https://places.googleapis.com but
 *     only when `server.proxy` is configured in vite.config.js
 *   - In production builds or missing proxy config the request goes to
 *     /maps-api on the same origin → 404 → fetch throws → loadEmergencyData
 *     never resolves → stuck on "Loading emergency data..."
 *
 * Direct HTTPS call works in all environments as long as:
 *   1. Places API (New) is enabled in Google Cloud Console
 *   2. The API key's HTTP referrer includes your domain (or is unrestricted for dev)
 */
export async function getNearbyHospitals(lat, lng) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[getNearbyHospitals] No API key');
    return [];
  }

  try {
    const res = await fetch(PLACES_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.nationalPhoneNumber',
          'places.internationalPhoneNumber',
          'places.currentOpeningHours',
          'places.photos',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery: 'hospital emergency care medical centre',
        locationBias: {
          circle: { center: { latitude: lat, longitude: lng }, radius: 15000 },
        },
        maxResultCount: 6,
        languageCode: 'en',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Places API ${res.status}: ${err}`);
    }

    const data = await res.json();
    if (!data.places?.length) return [];

    return data.places
      .map(place => {
        const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '108';
        const photoName = place.photos?.[0]?.name;
        const dist = haversine(lat, lng, place.location.latitude, place.location.longitude);

        return {
          id:            place.id,
          name:          place.displayName?.text || 'Hospital',
          address:       place.formattedAddress  || '',
          phone,
          rating:        place.rating || 0,
          totalRatings:  place.userRatingCount || 0,
          open:          place.currentOpeningHours?.openNow ?? null,
          distance:      `${dist} km`,
          distanceNum:   dist,
          lat:           place.location.latitude,
          lng:           place.location.longitude,
          photoUrl:      photoName
            ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${apiKey}`
            : null,
          // ✅ GPS-aware directions URL is built in the component using passed userLocation
          directionsUrl: `https://www.google.com/maps/dir/?api=1&destination_place_id=${place.id}&travelmode=driving`,
          mapsUrl:       `https://www.google.com/maps/place/?q=place_id:${place.id}`,
        };
      })
      .sort((a, b) => a.distanceNum - b.distanceNum);

  } catch (err) {
    console.error('[getNearbyHospitals]', err.message);
    return [];
  }
}

// ── Nearby Police Stations ────────────────────────────────────────────────────
export async function getNearbyPoliceStations(lat, lng) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(PLACES_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.nationalPhoneNumber',
          'places.currentOpeningHours',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery: 'police station',
        locationBias: {
          circle: { center: { latitude: lat, longitude: lng }, radius: 10000 },
        },
        maxResultCount: 4,
        languageCode: 'en',
      }),
    });

    if (!res.ok) throw new Error(`Places API ${res.status}`);
    const data = await res.json();
    if (!data.places?.length) return [];

    return data.places
      .map(place => {
        const dist = haversine(lat, lng, place.location.latitude, place.location.longitude);
        return {
          id:            place.id,
          name:          place.displayName?.text || 'Police Station',
          address:       place.formattedAddress  || '',
          phone:         place.nationalPhoneNumber || '100',
          distance:      `${dist} km`,
          distanceNum:   dist,
          lat:           place.location.latitude,
          lng:           place.location.longitude,
          directionsUrl: `https://www.google.com/maps/dir/?api=1&destination_place_id=${place.id}&travelmode=driving`,
        };
      })
      .sort((a, b) => a.distanceNum - b.distanceNum);

  } catch (err) {
    console.error('[getNearbyPoliceStations]', err.message);
    return [];
  }
}