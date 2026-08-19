// src/components/TripExtensionModal.jsx

/**
 * TripExtensionModal.jsx — Production Grade
 *
 * Fixes vs original:
 * - Uses applyExtension() (Firestore transaction) instead of raw updateDoc
 * - Fires notify.extensionRequested() on success
 * - Calls triggerImmediateCheck() so scheduler reacts to new dropoff date
 * - Consistent penalty model (1.5× via extensionCalculator)
 * - 5-second undo window before commit (prevents fat-finger extensions)
 * - Dead code removed (selectedOption state was set but never read)
 * - customDays clamped to validation.maxDays (not hardcoded 7)
 * - All date formatting goes through calculateNewDropoffDate (safe parsing)
 * - Error messages distinguish network vs validation failures
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  isExtensionValid,
  getExtensionOptions,
  calculateExtensionCost,
  calculateNewDropoffDate,
  formatCurrency,
} from '../utils/extensionCalculator';
import { applyExtension } from '../utils/bookingStatus';
import { triggerImmediateCheck } from '../services/statusScheduler';
import { notify } from '../utils/notificationService';

export default function TripExtensionModal({ booking, onClose, onExtended }) {
  const { user } = useAuth();

  const [validation, setValidation] = useState(null);
  const [options, setOptions] = useState([]);
  const [customDays, setCustomDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Undo window state
  const [pendingExtension, setPendingExtension] = useState(null); // { days, cost, newDropoff }
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);
  const commitRef = useRef(null);

  const isDemo = booking?.id?.startsWith('demo-');
  const currencySymbol = booking?.currencySymbol || '₹';

  // ── Load validation ──────────────────────────────────────
  useEffect(() => {
    if (!booking) return;
    const v = isExtensionValid(booking);
    setValidation(v);
    if (v.valid) {
      setOptions(getExtensionOptions(booking));
      setCustomDays(1);
    }
  }, [booking]);

  // ── Clamp customDays to maxDays ──────────────────────────
  useEffect(() => {
    if (validation?.maxDays) {
      setCustomDays((d) => Math.min(d, validation.maxDays));
    }
  }, [validation]);

  // ── Cleanup timers on unmount ────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(countdownRef.current);
      clearTimeout(commitRef.current);
    };
  }, []);

  // ── Stage extension (start 5s undo window) ──────────────
  function stageExtension(days) {
    if (loading || pendingExtension) return;
    setError(null);

    const cost = calculateExtensionCost(
      validation.dailyRate,
      days,
      validation.isLate,
    );
    const newDropoff = calculateNewDropoffDate(booking.dropoffDate, days);

    setPendingExtension({ days, cost, newDropoff });
    setCountdown(5);

    // Tick countdown
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    // Auto-commit after 5s
    commitRef.current = setTimeout(() => commitExtension(days, cost, newDropoff), 5000);
  }

  // ── Cancel pending extension ─────────────────────────────
  function cancelPending() {
    clearInterval(countdownRef.current);
    clearTimeout(commitRef.current);
    setPendingExtension(null);
    setCountdown(0);
  }

  // ── Commit extension to Firestore ────────────────────────
  async function commitExtension(days, cost, newDropoff) {
    clearInterval(countdownRef.current);
    setLoading(true);
    setPendingExtension(null);
    setCountdown(0);

    try {
      if (isDemo) {
        // Demo mode: simulate network delay
        await new Promise((r) => setTimeout(r, 700));
      } else {
        const result = await applyExtension(booking.id, days, cost.totalCost);

        if (!result.success) {
          throw new Error(result.error || 'Extension failed');
        }

        // Fire notification
        if (user?.uid) {
          await notify.extensionRequested(user.uid, booking.id, days);
        }

        // Trigger scheduler to recompute with new dropoff date
        if (user?.uid) {
          triggerImmediateCheck(user.uid).catch(() => {});
        }
      }

      // Notify parent component
      if (onExtended) {
        onExtended({
          newDropoffDate: newDropoff,
          newDays: (booking.days || 0) + days,
          newTotal: (booking.total || 0) + cost.totalCost,
          extensionCost: cost.totalCost,
          extensionDays: days,
        });
      }

      // Close after brief success flash
      setTimeout(onClose, 1200);
    } catch (err) {
      console.error('[TripExtensionModal] Extension failed:', err);
      const isNetworkError =
        err.message?.includes('unavailable') ||
        err.message?.includes('network') ||
        err.message?.includes('Failed to fetch');
      setError(
        isNetworkError
          ? 'Network error. Check your connection and try again.'
          : err.message || 'Failed to extend trip. Please try again.',
      );
    }

    setLoading(false);
  }

  // ── Loading state ────────────────────────────────────────
  if (!validation) {
    return (
      <div style={styles.center}>
        <Spinner size={24} />
      </div>
    );
  }

  // ── Invalid extension ────────────────────────────────────
  if (!validation.valid) {
    return (
      <div style={styles.center}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
        <p style={{ color: '#f59e0b', fontWeight: '700', marginBottom: '6px', fontSize: '14px', fontFamily: 'Quicksand, sans-serif' }}>
          Cannot Extend Trip
        </p>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', textAlign: 'center', fontFamily: 'Quicksand, sans-serif' }}>
          {validation.reason}
        </p>
        <button onClick={onClose} style={styles.ghostBtn}>
          Close
        </button>
      </div>
    );
  }

  const customCost = calculateExtensionCost(
    validation.dailyRate,
    customDays,
    validation.isLate,
  );

  const customNewDropoff = calculateNewDropoffDate(booking.dropoffDate, customDays);

  // ── Undo confirmation banner ─────────────────────────────
  if (pendingExtension) {
    return (
      <div>
        <div style={{
          padding: '18px',
          background: 'linear-gradient(135deg, rgba(76,227,247,0.06), rgba(76,227,247,0.02))',
          border: '1px solid rgba(76,227,247,0.2)',
          borderRadius: '14px',
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px' }}>📅</span>
            <div>
              <p style={styles.confirmTitle}>
                Extending by {pendingExtension.days} day{pendingExtension.days > 1 ? 's' : ''}
              </p>
              <p style={styles.confirmSub}>
                New return: <strong style={{ color: '#4ce3f7' }}>{pendingExtension.newDropoff}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={styles.metaLabel}>Extension charge</span>
            <span style={{ color: '#4ce3f7', fontWeight: '700', fontSize: '14px', fontFamily: 'Quicksand, sans-serif' }}>
              {formatCurrency(pendingExtension.cost.totalCost, currencySymbol)}
            </span>
          </div>

          {pendingExtension.cost.penaltyFee > 0 && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.18)',
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '11px',
              color: '#ef4444',
              fontFamily: 'Quicksand, sans-serif',
            }}>
              ⚠️ Includes late return surcharge of {formatCurrency(pendingExtension.cost.penaltyFee, currencySymbol)}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={cancelPending}
              style={{ ...styles.ghostBtn, flex: 1 }}
            >
              ✕ Cancel ({countdown}s)
            </button>
            <button
              onClick={() => commitExtension(
                pendingExtension.days,
                pendingExtension.cost,
                pendingExtension.newDropoff,
              )}
              style={{ ...styles.primaryBtn, flex: 1 }}
            >
              ✓ Confirm Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.center}>
        <Spinner size={32} />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '12px', fontFamily: 'Quicksand, sans-serif' }}>
          Applying extension…
        </p>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────
  return (
    <div>
      {/* Late return warning */}
      {validation.isLate && (
        <div style={styles.warningBox}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '13px', fontFamily: 'Quicksand, sans-serif' }}>
              Late Return — 50% Surcharge Applies
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', margin: 0, fontFamily: 'Quicksand, sans-serif' }}>
            Original dropoff was {validation.originalDropoffDate}. All extensions include a 50% late fee.
          </p>
        </div>
      )}

      {/* Trip summary row */}
      <div style={styles.infoBox}>
        <Row label="Current return" value={booking?.dropoffDate || '—'} />
        <Row label="Daily rate" value={`${formatCurrency(validation.dailyRate, currencySymbol)}/day`} accent />
        <Row
          label="Time remaining"
          value={
            validation.remainingDays > 0
              ? `${validation.remainingDays} day${validation.remainingDays !== 1 ? 's' : ''}`
              : 'Overdue'
          }
          valueColor={validation.remainingDays > 0 ? '#22c55e' : '#ef4444'}
        />
        <Row label="Max extension" value={`+${validation.maxDays} days`} />
      </div>

      {/* Quick options */}
      {options.length > 0 && (
        <>
          <SectionLabel>Quick extension</SectionLabel>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${options.length}, 1fr)`,
            gap: '8px',
            marginBottom: '14px',
          }}>
            {options.map((opt) => (
              <QuickOption
                key={opt.id}
                option={opt}
                currencySymbol={currencySymbol}
                onSelect={() => stageExtension(opt.days)}
                disabled={loading}
              />
            ))}
          </div>
        </>
      )}

      {/* Custom extension */}
      <SectionLabel>Custom</SectionLabel>
      <div style={styles.customRow}>
        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StepBtn
            label="−"
            onClick={() => setCustomDays((d) => Math.max(1, d - 1))}
          />
          <span style={{ color: '#fff', fontSize: '18px', fontWeight: '800', minWidth: '28px', textAlign: 'center', fontFamily: 'Quicksand, sans-serif' }}>
            {customDays}
          </span>
          <StepBtn
            label="+"
            onClick={() => setCustomDays((d) => Math.min(validation.maxDays, d + 1))}
          />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontFamily: 'Quicksand, sans-serif' }}>
            day{customDays !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Cost preview */}
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ color: '#4ce3f7', fontSize: '13px', fontWeight: '700', fontFamily: 'Quicksand, sans-serif' }}>
            {formatCurrency(customCost.totalCost, currencySymbol)}
          </div>
          {customNewDropoff && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'Quicksand, sans-serif' }}>
              → {customNewDropoff}
            </div>
          )}
          {customCost.penaltyFee > 0 && (
            <div style={{ color: '#ef4444', fontSize: '10px', fontFamily: 'Quicksand, sans-serif' }}>
              +{formatCurrency(customCost.penaltyFee, currencySymbol)} late fee
            </div>
          )}
        </div>

        <button
          onClick={() => stageExtension(customDays)}
          disabled={loading}
          style={styles.primaryBtn}
        >
          Extend
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function QuickOption({ option, currencySymbol, onSelect, disabled }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 8px',
        borderRadius: '12px',
        border: `1px solid ${hovered ? 'rgba(76,227,247,0.4)' : 'rgba(76,227,247,0.18)'}`,
        background: hovered ? 'rgba(76,227,247,0.1)' : 'rgba(76,227,247,0.04)',
        color: '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'center',
        fontFamily: 'Quicksand, sans-serif',
        opacity: disabled ? 0.5 : 1,
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.18s',
      }}
    >
      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{option.icon}</div>
      <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>
        {option.label}
      </div>
      <div style={{ color: '#4ce3f7', fontSize: '11px', fontWeight: '600' }}>
        {formatCurrency(option.cost.totalCost, currencySymbol)}
      </div>
      {option.cost.penaltyFee > 0 && (
        <div style={{ color: '#ef4444', fontSize: '9px', marginTop: '2px' }}>
          +50% late fee
        </div>
      )}
      {option.newDropoffDate && (
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px', marginTop: '2px' }}>
          → {option.newDropoffDate}
        </div>
      )}
    </button>
  );
}

function Row({ label, value, accent, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontFamily: 'Quicksand, sans-serif' }}>
        {label}
      </span>
      <span style={{
        color: valueColor || (accent ? '#4ce3f7' : '#fff'),
        fontSize: '12px',
        fontWeight: '600',
        fontFamily: 'Quicksand, sans-serif',
      }}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: '10px',
      color: 'rgba(255,255,255,0.35)',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      marginBottom: '8px',
      marginTop: '2px',
      fontFamily: 'Quicksand, sans-serif',
    }}>
      {children}
    </p>
  );
}

function StepBtn({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '28px', height: '28px',
        borderRadius: '7px',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.04)',
        color: '#fff', fontSize: '16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Quicksand, sans-serif',
      }}
    >
      {label}
    </button>
  );
}

function Spinner({ size = 28 }) {
  return (
    <>
      <style>{`@keyframes te-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: size, height: size,
        borderRadius: '50%',
        border: '2px solid rgba(76,227,247,0.15)',
        borderTopColor: '#4ce3f7',
        animation: 'te-spin 0.7s linear infinite',
        margin: '0 auto',
      }} />
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────
const styles = {
  center: {
    padding: '28px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  infoBox: {
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    marginBottom: '14px',
  },
  warningBox: {
    padding: '12px 14px',
    background: 'rgba(239,68,68,0.07)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '10px',
    marginBottom: '14px',
  },
  customRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    marginBottom: '12px',
  },
  errorBox: {
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.07)',
    border: '1px solid rgba(239,68,68,0.18)',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '12px',
    fontFamily: 'Quicksand, sans-serif',
  },
  ghostBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    fontFamily: 'Quicksand, sans-serif',
  },
  primaryBtn: {
    padding: '9px 18px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(120deg, #0400ff, #4ce3f7)',
    color: '#fff',
    fontWeight: '700',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'Quicksand, sans-serif',
    flexShrink: 0,
  },
  confirmTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: '14px',
    margin: 0,
    fontFamily: 'Quicksand, sans-serif',
  },
  confirmSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '12px',
    margin: '2px 0 0',
    fontFamily: 'Quicksand, sans-serif',
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '12px',
    fontFamily: 'Quicksand, sans-serif',
  },
};