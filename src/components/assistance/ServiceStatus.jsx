import { useState, useEffect, useRef } from 'react';
import { STATUS_META, calculateETADisplay } from '../../utils/assistanceService';

/**
 * Service Status Component
 * Shows real-time status of an active assistance request
 *
 * FIXES:
 * - ETA interval stale closure: interval now stores request in a ref so it
 *   always reads the latest prop value without needing re-registration
 * - Cancel button hidden immediately when status is 'completed' or 'cancelled'
 *   (was showing briefly due to async state lag)
 * - "Stuck on pending" nudge: if status stays pending for > 5 min,
 *   a support contact link appears
 * - Progress bar fills smoothly to 100 on completed without visual glitch
 * - calculateETADisplay return value guarded (can return null)
 */
export default function ServiceStatus({ request, onCancel, loading }) {
  const [eta, setEta] = useState('');
  const [progress, setProgress] = useState(0);
  const [stuckPending, setStuckPending] = useState(false);
  const requestRef = useRef(request);

  // Keep ref current so interval always sees latest props
  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    computeDisplayValues(request);

    const interval = setInterval(() => {
      computeDisplayValues(requestRef.current);
    }, 30000);

    return () => clearInterval(interval);
  }, [request?.status, request?.createdAt]);

  // Check if stuck on pending > 5 minutes
  useEffect(() => {
    if (request?.status !== 'pending' || !request?.createdAt) {
      setStuckPending(false);
      return;
    }

    function check() {
      const created = resolveDate(requestRef.current?.createdAt);
      if (!created) return;
      const elapsed = Date.now() - created.getTime();
      setStuckPending(elapsed > 5 * 60 * 1000); // 5 min
    }

    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [request?.status, request?.createdAt]);

  function resolveDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function computeDisplayValues(req) {
    if (!req) return;

    // ETA
    if (req.createdAt && req.etaMinutes) {
      const display = calculateETADisplay(req.createdAt, req.etaMinutes);
      setEta(display || '');
    }

    // Progress (0–100)
    const statusOrder = ['pending', 'confirmed', 'dispatched', 'en_route', 'arrived', 'in_progress', 'completed'];
    const idx = statusOrder.indexOf(req.status);
    if (idx >= 0) {
      setProgress(Math.round((idx / (statusOrder.length - 1)) * 100));
    }
  }

  const statusMeta = STATUS_META[request?.status] || STATUS_META.pending;

  const timelineSteps = [
    { status: 'pending',     label: 'Requested'  },
    { status: 'confirmed',   label: 'Confirmed'  },
    { status: 'dispatched',  label: 'Dispatched' },
    { status: 'en_route',    label: 'On the way' },
    { status: 'arrived',     label: 'Arrived'    },
    { status: 'in_progress', label: 'Fixing'     },
    { status: 'completed',   label: 'Done'       },
  ];

  const currentStepIndex = timelineSteps.findIndex(s => s.status === request?.status);

  // FIX: derive cancel visibility from request prop directly,
  // not from internal state — avoids async lag
  const canCancel = request?.status !== 'completed' && request?.status !== 'cancelled';

  return (
    <div>
      {/* Status header */}
      <div style={{
        padding: '20px',
        background: `${statusMeta.color}08`,
        border: `1px solid ${statusMeta.color}28`,
        borderRadius: '16px',
        textAlign: 'center',
        marginBottom: '14px',
      }}>
        <div style={{ fontSize: '44px', marginBottom: '8px', lineHeight: 1 }}>
          {request?.serviceIcon || '🔧'}
        </div>
        <h3 style={{ color: '#fff', margin: '0 0 6px', fontSize: '16px', fontWeight: '700' }}>
          {request?.serviceName || 'Assistance'}
        </h3>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 12px',
          background: `${statusMeta.color}14`,
          border: `1px solid ${statusMeta.color}28`,
          borderRadius: '20px',
        }}>
          <span style={{ fontSize: '13px' }}>{statusMeta.icon}</span>
          <span style={{ color: statusMeta.color, fontSize: '12px', fontWeight: '700' }}>
            {statusMeta.label}
          </span>
        </div>

        {/* ETA */}
        {eta && request?.status !== 'completed' && request?.status !== 'cancelled' && (
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: '10px 0 0' }}>
            ⏱ Estimated arrival:{' '}
            <strong style={{ color: '#fff' }}>{eta}</strong>
          </p>
        )}

        {/* Completed confirmation */}
        {request?.status === 'completed' && (
          <p style={{ color: '#22c55e', fontSize: '13px', fontWeight: '600', margin: '10px 0 0' }}>
            🎉 Service completed successfully!
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          height: '5px', borderRadius: '3px',
          background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${statusMeta.color}, ${statusMeta.color}88)`,
            borderRadius: '3px',
            transition: 'width 0.8s ease',
          }} />
        </div>
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: '14px' }}>
        {timelineSteps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div
              key={step.status}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '5px 0', position: 'relative',
              }}
            >
              {/* Connector line */}
              {index < timelineSteps.length - 1 && (
                <div style={{
                  position: 'absolute', left: '10px', top: '24px', bottom: '-5px',
                  width: '2px',
                  background: isCompleted ? statusMeta.color : 'rgba(255,255,255,0.07)',
                  transition: 'background 0.5s ease',
                }} />
              )}

              {/* Dot */}
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, zIndex: 1,
                background: isCompleted
                  ? statusMeta.color
                  : isCurrent
                    ? `${statusMeta.color}28`
                    : 'rgba(255,255,255,0.04)',
                border: `2px solid ${isCompleted || isCurrent ? statusMeta.color : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: '700',
                color: isCompleted ? '#fff' : statusMeta.color,
                transition: 'background 0.4s ease, border-color 0.4s ease',
              }}>
                {isCompleted ? '✓' : isCurrent ? '●' : ''}
              </div>

              <span style={{
                color: isCompleted
                  ? statusMeta.color
                  : isCurrent
                    ? '#fff'
                    : 'rgba(255,255,255,0.25)',
                fontSize: '12px',
                fontWeight: isCurrent ? '700' : '400',
                transition: 'color 0.3s ease',
              }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stuck-pending nudge */}
      {stuckPending && (
        <div style={{
          padding: '10px 14px', marginBottom: '12px', borderRadius: '10px',
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
          fontSize: '12px', color: 'rgba(245,158,11,0.9)', lineHeight: '1.5',
        }}>
          ⏳ Taking longer than expected.{' '}
          <a
            href="tel:1800-123-9999"
            style={{ color: '#f59e0b', fontWeight: '700', textDecoration: 'none' }}
          >
            Call QuickWheels Support ↗
          </a>
        </div>
      )}

      {/* Cancel button */}
      {canCancel && (
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            border: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.06)',
            color: '#ef4444', fontWeight: '600', fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            opacity: loading ? 0.5 : 1,
            transition: 'background 0.15s, opacity 0.15s',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
        >
          {loading ? '⏳ Cancelling...' : '❌ Cancel Request'}
        </button>
      )}
    </div>
  );
}