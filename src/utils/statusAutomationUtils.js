// src/utils/statusAutomationUtils.js
import {
  BOOKING_STATUS,
  parseBookingDate,
  minutesUntilNextTransition,
} from "./statusTransitions";

const ACTIVE_STATUSES = [
  BOOKING_STATUS.PENDING_APPROVAL,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.UPCOMING_TRIP,
  BOOKING_STATUS.PICKUP_AWAITED,
  BOOKING_STATUS.ONGOING_TRIP,
  BOOKING_STATUS.RETURN_PENDING,
];

/**
 * A8.2 — No-Show Risks
 * Bookings stuck in PICKUP_AWAITED past their pickup time, not yet
 * pickup-confirmed. The auto-transition rule fires no-show at 2h past
 * pickup — this surfaces both "approaching" (0-2h) and "overdue" (2h+,
 * waiting for next sweep) cases.
 */
export function getNoShowRisks(bookings) {
  return bookings
    .filter((b) => b.status === BOOKING_STATUS.PICKUP_AWAITED && !b.pickupConfirmed)
    .map((b) => {
      const pickup = parseBookingDate(b.pickupDate);
      if (!pickup) return null;
      const minutesPast = Math.round((Date.now() - pickup.getTime()) / 60000);
      if (minutesPast <= 0) return null; // pickup hasn't happened yet
      return {
        booking: b,
        minutesPast,
        isOverdue: minutesPast >= 120,
        minutesUntilAutoNoShow: Math.max(0, 120 - minutesPast),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.minutesPast - a.minutesPast);
}

/**
 * A8.3 — Late Return Risks
 * Bookings stuck in RETURN_PENDING past their dropoff time, not yet
 * dropoff-confirmed. Late fee rule fires once at 2h past dropoff.
 */
export function getLateReturnRisks(bookings) {
  return bookings
    .filter((b) => b.status === BOOKING_STATUS.RETURN_PENDING && !b.dropoffConfirmed)
    .map((b) => {
      const dropoff = parseBookingDate(b.dropoffDate);
      if (!dropoff) return null;
      const minutesPast = Math.round((Date.now() - dropoff.getTime()) / 60000);
      if (minutesPast <= 0) return null;
      return {
        booking: b,
        minutesPast,
        isOverdue: minutesPast >= 120,
        feeApplied: !!b.lateReturnNotified,
        minutesUntilFee: Math.max(0, 120 - minutesPast),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.minutesPast - a.minutesPast);
}

/**
 * A9.3 — Upcoming Transitions
 * Active bookings whose next scheduled status change is within
 * `withinMinutes`, sorted soonest-first. Useful for a "what's about
 * to happen" view.
 */
export function getUpcomingTransitions(bookings, withinMinutes = 60) {
  return bookings
    .filter((b) => ACTIVE_STATUSES.includes(b.status))
    .map((b) => ({ booking: b, minutes: minutesUntilNextTransition(b) }))
    .filter((x) => x.minutes !== null && x.minutes <= withinMinutes)
    .sort((a, b) => a.minutes - b.minutes);
}

export function formatMinutes(min) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}