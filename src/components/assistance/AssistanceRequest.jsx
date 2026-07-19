import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ASSISTANCE_SERVICES,
  createAssistanceRequest,
  getCurrentLocation,
  getActiveAssistance,
  cancelAssistanceRequest,
} from '../../utils/assistanceService';
import ServiceStatus from './ServiceStatus';

/**
 * AssistanceRequest.jsx — Production Grade
 *
 * Changes vs previous version:
 * - Addon gate: if booking.addons does not include the Roadside Assistance
 *   addon (id 3 or name includes "roadside"), shows a locked state with
 *   a clear explanation instead of the service list.
 * - Demo mode bypass: demo bookings (id starts with "demo-") skip the gate
 *   so the feature is fully testable in demo mode.
 * - Gate check is a pure function — no extra state needed.
 * - All original logic (steps, notices, tracking, cancel) unchanged.
 */

// ── Addon gate check ──────────────────────────────────────
function hasRoadsideAddon(booking) {
  // Demo mode: always allow
  if (!booking || booking?.id?.startsWith('demo-')) return true;

  // No addons array at all — not purchased
  if (!Array.isArray(booking.addons) || booking.addons.length === 0) return false;

  return booking.addons.some(
    (a) =>
      a.id === 3 ||
      a.name?.toLowerCase().includes('roadside') ||
      a.name?.toLowerCase().includes('assistance')
  );
}

// ── Locked state UI ───────────────────────────────────────
function AssistanceLocked() {
  const services = [
    { icon: '🔧', label: 'Flat tyre assistance' },
    { icon: '🔋', label: 'Battery jumpstart' },
    { icon: '⛽', label: 'Emergency fuel delivery' },
    { icon: '🔓', label: 'Lockout help' },
    { icon: '🚛', label: 'Vehicle towing' },
    { icon: '⚙️', label: 'Minor mechanical repairs' },
  ];

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Lock banner */}
      <div style={{
        padding: '16px',
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.18)',
        borderRadius: '14px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <span style={{ fontSize: '28px', lineHeight: 1, flexShrink: 0 }}>🔒</span>
        <div>
          <p style={{
            color: '#f59e0b', fontWeight: '800', fontSize: '13px',
            margin: '0 0 5px', fontFamily: 'Quicksand, sans-serif',
          }}>
            Roadside Assistance Not Included
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.45)', fontSize: '11.5px',
            margin: 0, lineHeight: 1.55, fontFamily: 'Quicksand, sans-serif',
          }}>
            This add-on was not selected during booking. Add it on your next booking to unlock 24/7 on-road support.
          </p>
        </div>
      </div>

      {/* What's included preview */}
      <p style={{
        color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        margin: '0 0 8px', fontFamily: 'Quicksand, sans-serif',
      }}>
        What you'd get
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        {services.map(({ icon, label }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '9px',
            opacity: 0.5,
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
            <span style={{
              color: 'rgba(255,255,255,0.5)', fontSize: '12px',
              fontFamily: 'Quicksand, sans-serif',
            }}>
              {label}
            </span>
            <span style={{
              marginLeft: 'auto', fontSize: '14px', color: 'rgba(255,255,255,0.15)',
            }}>🔒</span>
          </div>
        ))}
      </div>

      {/* Emergency fallback */}
      <div style={{
        padding: '12px 14px',
        background: 'rgba(239,68,68,0.06)',
        border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: '10px',
      }}>
        <p style={{
          color: '#ef4444', fontSize: '11px', fontWeight: '700',
          margin: '0 0 4px', fontFamily: 'Quicksand, sans-serif',
        }}>
          🚨 Emergency right now?
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.4)', fontSize: '11px',
          margin: 0, lineHeight: 1.5, fontFamily: 'Quicksand, sans-serif',
        }}>
          Use the <strong style={{ color: 'rgba(255,255,255,0.65)' }}>Emergency Hub</strong> above to contact QuickWheels support or call emergency services directly.
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
export default function AssistanceRequest({ booking }) {
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingActive, setCheckingActive] = useState(true);
  const [notice, setNotice] = useState(null); // { type: 'success'|'error'|'warn', message }
  const [step, setStep] = useState('select'); // select | confirm | tracking
  const successTimerRef = useRef(null);

  // ── Gate check ────────────────────────────────────────
  const addonUnlocked = hasRoadsideAddon(booking);

  useEffect(() => {
    checkActiveRequest();
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, [user]);

  async function checkActiveRequest() {
    if (!user) { setCheckingActive(false); return; }
    setCheckingActive(true);
    try {
      const active = await getActiveAssistance(user.uid);
      if (active) {
        setActiveRequest(active);
        setStep('tracking');
      }
    } finally {
      setCheckingActive(false);
    }
  }

  function goToSelect() {
    setSelectedService(null);
    setStep('select');
    setNotice(null);
  }

  function handleSelectService(serviceKey) {
    setSelectedService(serviceKey);
    setStep('confirm');
    setNotice(null);
  }

  async function handleConfirmRequest() {
    if (!selectedService || !user || loading) return;
    setLoading(true);
    setNotice(null);

    let location;
    try {
      location = await getCurrentLocation();
    } catch (locErr) {
      setNotice({ type: 'error', message: `📍 ${locErr.message}` });
      setLoading(false);
      return;
    }

    try {
      const result = await createAssistanceRequest(user.uid, selectedService, location, booking);
      if (result.success) {
        setActiveRequest(result);
        setStep('tracking');
        setNotice({ type: 'success', message: '✅ Assistance is on the way!' });
        successTimerRef.current = setTimeout(() => setNotice(null), 4000);
      } else {
        setNotice({ type: 'error', message: result.error || 'Failed to request assistance. Please try again.' });
      }
    } catch (err) {
      console.error('Request error:', err);
      setNotice({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelRequest() {
    if (!activeRequest?.id || loading) return;
    setLoading(true);
    setNotice(null);
    try {
      const result = await cancelAssistanceRequest(activeRequest.id, 'Cancelled by user');
      if (result.success) {
        setActiveRequest(null);
        setSelectedService(null);
        setStep('select');
        setNotice({ type: 'success', message: 'Request cancelled.' });
        successTimerRef.current = setTimeout(() => setNotice(null), 3000);
      } else {
        setNotice({ type: 'error', message: 'Failed to cancel. Please try again or call support.' });
      }
    } finally {
      setLoading(false);
    }
  }

  function NoticeBar() {
    if (!notice) return null;
    const colors = {
      success: { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.22)',  text: '#22c55e' },
      error:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.22)',  text: '#ef4444' },
      warn:    { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)', text: '#f59e0b' },
    };
    const c = colors[notice.type] || colors.error;
    return (
      <div style={{
        padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
        background: c.bg, border: `1px solid ${c.border}`,
        color: c.text, fontSize: '12px', fontWeight: '500', lineHeight: '1.45',
        fontFamily: 'Quicksand, sans-serif',
      }}>
        {notice.message}
      </div>
    );
  }

  // ── Gate: show locked state if addon not purchased ────
  if (!addonUnlocked) {
    return <AssistanceLocked />;
  }

  // ── Initial load ──────────────────────────────────────
  if (checkingActive) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
        <style>{`@keyframes ar-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{
          width: '26px', height: '26px', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#f59e0b',
          animation: 'ar-spin 0.8s linear infinite', margin: '0 auto 10px',
        }} />
        <span style={{ fontSize: '12px', fontFamily: 'Quicksand, sans-serif' }}>
          Checking for active requests...
        </span>
      </div>
    );
  }

  // ── Tracking View ─────────────────────────────────────
  if (step === 'tracking' && activeRequest) {
    return (
      <div>
        <NoticeBar />
        <ServiceStatus request={activeRequest} onCancel={handleCancelRequest} loading={loading} />
      </div>
    );
  }

  // ── Confirmation View ─────────────────────────────────
  if (step === 'confirm' && selectedService) {
    const service = ASSISTANCE_SERVICES[selectedService];
    return (
      <div>
        <button
          onClick={goToSelect}
          style={{
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
            fontSize: '12px', fontWeight: '600',
            fontFamily: 'Quicksand, sans-serif', padding: 0, marginBottom: '14px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
        >
          ← Back to services
        </button>

        <NoticeBar />

        <div style={{
          padding: '20px',
          background: `${service.color}08`,
          border: `1px solid ${service.color}28`,
          borderRadius: '16px',
          textAlign: 'center',
          marginBottom: '14px',
        }}>
          <div style={{ fontSize: '46px', marginBottom: '8px', lineHeight: 1 }}>{service.icon}</div>
          <h3 style={{ color: '#fff', margin: '0 0 4px', fontSize: '17px', fontWeight: '800', fontFamily: 'Quicksand, sans-serif' }}>
            {service.name}
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: '0 0 12px', fontFamily: 'Quicksand, sans-serif' }}>
            {service.description}
          </p>
          <div style={{ display: 'inline-block', padding: '6px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'Quicksand, sans-serif' }}>⏱ Estimated: </span>
            <span style={{ color: service.color, fontSize: '13px', fontWeight: '700', fontFamily: 'Quicksand, sans-serif' }}>
              {service.estimatedTime}
            </span>
          </div>
        </div>

        {booking && (
          <div style={{
            padding: '12px 14px', background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px',
            marginBottom: '14px', fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
            display: 'flex', flexDirection: 'column', gap: '4px',
            fontFamily: 'Quicksand, sans-serif',
          }}>
            <div>🚗 {booking.carModel}</div>
            <div>🔢 {booking.carNumberPlate || 'N/A'}</div>
            <div>🆔 Booking: {booking.bookingId}</div>
          </div>
        )}

        <button
          onClick={handleConfirmRequest}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: loading ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${service.color}, ${service.color}cc)`,
            color: loading ? 'rgba(255,255,255,0.35)' : '#fff',
            fontWeight: '800', fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'Quicksand, sans-serif',
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? '⏳ Requesting...' : `✅ Confirm ${service.name}`}
        </button>
      </div>
    );
  }

  // ── Service Selection View ────────────────────────────
  return (
    <div>
      <NoticeBar />

      <p style={{
        color: 'rgba(255,255,255,0.35)', fontSize: '12px',
        marginBottom: '14px', textAlign: 'center',
        fontFamily: 'Quicksand, sans-serif',
      }}>
        Select the type of assistance you need
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Object.entries(ASSISTANCE_SERVICES).map(([key, service]) => (
          <button
            key={key}
            onClick={() => handleSelectService(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
              textAlign: 'left', fontFamily: 'Quicksand, sans-serif', width: '100%',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${service.color}08`;
              e.currentTarget.style.borderColor = `${service.color}28`;
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: `${service.color}14`, border: `1px solid ${service.color}28`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
            }}>
              {service.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: '700', fontFamily: 'Quicksand, sans-serif' }}>
                {service.name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', marginTop: '2px', fontFamily: 'Quicksand, sans-serif' }}>
                {service.description}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ color: service.color, fontSize: '11px', fontWeight: '600', fontFamily: 'Quicksand, sans-serif' }}>
                ⏱ {service.estimatedTime}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}