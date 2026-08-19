/**
 * statusTransitions.js — Production Grade
 *
 * Fixes:
 * - parseBookingDate() handles Firestore Timestamps, ISO strings, and Date objects
 * - returnPendingLateReturn no longer transitions to same status — it emits a
 *   side-effect flag (applyLateFee) handled by the scheduler separately
 * - pickupAwaitedToNoShow and pickupAwaitedToOngoing have explicit priority ordering
 * - getStatusTimeline shows meaningful state for terminal/hold statuses
 * - isExtensionStatus helper for trip extension integration
 */

// ── Status Constants ────────────────────────────────────────
export const BOOKING_STATUS = {
  PENDING_APPROVAL: "pending_approval",
  CONFIRMED: "confirmed",
  UPCOMING_TRIP: "upcoming_trip",
  PICKUP_AWAITED: "pickup_awaited",
  ONGOING_TRIP: "ongoing_trip",
  RETURN_PENDING: "return_pending",
  JOURNEY_COMPLETED: "completed",
  CANCELLED: "cancelled",
  ON_HOLD: "on_hold",
  NO_SHOW: "no_show",
  REJECTED: "rejected",
};

// ── Status Metadata ─────────────────────────────────────────
export const STATUS_META = {
  [BOOKING_STATUS.PENDING_APPROVAL]: {
    label: "Pending Approval",
    icon: "⏳",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.25)",
    description: "Awaiting dealer approval",
    phase: "pre-booking",
    canAccessDashboard: false,
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: "Confirmed",
    icon: "✅",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.25)",
    description: "Booking confirmed by dealer",
    phase: "pre-trip",
    canAccessDashboard: false,
  },
  [BOOKING_STATUS.UPCOMING_TRIP]: {
    label: "Upcoming Trip",
    icon: "📅",
    color: "#4ce3f7",
    bg: "rgba(76,227,247,0.1)",
    border: "rgba(76,227,247,0.25)",
    description: "Trip starts within 24 hours",
    phase: "pre-trip",
    canAccessDashboard: true,
  },
  [BOOKING_STATUS.PICKUP_AWAITED]: {
    label: "Pickup Awaited",
    icon: "🔑",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    description: "Waiting for pickup confirmation",
    phase: "pickup",
    canAccessDashboard: true,
  },
  [BOOKING_STATUS.ONGOING_TRIP]: {
    label: "Ongoing Trip",
    icon: "🚗",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.25)",
    description: "Trip in progress",
    phase: "active",
    canAccessDashboard: true,
  },
  [BOOKING_STATUS.RETURN_PENDING]: {
    label: "Return Pending",
    icon: "🔄",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    description: "Car return expected today",
    phase: "return",
    canAccessDashboard: true,
  },
  [BOOKING_STATUS.JOURNEY_COMPLETED]: {
    label: "Completed",
    icon: "🏁",
    color: "#4ce3f7",
    bg: "rgba(76,227,247,0.1)",
    border: "rgba(76,227,247,0.25)",
    description: "Trip completed successfully",
    phase: "completed",
    canAccessDashboard: false,
  },
  [BOOKING_STATUS.CANCELLED]: {
    label: "Cancelled",
    icon: "🚫",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    description: "Booking cancelled",
    phase: "terminated",
    canAccessDashboard: false,
  },
  [BOOKING_STATUS.ON_HOLD]: {
    label: "On Hold",
    icon: "⏸️",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    description: "Temporarily on hold — contact support",
    phase: "pre-booking",
    canAccessDashboard: false,
  },
  [BOOKING_STATUS.NO_SHOW]: {
    label: "No Show",
    icon: "👻",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    description: "Customer did not show up for pickup",
    phase: "terminated",
    canAccessDashboard: false,
  },
  [BOOKING_STATUS.REJECTED]: {
    label: "Rejected",
    icon: "❌",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    description: "Booking rejected by dealer",
    phase: "terminated",
    canAccessDashboard: false,
  },
};

// ── Valid Transitions ───────────────────────────────────────
export const VALID_TRANSITIONS = {
  [BOOKING_STATUS.PENDING_APPROVAL]: [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.REJECTED,
    BOOKING_STATUS.ON_HOLD,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.CONFIRMED]: [
    BOOKING_STATUS.UPCOMING_TRIP,
    BOOKING_STATUS.PICKUP_AWAITED, // skip upcoming if booking made same-day
    BOOKING_STATUS.ON_HOLD,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.UPCOMING_TRIP]: [
    BOOKING_STATUS.PICKUP_AWAITED,
    BOOKING_STATUS.ON_HOLD,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.PICKUP_AWAITED]: [
    BOOKING_STATUS.ONGOING_TRIP,
    BOOKING_STATUS.NO_SHOW,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.ONGOING_TRIP]: [
    BOOKING_STATUS.RETURN_PENDING,
    BOOKING_STATUS.JOURNEY_COMPLETED, // direct complete if return same day
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.RETURN_PENDING]: [
    BOOKING_STATUS.JOURNEY_COMPLETED,
    BOOKING_STATUS.CANCELLED,
  ],
  [BOOKING_STATUS.ON_HOLD]: [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.REJECTED,
  ],
  [BOOKING_STATUS.JOURNEY_COMPLETED]: [],
  [BOOKING_STATUS.CANCELLED]: [],
  [BOOKING_STATUS.NO_SHOW]: [],
  [BOOKING_STATUS.REJECTED]: [],
};

// ── Date Parser ─────────────────────────────────────────────
/**
 * Safely parse any date format Firestore or the app might produce.
 * Returns a JS Date, or null if unparseable.
 */
export function parseBookingDate(value) {
  if (!value) return null;

  // Firestore Timestamp object
  if (typeof value?.toDate === "function") return value.toDate();

  // Already a Date
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  // Firestore Timestamp-like plain object { seconds, nanoseconds }
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  // ISO string like "2025-06-15" or "2025-06-15T10:00:00"
  if (typeof value === "string") {
    // Date-only string: append time to avoid UTC midnight vs local midnight ambiguity
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00`
      : value;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  }

  // Epoch number
  if (typeof value === "number") return new Date(value);

  return null;
}

// ── Auto-Transition Rules ───────────────────────────────────
/**
 * Rules are evaluated IN ORDER. Priority: pickup-confirmed check
 * runs BEFORE no-show check so a last-minute confirmation isn't
 * incorrectly treated as no-show.
 *
 * Each rule:
 *   condition(booking) → boolean
 *   newStatus          → target BOOKING_STATUS (must be different from current)
 *   reason             → audit log string
 *   notifyUser         → boolean — scheduler fires notification if true
 *   sideEffect         → optional string key for extra actions (penalty, lateFee)
 *   penaltyPercent     → (when sideEffect = 'noShowPenalty')
 */
export const AUTO_TRANSITION_RULES = [
  // ── 1. Pickup confirmed → Ongoing (highest priority on PICKUP_AWAITED)
  {
    key: "pickupAwaitedToOngoing",
    condition: (b) =>
      b.status === BOOKING_STATUS.PICKUP_AWAITED && b.pickupConfirmed === true,
    newStatus: BOOKING_STATUS.ONGOING_TRIP,
    reason: "Pickup confirmed — trip started",
    notifyUser: false,
  },

  // ── 2. No-show (only if pickup NOT confirmed after 2h)
  {
    key: "pickupAwaitedToNoShow",
    condition: (b) => {
      if (b.status !== BOOKING_STATUS.PICKUP_AWAITED) return false;
      if (b.pickupConfirmed) return false; // Rule 1 already handled this
      const pickup = parseBookingDate(b.pickupDate);
      if (!pickup) return false;
      return Date.now() >= pickup.getTime() + 2 * 60 * 60 * 1000;
    },
    newStatus: BOOKING_STATUS.NO_SHOW,
    reason: "Customer did not show up within 2 hours of pickup time",
    notifyUser: true,
    sideEffect: "noShowPenalty",
    penaltyPercent: 50,
  },

  // ── 3. Dropoff confirmed → Completed (highest priority on RETURN_PENDING)
  {
    key: "returnPendingToCompleted",
    condition: (b) =>
      b.status === BOOKING_STATUS.RETURN_PENDING && b.dropoffConfirmed === true,
    newStatus: BOOKING_STATUS.JOURNEY_COMPLETED,
    reason: "Dropoff confirmed — journey completed",
    notifyUser: true,
  },

  // ── 4. Late return fee (side-effect only, NO status change)
  //    newStatus is intentionally absent — scheduler handles this separately
  {
    key: "returnPendingLateReturn",
    condition: (b) => {
      if (b.status !== BOOKING_STATUS.RETURN_PENDING) return false;
      if (b.dropoffConfirmed) return false;
      if (b.lateReturnNotified) return false; // Fire once only
      const dropoff = parseBookingDate(b.dropoffDate);
      if (!dropoff) return false;
      return Date.now() >= dropoff.getTime() + 2 * 60 * 60 * 1000;
    },
    newStatus: null, // ← No status change — side-effect only
    reason: "Late return — extra charges applied",
    notifyUser: true,
    sideEffect: "lateReturnFee",
  },

  // ── 5. Ongoing → Return Pending (on dropoff day)
  {
    key: "ongoingToReturnPending",
    condition: (b) => {
      if (b.status !== BOOKING_STATUS.ONGOING_TRIP) return false;
      const dropoff = parseBookingDate(b.dropoffDate);
      if (!dropoff) return false;
      const now = Date.now();
      const dayStart = dropoff.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      return now >= dayStart && now < dayEnd;
    },
    newStatus: BOOKING_STATUS.RETURN_PENDING,
    reason: "Return day — car return expected today",
    notifyUser: true,
  },

  // ── 6. Upcoming → Pickup Awaited (on pickup day)
  {
    key: "upcomingToPickupAwaited",
    condition: (b) => {
      if (
        ![BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.UPCOMING_TRIP].includes(
          b.status,
        )
      )
        return false;
      const pickup = parseBookingDate(b.pickupDate);
      if (!pickup) return false;
      const now = Date.now();
      const dayStart = pickup.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      return now >= dayStart && now < dayEnd;
    },
    newStatus: BOOKING_STATUS.PICKUP_AWAITED,
    reason: "Pickup day has arrived",
    notifyUser: true,
  },

  // ── 7. Confirmed → Upcoming (24h before pickup)
  {
    key: "confirmedToUpcoming",
    condition: (b) => {
      if (b.status !== BOOKING_STATUS.CONFIRMED) return false;
      const pickup = parseBookingDate(b.pickupDate);
      if (!pickup) return false;
      const now = Date.now();
      const windowStart = pickup.getTime() - 24 * 60 * 60 * 1000;
      return now >= windowStart && now < pickup.getTime();
    },
    newStatus: BOOKING_STATUS.UPCOMING_TRIP,
    reason: "Trip starts within 24 hours",
    notifyUser: true,
  },

  // ── 8. Pending approval auto-confirm (after dealer deadline)
  {
    key: "pendingToConfirmed",
    condition: (b) => {
      if (b.status !== BOOKING_STATUS.PENDING_APPROVAL) return false;

      // Use approvalDeadline if set, otherwise fall back to createdAt + 60 min
      if (b.approvalDeadline) {
        const deadline = parseBookingDate(b.approvalDeadline);
        return deadline && Date.now() >= deadline.getTime();
      }

      const createdAt = parseBookingDate(b.createdAt);
      if (!createdAt) return false;
      return Date.now() >= createdAt.getTime() + 60 * 60 * 1000;
    },
    newStatus: BOOKING_STATUS.CONFIRMED,
    reason: "Auto-confirmed after approval deadline",
    notifyUser: true,
  },
];

// ── Status Timeline ─────────────────────────────────────────
/**
 * Returns the 7-step visual timeline for a booking.
 * Terminal/hold statuses show a meaningful description rather
 * than silently freezing the timeline.
 */
export function getStatusTimeline(booking) {
  const steps = [
    {
      status: BOOKING_STATUS.PENDING_APPROVAL,
      label: "Request Sent",
      icon: "📤",
    },
    { status: BOOKING_STATUS.CONFIRMED, label: "Confirmed", icon: "✅" },
    { status: BOOKING_STATUS.UPCOMING_TRIP, label: "Upcoming", icon: "📅" },
    { status: BOOKING_STATUS.PICKUP_AWAITED, label: "Pickup Day", icon: "🔑" },
    { status: BOOKING_STATUS.ONGOING_TRIP, label: "Ongoing", icon: "🚗" },
    { status: BOOKING_STATUS.RETURN_PENDING, label: "Return Day", icon: "🔄" },
    {
      status: BOOKING_STATUS.JOURNEY_COMPLETED,
      label: "Completed",
      icon: "🏁",
    },
  ];

  const isTerminal =
    booking.status === BOOKING_STATUS.CANCELLED ||
    booking.status === BOOKING_STATUS.NO_SHOW ||
    booking.status === BOOKING_STATUS.REJECTED;

  const isOnHold = booking.status === BOOKING_STATUS.ON_HOLD;

  // For terminated bookings, find where they stopped
  const frozenAtStatus = booking.previousStatus || booking.status;
  const frozenIndex = steps.findIndex((s) => s.status === frozenAtStatus);

  return steps.map((step, index) => {
    if (isTerminal) {
      return {
        ...step,
        completed: index < frozenIndex,
        current: index === frozenIndex,
        pending: index > frozenIndex,
        terminated: true,
        terminatedStatus: booking.status,
        terminatedLabel: STATUS_META[booking.status]?.label,
      };
    }

    if (isOnHold) {
      const currentIndex = steps.findIndex((s) => s.status === frozenAtStatus);
      return {
        ...step,
        completed: index < currentIndex,
        current: index === currentIndex,
        pending: index > currentIndex,
        onHold: true,
      };
    }

    const currentIndex = steps.findIndex((s) => s.status === booking.status);
    return {
      ...step,
      completed: index < currentIndex,
      current: index === currentIndex,
      pending: index > currentIndex,
      terminated: false,
    };
  });
}

// ── Helpers ─────────────────────────────────────────────────
export function isTerminalStatus(status) {
  return [
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.NO_SHOW,
    BOOKING_STATUS.REJECTED,
    BOOKING_STATUS.JOURNEY_COMPLETED,
  ].includes(status);
}

export function isActiveStatus(status) {
  return [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.UPCOMING_TRIP,
    BOOKING_STATUS.PICKUP_AWAITED,
    BOOKING_STATUS.ONGOING_TRIP,
    BOOKING_STATUS.RETURN_PENDING,
  ].includes(status);
}

export function canAccessDashboard(status) {
  return STATUS_META[status]?.canAccessDashboard ?? false;
}

/** How many minutes until the next meaningful transition for a booking */
export function minutesUntilNextTransition(booking) {
  const pickup = parseBookingDate(booking.pickupDate);
  const dropoff = parseBookingDate(booking.dropoffDate);
  const now = Date.now();

  switch (booking.status) {
    case BOOKING_STATUS.PENDING_APPROVAL: {
      if (booking.approvalDeadline) {
        const deadline = parseBookingDate(booking.approvalDeadline);
        return deadline
          ? Math.max(0, Math.round((deadline.getTime() - now) / 60000))
          : null;
      }
      if (!booking.createdAt) return null;
      const created = parseBookingDate(booking.createdAt);
      return created
        ? Math.max(
            0,
            Math.round((created.getTime() + 60 * 60 * 1000 - now) / 60000),
          )
        : null;
    }
    case BOOKING_STATUS.CONFIRMED: {
      if (!pickup) return null;
      const windowStart = pickup.getTime() - 24 * 60 * 60 * 1000;
      return Math.max(0, Math.round((windowStart - now) / 60000));
    }
    case BOOKING_STATUS.UPCOMING_TRIP: {
      if (!pickup) return null;
      return Math.max(0, Math.round((pickup.getTime() - now) / 60000));
    }
    case BOOKING_STATUS.PICKUP_AWAITED: {
      if (!pickup) return null;
      const noShowTime = pickup.getTime() + 2 * 60 * 60 * 1000;
      return Math.max(0, Math.round((noShowTime - now) / 60000));
    }
    case BOOKING_STATUS.ONGOING_TRIP: {
      if (!dropoff) return null;
      return Math.max(0, Math.round((dropoff.getTime() - now) / 60000));
    }
    case BOOKING_STATUS.RETURN_PENDING: {
      if (!dropoff) return null;
      const lateTime = dropoff.getTime() + 2 * 60 * 60 * 1000;
      return Math.max(0, Math.round((lateTime - now) / 60000));
    }
    default:
      return null;
  }
}