/**
 * Notification Service — Production Grade
 * 
 * Features:
 * - Firestore real-time listener (onSnapshot) — no polling
 * - Batch mark-all-read with writeBatch for atomicity
 * - Demo mode with sessionStorage persistence (survives re-opens)
 * - Defensive Firestore timestamp handling
 * - Full CRUD: create, read, markRead, markAllRead, delete
 * - timeAgo with live-update support
 * - Typed notification factory helpers for each app event
 */

import { db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  limit,
} from 'firebase/firestore';

// ── Notification Type Definitions ───────────────────────────
export const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: {
    type: 'booking_confirmed',
    title: 'Booking Confirmed',
    icon: '✅',
    color: '#22c55e',
    priority: 'high',
  },
  TRIP_REMINDER: {
    type: 'trip_reminder',
    title: 'Trip Reminder',
    icon: '📅',
    color: '#4ce3f7',
    priority: 'medium',
  },
  PICKUP_REMINDER: {
    type: 'pickup_reminder',
    title: 'Pickup Reminder',
    icon: '🔑',
    color: '#f59e0b',
    priority: 'high',
  },
  RETURN_REMINDER: {
    type: 'return_reminder',
    title: 'Return Reminder',
    icon: '🔄',
    color: '#f59e0b',
    priority: 'high',
  },
  EXTRA_CHARGES: {
    type: 'extra_charges',
    title: 'Extra Charges Applied',
    icon: '💰',
    color: '#f97316',
    priority: 'high',
  },
  NO_SHOW_PENALTY: {
    type: 'no_show_penalty',
    title: 'No Show Penalty',
    icon: '⚠️',
    color: '#ef4444',
    priority: 'critical',
  },
  JOURNEY_COMPLETED: {
    type: 'journey_completed',
    title: 'Journey Completed',
    icon: '🏁',
    color: '#4ce3f7',
    priority: 'medium',
  },
  SOS_ALERT: {
    type: 'sos_alert',
    title: 'SOS Alert Sent',
    icon: '🚨',
    color: '#ef4444',
    priority: 'critical',
  },
  ASSISTANCE_UPDATE: {
    type: 'assistance_update',
    title: 'Assistance Update',
    icon: '🔧',
    color: '#3b82f6',
    priority: 'high',
  },
  ASSISTANCE_REQUESTED: {
    type: 'assistance_requested',
    title: 'Assistance Requested',
    icon: '🛠️',
    color: '#6366f1',
    priority: 'high',
  },
  EXTENSION_APPROVED: {
    type: 'extension_approved',
    title: 'Trip Extension Approved',
    icon: '📅',
    color: '#22c55e',
    priority: 'medium',
  },
  EXTENSION_REQUESTED: {
    type: 'extension_requested',
    title: 'Extension Request Sent',
    icon: '📋',
    color: '#a855f7',
    priority: 'medium',
  },
  WEATHER_ALERT: {
    type: 'weather_alert',
    title: 'Weather Alert',
    icon: '⛈️',
    color: '#f59e0b',
    priority: 'high',
  },
  TRIP_STARTED: {
    type: 'trip_started',
    title: 'Trip Started',
    icon: '🚗',
    color: '#22c55e',
    priority: 'medium',
  },
  GENERAL: {
    type: 'general',
    title: 'Notification',
    icon: '🔔',
    color: '#94a3b8',
    priority: 'low',
  },
};

// ── Create Notification ─────────────────────────────────────
/**
 * @param {string} userId
 * @param {keyof typeof NOTIFICATION_TYPES} notificationType
 * @param {{ title?: string, message?: string, bookingId?: string, link?: string, metadata?: object }} data
 */
export async function createNotification(userId, notificationType, data = {}) {
  try {
    const typeConfig =
      NOTIFICATION_TYPES[notificationType] || NOTIFICATION_TYPES.GENERAL;

    const notification = {
      userId,
      type: typeConfig.type,
      title: data.title || typeConfig.title,
      message: data.message || '',
      icon: typeConfig.icon,
      color: typeConfig.color,
      priority: typeConfig.priority,
      read: false,
      link: data.link || null,
      bookingId: data.bookingId || null,
      metadata: data.metadata || {},
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'notifications'), notification);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[NotificationService] createNotification failed:', error);
    return { success: false, error: error.message };
  }
}

// ── Real-Time Listener ──────────────────────────────────────
/**
 * Subscribes to live notification updates for a user.
 * Returns an unsubscribe function — call it on component unmount.
 *
 * @param {string} userId
 * @param {(notifications: object[]) => void} onUpdate
 * @param {number} maxResults
 * @returns {() => void} unsubscribe
 */
export function subscribeToNotifications(userId, onUpdate, maxResults = 30) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      onUpdate(notifications);
    },
    (error) => {
      console.error('[NotificationService] onSnapshot error:', error);
      // Don't crash — let the component handle empty state
      onUpdate([]);
    }
  );

  return unsubscribe;
}

// ── Mark Single Notification as Read ───────────────────────
export async function markAsRead(notificationId) {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    return { success: true };
  } catch (error) {
    console.error('[NotificationService] markAsRead failed:', error);
    return { success: false };
  }
}

// ── Mark All as Read (atomic batch) ────────────────────────
export async function markAllAsRead(userId) {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    // We can't use getDocs inside a batch directly, so snapshot first
    const { getDocs } = await import('firebase/firestore');
    const snapshot = await getDocs(q);

    if (snapshot.empty) return { success: true, count: 0 };

    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();

    return { success: true, count: snapshot.size };
  } catch (error) {
    console.error('[NotificationService] markAllAsRead failed:', error);
    return { success: false };
  }
}

// ── Delete Single Notification ──────────────────────────────
export async function deleteNotification(notificationId) {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
    return { success: true };
  } catch (error) {
    console.error('[NotificationService] deleteNotification failed:', error);
    return { success: false };
  }
}

// ── Time Ago Formatter ──────────────────────────────────────
/**
 * Accepts Firestore Timestamp, JS Date, ISO string, or epoch number.
 */
export function timeAgo(date) {
  if (!date) return '';

  let past;
  if (date?.toDate) {
    // Firestore Timestamp
    past = date.toDate();
  } else if (date instanceof Date) {
    past = date;
  } else {
    past = new Date(date);
  }

  if (isNaN(past.getTime())) return '';

  const seconds = Math.floor((Date.now() - past.getTime()) / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return past.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Demo Notifications (sessionStorage persistent) ──────────
const DEMO_STORAGE_KEY = 'qw_demo_notifications';

export function getDemoNotifications() {
  // Return persisted state if it exists (survives panel re-opens in same session)
  try {
    const stored = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {}

  const now = Date.now();
  const demos = [
    {
      id: 'demo-1',
      type: 'sos_alert',
      title: 'SOS Alert Sent',
      message: 'Your SOS alert was dispatched. Emergency contacts have been notified.',
      icon: '🚨',
      color: '#ef4444',
      priority: 'critical',
      read: false,
      createdAt: new Date(now - 4 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-2',
      type: 'booking_confirmed',
      title: 'Booking Confirmed',
      message: 'Toyota Fortuner booking #QW-DEMO-123456 confirmed by the dealer.',
      icon: '✅',
      color: '#22c55e',
      priority: 'high',
      read: false,
      createdAt: new Date(now - 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-3',
      type: 'weather_alert',
      title: 'Weather Alert',
      message: 'Heavy rain expected near Lonavala. Drive carefully on NH-48.',
      icon: '⛈️',
      color: '#f59e0b',
      priority: 'high',
      read: false,
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-4',
      type: 'trip_reminder',
      title: 'Trip Reminder',
      message: 'Your Mumbai → Pune trip is ongoing. Return by tomorrow 10:00 AM.',
      icon: '📅',
      color: '#4ce3f7',
      priority: 'medium',
      read: true,
      createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-5',
      type: 'assistance_update',
      title: 'Assistance Update',
      message: 'Roadside technician is 12 min away. Track on map.',
      icon: '🔧',
      color: '#3b82f6',
      priority: 'high',
      read: true,
      createdAt: new Date(now - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'demo-6',
      type: 'pickup_reminder',
      title: 'Pickup Reminder',
      message: 'Please arrive at the pickup location at least 10 min early.',
      icon: '🔑',
      color: '#f59e0b',
      priority: 'high',
      read: true,
      createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  saveDemoNotifications(demos);
  return demos;
}

export function saveDemoNotifications(notifications) {
  try {
    sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(notifications));
  } catch (_) {}
}

export function clearDemoNotifications() {
  try {
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
  } catch (_) {}
}

// ── App-Level Notification Helpers ─────────────────────────
// Call these from other parts of the app to fire notifications

export const notify = {
  sosAlert: (userId, bookingId) =>
    createNotification(userId, 'SOS_ALERT', {
      message: 'Your SOS alert has been sent. Emergency contacts notified.',
      bookingId,
    }),

  assistanceRequested: (userId, bookingId, serviceType) =>
    createNotification(userId, 'ASSISTANCE_REQUESTED', {
      message: `${serviceType} assistance has been requested. A technician will contact you shortly.`,
      bookingId,
    }),

  assistanceUpdate: (userId, bookingId, message) =>
    createNotification(userId, 'ASSISTANCE_UPDATE', { message, bookingId }),

  tripStarted: (userId, bookingId, carModel) =>
    createNotification(userId, 'TRIP_STARTED', {
      message: `Your ${carModel} trip has begun. Have a safe journey!`,
      bookingId,
    }),

  extensionRequested: (userId, bookingId, days) =>
    createNotification(userId, 'EXTENSION_REQUESTED', {
      message: `Trip extension request for ${days} day(s) has been submitted.`,
      bookingId,
    }),

  extensionApproved: (userId, bookingId, days) =>
    createNotification(userId, 'EXTENSION_APPROVED', {
      message: `Your trip has been extended by ${days} day(s). Updated return date confirmed.`,
      bookingId,
    }),

  weatherAlert: (userId, location, condition) =>
    createNotification(userId, 'WEATHER_ALERT', {
      message: `${condition} near ${location}. Please drive carefully.`,
    }),

  returnReminder: (userId, bookingId, hoursLeft) =>
    createNotification(userId, 'RETURN_REMINDER', {
      message: `Your vehicle is due for return in ${hoursLeft} hour(s). Plan accordingly.`,
      bookingId,
    }),

  bookingConfirmed: (userId, bookingId, carModel) =>
    createNotification(userId, 'BOOKING_CONFIRMED', {
      message: `${carModel} booking #${bookingId} confirmed. Check your email for details.`,
      bookingId,
    }),
};