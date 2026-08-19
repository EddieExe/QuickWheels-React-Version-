/**
 * emergencyHubService.js — Production Grade
 *
 * KEY FIXES:
 * - getNearbyHospitals / getNearbyPoliceStations: routed through the
 *   /maps-api proxy (see vercel.json), not called directly against
 *   places.googleapis.com. An earlier version of this file called Places
 *   API (New) directly to work around vercel.json having no proxy rewrite
 *   at all — that root cause is now fixed at the vercel.json level, so the
 *   proxy is the more reliable path again: it works regardless of whether
 *   Google's CORS policy happens to allow this specific endpoint from a
 *   browser origin, instead of depending on it.
 *
 * - generateAttractionContext (AttractionsNearby): now calls a Firebase
 *   Cloud Function (generateAttractionContext, functions/index.js) via the
 *   Firebase client SDK — not a /api/claude-proxy REST endpoint. Anthropic
 *   keys can't be used client-side at all (unlike Google Maps keys, which
 *   are protected by domain restrictions), so this has to run server-side
 *   with the key held in a Cloud Functions secret.
 *
 * - logEmergencyEvent: uses serverTimestamp(), safe top-level imports.
 * - sendEmergencyEmail: POSTs to /api/emergency-email; no mailto fallback.
 * - getUserEmergencyContact: localStorage fallback for offline scenarios.
 */

import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const PLACES_API_BASE = '/maps-api/v1/places:searchText';

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

// Short, plain-ASCII version for SMS specifically. Emoji force SMS into
// UCS2 encoding (~70 chars/segment instead of 160), and Twilio trial
// accounts reject anything beyond a small segment count ("Trial Message
// Length Exceeded") — the full formatLocationMessage() output was 6
// segments and got silently rejected every time. Keeps only what's
// actually actionable in a text: the location link and vehicle/plate.
export function formatSmsMessage(location, bookingInfo = null) {
  const parts = ['EMERGENCY ALERT.'];
  if (location) {
    parts.push(`Location: ${location.googleMapsUrl}`);
  } else {
    parts.push('Location unavailable.');
  }
  if (bookingInfo) {
    parts.push(`${bookingInfo.carModel || 'Vehicle'} (${bookingInfo.carNumberPlate || 'N/A'}), Booking ${bookingInfo.bookingId || 'N/A'}.`);
  }
  parts.push('Please send help immediately.');
  return parts.join(' ');
}

// ── Send SMS ──────────────────────────────────────────────────────────────────
// Used to POST to /api/send-sms, a Vercel serverless function that was never
// actually built — every SOS activation's SMS step was silently 404ing.
// Routed through a real Cloud Function (sendEmergencySMS) that calls Twilio
// server-side, with credentials held in Cloud Functions secrets — never
// touching the client. Falls back to opening the phone's native SMS app if
// the Cloud Function call fails for any reason (trial-account recipient
// restrictions, network issues, etc.) so the user always has *some* way to
// reach their contact.
export async function sendEmergencySMS(phoneNumber, message) {
  try {
    const functions = getFunctions();
    const sendSMS = httpsCallable(functions, 'sendEmergencySMS');
    await sendSMS({ to: phoneNumber, message });
    return { success: true, method: 'cloud_function_sms' };
  } catch (err) {
    console.warn('[sendEmergencySMS] Cloud Function send failed:', err.message);

    // sms: URIs only do anything on a phone with a native texting app —
    // opening one on desktop silently does nothing, which was previously
    // being reported as "success" regardless of platform. Only attempt
    // (and only report success for) this fallback on an actual mobile
    // device, so the UI never claims something happened when it didn't.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      try {
        window.open(`sms:${phoneNumber}?body=${encodeURIComponent(message)}`, '_blank');
        return { success: true, method: 'sms_uri' };
      } catch (_) {}
    }

    return { success: false, error: err.message };
  }
}

// ── Send Emergency Email ──────────────────────────────────────────────────────
// Used to POST to /api/emergency-email, a Vercel serverless function that was
// never actually built — every real SOS activation was silently failing this
// step with a 404. Routed through the same email_queue + processEmailQueue
// Cloud Function pipeline already used (and proven) for booking emails —
// durable, retried automatically, logged to system_logs on failure — instead
// of a brand-new, untested delivery path.
export async function sendEmergencyEmail(userInfo, location, bookingInfo) {
  try {
    await addDoc(collection(db, 'email_queue'), {
      to: 'quickwheels.support@gmail.com',
      type: 'emergency_sos',
      sent: false,
      createdAt: serverTimestamp(),
      bookingId: bookingInfo?.bookingId || null,
      userEmail: userInfo?.email || null,
      userName: userInfo?.displayName || userInfo?.email || null,
      locationUrl: location?.googleMapsUrl || null,
      coordinates: location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : null,
      carModel: bookingInfo?.carModel || null,
      numberPlate: bookingInfo?.carNumberPlate || null,
    });
    return { success: true };
  } catch (err) {
    console.warn('[sendEmergencyEmail] failed:', err.message);
    return { success: false, error: err.message };
  }
}

// ── Log Emergency Event ───────────────────────────────────────────────────────
export async function logEmergencyEvent(userId, eventData) {
  try {
    // Firestore rejects `undefined` field values outright (unlike `null`,
    // which is fine) — this was crashing every SOS activation whenever the
    // caller passed something like emergencyContactId: undefined (e.g. no
    // contact set yet). Strip undefined keys defensively here instead of
    // relying on every call site to always remember to guard this.
    const clean = Object.fromEntries(
      Object.entries(eventData).filter(([, v]) => v !== undefined)
    );

    await addDoc(collection(db, 'emergency_events'), {
      userId,
      ...clean,
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
 * Routed through /maps-api (see vercel.json) rather than calling
 * places.googleapis.com directly. This used to hit the raw domain because
 * vercel.json had no proxy rewrite at all in production, causing this to
 * 404 silently and leave EmergencyHub stuck on "Loading emergency data...".
 * That's fixed at the vercel.json level now, so routing through the proxy
 * is reliable again — and safer than depending on Google's CORS policy
 * allowing a direct browser call to this specific endpoint.
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
            ? `/maps-api/v1/${photoName}/media?maxWidthPx=400&key=${apiKey}`
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