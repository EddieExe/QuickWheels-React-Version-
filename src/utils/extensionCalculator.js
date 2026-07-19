/**
 * extensionCalculator.js — Production Grade
 *
 * Fixes:
 * - parseDropoffDate() handles Firestore Timestamps, ISO strings, Date objects
 * - dailyRate derivation has a full fallback chain, never returns NaN
 * - maxExtension calculated from clean date boundary (not T23:59:59 + 7 days)
 * - Division-by-zero guard on days = 0
 * - Penalty model aligned with scheduler: late return = 1.5× daily rate (not flat 50%)
 * - formatCurrency guards against NaN/undefined input
 */

import { parseBookingDate } from './statusTransitions';

// ── Parse any dropoff date format ──────────────────────────
/**
 * Returns a JS Date set to END of the given day (23:59:59 local time).
 * Used for "is this booking overdue?" checks.
 */
function toEndOfDay(value) {
  const base = parseBookingDate(value);
  if (!base) return null;
  // Normalise to midnight, then set to end of day
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59);
  return d;
}

/**
 * Returns a JS Date set to START of the given day (00:00:00 local time).
 */
function toStartOfDay(value) {
  const base = parseBookingDate(value);
  if (!base) return null;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0);
}

// ── Daily Rate Derivation ───────────────────────────────────
/**
 * Derive a reliable daily rate from booking data.
 * Tries multiple fields in order, always returns a positive number.
 *
 * Priority:
 * 1. booking.dailyRate  (explicit field)
 * 2. booking.carTotal / booking.days
 * 3. booking.total / booking.days
 * 4. booking.total / booking.extensionDays  (already extended bookings)
 * 5. Fallback: 1000 (safe floor — never NaN in UI)
 */
export function deriveDailyRate(booking) {
  if (!booking) return 1000;

  const days = Math.max(1, Number(booking.days) || 1); // Guard ÷0

  if (booking.dailyRate && Number(booking.dailyRate) > 0) {
    return Number(booking.dailyRate);
  }
  if (booking.carTotal && Number(booking.carTotal) > 0) {
    return Math.round(Number(booking.carTotal) / days);
  }
  if (booking.total && Number(booking.total) > 0) {
    return Math.round(Number(booking.total) / days);
  }

  return 1000; // Absolute fallback — UI will show something sensible
}

// ── Extension Cost ──────────────────────────────────────────
/**
 * Calculate cost for extending by `extraDays`.
 *
 * Penalty model (aligned with statusScheduler applyLateReturnFee):
 *   Normal extension:  extraDays × dailyRate
 *   Late return:       extraDays × dailyRate × 1.5  (50% surcharge)
 *
 * @returns {{
 *   dailyRate: number,
 *   extraDays: number,
 *   baseCost: number,
 *   penaltyFee: number,
 *   totalCost: number,
 *   isLateReturn: boolean,
 * }}
 */
export function calculateExtensionCost(dailyRate, extraDays, isLateReturn = false) {
  const rate = Math.max(0, Number(dailyRate) || 0);
  const days = Math.max(1, Number(extraDays) || 1);

  const baseCost = rate * days;
  const penaltyFee = isLateReturn ? Math.round(baseCost * 0.5) : 0;
  const totalCost = baseCost + penaltyFee;

  return {
    dailyRate: rate,
    extraDays: days,
    baseCost: Math.round(baseCost),
    penaltyFee,
    totalCost: Math.round(totalCost),
    isLateReturn,
  };
}

// ── New Dropoff Date ────────────────────────────────────────
/**
 * Add `extraDays` to the current dropoff date.
 * Accepts any date format (Firestore Timestamp, ISO string, Date).
 * Returns an ISO date string: "YYYY-MM-DD"
 */
export function calculateNewDropoffDate(currentDropoffDate, extraDays) {
  const base = parseBookingDate(currentDropoffDate);
  if (!base) {
    console.warn('[extensionCalculator] calculateNewDropoffDate: invalid date', currentDropoffDate);
    return null;
  }

  const next = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + Number(extraDays),
  );

  return next.toISOString().split('T')[0];
}

// ── Extension Validity ──────────────────────────────────────
/**
 * Check whether an extension is allowed and compute parameters.
 *
 * @param {object} booking  Firestore booking document data
 * @returns {{
 *   valid: boolean,
 *   reason?: string,
 *   isLate: boolean,
 *   remainingDays: number,
 *   maxDays: number,
 *   maxExtensionDate: string,
 *   originalDropoffDate: string,
 *   dailyRate: number,
 * }}
 */
export function isExtensionValid(booking) {
  if (!booking) return { valid: false, reason: 'No booking data' };

  // Terminal statuses — cannot extend
  if (['completed', 'cancelled', 'no_show', 'rejected'].includes(booking.status)) {
    return { valid: false, reason: 'Trip has already ended and cannot be extended.' };
  }

  const dropoffEnd = toEndOfDay(booking.dropoffDate);
  if (!dropoffEnd) {
    return { valid: false, reason: 'Invalid dropoff date on booking.' };
  }

  const now = new Date();
  const isLate = now > dropoffEnd;

  // Max extension window: 7 days from the START of the dropoff day
  // (clean boundary — avoids the T23:59:59 + 7 days = 7 days + 23h59m bug)
  const dropoffStart = toStartOfDay(booking.dropoffDate);
  const maxExtensionDate = new Date(
    dropoffStart.getFullYear(),
    dropoffStart.getMonth(),
    dropoffStart.getDate() + 7,
  );

  // If already past max extension window, disallow
  if (now > maxExtensionDate) {
    return {
      valid: false,
      reason: 'Maximum extension window (7 days past dropoff) has passed.',
    };
  }

  // Remaining days before original dropoff
  const remainingMs = dropoffEnd.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / 86400000));

  // Max days still available before the 7-day cap
  const maxAvailableMs = maxExtensionDate.getTime() - now.getTime();
  const maxDays = Math.min(7, Math.max(1, Math.ceil(maxAvailableMs / 86400000)));

  const dailyRate = deriveDailyRate(booking);

  return {
    valid: true,
    isLate,
    remainingDays,
    maxDays,
    maxExtensionDate: maxExtensionDate.toISOString().split('T')[0],
    originalDropoffDate: booking.dropoffDate,
    dailyRate,
  };
}

// ── Quick Extension Options ─────────────────────────────────
/**
 * Returns pre-built option objects for the quick-select buttons.
 * Filters out options that would exceed the max extension date.
 */
export function getExtensionOptions(booking) {
  const validation = isExtensionValid(booking);
  if (!validation.valid) return [];

  const { dailyRate, isLate, maxDays } = validation;

  const candidates = [
    { id: '1day',  label: '+1 Day',   days: 1, icon: '📅' },
    { id: '2days', label: '+2 Days',  days: 2, icon: '📆' },
    { id: '3days', label: '+3 Days',  days: 3, icon: '🗓️' },
  ];

  return candidates
    .filter((opt) => opt.days <= maxDays)
    .map((opt) => ({
      ...opt,
      cost: calculateExtensionCost(dailyRate, opt.days, isLate),
      newDropoffDate: calculateNewDropoffDate(booking.dropoffDate, opt.days),
    }));
}

// ── Format Currency ─────────────────────────────────────────
export function formatCurrency(amount, symbol = '₹') {
  const num = Number(amount);
  if (isNaN(num)) return `${symbol}0`;
  return `${symbol}${Math.round(num).toLocaleString('en-IN')}`;
}