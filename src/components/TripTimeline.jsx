/**
 * TripTimeline.jsx — Production Grade
 *
 * Fixes:
 * - Uses getStatusTimeline() from statusTransitions — single source of truth
 * - parseBookingDate() handles Firestore Timestamps, ISO strings, Date objects
 * - Terminal statuses (cancelled, no_show, rejected) show a clear explanation
 * - Progress bar counts only steps after "Booking Confirmed" (step 0 is baseline)
 * - All 7 lifecycle steps shown, not just 5
 * - ON_HOLD shows a "paused" visual state
 * - Timestamps formatted consistently for both Firestore Timestamps and ISO strings
 */

import { getStatusTimeline, BOOKING_STATUS, parseBookingDate } from '../utils/statusTransitions';

// ── Date formatter ───────────────────────────────────────────
function formatStepTime(value) {
  if (!value || value === '—') return '—';

  const d = parseBookingDate(value);
  if (!d) return String(value);

  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ── Step time resolver ───────────────────────────────────────
function resolveStepTime(stepStatus, booking) {
  switch (stepStatus) {
    case BOOKING_STATUS.PENDING_APPROVAL:
      return formatStepTime(booking?.createdAt) || '—';
    case BOOKING_STATUS.CONFIRMED:
      return formatStepTime(booking?.confirmedAt) || formatStepTime(booking?.createdAt) || '—';
    case BOOKING_STATUS.UPCOMING_TRIP:
      return booking?.pickupDate
        ? formatStepTime(booking.pickupDate) + ' (–24h)'
        : '—';
    case BOOKING_STATUS.PICKUP_AWAITED:
      return booking?.pickupDate ? formatStepTime(booking.pickupDate) : '—';
    case BOOKING_STATUS.ONGOING_TRIP:
      return formatStepTime(booking?.pickupConfirmedAt) || 'In progress';
    case BOOKING_STATUS.RETURN_PENDING:
      return booking?.dropoffDate ? formatStepTime(booking.dropoffDate) : '—';
    case BOOKING_STATUS.JOURNEY_COMPLETED:
      return formatStepTime(booking?.completedAt) || 'Pending';
    default:
      return '—';
  }
}

export default function TripTimeline({ booking }) {
  if (!booking) return null;

  const isTerminal = [
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.NO_SHOW,
    BOOKING_STATUS.REJECTED,
  ].includes(booking.status);

  const isOnHold = booking.status === BOOKING_STATUS.ON_HOLD;

  // getStatusTimeline returns all 7 steps with completed/current/pending/terminated flags
  const steps = getStatusTimeline(booking);

  // Progress: exclude step 0 (Booking Confirmed = always baseline)
  // Count completed steps from index 1 onwards
  const progressSteps = steps.slice(1);
  const completedCount = progressSteps.filter((s) => s.completed).length;
  const progressPct = Math.round((completedCount / progressSteps.length) * 100);

  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <span className="icon">📋</span>
        <h3>Trip Timeline</h3>

        {/* Status badge in header */}
        {(isTerminal || isOnHold) && (
          <span style={{
            marginLeft: 'auto',
            fontSize: '10px',
            padding: '3px 10px',
            background: isTerminal ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${isTerminal ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
            borderRadius: '10px',
            color: isTerminal ? '#ef4444' : '#f59e0b',
            fontWeight: '700',
            fontFamily: 'Quicksand, sans-serif',
          }}>
            {isTerminal
              ? steps[0]?.terminatedLabel || booking.status.replace(/_/g, ' ')
              : '⏸️ On Hold'}
          </span>
        )}
      </div>

      {/* Terminal state explanation banner */}
      {isTerminal && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: '10px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '18px' }}>
            {booking.status === BOOKING_STATUS.CANCELLED ? '🚫'
              : booking.status === BOOKING_STATUS.NO_SHOW ? '👻'
              : '❌'}
          </span>
          <div>
            <p style={{
              color: '#ef4444', fontWeight: '700', fontSize: '12px',
              margin: 0, fontFamily: 'Quicksand, sans-serif',
            }}>
              {booking.status === BOOKING_STATUS.CANCELLED
                ? 'Booking Cancelled'
                : booking.status === BOOKING_STATUS.NO_SHOW
                ? 'No Show — Booking Auto-Cancelled'
                : 'Booking Rejected'}
            </p>
            {booking.cancelReason && (
              <p style={{
                color: 'rgba(255,255,255,0.4)', fontSize: '11px',
                margin: '2px 0 0', fontFamily: 'Quicksand, sans-serif',
              }}>
                {booking.cancelReason}
              </p>
            )}
            {booking.penaltyAmount > 0 && (
              <p style={{
                color: '#f97316', fontSize: '11px',
                margin: '2px 0 0', fontFamily: 'Quicksand, sans-serif',
              }}>
                ⚠️ Penalty applied: ₹{booking.penaltyAmount?.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* On-hold banner */}
      {isOnHold && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '10px',
          marginBottom: '14px',
          fontSize: '12px',
          color: '#f59e0b',
          fontFamily: 'Quicksand, sans-serif',
        }}>
          ⏸️ Your booking is temporarily on hold.
          {booking.onHoldReason && ` Reason: ${booking.onHoldReason}`}
          {' '}Contact support for assistance.
        </div>
      )}

      {/* Timeline steps */}
      <div className="trip-timeline">
        {steps.map((step) => {
          const time = resolveStepTime(step.status, booking);

          let dotColor = 'rgba(255,255,255,0.1)';
          let lineColor = 'rgba(255,255,255,0.06)';
          let titleColor = 'rgba(255,255,255,0.3)';
          let timeColor = 'rgba(255,255,255,0.2)';

          if (step.completed && !step.terminated) {
            dotColor = '#22c55e';
            lineColor = 'rgba(34,197,94,0.3)';
            titleColor = 'rgba(255,255,255,0.7)';
            timeColor = 'rgba(255,255,255,0.4)';
          } else if (step.completed && step.terminated) {
            // Completed before termination
            dotColor = 'rgba(255,255,255,0.3)';
            titleColor = 'rgba(255,255,255,0.45)';
            timeColor = 'rgba(255,255,255,0.25)';
          } else if (step.current && !step.terminated) {
            dotColor = '#4ce3f7';
            lineColor = 'rgba(76,227,247,0.2)';
            titleColor = '#fff';
            timeColor = 'rgba(255,255,255,0.5)';
          } else if (step.current && step.terminated) {
            // The step where termination happened
            dotColor = '#ef4444';
            titleColor = '#ef4444';
            timeColor = 'rgba(239,68,68,0.6)';
          } else if (isOnHold && step.current) {
            dotColor = '#f59e0b';
            titleColor = '#f59e0b';
          }

          return (
            <div
              key={step.status}
              className={`timeline-item ${step.completed ? 'completed' : ''} ${step.current ? 'current' : ''}`}
              style={{ position: 'relative' }}
            >
              {/* Dot */}
              <div style={{
                position: 'absolute',
                left: '-1px',
                top: '4px',
                width: step.current ? '10px' : '8px',
                height: step.current ? '10px' : '8px',
                borderRadius: '50%',
                background: dotColor,
                boxShadow: step.current && !step.terminated
                  ? `0 0 8px ${dotColor}80`
                  : 'none',
                zIndex: 1,
                transition: 'all 0.2s',
              }} />

              <div className="time" style={{ color: timeColor }}>
                {time}
              </div>

              <div
                className="title"
                style={{ color: titleColor, fontWeight: step.current ? '700' : '500' }}
              >
                {step.icon} {step.label}

                {step.current && !isTerminal && !isOnHold && (
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '9px',
                    padding: '2px 7px',
                    background: 'rgba(76,227,247,0.12)',
                    border: '1px solid rgba(76,227,247,0.25)',
                    borderRadius: '8px',
                    color: '#4ce3f7',
                    fontWeight: '700',
                    fontFamily: 'Quicksand, sans-serif',
                  }}>
                    Current
                  </span>
                )}

                {step.current && isOnHold && (
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '9px',
                    padding: '2px 7px',
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: '8px',
                    color: '#f59e0b',
                    fontWeight: '700',
                    fontFamily: 'Quicksand, sans-serif',
                  }}>
                    Paused
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar (hidden for terminal) */}
      {!isTerminal && (
        <div className="trip-progress" style={{ marginTop: '14px' }}>
          <div className="trip-progress-bar" style={{
            height: '6px',
            borderRadius: '3px',
            background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div
              className="trip-progress-fill"
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: isOnHold
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #3b82f6, #4ce3f7)',
                borderRadius: '3px',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <div className="trip-progress-labels" style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '5px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'Quicksand, sans-serif' }}>
              Start
            </span>
            <span style={{
              color: isOnHold ? '#f59e0b' : '#4ce3f7',
              fontSize: '10px',
              fontWeight: '700',
              fontFamily: 'Quicksand, sans-serif',
            }}>
              {isOnHold ? '⏸️ On Hold' : `${progressPct}% Complete`}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'Quicksand, sans-serif' }}>
              Finish
            </span>
          </div>
        </div>
      )}
    </div>
  );
}