/**
 * statusScheduler.js — Production Grade
 *
 * Fixes:
 * - Rules array (ordered) replaces object — explicit priority, no Object.keys() ordering risk
 * - Late return side-effect handled by applyLateReturnFee(), not a phantom status change
 * - Deduplication: processingSet prevents concurrent runs per booking
 * - Smart interval: computes minutesUntilNextTransition and schedules tighter checks
 *   when a transition is imminent (minimum 1 min, max 15 min)
 * - Notifications fired per rule's notifyUser + sideEffect flags
 * - Full notification type mapping per rule key
 *
 * NOTE: This client-side scheduler covers the active-tab case.
 * For production reliability (app closed, background), also deploy
 * a Firebase Cloud Function scheduled trigger (Pub/Sub, every 15 min)
 * that runs the same rule logic server-side.
 */

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  AUTO_TRANSITION_RULES,
  BOOKING_STATUS,
  minutesUntilNextTransition,
} from "../utils/statusTransitions";
import {
  transitionBookingStatus,
  applyLateReturnFee,
} from "../utils/bookingStatus";
import { notify } from "../utils/notificationService";
import { sendAutoConfirmEmail } from "../utils/emailService";
import { logSystemEvent } from "../utils/systemLogger";

// ── State ────────────────────────────────────────────────────
const schedulerTimers = new Map(); // userId → timeoutId
const processingSet = new Set(); // bookingId → currently being processed

// Active statuses worth watching
const WATCHABLE_STATUSES = [
  BOOKING_STATUS.PENDING_APPROVAL,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.UPCOMING_TRIP,
  BOOKING_STATUS.PICKUP_AWAITED,
  BOOKING_STATUS.ONGOING_TRIP,
  BOOKING_STATUS.RETURN_PENDING,
];

// ── Notification dispatcher ──────────────────────────────────
const RULE_NOTIFICATION = {
  pickupAwaitedToNoShow: (userId, b) => notify.sosAlert(userId, b.id), // reuse SOS shape
  returnPendingToCompleted: (userId, b) =>
    notify.returnReminder(userId, b.id, 0),
  ongoingToReturnPending: (userId, b) =>
    notify.returnReminder(userId, b.id, 24),
  upcomingToPickupAwaited: (userId, b) =>
    notify.bookingConfirmed(userId, b.bookingId, b.carModel || "your car"),
  confirmedToUpcoming: (userId, b) =>
    notify.bookingConfirmed(userId, b.bookingId, b.carModel || "your car"),
  pendingToConfirmed: (userId, b) =>
    notify.bookingConfirmed(userId, b.bookingId, b.carModel || "your car"),
  returnPendingLateReturn: (userId, b) =>
    notify.returnReminder(userId, b.id, -1), // -1 signals overdue
};

async function fireNotification(ruleKey, userId, booking) {
  try {
    const fn = RULE_NOTIFICATION[ruleKey];
    if (fn) await fn(userId, booking);
  } catch (err) {
    console.warn("[Scheduler] Notification dispatch failed:", err.message);
  }
}

// ── Process a single booking ─────────────────────────────────
async function processBooking(booking, userId) {
  if (processingSet.has(booking.id)) return; // Concurrent run guard
  processingSet.add(booking.id);

  try {
    for (const rule of AUTO_TRANSITION_RULES) {
      let conditionMet = false;

      try {
        conditionMet = rule.condition(booking);
      } catch (condErr) {
        console.warn(`[Scheduler] Rule "${rule.key}" condition error:`, condErr.message);
        await logSystemEvent("warn", `Rule "${rule.key}" condition error on booking ${booking.id}`, {
          bookingId: booking.id, rule: rule.key, error: condErr.message,
        });
        continue;
      }

      if (!conditionMet) continue;

      // ── Side-effect-only rule (no status change) ──────────
      if (rule.newStatus === null) {
        if (rule.sideEffect === "lateReturnFee") {
          const feeResult = await applyLateReturnFee(booking.id);
          if (feeResult.success && !feeResult.alreadyApplied) {
            console.log(`[Scheduler] Late fee applied to ${booking.id}:`, feeResult);
            await logSystemEvent("info", `Late return fee applied to booking ${booking.bookingId || booking.id}`, {
              bookingId: booking.id, rule: rule.key, ...feeResult,
            });
            if (rule.notifyUser) {
              await fireNotification(rule.key, userId, booking);
            }
          }
        }
        break; // One rule per booking per run
      }

      // ── Status transition ─────────────────────────────────
      console.log(
        `[Scheduler] ${booking.id}: ${booking.status} → ${rule.newStatus} (${rule.key})`,
      );

      const res = await transitionBookingStatus(booking.id, rule.newStatus, {
        reason: rule.reason,
        confirmedBy: "system",
      });

      if (res.success) {
        console.log(`[Scheduler] Transition applied:`, res);
        await logSystemEvent("info", `${booking.bookingId || booking.id}: ${booking.status} → ${rule.newStatus}`, {
          bookingId: booking.id, rule: rule.key, from: booking.status, to: rule.newStatus, reason: rule.reason,
        });

        if (rule.notifyUser) {
          await fireNotification(rule.key, userId, booking);
        }

        // Send auto-confirm email when dealer deadline expires
        if (rule.key === "pendingToConfirmed" && booking.userEmail) {
          try {
            await sendAutoConfirmEmail({
              name: booking.userName || booking.userEmail,
              email: booking.userEmail,
              carModel: booking.carModel,
              pickup: booking.pickup,
              dropoff: booking.dropoff,
              days: booking.days,
              tripType: booking.tripType || "One Way",
              carTotal: booking.carTotal || booking.total,
              addonsTotal: booking.addonsTotal || 0,
              total: booking.total,
              bookingId: booking.bookingId,
              addons: booking.addons || [],
              currency: booking.currency || "USD",
              currencySymbol: booking.currencySymbol || "$",
            });
            console.log(
              `[Scheduler] Auto-confirm email sent for ${booking.id}`,
            );
          } catch (emailErr) {
            console.warn(
              `[Scheduler] Auto-confirm email failed:`,
              emailErr.message,
            );
          }
        }

        // No-show penalty notification
        if (rule.sideEffect === "noShowPenalty" && userId) {
          try {
            await notify.returnReminder(userId, booking.id, 0);
          } catch (_) {}
        }
      } else {
        console.warn(
          `[Scheduler] Transition failed for ${booking.id}:`,
          res.error,
        );
        await logSystemEvent("error", `Transition failed for ${booking.bookingId || booking.id} (${rule.key})`, {
          bookingId: booking.id, rule: rule.key, error: res.error,
        });
      }

      break; // One rule per booking per run
    }
  } finally {
    processingSet.delete(booking.id);
  }
}

// ── Run scheduler for a user ─────────────────────────────────
async function runSchedulerForUser(userId) {
  try {
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", userId),
      where("status", "in", WATCHABLE_STATUSES),
    );

    const snap = await getDocs(q);
    if (snap.empty) return { nextCheckMs: 15 * 60 * 1000 };

    const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Process all active bookings concurrently (each is independently guarded)
    await Promise.allSettled(bookings.map((b) => processBooking(b, userId)));

    // Compute smart next-check interval
    const minutes = bookings
      .map((b) => minutesUntilNextTransition(b))
      .filter((m) => m !== null && m >= 0);

    const minMinutes = minutes.length > 0 ? Math.min(...minutes) : 15;

    // Check slightly before the event (30s early), clamp 1–15 min
    const nextCheckMs = Math.min(
      Math.max((minMinutes - 0.5) * 60 * 1000, 60 * 1000), // 1 min minimum
      15 * 60 * 1000,
    );

    return { nextCheckMs };
  } catch (err) {
    console.error("[Scheduler] runSchedulerForUser error:", err);
    return { nextCheckMs: 5 * 60 * 1000 }; // Retry in 5 min on error
  }
}

// ── Recursive smart scheduler ────────────────────────────────
async function scheduleNextRun(userId) {
  const { nextCheckMs } = await runSchedulerForUser(userId);

  // If scheduler was stopped while we were running, don't reschedule
  if (!schedulerTimers.has(userId)) return;

  const timerId = setTimeout(() => scheduleNextRun(userId), nextCheckMs);
  schedulerTimers.set(userId, timerId);

  console.log(
    `[Scheduler] Next check in ${Math.round(nextCheckMs / 60000)} min`,
  );
}

// ── Public API ───────────────────────────────────────────────
/**
 * Start the status scheduler for a logged-in user.
 * Returns a cleanup function — call it on logout or unmount.
 *
 * @param {string} userId
 * @returns {() => void} stop scheduler
 */
export function startStatusScheduler(userId) {
  if (!userId) return () => {};

  // Already running for this user
  if (schedulerTimers.has(userId)) {
    return () => stopStatusScheduler(userId);
  }

  console.log("[Scheduler] Starting for user:", userId);

  // Placeholder so hasKey check works before first async run completes
  schedulerTimers.set(userId, null);

  // Run immediately, then set up recursive scheduling
  scheduleNextRun(userId);

  return () => stopStatusScheduler(userId);
}

/**
 * Stop the scheduler for a user (logout, tab close, unmount).
 */
export function stopStatusScheduler(userId) {
  const timerId = schedulerTimers.get(userId);
  if (timerId) clearTimeout(timerId);
  schedulerTimers.delete(userId);
  console.log("[Scheduler] Stopped for user:", userId);
}

/**
 * Force an immediate run outside the normal schedule.
 * Useful after a user action (extension approved, manual status change).
 */
export async function triggerImmediateCheck(userId) {
  if (!userId) return;
  console.log("[Scheduler] Immediate check triggered for:", userId);
  await runSchedulerForUser(userId);
}

/**
 * Admin-side global sweep — processes ALL active bookings across ALL users,
 * not just one logged-in user's. Intended to be triggered manually (button)
 * or on an interval while an admin has the dashboard open, as a stopgap
 * until a Firebase Cloud Function scheduled trigger is deployed.
 */
export async function runGlobalStatusSweep() {
  try {
    const q = query(
      collection(db, "bookings"),
      where("status", "in", WATCHABLE_STATUSES),
    );

    const snap = await getDocs(q);
    if (snap.empty) return { processed: 0, total: 0 };

    const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    await Promise.allSettled(
      bookings.map((b) => processBooking(b, b.userId)),
    );

    await logSystemEvent("info", `Global automation sweep completed: ${bookings.length} booking(s) checked`, {
      total: bookings.length,
    });

    return { processed: bookings.length, total: bookings.length, ranAt: new Date() };
  } catch (err) {
    console.error("[Scheduler] runGlobalStatusSweep error:", err);
    return { processed: 0, total: 0, error: err.message };
  }
}