import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const timeAgo = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const sec = Math.floor((Date.now() - d) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return Math.floor(sec / 60) + "m ago";
  if (sec < 86400) return Math.floor(sec / 3600) + "h ago";
  return Math.floor(sec / 86400) + "d ago";
};

const STATUS_STYLES = {
  confirmed: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.25)",
    label: "Confirmed",
  },
  completed: {
    color: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.25)",
    label: "Completed",
  },
  pending_approval: {
    color: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.25)",
    label: "Pending",
  },
  dealer_confirmed: {
    color: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.25)",
    label: "Dealer Approved",
  },
  active: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.25)",
    label: "Active",
  },
  on_hold: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    label: "On Hold",
  },
  cancelled: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    label: "Cancelled",
  },
  cancelled_dealer: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.25)",
    label: "Cancelled by Dealer",
  },
  cancelled_admin: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    label: "Cancelled by Admin",
  },
  cancelled_user: {
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.25)",
    label: "Cancelled by User",
  },
  rejected: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    label: "Rejected",
  },
  no_show: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.25)",
    label: "No Show",
  },
};

function getEffKey(b) {
  if (b.status === "cancelled") {
    if (b.cancelledBy === "dealer") return "cancelled_dealer";
    if (b.cancelledBy === "admin") return "cancelled_admin";
    if (b.cancelledBy === "user") return "cancelled_user";
  }
  return b.status;
}

function StatusPill({ booking }) {
  const key = getEffKey(booking);
  const s = STATUS_STYLES[key] || STATUS_STYLES.confirmed;
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "9px",
        fontWeight: "800",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
      }}
    >
      <span
        style={{
          width: "4px",
          height: "4px",
          borderRadius: "50%",
          background: s.color,
        }}
      />
      {s.label}
    </span>
  );
}

function StatCard({ label, value, sub, color = "#a855f7", icon }) {
  return (
    <div
      style={{
        padding: "16px 18px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.045)";
        e.currentTarget.style.borderColor = `${color}33`;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.025)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          flexShrink: 0,
          background: `${color}12`,
          border: `1px solid ${color}25`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            margin: "0 0 2px",
            fontSize: "18px",
            fontWeight: "800",
            color: "#fff",
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "10px",
            fontWeight: "600",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </p>
        {sub && (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "10px",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function BookingRow({ booking }) {
  const effKey = getEffKey(booking);
  const s = STATUS_STYLES[effKey] || STATUS_STYLES.confirmed;
  const isGood = [
    "confirmed",
    "completed",
    "dealer_confirmed",
    "active",
  ].includes(effKey);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 140px 120px 100px 90px",
        gap: "12px",
        alignItems: "center",
        padding: "12px 16px",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderLeft: `3px solid ${s.color}`,
        transition: "all 0.2s ease",
        marginBottom: "6px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.transform = "translateX(3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: "0 0 1px",
            color: "#fff",
            fontSize: "13px",
            fontWeight: "700",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {booking.userName || booking.userEmail || "—"}
        </p>
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.3)",
            fontSize: "10px",
            fontFamily: "monospace",
          }}
        >
          #{booking.bookingId}
        </p>
      </div>
      <div>
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.6)",
            fontSize: "11px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {booking.pickup}→{booking.dropoff}
        </p>
        <p
          style={{
            margin: "2px 0 0",
            color: "rgba(255,255,255,0.25)",
            fontSize: "10px",
          }}
        >
          {booking.days}d·{booking.tripType || "One Way"}
        </p>
      </div>
      <p
        style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "11px" }}
      >
        {booking.pickupDate || booking.date || "—"}
      </p>
      <StatusPill booking={booking} />
      <p
        style={{
          margin: 0,
          fontSize: "14px",
          fontWeight: "800",
          color: isGood ? "#22c55e" : "#ef4444",
          textAlign: "right",
        }}
      >
        ${booking.total?.toLocaleString() || "0"}
      </p>
    </div>
  );
}

export default function CarDetailModal({
  car,
  bookings,
  onClose,
  onEdit,
  onToggleAvailability,
  onDelete,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [deleteGuard, setDeleteGuard] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [imgTransitioning, setImgTransitioning] = useState(false);

  const carImages = car.images?.length ? car.images : car.image ? [car.image] : [];
  const hasMultipleImages = carImages.length > 1;

  function goToImage(index) {
    if (index === activeImgIndex || imgTransitioning) return;
    setImgTransitioning(true);
    setTimeout(() => {
      setActiveImgIndex(index);
      setImgLoaded(false);
      setImgTransitioning(false);
    }, 180);
  }

  const carBookings = useMemo(
    () =>
      (bookings || [])
        .filter((b) => b.carModel === car.model || b.carId === car.id)
        .sort(
          (a, b) =>
            (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0),
        ),
    [bookings, car],
  );

  const stats = useMemo(() => {
    const revenue = carBookings
      .filter((b) =>
        ["confirmed", "completed", "dealer_confirmed", "active"].includes(
          b.status,
        ),
      )
      .reduce((s, b) => s + (b.total || 0), 0);
    const completed = carBookings.filter(
      (b) => b.status === "completed",
    ).length;
    const active = carBookings.filter((b) =>
      ["active", "confirmed", "dealer_confirmed"].includes(b.status),
    ).length;
    const cancelled = carBookings.filter(
      (b) => b.status === "cancelled" || b.status?.startsWith("cancelled_"),
    ).length;
    const avgValue = carBookings.length
      ? revenue / Math.max(completed + active, 1)
      : 0;
    const avgDays = carBookings.length
      ? carBookings.reduce((s, b) => s + (b.days || 0), 0) / carBookings.length
      : 0;
    const topCustomer = (() => {
      const map = {};
      carBookings.forEach((b) => {
        const k = b.userEmail || b.userName;
        if (k) map[k] = (map[k] || 0) + 1;
      });
      return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    })();
    return {
      revenue,
      completed,
      active,
      cancelled,
      avgValue,
      avgDays,
      topCustomer,
      total: carBookings.length,
    };
  }, [carBookings]);

  const monthlyData = useMemo(() => {
    const map = {};
    carBookings.forEach((b) => {
      if (!b.createdAt) return;
      const d = b.createdAt?.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt);
      const key = d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      if (!map[key]) map[key] = { label: key, revenue: 0, bookings: 0 };
      map[key].bookings++;
      if (["confirmed", "completed", "dealer_confirmed"].includes(b.status))
        map[key].revenue += b.total || 0;
    });
    return Object.values(map).slice(-6);
  }, [carBookings]);

  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "bookings", label: `Bookings (${carBookings.length})` },
    { id: "details", label: "Car Details" },
  ];

  return (
    <>
      <style>{`
        @keyframes cdm-slideIn {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cdm-fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cdm-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .5; transform: scale(.75); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .cdm-scroll::-webkit-scrollbar { width: 4px; }
        .cdm-scroll::-webkit-scrollbar-track { background: transparent; }
        .cdm-scroll::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.2); border-radius: 4px; }
        .cdm-scroll::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.4); }
        .cdm-tab { transition: all .2s ease; }
        .cdm-tab:hover { color: #fff !important; }
        .cdm-close:hover {
          background: rgba(239,68,68,0.15) !important;
          color: #ef4444 !important;
          transform: rotate(90deg);
        }
        .cdm-gallery-btn {
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
        }
        .cdm-gallery-btn:hover {
          background: rgba(147,51,234,0.25) !important;
          border-color: #a855f7 !important;
        }
        .cdm-danger-zone {
          background: rgba(239,68,68,0.03) !important;
          border: 1px solid rgba(239,68,68,0.15) !important;
          border-radius: 16px !important;
          padding: 20px !important;
        }
        .cdm-remove-btn {
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
          background: rgba(239,68,68,0.08) !important;
          border: 1px solid rgba(239,68,68,0.3) !important;
          color: #ef4444 !important;
          padding: 8px 18px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          font-family: "Quicksand", sans-serif !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
        }
        .cdm-remove-btn:hover {
          background: rgba(239,68,68,0.15) !important;
          border-color: rgba(239,68,68,0.5) !important;
          transform: translateY(-2px) !important;
        }
        .cdm-confirm-remove {
          background: #ef4444 !important;
          color: #fff !important;
          padding: 7px 16px !important;
          border-radius: 8px !important;
          border: none !important;
          font-family: "Quicksand", sans-serif !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          cursor: pointer !important;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
        }
        .cdm-confirm-remove:hover {
          background: #dc2626 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 20px rgba(239,68,68,0.3) !important;
        }
        .cdm-cancel-remove {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: rgba(255,255,255,0.6) !important;
          padding: 7px 14px !important;
          border-radius: 8px !important;
          font-family: "Quicksand", sans-serif !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          cursor: pointer !important;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
        }
        .cdm-cancel-remove:hover {
          background: rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }
      `}</style>

      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: "rgba(8,8,16,0.85)",
          backdropFilter: "blur(16px)",
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: "0",
          zIndex: 2001,
          background: "linear-gradient(170deg, #120e20 0%, #0c0c16 100%)",
          border: "1px solid rgba(147,51,234,0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "cdm-slideIn 0.35s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(147,51,234,0.05)",
          fontFamily: "Quicksand,sans-serif",
          width: "min(780px, 90vw)",
          maxHeight: "90vh",
          margin: "auto",
          borderRadius: "20px",
        }}
      >
        {/* Hero Image Section */}
        <div
          style={{
            position: "relative",
            height: "220px",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <img
            src={carImages[activeImgIndex] || "/Images/placeholder-car.png"}
            alt={car.model}
            onLoad={() => setImgLoaded(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "opacity 0.3s ease",
              opacity: imgLoaded && !imgTransitioning ? 1 : 0,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top,rgba(10,10,22,1) 0%,rgba(10,10,22,0.5) 50%,rgba(10,10,22,0.15) 100%)",
            }}
          />

          {hasMultipleImages && (
            <>
              <button
                onClick={() => goToImage((activeImgIndex - 1 + carImages.length) % carImages.length)}
                className="cdm-gallery-btn"
                style={{
                  position: "absolute", left: "12px", top: "50%",
                  transform: "translateY(-50%)", width: "32px", height: "32px",
                  borderRadius: "50%", background: "rgba(10,10,22,0.7)",
                  backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  zIndex: 5,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <button
                onClick={() => goToImage((activeImgIndex + 1) % carImages.length)}
                className="cdm-gallery-btn"
                style={{
                  position: "absolute", right: "12px", top: "50%",
                  transform: "translateY(-50%)", width: "32px", height: "32px",
                  borderRadius: "50%", background: "rgba(10,10,22,0.7)",
                  backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  zIndex: 5,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <div style={{
                position: "absolute", bottom: "58px", left: "50%",
                transform: "translateX(-50%)", display: "flex", gap: "6px", zIndex: 5,
              }}>
                {carImages.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => goToImage(i)}
                    style={{
                      width: i === activeImgIndex ? "18px" : "5px",
                      height: "5px", borderRadius: "3px", cursor: "pointer",
                      background: i === activeImgIndex ? "#a855f7" : "rgba(255,255,255,0.4)",
                      transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                      boxShadow: i === activeImgIndex ? "0 0 12px rgba(168,85,247,0.5)" : "none",
                    }}
                  />
                ))}
              </div>

              <div style={{
                position: "absolute", bottom: "58px", right: "16px",
                background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
                padding: "3px 9px", fontSize: "10px", fontWeight: "700",
                color: "rgba(255,255,255,0.7)", zIndex: 5,
              }}>
                {activeImgIndex + 1} / {carImages.length}
              </div>
            </>
          )}

          {!imgLoaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s infinite",
              }}
            />
          )}

          <button
            className="cdm-close"
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              padding: "5px 13px",
              borderRadius: "20px",
              fontSize: "10px",
              fontWeight: "800",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: car.isAvailable
                ? "rgba(34,197,94,0.85)"
                : "rgba(239,68,68,0.85)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${car.isAvailable ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
              color: "#fff",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "#fff",
                animation: "cdm-pulse 2s infinite",
              }}
            />
            {car.isAvailable ? "LIVE" : "HIDDEN"}
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "16px",
              left: "20px",
              right: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 3px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase",
                    letterSpacing: "1.5px",
                  }}
                >
                  {car.type}
                </p>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "26px",
                    lineHeight: 1,
                  }}
                  className="qw_shine_heading"
                >
                  {car.model}
                </h2>
              </div>
              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "#a855f7",
                    lineHeight: 1,
                  }}
                >
                  ${car.price}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: "700",
                  }}
                >
                  PER DAY
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            padding: "16px 20px 0",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className="cdm-tab"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "9px 18px",
                borderRadius: "10px 10px 0 0",
                border: "none",
                cursor: "pointer",
                fontFamily: "Quicksand,sans-serif",
                fontSize: "13px",
                fontWeight: activeTab === tab.id ? "700" : "500",
                color:
                  activeTab === tab.id ? "#a855f7" : "rgba(255,255,255,0.4)",
                background:
                  activeTab === tab.id
                    ? "rgba(147,51,234,0.08)"
                    : "transparent",
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid #a855f7"
                    : "2px solid transparent",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: "8px",
              paddingBottom: "12px",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => onEdit(car)}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
                fontFamily: "Quicksand,sans-serif",
                fontWeight: "700",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(147,51,234,0.1)";
                e.currentTarget.style.borderColor = "rgba(147,51,234,0.3)";
                e.currentTarget.style.color = "#c084fc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => onToggleAvailability(car)}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                background: car.isAvailable
                  ? "rgba(245,158,11,0.08)"
                  : "rgba(34,197,94,0.08)",
                border: car.isAvailable
                  ? "1px solid rgba(245,158,11,0.3)"
                  : "1px solid rgba(34,197,94,0.3)",
                color: car.isAvailable ? "#f59e0b" : "#22c55e",
                fontFamily: "Quicksand,sans-serif",
                fontWeight: "700",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
              }}
            >
              {car.isAvailable ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  Hide
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  List
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="cdm-scroll"
          style={{ flex: 1, overflowY: "auto", padding: "24px 20px 40px" }}
        >
          {activeTab === "overview" && (
            <div style={{ animation: "cdm-fadeUp 0.3s ease" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: "12px",
                  marginBottom: "24px",
                }}
              >
                <StatCard
                  label="Total Revenue"
                  value={fmtCurrency(stats.revenue)}
                  sub="From confirmed bookings"
                  color="#22c55e"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  }
                />
                <StatCard
                  label="Total Bookings"
                  value={stats.total}
                  sub={`${stats.completed} completed`}
                  color="#a855f7"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  }
                />
                <StatCard
                  label="Avg. Booking Value"
                  value={fmtCurrency(stats.avgValue)}
                  sub="Per confirmed trip"
                  color="#8b5cf6"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  }
                />
                <StatCard
                  label="Avg. Rental Duration"
                  value={`${stats.avgDays.toFixed(1)}d`}
                  sub="Days per booking"
                  color="#f59e0b"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  }
                />
              </div>

              {monthlyData.length > 0 && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "18px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: "0 0 2px",
                          color: "#fff",
                          fontSize: "14px",
                          fontWeight: "800",
                        }}
                      >
                        Monthly Revenue
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          color: "rgba(255,255,255,0.3)",
                          fontSize: "11px",
                        }}
                      >
                        Last {monthlyData.length} months
                      </p>
                    </div>
                    <span
                      style={{
                        color: "#22c55e",
                        fontWeight: "800",
                        fontSize: "16px",
                      }}
                    >
                      {fmtCurrency(stats.revenue)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: "8px",
                      height: "100px",
                    }}
                  >
                    {monthlyData.map(({ label, revenue }) => {
                      const h = Math.max((revenue / maxRevenue) * 80, 4);
                      return (
                        <div
                          key={label}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              color: "#a855f7",
                              fontSize: "9px",
                              fontWeight: "700",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {revenue >= 1000
                              ? `$${(revenue / 1000).toFixed(1)}k`
                              : `$${revenue}`}
                          </span>
                          <div
                            style={{
                              width: "100%",
                              height: `${h}px`,
                              background: "linear-gradient(180deg, #a855f7, #6d28d9)",
                              borderRadius: "6px 6px 0 0",
                              boxShadow: "0 0 12px rgba(168,85,247,0.25)",
                              transition: "height 0.4s ease",
                            }}
                          />
                          <span
                            style={{
                              color: "rgba(255,255,255,0.3)",
                              fontSize: "9px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 16px",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "800",
                    }}
                  >
                    Booking Breakdown
                  </h3>
                  {[
                    {
                      label: "Active / Confirmed",
                      value: stats.active,
                      color: "#22c55e",
                    },
                    {
                      label: "Completed",
                      value: stats.completed,
                      color: "#a855f7",
                    },
                    {
                      label: "Pending",
                      value: carBookings.filter(
                        (b) => b.status === "pending_approval",
                      ).length,
                      color: "#8b5cf6",
                    },
                    {
                      label: "Cancelled",
                      value: stats.cancelled,
                      color: "#ef4444",
                    },
                  ].map(({ label, value, color }) => {
                    const pct = stats.total
                      ? ((value / stats.total) * 100).toFixed(0)
                      : 0;
                    return (
                      <div key={label} style={{ marginBottom: "12px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "5px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              color: "rgba(255,255,255,0.55)",
                            }}
                          >
                            {label}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              color,
                              fontWeight: "700",
                            }}
                          >
                            {value}
                            <span
                              style={{
                                color: "rgba(255,255,255,0.25)",
                                fontWeight: "400",
                              }}
                            >
                              ({pct}%)
                            </span>
                          </span>
                        </div>
                        <div
                          style={{
                            height: "5px",
                            borderRadius: "5px",
                            background: "rgba(255,255,255,0.06)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: color,
                              borderRadius: "5px",
                              transition:
                                "width 0.6s cubic-bezier(0.16,1,0.3,1)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 14px",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "800",
                    }}
                  >
                    Quick Facts
                  </h3>
                  {[
                    { label: "Top Customer", value: stats.topCustomer },
                    { label: "Location", value: car.location || "—" },
                    {
                      label: "Rating",
                      value: car.rating > 0
                        ? (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            {car.rating.toFixed(1)} / 5
                          </span>
                        )
                        : "No ratings yet",
                    },
                    { label: "Listed Since", value: fmtDate(car.createdAt) },
                    { label: "Last Updated", value: fmtDate(car.updatedAt) },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "9px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <span
                        style={{
                          color: "rgba(255,255,255,0.35)",
                          fontSize: "12px",
                        }}
                      >
                        {label}
                      </span>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: "12px",
                          fontWeight: "600",
                          maxWidth: "55%",
                          textAlign: "right",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "bookings" && (
            <div style={{ animation: "cdm-fadeUp 0.3s ease" }}>
              {carBookings.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    border: "1px dashed rgba(147,51,234,0.15)",
                    borderRadius: "16px",
                    background: "rgba(147,51,234,0.02)",
                  }}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginBottom: "14px", opacity: 0.4 }}
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontSize: "14px",
                      margin: 0,
                    }}
                  >
                    No bookings for this car yet.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 140px 120px 100px 90px",
                      gap: "12px",
                      padding: "0 16px 10px",
                      marginBottom: "4px",
                    }}
                  >
                    {["Customer", "Route", "Date", "Status", "Amount"].map(
                      (h) => (
                        <p
                          key={h}
                          style={{
                            margin: 0,
                            fontSize: "9px",
                            fontWeight: "800",
                            color: "rgba(255,255,255,0.25)",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            textAlign: h === "Amount" ? "right" : "left",
                          }}
                        >
                          {h}
                        </p>
                      ),
                    )}
                  </div>
                  {carBookings.map((b) => (
                    <BookingRow key={b.id} booking={b} />
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === "details" && (
            <div style={{ animation: "cdm-fadeUp 0.3s ease" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 16px",
                      color: "#a855f7",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Vehicle Specifications
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0",
                    }}
                  >
                    {[
                      ["Category", car.type || "—"],
                      ["Transmission", car.transmission || "—"],
                      ["Fuel Type", car.fuel || "—"],
                      ["Seats", car.seats ? `${car.seats} seats` : "—"],
                      ["Luggage", car.bags || "—"],
                      ["Range", car.range || "—"],
                      ["Price / Day", `$${car.price}`],
                      ["City", car.location || "—"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          padding: "11px 8px",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: "700",
                            color: "rgba(255,255,255,0.28)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "rgba(255,255,255,0.85)",
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 14px",
                      color: "#a855f7",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Documents & Legal
                  </h3>
                  {[
                    ["Number Plate", car.numberPlate || "Not provided"],
                    ["Insurance", car.insuranceInfo || "Not provided"],
                    ["RC Book", car.rcBook || "Not provided"],
                    ["PUC Certificate", car.pucCertificate || "Not provided"],
                    [
                      "Last Service",
                      car.lastServiceDate
                        ? fmtDate(car.lastServiceDate)
                        : "Not provided",
                    ],
                  ].map(([label, value]) => {
                    const missing = value === "Not provided";
                    return (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.4)",
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: missing
                              ? "rgba(255,255,255,0.2)"
                              : "rgba(255,255,255,0.8)",
                            fontStyle: missing ? "italic" : "normal",
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: "9px",
                      fontWeight: "700",
                      color: "rgba(255,255,255,0.28)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    GPS Available
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      fontWeight: "600",
                      color: car.gpsAvailable
                        ? "#22c55e"
                        : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {car.gpsAvailable ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Included
                      </span>
                    ) : (
                      "— Not included"
                    )}
                  </p>
                </div>

                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: "9px",
                      fontWeight: "700",
                      color: "rgba(255,255,255,0.28)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Emergency Kit
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      fontWeight: "600",
                      color: car.emergencyKit
                        ? "#22c55e"
                        : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {car.emergencyKit ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Included
                      </span>
                    ) : (
                      "— Not included"
                    )}
                  </p>
                </div>

                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: "9px",
                      fontWeight: "700",
                      color: "rgba(255,255,255,0.28)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Safety Rating
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      fontWeight: "600",
                      color:
                        car.safetyRating > 0
                          ? "#fbbf24"
                          : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {car.safetyRating > 0 ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        {car.safetyRating}/5
                      </span>
                    ) : (
                      "Not rated"
                    )}
                  </p>
                </div>
              </div>

              {car.description && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "16px",
                    padding: "20px",
                    marginBottom: "16px",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 12px",
                      color: "#a855f7",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    Description
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "13px",
                      lineHeight: "1.7",
                    }}
                  >
                    {car.description}
                  </p>
                </div>
              )}

              {/* Danger Zone */}
              <div className="cdm-danger-zone">
                <h3
                  style={{
                    margin: "0 0 10px",
                    color: "#ef4444",
                    fontSize: "12px",
                    fontWeight: "800",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Danger Zone
                </h3>
                <p
                  style={{
                    margin: "0 0 14px",
                    color: "rgba(255,255,255,0.35)",
                    fontSize: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  Permanently remove this car from your fleet. Active bookings
                  must be resolved first.
                </p>
                {!deleteGuard ? (
                  <button
                    onClick={() => setDeleteGuard(true)}
                    className="cdm-remove-btn"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Remove from Fleet
                  </button>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#ef4444",
                        fontWeight: "700",
                      }}
                    >
                      Are you sure?
                    </span>
                    <button
                      onClick={() => {
                        onDelete(car);
                        onClose();
                      }}
                      className="cdm-confirm-remove"
                    >
                      Yes, Remove
                    </button>
                    <button
                      onClick={() => setDeleteGuard(false)}
                      className="cdm-cancel-remove"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}