import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  EMERGENCY_SERVICES,
  getUserEmergencyContact,
  getCurrentLocation,
  formatLocationMessage,
  sendEmergencySMS,
  sendEmergencyEmail,
  logEmergencyEvent,
  getNearbyHospitals,
} from '../../utils/emergencyHubService';
import SOSButton from './SOSButton';
import EmergencyContactCard from './EmergencyContactCard';

/* ─────────────────────────────────────────────────────────────
   Shared style tokens (all inline — no className dependencies)
   ───────────────────────────────────────────────────────────── */

const T = {
  fontFamily:  "'Quicksand', sans-serif",
  red:         '#ef4444',
  redSoft:     '#f87171',
  green:       '#4ade80',
  amber:       '#fbbf24',
  indigo:      '#a78bfa',
  textMuted:   'rgba(255,255,255,0.38)',
  textDim:     'rgba(255,255,255,0.22)',
  surfaceCard: 'rgba(255,255,255,0.025)',
  borderCard:  'rgba(255,255,255,0.06)',
};

const labelStyle = {
  fontSize: 9,
  color: T.textDim,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontFamily: T.fontFamily,
  margin: '0 0 10px',
};

/* ─────────────────────────────────────────────────────────────
   TAB DEFINITIONS
   ───────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'sos',       icon: '🚨', label: 'SOS'      },
  { id: 'hospitals', icon: '🏥', label: 'Hospitals' },
  { id: 'services',  icon: '📞', label: 'Services'  },
];

/* ─────────────────────────────────────────────────────────────
   CHECKLIST ITEM
   ───────────────────────────────────────────────────────────── */

function ChecklistItem({ ok, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, flexShrink: 0,
        background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${ok ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.2)'}`,
        color: ok ? T.green : T.redSoft,
        transition: 'all 0.2s',
      }}>
        {ok ? '✓' : '!'}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, fontFamily: T.fontFamily,
        color: ok ? 'rgba(255,255,255,0.52)' : 'rgba(248,113,113,0.75)',
      }}>
        {label}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ALERT STATUS BANNER
   ───────────────────────────────────────────────────────────── */

function AlertBanner({ status }) {
  if (!status) return null;
  const ok = status.ok;
  return (
    <div style={{
      padding: '11px 14px', marginBottom: 12, borderRadius: 12,
      background: ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`,
      color: ok ? T.green : T.redSoft,
      fontSize: 12, fontWeight: 600, fontFamily: T.fontFamily,
      lineHeight: 1.5,
      animation: 'eh-fade-in 0.25s ease',
    }}>
      {status.message}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   GPS STATUS CARD
   ───────────────────────────────────────────────────────────── */

function GPSStatusCard({ userLocation, locationError }) {
  if (locationError) {
    return (
      <div style={{
        padding: '10px 13px', marginBottom: 12, borderRadius: 11,
        background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)',
        color: 'rgba(245,158,11,0.88)', fontSize: 11, fontFamily: T.fontFamily,
        fontWeight: 600,
      }}>
        ⚠️ {locationError}
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div style={{
        marginBottom: 12, padding: '10px 13px',
        background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)',
        borderRadius: 11,
      }}>
        <p style={{
          color: 'rgba(245,158,11,0.8)', fontSize: 11, margin: 0,
          fontFamily: T.fontFamily, fontWeight: 600,
        }}>
          📍 GPS not available — allow location access for accurate SOS delivery
        </p>
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: 12, padding: '11px 14px',
      background: 'rgba(34,197,94,0.04)',
      border: '1px solid rgba(34,197,94,0.14)',
      borderRadius: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Pulsing dot */}
          <div style={{ position: 'relative', width: 8, height: 8, flexShrink: 0 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: T.green,
              position: 'absolute',
            }} />
            <div style={{
              position: 'absolute', inset: -4, borderRadius: '50%',
              background: 'rgba(74,222,128,0.25)',
              animation: 'eh-pulse 1.8s ease-in-out infinite',
            }} />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.48)', fontSize: 11, fontWeight: 600, fontFamily: T.fontFamily }}>
            GPS ready · ±{Math.round(userLocation.accuracy)}m accuracy
          </span>
        </div>
        <a
          href={userLocation.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: T.indigo, fontWeight: 700, fontSize: 10, fontFamily: T.fontFamily, textDecoration: 'none' }}
        >
          View ↗
        </a>
      </div>
      <div style={{
        marginTop: 5, fontSize: 10, color: T.textDim,
        fontFamily: "'Courier New', monospace", letterSpacing: '0.04em',
      }}>
        {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SAFETY CHECKLIST
   ───────────────────────────────────────────────────────────── */

function SafetyChecklist({ booking, emergencyContact, userLocation }) {
  const items = [
    { ok: !!booking?.carEmergencyKit,  label: 'Emergency kit in vehicle'    },
    { ok: !!booking?.carInsuranceInfo, label: 'Insurance details available'  },
    { ok: !!emergencyContact,          label: 'Emergency contact saved'      },
    { ok: !!userLocation,              label: 'Live GPS location active'     },
  ];
  const score = items.filter(i => i.ok).length;

  return (
    <div style={{
      marginTop: 14, padding: '13px 15px',
      background: T.surfaceCard, border: `1px solid ${T.borderCard}`,
      borderRadius: 13,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <p style={{ ...labelStyle, margin: 0 }}>🛡️ Safety Checklist</p>
        <span style={{
          fontSize: 10, fontWeight: 800, fontFamily: T.fontFamily,
          color: score === 4 ? T.green : score >= 2 ? T.amber : T.redSoft,
          background: score === 4 ? 'rgba(34,197,94,0.1)' : score >= 2 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${score === 4 ? 'rgba(34,197,94,0.2)' : score >= 2 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.18)'}`,
          padding: '2px 9px', borderRadius: 8,
        }}>
          {score}/4
        </span>
      </div>
      {items.map(({ ok, label }) => (
        <ChecklistItem key={label} ok={ok} label={label} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HOSPITAL CARD
   ───────────────────────────────────────────────────────────── */

function HospitalCard({ hospital, userLocation }) {
  const directionsUrl = userLocation
    ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${hospital.lat},${hospital.lng}&destination_place_id=${hospital.id}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}&destination_place_id=${hospital.id}&travelmode=driving`;

  return (
    <div style={{
      borderRadius: 15, overflow: 'hidden',
      background: T.surfaceCard,
      border: '1px solid rgba(239,68,68,0.1)',
      transition: 'border-color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.1)';  e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {hospital.photoUrl ? (
        <div style={{ height: 100, overflow: 'hidden', position: 'relative' }}>
          <img
            src={hospital.photoUrl}
            alt={hospital.name}
            onError={e => { e.target.style.display = 'none'; }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            padding: '3px 9px', borderRadius: 7,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
            color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: T.fontFamily,
          }}>
            📍 {hospital.distance}
          </div>
          {hospital.open !== null && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              padding: '3px 9px', borderRadius: 7,
              background: hospital.open ? 'rgba(34,197,94,0.88)' : 'rgba(239,68,68,0.88)',
              color: '#fff', fontSize: 10, fontWeight: 800, fontFamily: T.fontFamily,
              backdropFilter: 'blur(6px)',
            }}>
              ● {hospital.open ? 'Open' : 'Closed'}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          height: 52, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 30,
          background: 'rgba(239,68,68,0.05)',
        }}>
          🏥
        </div>
      )}

      <div style={{ padding: '13px 13px 12px' }}>
        {/* Name row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: '#fff', fontSize: 13, fontWeight: 800,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              fontFamily: T.fontFamily, letterSpacing: '-0.01em',
            }}>
              {hospital.name}
            </div>
            <div style={{
              color: T.textMuted, fontSize: 10, marginTop: 3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              fontFamily: T.fontFamily,
            }}>
              📌 {hospital.address}
            </div>
          </div>
          {hospital.rating > 0 && (
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <div style={{ color: T.amber, fontSize: 11, fontWeight: 800, fontFamily: T.fontFamily }}>
                ★ {hospital.rating.toFixed(1)}
              </div>
              {hospital.totalRatings > 0 && (
                <div style={{ color: T.textDim, fontSize: 9, fontFamily: T.fontFamily }}>
                  ({hospital.totalRatings.toLocaleString('en-IN')})
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phone row */}
        <div style={{
          padding: '7px 11px', marginBottom: 10,
          background: 'rgba(239,68,68,0.05)', borderRadius: 9,
          fontSize: 12, display: 'flex', alignItems: 'center', gap: 7,
          border: '1px solid rgba(239,68,68,0.1)',
          fontFamily: T.fontFamily,
        }}>
          <span>📞</span>
          <a href={`tel:${hospital.phone}`} style={{ color: T.redSoft, fontWeight: 800, textDecoration: 'none' }}>
            {hospital.phone}
          </a>
          {!hospital.open && hospital.open !== null && (
            <span style={{ marginLeft: 'auto', color: T.redSoft, fontSize: 10, fontWeight: 700 }}>Currently Closed</span>
          )}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 7 }}>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={userLocation ? 'Navigate from your current location' : 'Open in Google Maps'}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 9, textAlign: 'center',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff', fontSize: 12, fontWeight: 800,
              textDecoration: 'none', fontFamily: T.fontFamily,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            🧭 Route
          </a>
          <a
            href={`tel:${hospital.phone}`}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 9, textAlign: 'center',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)',
              color: T.redSoft, fontSize: 12, fontWeight: 800,
              textDecoration: 'none', fontFamily: T.fontFamily,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          >
            📞 Call
          </a>
          <a
            href={hospital.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 12px', borderRadius: 9,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.borderCard}`,
              color: T.textMuted, fontSize: 12, textDecoration: 'none',
              fontFamily: T.fontFamily, transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          >
            🗺️
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LOADING SPINNER (shared)
   ───────────────────────────────────────────────────────────── */

function Spinner({ color = T.red, size = 24 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${color}20`,
      borderTopColor: color,
      animation: 'eh-spin 0.75s linear infinite',
      flexShrink: 0,
    }} />
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────── */

export default function EmergencyHub({ booking, onOpenContactModal }) {
  const { user } = useAuth();
  const [emergencyContact, setEmergencyContact] = useState(null);
  const [userLocation,     setUserLocation]     = useState(null);
  const [locationError,    setLocationError]    = useState(null);
  const [nearbyHospitals,  setNearbyHospitals]  = useState([]);
  const [sendingAlert,     setSendingAlert]     = useState(false);
  const [alertStatus,      setAlertStatus]      = useState(null);
  const [loadingData,      setLoadingData]      = useState(true);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [activeTab,        setActiveTab]        = useState('sos');
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadEmergencyData();
    }
  }, []);

  async function loadEmergencyData() {
    setLoadingData(true);
    try {
      let contact = null;
      try {
        if (user?.uid) contact = await getUserEmergencyContact(user.uid);
      } catch (e) {
        console.warn('[EmergencyHub] contact fetch failed:', e.message);
      }
      setEmergencyContact(contact);

      let lat = null, lng = null;
      try {
        const loc = await Promise.race([
          getCurrentLocation(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('GPS timeout')), 3000)),
        ]);
        setUserLocation(loc);
        lat = loc.lat; lng = loc.lng;
      } catch (gpsErr) {
        setLocationError('GPS unavailable — showing hospitals near your destination.');
        try {
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          if (apiKey && booking?.dropoff) {
            const geo = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(booking.dropoff)}&key=${apiKey}`
            ).then(r => r.json());
            const loc = geo.results?.[0]?.geometry?.location;
            if (loc) { lat = loc.lat; lng = loc.lng; }
          }
        } catch (geocodeErr) {
          console.warn('[EmergencyHub] geocode fallback failed:', geocodeErr.message);
        }
      }

      if (lat && lng) {
        setLoadingHospitals(true);
        try {
          const hospitals = await getNearbyHospitals(lat, lng);
          setNearbyHospitals(hospitals);
        } catch (e) {
          console.warn('[EmergencyHub] hospitals fetch failed:', e.message);
        } finally {
          setLoadingHospitals(false);
        }
      }
    } catch (e) {
      console.error('[EmergencyHub] unexpected error:', e);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSOSActivation() {
    setSendingAlert(true);
    setAlertStatus(null);

    let location = userLocation;
    try {
      const fresh = await Promise.race([
        getCurrentLocation(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('GPS timeout')), 5000)),
      ]);
      setUserLocation(fresh);
      location = fresh;
      const hospitals = await getNearbyHospitals(fresh.lat, fresh.lng);
      setNearbyHospitals(hospitals);
    } catch { /* use last known */ }

    const results = { sms: false, email: false, log: false };
    const message = formatLocationMessage(location, booking);

    try {
      if (emergencyContact?.phone) {
        const r = await sendEmergencySMS(emergencyContact.phone, message);
        results.sms = r.success;
      }
    } catch (e) { console.warn('SMS failed:', e.message); }

    try {
      if (user) {
        const r = await sendEmergencyEmail(user, location, booking);
        results.email = r.success;
      }
    } catch (e) { console.warn('Email failed:', e.message); }

    try {
      if (user?.uid) {
        await logEmergencyEvent(user.uid, {
          type: 'sos', location,
          bookingId: booking?.bookingId,
          emergencyContactId: emergencyContact?.id,
        });
        results.log = true;
      }
    } catch (e) { console.warn('Log failed:', e.message); }

    const anySuccess = results.sms || results.email || results.log;
    setAlertStatus({
      ok: anySuccess,
      message: anySuccess
        ? `✅ Alerts dispatched!${results.sms ? ' 📱 SMS' : ''}${results.email ? ' 📧 Email' : ''} sent to emergency contacts & support.`
        : '⚠️ Could not send automatic alerts. Call emergency services (112) directly.',
    });
    setSendingAlert(false);
  }

  function handleSOSReset() { setAlertStatus(null); }

  /* ── Keyframes injected once ── */
  const keyframes = `
    @keyframes eh-spin    { to { transform: rotate(360deg) } }
    @keyframes eh-fade-in { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
    @keyframes eh-pulse   { 0%,100% { transform:scale(1);opacity:.7 } 50% { transform:scale(1.9);opacity:0 } }
  `;

  /* ── Loading state ── */
  if (loadingData) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        <style>{keyframes}</style>
        <Spinner size={30} />
        <div style={{ marginTop: 12 }}>
          <span style={{ fontSize: 12, color: T.textMuted, fontFamily: T.fontFamily }}>
            Loading emergency data…
          </span>
          <p style={{ fontSize: 10, color: T.textDim, marginTop: 5, fontFamily: T.fontFamily }}>
            Emergency numbers are always available in the Services tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{keyframes}</style>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 16,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 13, padding: 4,
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '9px 6px', borderRadius: 10,
                border: active ? '1px solid rgba(239,68,68,0.22)' : '1px solid transparent',
                background: active ? 'rgba(239,68,68,0.1)' : 'transparent',
                color: active ? T.redSoft : T.textMuted,
                fontSize: 11, fontWeight: 700, fontFamily: T.fontFamily,
                cursor: 'pointer', transition: 'all 0.18s',
                letterSpacing: '0.01em',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════
          SOS TAB
      ══════════════════════════ */}
      {activeTab === 'sos' && (
        <div style={{ animation: 'eh-fade-in 0.2s ease' }}>
          <div style={{ marginBottom: 18, paddingTop: 4 }}>
            <SOSButton
              onActivate={handleSOSActivation}
              onReset={handleSOSReset}
              disabled={sendingAlert}
            />
          </div>

          {sendingAlert && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
              padding: '11px 16px', marginBottom: 12,
              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
              borderRadius: 11, fontSize: 12, color: T.redSoft, fontWeight: 700,
              fontFamily: T.fontFamily,
            }}>
              <Spinner size={16} />
              Sending emergency alerts…
            </div>
          )}

          <AlertBanner status={alertStatus} />

          <GPSStatusCard userLocation={userLocation} locationError={locationError} />

          <EmergencyContactCard contact={emergencyContact} onOpenModal={onOpenContactModal} />

          <SafetyChecklist
            booking={booking}
            emergencyContact={emergencyContact}
            userLocation={userLocation}
          />
        </div>
      )}

      {/* ══════════════════════════
          HOSPITALS TAB
      ══════════════════════════ */}
      {activeTab === 'hospitals' && (
        <div style={{ animation: 'eh-fade-in 0.2s ease' }}>
          {/* Ambulance CTA */}
          <a
            href="tel:108"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '13px', borderRadius: 13, marginBottom: 14,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.16), rgba(239,68,68,0.06))',
              border: '2px solid rgba(239,68,68,0.38)',
              color: T.redSoft, fontWeight: 800, fontSize: 14,
              textDecoration: 'none', fontFamily: T.fontFamily,
              transition: 'all 0.18s', letterSpacing: '0.01em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.24), rgba(239,68,68,0.1))';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.16), rgba(239,68,68,0.06))';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🚑 Call Ambulance — 108
          </a>

          <p style={labelStyle}>🏥 Nearby Hospitals &amp; Emergency Care</p>

          {loadingHospitals && (
            <div style={{ padding: '22px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                <Spinner size={26} />
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, fontFamily: T.fontFamily, fontWeight: 600 }}>
                Finding nearby hospitals…
              </div>
            </div>
          )}

          {!loadingHospitals && nearbyHospitals.length === 0 && (
            <div style={{
              padding: '18px', textAlign: 'center', borderRadius: 13,
              background: T.surfaceCard, border: `1px solid ${T.borderCard}`,
              marginBottom: 12,
            }}>
              <p style={{ color: T.textMuted, fontSize: 13, margin: '0 0 10px', fontFamily: T.fontFamily }}>
                No hospitals found automatically.
              </p>
              <a
                href="https://www.google.com/maps/search/hospital+near+me"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block', padding: '8px 20px', borderRadius: 9,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)',
                  color: T.redSoft, fontSize: 12, fontWeight: 800,
                  textDecoration: 'none', fontFamily: T.fontFamily,
                }}
              >
                🗺️ Search Hospitals on Maps
              </a>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nearbyHospitals.map(hospital => (
              <HospitalCard key={hospital.id} hospital={hospital} userLocation={userLocation} />
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════
          SERVICES TAB
      ══════════════════════════ */}
      {activeTab === 'services' && (
        <div style={{ animation: 'eh-fade-in 0.2s ease' }}>
          <p style={labelStyle}>📞 Emergency Services</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {Object.values(EMERGENCY_SERVICES).map(service => (
              <a
                key={service.id}
                href={`tel:${service.phone}`}
                style={{
                  padding: '15px 10px', borderRadius: 13, textDecoration: 'none',
                  border: `1px solid ${service.color}22`,
                  background: `${service.color}06`,
                  textAlign: 'center', transition: 'all 0.16s', display: 'block',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${service.color}12`;
                  e.currentTarget.style.borderColor = `${service.color}35`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = `${service.color}06`;
                  e.currentTarget.style.borderColor = `${service.color}22`;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: 26, marginBottom: 6 }}>{service.icon}</div>
                <div style={{
                  color: service.color, fontSize: 11, fontWeight: 800,
                  lineHeight: 1.25, fontFamily: T.fontFamily, marginBottom: 6,
                }}>
                  {service.name}
                </div>
                <div style={{
                  padding: '3px 9px', borderRadius: 7, display: 'inline-block',
                  background: `${service.color}18`, color: service.color,
                  fontSize: 13, fontWeight: 800, fontFamily: T.fontFamily,
                  letterSpacing: '0.04em',
                }}>
                  {service.phone}
                </div>
              </a>
            ))}
          </div>

          {/* Booking reference */}
          {booking && (
            <div style={{
              padding: '13px 15px',
              background: T.surfaceCard, border: `1px solid ${T.borderCard}`,
              borderRadius: 12, marginBottom: 12,
            }}>
              <p style={labelStyle}>📋 Provide to responders</p>
              {[
                { label: 'Vehicle',    value: booking.carModel },
                { label: 'Plate',      value: booking.carNumberPlate },
                { label: 'Insurance',  value: booking.carInsuranceInfo?.split(' - ')[0] },
                { label: 'Booking ID', value: booking.bookingId },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 5,
                  padding: '5px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}>
                  <span style={{ color: T.textDim, fontSize: 11, fontFamily: T.fontFamily, fontWeight: 600 }}>
                    {label}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 800, fontFamily: T.fontFamily }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}

          <EmergencyContactCard contact={emergencyContact} onOpenModal={onOpenContactModal} />
        </div>
      )}
    </div>
  );
}