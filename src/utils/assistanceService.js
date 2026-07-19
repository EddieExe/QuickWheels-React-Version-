/**
 * On-Road Assistance Service
 * Handles all roadside assistance requests
 *
 * FIXES:
 * - createAssistanceRequest: serverTimestamp() instead of new Date()
 * - statusHistory entries use ISO strings (not Date objects) — Firestore-safe
 * - getCurrentLocation: NO silent Mumbai fallback — rejects with clear error message
 * - getActiveAssistance: orderBy('createdAt', 'desc') + limit(1) — always returns latest
 * - updateAssistanceStatus: serverTimestamp() for updatedAt/completedAt
 * - cancelAssistanceRequest: appends cancellation reason to statusHistory
 */

import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';

// ── SVG Icon Strings (for use in JSX components) ────────────
export const SVG_ICONS = {
  FLAT_TIRE: {
    svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 8v4l2 2"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  BATTERY: {
    svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="16" height="10" rx="1" ry="1"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="6" y1="9" x2="6" y2="15"/>
      <line x1="10" y1="9" x2="10" y2="15"/>
      <line x1="14" y1="9" x2="14" y2="15"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  FUEL: {
    svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20L21 20"/>
      <path d="M5 4h10"/>
      <path d="M16 4v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4"/>
      <path d="M18 6l3 3v5a2 2 0 0 1-2 2h-2"/>
      <circle cx="18" cy="13" r="1"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  LOCKOUT: {
    svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      <circle cx="12" cy="16" r="1.5"/>
      <line x1="12" y1="17.5" x2="12" y2="20"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  MECHANICAL: {
    svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <circle cx="10" cy="13" r="2"/>
      <path d="M10 15v3"/>
      <path d="M14 15v3"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  TOWING: {
    svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17h4V5H2v12h3"/>
      <circle cx="10" cy="17" r="2"/>
      <circle cx="20" cy="17" r="2"/>
      <path d="M20 17v-6h-4"/>
      <line x1="8" y1="9" x2="12" y2="9"/>
      <line x1="8" y1="13" x2="12" y2="13"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
};

// ── SVG Icon Strings for Statuses ───────────────────────────
export const STATUS_SVG_ICONS = {
  PENDING: {
    svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  CONFIRMED: {
    svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  DISPATCHED: {
    svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3l1.5 1.5L4 3"/>
      <path d="M1 9l1.5 1.5L4 9"/>
      <path d="M1 15l1.5 1.5L4 15"/>
      <path d="M1 21l1.5 1.5L4 21"/>
      <path d="M8 5h14"/>
      <path d="M8 11h14"/>
      <path d="M8 17h14"/>
      <path d="M8 23h14"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  EN_ROUTE: {
    svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  ARRIVED: {
    svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  IN_PROGRESS: {
    svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="2"/>
      <line x1="12" y1="2" x2="12" y2="4"/>
      <line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/>
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  COMPLETED: {
    svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
  CANCELLED: {
    svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`,
    viewBox: "0 0 24 24"
  },
};

// ── Service Types ────────────────────────────────────────────
export const ASSISTANCE_SERVICES = {
  FLAT_TIRE: {
    id: 'flat_tire',
    name: 'Flat Tire',
    icon: SVG_ICONS.FLAT_TIRE,
    description: 'Tire puncture or blowout assistance',
    estimatedTime: '30–45 min',
    etaMinutes: 35,
    color: '#f59e0b',
  },
  BATTERY_JUMPSTART: {
    id: 'battery_jumpstart',
    name: 'Battery Jumpstart',
    icon: SVG_ICONS.BATTERY,
    description: 'Dead battery jumpstart service',
    estimatedTime: '20–30 min',
    etaMinutes: 25,
    color: '#22c55e',
  },
  FUEL_DELIVERY: {
    id: 'fuel_delivery',
    name: 'Fuel Delivery',
    icon: SVG_ICONS.FUEL,
    description: 'Emergency fuel delivery to your location',
    estimatedTime: '30–40 min',
    etaMinutes: 35,
    color: '#4ce3f7',
  },
  LOCKOUT: {
    id: 'lockout',
    name: 'Lockout Help',
    icon: SVG_ICONS.LOCKOUT,
    description: 'Vehicle unlock service',
    estimatedTime: '20–30 min',
    etaMinutes: 25,
    color: '#a855f7',
  },
  MECHANICAL: {
    id: 'mechanical',
    name: 'Mechanical Assistance',
    icon: SVG_ICONS.MECHANICAL,
    description: 'Minor mechanical repairs on-site',
    estimatedTime: '45–60 min',
    etaMinutes: 50,
    color: '#f97316',
  },
  TOWING: {
    id: 'towing',
    name: 'Vehicle Towing',
    icon: SVG_ICONS.TOWING,
    description: 'Tow to nearest service centre',
    estimatedTime: '60–90 min',
    etaMinutes: 75,
    color: '#ef4444',
  },
};

// ── Request Statuses ─────────────────────────────────────────
export const REQUEST_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DISPATCHED: 'dispatched',
  EN_ROUTE: 'en_route',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const STATUS_META = {
  pending: { 
    label: 'Pending', 
    icon: STATUS_SVG_ICONS.PENDING, 
    color: '#f59e0b' 
  },
  confirmed: { 
    label: 'Confirmed', 
    icon: STATUS_SVG_ICONS.CONFIRMED, 
    color: '#22c55e' 
  },
  dispatched: { 
    label: 'Dispatched', 
    icon: STATUS_SVG_ICONS.DISPATCHED, 
    color: '#3b82f6' 
  },
  en_route: { 
    label: 'En Route', 
    icon: STATUS_SVG_ICONS.EN_ROUTE, 
    color: '#4ce3f7' 
  },
  arrived: { 
    label: 'Arrived', 
    icon: STATUS_SVG_ICONS.ARRIVED, 
    color: '#a855f7' 
  },
  in_progress: { 
    label: 'In Progress', 
    icon: STATUS_SVG_ICONS.IN_PROGRESS, 
    color: '#f97316' 
  },
  completed: { 
    label: 'Completed', 
    icon: STATUS_SVG_ICONS.COMPLETED, 
    color: '#22c55e' 
  },
  cancelled: { 
    label: 'Cancelled', 
    icon: STATUS_SVG_ICONS.CANCELLED, 
    color: '#ef4444' 
  },
};

// ── Helper: Convert SVG string to React element ────────────
// This can be used in components to render the SVG icons
export const renderSVG = (svgObj, props = {}) => {
  if (!svgObj || !svgObj.svg) return null;
  
  // Create a div and set innerHTML to the SVG string
  const div = document.createElement('div');
  div.innerHTML = svgObj.svg;
  const svgElement = div.firstElementChild;
  
  // Apply any additional props
  Object.keys(props).forEach(key => {
    if (svgElement) {
      svgElement.setAttribute(key, props[key]);
    }
  });
  
  return svgElement;
};

// ── Get Current GPS Location ─────────────────────────────────
// FIX: NO silent fallback to hardcoded coords — rejects with a clear user-facing message.
// The caller (AssistanceRequest.jsx) is responsible for showing the error.
export function getCurrentLocation() {
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
          address: 'Current Location',
          googleMapsUrl: `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`,
        });
      },
      (err) => {
        const messages = {
          1: 'Location permission denied. Please enable GPS in your browser settings.',
          2: 'Location unavailable. Please check your GPS signal and try again.',
          3: 'Location request timed out. Please try again.',
        };
        reject(new Error(messages[err.code] || 'Unable to get your location.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

// ── Create Assistance Request ────────────────────────────────
export async function createAssistanceRequest(userId, serviceType, location, bookingInfo = null) {
  try {
    const service = ASSISTANCE_SERVICES[serviceType];
    if (!service) throw new Error(`Unknown service type: ${serviceType}`);

    const nowIso = new Date().toISOString();

    const requestData = {
      userId,
      serviceType,
      serviceName: service.name,
      serviceIcon: service.icon,
      status: REQUEST_STATUS.PENDING,
      location: {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy ?? null,
        address: location.address || 'Current Location',
        googleMapsUrl: location.googleMapsUrl || '',
      },
      bookingInfo: bookingInfo
        ? {
            bookingId: bookingInfo.bookingId || null,
            carModel: bookingInfo.carModel || null,
            carNumberPlate: bookingInfo.carNumberPlate || null,
          }
        : null,
      etaMinutes: service.etaMinutes,
      // ISO string — readable without Firestore SDK on the receiving end
      estimatedArrival: new Date(Date.now() + service.etaMinutes * 60000).toISOString(),
      // FIX: statusHistory entries are plain objects with ISO strings — Firestore-safe
      statusHistory: [
        {
          status: REQUEST_STATUS.PENDING,
          timestamp: nowIso,
          note: 'Assistance requested by user',
        },
      ],
      // FIX: serverTimestamp() for consistency across timezones
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'assistance_requests'), requestData);

    return {
      success: true,
      id: docRef.id,
      // Spread requestData but replace serverTimestamp sentinels with a JS Date
      // so the component can use .createdAt immediately without waiting for Firestore
      ...requestData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Failed to create assistance request:', error);
    return { success: false, error: error.message };
  }
}

// ── Get Active Assistance Request ────────────────────────────
// FIX: orderBy + limit(1) — always returns the most recent active request
// Remove orderBy + limit, sort client-side instead (no index needed)
export async function getActiveAssistance(userId) {
  try {
    const activeStatuses = [
      REQUEST_STATUS.PENDING, REQUEST_STATUS.CONFIRMED,
      REQUEST_STATUS.DISPATCHED, REQUEST_STATUS.EN_ROUTE,
      REQUEST_STATUS.ARRIVED, REQUEST_STATUS.IN_PROGRESS,
    ];

    // ✅ No orderBy = no composite index required
    const q = query(
      collection(db, 'assistance_requests'),
      where('userId', '==', userId),
      where('status', 'in', activeStatuses)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    // Sort client-side by createdAt descending
    const docs = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const tsA = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
        const tsB = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
        return tsB - tsA;
      });

    return docs[0];
  } catch (error) {
    console.error('Failed to fetch active assistance:', error);
    return null;
  }
}

// ── Get Assistance History ───────────────────────────────────
export async function getAssistanceHistory(userId) {
  try {
    const q = query(
      collection(db, 'assistance_requests'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Failed to fetch assistance history:', error);
    return [];
  }
}

// ── Update Request Status ────────────────────────────────────
export async function updateAssistanceStatus(requestId, newStatus, note = '') {
  try {
    const ref = doc(db, 'assistance_requests', requestId);
    const nowIso = new Date().toISOString();

    const updates = {
      status: newStatus,
      updatedAt: serverTimestamp(),
      // FIX: append to statusHistory using arrayUnion — safe for concurrent writes
      statusHistory: arrayUnion({
        status: newStatus,
        timestamp: nowIso,
        note,
      }),
    };

    if (newStatus === REQUEST_STATUS.COMPLETED) {
      updates.completedAt = serverTimestamp();
    }

    await updateDoc(ref, updates);
    return { success: true };
  } catch (error) {
    console.error('Failed to update assistance status:', error);
    return { success: false, error: error.message };
  }
}

// ── Cancel Assistance Request ────────────────────────────────
// FIX: now passes the reason as a note appended to statusHistory
export async function cancelAssistanceRequest(requestId, reason = 'Cancelled by user') {
  return updateAssistanceStatus(requestId, REQUEST_STATUS.CANCELLED, reason);
}

// ── Calculate ETA Display ────────────────────────────────────
// Handles Firestore Timestamp, JS Date, or ISO string safely
export function calculateETADisplay(createdAt, etaMinutes) {
  let created;

  if (!createdAt) return null;

  if (typeof createdAt.toDate === 'function') {
    // Firestore Timestamp
    created = createdAt.toDate();
  } else if (createdAt instanceof Date) {
    created = createdAt;
  } else {
    // ISO string or number
    created = new Date(createdAt);
  }

  if (isNaN(created.getTime())) return null;

  const estimatedArrival = new Date(created.getTime() + etaMinutes * 60000);
  const remainingMs = estimatedArrival - Date.now();

  if (remainingMs <= 0) return 'Arriving now';

  const remainingMin = Math.ceil(remainingMs / 60000);
  if (remainingMin <= 1) return '1 minute';
  if (remainingMin < 60) return `${remainingMin} minutes`;

  const hours = Math.floor(remainingMin / 60);
  const mins = remainingMin % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}