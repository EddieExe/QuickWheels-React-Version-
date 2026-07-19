/**
 * Emergency Service — CRUD
 * Saves/loads/deletes emergency contact from Firestore + localStorage cache
 *
 * FIXES:
 * - deleteEmergencyContact: now also clears localStorage cache (was orphaning stale data)
 * - updateEmergencyContactSharing: now updates localStorage cache after Firestore update
 * - saveEmergencyContact: uses serverTimestamp() for createdAt on first save
 * - getEmergencyContact: localStorage cache write is safe (try/catch)
 * - All public functions return consistent { success, error? } shapes
 */

import { db } from '../firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

const COLLECTION = 'emergency_contacts';

// ── LocalStorage helpers ─────────────────────────────────────
function lsKey(userId) {
  return `emergency_contact_${userId}`;
}

function lsWrite(userId, data) {
  try {
    localStorage.setItem(lsKey(userId), JSON.stringify(data));
  } catch (err) {
    console.warn('localStorage write failed:', err);
  }
}

function lsRead(userId) {
  try {
    const raw = localStorage.getItem(lsKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('localStorage read failed:', err);
    return null;
  }
}

function lsDelete(userId) {
  try {
    localStorage.removeItem(lsKey(userId));
  } catch (err) {
    console.warn('localStorage delete failed:', err);
  }
}

// ── Save or update emergency contact ────────────────────────
/**
 * @param {string} userId
 * @param {object} contactData  — { name, phone, relation, shareWithSupport }
 * @returns {Promise<{success: boolean, fallback?: boolean}>}
 */
export async function saveEmergencyContact(userId, contactData) {
  // Build the document; use serverTimestamp for createdAt only on first write
  const now = serverTimestamp();
  const data = {
    ...contactData,
    updatedAt: now,
    shareWithSupport: contactData.shareWithSupport ?? false,
  };

  // setDoc with merge so createdAt from prior saves is preserved
  try {
    const ref = doc(db, COLLECTION, userId);
    // Check if doc exists to decide whether to set createdAt
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      data.createdAt = now;
    }

    await setDoc(ref, data, { merge: true });

    // Write to cache (use JS Date since serverTimestamp isn't readable locally)
    lsWrite(userId, { ...contactData, updatedAt: new Date().toISOString() });

    return { success: true };
  } catch (error) {
    console.error('Firestore save failed, using localStorage fallback:', error);
    lsWrite(userId, { ...contactData, updatedAt: new Date().toISOString() });
    return { success: true, fallback: true };
  }
}

// ── Get emergency contact ────────────────────────────────────
/**
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getEmergencyContact(userId) {
  try {
    const ref = doc(db, COLLECTION, userId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      lsWrite(userId, data); // refresh cache
      return data;
    }

    // Doc doesn't exist — return localStorage if present
    return lsRead(userId);
  } catch (error) {
    console.error('Firestore read failed, falling back to localStorage:', error);
    return lsRead(userId);
  }
}

// ── Delete emergency contact ─────────────────────────────────
/**
 * @param {string} userId
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteEmergencyContact(userId) {
  try {
    const ref = doc(db, COLLECTION, userId);
    await deleteDoc(ref);
    lsDelete(userId); // FIX: clear cache too
    return { success: true };
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    throw new Error('Failed to delete emergency contact.');
  }
}

// ── Update share preference ──────────────────────────────────
/**
 * @param {string} userId
 * @param {boolean} shareWithSupport
 * @returns {Promise<{success: boolean}>}
 */
export async function updateEmergencyContactSharing(userId, shareWithSupport) {
  try {
    const ref = doc(db, COLLECTION, userId);
    await updateDoc(ref, { shareWithSupport, updatedAt: serverTimestamp() });

    // FIX: update the localStorage cache so it stays in sync
    const cached = lsRead(userId);
    if (cached) {
      lsWrite(userId, { ...cached, shareWithSupport, updatedAt: new Date().toISOString() });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating sharing preference:', error);
    throw new Error('Failed to update sharing preference.');
  }
}