import { useState, useRef, useEffect } from 'react';

/**
 * SOS Button Component
 * Press & Hold for 3 seconds to activate emergency
 *
 * FIXES:
 * - Countdown 3→2→1 now correct (was showing 4→3→2)
 * - touchmove cancel added (scroll was keeping hold alive)
 * - onReset prop wired up so parent Hub knows when user resets
 * - Cleanup on unmount is reliable
 */
export default function SOSButton({ onActivate, onReset, disabled = false }) {
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activated, setActivated] = useState(false);
  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  const HOLD_DURATION = 3000;

  useEffect(() => {
    return () => {
      clearAll();
    };
  }, []);

  function clearAll() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }

  function startPress(e) {
    // Prevent ghost mouse events after touch
    if (e.type === 'mousedown' && e.sourceCapabilities?.firesTouchEvents) return;
    if (disabled || activated) return;

    setIsPressed(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    function tick() {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    timerRef.current = setTimeout(() => {
      setActivated(true);
      setIsPressed(false);
      setProgress(100);
      onActivate?.();
    }, HOLD_DURATION);
  }

  function cancelPress(e) {
    if (activated) return;
    setIsPressed(false);
    setProgress(0);
    clearAll();
  }

  function handleReset() {
    setActivated(false);
    setProgress(0);
    setIsPressed(false);
    onReset?.();
  }

  // Countdown: 3 → 2 → 1 (correct math)
  const countdownNum = isPressed && !activated
    ? Math.max(1, Math.ceil(3 - (progress / 100) * 3))
    : null;

  const circleRadius = 60;
  const circleCircumference = 2 * Math.PI * circleRadius;

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <button
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}   /* FIX: cancel if user scrolls */
        onTouchCancel={cancelPress}
        disabled={disabled}
        aria-label={activated ? 'SOS Sent' : 'SOS — Press and hold for 3 seconds'}
        style={{
          width: '130px',
          height: '130px',
          borderRadius: '50%',
          border: `4px solid ${activated ? '#22c55e' : isPressed ? '#ef4444' : 'rgba(239,68,68,0.5)'}`,
          background: activated
            ? 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.08))'
            : isPressed
              ? 'linear-gradient(135deg, rgba(239,68,68,0.28), rgba(239,68,68,0.12))'
              : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          margin: '0 auto',
          boxShadow: isPressed
            ? '0 0 50px rgba(239,68,68,0.45), 0 0 100px rgba(239,68,68,0.15)'
            : activated
              ? '0 0 40px rgba(34,197,94,0.35)'
              : '0 0 24px rgba(239,68,68,0.12)',
          transform: isPressed ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'none',  /* FIX: prevents scroll interfering with hold */
        }}
      >
        {/* Progress ring SVG */}
        <svg
          style={{
            position: 'absolute',
            top: '-10px',
            left: '-10px',
            width: 'calc(100% + 20px)',
            height: 'calc(100% + 20px)',
            transform: 'rotate(-90deg)',
            pointerEvents: 'none',
          }}
          viewBox="0 0 150 150"
        >
          {/* Track */}
          <circle
            cx="75" cy="75" r={circleRadius}
            fill="none"
            stroke="rgba(239,68,68,0.15)"
            strokeWidth="4"
          />
          {/* Fill */}
          <circle
            cx="75" cy="75" r={circleRadius}
            fill="none"
            stroke={activated ? '#22c55e' : '#ef4444'}
            strokeWidth="4"
            strokeDasharray={circleCircumference}
            strokeDashoffset={circleCircumference * (1 - progress / 100)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s ease' }}
          />
        </svg>

        {/* Icon */}
        <span style={{ fontSize: '30px', lineHeight: 1 }}>
          {activated ? '✅' : '🆘'}
        </span>

        {/* Label */}
        <span style={{
          fontSize: '12px',
          fontWeight: '800',
          color: activated ? '#22c55e' : '#ef4444',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          {activated ? 'SENT' : isPressed ? `${countdownNum}...` : 'SOS'}
        </span>
      </button>

      {/* Instructions */}
      {!activated && !isPressed && (
        <p style={{
          color: 'rgba(255,255,255,0.38)',
          fontSize: '11px',
          marginTop: '12px',
          marginBottom: 0,
        }}>
          Press &amp; hold for 3 seconds
        </p>
      )}

      {/* Holding feedback */}
      {isPressed && !activated && (
        <p style={{
          color: '#ef4444',
          fontSize: '13px',
          fontWeight: '700',
          marginTop: '10px',
          marginBottom: 0,
        }}>
          Keep holding...
        </p>
      )}

      {/* Activated state */}
      {activated && (
        <div style={{ marginTop: '14px' }}>
          <p style={{ color: '#22c55e', fontWeight: '700', fontSize: '14px', margin: 0 }}>
            🚨 Emergency Alert Sent!
          </p>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', margin: '4px 0 0' }}>
            Help is on the way. Stay calm.
          </p>
          <button
            onClick={handleReset}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginTop: '10px',
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}