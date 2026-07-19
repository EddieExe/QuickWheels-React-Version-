/**
 * bookingStatus.js — Production Grade
 *
 * Fixes:
 * - transitionBookingStatus uses Firestore runTransaction for atomicity
 *   (prevents race conditions between scheduler + dealer app)
 * - confirmPickup no longer double-sets pickupConfirmed (switch-case handles it)
 * - applyLateReturnFee is a dedicated function (no longer a phantom status change)
 * - applyExtension updates dropoffDate so status lifecycle stays accurate
 * - All exported functions return consistent { success, error?, ...data } shape
 */

import { db } from '../firebase';
import {
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  BOOKING_STATUS,
  STATUS_META,
  VALID_TRANSITIONS,
  isTerminalStatus,
  parseBookingDate,
} from './statusTransitions';

// ── Core Transition (atomic) ────────────────────────────────
/**
 * Atomically read-validate-write a status transition.
 *
 * @param {string} bookingId
 * @param {string} newStatus
 * @param {{
 *   reason?: string,
 *   confirmedBy?: 'user'|'dealer'|'admin'|'system',
 *   additionalData?: object,
 * }} options
 */
export async function transitionBookingStatus(bookingId, newStatus, options = {}) {
  const { reason = '', confirmedBy = 'system', additionalData = {} } = options;

  try {
    const bookingRef = doc(db, 'bookings', bookingId);

    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(bookingRef);

      if (!snap.exists()) throw new Error('Booking not found');

      const booking = snap.data();
      const currentStatus = booking.status;

      // Guard: already terminal
      if (isTerminalStatus(currentStatus)) {
        throw new Error(`Booking is in terminal state: ${currentStatus}`);
      }

      // Guard: valid transition
      const allowed = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Invalid transition: "${currentStatus}" → "${newStatus}"`
        );
      }

      // Build update payload
      const now = new Date();
      const update = {
        status: newStatus,
        previousStatus: currentStatus,
        statusUpdatedAt: serverTimestamp(),
        statusUpdatedBy: confirmedBy,
        statusTransitionReason: reason,
        ...additionalData,
      };

      // Status-specific fields
      switch (newStatus) {
        case BOOKING_STATUS.CONFIRMED:
          update.confirmedAt = now;
          break;

        case BOOKING_STATUS.UPCOMING_TRIP:
          update.upcomingNotifiedAt = now;
          break;

        case BOOKING_STATUS.PICKUP_AWAITED:
          update.pickupAwaitedAt = now;
          break;

        case BOOKING_STATUS.ONGOING_TRIP:
          update.pickupConfirmed = true;
          update.pickupConfirmedAt = now;
          break;

        case BOOKING_STATUS.RETURN_PENDING:
          update.returnPendingAt = now;
          break;

        case BOOKING_STATUS.JOURNEY_COMPLETED:
          update.dropoffConfirmed = true;
          update.dropoffConfirmedAt = now;
          update.completedAt = now;
          break;

        case BOOKING_STATUS.NO_SHOW:
          update.noShowAt = now;
          update.penaltyApplied = true;
          update.penaltyAmount = Math.round((booking.total || 0) * 0.5);
          update.penaltyPercent = 50;
          break;

        case BOOKING_STATUS.CANCELLED:
          update.cancelledAt = now;
          update.cancelledBy = confirmedBy;
          if (reason) update.cancelReason = reason;
          break;

        case BOOKING_STATUS.ON_HOLD:
          update.onHoldAt = now;
          update.onHoldReason = reason;
          break;
      }

      tx.update(bookingRef, update);

      return {
        previousStatus: currentStatus,
        newStatus,
        bookingId,
        update,
      };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('[bookingStatus] transitionBookingStatus failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ── Confirm Pickup ──────────────────────────────────────────
/**
 * Dealer confirms the customer has picked up the car.
 */
export async function confirmPickup(bookingId, dealerId) {
  return transitionBookingStatus(bookingId, BOOKING_STATUS.ONGOING_TRIP, {
    reason: 'Pickup confirmed by dealer',
    confirmedBy: 'dealer',
    additionalData: {
      pickupConfirmedByDealer: dealerId,
    },
  });
}

// ── Confirm Dropoff ─────────────────────────────────────────
/**
 * Dealer confirms the car has been returned.
 * Pass extraCharges > 0 if late return fees apply.
 */
export async function confirmDropoff(bookingId, dealerId, extraCharges = 0) {
  const additionalData = {
    dropoffConfirmedByDealer: dealerId,
  };

  if (extraCharges > 0) {
    additionalData.lateReturnFee = extraCharges;
    additionalData.lateReturnApplied = true;
  }

  return transitionBookingStatus(bookingId, BOOKING_STATUS.JOURNEY_COMPLETED, {
    reason: `Dropoff confirmed by dealer${extraCharges > 0 ? ' — late return fee applied' : ''}`,
    confirmedBy: 'dealer',
    additionalData,
  });
}

// ── Mark No-Show ────────────────────────────────────────────
export async function markAsNoShow(bookingId, confirmedBy = 'system') {
  return transitionBookingStatus(bookingId, BOOKING_STATUS.NO_SHOW, {
    reason: 'Customer did not appear within the pickup window',
    confirmedBy,
  });
}

// ── Cancel Booking ──────────────────────────────────────────
export async function cancelBooking(bookingId, cancelledBy, reason) {
  return transitionBookingStatus(bookingId, BOOKING_STATUS.CANCELLED, {
    reason: reason || 'Booking cancelled',
    confirmedBy: cancelledBy,
  });
}

// ── Apply Late Return Fee (side-effect, no status change) ───
/**
 * Called by the scheduler when a RETURN_PENDING booking goes past
 * 2 hours over its dropoff time WITHOUT the status changing.
 * Writes lateReturnNotified = true so the scheduler fires this once only.
 */
export async function applyLateReturnFee(bookingId, feePerHour = 200) {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);

    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists()) throw new Error('Booking not found');

      const booking = snap.data();
      if (booking.lateReturnNotified) {
        // Already applied — idempotency guard
        return { alreadyApplied: true };
      }

      const dropoff = parseBookingDate(booking.dropoffDate);
      if (!dropoff) throw new Error('No dropoff date on booking');

      const hoursLate = Math.max(
        1,
        Math.round((Date.now() - dropoff.getTime()) / 3600000)
      );
      const fee = hoursLate * feePerHour;

      tx.update(bookingRef, {
        lateReturnNotified: true,
        lateReturnAt: serverTimestamp(),
        lateReturnHours: hoursLate,
        lateReturnFee: fee,
      });

      return { hoursLate, fee };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('[bookingStatus] applyLateReturnFee failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ── Apply Trip Extension ────────────────────────────────────
/**
 * Extends the dropoff date so the status lifecycle (return reminder,
 * late fee timer) stays accurate after an extension is approved.
 *
 * @param {string} bookingId
 * @param {number} additionalDays
 * @param {number} additionalCost
 */
export async function applyExtension(bookingId, additionalDays, additionalCost = 0) {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);

    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(bookingRef);
      if (!snap.exists()) throw new Error('Booking not found');

      const booking = snap.data();
      const currentDropoff = parseBookingDate(booking.dropoffDate);
      if (!currentDropoff) throw new Error('No dropoff date on booking');

      const newDropoff = new Date(
        currentDropoff.getTime() + additionalDays * 24 * 60 * 60 * 1000
      );

      tx.update(bookingRef, {
        dropoffDate: newDropoff.toISOString().split('T')[0],
        originalDropoffDate: booking.originalDropoffDate || booking.dropoffDate,
        extensionDays: (booking.extensionDays || 0) + additionalDays,
        extensionCost: (booking.extensionCost || 0) + additionalCost,
        extensionApprovedAt: serverTimestamp(),
        // Reset late-return flag so timer restarts from new date
        lateReturnNotified: false,
        lateReturnFee: null,
      });

      return {
        previousDropoff: currentDropoff.toISOString().split('T')[0],
        newDropoff: newDropoff.toISOString().split('T')[0],
        additionalDays,
        additionalCost,
      };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('[bookingStatus] applyExtension failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ── Get Status Display ──────────────────────────────────────
export function getStatusDisplay(status) {
  return (
    STATUS_META[status] || {
      label: status?.replace(/_/g, ' ') || 'Unknown',
      icon: '❓',
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.1)',
      border: 'rgba(148,163,184,0.25)',
      description: '',
      phase: 'unknown',
      canAccessDashboard: false,
    }
  );
}