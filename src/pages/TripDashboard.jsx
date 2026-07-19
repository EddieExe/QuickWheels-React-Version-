import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import RouteMap from "../components/RouteMap";
import WeatherWidget from "../components/WeatherWidget";
import TripTimeline from "../components/TripTimeline";
import TollCalculator from "../components/TollCalculator";
import AttractionsNearby from "../components/AttractionsNearby";
import LiveNavigation from "../components/LiveNavigation";
import EmergencyHub from "../components/emergency/emergencyHub";
import AssistanceRequest from "../components/assistance/AssistanceRequest";
import TripExtensionModal from "../components/TripExtensionModal";
import NotificationCenter from "../components/notifications/NotificationCenter";
import ThemeToggle from "../components/ThemeToggle";
import FuelStationsList from "../components/FuelStationsList";
import ServiceCentersList from "../components/ServiceCentersList";
import "../styles/tripDashboard.css";

/* ─────────────────────────────────────────────────────────────
   Section registry
   ───────────────────────────────────────────────────────────── */

const SECTIONS = [
  {
    id: "timeline",
    icon: "📋",
    label: "Trip Timeline",
    accent: "#6366f1",
    render: ({ b }) => <TripTimeline booking={b} />,
  },
  {
    id: "weather",
    icon: "🌤️",
    label: "Weather",
    accent: "#f59e0b",
    render: ({ b }) => <WeatherWidget location={b.pickup?.split(",")[0] || "Mumbai"} />,
  },
  {
    id: "fuel",
    icon: "⛽",
    label: "Fuel Stations En Route",
    accent: "#f97316",
    render: ({ b }) => <FuelStationsList pickup={b.pickup} dropoff={b.dropoff} />,
  },
  {
    id: "service",
    icon: "🔧",
    label: "Service Centers",
    accent: "#3b82f6",
    render: ({ b }) => <ServiceCentersList pickup={b.pickup} dropoff={b.dropoff} />,
  },
  {
    id: "extension",
    icon: "📅",
    label: "Extend Trip",
    accent: "#a855f7",
    render: ({ b, close }) => (
      <TripExtensionModal booking={b} onClose={close} onExtended={() => close()} />
    ),
  },
  {
    id: "toll",
    icon: "🛣️",
    label: "Toll Calculator",
    accent: "#eab308",
    render: ({ b }) => <TollCalculator pickup={b.pickup} dropoff={b.dropoff} />,
  },
  {
    id: "documents",
    icon: "📄",
    label: "Car Documents",
    accent: "#64748b",
    render: ({ b }) => <CarDocumentsPanel booking={b} />,
  },
  {
    id: "assistance",
    icon: "🛠️",
    label: "On-Road Assistance",
    accent: "#f59e0b",
    render: ({ b }) => <AssistanceRequest booking={b} />,
  },
  {
    id: "emergency",
    icon: "🚨",
    label: "Emergency Hub",
    accent: "#ef4444",
    render: ({ b }) => <EmergencyHub booking={b} />,
  },
  {
    id: "attractions",
    icon: "🏛️",
    label: "Explore Destination",
    accent: "#06b6d4",
    render: ({ b }) => <AttractionsNearby dropoff={b.dropoff} pickup={b.pickup} />,
  },
];


/* ─────────────────────────────────────────────────────────────
   Car Documents Panel
   ───────────────────────────────────────────────────────────── */

function CarDocumentsPanel({ booking: b }) {
  const rows = [
    {
      icon: "🚘",
      label: "Number Plate",
      value: b.carNumberPlate,
      mono: true,
      color: "#a78bfa",
    },
    {
      icon: "🛡️",
      label: "Insurance",
      value: b.carInsuranceInfo?.split(" - ")[0],
      color: "rgba(255,255,255,0.65)",
    },
    {
      icon: "📋",
      label: "RC Book",
      value: b.carRcBook,
      mono: true,
      color: "rgba(255,255,255,0.65)",
    },
    {
      icon: "✅",
      label: "PUC Valid Until",
      value: b.carPucCertificate,
      color: "#4ade80",
    },
    {
      icon: "🔧",
      label: "Last Service",
      value: b.carLastServiceDate,
      color: "rgba(255,255,255,0.65)",
    },
    {
      icon: "⭐",
      label: "Safety Rating",
      value: b.carSafetyRating ? `${b.carSafetyRating} / 5` : null,
      color: "#fbbf24",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {rows.map(({ icon, label, value, mono, color }) => (
        <div
          key={label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 13px",
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.055)",
            borderRadius: 11,
            transition: "background 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(99,102,241,0.06)";
            e.currentTarget.style.borderColor = "rgba(99,102,241,0.14)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.025)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)";
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.38)",
              fontSize: 11,
              fontFamily: "Quicksand, sans-serif",
              fontWeight: 600,
            }}
          >
            {icon} {label}
          </span>
          <span
            style={{
              color: color || "#fff",
              fontSize: 11,
              fontWeight: 800,
              fontFamily: mono ? "'Courier New', monospace" : "Quicksand, sans-serif",
              letterSpacing: mono ? "0.06em" : "normal",
            }}
          >
            {value || "N/A"}
          </span>
        </div>
      ))}
    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   Status colour map
   ───────────────────────────────────────────────────────────── */

const STATUS_META = {
  ongoing_trip:   { color: "#4ade80",  dotColor: "rgba(74,222,128,0.5)"  },
  return_pending: { color: "#fbbf24",  dotColor: "rgba(251,191,36,0.5)"  },
  pickup_awaited: { color: "#a5b4fc",  dotColor: "rgba(165,180,252,0.5)" },
  default:        { color: "#94a3b8",  dotColor: "rgba(148,163,184,0.5)" },
};


/* ─────────────────────────────────────────────────────────────
   DEMO BOOKING
   ───────────────────────────────────────────────────────────── */

const DEMO_BOOKING = {
  id: "demo-" + Date.now(),
  bookingId: "QW-DEMO-123456",
  carModel: "Toyota Fortuner 2024",
  carImage: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400",
  pickup: "Mumbai, Maharashtra, India",
  dropoff: "Pune, Maharashtra, India",
  pickupDate: new Date().toISOString().split("T")[0],
  dropoffDate: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
  days: 3,
  status: "ongoing_trip",
  total: 4500,
  currencySymbol: "₹",
  currency: "INR",
  carNumberPlate: "MH12 AB 1234",
  carInsuranceInfo: "ICICI Lombard - POL123456789",
  carRcBook: "RC-MH12-2024-789012",
  carPucCertificate: "2025-06-15",
  carLastServiceDate: "2024-12-01",
  carSafetyRating: 4,
  carTransmission: "Automatic",
  carFuel: "Diesel",
  carSeats: 7,
  carEmergencyKit: true,
  carGpsAvailable: true,
  createdAt: new Date(Date.now() - 86400000),
  addons: [{ id: 3, name: "Roadside Assistance" }],
};


/* ─────────────────────────────────────────────────────────────
   TripDashboard — main component
   ───────────────────────────────────────────────────────────── */

export default function TripDashboard() {
  const { user }                         = useAuth();
  const navigate                         = useNavigate();
  const { bookingId }                    = useParams();
  const [booking,       setBooking]      = useState(null);
  const [loading,       setLoading]      = useState(true);
  const [isDemoMode,    setIsDemoMode]   = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const rightPanelRef                    = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  /* ── Data loading ── */

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("demo") === "true") enableDemoMode();
    else if (bookingId)           loadBooking();
    else                          loadActiveBooking();
  }, [bookingId, user]);

  /* Scroll right panel to top when switching sections */
  useEffect(() => {
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeSection]);

  async function loadBooking() {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "bookings", bookingId));
      if (snap.exists()) setBooking({ id: snap.id, ...snap.data() });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadActiveBooking() {
    setLoading(true);
    setBooking(null);
    setLoading(false);
  }

  const enableDemoMode = useCallback(() => {
    setIsDemoMode(true);
    setBooking({ ...DEMO_BOOKING, id: "demo-" + Date.now() });
    setLoading(false);
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setBooking(null);
    setActiveSection(null);
    loadActiveBooking();
  }, []);

  const closeSection = useCallback(() => setActiveSection(null), []);


  /* ── Loading state ── */

  if (loading) {
    return (
      <div className="tdb-loading-root">
        <div className="tdb-loading-inner">
          <div className="tdb-spinner" />
          <p className="tdb-spinner-text">Loading trip dashboard…</p>
        </div>
      </div>
    );
  }


  /* ── Empty state ── */

  if (!booking) {
    return (
      <div className="tdb-empty-root">
        <div className="tdb-empty-icon">🚗</div>
        <h2 className="tdb-empty-title">No Active Trip</h2>
        <p className="tdb-empty-sub">
          No ongoing trips found. Start a booking from your profile, or preview
          all features in demo mode.
        </p>
        <div className="tdb-empty-actions">
          <button
            className="btn-primary"
            onClick={() => navigate("/profile", { state: { tab: "bookings" } })}
          >
            📋 My Bookings
          </button>
          <button className="btn-demo" onClick={enableDemoMode}>
            🎮 Demo Mode
          </button>
        </div>
      </div>
    );
  }


  /* ── Derived values ── */

  const activeSec = SECTIONS.find(s => s.id === activeSection);
  const destCity  = booking.dropoff?.split(",")[0] || "Destination";


  /* ── Main render ── */

  return (
    <div className="tdb-root">

      {/* ══ Ambient background glows ══ */}
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />
      <div className="ambient-glow glow-3" />

      {/* ══════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════ */}
      <header className="tdb-header">

        {/* — Left — */}
        <div className="tdb-header-left">
          <button className="tdb-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <span className="back-ic">‹</span>
          </button>

          <div className="tdb-branding">
            <h1 className="tdb-title">
              Drive<span>HQ</span> Explorer
            </h1>
            <div className="tdb-sub-wrapper">
              <span className="tdb-sub-id">#{booking.bookingId}</span>
              <span className="tdb-sub-sep">|</span>
              <span className="tdb-sub-model">{booking.carModel}</span>
            </div>
          </div>
        </div>

        {/* — Right — */}
        <div className="tdb-header-right">

          {isDemoMode && (
            <div className="tdb-demo-pill">
              <span className="pulse-dot" />
              SIMULATION MODE
              <button className="tdb-demo-x" onClick={exitDemoMode} aria-label="Exit demo">
                ✕
              </button>
            </div>
          )}

          <div className={`tdb-status-badge ${booking.status}`}>
            <div className="status-glow" />
            {booking.status.replace(/_/g, " ")}
          </div>

          <div className="tdb-header-actions">
            <NotificationCenter />
            <div className="action-sep" />
            <ThemeToggle />
          </div>
        </div>

      </header>


      {/* ══════════════════════════════════════════
          THREE-COLUMN BODY
      ══════════════════════════════════════════ */}
      <div className="tdb-body">

        {/* ──────────────────────────────────────
            COL LEFT 25%: Live Navigation
        ────────────────────────────────────── */}
        <aside className="tdb-col-left">
          <div className="tdb-left-inner">
            <LiveNavigation
              key={`nav-${booking.pickup}-${booking.dropoff}`}
              pickupAddress={booking.pickup}
              dropoffAddress={booking.dropoff}
            />
          </div>
        </aside>


        {/* ──────────────────────────────────────
            COL MIDDLE 50%: Map
        ────────────────────────────────────── */}
        <main className="tdb-col-mid">
          <div className="tdb-map-fill">
            <RouteMap
              pickup={booking.pickup}
              dropoff={booking.dropoff}
              progress={35}
            />
          </div>
        </main>


        {/* ──────────────────────────────────────
            COL RIGHT 25%: Nav / section detail
        ────────────────────────────────────── */}
        <aside className="tdb-col-right" ref={rightPanelRef}>

          {/* ── Section detail view ── */}
          {activeSection && activeSec && (
            <div className="tdb-sec-view">

              {/* Header */}
              <div className="tdb-sec-hd">
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15 }}>{activeSec.icon}</span>
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 12,
                      fontFamily: "Quicksand, sans-serif",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {activeSec.id === "attractions"
                      ? `Explore ${destCity}`
                      : activeSec.label}
                  </span>
                </span>
                <button
                  className="tdb-sec-close"
                  onClick={closeSection}
                  aria-label="Close section"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="tdb-sec-body">
                {activeSec.render({ b: booking, close: closeSection })}
              </div>

            </div>
          )}


          {/* ── Navigation button list ── */}
          {!activeSection && (
            <div className="tdb-right-nav">

              <div className="tdb-right-nav-sticky">
                {/* Car strip */}
                <div className="tdb-car-strip">
                  <img
                    src={booking.carImage}
                    alt={booking.carModel}
                    className="tdb-car-img"
                    onError={e => (e.target.style.display = "none")}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="tdb-car-name">{booking.carModel}</div>
                    <div className="tdb-car-plate">{booking.carNumberPlate || "—"}</div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right", flexShrink: 0 }}>
                    <div className="tdb-car-days">{booking.days}d</div>
                    <div className="tdb-car-total">
                      {booking.currencySymbol}
                      {booking.total?.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
                <div className="tdb-sep" />
              </div>

              <div className="tdb-right-scroll">
                {/* Section buttons */}
                {SECTIONS.map((s, i) => (
                  <button
                    key={s.id}
                    className="tdb-nav-btn"
                    onClick={() => setActiveSection(s.id)}
                    style={{
                      animationDelay: `${i * 20}ms`,
                      "--btn-accent": s.accent,
                    }}
                    aria-label={`Open ${s.label}`}
                  >
                    <span
                      className="tdb-nav-ic"
                      style={{
                        background: `${s.accent}14`,
                        border: `1px solid ${s.accent}28`,
                      }}
                    >
                      {s.icon}
                    </span>
                    <span className="tdb-nav-lbl">
                      {s.id === "attractions" ? `Explore ${destCity}` : s.label}
                    </span>
                    <span className="tdb-nav-chev" style={{ color: `${s.accent}55` }}>
                      ›
                    </span>
                  </button>
                ))}

                <div className="tdb-sep" />

                {/* Trip dates */}
                <div className="tdb-dates-row">
                  <div className="tdb-date-block">
                    <div className="tdb-date-lbl">Pickup</div>
                    <div className="tdb-date-val">
                      {booking.pickupDate
                        ? new Date(booking.pickupDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                  </div>
                  <div className="tdb-dates-arr">→</div>
                  <div className="tdb-date-block right">
                    <div className="tdb-date-lbl">Dropoff</div>
                    <div className="tdb-date-val">
                      {booking.dropoffDate
                        ? new Date(booking.dropoffDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}