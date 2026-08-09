// DealerDashboard.jsx — Admin-identical UI transformation
import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
} from "firebase/firestore";
import "../styles/home.css";
import "../styles/dealer.css";
import ColorSpots from "../components/ColorSpots";
import { db } from "../firebase";
import jsPDF from "jspdf";
import { uploadToCloudinary } from "../utils/uploadImage";
import emailjs from "@emailjs/browser";
import { useAuth } from "../context/AuthContext";
import { sendApprovalEmail, sendRejectionEmail } from "../utils/emailService";
import TodaysPickupsCard from "../components/dealer/TodaysPickupsCard";
import TodaysReturnsCard from "../components/dealer/TodaysReturnsCard";
import ActiveTripsCard from "../components/dealer/ActiveTripsCard";
import VehicleAvailabilityCard from "../components/dealer/VehicleAvailabilityCard";
import RevenueWidget from "../components/dealer/RevenueWidget";
import QuickActionBar from "../components/dealer/QuickActionBar";
import PickupInspection from "../components/dealer/inspection/PickupInspection";
import ReturnInspection from "../components/dealer/inspection/ReturnInspection";
import LateReturnMonitor from "../components/dealer/lateReturn/LateReturnMonitor";
import ExtensionRequestManager from "../components/dealer/lateReturn/ExtensionRequestManager";
import LateReturnList from "../components/dealer/lateReturn/LateReturnList";
import PenaltyCalculator from "../components/dealer/lateReturn/PenaltyCalculator";
import VehicleStatusBoard from "../components/dealer/vehicleStatus/VehicleStatusBoard";
import AssistanceRequestList from "../components/dealer/assistance/AssistanceRequestList";
import AssistanceDetailModal from "../components/dealer/assistance/AssistanceDetailModal";
import ServiceProviderManager from "../components/dealer/assistance/ServiceProviderManager";
import DealerNotificationCenter from "../components/dealer/notifications/DealerNotificationCenter";
import FleetUtilizationChart from "../components/dealer/analytics/FleetUtilizationChart";
import RevenueChart from "../components/dealer/analytics/RevenueChart";
import PerformanceMetrics from "../components/dealer/analytics/PerformanceMetrics";
import CustomerSatisfaction from "../components/dealer/analytics/CustomerSatisfaction";
import CarDetailModal from "../components/dealer/CarDetailModal";
import NotificationFilters from "../components/dealer/notifications/NotificationFilters";
import ImageCarousel from "../components/dealer/ImageCarousel";

// ─── Constants ────────────────────────────────────────────
const CAR_TYPES = [
  "Sedan",
  "SUV",
  "Convertible",
  "Luxury",
  "Pickup",
  "Van",
  "Hatchback",
  "Electric",
  "Sports",
];
const TRANSMISSION = ["Automatic", "Manual", "CVT", "Semi-Automatic"];
const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG"];

// ─── Utils ────────────────────────────────────────────────
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
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
};

// ─── Receipt Download ─────────────────────────────────
function downloadReceipt(booking) {
  const d = new jsPDF();
  d.setFillColor(4, 0, 255);
  d.rect(0, 0, 210, 30, "F");
  d.setTextColor(255, 255, 255);
  d.setFontSize(20);
  d.setFont("helvetica", "bold");
  d.text("QuickWheels", 20, 18);
  d.setFontSize(10);
  d.text("Booking Receipt", 150, 18);
  d.setTextColor(0, 0, 0);
  d.setFontSize(12);
  d.setFont("helvetica", "bold");
  d.text(`Booking ID: ${booking.bookingId}`, 20, 45);
  d.text(`Date: ${booking.pickupDate || booking.date || "—"}`, 20, 55);
  d.setDrawColor(4, 0, 255);
  d.line(20, 62, 190, 62);
  [
    ["Vehicle:",    booking.carModel],
    ["Pickup:",     booking.pickup],
    ["Drop-off:",   booking.dropoff],
    ["Duration:",   `${booking.days} days`],
    ["Customer:",   booking.userName || booking.userEmail || "—"],
  ].forEach(([label, value], i) => {
    d.setFont("helvetica", "normal");
    d.setFontSize(11);
    d.text(label, 20, 75 + 13 * i);
    d.setFont("helvetica", "bold");
    d.text(String(value || "—"), 80, 75 + 13 * i);
  });
  d.setDrawColor(200, 200, 200);
  d.line(20, 145, 190, 145);
  d.setFont("helvetica", "bold");
  d.setFontSize(13);
  d.text("Total Amount:", 20, 160);
  d.setTextColor(4, 0, 255);
  d.text(
    `${booking.currencySymbol || "$"}${booking.total?.toLocaleString() || "0"} ${booking.currency || "USD"}`,
    80, 160
  );
  d.setTextColor(150, 150, 150);
  d.setFontSize(9);
  d.setFont("helvetica", "normal");
  d.text("Thank you for choosing QuickWheels!", 20, 270);
  d.text("For support: support@quickwheels.com", 20, 278);
  d.save(`QuickWheels-Receipt-${booking.bookingId}.pdf`);
}

// ─── Status Map ───────────────────────────────────────────
const STATUS_MAP = {
  confirmed: {
    label: "Confirmed",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.25)",
    glow: "rgba(34,197,94,0.15)",
  },
  cancelled: {
    label: "Cancelled",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    glow: "rgba(239,68,68,0.15)",
  },
  cancelled_dealer: {
    label: "Cancelled by Dealer",
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.25)",
    glow: "rgba(249,115,22,0.15)",
  },
  cancelled_admin: {
    label: "Cancelled by Admin",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    glow: "rgba(239,68,68,0.15)",
  },
  cancelled_user: {
    label: "Cancelled by User",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.25)",
    glow: "rgba(148,163,184,0.15)",
  },
  completed: {
    label: "Completed",
    color: "#a855f7",
    bg: "rgba(14,165,233,0.08)",
    border: "rgba(14,165,233,0.25)",
    glow: "rgba(14,165,233,0.15)",
  },
  on_hold: {
    label: "On Hold",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    glow: "rgba(245,158,11,0.15)",
  },
  active: {
    label: "Active",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.25)",
    glow: "rgba(168,85,247,0.15)",
  },
  pending_approval: {
    label: "Pending",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.25)",
    glow: "rgba(168,85,247,0.15)",
  },
  dealer_confirmed: {
    label: "Dealer Approved",
    color: "#a855f7",
    bg: "rgba(14,165,233,0.08)",
    border: "rgba(14,165,233,0.25)",
    glow: "rgba(14,165,233,0.15)",
  },
  rejected: {
    label: "Rejected",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    glow: "rgba(239,68,68,0.15)",
  },
  upcoming_trip: {
    label: "Upcoming Trip",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.25)",
    glow: "rgba(59,130,246,0.15)",
  },
  pickup_awaited: {
    label: "Pickup Awaited",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    glow: "rgba(245,158,11,0.15)",
  },
  ongoing_trip: {
    label: "Ongoing Trip",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    glow: "rgba(16,185,129,0.15)",
  },
  return_pending: {
    label: "Return Pending",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    glow: "rgba(245,158,11,0.15)",
  },
  no_show: {
    label: "No Show",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    glow: "rgba(239,68,68,0.15)",
  },
};

function getEffectiveStatus(b) {
  if (!b) return "pending_approval";
  if (b.status === "cancelled") {
    if (b.cancelledBy === "dealer") return "cancelled_dealer";
    if (b.cancelledBy === "admin") return "cancelled_admin";
    if (b.cancelledBy === "user") return "cancelled_user";
  }
  return b.status;
}

const TERMINAL_RED = new Set([
  "cancelled",
  "cancelled_dealer",
  "cancelled_admin",
  "cancelled_user",
  "rejected",
  "no_show",
]);
function totalColor(effKey) {
  if (TERMINAL_RED.has(effKey)) return "#ef4444";
  if (effKey === "completed") return "#a855f7";
  return "#22c55e";
}

// ─── Status Badge ─────────────────────────────────────────
function StatusBadge({ booking }) {
  const key = getEffectiveStatus(booking);
  const s = STATUS_MAP[key] || {
    label: key?.replace(/_/g, " ") || "Unknown",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.25)",
    glow: "rgba(148,163,184,0.1)",
  };
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "10px",
        fontWeight: "800",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        boxShadow: `0 0 8px ${s.glow}`,
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

// ─── Shared input styles ──────────────────────────────────
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,.05)",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: "14px",
  padding: "14px 16px 14px 44px",
  color: "#fff",
  fontFamily: "Quicksand,sans-serif",
  fontSize: "13.5px",
  outline: "none",
  transition: "border-color .25s cubic-bezier(0.16,1,0.3,1)",
};
const labelSt = {
  display: "block",
  color: "#a855f7",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "1px",
  fontWeight: "800",
  marginBottom: "8px",
};
const btnPrimary = {
  background: "linear-gradient(135deg,#4338ca,#9333ea)",
  border: "none",
  borderRadius: "10px",
  color: "#fff",
  padding: "10px 20px",
  fontWeight: "700",
  cursor: "pointer",
  fontFamily: "Quicksand,sans-serif",
  fontSize: "13px",
};
const btnSecondary = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: "10px",
  color: "rgba(255,255,255,.7)",
  padding: "10px 18px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "Quicksand,sans-serif",
  fontSize: "13px",
};
const btnDanger = {
  background: "rgba(239,68,68,.1)",
  border: "1px solid rgba(239,68,68,.3)",
  borderRadius: "8px",
  color: "#ef4444",
  padding: "8px 16px",
  fontWeight: "700",
  cursor: "pointer",
  fontFamily: "Quicksand,sans-serif",
  fontSize: "12px",
};

// ─── Progress Bar ─────────────────────────────────────────
function ProgressBar({ pct }) {
  return (
    <div style={{ marginTop: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "6px",
        }}
      >
        <span style={{ color: "rgba(255,255,255,.4)", fontSize: "11px" }}>
          Uploading…
        </span>
        <span style={{ color: "#a855f7", fontSize: "11px", fontWeight: "700" }}>
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: "4px",
          borderRadius: "4px",
          background: "rgba(255,255,255,.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "4px",
            background: "linear-gradient(90deg,#0400ff,#a855f7)",
            transition: "width .3s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────
function Toast({ msg, type, onDismiss }) {
  if (!msg) return null;
  const ok = type !== "error";
  return (
    <div
      style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}
    >
      <div
        onClick={onDismiss}
        style={{
          background: ok
            ? "linear-gradient(135deg,#22c55e,#16a34a)"
            : "linear-gradient(135deg,#ef4444,#dc2626)",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 10px 25px rgba(0,0,0,.3)",
          fontFamily: "Quicksand,sans-serif",
          fontWeight: "600",
          fontSize: "13px",
          cursor: "pointer",
          minWidth: "260px",
        }}
      >
        <span>{ok ? "✅" : "❌"}</span>
        {msg}
      </div>
    </div>
  );
}

// ─── Tab Skeleton ─────────────────────────────────────────
function TabSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "8px 0",
      }}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.06)",
              }}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  height: "14px",
                  width: `${60 + i * 10}%`,
                  borderRadius: "4px",
                  background: "rgba(255,255,255,0.06)",
                }}
              />
              <div
                style={{
                  height: "10px",
                  width: `${40 + i * 5}%`,
                  borderRadius: "4px",
                  background: "rgba(255,255,255,0.04)",
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Nav Item ─────────────────────────────────────────────
function NavItem({ item, activeTab, setActiveTab, sidebarOpen }) {
  const isActive =
    activeTab === item.id ||
    (item.id === "bookings" && activeTab === "userBookings");
  return (
    <button
      onClick={() => setActiveTab(item.id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        width: "100%",
        padding: "12px 16px",
        borderRadius: "14px",
        border: "none",
        cursor: "pointer",
        fontFamily: "Quicksand,sans-serif",
        fontSize: "14px",
        fontWeight: isActive ? "700" : "500",
        color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
        background: isActive
          ? "linear-gradient(90deg,rgba(147,51,234,0.14),rgba(147,51,234,0.02))"
          : "transparent",
        boxShadow: isActive ? "inset 3px 0 0 #9333ea" : "none",
        transition: "all 0.25s",
        marginBottom: "4px",
        textAlign: "left",
        position: "relative",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          e.currentTarget.style.color = "rgba(255,255,255,0.8)";
          e.currentTarget.style.transform = "translateX(4px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "rgba(255,255,255,0.45)";
          e.currentTarget.style.transform = "translateX(0)";
        }
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: "24px",
          height: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: isActive
            ? "drop-shadow(0 0 8px rgba(147,51,234,0.55))"
            : "none",
          color: isActive ? "#9333ea" : "inherit",
          transition: "all 0.25s",
        }}
      >
        {item.icon}
      </span>
      {sidebarOpen && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>
          {item.badge > 0 && (
            <span
              style={{
                background: "#ff4d4d",
                color: "#fff",
                borderRadius: "8px",
                minWidth: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: "900",
                padding: "0 4px",
              }}
            >
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          )}
        </div>
      )}
      {!sidebarOpen && item.badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "#ff4d4d",
            borderRadius: "50%",
            width: "12px",
            height: "12px",
            border: "2px solid #0a0a14",
          }}
        />
      )}
      {isActive && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "20%",
            bottom: "20%",
            width: "4px",
            background: "#9333ea",
            borderRadius: "0 4px 4px 0",
            boxShadow: "0 0 15px #9333ea",
          }}
        />
      )}
    </button>
  );
}

// ─── Section Header (matches Admin SectionBanner approach) ─
function SectionHeader({
  title,
  sub,
  badge,
  badgeColor = "#a855f7",
  icon,
  iconBg = "linear-gradient(135deg,#0400ff,#a855f7)",
  titleClassName = "qw_shine_heading",
  className = "",
  titleStyle = {},
}) {
  return (
    <div
      className="section-header-row"
      style={{
        paddingBottom: "20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <div className={className}>
        <h2
          className={titleClassName}
          style={{
            margin: "0 0 4px",
            fontSize: "22px",
            ...titleStyle,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.4)",
            fontSize: "13.5px",
          }}
        >
          {sub}
        </p>
      </div>
      {badge && (
        <div className="section-header-badge qw_shine_heading" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {icon}
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "1px",
            }}
          >
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── KPI Widget (left sidebar hero card) ──────────────────
function KpiWidget({ gradient, shadow, label, value, sub, icon }) {
  return (
    <div
      style={{
        background: gradient,
        padding: "16px",
        borderRadius: "16px",
        color: "#fff",
        boxShadow: shadow,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <p
          style={{
            margin: "0 0 4px",
            fontSize: "10px",
            letterSpacing: "2px",
            fontWeight: "700",
            opacity: 0.65,
          }}
        >
          {label}
        </p>
        <p
          style={{
            margin: "0 0 2px",
            fontWeight: "800",
            fontSize: "18px",
            letterSpacing: "-0.4px",
            lineHeight: 1.1,
          }}
        >
          {value}
        </p>
        {sub && (
          <p
            style={{
              margin: 0,
              fontSize: "10px",
              fontWeight: "500",
              opacity: 0.55,
            }}
          >
            {sub}
          </p>
        )}
      </div>
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "11px",
          background: "rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

// ─── Sidebar Filter Input ─────────────────────────────────
function FilterInput({
  icon,
  placeholder,
  value,
  onChange,
  accentColor = "#818cf8",
}) {
  return (
    <div style={{ position: "relative" }}>
      <span
        className="filter-input-icon"
        style={{
          position: "absolute",
          left: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          opacity: 0.4,
          display: "flex",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {icon}
      </span>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle }}
        onFocus={(e) => {
          e.target.style.borderColor = accentColor;
          e.target.style.background = "rgba(255,255,255,0.05)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "rgba(255,255,255,0.08)";
          e.target.style.background = "rgba(255,255,255,0.03)";
        }}
      />
    </div>
  );
}

// ─── Sidebar Select ───────────────────────────────────────
function FilterSelect({
  icon,
  value,
  onChange,
  children,
  accentColor = "#818cf8",
}) {
  return (
    <div style={{ position: "relative" }}>
      <span
        style={{
          position: "absolute",
          left: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1,
          opacity: 0.4,
          display: "flex",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {icon}
      </span>
      <span
        style={{
          position: "absolute",
          right: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: "10px",
          color: "rgba(255,255,255,0.4)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        ↓
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
        onFocus={(e) => (e.target.style.borderColor = accentColor)}
        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.08)")}
      >
        {children}
      </select>
    </div>
  );
}

// ─── Reset Button ─────────────────────────────────────────
function ResetBtn({ onClick, label = "RESET FILTERS" }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px 16px",
        background: "rgba(239,68,68,0.05)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: "14px",
        color: "#fca5a5",
        cursor: "pointer",
        fontWeight: "700",
        fontSize: "12px",
        letterSpacing: "0.5px",
        fontFamily: "Quicksand,sans-serif",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.target.style.background = "rgba(239,68,68,0.12)";
        e.target.style.borderColor = "rgba(239,68,68,0.4)";
      }}
      onMouseLeave={(e) => {
        e.target.style.background = "rgba(239,68,68,0.05)";
        e.target.style.borderColor = "rgba(239,68,68,0.25)";
      }}
    >
      {label}
    </button>
  );
}

// ─── Booking Card ─────────────────────────────────────────
function BookingCard({
  booking,
  onAction,
  showUser = true,
  onStartPickupVerification,
  onStartReturnVerification,
}) {
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [modal, setModal] = useState(null);
  const [actLoad, setActLoad] = useState(false);
  const [showPickupInspection, setShowPickupInspection] = useState(false);
  const [showReturnInspection, setShowReturnInspection] = useState(false);
  const [pickupInspectionData, setPickupInspectionData] = useState(null);
  const [activeFleetCard, setActiveFleetCard] = useState(null);

  const effKey = getEffectiveStatus(booking);
  const sc = STATUS_MAP[effKey] || STATUS_MAP.confirmed;
  const isPending =
    (booking.status === "pending_approval" ||
      booking.status === "dealer_confirmed") &&
    booking.status !== "cancelled";
  const isConfirmed =
    booking.status === "confirmed" || booking.status === "dealer_confirmed";
  const isHold = booking.status === "on_hold";
  const isTerminal = TERMINAL_RED.has(effKey) || effKey === "completed";
  const canAct = !isTerminal;
  const hasNote = !!booking.adminActionReason || !!booking.dealerActionReason;
  const noteText =
    booking.adminActionReason || booking.dealerActionReason || "";
  const noteTrunc = noteText.length > 80;

  const ACTIONS = {
    confirm: {
      title: "Confirm Booking",
      icon: "✅",
      color: "#22c55e",
      newStatus: "confirmed",
      requireReason: false,
    },
    hold: {
      title: "Put On Hold",
      icon: "⏸",
      color: "#f59e0b",
      newStatus: "on_hold",
      requireReason: true,
    },
    reject: {
      title: "Reject Booking",
      icon: "❌",
      color: "#ef4444",
      newStatus: "rejected",
      requireReason: true,
    },
    cancel: {
      title: "Cancel Booking",
      icon: "🚫",
      color: "#ef4444",
      newStatus: "cancelled",
      requireReason: true,
    },
    complete: {
      title: "Mark Completed",
      icon: "🏁",
      color: "#9333ea",
      newStatus: "completed",
      requireReason: false,
    },
  };

  const fetchPickupInspection = async () => {
    try {
      const snap = await getDoc(
        doc(db, "bookings", booking.id, "inspections", "pickup"),
      );
      if (snap.exists()) {
        setPickupInspectionData(snap.data());
        return snap.data();
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  async function handleAction(type, { subject, reason }) {
    const cfg = ACTIONS[type];
    setActLoad(true);
    try {
      await onAction(booking, cfg.newStatus, reason, subject, type);
    } finally {
      setActLoad(false);
      setModal(null);
    }
  }

  return (
    <>
      <div
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderLeft: `3px solid ${sc.color}`,
          borderRadius: "14px",
          padding: "16px 20px",
          transition: "all 0.25s ease",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.045)";
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.25), 0 0 20px -8px rgba(147,51,234,.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.025)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Row 1 */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "3px",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "700",
                }}
              >
                {booking.carModel}
              </h4>
              <StatusBadge booking={booking} />
              {booking.lastActionBy === "admin" && (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "9px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    background: "rgba(239,68,68,.12)",
                    border: "1px solid rgba(239,68,68,.25)",
                    color: "#ef4444",
                  }}
                >
                  ADMIN OVERRIDE
                </span>
              )}
            </div>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,.28)",
                fontSize: "11px",
                fontFamily: "monospace",
              }}
            >
              #{booking.bookingId}
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p
              style={{
                margin: 0,
                color: totalColor(effKey),
                fontWeight: "800",
                fontSize: "17px",
                lineHeight: 1,
              }}
            >
              ${booking.total?.toLocaleString()}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                color: "rgba(255,255,255,.28)",
                fontSize: "9px",
                fontWeight: "700",
                letterSpacing: ".05em",
              }}
            >
              TOTAL
            </p>
          </div>
        </div>

        {/* Row 2 */}
<div
  className="booking-row2-grid"
  style={{
    display: "grid",
    gridTemplateColumns: showUser ? "1fr 1fr 1fr" : "1fr 1fr",
    gap: "8px",
    padding: "10px 0",
    borderTop: "1px solid rgba(255,255,255,.05)",
    borderBottom: "1px solid rgba(255,255,255,.05)",
    marginBottom: "12px",
  }}
>
  <div className="booking-row2-route">
    <p
      style={{
        margin: "0 0 2px",
        color: "rgba(255,255,255,.28)",
        fontSize: "9px",
        fontWeight: "700",
        letterSpacing: ".08em",
      }}
    >
      ROUTE
    </p>
    <span
      style={{
        color: "rgba(255,255,255,.75)",
        fontSize: "12px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
      {booking.pickup} → {booking.dropoff}
    </span>
  </div>
  <div>
    <p
      style={{
        margin: "0 0 2px",
        color: "rgba(255,255,255,.28)",
        fontSize: "9px",
        fontWeight: "700",
        letterSpacing: ".08em",
      }}
    >
      DATES
    </p>
    <span
      style={{
        color: "rgba(255,255,255,.75)",
        fontSize: "12px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      {booking.pickupDate || booking.date} · {booking.days}d
    </span>
  </div>
  {showUser && (
    <div>
      <p
        style={{
          margin: "0 0 2px",
          color: "rgba(255,255,255,.28)",
          fontSize: "9px",
          fontWeight: "700",
          letterSpacing: ".08em",
        }}
      >
        CUSTOMER
      </p>
      <span
        style={{
          color: "#a855f7",
          fontSize: "12px",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {booking.userName || booking.userEmail}
      </span>
    </div>
  )}
</div>

        {/* Note */}
        {hasNote && (
          <div
            style={{
              padding: "8px 12px",
              background: TERMINAL_RED.has(effKey)
                ? "rgba(239,68,68,.06)"
                : "rgba(245,158,11,.06)",
              border: `1px solid ${TERMINAL_RED.has(effKey) ? "rgba(239,68,68,.15)" : "rgba(245,158,11,.15)"}`,
              borderRadius: "8px",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  color: "rgba(255,255,255,.55)",
                  lineHeight: "1.5",
                  flex: 1,
                }}
              >
                <span
                  style={{
                    color: TERMINAL_RED.has(effKey) ? "#ef4444" : "#f59e0b",
                    fontWeight: "700",
                  }}
                >
                  {booking.cancelledBy
                    ? `Cancelled by ${booking.cancelledBy}: `
                    : "Note: "}
                </span>
                {noteTrunc && !noteExpanded
                  ? noteText.slice(0, 80) + "…"
                  : noteText}
              </p>
              {noteTrunc && (
                <button
                  onClick={() => setNoteExpanded((p) => !p)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: TERMINAL_RED.has(effKey) ? "#ef4444" : "#f59e0b",
                    fontSize: "10px",
                    fontWeight: "700",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  {noteExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pending actions */}
        {isPending && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() =>
                handleAction("confirm", { subject: "", reason: "" })
              }
              disabled={actLoad}
              style={{
                padding: "7px 16px",
                borderRadius: "8px",
                background: actLoad
                  ? "rgba(34,197,94,.08)"
                  : "rgba(34,197,94,.14)",
                border: "1px solid rgba(34,197,94,.38)",
                color: "#22c55e",
                cursor: actLoad ? "not-allowed" : "pointer",
                fontFamily: "Quicksand,sans-serif",
                fontWeight: "700",
                fontSize: "11px",
                opacity: actLoad ? 0.6 : 1,
              }}
            >
              {actLoad ? "⏳ Processing…" : "✅ Confirm"}
            </button>
            <button
              onClick={() => setModal("hold")}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                background: "transparent",
                border: "1px solid rgba(245,158,11,.35)",
                color: "#f59e0b",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "700",
              }}
            >
              ⏸ Hold
            </button>
            <button
              onClick={() => setModal("reject")}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                background: "rgba(239,68,68,.1)",
                border: "1px solid rgba(239,68,68,.32)",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "700",
              }}
            >
              ❌ Reject
            </button>
            <button
              onClick={() => setModal("cancel")}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                background: "rgba(239,68,68,.08)",
                border: "1px solid rgba(239,68,68,.32)",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "700",
                marginLeft: "auto",
              }}
            >
              🚫 Cancel
            </button>
          </div>
        )}

        {/* Confirmed / hold actions */}
        {!isPending && canAct && (isConfirmed || isHold) && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {isConfirmed && (
              <button
                onClick={() =>
                  handleAction("complete", { subject: "", reason: "" })
                }
                disabled={actLoad}
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  background: "rgba(147,51,234,.1)",
                  border: "1px solid rgba(147,51,234,.35)",
                  color: "#9333ea",
                  cursor: actLoad ? "not-allowed" : "pointer",
                  fontSize: "11px",
                  fontWeight: "700",
                  opacity: actLoad ? 0.6 : 1,
                }}
              >
                {actLoad ? "⏳" : "🏁 Complete"}
              </button>
            )}
            {isHold && (
              <button
                onClick={() =>
                  handleAction("confirm", { subject: "", reason: "" })
                }
                disabled={actLoad}
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  background: "rgba(34,197,94,.14)",
                  border: "1px solid rgba(34,197,94,.38)",
                  color: "#22c55e",
                  cursor: actLoad ? "not-allowed" : "pointer",
                  fontSize: "11px",
                  fontWeight: "700",
                  opacity: actLoad ? 0.6 : 1,
                }}
              >
                {actLoad ? "⏳" : "✅ Confirm"}
              </button>
            )}
            <button
              onClick={() => setModal("cancel")}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                background: "rgba(239,68,68,.08)",
                border: "1px solid rgba(239,68,68,.32)",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "700",
              }}
            >
              🚫 Cancel
            </button>
            <span
              style={{
                color: "rgba(255,255,255,.28)",
                fontSize: "10px",
                marginLeft: "auto",
              }}
            >
              {timeAgo(booking.createdAt)}
            </span>
          </div>
        )}
        {isTerminal && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,.28)",
                fontSize: "11px",
              }}
            >
              {timeAgo(booking.createdAt)}
            </p>
          </div>
        )}

        {/* Receipt — only for confirmed or completed */}
        {(effKey === "confirmed" || effKey === "completed") && (
          <div
            style={{
              marginTop: "10px",
              paddingTop: "10px",
              borderTop: "1px solid rgba(255,255,255,.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => downloadReceipt(booking)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                background: "rgba(147,51,234,0.08)",
                border: "1px solid rgba(147,51,234,0.25)",
                color: "#a855f7",
                cursor: "pointer",
                fontFamily: "Quicksand,sans-serif",
                fontWeight: "700",
                fontSize: "11px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(147,51,234,0.16)";
                e.currentTarget.style.borderColor = "rgba(147,51,234,0.45)";
                e.currentTarget.style.color = "#c084fc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(147,51,234,0.08)";
                e.currentTarget.style.borderColor = "rgba(147,51,234,0.25)";
                e.currentTarget.style.color = "#a855f7";
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Receipt
            </button>
          </div>
        )}

        {/* Inspection buttons */}
        {(booking.status === "confirmed" || booking.status === "active") && (
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              borderTop: "1px solid rgba(255,255,255,.05)",
              paddingTop: "12px",
            }}
          >
            {!booking.pickupInspected && booking.status === "confirmed" && (
              <button
                onClick={() => setShowPickupInspection(true)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "rgba(14,165,233,.1)",
                  border: "1px solid rgba(14,165,233,.3)",
                  color: "#a855f7",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                📸 Start Pickup Inspection
              </button>
            )}
            {booking.pickupInspected &&
              !booking.returnInspected &&
              booking.status === "active" && (
                <button
                  onClick={() => {
                    fetchPickupInspection();
                    setShowReturnInspection(true);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "rgba(34,197,94,.1)",
                    border: "1px solid rgba(34,197,94,.3)",
                    color: "#22c55e",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  🔄 Start Return Inspection
                </button>
              )}
            {booking.pickupInspected &&
              !booking.pickupVerified &&
              booking.status === "active" && (
                <button
                  onClick={() => {
                    fetchPickupInspection().then((d) => {
                      if (d) onStartPickupVerification(booking, d);
                    });
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "rgba(14,165,233,.15)",
                    border: "1px solid rgba(14,165,233,.4)",
                    color: "#a855f7",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}
                >
                  ✅ Complete Pickup Verification
                </button>
              )}
            {booking.returnInspected &&
              !booking.returnVerified &&
              booking.status === "active" && (
                <button
                  onClick={async () => {
                    const d = await (async () => {
                      try {
                        const s = await getDoc(
                          doc(
                            db,
                            "bookings",
                            booking.id,
                            "inspections",
                            "return",
                          ),
                        );
                        return s.exists() ? s.data() : null;
                      } catch (e) {
                        return null;
                      }
                    })();
                    if (d) onStartReturnVerification(booking, d);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: "rgba(34,197,94,.15)",
                    border: "1px solid rgba(34,197,94,.4)",
                    color: "#22c55e",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}
                >
                  🔄 Complete Return & Close Booking
                </button>
              )}
          </div>
        )}
      </div>

      {/* Action modal */}
      {modal && ACTIONS[modal] && (
        <ActionModal
          title={ACTIONS[modal].title}
          icon={ACTIONS[modal].icon}
          accentColor={ACTIONS[modal].color}
          requireReason={ACTIONS[modal].requireReason}
          loading={actLoad}
          bookingPreview={booking}
          onCancel={() => setModal(null)}
          onConfirm={(payload) => handleAction(modal, payload)}
        />
      )}
      {showPickupInspection && (
        <PickupInspection
          booking={booking}
          onComplete={() => setShowPickupInspection(false)}
          onCancel={() => setShowPickupInspection(false)}
        />
      )}
      {showReturnInspection && pickupInspectionData && (
        <ReturnInspection
          booking={booking}
          pickupInspection={pickupInspectionData}
          onComplete={() => setShowReturnInspection(false)}
          onCancel={() => setShowReturnInspection(false)}
        />
      )}
    </>
  );
}

// ─── Action Modal ─────────────────────────────────────────
function ActionModal({
  title,
  icon,
  accentColor = "#a855f7",
  onConfirm,
  onCancel,
  loading,
  requireReason = false,
  bookingPreview,
}) {
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const canSubmit =
    !requireReason || (reason.trim().length > 0 && subject.trim().length > 0);
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3,3,7,.92)",
        backdropFilter: "blur(12px)",
        zIndex: 5000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0c0c16",
          border: `1px solid ${accentColor}66`,
          borderRadius: "24px",
          maxWidth: "520px",
          width: "100%",
          padding: "32px",
          boxShadow: "0 30px 60px rgba(0,0,0,.6)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: accentColor,
          }}
        />
        <h3
          style={{
            color: accentColor,
            margin: "0 0 16px",
            fontSize: "20px",
            fontWeight: "800",
          }}
        >
          {icon} {title}
        </h3>
        {bookingPreview && (
          <div
            style={{
              background: "rgba(255,255,255,.03)",
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,.06)",
              marginBottom: "24px",
            }}
          >
            <p
              style={{
                color: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                margin: "0 0 4px",
              }}
            >
              {bookingPreview.carModel} · #{bookingPreview.bookingId}
            </p>
            <p
              style={{
                color: "rgba(255,255,255,.4)",
                fontSize: "12px",
                margin: 0,
              }}
            >
              👤 {bookingPreview.userEmail}
            </p>
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div>
            <label style={labelSt}>
              Notification Subject{" "}
              {requireReason && <span style={{ color: accentColor }}>*</span>}
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Booking status update"
              style={{ ...inputStyle, paddingLeft: "16px" }}
              onFocus={(e) => (e.target.style.borderColor = "#a855f7")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,.1)")
              }
            />
          </div>
          <div>
            <label style={labelSt}>
              Message to Customer{" "}
              {requireReason && <span style={{ color: accentColor }}>*</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder={
                requireReason
                  ? "Provide a detailed reason (required)…"
                  : "Add a note for the customer…"
              }
              style={{
                ...inputStyle,
                paddingLeft: "16px",
                resize: "none",
                fontFamily: "Quicksand,sans-serif",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#a855f7")}
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,.1)")
              }
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => canSubmit && onConfirm({ subject, reason })}
            disabled={loading || !canSubmit}
            style={{
              flex: 2,
              padding: "14px",
              background: accentColor,
              border: "none",
              borderRadius: "12px",
              color: "#000",
              fontFamily: "Quicksand,sans-serif",
              fontWeight: "800",
              fontSize: "15px",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: loading || !canSubmit ? 0.6 : 1,
            }}
          >
            {loading ? "Processing…" : "Confirm & Notify"}
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "14px",
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: "12px",
              color: "rgba(255,255,255,.7)",
              cursor: "pointer",
              fontFamily: "Quicksand,sans-serif",
              fontWeight: "600",
              fontSize: "15px",
            }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Car Modal ────────────────────────────────────────────
function CarModal({ dealerId, dealerCity, car, onClose, onSaved }) {
  const isEdit = !!car;
  const [form, setForm] = useState({
    model: car?.model || "",
    type: car?.type || "Sedan",
    seats: car?.seats || 5,
    bags: car?.bags || "2 bags",
    transmission: car?.transmission || "Automatic",
    fuel: car?.fuel || "Petrol",
    range: car?.range || "500 km/tank",
    price: car?.price || "",
    description: car?.description || "",
    isAvailable: car?.isAvailable ?? true,
    location: car?.location || dealerCity || "",
    numberPlate: car?.numberPlate || "",
    insuranceInfo: car?.insuranceInfo || "",
    rcBook: car?.rcBook || "",
    pucCertificate: car?.pucCertificate || "",
    lastServiceDate: car?.lastServiceDate || "",
    safetyRating: car?.safetyRating || 0,
    emergencyKit: car?.emergencyKit ?? false,
    gpsAvailable: car?.gpsAvailable ?? false,
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState(
    car?.images?.length ? car.images : car?.image ? [car.image] : []
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const oversized = files.find((f) => f.size > 5 * 1024 * 1024);
    if (oversized) { setError("Each image must be under 5 MB"); return; }
    const nonImage = files.find((f) => !f.type.startsWith("image/"));
    if (nonImage) { setError("Please select image files only"); return; }
    setError("");
    setImageFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => {
      const updated = [...prev, ...newPreviews];
      setActiveImageIndex(updated.length - 1);
      return updated;
    });
    e.target.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.model.trim()) {
      setError("Car model is required");
      return;
    }
    if (!form.price || Number(form.price) < 1) {
      setError("Valid price is required");
      return;
    }
    if (imagePreviews.length === 0) {
      setError("Please upload at least one car image");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const existingUrls = imagePreviews.filter((p) => p.startsWith("http"));
      let newUploadResults = [];
      if (imageFiles.length > 0) {
        const total = imageFiles.length;
        newUploadResults = await Promise.all(
          imageFiles.map((file, i) =>
            uploadToCloudinary(file, (p) =>
              setUploadPct(Math.round(((i + p / 100) / total) * 100))
            )
          )
        );
      }
      const allImageUrls = [
        ...existingUrls,
        ...newUploadResults.map((r) => r.url),
      ];
      const allImagePaths = [
        ...(car?.imagePaths || (car?.imageStorePath ? [car.imageStorePath] : [])),
        ...newUploadResults.map((r) => r.publicId),
      ];

      const carData = {
        ...form,
        price: Number(form.price),
        seats: Number(form.seats),
        image: allImageUrls[0] || "",
        imageStorePath: allImagePaths[0] || "",
        images: allImageUrls,
        imagePaths: allImagePaths,
        dealerId,
        location: form.location || dealerCity || "",
        updatedAt: new Date(),
        ...(isEdit
          ? {}
          : { createdAt: new Date(), bookingCount: 0, rating: 0 }),
      };
      if (isEdit)
        await updateDoc(doc(db, "dealers", dealerId, "cars", car.id), carData);
      else await addDoc(collection(db, "dealers", dealerId, "cars"), carData);
      onSaved();
    } catch (err) {
      setError(err?.message || "Failed to save");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }

  const smallInput = {
    ...inputStyle,
    padding: "9px 14px",
    paddingLeft: "14px",
    fontSize: "13px",
    borderRadius: "12px",
  };

  const hasMultipleImages = imagePreviews.length > 1;
  const imagePreview = imagePreviews[activeImageIndex] ?? null;

  return (
    <div
      className="carmodal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "rgba(8,8,16,0.92)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px) scale(0.96); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes carModalGlowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .carmodal-shell {
          max-width: 920px;
          max-height: 85vh;
          background: linear-gradient(180deg, #120e20 0%, #0c0c16 100%);
          border: 1px solid rgba(147,51,234,0.3);
          border-radius: 24px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(147,51,234,0.05);
          animation: slideUp 0.4s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
          width: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .carmodal-shell::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(147,51,234,0.1) 0%, transparent 70%);
          pointer-events: none;
          filter: blur(60px);
          animation: carModalGlowPulse 6s ease-in-out infinite;
        }
        .carmodal-shell::after {
          content: '';
          position: absolute;
          bottom: -40%;
          left: -20%;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(67,56,202,0.08) 0%, transparent 70%);
          pointer-events: none;
          filter: blur(60px);
          animation: carModalGlowPulse 8s ease-in-out infinite reverse;
        }
        .carmodal-form {
          display: flex;
          flex-direction: row !important;
          flex: 1;
          overflow: hidden;
          margin: 0;
          width: 100%;
          align-items: stretch;
          position: relative;
          z-index: 1;
        }
        .carmodal-left {
          width: 42%;
          min-width: 370px;
          padding: 24px;
          border-right: 1px solid rgba(255,255,255,0.05);
          background: rgba(255,255,255,0.01);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          overflow: hidden;
        }
        .carmodal-right {
          width: 58%;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-sizing: border-box;
        }
        .carmodal-field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 12px;
        }
        .carmodal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(18,14,32,0.95);
          backdrop-filter: blur(10px);
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }
        .carmodal-header-title {
          margin: 0;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          letter-spacing: -0.3px;
        }
        .carmodal-header-sub {
          margin: 2px 0 0 34px;
          color: rgba(255,255,255,0.4);
          font-size: 12px;
          font-weight: 500;
        }
        .carmodal-gallery-box {
          position: relative;
          background: rgba(0,0,0,0.25);
          border: 2px dashed rgba(147,51,234,0.2);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          flex-shrink: 0;
        }
        .carmodal-gallery-box:hover {
          border-color: rgba(147,51,234,0.4);
          box-shadow: 0 0 30px rgba(147,51,234,0.08);
        }
        .carmodal-footer-btns {
          display: flex;
          gap: 10px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: auto;
          flex-shrink: 0;
        }
        .gallery-btn {
          pointer-events: auto;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(12,12,22,0.8);
          border: 1px solid rgba(255,255,255,0.08);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .gallery-btn:hover {
          background: rgba(147,51,234,0.2) !important;
          color: #a855f7 !important;
          border-color: rgba(147,51,234,0.3) !important;
          transform: scale(1.1);
        }
        .gallery-img {
          transition: opacity 0.3s ease;
        }
        .input-premium {
          width: 100%;
          box-sizing: border-box;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 9px 14px;
          color: #fff;
          font-family: "Quicksand", sans-serif;
          font-size: 13px;
          outline: none;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .input-premium:focus {
          border-color: #a855f7 !important;
          background: rgba(147,51,234,0.06) !important;
          box-shadow: 0 0 0 4px rgba(147,51,234,0.1) !important;
          outline: none;
        }
        .input-premium:hover {
          border-color: rgba(255,255,255,0.15);
        }
        .input-premium::placeholder {
          color: rgba(255,255,255,0.3);
        }
        .input-premium select,
        .input-premium option {
          background: #0c0c16;
          color: #fff;
        }
        .premium-pill {
          background: rgba(12,12,22,0.7) !important;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(147,51,234,0.2) !important;
          color: rgba(255,255,255,0.8) !important;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          font-family: "Quicksand", sans-serif;
          font-size: 10px;
          letter-spacing: 0.5px;
          padding: 6px 12px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .premium-pill:hover {
          background: linear-gradient(90deg, rgba(147,51,234,0.15), rgba(67,56,202,0.25)) !important;
          border-color: #a855f7 !important;
          color: #c084fc !important;
          box-shadow: 0 0 20px rgba(147,51,234,0.15);
          transform: translateY(-2px);
        }
        .premium-pill:active {
          transform: translateY(0) scale(0.95);
        }
        .carmodal-close-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          cursor: pointer;
          color: rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .carmodal-close-btn:hover {
          background: rgba(239,68,68,0.15) !important;
          color: #ef4444 !important;
          transform: rotate(90deg);
        }
        .carmodal-cancel-btn {
          padding: 11px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          background: transparent;
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          font-family: "Quicksand", sans-serif;
          flex: 1;
        }
        .carmodal-cancel-btn:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
          border-color: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }
        .carmodal-save-btn {
          flex: 2;
          padding: 11px 20px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          border: none;
          cursor: pointer;
          font-family: "Quicksand", sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          background: linear-gradient(135deg, #6d28d9 0%, #9333ea 45%, #c084fc 100%);
          background-size: 180% 180%;
          background-position: 0% 50%;
          box-shadow: 0 6px 20px rgba(147,51,234,0.35);
          position: relative;
          overflow: hidden;
        }
        .carmodal-save-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 55%;
          height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.3), transparent);
          pointer-events: none;
          transition: left 0.5s ease;
        }
        .carmodal-save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(147,51,234,0.5), 0 0 0 1px rgba(168,85,247,0.2);
          background-position: 100% 50%;
        }
        .carmodal-save-btn:hover:not(:disabled)::before {
          left: 160%;
        }
        .carmodal-save-btn:active:not(:disabled) {
          transform: scale(0.97);
        }
        .carmodal-save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(147,51,234,0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(147,51,234,0.4);
        }
        .carmodal-label {
          display: block;
          color: #a855f7;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .carmodal-status-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          flex-shrink: 0;
        }
        .carmodal-status-toggle:hover {
          transform: translateY(-2px);
        }
        .carmodal-error {
          padding: 10px 14px;
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          color: #ef4444;
          fontSize: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 900px) {
          .carmodal-left {
            min-width: 0 !important;
          }
        }
        @media (max-width: 768px) {
          .carmodal-shell {
            max-width: 100% !important;
            width: 100% !important;
            max-height: 95vh !important;
            border-radius: 18px !important;
          }
          .carmodal-form {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .carmodal-left {
            width: 100% !important;
            min-width: 0 !important;
            flex: none !important;
            overflow: visible !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.05) !important;
            padding: 18px !important;
          }
          .carmodal-right {
            width: 100% !important;
            flex: none !important;
            overflow-y: visible !important;
            padding: 18px !important;
          }
          .carmodal-field-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .carmodal-header {
            padding: 14px 16px !important;
          }
          .carmodal-header-title {
            font-size: 15px !important;
          }
          .carmodal-header-sub {
            font-size: 10px !important;
            margin-left: 30px !important;
          }
          .carmodal-gallery-box {
            height: 180px !important;
            flex: none !important;
          }
          .carmodal-gallery-wrap {
            flex: none !important;
          }
          .carmodal-footer-btns {
            gap: 8px !important;
          }
        }

        /* ═══ ≤479px: PHONES ═══
           Same treatment as CarDetailModal: the modal goes true
           full-bleed (no rounded corners / gutter), every touch target
           gets sized up, and every element that could clip or wrap
           unpredictably is pinned down explicitly. */
        @media (max-width: 479px) {
          .carmodal-overlay {
            padding: 0 !important;
          }
          .carmodal-shell {
            position: fixed !important;
            inset: 0 !important;
            width: auto !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
          }
          .carmodal-form {
            overflow-y: auto !important;
            width: 100% !important;
            padding: 10px !important;
          }

          /* The real cause of the invisible gallery: both this wrapper
             and .carmodal-gallery-box carry an INLINE style={{flex:"1"}}
             (flex-basis: 0%), which overrides height entirely for flex
             items — so the earlier height:190px rule was never actually
             winning. Forcing flex:none here restores height as the
             sizing authority. */
          .carmodal-gallery-wrap {
            flex: none !important;
          }

          /* Header */
          .carmodal-header {
            padding: 12px 14px !important;
          }
          .carmodal-header-title {
            font-size: 18px !important;
            gap: 8px !important;
          }
          .carmodal-header-title svg {
            width: 15px !important;
            height: 15px !important;
          }
          .carmodal-header-sub {
            font-size: 10px !important;
            margin: 2px 0 0 23px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          .carmodal-close-btn {
            width: 30px !important;
            height: 30px !important;
            border-radius: 9px !important;
          }
          .carmodal-close-btn svg {
            width: 14px !important;
            height: 14px !important;
          }

          /* Left column (gallery + status + footer) */
          .carmodal-left,
          .carmodal-right {
            padding: 12px !important;
          }
          .carmodal-left p {.}
          .carmodal-gallery-box {
            height: 190px !important;
            flex: none !important;
            border-radius: 12px !important;
          }
          .gallery-btn {
            width: 30px !important;
            height: 30px !important;
          }
          .gallery-btn svg {
            width: 13px !important;
            height: 13px !important;
          }
          .premium-pill {
            padding: 5px 9px !important;
            font-size: 9px !important;
            gap: 4px !important;
          }
          .premium-pill svg {
            width: 9px !important;
            height: 9px !important;
          }

          .carmodal-status-toggle {
            padding: 11px !important;
            border-radius: 12px !important;
            gap: 10px !important;
          }

          .carmodal-status-toggle div p {
            font-size: 12px !important;
          }

          .carmodal-footer-btns {
            gap: 8px !important;
            padding-top: 12px !important;
          }
          .carmodal-cancel-btn,
          .carmodal-save-btn {
            padding: 9px 16px !important;
            font-size: 12px !important;
            border-radius: 10px !important;
          }
          .carmodal-save-btn svg,
          .carmodal-cancel-btn svg {
            width: 15px !important;
            height: 15px !important;
          }

          /* Right column form fields */
          .carmodal-field-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .carmodal-label {
            font-size: 11px !important;
            margin-bottom: 4px !important;
          }
          .input-premium {
            padding: 10px 12px !important;
            font-size: 13px !important;
            border-radius: 10px !important;
            /* Native <select> chrome on mobile can ignore padding and
               collide with the custom chevron unless both vendor
               prefixes are set — same fix applied across the rest of
               the dashboard. */
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
          }
          textarea.input-premium {
            min-height: 70px !important;
          }
          .carmodal-error {
            padding: 9px 12px !important;
            font-size: 11px !important;
            gap: 6px !important;
          }
          .carmodal-error svg {
            width: 12px !important;
            height: 12px !important;
            flex-shrink: 0 !important;
          }
        }
      `}</style>

      <div
        className="carmodal-shell"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="carmodal-header">
          <div style={{ minWidth: 0 }}>
            <h2 className="carmodal-header-title qw_shine_heading">
              {isEdit ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                  </svg>
                  Edit Fleet Car
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                    <circle cx="7" cy="17" r="2"></circle>
                    <circle cx="17" cy="17" r="2"></circle>
                  </svg>
                  Deploy New Car
                </>
              )}
            </h2>
            <p className="carmodal-header-sub">
              {isEdit ? "Modify and synchronize vehicle metrics" : "Provision a new high-end automotive model asset"}
            </p>
          </div>
          <button className="carmodal-close-btn" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Main Form - Side by Side Layout */}
        <form className="carmodal-form" onSubmit={handleSubmit}>
          {/* LEFT - Media Gallery (42%) */}
          <div className="carmodal-left">
            <div className="carmodal-gallery-wrap" style={{ display: "flex", flexDirection: "column", marginBottom: "16px", flex: "1", minHeight: 0 }}>
              <p style={{
                margin: "0 0 10px",
                color: "#a855f7",
                fontSize: "10px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexShrink: 0
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Media Studio Gallery
              </p>

              <div className="carmodal-gallery-box" style={{ flex: "1" }}>
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="gallery-img"
                      key={activeImageIndex}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        background: "#06060b",
                        position: "absolute",
                        inset: 0,
                        animation: "fadeIn 0.3s ease",
                      }}
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 70%, rgba(0,0,0,0.6))", pointerEvents: "none" }} />
                    
                    {hasMultipleImages && (
                      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", inset: "0 10px", display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "none" }}>
                        <button type="button" className="gallery-btn" onClick={() => setActiveImageIndex((i) => (i - 1 + imagePreviews.length) % imagePreviews.length)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="15 18 9 12 15 6"></polyline>
                          </svg>
                        </button>
                        <button type="button" className="gallery-btn" onClick={() => setActiveImageIndex((i) => (i + 1) % imagePreviews.length)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </button>
                      </div>
                    )}

                    {hasMultipleImages && (
                      <div style={{ position: "absolute", bottom: "10px", display: "flex", gap: "5px", zIndex: 2 }}>
                        {imagePreviews.map((_, i) => (
                          <div key={i} onClick={() => setActiveImageIndex(i)} style={{
                            width: i === activeImageIndex ? "16px" : "4px",
                            height: "4px",
                            borderRadius: "2px",
                            background: i === activeImageIndex ? "#a855f7" : "rgba(255,255,255,0.3)",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                          }} />
                        ))}
                      </div>
                    )}

                    <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "12px", right: "12px", display: "flex", gap: "8px", zIndex: 5 }}>
                      <button type="button" onClick={() => fileRef.current?.click()} className="premium-pill">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        ADD MORE
                      </button>
                      <button type="button" onClick={() => fileRef.current?.click()} className="premium-pill">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                        </svg>
                        REPLACE
                      </button>
                    </div>
                  </>
                ) : (
                  <div onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: "30px 10px", textAlign: "center", cursor: "pointer" }}>
                    <div style={{ color: "rgba(147,51,234,0.3)", marginBottom: "8px", display: "flex", justifyContent: "center" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                    <p style={{ margin: "0 0 4px", color: "#a855f7", fontWeight: "700", fontSize: "13px" }}>Upload Media Assets</p>
                    <p style={{ margin: 0, color: "rgba(255,255,255,.3)", fontSize: "11px" }}>Supports high-res vehicle graphics</p>
                  </div>
                )}
              </div>
            </div>

            {imagePreviews.length > 0 && (
              <p style={{ margin: "-8px 0 16px", color: "rgba(255,255,255,.35)", fontSize: "11px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {imagePreviews.length} image{imagePreviews.length > 1 ? "s" : ""} staged
              </p>
            )}

            <div className="carmodal-status-toggle" onClick={() => setForm((p) => ({ ...p, isAvailable: !p.isAvailable }))} style={{
              background: form.isAvailable ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
              border: `1px solid ${form.isAvailable ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
            }}>
              <div style={{
                width: "40px",
                height: "22px",
                borderRadius: "11px",
                flexShrink: 0,
                position: "relative",
                background: form.isAvailable ? "linear-gradient(90deg, #6d28d9, #a855f7)" : "rgba(255,255,255,0.06)",
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                boxShadow: form.isAvailable ? "0 0 20px rgba(147,51,234,0.2)" : "none",
              }}>
                <div style={{
                  position: "absolute",
                  top: "2px",
                  left: form.isAvailable ? "20px" : "2px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.3s cubic-bezier(0.16,1,0.3,1)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, color: "#fff", fontWeight: "700", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                  {form.isAvailable ? (
                    <>
                      <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
                      Listed & Active
                    </>
                  ) : (
                    <>
                      <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
                      Hidden Vaulted Mode
                    </>
                  )}
                </p>
                <p style={{ margin: "1px 0 0", color: "rgba(255,255,255,0.3)", fontSize: "10.5px" }}>
                  {form.isAvailable ? "Visible to marketplace search" : "Restricted from public entries"}
                </p>
              </div>
            </div>

            <div className="carmodal-footer-btns">
              <button type="button" onClick={onClose} className="carmodal-cancel-btn">
                Dismiss
              </button>
              <button type="submit" disabled={uploading} className="carmodal-save-btn">
                {uploading ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                      <line x1="12" y1="2" x2="12" y2="6"></line>
                      <line x1="12" y1="18" x2="12" y2="22"></line>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                      <line x1="2" y1="12" x2="6" y2="12"></line>
                      <line x1="18" y1="12" x2="22" y2="12"></line>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    </svg>
                    Syncing {uploadPct}%
                  </>
                ) : isEdit ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Commit Modifications
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Deploy Assets
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT - Form Fields (58%) */}
          <div className="carmodal-right custom-scrollbar">
            {error && (
              <div className="carmodal-error">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                {error}
              </div>
            )}

            <p style={{
              margin: "0 0 2px",
              color: "#a855f7",
              fontSize: "10px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              System Parameters
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label className="carmodal-label">Model / Name *</label>
              <input
                name="model"
                className="input-premium"
                value={form.model}
                onChange={handleChange}
                placeholder="e.g. Volkswagen Virtus"
                required
              />
            </div>

            <div className="carmodal-field-grid">
              {[
                { label: "Category", name: "type", type: "select", opts: CAR_TYPES },
                { label: "Price (USD/day)*", name: "price", type: "number", placeholder: "45", min: 1 },
                { label: "Seats", name: "seats", type: "number", placeholder: "5", min: 2, max: 15 },
                { label: "Luggage", name: "bags", placeholder: "2 large bags" },
                { label: "Transmission", name: "transmission", type: "select", opts: TRANSMISSION },
                { label: "Fuel Type", name: "fuel", type: "select", opts: FUEL_TYPES },
                { label: "Range", name: "range", placeholder: "600 km/tank" },
                { label: "Location", name: "location", placeholder: "Pune" },
              ].map((f) => (
                <div key={f.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label className="carmodal-label">{f.label}</label>
                  {f.type === "select" ? (
                    <div style={{ position: "relative" }}>
                      <select
                        name={f.name}
                        value={form[f.name]}
                        onChange={handleChange}
                        className="input-premium"
                        style={{
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          appearance: "none",
                          paddingRight: "30px",
                          cursor: "pointer",
                        }}
                      >
                        {f.opts.map((o) => (
                          <option key={o} style={{ background: "#0c0c16", color: "#fff" }}>{o}</option>
                        ))}
                      </select>
                      <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.3)" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <input
                      name={f.name}
                      className="input-premium"
                      type={f.type || "text"}
                      value={form[f.name]}
                      onChange={handleChange}
                      placeholder={f.placeholder}
                      min={f.min}
                      max={f.max}
                      style={f.name === "bags" || f.name === "range" || f.name === "location" ? { fontSize: "13px" } : {}}
                    />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label className="carmodal-label">Description</label>
              <textarea
                name="description"
                className="input-premium"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Detail distinctive attributes, physical diagnostics, special operational terms..."
                style={{ resize: "none", lineHeight: "1.5", width: "100%", minHeight: "60px" }}
              />
            </div>
          </div>
        </form>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageChange}
          multiple
        />
      </div>
    </div>
  );
}

// ─── Logo Modal ───────────────────────────────────────────
function LogoModal({ dealerId, currentLogo, businessName, onClose, onSaved }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(currentLogo || null);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Logo must be under 2 MB"); return; }
    if (!file.type.startsWith("image/")) { setError("Please select an image"); return; }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!imageFile) { setError("Please select an image first"); return; }
    setUploading(true);
    setError("");
    try {
      const r = await uploadToCloudinary(imageFile, (p) => setUploadPct(p));
      await updateDoc(doc(db, "dealers", dealerId), { logo: r.url, updatedAt: new Date() });
      onSaved(r.url);
    } catch (err) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,8,16,0.92)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        zIndex: 4000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <style>{`
        @keyframes logoModalSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .logo-upload-zone:hover .logo-upload-overlay {
          opacity: 1;
        }
        .logo-upload-zone:hover {
          border-color: rgba(147,51,234,0.6) !important;
          transform: scale(1.02);
          box-shadow: 0 0 30px rgba(147,51,234,0.15);
        }
        .logo-close-btn:hover {
          background: rgba(239,68,68,0.15) !important;
          color: #ef4444 !important;
          transform: rotate(90deg);
        }
        .logo-browse-btn:hover {
          background: rgba(147,51,234,0.12) !important;
          border-color: rgba(147,51,234,0.4) !important;
          transform: translateY(-2px);
          color: #c084fc !important;
        }
        .logo-save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(147,51,234,0.5), 0 0 0 1px rgba(168,85,247,0.2);
          background-position: 100% 50%;
        }
        .logo-save-btn:active:not(:disabled) {
          transform: scale(0.97);
        }
        .logo-cancel-btn:hover {
          background: rgba(255,255,255,0.08) !important;
          color: #fff !important;
          border-color: rgba(255,255,255,0.2) !important;
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg, #120e20 0%, #0c0c16 100%)",
          border: "1px solid rgba(147,51,234,0.3)",
          borderRadius: "24px",
          maxWidth: "560px",
          width: "100%",
          padding: "32px",
          boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 40px rgba(147,51,234,0.05)",
          animation: "logoModalSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow background */}
        <div
          style={{
            position: "absolute",
            top: "-50%",
            right: "-30%",
            width: "300px",
            height: "300px",
            background: "radial-gradient(circle, rgba(147,51,234,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-40%",
            left: "-20%",
            width: "250px",
            height: "250px",
            background: "radial-gradient(circle, rgba(67,56,202,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
            filter: "blur(60px)",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "24px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <h2
                className="qw_shine_heading"
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: "800",
                  letterSpacing: "-0.3px",
                }}
              >
                Business Logo
              </h2>
            </div>
            <p
              style={{
                margin: "4px 0 0 34px",
                color: "rgba(255,255,255,0.4)",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              Upload or replace your brand logo
            </p>
          </div>
          <button
            onClick={onClose}
            className="logo-close-btn"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              width: "36px",
              height: "36px",
              cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "12px",
              color: "#ef4444",
              fontSize: "13px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Main Content - 70/30 Layout with Square Image */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            position: "relative",
            zIndex: 1,
            alignItems: "stretch",
          }}
        >
          {/* Left - Image Preview (70%) - Square */}
          <div
            className="logo-upload-zone"
            onClick={() => fileRef.current?.click()}
            style={{
              flex: "7",
              aspectRatio: "1/1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              borderRadius: "16px",
              border: `2px dashed ${imagePreview ? "rgba(34,197,94,0.4)" : "rgba(147,51,234,0.25)"}`,
              background: imagePreview
                ? "rgba(255,255,255,0.02)"
                : "rgba(255,255,255,0.02)",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
              position: "relative",
              minHeight: "200px",
              maxHeight: "280px",
              overflow: "hidden",
            }}
          >
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt="Logo Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "12px",
                    transition: "all 0.3s ease",
                  }}
                />
                <div
                  className="logo-upload-overlay"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "14px",
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.3s ease",
                    gap: "6px",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span style={{ color: "#fff", fontSize: "12px", fontWeight: "600" }}>Change Image</span>
                </div>
                {/* Image indicator badge */}
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "rgba(34,197,94,0.9)",
                    color: "#fff",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "10px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Selected
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "16px",
                    background: "rgba(147,51,234,0.08)",
                    border: "1px solid rgba(147,51,234,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "8px",
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#a855f7",
                      fontSize: "15px",
                      fontWeight: "700",
                    }}
                  >
                    Upload Logo
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      color: "rgba(255,255,255,0.3)",
                      fontSize: "12px",
                    }}
                  >
                    {businessName?.[0]?.toUpperCase() || "D"} · Click to browse
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Right - Buttons Column (30%) */}
          <div
            style={{
              flex: "3",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            {/* Browse Button */}
            <button
              onClick={() => fileRef.current?.click()}
              className="logo-browse-btn"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                fontFamily: "Quicksand, sans-serif",
                fontWeight: "600",
                fontSize: "13px",
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Browse
            </button>

            {/* Save Button - Only visible after image upload */}
            {imagePreview && (
              <button
                onClick={handleSave}
                disabled={uploading}
                className="logo-save-btn"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontFamily: "Quicksand, sans-serif",
                  fontWeight: "700",
                  fontSize: "13px",
                  color: "#fff",
                  opacity: uploading ? 0.6 : 1,
                  background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 45%, #c084fc 100%)",
                  backgroundSize: "180% 180%",
                  backgroundPosition: "0% 50%",
                  transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {uploading ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                    </svg>
                    {uploadPct}%
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            )}

            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="logo-cancel-btn"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontFamily: "Quicksand, sans-serif",
                fontWeight: "600",
                fontSize: "13px",
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel
            </button>

            {/* Upload Progress */}
            {uploading && (
              <div style={{ marginTop: "4px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>
                    Uploading…
                  </span>
                  <span style={{ color: "#a855f7", fontSize: "10px", fontWeight: "700" }}>
                    {uploadPct}%
                  </span>
                </div>
                <div
                  style={{
                    height: "3px",
                    borderRadius: "3px",
                    background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${uploadPct}%`,
                      borderRadius: "3px",
                      background: "linear-gradient(90deg, #6d28d9, #a855f7)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {/* File info */}
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "10px",
                textAlign: "center",
                margin: "4px 0 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              JPG, PNG, WebP · Max 2MB
            </p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageChange}
        />
      </div>
    </div>
  );
}

// ─── Email util ───────────────────────────────────────────
async function sendBookingEmail({
  to,
  subject,
  bookingData,
  actionType,
  reason,
}) {
  const SERVICE_ID = "service_crw994k",
    RECEIPT_ID = "template_npbllll",
    PUBLIC_KEY = "TJIFq6s5ghB-Qg91W";
  const isCancelled = actionType === "cancelled",
    isOnHold = actionType === "on_hold";
  try {
    await emailjs.send(
      SERVICE_ID,
      RECEIPT_ID,
      {
        email: to,
        email_subject: subject,
        header_color: isCancelled
          ? "linear-gradient(135deg,#7f0000,#ff4d4d)"
          : isOnHold
            ? "linear-gradient(135deg,#7f4a00,#ffa500)"
            : "linear-gradient(135deg,#064e3b,#22c55e)",
        header_subtitle: "Booking Update",
        email_icon: isCancelled ? "❌" : isOnHold ? "⏸️" : "✅",
        greeting: `Hi, ${bookingData.userName || bookingData.userEmail}!`,
        email_subtitle: subject,
        admin_message: reason,
        admin_message_bg: isCancelled ? "#fff5f5" : "#fffbf0",
        admin_message_border: `4px solid ${isCancelled ? "#ff4d4d" : "#ffa500"}`,
        admin_message_padding: "20px 24px",
        admin_message_margin: "0 0 24px",
        details_title: "Booking Details",
        car_model: bookingData.carModel,
        pickup: bookingData.pickup,
        dropoff: bookingData.dropoff,
        date_label: "Pickup Date",
        date_value: bookingData.pickupDate || bookingData.date,
        extra_label: "📅 Return Date",
        extra_value: bookingData.dropoffDate || "—",
        amount_label: "Total",
        total: bookingData.total,
        addons_display: "none",
        addons: "",
        days: "",
        car_total: "",
        addons_total: "",
        footer_message: isCancelled
          ? "No charges have been made."
          : "We'll be in touch shortly.",
        booking_id: bookingData.bookingId,
      },
      PUBLIC_KEY,
    );
  } catch (err) {
    console.error("Email send failed:", err);
  }
}

// ─── Fancy button ───────────────────────────────────────────
function FancyButtonFx() {
  return (
    <>
      <span className="qw_fancy_btn_fold"></span>
      <div className="qw_fancy_btn_points">
        {Array.from({ length: 10 }).map((_, i) => (
          <i key={i} className="qw_fancy_btn_point"></i>
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN DEALER DASHBOARD
// ═══════════════════════════════════════════════════════════
export default function DealerDashboard() {
  const { user, dealerData, logout, refreshDealerData } = useAuth();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");
  const [tabLoading, setTabLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [cars, setCars] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [carsLoading, setCarsLoading] = useState(true);
  const [showCarModal, setShowCarModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [bookingFilter, setBookingFilter] = useState("all");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingFilterCar, setBookingFilterCar] = useState("");
  const [bookingFilterDate, setBookingFilterDate] = useState("");
  const [bookingSortBy, setBookingSortBy] = useState("newest");
  const [carSearch, setCarSearch] = useState("");
  const [carFilterType, setCarFilterType] = useState("All");
  const [carFilterTransmission, setCarFilterTransmission] = useState("All");
  const [carFilterFuel, setCarFilterFuel] = useState("All");
  const [deletingCarId, setDeletingCarId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState({ msg: "", type: "" });
  const [dealerLogo, setDealerLogo] = useState(dealerData?.logo || null);
  const [isStatsVisible, setIsStatsVisible] = useState(true);
  const [selectedFleetCar, setSelectedFleetCar] = useState(null);
  const [vsFilterStatus, setVsFilterStatus] = useState(null);
  const [vsSearchTerm, setVsSearchTerm]     = useState("");

  // Users
  const [usersSubTab, setUsersSubTab] = useState("directory");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [userSearch, setUserSearch] = useState("");

  // Assistance
  const [selectedView, setSelectedView] = useState("requests");
  const [selectedAssistance, setSelectedAssistance] = useState(null);
  const [showAssistanceModal, setShowAssistanceModal] = useState(false);
  const [pendingAssistanceCount, setPendingAssistanceCount] = useState(0);

  // Notifications
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Operations
  const [lateBookingsCount, setLateBookingsCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [emergencyTab, setEmergencyTab] = useState("breakdown");
  const [selectedView2, setSelectedView2] = useState("all");

  // Verification modals
  const [showPickupVerification, setShowPickupVerification] = useState(false);
  const [showReturnVerification, setShowReturnVerification] = useState(false);
  const [selectedBookingForVerification, setSelectedBookingForVerification] =
    useState(null);
  const [selectedPickupInspection, setSelectedPickupInspection] =
    useState(null);
  const [selectedReturnInspection, setSelectedReturnInspection] =
    useState(null);

  const toastTimer = useRef(null);
  const dealerId = dealerData?.id;

  // Notification filters state
  const [notifications, setNotifications] = useState([]);
  const [notifSearchTerm, setNotifSearchTerm] = useState("");
  const [notifPriorityFilter, setNotifPriorityFilter] = useState(null);
  const [notifTypeFilter, setNotifTypeFilter] = useState(null);

  const [overviewCollapsed, setOverviewCollapsed] = useState(true);
  const [bookingsFilterCollapsed, setBookingsFilterCollapsed] = useState(true);
  const [fleetFilterCollapsed, setFleetFilterCollapsed] = useState(true);
  const [vsFilterCollapsed, setVsFilterCollapsed] = useState(true);
  const [customersFilterCollapsed, setCustomersFilterCollapsed] = useState(true);
  const [notifFilterCollapsed, setNotifFilterCollapsed] = useState(true);

  // ── Notify ─────────────────────────────────────────────
  function notify(msg, type = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(
      () => setToast({ msg: "", type: "" }),
      4000,
    );
  }

  async function switchTab(tab) {
    setTabLoading(true);
    setActiveTab(tab);
    await new Promise((r) => setTimeout(r, 250));
    setTabLoading(false);
  }

  // ── Firestore listeners ────────────────────────────────
  useEffect(() => {
    if (!dealerId) return;
    setCarsLoading(true);
    return onSnapshot(
      collection(db, "dealers", dealerId, "cars"),
      (snap) => {
        setCars(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCarsLoading(false);
      },
      (err) => {
        console.error(err);
        setCarsLoading(false);
      },
    );
  }, [dealerId]);

  useEffect(() => {
    if (!dealerId) return;
    return onSnapshot(
      query(
        collection(db, "bookings"),
        where("dealerId", "==", dealerId),
        orderBy("createdAt", "desc"),
      ),
      (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error(err),
    );
  }, [dealerId]);

  useEffect(() => {
  setUnreadNotificationCount(notifications.filter(n => !n.read).length);
}, [notifications]);

  useEffect(() => {
    if (!dealerId) return;
    return onSnapshot(
      query(
        collection(db, "bookings"),
        where("dealerId", "==", dealerId),
        where("status", "==", "active"),
      ),
      (snap) => {
        const now = new Date();
        let late = 0;
        snap.docs.forEach((d) => {
          const data = d.data();
          const dropoff = data.dropoffDate || data.returnDate;
          if (dropoff && new Date(dropoff) < now) late++;
        });
        setLateBookingsCount(late);
      },
    );
  }, [dealerId]);

  useEffect(() => {
    if (!dealerId) return;
    return onSnapshot(
      query(
        collection(db, "extensionRequests"),
        where("dealerId", "==", dealerId),
        where("status", "==", "pending"),
      ),
      (snap) => setPendingRequestsCount(snap.size),
      (err) => console.error(err),
    );
  }, [dealerId]);

  useEffect(() => {
    if (dealerData?.logo) setDealerLogo(dealerData.logo);
  }, [dealerData]);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  // ── Handlers ───────────────────────────────────────────
  const openAddCar = () => {
    setEditingCar(null);
    setShowCarModal(true);
  };
  const openEditCar = (car) => {
    setEditingCar(car);
    setShowCarModal(true);
  };
  const closeModal = () => {
    setShowCarModal(false);
    setEditingCar(null);
  };

  function handleViewUserBookings(u) {
    setSelectedUser(u);
    setUserBookings(
      u.bookings || bookings.filter((b) => b.userEmail === u.email),
    );
    setUsersSubTab("userBookings");
  }
  function handleBackToUsers() {
    setUsersSubTab("directory");
    setSelectedUser(null);
    setUserBookings([]);
  }

  const handleStartPickupVerification = (booking, inspection) => {
    setSelectedBookingForVerification(booking);
    setSelectedPickupInspection(inspection);
    setShowPickupVerification(true);
  };
  const handleStartReturnVerification = (booking, inspection) => {
    setSelectedBookingForVerification(booking);
    setSelectedReturnInspection(inspection);
    setShowReturnVerification(true);
  };

  async function handleBookingAction(
    booking,
    newStatus,
    reason = "",
    subject = "",
    actionType = "",
  ) {
    setActionLoading(booking.id);
    try {
      const isCancelled = newStatus === "cancelled",
        isRejected = newStatus === "rejected",
        isConfirmed = newStatus === "confirmed";
      await updateDoc(doc(db, "bookings", booking.id), {
        status: newStatus,
        [`${newStatus}At`]: new Date(),
        lastActionBy: "dealer",
        updatedByDealer: true,
        dealerActionReason: reason || "",
        dealerActionSubject: subject || "",
        ...(isCancelled ? { cancelledBy: "dealer" } : {}),
      });
      if (booking.userEmail) {
        if (isConfirmed) {
          await sendApprovalEmail({
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
        } else if (isRejected) {
          await sendRejectionEmail({
            name: booking.userName || booking.userEmail,
            email: booking.userEmail,
            carModel: booking.carModel,
            pickup: booking.pickup,
            dropoff: booking.dropoff,
            days: booking.days,
            total: booking.total,
            bookingId: booking.bookingId,
            reason,
            currency: booking.currency || "USD",
            currencySymbol: booking.currencySymbol || "$",
          });
        } else if (subject && reason) {
          await sendBookingEmail({
            to: booking.userEmail,
            subject,
            bookingData: booking,
            actionType: newStatus,
            reason,
          });
        }
      }
      const msgMap = {
        confirmed: "✅ Booking confirmed — email sent",
        cancelled: "Booking cancelled — customer notified",
        on_hold: "⏸ Booking placed on hold",
        rejected: "🚫 Booking rejected — customer notified",
        completed: "🏁 Booking marked as completed",
      };
      notify(
        msgMap[newStatus] || "Action completed",
        isCancelled || isRejected ? "error" : "success",
      );
    } catch (err) {
      console.error(err);
      notify("Action failed: " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleAvailability(car) {
    try {
      await updateDoc(doc(db, "dealers", dealerId, "cars", car.id), {
        isAvailable: !car.isAvailable,
      });
      notify(
        `${car.model} ${car.isAvailable ? "hidden from fleet" : "listed as available"}`,
      );
    } catch (err) {
      notify("Update failed: " + err.message, "error");
    }
  }
  async function handleDeleteCar(car) {
    if (deletingCarId !== car.id) {
      setDeletingCarId(car.id);
      setTimeout(
        () => setDeletingCarId((p) => (p === car.id ? null : p)),
        4000,
      );
      return;
    }
    try {
      await deleteDoc(doc(db, "dealers", dealerId, "cars", car.id));
      setDeletingCarId(null);
      notify(`${car.model} removed from fleet`);
    } catch (err) {
      notify("Delete failed: " + err.message, "error");
    }
  }

  // ── Stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date(),
      cm = now.getMonth(),
      cy = now.getFullYear();
    const tm = bookings.filter((b) => {
      const d = b.createdAt?.toDate?.();
      return d && d.getMonth() === cm && d.getFullYear() === cy;
    });
    return {
      totalCars: cars.length,
      activeCars: cars.filter((c) => c.isAvailable).length,
      totalBookings: bookings.length,
      pending: bookings.filter((b) => b.status === "pending_approval").length,
      confirmed: bookings.filter((b) =>
        ["confirmed", "dealer_confirmed"].includes(b.status),
      ).length,
      completed: bookings.filter((b) => b.status === "completed").length,
      revenue: bookings
        .filter((b) =>
          ["completed", "dealer_confirmed", "active"].includes(b.status),
        )
        .reduce((s, b) => s + (b.total || 0), 0),
      monthlyRevenue: tm
        .filter((b) =>
          ["confirmed", "completed", "dealer_confirmed"].includes(b.status),
        )
        .reduce((s, b) => s + (b.total || 0), 0),
      cancelledByDealer: bookings.filter(
        (b) => b.status === "cancelled" && b.cancelledBy === "dealer",
      ).length,
      cancelledByAdmin: bookings.filter(
        (b) => b.status === "cancelled" && b.cancelledBy === "admin",
      ).length,
      cancelledByUser: bookings.filter(
        (b) => b.status === "cancelled" && b.cancelledBy === "user",
      ).length,
      avgVal:
        bookings.length > 0
          ? bookings.reduce((s, b) => s + (b.total || 0), 0) / bookings.length
          : 0,
      avgDays:
        bookings.length > 0
          ? bookings.reduce((s, b) => s + (b.days || 0), 0) / bookings.length
          : 0,
    };
  }, [cars, bookings]);

  // ── Filtered bookings ──────────────────────────────────
  const filteredBookings = useMemo(() => {
    let result = bookings.filter((b) => {
      const s = bookingSearch.toLowerCase();
      const matchSearch =
        !bookingSearch ||
        b.carModel?.toLowerCase().includes(s) ||
        b.bookingId?.toLowerCase().includes(s) ||
        b.pickup?.toLowerCase().includes(s) ||
        b.userEmail?.toLowerCase().includes(s);
      const matchCar =
        !bookingFilterCar ||
        b.carModel?.toLowerCase().includes(bookingFilterCar.toLowerCase());
      const matchDate = !bookingFilterDate || b.date === bookingFilterDate;
      let matchStatus = true;
      if (bookingFilter === "all") matchStatus = true;
      else if (bookingFilter === "cancelled_dealer")
        matchStatus = b.status === "cancelled" && b.cancelledBy === "dealer";
      else if (bookingFilter === "cancelled_admin")
        matchStatus = b.status === "cancelled" && b.cancelledBy === "admin";
      else if (bookingFilter === "cancelled_user")
        matchStatus = b.status === "cancelled" && b.cancelledBy === "user";
      else matchStatus = b.status === bookingFilter;
      return matchSearch && matchCar && matchDate && matchStatus;
    });
    result = [...result].sort((a, b) => {
      if (bookingSortBy === "newest")
        return (
          new Date(b.createdAt?.toDate()) - new Date(a.createdAt?.toDate())
        );
      if (bookingSortBy === "oldest")
        return (
          new Date(a.createdAt?.toDate()) - new Date(b.createdAt?.toDate())
        );
      if (bookingSortBy === "priceHigh") return (b.total || 0) - (a.total || 0);
      if (bookingSortBy === "priceLow") return (a.total || 0) - (b.total || 0);
      return 0;
    });
    return result;
  }, [
    bookings,
    bookingSearch,
    bookingFilterCar,
    bookingFilterDate,
    bookingFilter,
    bookingSortBy,
  ]);

  const filteredCars = useMemo(
    () =>
      cars.filter((c) => {
        const ms =
          !carSearch ||
          c.model?.toLowerCase().includes(carSearch.toLowerCase());
        const mt = carFilterType === "All" || c.type === carFilterType;
        const mx =
          carFilterTransmission === "All" ||
          c.transmission === carFilterTransmission;
        const mf = carFilterFuel === "All" || c.fuel === carFilterFuel;
        return ms && mt && mx && mf;
      }),
    [cars, carSearch, carFilterType, carFilterTransmission, carFilterFuel],
  );

  const uniqueDates = useMemo(
    () => [...new Set(bookings.map((b) => b.date).filter(Boolean))].sort(),
    [bookings],
  );

  // ── Users derived ──────────────────────────────────────
  const allUsers = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const uid = b.userEmail;
      if (!uid) return;
      if (!map[uid])
        map[uid] = {
          id: uid,
          uid: b.userId,
          email: b.userEmail || "—",
          name: b.userName || b.userEmail || "—",
          phone: b.userPhone || "—",
          bookings: [],
          revenue: 0,
        };
      map[uid].bookings.push(b);
      if (["confirmed", "completed", "dealer_confirmed"].includes(b.status))
        map[uid].revenue += b.total || 0;
    });
    return Object.values(map).sort(
      (a, b) => b.bookings.length - a.bookings.length,
    );
  }, [bookings]);
  const filteredUsers = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          !userSearch ||
          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase()),
      ),
    [allUsers, userSearch],
  );

  // ── Nav items ───────────────────────────────────────────
  const NAV_ITEMS = [
    {
      id: "overview",
      label: "Overview",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      id: "bookings",
      label: "Bookings",
      badge: stats.pending,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      id: "fleet",
      label: "My Fleet",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    {
      id: "vehicleStatus",
      label: "Vehicle Status",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
    {
      id: "users",
      label: "Customers",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: "lateReturns",
      label: "Late Returns",
      badge: lateBookingsCount,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      id: "extensionRequests",
      label: "Extensions",
      badge: pendingRequestsCount,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="12" y1="14" x2="12" y2="18" />
          <line x1="10" y1="16" x2="14" y2="16" />
        </svg>
      ),
    },
    {
      id: "assistance",
      label: "Assistance",
      badge: pendingAssistanceCount,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      badge: unreadNotificationCount,
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      id: "settings",
      label: "Settings",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        </svg>
      ),
    },
  ];

  const iS = sidebarOpen ? "250px" : "90px";

  // ── Settings form ───────────────────────────────────────
function SettingsTab() {
  const [activeSection, setActiveSection] = useState("business");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(dealerData?.logo || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("dealerTheme") || "dark");
  const [settingsProfileCollapsed, setSettingsProfileCollapsed] = useState(true);
  const logoInputRef = useRef();

  const [form, setForm] = useState({
    businessName: dealerData?.businessName || "",
    businessAddress: dealerData?.businessAddress || "",
    city: dealerData?.city || "",
    state: dealerData?.state || "",
    country: dealerData?.country || "India",
    pincode: dealerData?.pincode || "",
    gstNumber: dealerData?.gstNumber || "",
    description: dealerData?.description || "",
    phone: dealerData?.phone || "",
    alternatePhone: dealerData?.alternatePhone || "",
    whatsapp: dealerData?.whatsapp || "",
    email: dealerData?.email || dealerData?.ownerEmail || "",
    website: dealerData?.website || "",
    openTime: dealerData?.openTime || "09:00",
    closeTime: dealerData?.closeTime || "20:00",
    workingDays: dealerData?.workingDays || ["Mon","Tue","Wed","Thu","Fri","Sat"],
    deliveryAvailable: dealerData?.deliveryAvailable ?? false,
    deliveryRadius: dealerData?.deliveryRadius || "",
    instantBooking: dealerData?.instantBooking ?? true,
    minRentalDays: dealerData?.minRentalDays || 1,
    maxRentalDays: dealerData?.maxRentalDays || 30,
    securityDeposit: dealerData?.securityDeposit || "",
    cancellationPolicy: dealerData?.cancellationPolicy || "flexible",
    instagram: dealerData?.instagram || "",
    facebook: dealerData?.facebook || "",
    emailNotifications: dealerData?.emailNotifications ?? true,
    smsNotifications: dealerData?.smsNotifications ?? false,
    whatsappNotifications: dealerData?.whatsappNotifications ?? true,
    notifyNewBooking: dealerData?.notifyNewBooking ?? true,
    notifyPickup: dealerData?.notifyPickup ?? true,
    notifyLateReturn: dealerData?.notifyLateReturn ?? true,
    notifySOS: dealerData?.notifySOS ?? true,
  });

  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  function field(key, val) {
    setForm(p => ({ ...p, [key]: val }));
  }

  function toggleDay(day) {
    setForm(p => ({
      ...p,
      workingDays: p.workingDays.includes(day)
        ? p.workingDays.filter(d => d !== day)
        : [...p.workingDays, day],
    }));
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setError("Logo must be under 3 MB"); return; }
    if (!file.type.startsWith("image/")) { setError("Please select an image file"); return; }
    setError("");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleThemeToggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("dealerTheme", next);
    document.documentElement.setAttribute("data-theme", next);
    notify(`Switched to ${next} mode`);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.businessName.trim() || !form.city.trim() || !form.phone.trim()) {
      setError("Business name, city and phone are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let logoUrl = dealerData?.logo || null;
      if (logoFile) {
        setUploadingLogo(true);
        const result = await uploadToCloudinary(logoFile, () => {});
        logoUrl = result.url;
        setUploadingLogo(false);
        setLogoFile(null);
        setDealerLogo(logoUrl);
      }

      await updateDoc(doc(db, "dealers", dealerId), {
        ...form,
        logo: logoUrl,
        updatedAt: new Date(),
      });

      if (refreshDealerData) refreshDealerData();
      notify("Settings saved successfully");
    } catch (err) {
      setError(err?.message || "Failed to save");
      setUploadingLogo(false);
    } finally {
      setSaving(false);
    }
  }

  const si = {
    ...inputStyle,
    padding: "10px 14px",
    paddingLeft: "14px",
    borderRadius: "12px",
    fontSize: "13px",
  };

  const KPI_COLOR = "#1e40af";
  const KPI_GLOW = "rgba(30,64,175,0.12)";

  const SECTIONS = [
    {
      id: "business",
      label: "Business Info",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      id: "contact",
      label: "Contact",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.52 2.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 17z"/>
        </svg>
      ),
    },
    {
      id: "operations",
      label: "Operations",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        </svg>
      ),
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      ),
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ),
    },
  ];

  // ── Shared nav button ──
  function NavButton({ section, horizontal = false }) {
    const active = activeSection === section.id;
    return (
      <button
        onClick={() => setActiveSection(section.id)}
        style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "11px 14px",
          borderRadius: "12px",
          border: "none",
          background: active ? "rgba(30,64,175,0.12)" : "transparent",
          color: active ? "#60a5fa" : "rgba(255,255,255,0.5)",
          cursor: "pointer",
          fontFamily: "Quicksand,sans-serif",
          fontSize: "13px",
          fontWeight: active ? "700" : "500",
          textAlign: "left",
          width: horizontal ? "auto" : "100%",
          flexShrink: horizontal ? 0 : undefined,
          whiteSpace: horizontal ? "nowrap" : undefined,
          borderLeft: `3px solid ${active ? "#1e40af" : "transparent"}`,
          transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        }}
        onMouseEnter={e => {
          if (!active) {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color = "rgba(255,255,255,0.8)";
            e.currentTarget.style.borderLeftColor = "rgba(30,64,175,0.4)";
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
            e.currentTarget.style.borderLeftColor = "transparent";
          }
        }}
      >
        <span style={{
          color: active ? "#60a5fa" : "rgba(255,255,255,0.4)",
          display: "flex", alignItems: "center",
          filter: active ? "drop-shadow(0 0 8px rgba(30,64,175,0.5))" : "none",
          transition: "all 0.25s",
        }}>
          {section.icon}
        </span>
        {section.label}
      </button>
    );
  }

  // ── Identity Card ──
  function IdentityCard({ mobile = false }) {
    return (
      <div style={{
        display: "flex",
        flexDirection: mobile ? "row" : "column",
        alignItems: mobile ? "center" : "center",
        padding: mobile ? "16px" : "20px 16px 24px",
        gap: mobile ? "16px" : "0",
      }}>
        <div
          onClick={() => logoInputRef.current?.click()}
          style={{
            position: "relative",
            width: mobile ? "60px" : "80px",
            height: mobile ? "60px" : "80px",
            borderRadius: mobile ? "16px" : "22px",
            overflow: "hidden",
            border: `2px dashed ${logoPreview ? "rgba(34,197,94,0.4)" : "rgba(30,64,175,0.3)"}`,
            background: logoPreview ? "transparent" : "rgba(255,255,255,0.03)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#60a5fa";
            e.currentTarget.style.transform = "scale(1.02)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = logoPreview ? "rgba(34,197,94,0.4)" : "rgba(30,64,175,0.3)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {logoPreview ? (
            <>
              <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                opacity: 0, transition: "opacity 0.25s",
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = 1)}
                onMouseLeave={e => (e.currentTarget.style.opacity = 0)}
              >
                <svg width={mobile ? "14" : "18"} height={mobile ? "14" : "18"} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                <span style={{ color: "#fff", fontSize: mobile ? "7px" : "9px", fontWeight: "700", marginTop: "4px" }}>CHANGE</span>
              </div>
            </>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <div style={{ fontSize: mobile ? "18px" : "22px", fontWeight: "800", color: "#60a5fa" }}>
                {(dealerData?.businessName || "D")[0].toUpperCase()}
              </div>
              <span style={{ fontSize: mobile ? "6px" : "8px", color: "rgba(255,255,255,0.3)", fontWeight: "700" }}>ADD LOGO</span>
            </div>
          )}
        </div>

        <div style={{ 
          flex: 1, 
          minWidth: 0,
          textAlign: mobile ? "left" : "center",
          width: mobile ? "auto" : "100%",
        }}>
          <p style={{ 
            margin: mobile ? "0 0 2px" : "0 0 2px", 
            color: "#fff", 
            fontWeight: "700", 
            fontSize: mobile ? "14px" : "14px",
            textAlign: mobile ? "left" : "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {dealerData?.businessName || "Your Business"}
          </p>
          <p style={{ 
            margin: mobile ? "0 0 4px" : "0 0 10px", 
            color: "rgba(255,255,255,0.35)", 
            fontSize: mobile ? "11px" : "11px",
            textAlign: mobile ? "left" : "center",
          }}>
            {dealerData?.city || "—"}
          </p>

          {mobile ? (
            // Mobile: compact info row
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {[
                { label: "Owner", value: dealerData?.ownerName },
                { label: "Status", value: dealerData?.status },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.45)",
                }}>
                  <span>{label}:</span>
                  <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: "600" }}>{value || "—"}</span>
                </div>
              ))}
            </div>
          ) : (
            // Desktop: full info rows
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { label: "Owner", value: dealerData?.ownerName },
                { label: "Status", value: dealerData?.status },
                { label: "Member since", value: fmtDate(dealerData?.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "6px 10px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
                  <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: "600" }}>{value || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Toggle component ──
  function Toggle({ value, onChange, label, sub, accentColor = "#1e40af" }) {
    return (
      <div
        onClick={() => onChange(!value)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "14px 16px",
          borderRadius: "14px",
          cursor: "pointer",
          background: value ? `${accentColor}08` : "rgba(255,255,255,0.02)",
          border: `1px solid ${value ? `${accentColor}25` : "rgba(255,255,255,0.06)"}`,
          transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
          userSelect: "none",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = `${accentColor}40`;
          if (!value) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = value ? `${accentColor}25` : "rgba(255,255,255,0.06)";
          if (!value) e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        }}
      >
        <div style={{
          width: "38px", height: "20px", borderRadius: "10px", flexShrink: 0, position: "relative",
          background: value ? `linear-gradient(90deg, #0c1a2e, ${accentColor})` : "rgba(255,255,255,0.08)",
          transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: value ? `0 0 12px ${accentColor}30` : "none",
        }}>
          <div style={{
            position: "absolute", top: "2px",
            left: value ? "20px" : "2px",
            width: "16px", height: "16px", borderRadius: "50%",
            background: "#fff",
            transition: "left 0.3s cubic-bezier(0.16,1,0.3,1)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <p className="toggle-label" style={{ margin: 0, color: "#fff", fontWeight: "600", fontSize: "13px" }}>{label}</p>
          {sub && <p className="toggle-sub" style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>{sub}</p>}
        </div>
      </div>
    );
  }

  // ── Section label ──
  function SectionLabel({ children }) {
    return (
      <p className="settings-section-label" style={{
        margin: "0 0 12px",
        color: "#60a5fa",
        fontSize: "10px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "1.5px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}>
        {children}
      </p>
    );
  }

  // ── Card wrapper ──
  function Card({ children, style = {} }) {
    return (
      <div className="settings-card" style={{
        background: "linear-gradient(145deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "18px",
        padding: "22px 24px",
        marginBottom: "16px",
        transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
        boxSizing: "border-box",
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(30,64,175,0.2)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
      }}>
        {children}
      </div>
    );
  }

  // ── Field wrapper ──
  function Field({ label, children, span2 = false }) {
    return (
      <div style={{ gridColumn: span2 ? "1/-1" : undefined, display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
        <label style={{ ...labelSt, fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>{label}</label>
        {children}
      </div>
    );
  }

  return (
    <div className="settings-root" style={{
      display: "flex",
      height: "100%",
      gap: "0",
      color: "#f8fafc",
      fontFamily: "Quicksand,sans-serif",
      animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
      overflow: "hidden",
    }}>
      <style>{`
        .settings-root { box-sizing: border-box; }
        .settings-root * { box-sizing: border-box; }
        .settings-sticky-mobile { display: none; }
        .settings-nav-row-mobile {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 2px;
        }
        .settings-profile-body {
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease;
          max-height: ${settingsProfileCollapsed ? "0px" : "600px"};
          opacity: ${settingsProfileCollapsed ? 0 : 1};
        }
        .settings-grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .settings-grid-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .settings-notif-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .settings-theme-row { display: flex; gap: 12px; }

        @media (max-width: 900px) {
          .settings-header-bar { padding: 16px 20px !important; }
          .settings-scroll-area { padding: 20px 20px 40px !important; }
        }

        @media (max-width: 768px) {
          .settings-root {
            flex-direction: column !important;
            height: auto !important;
            overflow: visible !important;
          }
          .settings-left {
            display: none !important;
          }
          .settings-right {
            width: 100% !important;
          }
          .settings-sticky-mobile {
            display: flex !important;
            flex-direction: column;
            gap: 10px;
            position: sticky !important;
            top: 0 !important;
            z-index: 20 !important;
            background: #0a0a14 !important;
            padding: 12px 12px 8px !important;
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }
          .settings-header-bar {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 14px !important;
            padding: 16px !important;
          }
          .settings-header-actions {
            width: 100% !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .settings-header-actions button {
            width: 100% !important;
            justify-content: center !important;
          }
          .settings-scroll-area {
            padding: 16px !important;
          }
          .settings-card {
            padding: 18px 16px !important;
            border-radius: 16px !important;
          }
          .settings-grid-2col {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px 10px !important;
          }
          .settings-grid-3col {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px 10px !important;
          }
          .settings-notif-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
        }

        @media (max-width: 479px) {
          .settings-sticky-mobile {
            padding: 0px !important;
          }
          .settings-scroll-area {
            padding: 12px 0px !important;
          }
          .settings-header-bar p {
            font-size: 12px !important;
          }
          .settings-card {
            padding: 14px !important;
          }
          .settings-card card svg {
            font-size: 5px !important;
          }
          .settings-grid-2col label {
            font-size: 11px !important;
          }
          .settings-grid-3col {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .settings-theme-row {
            flex-direction: row !important;
          }
          .settings-header-bar h2 {
            font-size: 19px !important;
          }
          /* Section labels — Identity, About Your Business, Social
             Media, Phone Numbers, Working Hours, Services, Channels,
             etc. — all share the one SectionLabel component. */
          .settings-section-label {
            font-size: 13.5px !important;
            margin-bottom: 20px !important;
          }
          /* Toggle rows — covers Services (Operations) and every row
             in Notifications identically, since both use the same
             Toggle component. Label goes 13px -> 13.5px; sub stays at
             its existing 11px either way. */
          .toggle-label {
            font-size: 13.5px !important;
          }
          .toggle-sub {
            font-size: 11px !important;
          }
        }
      `}</style>

      {/* MOBILE-ONLY sticky block: KPI + collapsible identity card + nav row */}
      <div className="settings-sticky-mobile">
        <KpiWidget
          gradient="linear-gradient(135deg,#0c1a2e 0%,#1e40af 100%)"
          shadow="0 8px 24px rgba(30,64,175,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
          label="SYSTEM CONFIGURATION"
          value="Settings"
          sub="Platform-wide controls"
          icon={
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
          }
        />

        {/* Collapsible toggle for the business profile card */}
        <button
          onClick={() => setSettingsProfileCollapsed(p => !p)}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            color: "rgba(255,255,255,0.7)",
            fontFamily: "Quicksand,sans-serif",
            fontSize: "12px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "1px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Business Profile</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: "transform 0.3s ease",
              transform: settingsProfileCollapsed ? "rotate(0deg)" : "rotate(180deg)",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className="settings-profile-body">
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "16px",
          }}>
            <IdentityCard mobile={true} />
          </div>
        </div>

        {/* Section nav — horizontally scrollable */}
        <div className="settings-nav-row-mobile">
          {SECTIONS.map(s => (
            <NavButton key={s.id} section={s} horizontal />
          ))}
        </div>
      </div>

      {/* ══ LEFT SIDEBAR (desktop only) ══ */}
      <div className="settings-left prem-scroll" style={{
        width: "295px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0",
        overflowY: "auto",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        padding: "20px 16px",
        background: "rgba(0,0,0,0.15)",
      }}>
        <KpiWidget 
          gradient="linear-gradient(135deg,#0c1a2e 0%,#1e40af 100%)" 
          shadow="0 8px 24px rgba(30,64,175,0.25),inset 0 1px 1px rgba(255,255,255,0.15)" 
          label="SYSTEM CONFIGURATION" 
          value="Settings" 
          sub="Platform-wide controls" 
          icon={ 
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"> 
              <circle cx="12" cy="12" r="3" /> 
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /> 
            </svg> 
          } 
        />

        {/* Logo block */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "20px" }}>
          <IdentityCard mobile={false} />
        </div>
        <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoChange} />

        {/* Nav */}
        <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "2px", color: "rgba(255,255,255,0.3)", paddingLeft: "4px", marginBottom: "8px" }}>
          SETTINGS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {SECTIONS.map(s => (
            <NavButton key={s.id} section={s} />
          ))}
        </div>
      </div>

      {/* ══ RIGHT CONTENT ══ */}
      <div className="settings-right" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div className="settings-header-bar" style={{
          padding: "20px 28px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "22px", color: "#fff", fontWeight: "800", letterSpacing: "-0.5px" }}>
              {SECTIONS.find(s => s.id === activeSection)?.label}
            </h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
              {{
                business: "Your dealership identity and public-facing information",
                contact: "How customers and the platform reach you",
                operations: "Working hours, policies and booking preferences",
                notifications: "Choose what alerts you receive and how",
                appearance: "Customize your dashboard experience",
              }[activeSection]}
            </p>
          </div>
          <div className="settings-header-actions" style={{ display: "flex", gap: "10px" }}>
            {error && (
              <div style={{
                padding: "8px 14px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "10px",
                color: "#ef4444",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving || uploadingLogo}
              style={{
                ...btnPrimary,
                padding: "10px 24px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: saving || uploadingLogo ? 0.65 : 1,
                boxShadow: "0 4px 15px rgba(30,64,175,0.2)",
                background: "linear-gradient(135deg,#0c1a2e,#1e40af)",
                transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(30,64,175,0.35)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(30,64,175,0.2)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {saving || uploadingLogo ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="prem-scroll settings-scroll-area" style={{ flex: 1, overflowY: "auto", padding: "24px 28px 48px" }}>

          {/* ══ BUSINESS INFO ══ */}
          {activeSection === "business" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <Card>
                <SectionLabel>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  Identity
                </SectionLabel>
                <div className="settings-grid-2col">
                  <Field label="Business Name *" span2>
                    <input value={form.businessName} onChange={e => field("businessName", e.target.value)} style={si} placeholder="e.g. Sam's Premium Rentals" onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="Street Address" span2>
                    <input value={form.businessAddress} onChange={e => field("businessAddress", e.target.value)} style={si} placeholder="123 Main Street" onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="City *">
                    <input value={form.city} onChange={e => field("city", e.target.value)} style={si} placeholder="Mumbai" onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="State">
                    <input value={form.state} onChange={e => field("state", e.target.value)} style={si} placeholder="Maharashtra" onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="Country">
                    <input value={form.country} onChange={e => field("country", e.target.value)} style={si} placeholder="India" onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="Pincode">
                    <input value={form.pincode} onChange={e => field("pincode", e.target.value.replace(/\D/g, ""))} style={si} placeholder="400001" maxLength={6} onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="GST Number">
                    <input value={form.gstNumber} onChange={e => field("gstNumber", e.target.value.toUpperCase())} style={si} placeholder="22AAAAA0000A1Z5" maxLength={15} onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="Website">
                    <input value={form.website} onChange={e => field("website", e.target.value)} style={si} placeholder="https://yoursite.com" onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                </div>
              </Card>

              <Card>
                <SectionLabel>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                  About Your Business
                </SectionLabel>
                <textarea
                  value={form.description}
                  onChange={e => field("description", e.target.value)}
                  rows={4}
                  placeholder="Tell customers what makes your dealership special — your USP, specialisations, service quality…"
                  style={{ ...si, resize: "none", lineHeight: "1.6", width: "100%", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#60a5fa")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")}
                />
                <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.25)", fontSize: "11px" }}>{form.description.length} / 500 characters</p>
              </Card>

              <Card>
                <SectionLabel>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53"/><path d="M16.5 3.5a4 4 0 0 1-4 4"/></svg>
                  Social Media
                </SectionLabel>
                <div className="settings-grid-2col">
                  <Field label="Instagram">
                    <input value={form.instagram} onChange={e => field("instagram", e.target.value)} style={si} placeholder="@yourhandle" onFocus={e => (e.target.style.borderColor = "#c084fc")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="Facebook">
                    <input value={form.facebook} onChange={e => field("facebook", e.target.value)} style={si} placeholder="facebook.com/yourpage" onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                </div>
              </Card>
            </div>
          )}

          {/* ══ CONTACT ══ */}
          {activeSection === "contact" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <Card>
                <SectionLabel>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/></svg>
                  Phone Numbers
                </SectionLabel>
                <div className="settings-grid-2col">
                  <Field label="Primary Phone *">
                    <input value={form.phone} onChange={e => field("phone", e.target.value.replace(/\D/g, ""))} style={si} placeholder="+91 98765 43210" maxLength={15} onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="Alternate Phone">
                    <input value={form.alternatePhone} onChange={e => field("alternatePhone", e.target.value.replace(/\D/g, ""))} style={si} placeholder="Optional" maxLength={15} onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="WhatsApp Number">
                    <input value={form.whatsapp} onChange={e => field("whatsapp", e.target.value.replace(/\D/g, ""))} style={si} placeholder="Same as primary" maxLength={15} onFocus={e => (e.target.style.borderColor = "#22c55e")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="Business Email">
                    <input value={form.email} onChange={e => field("email", e.target.value)} type="email" style={si} placeholder="contact@yourbusiness.com" onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                </div>
              </Card>
            </div>
          )}

          {/* ══ OPERATIONS ══ */}
          {activeSection === "operations" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <Card>
                <SectionLabel>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Working Hours
                </SectionLabel>
                <div className="settings-grid-2col" style={{ marginBottom: "16px" }}>
                  <Field label="Opening Time">
                    <input type="time" value={form.openTime} onChange={e => field("openTime", e.target.value)} style={{ ...si, colorScheme: "dark" }} onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="Closing Time">
                    <input type="time" value={form.closeTime} onChange={e => field("closeTime", e.target.value)} style={{ ...si, colorScheme: "dark" }} onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                </div>
                <label style={{ ...labelSt, fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>Working Days</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                  {DAYS.map(day => {
                    const active = form.workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: `1px solid ${active ? "rgba(30,64,175,0.4)" : "rgba(255,255,255,0.08)"}`,
                          background: active ? "rgba(30,64,175,0.12)" : "transparent",
                          color: active ? "#60a5fa" : "rgba(255,255,255,0.4)",
                          cursor: "pointer",
                          fontFamily: "Quicksand,sans-serif",
                          fontSize: "12px",
                          fontWeight: active ? "700" : "500",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={e => {
                          if (!active) {
                            e.currentTarget.style.borderColor = "rgba(30,64,175,0.3)";
                            e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                          }
                        }}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card>
                <SectionLabel>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  Booking Rules
                </SectionLabel>
                <div className="settings-grid-3col" style={{ marginBottom: "16px" }}>
                  <Field label="Min Rental Days">
                    <input type="number" min={1} max={30} value={form.minRentalDays} onChange={e => field("minRentalDays", Number(e.target.value))} style={si} onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="Max Rental Days">
                    <input type="number" min={1} max={365} value={form.maxRentalDays} onChange={e => field("maxRentalDays", Number(e.target.value))} style={si} onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                  <Field label="Security Deposit (₹)">
                    <input type="number" min={0} value={form.securityDeposit} onChange={e => field("securityDeposit", e.target.value)} style={si} placeholder="5000" onFocus={e => (e.target.style.borderColor = "#60a5fa")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                  </Field>
                </div>
                <Field label="Cancellation Policy">
                  <div style={{ position: "relative" }}>
                    <select
                      value={form.cancellationPolicy}
                      onChange={e => field("cancellationPolicy", e.target.value)}
                      style={{ ...si, appearance: "none", width: "100%", paddingRight: "36px", cursor: "pointer" }}
                      onFocus={e => (e.target.style.borderColor = "#60a5fa")}
                      onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")}
                    >
                      <option value="flexible" style={{ background: "#0c0c16" }}>Flexible — Full refund up to 24h before</option>
                      <option value="moderate" style={{ background: "#0c0c16" }}>Moderate — 50% refund up to 48h before</option>
                      <option value="strict" style={{ background: "#0c0c16" }}>Strict — No refund within 72h</option>
                      <option value="custom" style={{ background: "#0c0c16" }}>Custom — Contact dealer</option>
                    </select>
                    <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.3)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                </Field>
              </Card>

              <Card>
                <SectionLabel>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/></svg>
                  Services
                </SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <Toggle
                    value={form.instantBooking}
                    onChange={v => field("instantBooking", v)}
                    label="Instant Booking"
                    sub="Customers can book without waiting for your approval"
                  />
                  <Toggle
                    value={form.deliveryAvailable}
                    onChange={v => field("deliveryAvailable", v)}
                    label="Vehicle Delivery"
                    sub="You deliver the car to the customer's location"
                    accentColor="#22c55e"
                  />
                  {form.deliveryAvailable && (
                    <Field label="Delivery Radius (km)">
                      <input type="number" min={1} value={form.deliveryRadius} onChange={e => field("deliveryRadius", e.target.value)} style={{ ...si, maxWidth: "180px", width: "100%" }} placeholder="e.g. 25" onFocus={e => (e.target.style.borderColor = "#22c55e")} onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,.1)")} />
                    </Field>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* ══ NOTIFICATIONS ══ */}
          {activeSection === "notifications" && (
            <div className="settings-notifications-tab" style={{ animation: "fadeIn 0.3s ease" }}>
              <div className="settings-notif-grid">
                <Card>
                  <SectionLabel>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Channels
                  </SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <Toggle value={form.emailNotifications} onChange={v => field("emailNotifications", v)} label="Email Notifications" sub="Receive alerts in your inbox" />
                    <Toggle value={form.whatsappNotifications} onChange={v => field("whatsappNotifications", v)} label="WhatsApp Notifications" sub="Instant alerts on WhatsApp" accentColor="#22c55e" />
                    <Toggle value={form.smsNotifications} onChange={v => field("smsNotifications", v)} label="SMS Notifications" sub="Text messages for critical alerts" accentColor="#f59e0b" />
                  </div>
                </Card>

                <Card>
                  <SectionLabel>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
                    Alert Types
                  </SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <Toggle value={form.notifyNewBooking} onChange={v => field("notifyNewBooking", v)} label="New Booking" sub="Whenever a customer books one of your vehicles" />
                    <Toggle value={form.notifyPickup} onChange={v => field("notifyPickup", v)} label="Upcoming Pickup" sub="2 hours before a scheduled pickup" accentColor="#f59e0b" />
                    <Toggle value={form.notifyLateReturn} onChange={v => field("notifyLateReturn", v)} label="Late Return" sub="When a vehicle is past its return time" accentColor="#ef4444" />
                    <Toggle value={form.notifySOS} onChange={v => field("notifySOS", v)} label="SOS & Emergency" sub="Always-on critical safety alerts" accentColor="#ef4444" />
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ══ APPEARANCE ══ */}
          {activeSection === "appearance" && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <Card>
                <SectionLabel>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/></svg>
                  Theme
                </SectionLabel>
                <div className="settings-theme-row">
                  {[
                    {
                      id: "dark",
                      label: "Dark Mode",
                      sub: "Easy on the eyes",
                      icon: (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                      ),
                      bg: "linear-gradient(135deg,#0a0a14,#1a1a2e)",
                      border: "#1e40af",
                    },
                    {
                      id: "light",
                      label: "Light Mode",
                      sub: "Bright & clean",
                      icon: (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                        </svg>
                      ),
                      bg: "linear-gradient(135deg,#f0f4ff,#e8f0fe)",
                      border: "#3b82f6",
                    },
                  ].map(t => {
                    const active = theme === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={handleThemeToggle}
                        style={{
                          flex: 1,
                          padding: "24px 20px",
                          borderRadius: "16px",
                          cursor: "pointer",
                          background: active ? `${t.bg}, rgba(30,64,175,0.06)` : "rgba(255,255,255,0.02)",
                          border: `2px solid ${active ? t.border : "rgba(255,255,255,0.06)"}`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "10px",
                          transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                          boxShadow: active ? `0 0 24px ${t.border}25` : "none",
                        }}
                        onMouseEnter={e => { 
                          if (!active) {
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          }
                        }}
                        onMouseLeave={e => { 
                          if (!active) {
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                          }
                        }}
                      >
                        <div style={{ color: active ? t.border : "rgba(255,255,255,0.4)" }}>{t.icon}</div>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ margin: "0 0 3px", color: active ? "#fff" : "rgba(255,255,255,0.5)", fontWeight: "700", fontSize: "13px" }}>{t.label}</p>
                          <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>{t.sub}</p>
                        </div>
                        {active && (
                          <div style={{
                            width: "20px", height: "20px", borderRadius: "50%",
                            background: t.border,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p style={{ margin: "14px 0 0", color: "rgba(255,255,255,0.25)", fontSize: "11px", textAlign: "center" }}>
                  Theme is saved to this device. Full light mode support coming soon.
                </p>
              </Card>

              <Card>
                <SectionLabel>Dashboard Accent</SectionLabel>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {[
                    { color: "#1e40af", label: "Blue" },
                    { color: "#a855f7", label: "Cyan" },
                    { color: "#a855f7", label: "Purple" },
                    { color: "#22c55e", label: "Green" },
                    { color: "#f59e0b", label: "Amber" },
                    { color: "#ec4899", label: "Pink" },
                  ].map(({ color, label }) => (
                    <div
                      key={color}
                      title={label}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: color,
                        cursor: "pointer",
                        border: "2px solid transparent",
                        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
                        boxShadow: `0 4px 12px ${color}40`,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "scale(1.15)";
                        e.currentTarget.style.boxShadow = `0 6px 20px ${color}50`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = `0 4px 12px ${color}40`;
                      }}
                    />
                  ))}
                </div>
                <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.2)", fontSize: "11px" }}>
                  Accent color customization — coming soon
                </p>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Analytics Tab ───────────────────────────────────────
function AnalyticsTab() {
  const [activeMetric, setActiveMetric] = useState("revenue");
  const [hoveredBar, setHoveredBar] = useState(null);
  const [analyticsFilterCollapsed, setAnalyticsFilterCollapsed] = useState(true);

  const totalRevenue = stats.revenue;

  // ── Monthly data (last 6 months) ──────────────────────────────────────────
  const months = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      if (!b.createdAt) return;
      const d = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { bookings: 0, revenue: 0, cancelled: 0, completed: 0 };
      map[key].bookings++;
      if (["completed", "dealer_confirmed", "active"].includes(b.status))
        map[key].revenue += b.total || 0;
      if (b.status === "cancelled") map[key].cancelled++;
      if (b.status === "completed") map[key].completed++;
    });
    return Object.entries(map).slice(-6);
  }, [bookings]);

  // ── Top cars ───────────────────────────────────────────────────────────────
  const topCars = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      if (!b.carModel) return;
      if (!map[b.carModel]) map[b.carModel] = { bookings: 0, revenue: 0, completed: 0 };
      map[b.carModel].bookings++;
      if (["confirmed", "completed", "dealer_confirmed"].includes(b.status))
        map[b.carModel].revenue += b.total || 0;
      if (b.status === "completed") map[b.carModel].completed++;
    });
    return Object.entries(map).sort((a, b) => b[1].bookings - a[1].bookings).slice(0, 5);
  }, [bookings]);

  // ── Status breakdown ───────────────────────────────────────────────────────
  const statusBreakdown = useMemo(() => {
    const counts = {};
    bookings.forEach((b) => { counts[b.status] = (counts[b.status] || 0) + 1; });
    return counts;
  }, [bookings]);

  // ── Bar chart values ───────────────────────────────────────────────────────
  const barData = months.map(([month, data]) => ({
    month,
    value: activeMetric === "revenue" ? data.revenue : data.bookings,
    raw: data,
  }));
  const maxValue = Math.max(...barData.map((d) => d.value), 1);

  // ── Conversion rate ────────────────────────────────────────────────────────
  const conversionRate = bookings.length > 0
    ? ((stats.completed / bookings.length) * 100).toFixed(1)
    : "0.0";

  const avgBookingValue = bookings.length > 0
    ? (bookings.reduce((s, b) => s + (b.total || 0), 0) / bookings.length).toFixed(0)
    : 0;

  const PALETTE = ["#a855f7", "#a855f7", "#22c55e", "#f59e0b", "#ec4899"];

  // ── Shared sidebar button style ────────────────────────────────────────────
  // Updated SidebarBtn component with mobile grid support
function SidebarBtn({ active, color = "#818cf8", kpiColor = "#059669", icon, label, value, onClick, className = "" }) {
  const iconColor = active ? color : "rgba(255,255,255,0.55)";
  
  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        padding: "10px 8px",
        borderRadius: "10px",
        border: "none",
        background: active ? `${color}14` : "transparent",
        color: active ? color : "rgba(255,255,255,0.55)",
        cursor: "pointer",
        fontFamily: "Quicksand,sans-serif",
        fontSize: "13px",
        fontWeight: active ? "700" : "500",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderLeft: `3px solid ${active ? color : "transparent"}`,
        textAlign: "left",
        transition: "all 0.2s ease",
        width: "100%",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = `${kpiColor}10`;
          e.currentTarget.style.color = "#e2e8f0";
          e.currentTarget.style.borderLeftColor = kpiColor;
          const svg = e.currentTarget.querySelector('svg');
          if (svg) svg.setAttribute('stroke', '#e2e8f0');
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "rgba(255,255,255,0.55)";
          e.currentTarget.style.borderLeftColor = "transparent";
          const svg = e.currentTarget.querySelector('svg');
          if (svg) svg.setAttribute('stroke', 'rgba(255,255,255,0.55)');
        }
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden", minWidth: 0 }}>
        <span style={{ 
          display: "inline-flex", 
          alignItems: "center",
          color: iconColor,
          flexShrink: 0,
        }}>
          {icon}
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </span>
      {value !== undefined && (
        <span style={{ fontWeight: "700", color: active ? color : "#fff", flexShrink: 0, marginLeft: "8px" }}>{value}</span>
      )}
    </button>
  );
}

  return (
    <div className="analytics-container" style={{
      display: "flex",
      height: "100%",
      gap: "32px",
      padding: "20px",
      color: "#f8fafc",
      fontFamily: "Quicksand,sans-serif",
      animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <style>{`
        .analytics-container {
          display: flex !important;
          gap: 32px !important;
          padding: 20px !important;
        }
        .analytics-left {
          flex: 0 0 22% !important;
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 4px;
          min-width: 200px;
          max-height: 100%;
        }
        .analytics-right {
          flex: 0 0 78% !important;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .analytics-sticky-mobile {
          display: none;
        }
        .analytics-filter-toggle {
          display: none !important;
        }
        .analytics-filter-body {
          display: flex !important;
          flex-direction: column;
          gap: 20px;
        }
        .analytics-kpi-desktop {
          display: block;
        }
        .analytics-snapshot-label {
          display: block;
        }
        .analytics-stats-panel {
          display: block;
        }
        .analytics-top-car-card {
          display: block;
        }
        .analytics-conversion-card {
          display: block;
        }
        .analytics-spacer {
          display: block;
        }

        @media (max-width: 768px) {
          .analytics-container {
            flex-direction: column !important;
            gap: 16px !important;
            padding: 12px !important;
            height: auto !important;
          }
          .analytics-left {
            flex: none !important;
            width: 100% !important;
            padding-right: 0 !important;
            overflow-y: visible !important;
            min-width: unset !important;
            max-height: none !important;
          }
          .analytics-right {
            flex: none !important;
            width: 100% !important;
            height: auto !important;
          }
          .analytics-sticky-mobile {
            display: flex !important;
            flex-direction: column;
            gap: 10px;
            position: sticky !important;
            top: 0 !important;
            z-index: 20 !important;
            background: #0a0a14 !important;
            padding-bottom: 6px !important;
          }
          .analytics-left .analytics-kpi-desktop {
            display: none !important;
          }
          .analytics-left .analytics-snapshot-label {
            display: none !important;
          }
          .analytics-left .analytics-stats-panel {
            display: none !important;
          }
          .analytics-left .analytics-top-car-card {
            display: none !important;
          }
          .analytics-left .analytics-conversion-card {
            display: none !important;
          }
          .analytics-left .analytics-spacer {
            display: none !important;
          }
          .analytics-filter-toggle {
            display: flex !important;
          }
          .analytics-filter-body {
            max-height: ${analyticsFilterCollapsed ? '0px' : '3000px'} !important;
            opacity: ${analyticsFilterCollapsed ? '0' : '1'} !important;
            overflow: hidden !important;
            transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease !important;
            gap: 12px !important;
          }
          .analytics-right .analytics-chart-container {
            flex-direction: column !important;
          }
          .analytics-right .analytics-kpi-stack {
            flex: none !important;
            width: 100% !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
          .analytics-right .analytics-kpi-stack > div {
            width: 100% !important;
            min-width: 0 !important;
          }
          .analytics-right .analytics-chart-wrapper {
            width: 100% !important;
          }
          .analytics-right .analytics-grid-2col {
            grid-template-columns: 1fr !important;
          }
          .analytics-right .analytics-fleet-grid {
            grid-template-columns: 1fr !important;
          }
          .analytics-right .analytics-content-wrapper {
            padding: 16px !important;
          }
          .analytics-right .analytics-kpi-card {
            padding: 14px !important;
          }
          .analytics-right .analytics-kpi-card h2 {
            font-size: 17px !important;
          }
          .analytics-right .analytics-chart-toggle button {
            font-size: 10px !important;
            padding: 5px 10px !important;
          }
          .analytics-right .analytics-chart-bars {
            gap: 6px !important;
            min-height: 100px !important;
          }
          .analytics-right .analytics-chart-bars > div {
            max-width: 32px !important;
          }
          .analytics-right .analytics-chart-labels {
            gap: 6px !important;
          }
          .analytics-right .analytics-chart-labels span {
            font-size: 8px !important;
          }
          .analytics-right .analytics-status-breakdown {
            padding: 16px !important;
          }
          .analytics-right .analytics-monthly-summary {
            padding: 16px !important;
          }
          .analytics-right .analytics-monthly-summary-grid {
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 4px !important;
          }
          .analytics-right .analytics-monthly-summary-grid span {
            font-size: 10px !important;
          }
          .analytics-right .analytics-fleet-item {
            padding: 14px 16px !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .analytics-right .analytics-fleet-item-top {
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .analytics-right .analytics-fleet-item-top p {
            max-width: 100% !important;
            font-size: 13px !important;
          }
          .analytics-right .analytics-fleet-item-stats {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
          }
          .analytics-right .analytics-fleet-item-stats span {
            font-size: 11px !important;
          }

          .analytics-mobile-stat {
            padding: 8px 6px !important;
            font-size: 11px !important;
            border-left: none !important;
            border-radius: 8px !important;
            background: rgba(255,255,255,0.03) !important;
            justify-content: center !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 2px !important;
            text-align: center !important;
          }
          
          .analytics-mobile-stat span:first-child {
            gap: 4px !important;
            justify-content: center !important;
          }
          
          .analytics-mobile-stat span:first-child span:last-child {
            font-size: 9px !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
          
          .analytics-mobile-stat span:last-child {
            font-size: 11px !important;
            margin-left: 0 !important;
          }
          
          .analytics-mobile-stat svg {
            width: 12px !important;
            height: 12px !important;
          }

          .analytics-mobile-stats-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 4px !important;
          }

          /* Ensure the SidebarBtn buttons inside the grid behave properly */
          .analytics-mobile-stats-grid .analytics-mobile-stat {
            width: 100% !important;
            min-width: 0 !important;
            padding: 8px 6px !important;
            font-size: 11px !important;
            border-left: none !important;
            border-radius: 8px !important;
            background: rgba(255,255,255,0.03) !important;
            justify-content: center !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 2px !important;
            text-align: center !important;
          }

          .analytics-mobile-stats-grid .analytics-mobile-stat span:first-child {
            gap: 4px !important;
            justify-content: center !important;
          }

          .analytics-mobile-stats-grid .analytics-mobile-stat span:first-child span:last-child {
            font-size: 9px !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }

          .analytics-mobile-stats-grid .analytics-mobile-stat span:last-child {
            font-size: 11px !important;
            margin-left: 0 !important;
          }

          .analytics-mobile-stats-grid .analytics-mobile-stat svg {
            width: 12px !important;
            height: 12px !important;
          }
        }

        @media (max-width: 480px) {
          .analytics-container {
            padding: 0px !important;
            gap: 0px !important;
          }
          .section-header-row {
            padding: 0px 0px 20px !important;
            margin: 0px !important;
          }
          .analytics-right .analytics-content-wrapper {
            padding: 12px !important;
          }
          .analytics-right .analytics-kpi-stack {
            gap: 8px !important;
          }
          .analytics-right .analytics-kpi-card {
            padding: 12px !important;
          }
          .analytics-right .analytics-kpi-card h2 {
            font-size: 15px !important;
          }
          .analytics-right .analytics-chart-wrapper {
            padding: 0px !important;
          }
          .analytics-right .analytics-trend-card {
            padding: 14px !important;
          }
          .analytics-right .analytics-chart-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .analytics-right .analytics-chart-toggle {
            align-self: flex-end !important;
            margin-left: auto !important;
          }
          .analytics-right .analytics-status-breakdown {
            padding: 14px !important;
          }
          .analytics-right .analytics-monthly-summary {
            padding: 14px !important;
          }
          .analytics-right .analytics-monthly-summary-grid {
            grid-template-columns: 1fr 1fr 1fr !important;
          }
          .analytics-right .analytics-monthly-summary-grid span {
            font-size: 11px !important;
          }
          .analytics-right .analytics-fleet-item {
            padding: 12px 14px !important;
          }

          .analytics-mobile-stat {
            padding: 6px 4px !important;
            font-size: 10px !important;
          }
          
          .analytics-mobile-stat span:first-child span:last-child {
            font-size: 8px !important;
          }
          
          .analytics-mobile-stat span:last-child {
            font-size: 10px !important;
          }

          .analytics-mobile-stats-grid .analytics-mobile-stat {
            padding: 6px 4px !important;
            font-size: 10px !important;
          }

          .analytics-mobile-stats-grid .analytics-mobile-stat span:first-child span:last-child {
            font-size: 8px !important;
          }

          .analytics-mobile-stats-grid .analytics-mobile-stat span:last-child {
            font-size: 10px !important;
          }
        }
      `}</style>

      {/* ════ MOBILE STICKY ════ */}
      <div className="analytics-sticky-mobile">
        {/* KPI Widget */}
        <div style={{
          background: "linear-gradient(135deg, #052e16 0%, #059669 100%)",
          padding: "16px",
          borderRadius: "16px",
          color: "#fff",
          boxShadow: "0 8px 24px rgba(5,150,105,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>
              FLEET ANALYTICS
            </p>
            <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>
              Performance
            </p>
            <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>
              Revenue & booking insights
            </p>
          </div>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "11px",
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
        </div>

        {/* Mobile filter toggle */}
        <button
          className="analytics-filter-toggle"
          onClick={() => setAnalyticsFilterCollapsed((p) => !p)}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            color: "rgba(255,255,255,0.7)",
            fontFamily: "Quicksand,sans-serif",
            fontSize: "12px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "1px",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Quick Snapshot</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: "transform 0.3s ease",
              transform: analyticsFilterCollapsed ? "rotate(0deg)" : "rotate(180deg)",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Mobile filter body */}
        <div className="analytics-filter-body">
          {/* Stats panel - Mobile with 2 columns */}
          <div className="analytics-mobile-stats-grid" style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "14px",
            padding: "6px",
            overflow: "hidden",
            flexShrink: 0,
          }}>
            {[
              {
                label: "Total Revenue",
                value: `$${totalRevenue.toLocaleString()}`,
                color: "#22c55e",
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                ),
              },
              {
                label: "Total Bookings",
                value: stats.totalBookings,
                color: "#a855f7",
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                ),
              },
              {
                label: "Confirmed",
                value: stats.confirmed,
                color: "#22c55e",
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ),
              },
              {
                label: "Completed",
                value: stats.completed,
                color: "#a855f7",
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                ),
              },
              {
                label: "Pending",
                value: stats.pending,
                color: "#a855f7",
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                ),
              },
              {
                label: "Fleet Size",
                value: stats.totalCars,
                color: "#f59e0b",
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                ),
              },
              {
                label: "Avg. Value",
                value: `$${Number(avgBookingValue).toLocaleString()}`,
                color: "#06b6d4",
                icon: (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                ),
              },
            ].map(({ label, value, color, icon }) => (
              <SidebarBtn
                key={label}
                active={false}
                color={color}
                icon={icon}
                label={label}
                value={value}
                kpiColor="#059669"
                className="analytics-mobile-stat"
              />
            ))}
          </div>

          {/* Top vehicle card */}
          {topCars[0] && (
            <div style={{
              background: "linear-gradient(145deg, rgba(5,150,105,0.08), rgba(5,150,105,0.02))",
              border: "1px solid rgba(5,150,105,0.25)",
              borderRadius: "14px",
              padding: "16px 18px",
              position: "relative",
              overflow: "hidden",
              flexShrink: 0,
              transition: "all 0.3s ease",
            }}>
              <div style={{
                position: "absolute", top: "-30px", right: "-30px",
                width: "100px", height: "100px",
                background: "radial-gradient(circle, rgba(5,150,105,0.15) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div style={{
                  width: "28px", height: "28px",
                  borderRadius: "8px",
                  background: "rgba(5,150,105,0.15)",
                  border: "1px solid rgba(5,150,105,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", color: "#34d399", textTransform: "uppercase" }}>
                  Top Performer
                </p>
              </div>
              
              <p style={{ margin: "0 0 6px", fontSize: "15px", color: "#fff", fontWeight: "700" }}>{topCars[0][0]}</p>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                  {topCars[0][1].bookings} bookings
                </span>
                <span style={{ fontSize: "18px", color: "#22c55e", fontWeight: "800" }}>
                  ${topCars[0][1].revenue.toLocaleString()}
                </span>
              </div>
              
              <div style={{ height: "3px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: "6px" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min((topCars[0][1].bookings / Math.max(bookings.length, 1)) * 100, 100)}%`,
                  background: "linear-gradient(90deg, #052e16, #059669)",
                  borderRadius: "3px",
                  transition: "width 0.8s ease",
                }} />
              </div>
            </div>
          )}

          {/* Conversion rate card */}
          <div style={{
            background: "linear-gradient(145deg, rgba(5,150,105,0.08), rgba(5,150,105,0.02))",
            border: "1px solid rgba(5,150,105,0.25)",
            borderRadius: "14px",
            padding: "16px 18px",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
            transition: "all 0.3s ease",
          }}>
            <div style={{
              position: "absolute", top: "-30px", right: "-30px",
              width: "100px", height: "100px",
              background: "radial-gradient(circle, rgba(5,150,105,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <div style={{
                width: "28px", height: "28px",
                borderRadius: "8px",
                background: "rgba(5,150,105,0.12)",
                border: "1px solid rgba(5,150,105,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", color: "#34d399", textTransform: "uppercase" }}>
                Conversion Rate
              </p>
            </div>
            
            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", marginBottom: "8px" }}>
              <span style={{ fontSize: "28px", fontWeight: "800", color: "#fff", lineHeight: 1 }}>{conversionRate}</span>
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>%</span>
            </div>
            
            <div style={{ height: "4px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(parseFloat(conversionRate), 100)}%`,
                background: "linear-gradient(90deg, #052e16, #059669, #34d399)",
                borderRadius: "4px",
                transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
              }} />
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                {stats.completed} completed
              </span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                {bookings.length} total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ════ LEFT 22% ════ */}
      <div className="analytics-left">
        <div className="analytics-kpi-desktop">
          <div style={{
            background: "linear-gradient(135deg, #052e16 0%, #059669 100%)",
            padding: "16px",
            borderRadius: "16px",
            color: "#fff",
            boxShadow: "0 8px 24px rgba(5,150,105,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>
                FLEET ANALYTICS
              </p>
              <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>
                Performance
              </p>
              <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>
                Revenue & booking insights
              </p>
            </div>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "11px",
              background: "rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
          </div>
        </div>

        <div className="analytics-snapshot-label" style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", color: "rgba(255,255,255,0.4)", paddingLeft: "4px", flexShrink: 0 }}>
          QUICK SNAPSHOT
        </div>

        {/* Stats sidebar panel */}
        <div className="analytics-stats-panel" style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "14px",
          padding: "6px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          overflow: "hidden",
          flexShrink: 0,
        }}>
          {[
            {
              label: "Total Revenue",
              value: `$${totalRevenue.toLocaleString()}`,
              color: "#22c55e",
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              ),
            },
            {
              label: "Total Bookings",
              value: stats.totalBookings,
              color: "#a855f7",
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              ),
            },
            {
              label: "Confirmed",
              value: stats.confirmed,
              color: "#22c55e",
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ),
            },
            {
              label: "Completed",
              value: stats.completed,
              color: "#a855f7",
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              ),
            },
            {
              label: "Pending",
              value: stats.pending,
              color: "#a855f7",
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ),
            },
            {
              label: "Fleet Size",
              value: stats.totalCars,
              color: "#f59e0b",
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              ),
            },
            {
              label: "Avg. Value",
              value: `$${Number(avgBookingValue).toLocaleString()}`,
              color: "#06b6d4",
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              ),
            },
          ].map(({ label, value, color, icon }) => (
            <SidebarBtn
              key={label}
              active={false}
              color={color}
              icon={icon}
              label={label}
              value={value}
              kpiColor="#059669"
            />
          ))}
        </div>

        {/* Top vehicle card */}
        <div className="analytics-top-car-card">
          {topCars[0] && (
            <div style={{
              background: "linear-gradient(145deg, rgba(5,150,105,0.08), rgba(5,150,105,0.02))",
              border: "1px solid rgba(5,150,105,0.25)",
              borderRadius: "14px",
              padding: "16px 18px",
              position: "relative",
              overflow: "hidden",
              flexShrink: 0,
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(5,150,105,0.5)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(5,150,105,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(5,150,105,0.25)";
              e.currentTarget.style.boxShadow = "none";
            }}>
              <div style={{
                position: "absolute", top: "-30px", right: "-30px",
                width: "100px", height: "100px",
                background: "radial-gradient(circle, rgba(5,150,105,0.15) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />
              
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div style={{
                  width: "28px", height: "28px",
                  borderRadius: "8px",
                  background: "rgba(5,150,105,0.15)",
                  border: "1px solid rgba(5,150,105,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", color: "#34d399", textTransform: "uppercase" }}>
                  Top Performer
                </p>
              </div>
              
              <p style={{ margin: "0 0 6px", fontSize: "15px", color: "#fff", fontWeight: "700" }}>{topCars[0][0]}</p>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                  {topCars[0][1].bookings} bookings
                </span>
                <span style={{ fontSize: "18px", color: "#22c55e", fontWeight: "800" }}>
                  ${topCars[0][1].revenue.toLocaleString()}
                </span>
              </div>
              
              <div style={{ height: "3px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: "6px" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min((topCars[0][1].bookings / Math.max(bookings.length, 1)) * 100, 100)}%`,
                  background: "linear-gradient(90deg, #052e16, #059669)",
                  borderRadius: "3px",
                  transition: "width 0.8s ease",
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Conversion rate card */}
        <div className="analytics-conversion-card">
          <div style={{
            background: "linear-gradient(145deg, rgba(5,150,105,0.08), rgba(5,150,105,0.02))",
            border: "1px solid rgba(5,150,105,0.25)",
            borderRadius: "14px",
            padding: "16px 18px",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(5,150,105,0.5)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(5,150,105,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(5,150,105,0.25)";
            e.currentTarget.style.boxShadow = "none";
          }}>
            <div style={{
              position: "absolute", top: "-30px", right: "-30px",
              width: "100px", height: "100px",
              background: "radial-gradient(circle, rgba(5,150,105,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <div style={{
                width: "28px", height: "28px",
                borderRadius: "8px",
                background: "rgba(5,150,105,0.12)",
                border: "1px solid rgba(5,150,105,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", color: "#34d399", textTransform: "uppercase" }}>
                Conversion Rate
              </p>
            </div>
            
            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", marginBottom: "8px" }}>
              <span style={{ fontSize: "28px", fontWeight: "800", color: "#fff", lineHeight: 1 }}>{conversionRate}</span>
              <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>%</span>
            </div>
            
            <div style={{ height: "4px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: "8px" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(parseFloat(conversionRate), 100)}%`,
                background: "linear-gradient(90deg, #052e16, #059669, #34d399)",
                borderRadius: "4px",
                transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
              }} />
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                {stats.completed} completed
              </span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                {bookings.length} total
              </span>
            </div>
          </div>
        </div>

        <div className="analytics-spacer" style={{ flex: 1, minHeight: "20px" }} />
      </div>{/* end left */}

      {/* ════ RIGHT 78% ════ */}
      <div className="analytics-right">
        <SectionHeader
          title="Operational Analytics"
          sub="Performance overview, revenue trends, and fleet insights"
          badge="LIVE ANALYTICS"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />

        <div className="prem-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
          <div className="analytics-content-wrapper">

            {/* ── KPI Cards + Chart Side by Side ── */}
            <div className="analytics-chart-container" style={{
              display: "flex",
              gap: "20px",
              marginBottom: "24px",
              alignItems: "stretch",
            }}>
              
              {/* ── LEFT: KPI Cards Stack (25%) ── */}
              <div className="analytics-kpi-stack" style={{
                flex: "0 0 25%",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}>
                {[
                  {
                    label: "Total Revenue",
                    value: `$${totalRevenue.toLocaleString()}`,
                    change: "+12%",
                    up: true,
                    color: "#22c55e",
                    glow: "rgba(34,197,94,0.12)",
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    ),
                  },
                  {
                    label: "Monthly Revenue",
                    value: `$${stats.monthlyRevenue.toLocaleString()}`,
                    change: "+8%",
                    up: true,
                    color: "#a855f7",
                    glow: "rgba(14,165,233,0.12)",
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    ),
                  },
                  {
                    label: "Avg. Booking",
                    value: `$${Number(avgBookingValue).toLocaleString()}`,
                    change: "+3%",
                    up: true,
                    color: "#a855f7",
                    glow: "rgba(168,85,247,0.12)",
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    ),
                  },
                  {
                    label: "Completion Rate",
                    value: `${conversionRate}%`,
                    change: "+5%",
                    up: true,
                    color: "#f59e0b",
                    glow: "rgba(245,158,11,0.12)",
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    ),
                  },
                ].map((kpi, i) => (
                  <div
                    key={kpi.label}
                    className="analytics-kpi-card"
                    style={{
                      position: "relative",
                      padding: "16px 18px",
                      borderRadius: "16px",
                      background: "linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))",
                      border: "1px solid rgba(255,255,255,0.07)",
                      overflow: "hidden",
                      transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                      animation: `fadeIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s backwards`,
                      cursor: "default",
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${kpi.color}33`;
                      e.currentTarget.style.boxShadow = `0 8px 24px ${kpi.glow}`;
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 0, right: 0,
                      width: "60px", height: "60px",
                      background: `radial-gradient(circle at top right, ${kpi.color}20 0%, transparent 70%)`,
                      pointerEvents: "none",
                    }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div style={{
                        width: "30px", height: "30px",
                        borderRadius: "8px",
                        background: `${kpi.color}15`,
                        border: `1px solid ${kpi.color}25`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: kpi.color,
                      }}>
                        {kpi.icon}
                      </div>
                      <span style={{
                        fontSize: "9px", fontWeight: "700",
                        padding: "2px 8px", borderRadius: "16px",
                        background: kpi.up ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        color: kpi.up ? "#22c55e" : "#ef4444",
                        display: "flex", alignItems: "center", gap: "2px",
                      }}>
                        {kpi.up ? (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        ) : (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        )}
                        {kpi.change}
                      </span>
                    </div>

                    <p style={{ margin: "0 0 2px", fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {kpi.label}
                    </p>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#fff", letterSpacing: "-0.5px" }}>
                      {kpi.value}
                    </h2>
                  </div>
                ))}
              </div>

              {/* ── RIGHT: Chart (75%) ── */}
              <div className="analytics-chart-wrapper" style={{
                flex: 1,
                minWidth: 0,
              }}>
                <div className="analytics-trend-card" style={{
                  background: "linear-gradient(145deg, rgba(5,150,105,0.06), rgba(5,150,105,0.015))",
                  border: "1px solid rgba(5,150,105,0.2)",
                  borderRadius: "22px",
                  padding: "24px",
                  height: "100%",
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                  display: "flex",
                  flexDirection: "column",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(5,150,105,0.35)";
                  e.currentTarget.style.boxShadow = "0 4px 24px rgba(5,150,105,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(5,150,105,0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }}>
                  
                  <div style={{
                    position: "absolute", top: "-80px", right: "-80px",
                    width: "300px", height: "300px",
                    background: "radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%)",
                    pointerEvents: "none",
                  }} />
                  <div style={{
                    position: "absolute", bottom: "-60px", left: "-60px",
                    width: "200px", height: "200px",
                    background: "radial-gradient(circle, rgba(14,165,233,0.04) 0%, transparent 70%)",
                    pointerEvents: "none",
                  }} />

                  <div className="analytics-chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "34px", height: "34px",
                        borderRadius: "9px",
                        background: "rgba(5,150,105,0.15)",
                        border: "1px solid rgba(5,150,105,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#34d399",
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                      </div>
                      <div>
                        <h3 style={{ margin: "0 0 1px", color: "#fff", fontSize: "15px", fontWeight: "800", letterSpacing: "-0.3px" }}>
                          Trend Overview
                        </h3>
                        <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>
                          Last 6 months of activity
                        </p>
                      </div>
                    </div>

                    <div className="analytics-chart-toggle" style={{
                      display: "flex",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "10px",
                      padding: "3px",
                      gap: "3px",
                    }}>
                      {[
                        { id: "revenue", label: "Revenue", icon: (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        )},
                        { id: "bookings", label: "Bookings", icon: (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setActiveMetric(opt.id)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "8px",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            background: activeMetric === opt.id
                              ? "linear-gradient(135deg, rgba(5,150,105,0.25), rgba(5,150,105,0.1))"
                              : "transparent",
                            color: activeMetric === opt.id ? "#34d399" : "rgba(255,255,255,0.45)",
                            cursor: "pointer",
                            fontFamily: "Quicksand,sans-serif",
                            fontSize: "10px",
                            fontWeight: activeMetric === opt.id ? "700" : "600",
                            transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
                            boxShadow: activeMetric === opt.id ? "inset 0 0 0 1px rgba(5,150,105,0.3)" : "none",
                          }}
                          onMouseEnter={(e) => {
                            if (activeMetric !== opt.id) {
                              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (activeMetric !== opt.id) {
                              e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                    {months.length === 0 ? (
                      <div style={{ 
                        flex: 1,
                        display: "flex", 
                        flexDirection: "column",
                        alignItems: "center", 
                        justifyContent: "center", 
                        color: "rgba(255,255,255,0.25)", 
                        fontSize: "14px",
                        border: "1px dashed rgba(255,255,255,0.06)",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.01)",
                        minHeight: "160px",
                      }}>
                        <div style={{ textAlign: "center", opacity: 0.6 }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: "10px" }} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                          </svg>
                          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>No data available yet</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="analytics-chart-bars" style={{ 
                          display: "flex", 
                          alignItems: "flex-end", 
                          gap: "10px", 
                          flex: 1,
                          minHeight: "140px",
                          paddingLeft: "4px",
                          paddingRight: "4px",
                        }}>
                          {barData.map((d, i) => {
                            const h = Math.max((d.value / maxValue) * 120, 6);
                            const isHovered = hoveredBar === i;
                            const barColor = isHovered 
                              ? "linear-gradient(180deg, #34d399, #059669)"
                              : activeMetric === "revenue"
                                ? "linear-gradient(180deg, rgba(52,211,153,0.8), rgba(5,150,105,0.5))"
                                : "linear-gradient(180deg, rgba(14,165,233,0.8), rgba(5,150,105,0.4))";
                            
                            return (
                              <div
                                key={d.month}
                                style={{ 
                                  flex: 1, 
                                  display: "flex", 
                                  flexDirection: "column", 
                                  alignItems: "center", 
                                  gap: "0", 
                                  cursor: "pointer",
                                  position: "relative",
                                  height: "100%",
                                  justifyContent: "flex-end",
                                }}
                                onMouseEnter={() => setHoveredBar(i)}
                                onMouseLeave={() => setHoveredBar(null)}
                              >
                                <div style={{
                                  marginBottom: "6px",
                                  padding: "4px 10px",
                                  background: isHovered ? "rgba(5,150,105,0.12)" : "transparent",
                                  border: isHovered ? "1px solid rgba(5,150,105,0.3)" : "1px solid transparent",
                                  backdropFilter: isHovered ? "blur(12px)" : "none",
                                  borderRadius: "8px",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  color: isHovered ? "#34d399" : "transparent",
                                  whiteSpace: "nowrap",
                                  transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
                                  opacity: isHovered ? 1 : 0,
                                  transform: isHovered ? "translateY(0) scale(1)" : "translateY(6px) scale(0.95)",
                                  minWidth: "60px",
                                  textAlign: "center",
                                  pointerEvents: "none",
                                  boxShadow: isHovered ? "0 4px 16px rgba(5,150,105,0.15)" : "none",
                                }}>
                                  {activeMetric === "revenue"
                                    ? d.value >= 1000 ? `$${(d.value / 1000).toFixed(1)}k` : `$${d.value}`
                                    : `${d.value} bk`}
                                </div>

                                <div style={{
                                  width: "100%",
                                  maxWidth: "48px",
                                  height: `${h}px`,
                                  minHeight: "4px",
                                  background: barColor,
                                  borderRadius: "5px 5px 0 0",
                                  boxShadow: isHovered 
                                    ? "0 0 24px rgba(52,211,153,0.25), 0 0 48px rgba(5,150,105,0.08)" 
                                    : "none",
                                  transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)",
                                  transform: isHovered ? "scaleY(1.02) scaleX(0.95)" : "scaleY(1) scaleX(1)",
                                  position: "relative",
                                }}>
                                  {isHovered && (
                                    <div style={{
                                      position: "absolute",
                                      top: "-2px",
                                      left: "50%",
                                      transform: "translateX(-50%)",
                                      width: "16px",
                                      height: "3px",
                                      background: "rgba(255,255,255,0.4)",
                                      borderRadius: "4px",
                                    }} />
                                  )}
                                </div>
                                
                                {isHovered && (
                                  <div style={{
                                    position: "absolute",
                                    bottom: "-3px",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    width: "50%",
                                    height: "6px",
                                    background: "radial-gradient(ellipse, rgba(52,211,153,0.2) 0%, transparent 70%)",
                                    pointerEvents: "none",
                                  }} />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="analytics-chart-labels" style={{ 
                          display: "flex", 
                          gap: "10px", 
                          marginTop: "10px",
                          paddingLeft: "4px",
                          paddingRight: "4px",
                          flexShrink: 0,
                        }}>
                          {barData.map((d, i) => {
                            const isHovered = hoveredBar === i;
                            return (
                              <div key={d.month} style={{ flex: 1, textAlign: "center" }}>
                                <span style={{ 
                                  color: isHovered ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)", 
                                  fontSize: "10px", 
                                  fontWeight: isHovered ? "700" : "500",
                                  transition: "all 0.2s ease",
                                }}>
                                  {d.month}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: "12px",
                          paddingTop: "12px",
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                          gap: "16px",
                          flexShrink: 0,
                        }}>
                          {activeMetric === "revenue" ? (
                            <>
                              <div>
                                <p style={{ margin: 0, fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  Total Revenue
                                </p>
                                <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: "800", color: "#34d399" }}>
                                  ${barData.reduce((sum, d) => sum + d.raw.revenue, 0).toLocaleString()}
                                </p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <p style={{ margin: 0, fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  Avg Monthly
                                </p>
                                <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: "800", color: "#fff" }}>
                                  ${(barData.reduce((sum, d) => sum + d.raw.revenue, 0) / Math.max(barData.length, 1)).toLocaleString()}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <p style={{ margin: 0, fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  Total Bookings
                                </p>
                                <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: "800", color: "#a855f7" }}>
                                  {barData.reduce((sum, d) => sum + d.raw.bookings, 0)}
                                </p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <p style={{ margin: 0, fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  Avg Monthly
                                </p>
                                <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: "800", color: "#fff" }}>
                                  {(barData.reduce((sum, d) => sum + d.raw.bookings, 0) / Math.max(barData.length, 1)).toFixed(0)}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Status Breakdown + Top Cars side by side ── */}
            <div className="analytics-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

              {/* Status Breakdown */}
              <div className="analytics-status-breakdown" style={{
                background: "linear-gradient(145deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "22px",
                padding: "24px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "9px",
                    background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", color: "#fff", fontWeight: "700" }}>Status Breakdown</h4>
                    <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>All-time booking states</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { key: "confirmed", label: "Confirmed", color: "#22c55e" },
                    { key: "completed", label: "Completed", color: "#a855f7" },
                    { key: "pending_approval", label: "Pending", color: "#a855f7" },
                    { key: "active", label: "Active", color: "#3b82f6" },
                    { key: "cancelled", label: "Cancelled", color: "#ef4444" },
                  ].map(({ key, label, color }) => {
                    const count = statusBreakdown[key] || 0;
                    const pct = bookings.length > 0 ? ((count / bookings.length) * 100).toFixed(0) : 0;
                    return (
                      <div key={key}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>{label}</span>
                          <span style={{ fontSize: "12px", color, fontWeight: "700" }}>{count} <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: "400" }}>({pct}%)</span></span>
                        </div>
                        <div style={{ height: "5px", borderRadius: "5px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: color,
                            borderRadius: "5px",
                            transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                            opacity: 0.85,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Revenue by month mini table */}
              <div className="analytics-monthly-summary" style={{
                background: "linear-gradient(145deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "22px",
                padding: "24px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "9px",
                    background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#22c55e",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", color: "#fff", fontWeight: "700" }}>Monthly Summary</h4>
                    <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>Revenue & booking volume</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div className="analytics-monthly-summary-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "6px 8px", marginBottom: "4px" }}>
                    {["Month", "Revenue", "Bookings"].map((h) => (
                      <span key={h} style={{ fontSize: "10px", fontWeight: "700", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</span>
                    ))}
                  </div>
                  {months.length === 0 ? (
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No data yet</p>
                  ) : (
                    months.map(([month, data], i) => (
                      <div
                        key={month}
                        className="analytics-monthly-summary-grid"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          padding: "10px 8px",
                          borderRadius: "10px",
                          background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                          transition: "background 0.2s ease",
                          animation: `fadeIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s backwards`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(14,165,233,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent")}
                      >
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>{month}</span>
                        <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: "700" }}>
                          {data.revenue >= 1000 ? `$${(data.revenue / 1000).toFixed(1)}k` : `$${data.revenue}`}
                        </span>
                        <span style={{ fontSize: "12px", color: "#a855f7", fontWeight: "700" }}>{data.bookings}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── External Analytics Components ── */}
            <div className="analytics-fleet-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(400px,1fr))", gap: "20px", marginBottom: "20px" }}>
              <FleetUtilizationChart cars={cars} bookings={bookings} />
              <RevenueChart bookings={bookings} />
            </div>
            <PerformanceMetrics bookings={bookings} />
            <div style={{ marginTop: "20px" }}>
              <CustomerSatisfaction dealerId={dealerId} />
            </div>

            {/* ── Fleet Performance ── */}
            {topCars.length > 0 && (
              <div style={{ marginTop: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "9px",
                    background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: "#fff", fontSize: "17px", fontWeight: "800", letterSpacing: "-0.3px" }}>Fleet Performance</h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>Revenue contribution by vehicle</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {topCars.map(([car, data], i) => {
                    const pct = ((data.bookings / Math.max(bookings.length, 1)) * 100).toFixed(1);
                    const c = PALETTE[i % PALETTE.length];
                    return (
                      <div
                        key={car}
                        className="analytics-fleet-item"
                        style={{
                          background: "linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderLeft: `3px solid ${c}`,
                          borderRadius: "16px",
                          padding: "18px 22px",
                          transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                          animation: `fadeIn 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s backwards`,
                          cursor: "default",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                          e.currentTarget.style.transform = "translateX(5px)";
                          e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.2)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))";
                          e.currentTarget.style.transform = "translateX(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      >
                        <div className="analytics-fleet-item-top" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <div style={{
                            width: "38px", height: "38px", flexShrink: 0,
                            borderRadius: "11px",
                            background: `${c}18`,
                            border: `1px solid ${c}30`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "15px", fontWeight: "900", color: c,
                          }}>
                            {i + 1}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="analytics-fleet-item-stats" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                              <p style={{ margin: 0, fontSize: "14px", color: "#fff", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>{car}</p>
                              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0, flexWrap: "wrap" }}>
                                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: "600" }}>{data.bookings} bookings</span>
                                <span style={{ fontSize: "12px", color: c, fontWeight: "700" }}>{pct}% share</span>
                                <span style={{ fontSize: "16px", color: "#22c55e", fontWeight: "800" }}>${data.revenue.toLocaleString()}</span>
                              </div>
                            </div>
                            <div style={{ height: "5px", borderRadius: "5px", background: "rgba(0,0,0,0.3)", overflow: "hidden" }}>
                              <div style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: c,
                                borderRadius: "5px",
                                transition: "width 0.9s cubic-bezier(0.16,1,0.3,1)",
                                opacity: 0.9,
                              }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>{/* end content wrapper */}
        </div>{/* end scroll area */}
      </div>{/* end right */}
    </div>
  );
}

  // ── Early return if no dealer data ─────────────────────
  if (!dealerData)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a14",
          color: "#fff",
          fontFamily: "Quicksand,sans-serif",
          gap: "20px",
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              border: "2px solid rgba(14,165,233,.15)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "#a855f7",
              animation: "spin .8s linear infinite",
            }}
          />
        </div>
        <p style={{ color: "rgba(255,255,255,.4)", fontSize: "14px" }}>
          Loading your dashboard…
        </p>
      </div>
    );

  // ══════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════
return (
  <div
    style={{
      position: "relative",
      isolation: "isolate",
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      background: "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(67,56,202,0.1) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(147,51,234,0.08) 0%, transparent 50%), #05050b",
      color: "#fff",
      fontFamily: "Quicksand,sans-serif",
    }}
  >
    <div className="dd_stars" aria-hidden="true">
      <span className="dd_star_layer dd_star_layer_a"></span>
      <span className="dd_star_layer dd_star_layer_b"></span>
      <span className="dd_star_layer dd_star_layer_c"></span>
    </div>
    <div className="dd_ambient_a" aria-hidden="true"></div>
    <div className="dd_ambient_b" aria-hidden="true"></div>
    <ColorSpots density="sparse" />
      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(100px) scale(.8)}to{opacity:1;transform:translateX(0) scale(1)}}
        .page-section{animation:slideUp .2s ease both}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.3)}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,.4)}
        select,option{background:#1a1a2e;color:#fff}
        .prem-scroll::-webkit-scrollbar{width:6px}
        .prem-scroll::-webkit-scrollbar-track{background:transparent}
        .prem-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:10px}
        .prem-scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.2)}
        @media(max-width:768px){
          .dealer-sidebar{
            position:fixed!important;
            z-index:260!important;
            top:0!important;
            left:0!important;
            transform:translateX(-100%);
            backdrop-filter:none!important;
            -webkit-backdrop-filter:none!important;
            background:#0c0c16!important;
            width:260px!important;
            max-width:260px!important;
            min-width:260px!important;
            box-shadow:12px 0 40px rgba(0,0,0,0.6)!important;
          }
          .dealer-sidebar.open{transform:translateX(0)!important}
          .mobile-menu-btn{display:flex!important}
          .header-stats{display:none!important}
        }
          @media(max-width:768px){
            .dealer-tab-wrapper{ padding: 8px !important; }
          }
          @media(max-width:480px){
            .dealer-tab-wrapper{ padding: 0px 6px !important; }
          }
            @media(max-width:768px){

            /* NEW: stack section header title/sub above the badge on mobile */
            .section-header-row{
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 10px !important;
            }
            .section-header-badge{
              align-self: flex-start !important;
            }
          }

          @media (max-width: 480px) {
          .booking-row2-grid {
            grid-template-columns: 1fr 1fr !important;
            row-gap: 10px !important;
          }
          .booking-row2-route {
            grid-column: 1 / -1 !important;
          }
          .section-header-row {
            padding: 20px 0px !important;
          }
        }

        @media (max-width: 768px) {
          /* Header cleanup — matches admin */
          .dealer-header {
            padding: 0 12px !important;
            height: 60px !important;
            gap: 10px !important;
          }
          .dealer-header-left { gap: 10px !important; }
          .dealer-brand-logo { height: 34px !important; }
          .dealer-header-actions { gap: 8px !important; }

          .dealer-pending-badge,
          .dealer-addcar-btn {
            display: none !important;
          }

          .dealer-home-btn,
          .dealer-bell-btn {
            width: 38px !important;
            height: 38px !important;
            border-radius: 10px !important;
          }

          .dealer-avatar-btn {
            width: 38px !important;
            height: 38px !important;
            border-radius: 10px !important;
            padding: 0 !important;
          }
          .dealer-avatar-btn > div { border-radius: 9px !important; }
          .dealer-avatar-btn span { display: none !important; }

          /* Stats strip — 3 columns x 2 rows */
          .dealer-stats-wrap {
            padding: 14px 12px 16px !important;
          }
          .dealer-stats-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
          }
          .dealer-stat-card {
            padding: 10px !important;
            border-radius: 12px !important;
          }
          .dealer-stat-card h2 { font-size: 15px !important; }
          .dealer-stat-card p { font-size: 9px !important; }
        }

        @media (max-width: 380px) {
          .dealer-stats-grid { gap: 6px !important; }
          .dealer-stat-card { padding: 8px 6px !important; }
          .dealer-stat-card p:last-child { display: none !important; } /* hides "All time"/"This month" sub-text on tiniest screens */
        }
      `}</style>

      <Toast
        msg={toast.msg}
        type={toast.type}
        onDismiss={() => setToast({ msg: "", type: "" })}
      />
      {mobileSidebar && (
        <div
          onClick={() => setMobileSidebar(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            zIndex: 250,
          }}
        />
      )}

      {/* ════ SIDEBAR ════ */}
      <aside
        className={`dealer-sidebar ${mobileSidebar ? "open" : ""}`}
        style={{
          width: iS,
          minWidth: iS,
          height: "100vh",
          background:
            "linear-gradient(180deg,rgba(10,10,18,0.98),rgba(15,15,30,0.99))",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          flexDirection: "column",
          transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          flexShrink: 0,
          backdropFilter: "blur(24px)",
          boxShadow: "10px 0 30px rgba(0,0,0,0.3)",
          zIndex: 100,
        }}
      >
        {/* ── Branding with header background ── */}
        <div
          style={{
            padding: "0 24px",
            height: "76px",
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            flexShrink: 0,
            background:
              "radial-gradient(ellipse 60% 100% at 15% 0%, rgba(147,51,234,0.2) 0%, transparent 60%)," +
              "radial-gradient(ellipse 50% 90% at 95% 100%, rgba(67,56,202,0.16) 0%, transparent 65%)," +
              "linear-gradient(180deg, #120e20 0%, #0c0c16 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Drifting purple glow */}
          <div
            style={{
              position: "absolute",
              top: "-45%",
              left: "55%",
              width: "280px",
              height: "280px",
              background: "radial-gradient(circle, rgba(147,51,234,0.28) 0%, transparent 70%)",
              filter: "blur(46px)",
              pointerEvents: "none",
              animation: "dnav-header-drift 9s ease-in-out infinite",
            }}
          />
          
          {/* Energy line at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "2px",
              background: "linear-gradient(90deg, transparent, rgba(147,51,234,0.65), rgba(67,56,202,0.55), transparent)",
              backgroundSize: "200% 100%",
              animation: "dnav-header-line-slide 5s ease-in-out infinite",
            }}
          />

          <div
            onClick={() => setShowLogoModal(true)}
            title="Click to change logo"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              flexShrink: 0,
              background: dealerLogo
                ? "transparent"
                : "linear-gradient(135deg,#6366f1,#a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              cursor: "pointer",
              border: dealerLogo ? "1px solid rgba(14,165,233,0.25)" : "none",
              position: "relative",
              zIndex: 1,
            }}
          >
            {dealerLogo ? (
              <img
                src={dealerLogo}
                alt="Logo"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span
                style={{ color: "#fff", fontWeight: "800", fontSize: "13px" }}
              >
                {dealerData.businessName?.[0]?.toUpperCase() || "D"}
              </span>
            )}
          </div>
          
          {sidebarOpen && (
            <div
              style={{
                marginLeft: "16px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                position: "relative",
                zIndex: 1,
              }}
            >
              <p
                className="qw_shine_heading"
                style={{
                  margin:"0px",
                  fontSize:"16px",
                  fontWeight:"600"
                }}
              >
                {dealerData.businessName || "Car Rentals"}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "11px",
                }}
              >
                {dealerData.city || "Location"}
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 12px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {/* Main group */}
          <div style={{ marginBottom: "8px" }}>
            {NAV_ITEMS.slice(0, 5).map((item) => (
              <NavItem
                key={item.id}
                item={item}
                activeTab={activeTab}
                setActiveTab={(tab) => {
                  switchTab(tab);
                  setMobileSidebar(false);
                  if (tab !== "users") setUsersSubTab("directory");
                }}
                sidebarOpen={sidebarOpen}
              />
            ))}
          </div>
          {sidebarOpen && (
            <p
              style={{
                padding: "0 16px",
                margin: "0 0 8px",
                fontSize: "11px",
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.15em",
                fontWeight: "700",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Operations
            </p>
          )}
          <div style={{ marginBottom: "8px" }}>
            {NAV_ITEMS.slice(5, 9).map((item) => (
              <NavItem
                key={item.id}
                item={item}
                activeTab={activeTab}
                setActiveTab={(tab) => {
                  switchTab(tab);
                  setMobileSidebar(false);
                }}
                sidebarOpen={sidebarOpen}
              />
            ))}
          </div>
          {sidebarOpen && (
            <p
              style={{
                padding: "0 16px",
                margin: "0 0 8px",
                fontSize: "11px",
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.15em",
                fontWeight: "700",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Analytics
            </p>
          )}
          <div style={{ marginBottom: "16px" }}>
            {NAV_ITEMS.slice(9).map((item) => (
              <NavItem
                key={item.id}
                item={item}
                activeTab={activeTab}
                setActiveTab={(tab) => {
                  switchTab(tab);
                  setMobileSidebar(false);
                }}
                sidebarOpen={sidebarOpen}
              />
            ))}
          </div>
          {/* Add Car Button */}
            <button 
              className="dnav-add-btn" 
              onClick={openAddCar}
              style={{
                width:"100%",
              }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add Car</span>
              </button>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px",
            background: "rgba(0,0,0,0.2)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            flexShrink: 0,
          }}
        >
          {[
            {
              id: "toggle",
              label: sidebarOpen ? "Collapse" : "Expand",
              action: () => setSidebarOpen((p) => !p),
              color: "rgba(255,255,255,0.5)",
              icon: sidebarOpen ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              ),
            },
            {
              id: "logout",
              label: "Sign Out",
              action: async () => {
                await logout();
                navigate("/");
              },
              color: "#ff5f5f",
              icon: (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              ),
            },
          ].map(({ id, icon, label, action, color }) => (
            <button
              key={id}
              onClick={action}
              title={!sidebarOpen ? label : ""}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: "transparent",
                color,
                cursor: "pointer",
                transition: "all 0.2s",
                marginBottom: "4px",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                gap: "12px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color =
                  id === "logout" ? "#ff5f5f" : "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = color;
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "18px",
                  height: "18px",
                  flexShrink: 0,
                }}
              >
                {icon}
              </span>
              {sidebarOpen && (
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* ════ MAIN ════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        
        {/* ── Header (Dealer Dashboard) ── */}
        <header className="dnav-header">
          <nav className="dnav-shell">
            {/* Mobile menu toggle */}
            <button
              className="dnav-home-btn mobile-menu-btn"
              onClick={() => setMobileSidebar(p => !p)}
              style={{ display: "none" }}
              title="Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Brand */}
            <div className="dnav-brand">
              <img className="dnav-logo" src="/Images/logo2.png" alt="QuickWheels" />
            </div>

            {/* Stats - Commented out */}
            {/* <div className="dnav-stats">
              <div className="dnav-stat">
                <span className="dnav-stat-value revenue">${stats.revenue.toLocaleString()}</span>
                <span className="dnav-stat-label">Revenue</span>
              </div>
              <div className="dnav-stat">
                <span className="dnav-stat-value bookings">{stats.totalBookings}</span>
                <span className="dnav-stat-label">Bookings</span>
              </div>
              <div className="dnav-stat">
                <span className="dnav-stat-value fleet">{stats.totalCars}</span>
                <span className="dnav-stat-label">Fleet</span>
              </div>
            </div> */}

            {/* Actions */}
            <div className="dnav-actions">
              {/* Pending Badge */}
              {stats.pending > 0 && (
                <button
                  className="dnav-pending-btn"
                  onClick={() => {
                    switchTab("bookings");
                    setBookingFilter("pending_approval");
                  }}
                >
                  <span className="dnav-pending-dot" />
                  {stats.pending} Pending
                </button>
              )}

              <div 
                className="dnav-title-block"
                style={{
                  fontSize: "16px",
                  marginRight: "20px"
                }}

              >
                <p
                className="qw_shine_heading"
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: "700",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                DEALER{" "}
                <span
                  style={{ color: "rgba(255,255,255,0.4)", fontWeight: "500" }}
                >
                  DASHBOARD
                </span>
              </p>
              </div>

              {/* Add Car Button */}
              <button className="dnav-add-btn dnav-add-btn-header" onClick={openAddCar}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add Car</span>
              </button>

              {/* Home Button */}
              <button
                className="dnav-home-btn"
                onClick={() => navigate("/")}
                title="Go to Home"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </button>

              {/* Notification Bell */}
              <button
                className="dnav-bell-btn"
                onClick={() => {
                  switchTab("notifications");
                  setNotifications(p => p.map(n => ({ ...n, read: true })));
                }}
                title="Notifications"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadNotificationCount > 0 && (
                  <span className="dnav-bell-badge">
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Profile Button - Fancy button styling */}
              <button 
                className="qw_fancy_btn dnav-profile-btn" 
                onClick={() => navigate("/profile")}
              >
                <FancyButtonFx />
                <span className="qw_fancy_btn_inner">
                  <svg className="qw_fancy_btn_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {(dealerData.ownerName || dealerData.ownerEmail || "Dealer").trim().split(/\s+/)[0]}
                </span>
              </button>
            </div>
          </nav>
        </header>

        {/* ── Collapsible Stats Strip ── */}
        {[
          "overview",
          "bookings",
          "analytics",
          "fleet",
          "users",
          "vehicleStatus",
          "lateReturns",
          "extensionRequests",
          "assistance",
          "notifications",
          "settings",
        ].includes(activeTab) && (
          <div
            style={{
              position: "relative",
              width: "100%",
              zIndex: 40,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "100%",
                maxHeight: isStatsVisible ? "500px" : "0px",
                opacity: isStatsVisible ? 1 : 0,
                pointerEvents: isStatsVisible ? "auto" : "none",
                overflow: "hidden",
                background: "rgba(10,10,20,0.7)",
                backdropFilter: "blur(20px)",
                borderBottom: isStatsVisible
                  ? "1px solid rgba(255,255,255,0.04)"
                  : "1px solid transparent",
                transition:
                  "max-height 0.4s cubic-bezier(0.4,0,0.2,1),opacity 0.3s cubic-bezier(0.4,0,0.2,1),border-color 0.4s ease",
              }}
            >
              <div className="dealer-stats-wrap" style={{ padding: "20px 32px 24px" }}>
                <div className="dealer-stats-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(180px,auto))",
                    gap: "14px",
                  }}
                >
                  {[
                    {
                      label: "Total Revenue",
                      value: `$${stats.revenue.toLocaleString()}`,
                      change: 12,
                      color: "#10b981",
                      sub: "All time",
                    },
                    {
                      label: "Monthly Revenue",
                      value: `$${stats.monthlyRevenue.toLocaleString()}`,
                      change: 8,
                      color: "#3b82f6",
                      sub: "This month",
                    },
                    {
                      label: "Bookings",
                      value: stats.totalBookings,
                      change: 5,
                      color: "#8b5cf6",
                      sub: "Total orders",
                    },
                    {
                      label: "Pending",
                      value: stats.pending,
                      change: 0,
                      color: "#f59e0b",
                      sub: "Awaiting action",
                    },
                    {
                      label: "Avg. Value",
                      value: `$${stats.avgVal.toFixed(0)}`,
                      change: 3,
                      color: "#06b6d4",
                      sub: "Per booking",
                    },
                    {
                      label: "Fleet Size",
                      value: stats.totalCars,
                      change: 0,
                      color: "#ec4899",
                      sub: `${stats.activeCars} listed`,
                    },
                  ].map((s) => (
                    <div 
                      className="dealer-stat-card" 
                      key={s.label}
                      style={{
                        position: "relative",
                        padding: "16px",
                        borderRadius: "16px",
                        background:
                          "linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
                        border: "1px solid rgba(255,255,255,0.06)",
                        overflow: "hidden",
                        transition:
                          "transform 0.2s ease,border-color 0.2s ease",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.12)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,255,255,0.06)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "12px",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "rgba(255,255,255,0.4)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {s.label}
                        </p>
                        {s.change !== 0 && (
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "6px",
                              background:
                                s.change > 0
                                  ? "rgba(16,185,129,0.1)"
                                  : "rgba(239,68,68,0.1)",
                              color: s.change > 0 ? "#10b981" : "#ef4444",
                              display: "flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            {s.change > 0 ? "↑" : "↓"}
                            {Math.abs(s.change)}%
                          </div>
                        )}
                      </div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "22px",
                          fontWeight: "800",
                          color: "#fff",
                        }}
                      >
                        {s.value}
                      </h2>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "11px",
                          color: "rgba(255,255,255,0.3)",
                          fontWeight: "500",
                        }}
                      >
                        {s.sub}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Toggle button */}
            <div
              style={{
                position: "absolute",
                bottom: isStatsVisible ? "-10px" : "-30px",
                right: "30px",
                zIndex: 45,
                transition: "bottom 0.5s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <button
                onClick={() => setIsStatsVisible(!isStatsVisible)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "28px",
                  borderRadius: "14px",
                  background: isStatsVisible
                    ? "rgba(15,15,25,0.85)"
                    : "rgba(147,51,234,0.15)",
                  backdropFilter: "blur(12px)",
                  border: isStatsVisible
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(147,51,234,0.4)",
                  boxShadow: isStatsVisible
                    ? "0 4px 12px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)"
                    : "0 4px 20px rgba(147,51,234,0.25),inset 0 1px 0 rgba(255,255,255,0.1)",
                  color: isStatsVisible ? "rgba(255,255,255,0.5)" : "#a855f7",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                  outline: "none",
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isStatsVisible
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(147,51,234,0.7)";
                  e.currentTarget.style.color = isStatsVisible
                    ? "#fff"
                    : "#c084fc";
                  e.currentTarget.style.transform = "translateY(1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isStatsVisible
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(147,51,234,0.4)";
                  e.currentTarget.style.color = isStatsVisible
                    ? "rgba(255,255,255,0.5)"
                    : "#a855f7";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <svg
                  width="11"
                  height="7"
                  viewBox="0 0 11 7"
                  fill="none"
                  style={{
                    transform: isStatsVisible
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1)",
                    stroke: "currentColor",
                    strokeWidth: "1.8",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  }}
                >
                  <path d="M1 1.5L5.5 5.5L10 1.5" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Scrollable content area ── */}
        <div className="dealer-tab-wrapper" style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
          {tabLoading ? (
            <div style={{ padding: "40px" }}>
              <TabSkeleton />
            </div>
          ) : (
            <>
              {/* ══ OVERVIEW ══ */}
              {activeTab === "overview" && (
                <div
                  className="overview-container"
                  style={{
                    display: "flex",
                    height: "100%",
                    gap: "32px",
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "Quicksand,sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  <style>{`
                    /* Desktop styles */
                    .overview-container {
                      display: flex !important;
                      gap: 32px !important;
                      padding: 20px !important;
                    }
                    .overview-left {
                      flex: 0 0 22% !important;
                    }
                    .overview-right {
                      flex: 0 0 78% !important;
                    }
                    .overview-collapse-btn {
                      display: none !important;
                    }
                    .overview-stats-content {
                      max-height: none !important;
                      opacity: 1 !important;
                      padding: 15px 10px !important;
                      overflow: visible !important;
                    }
                    .overview-grid-2col {
                      display: grid !important;
                      grid-template-columns: 1fr 1fr !important;
                      gap: 20px !important;
                    }
                    .overview-grid-3col {
                      display: grid !important;
                      grid-template-columns: 1fr 1fr 1fr !important;
                      gap: 20px !important;
                    }
                    .overview-fleet-grid {
                      display: grid !important;
                      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
                      gap: 12px !important;
                    }

                    /* Desktop/mobile KPI toggle */
                    .overview-kpi-desktop {
                      display: block;
                    }
                    .overview-kpi-mobile {
                      display: none;
                    }

                    /* Mobile styles */
                    @media (max-width: 768px) {
                      .overview-container {
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px !important;
                        height: auto !important;
                      }
                      .overview-left {
                        flex: none !important;
                        width: 100% !important;
                        max-height: none !important;
                        overflow-y: visible !important;
                      }
                      .overview-right {
                        flex: none !important;
                        width: 100% !important;
                      }
                      .overview-collapse-btn {
                        display: flex !important;
                      }
                      .overview-stats-content {
                        max-height: ${overviewCollapsed ? '0px' : '800px'} !important;
                        opacity: ${overviewCollapsed ? '0' : '1'} !important;
                        padding: ${overviewCollapsed ? '0 20px' : '22px 20px'} !important;
                        overflow: hidden !important;
                        transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, padding 0.3s ease !important;
                      }
                      .overview-grid-2col {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                      }
                      .overview-grid-3col {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 12px !important;
                      }
                      .overview-fleet-grid {
                        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
                      }

                      /* Toggle: hide the desktop-placed KPI, show the sticky one that spans the full stack */
                      .overview-kpi-desktop {
                        display: none !important;
                      }
                      .overview-kpi-mobile {
                        display: block !important;
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 20 !important;
                        background: #0a0a14 !important;
                        padding-bottom: 6px !important;
                      }
                    }

                    @media (max-width: 479px) {
                      .overview-container {
                        padding: 6px !important;
                        gap: 10px !important;
                      }
                      .overview-grid-3col {
                        grid-template-columns: 1fr !important;
                        gap: 8px !important;
                      }
                      .overview-fleet-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                      }
                      .overview-stats-content {
                        padding: ${overviewCollapsed ? '0 12px' : '14px 12px'} !important;
                      }
                      .overview-welcome-box {
                        padding: 12px 14px !important;
                        margin: 0px !important;
                      }
                    }

                    @media (max-width: 360px) {
                      .overview-container {
                        padding: 4px !important;
                        gap: 8px !important;
                      }
                      .overview-fleet-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                      }
                    }
                  `}</style>

                  {/* MOBILE-ONLY sticky KPI — sibling of left/right so its containing block
                      spans the FULL stacked height (left + right), letting it stay pinned
                      through the whole scroll instead of unsticking once .overview-left ends */}
                  <div className="overview-kpi-mobile">
                    <KpiWidget
                      gradient="linear-gradient(135deg,#312e81 0%,#7c3aed 100%)"
                      shadow="0 8px 24px rgba(124,58,237,0.28),inset 0 1px 1px rgba(255,255,255,0.15)"
                      label="COMMAND OVERVIEW"
                      value="Dashboard"
                      sub="Platform KPI index"
                      icon={
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                        </svg>
                      }
                    />
                  </div>

                  {/* LEFT SECTION - now on top in mobile */}
                  <div className="overview-left">
                    {/* DESKTOP-ONLY KPI — same widget, plain (non-sticky) placement inside the left column */}
                    <div className="overview-kpi-desktop">
                      <KpiWidget
                        gradient="linear-gradient(135deg,#312e81 0%,#7c3aed 100%)"
                        shadow="0 8px 24px rgba(124,58,237,0.28),inset 0 1px 1px rgba(255,255,255,0.15)"
                        label="COMMAND OVERVIEW"
                        value="Dashboard"
                        sub="Platform KPI index"
                        icon={
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                          </svg>
                        }
                      />
                    </div>

                    {/* Welcome box - ALWAYS visible, never collapses */}
                    <div
                      className="overview-welcome-box"
                      style={{
                        position: "relative",
                        background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "20px",
                        overflow: "hidden",
                        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                        padding: "18px 20px",
                        marginTop: "12px",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "-40%",
                          right: "-30%",
                          width: "180px",
                          height: "180px",
                          background: "radial-gradient(circle, rgba(147,51,234,0.16) 0%, rgba(99,102,241,0) 70%)",
                          filter: "blur(30px)",
                          pointerEvents: "none",
                        }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1.2px" }}>
                          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <h2 style={{ 
                        margin: 0, 
                        fontSize: "20px", 
                        fontWeight: "700", 
                        color: "#fff", 
                        letterSpacing: "-0.4px", 
                        lineHeight: 1.3 
                      }}>
                        Welcome back,&nbsp;
                        <span style={{ 
                          background: "linear-gradient(to right,#fff 40%, rgba(255,255,255,0.7) 100%)", 
                          WebkitBackgroundClip: "text", 
                          WebkitTextFillColor: "transparent" 
                        }}>
                          {dealerData.ownerName?.split(" ")[0] || "Dealer"}
                        </span>
                      </h2>
                    </div>

                    {/* Collapsible wrapper for mobile - Quick Stats only */}
                    <div style={{ position: "relative", marginTop: "12px" }}>
                      <button
                        className="overview-collapse-btn"
                        onClick={() => setOverviewCollapsed(!overviewCollapsed)}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          color: "rgba(255,255,255,0.6)",
                          fontFamily: "Quicksand,sans-serif",
                          fontSize: "12px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          cursor: "pointer",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>Quick Stats</span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transition: "transform 0.3s ease",
                            transform: overviewCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      <div
                        className="overview-stats-content"
                        style={{
                          background: "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                          backdropFilter: "blur(20px)",
                          WebkitBackdropFilter: "blur(20px)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "20px",
                          overflow: "hidden",
                          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          {[
                            {
                              id: "totalBookings",
                              label: "Total Bookings",
                              value: bookings.length,
                              iconColor: "#a855f7",
                              onClick: null,
                              icon: (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                  <line x1="16" y1="2" x2="16" y2="6" />
                                  <line x1="8" y1="2" x2="8" y2="6" />
                                  <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                              ),
                            },
                            {
                              id: "customers",
                              label: "Customers",
                              value: new Set(bookings.map((b) => b.userEmail || b.userName)).size,
                              iconColor: "#a78bfa",
                              onClick: null,
                              icon: (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                              ),
                            },
                            {
                              id: "fleetSize",
                              label: "Fleet Size",
                              value: cars.length,
                              iconColor: "#22c55e",
                              onClick: null,
                              icon: (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                  <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                              ),
                            },
                            {
                              id: "activeCars",
                              label: "Active Cars",
                              value: stats.activeCars,
                              iconColor: "#a855f7",
                              onClick: () => switchTab("fleet"),
                              icon: (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                  <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                              ),
                            },
                            {
                              id: "pending",
                              label: "Pending",
                              value: stats.pending,
                              iconColor: "#f59e0b",
                              onClick: () => switchTab("bookings"),
                              icon: (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                              ),
                            },
                            {
                              id: "revenue",
                              label: "Revenue",
                              value: `$${stats.revenue.toLocaleString()}`,
                              iconColor: "#22c55e",
                              onClick: null,
                              icon: (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="1" x2="12" y2="23" />
                                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                              ),
                            },
                            {
                              id: "completed",
                              label: "Completed",
                              value: stats.completed,
                              iconColor: "#818cf8",
                              onClick: () => switchTab("bookings"),
                              icon: (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                  <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                              ),
                            },
                          ].map(({ id, label, value, iconColor, icon, onClick }) => (
                            <button
                              key={id}
                              onClick={onClick || undefined}
                              style={{
                                padding: "10px 8px",
                                borderRadius: "10px",
                                border: "none",
                                background: "transparent",
                                color: "rgba(255,255,255,0.55)",
                                cursor: onClick ? "pointer" : "default",
                                fontFamily: "inherit",
                                fontSize: "13px",
                                fontWeight: "500",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                borderLeft: "3px solid transparent",
                                textAlign: "left",
                                transition: "all 0.2s ease",
                                width: "100%",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(147,51,234,0.08)";
                                e.currentTarget.style.color = "#e2e8f0";
                                e.currentTarget.style.borderLeftColor = "#9333ea";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                                e.currentTarget.style.borderLeftColor = "transparent";
                              }}
                            >
                              <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ color: iconColor, display: "flex", alignItems: "center" }}>{icon}</span>
                                {label}
                              </span>
                              <span style={{ fontWeight: "700", color: "#fff" }}>{value}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {stats.pending > 0 && (
                      <button
                        onClick={() => switchTab("bookings")}
                        style={{
                          ...btnPrimary,
                          background: "linear-gradient(135deg,#ffa500,#ef4444)",
                          padding: "12px 16px",
                          fontSize: "12px",
                          textAlign: "center",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          width: "100%",
                          marginTop: "12px",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                        </svg>
                        Review {stats.pending} Pending
                      </button>
                    )}
                  </div>

                  {/* RIGHT SECTION - now at bottom in mobile */}
                  <div className="overview-right">
                    <SectionHeader
                      title="Command Overview"
                      sub="Real-time operational dashboard for your dealership"
                      badge="LIVE TELEMETRY"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      }
                    />

                    <div className="prem-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
                      <QuickActionBar
                        onVerifyPickup={() => {
                          switchTab("bookings");
                          setBookingFilter("confirmed");
                        }}
                        onVerifyReturn={() => {
                          switchTab("bookings");
                          setBookingFilter("active");
                        }}
                        onAddVehicle={openAddCar}
                        onViewBookings={() => {
                          switchTab("bookings");
                          setBookingFilter("all");
                        }}
                        setActiveTab={switchTab}
                      />

                      {/* Row 1 — Revenue + Vehicle Availability, side by side */}
                      <div className="overview-grid-2col">
                        <RevenueWidget dealerId={dealerId} />
                        <VehicleAvailabilityCard dealerId={dealerId} />
                      </div>

                      {/* Row 2 — Pickups, Returns, Active Trips, side by side */}
                      <div className="overview-grid-3col" style={{ marginTop: "16px", marginBottom: "20px" }}>
                        <TodaysPickupsCard dealerId={dealerId} />
                        <TodaysReturnsCard dealerId={dealerId} />
                        <ActiveTripsCard dealerId={dealerId} />
                      </div>

                      {/* Fleet snapshot */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                          <h3 style={{ margin: 0, color: "#fff", fontSize: "17px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            Fleet Snapshot
                          </h3>
                          <button onClick={() => switchTab("fleet")} style={{ ...btnSecondary, fontSize: "12px", padding: "7px 14px" }}>
                            Manage →
                          </button>
                        </div>
                        {cars.length === 0 ? (
                          <div style={{ background: "rgba(255,255,255,.02)", border: "1px dashed rgba(255,255,255,.08)", borderRadius: "20px", padding: "48px", textAlign: "center" }}>
                            <div style={{ marginBottom: "14px", display: "flex", justifyContent: "center" }}>
                              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                              </svg>
                            </div>
                            <p style={{ color: "rgba(255,255,255,.4)", marginBottom: "16px" }}>No cars yet</p>
                            <button onClick={openAddCar} className="qw_fancy_btn">
                              <FancyButtonFx />
                              <span className="qw_fancy_btn_inner">
                                <svg
                                  className="qw_fancy_btn_icon"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="12" y1="5" x2="12" y2="19" />
                                  <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add Your First Car
                              </span>
                            </button>
                          </div>
                        ) : (
                          <div className="overview-fleet-grid">
                            {cars.slice(0, 8).map((car) => (
                              <div
                                key={car.id}
                                style={{
                                  background: "linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.02))",
                                  border: "1px solid rgba(255,255,255,.06)",
                                  borderRadius: "14px",
                                  overflow: "hidden",
                                  cursor: "pointer",
                                  transition: "all .3s ease",
                                }}
                                onClick={() => openEditCar(car)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = "translateY(-4px)";
                                  e.currentTarget.style.borderColor = "rgba(147,51,234,.25)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "translateY(0)";
                                  e.currentTarget.style.borderColor = "rgba(255,255,255,.06)";
                                }}
                              >
                                <div style={{ position: "relative", height: "90px" }}>
                                  <img src={(car.images?.length ? car.images[0] : car.image) || "/Images/placeholder-car.png"} alt={car.model} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(10,10,20,.8),transparent 50%)" }} />
                                  <div
                                    style={{
                                      position: "absolute",
                                      top: "8px",
                                      right: "8px",
                                      width: "7px",
                                      height: "7px",
                                      borderRadius: "50%",
                                      background: car.isAvailable ? "#22c55e" : "#ef4444",
                                      animation: "pulseDot 2s ease-in-out infinite",
                                    }}
                                  />
                                </div>
                                <div style={{ padding: "10px 12px" }}>
                                  <p style={{ margin: "0 0 3px", color: "#fff", fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {car.model}
                                  </p>
                                  <p style={{ margin: 0, color: "#a855f7", fontSize: "12px", fontWeight: "800" }}>
                                    ${car.price}
                                    <span style={{ color: "rgba(255,255,255,.35)", fontWeight: "400", fontSize: "10px" }}>/day</span>
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ BOOKINGS ══ */}
              {activeTab === "bookings" && (
                <div
                  className="bookings-container"
                  style={{
                    display: "flex",
                    height: "100%",
                    gap: "32px",
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "Quicksand,sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  <style>{`
                    .bookings-container {
                      display: flex !important;
                      gap: 32px !important;
                      padding: 20px !important;
                    }
                    .bookings-left {
                      flex: 0 0 22% !important;
                    }
                    .bookings-right {
                      flex: 0 0 78% !important;
                    }
                    .bookings-sticky-mobile {
                      display: none;
                    }
                    .bookings-filter-toggle {
                      display: none !important;
                    }
                    .bookings-filter-body {
                      display: flex !important;
                      flex-direction: column;
                      gap: 20px;
                    }
                    .bookings-kpi-desktop {
                      display: block;
                    }

                    @media (max-width: 768px) {
                      .bookings-container {
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px !important;
                        height: auto !important;
                      }
                      .bookings-left {
                        flex: none !important;
                        width: 100% !important;
                      }
                      .bookings-right {
                        flex: none !important;
                        width: 100% !important;
                        height: auto !important;
                      }
                      .bookings-kpi-desktop {
                        display: none !important;
                      }
                      .bookings-sticky-mobile {
                        display: flex !important;
                        flex-direction: column;
                        gap: 10px;
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 20 !important;
                        background: #0a0a14 !important;
                        padding-bottom: 6px !important;
                      }
                      .bookings-filter-toggle {
                        display: flex !important;
                      }
                      .bookings-filter-body {
                        max-height: ${bookingsFilterCollapsed ? '0px' : '2000px'} !important;
                        opacity: ${bookingsFilterCollapsed ? '0' : '1'} !important;
                        overflow: hidden !important;
                        transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease !important;
                        gap: 10px !important;
                      }
                    }

                    @media (max-width: 480px) {
                      .bookings-container {
                        padding: 6px !important;
                        gap: 0px !important;
                      }
                    }
                  `}</style>

                  {/* MOBILE-ONLY sticky block: KPI + filter toggle together */}
                  <div className="bookings-sticky-mobile">
                    <KpiWidget
                      gradient="linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%)"
                      shadow="0 8px 24px rgba(59,130,246,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                      label="BOOKING LEDGER"
                      value={`${filteredBookings.length} Records`}
                      sub="Active reservation log"
                      icon={
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      }
                    />
                    <button
                      className="bookings-filter-toggle"
                      onClick={() => setBookingsFilterCollapsed((p) => !p)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        color: "rgba(255,255,255,0.7)",
                        fontFamily: "Quicksand,sans-serif",
                        fontSize: "12px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        cursor: "pointer",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Filters & Search</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transition: "transform 0.3s ease",
                          transform: bookingsFilterCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>

                  {/* LEFT 22% */}
                  <div
                    className="bookings-left prem-scroll"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    <div className="bookings-kpi-desktop">
                      <KpiWidget
                        gradient="linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%)"
                        shadow="0 8px 24px rgba(59,130,246,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                        label="BOOKING LEDGER"
                        value={`${filteredBookings.length} Records`}
                        sub="Active reservation log"
                        icon={
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        }
                      />
                    </div>

                    <div className="bookings-filter-body">
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          letterSpacing: "2px",
                          color: "rgba(255,255,255,0.4)",
                          paddingLeft: "4px",
                        }}
                      >
                        FILTER & SEARCH
                      </div>

                      {/* Search — full width on its own */}
                      <FilterInput
                        icon={
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        }
                        placeholder="Search vehicle, email, ID..."
                        value={bookingSearch}
                        onChange={setBookingSearch}
                      />

                      {/* Row 1: Car model + Date */}
                      <div className="bookings-filter-row">
                        <FilterInput
                          icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="1" y="3" width="22" height="13" rx="2" ry="2" />
                            </svg>
                          }
                          placeholder="Filter by car model..."
                          value={bookingFilterCar}
                          onChange={setBookingFilterCar}
                        />
                        <FilterSelect
                          icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          }
                          value={bookingFilterDate}
                          onChange={setBookingFilterDate}
                        >
                          <option value="" style={{ background: "#111" }}>All Dates</option>
                          {uniqueDates.map((d) => (
                            <option key={d} value={d} style={{ background: "#111" }}>{d}</option>
                          ))}
                        </FilterSelect>
                      </div>

                      {/* Row 2: Status + Sort */}
                      <div className="bookings-filter-row">
                        <FilterSelect
                          icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                          }
                          value={bookingFilter}
                          onChange={setBookingFilter}
                        >
                          <option value="all" style={{ background: "#111" }}>All Operational Status</option>
                          <option value="pending_approval" style={{ background: "#111" }}>⏳ Pending Approval</option>
                          <option value="dealer_confirmed" style={{ background: "#111" }}>📤 Dealer Approved</option>
                          <option value="confirmed" style={{ background: "#111" }}>✅ Confirmed</option>
                          <option value="active" style={{ background: "#111" }}>🚀 Active Trips</option>
                          <option value="on_hold" style={{ background: "#111" }}>⏸ On Hold</option>
                          <option value="completed" style={{ background: "#111" }}>🏁 Completed</option>
                          <option value="cancelled_dealer" style={{ background: "#111" }}>🔶 Cancelled by You</option>
                          <option value="cancelled_admin" style={{ background: "#111" }}>🔴 Cancelled by Admin</option>
                          <option value="cancelled_user" style={{ background: "#111" }}>👤 Cancelled by User</option>
                          <option value="rejected" style={{ background: "#111" }}>🚫 Rejected</option>
                        </FilterSelect>
                        <FilterSelect
                          icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="8" y1="6" x2="21" y2="6" />
                              <line x1="8" y1="12" x2="21" y2="12" />
                              <line x1="8" y1="18" x2="21" y2="18" />
                              <line x1="3" y1="6" x2="3.01" y2="6" />
                              <line x1="3" y1="12" x2="3.01" y2="12" />
                              <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                          }
                          value={bookingSortBy}
                          onChange={setBookingSortBy}
                        >
                          <option value="newest" style={{ background: "#111" }}>Chronological: Newest</option>
                          <option value="oldest" style={{ background: "#111" }}>Chronological: Oldest</option>
                          <option value="priceHigh" style={{ background: "#111" }}>Valuation: High to Low</option>
                          <option value="priceLow" style={{ background: "#111" }}>Valuation: Low to High</option>
                        </FilterSelect>
                      </div>

                      {(bookingSearch || bookingFilterCar || bookingFilterDate || bookingFilter !== "all") && (
                        <ResetBtn
                          onClick={() => {
                            setBookingSearch("");
                            setBookingFilterCar("");
                            setBookingFilterDate("");
                            setBookingFilter("all");
                            setBookingSortBy("newest");
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* RIGHT 78% */}
                  <div
                    className="bookings-right"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <SectionHeader
                      title="Bookings Directory"
                      sub="Real-time reservation oversight with automated status transitions"
                      badge="ACTIVE BOOKINGS MONITOR"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <polyline points="16 13 11 18 8 15" />
                        </svg>
                      }
                    />
                    <div className="prem-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
                      {filteredBookings.length === 0 ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "80px 40px",
                            background: "rgba(147,51,234,0.04)",
                            border: "1px dashed rgba(147,51,234,0.2)",
                            borderRadius: "24px",
                            transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                          }}
                        >
                          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
                            <svg 
                              width="48" 
                              height="48" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="#a855f7" 
                              strokeWidth="1.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              style={{ opacity: 0.6 }}
                            >
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                            </svg>
                          </div>
                          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "500" }}>
                            No booking records found matching current parameters.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "4px" }}>
                          {filteredBookings.map((b, idx) => (
                            <div key={b.id} style={{ animation: `fadeIn 0.4s cubic-bezier(0.16,1,0.3,1) ${idx * 0.03}s backwards` }}>
                              <BookingCard
                                booking={b}
                                onAction={handleBookingAction}
                                showUser={true}
                                onStartPickupVerification={handleStartPickupVerification}
                                onStartReturnVerification={handleStartReturnVerification}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ══ FLEET ══ */}
              {activeTab === "fleet" && (
                <div
                  className="fleet-container"
                  style={{
                    display: "flex",
                    height: "100%",
                    gap: "32px",
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "Quicksand,sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  <style>{`
                    .fleet-container {
                      display: flex !important;
                      gap: 32px !important;
                      padding: 20px !important;
                    }
                    .fleet-left {
                      flex: 0 0 22% !important;
                    }
                    .fleet-right {
                      flex: 0 0 78% !important;
                    }
                    .fleet-sticky-mobile {
                      display: none;
                    }
                    .fleet-filter-toggle {
                      display: none !important;
                    }
                    .fleet-filter-body {
                      display: flex !important;
                      flex-direction: column;
                      gap: 20px;
                    }
                    .fleet-kpi-desktop {
                      display: block;
                    }
                    .fleet-grid {
                      display: grid !important;
                      grid-template-columns: repeat(auto-fill,minmax(290px,1fr)) !important;
                      gap: 18px !important;
                    }

                    @media (max-width: 768px) {
                      .fleet-container {
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px !important;
                        height: auto !important;
                      }
                      .fleet-left {
                        flex: none !important;
                        width: 100% !important;
                      }
                      .fleet-right {
                        flex: none !important;
                        width: 100% !important;
                        height: auto !important;
                      }
                      .fleet-kpi-desktop {
                        display: none !important;
                      }
                      .fleet-sticky-mobile {
                        display: flex !important;
                        flex-direction: column;
                        gap: 10px;
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 20 !important;
                        background: #0a0a14 !important;
                        padding-bottom: 6px !important;
                      }
                      .fleet-filter-toggle {
                        display: flex !important;
                      }
                      .fleet-filter-body {
                        max-height: ${fleetFilterCollapsed ? '0px' : '3000px'} !important;
                        opacity: ${fleetFilterCollapsed ? '0' : '1'} !important;
                        overflow: hidden !important;
                        transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease !important;
                        gap: 12px !important;
                      }
                      .fleet-grid {
                        grid-template-columns: 1fr !important;
                        gap: 14px !important;
                      }
                    }

                    @media (max-width: 480px) {
                      .fleet-container {
                        padding: 6px !important;
                        gap: 0px !important;
                      }
                      .fleet-grid {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                      }
                    }

                    @media (max-width: 360px) {
                      .fleet-grid {
                        grid-template-columns: 1fr !important;
                      }
                    }
                  `}</style>

                  {/* MOBILE-ONLY sticky block: KPI + filter toggle together */}
                  <div className="fleet-sticky-mobile">
                    <KpiWidget
                      gradient="linear-gradient(135deg,#0369a1 0%,#0ea5e9 100%)"
                      shadow="0 8px 24px rgba(14,165,233,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                      label="FLEET ASSETS"
                      value={`${stats.totalCars} Vehicles`}
                      sub={`${stats.activeCars} listed • ${stats.totalCars - stats.activeCars} hidden`}
                      icon={
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                          <circle cx="5.5" cy="18.5" r="2.5" />
                          <circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                      }
                    />
                    <button
                      className="fleet-filter-toggle"
                      onClick={() => setFleetFilterCollapsed((p) => !p)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        color: "rgba(255,255,255,0.7)",
                        fontFamily: "Quicksand,sans-serif",
                        fontSize: "12px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        cursor: "pointer",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Filters & Search</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transition: "transform 0.3s ease",
                          transform: fleetFilterCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>

                  {/* LEFT 22% */}
                  <div
                    className="fleet-left prem-scroll"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    <div className="fleet-kpi-desktop">
                      <KpiWidget
                        gradient="linear-gradient(135deg,#0369a1 0%,#0ea5e9 100%)"
                        shadow="0 8px 24px rgba(14,165,233,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                        label="FLEET ASSETS"
                        value={`${stats.totalCars} Vehicles`}
                        sub={`${stats.activeCars} listed • ${stats.totalCars - stats.activeCars} hidden`}
                        icon={
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                            <circle cx="5.5" cy="18.5" r="2.5" />
                            <circle cx="18.5" cy="18.5" r="2.5" />
                          </svg>
                        }
                      />
                    </div>

                    <div className="fleet-filter-body">
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          letterSpacing: "2px",
                          color: "rgba(255,255,255,0.4)",
                          paddingLeft: "4px",
                        }}
                      >
                        FILTER & SEARCH
                      </div>

                      {/* Search — full width alone */}
                      <FilterInput
                        icon={
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        }
                        placeholder="Search model or dealer..."
                        value={carSearch}
                        onChange={setCarSearch}
                        accentColor="#0ea5e9"
                      />

                      {/* Row 1: Category + Transmission */}
                      <div className="fleet-filter-row">
                        <FilterSelect
                          icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                            </svg>
                          }
                          value={carFilterType}
                          onChange={setCarFilterType}
                          accentColor="#0ea5e9"
                        >
                          <option value="All" style={{ background: "#111" }}>All Categories</option>
                          {CAR_TYPES.map((t) => (
                            <option key={t} value={t} style={{ background: "#111" }}>{t}</option>
                          ))}
                        </FilterSelect>
                        <FilterSelect
                          icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          }
                          value={carFilterTransmission}
                          onChange={setCarFilterTransmission}
                          accentColor="#0ea5e9"
                        >
                          <option value="All" style={{ background: "#111" }}>All Transmissions</option>
                          {TRANSMISSION.map((t) => (
                            <option key={t} value={t} style={{ background: "#111" }}>{t}</option>
                          ))}
                        </FilterSelect>
                      </div>

                      {/* Row 2: Fuel + Add New Car, side by side — MOVED UP */}
                      <div className="fleet-filter-row">
                        <FilterSelect
                          icon={
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M13 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                            </svg>
                          }
                          value={carFilterFuel}
                          onChange={setCarFilterFuel}
                          accentColor="#0ea5e9"
                        >
                          <option value="All" style={{ background: "#111" }}>All Fuel Types</option>
                          {FUEL_TYPES.map((t) => (
                            <option key={t} value={t} style={{ background: "#111" }}>{t}</option>
                          ))}
                        </FilterSelect>
                        <button
                          onClick={openAddCar}
                          className="add_car_btn"
                          style={{
                            ...btnPrimary,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "10px 15px",
                            background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
                            boxShadow: "0 8px 24px rgba(14,165,233,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                            color: "#ffffff",
                            fontWeight: "600",
                            fontSize: "14px",
                            cursor: "pointer",
                            transition: "all 0.2s ease-in-out",
                            width: "100%",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow = "0 12px 28px rgba(14,165,233,0.35), inset 0 1px 1px rgba(255,255,255,0.25)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 8px 24px rgba(14,165,233,0.25), inset 0 1px 1px rgba(255,255,255,0.15)";
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          <span>Add New Car</span>
                        </button>
                      </div>

                      {/* Tier legend — NOW COMES AFTER both filter rows */}
                      <div
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "14px",
                          padding: "14px 16px",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 10px",
                            fontSize: "10px",
                            fontWeight: "700",
                            letterSpacing: "1.5px",
                            color: "rgba(255,255,255,0.35)",
                            textTransform: "uppercase",
                          }}
                        >
                          FLEET STATUS
                        </p>
                        {[
                          ["#22c55e", "Live & bookable"],
                          ["#ef4444", "Hidden from search"],
                          ["#f59e0b", "No category set"],
                        ].map(([c, l]) => (
                          <div key={l} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                            <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: c, flexShrink: 0 }} />
                            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{l}</span>
                          </div>
                        ))}
                      </div>

                      {(carSearch || carFilterType !== "All" || carFilterTransmission !== "All" || carFilterFuel !== "All") && (
                        <ResetBtn
                          onClick={() => {
                            setCarSearch("");
                            setCarFilterType("All");
                            setCarFilterTransmission("All");
                            setCarFilterFuel("All");
                          }}
                          label="RESET FILTERS"
                        />
                      )}
                    </div>
                  </div>

                  {/* RIGHT 78% */}
                  <div
                    className="fleet-right"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <SectionHeader
                      title="Fleet Management"
                      sub={`${stats.totalCars} total · ${stats.activeCars} listed · ${filteredCars.length} shown`}
                      badge="LIVE FLEET DATA"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      }
                    />
                    <div className="prem-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
                      {carsLoading ? (
                        <TabSkeleton />
                      ) : filteredCars.length === 0 ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "80px 40px",
                            background: "rgba(255,255,255,0.01)",
                            border: "1px dashed rgba(255,255,255,0.08)",
                            borderRadius: "24px",
                          }}
                        >
                          <div style={{ marginBottom: "16px", animation: "float 3s ease-in-out infinite", display: "flex", justifyContent: "center" }}>
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                              <circle cx="7" cy="17" r="2" />
                              <path d="M9 17h6" />
                              <circle cx="17" cy="17" r="2" />
                            </svg>
                          </div>
                          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "500", marginBottom: "16px" }}>
                            {carSearch || carFilterType !== "All" ? "No cars match your filters" : "No cars in your fleet yet"}
                          </p>
                          {!carSearch && carFilterType === "All" && (
                            <button
                              onClick={openAddCar}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: "8px",
                                background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
                                border: "none", borderRadius: "10px", color: "#fff",
                                padding: "10px 20px", fontWeight: "700", cursor: "pointer",
                                fontFamily: "Quicksand,sans-serif", fontSize: "13px",
                                boxShadow: "0 4px 20px rgba(14,165,233,0.2)",
                                transition: "all 0.25s ease",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(14,165,233,0.4)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(14,165,233,0.2)"; e.currentTarget.style.transform = "translateY(0)"; }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                              </svg>
                              Add Your First Car
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="fleet-grid">
                          {filteredCars.map((car) => (
                            <div
                              key={car.id}
                              onClick={() => setSelectedFleetCar(car)}
                              style={{
                                background: "linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.015))",
                                borderRadius: "20px",
                                overflow: "hidden",
                                border: car.isAvailable ? "1px solid rgba(34,197,94,.12)" : "1px solid rgba(255,255,255,.06)",
                                transition: "all .3s ease",
                                cursor: "pointer",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-4px)";
                                e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,.3), 0 0 24px -8px rgba(14,165,233,.4)";
                                e.currentTarget.style.borderColor = "rgba(14,165,233,0.35)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                                e.currentTarget.style.borderColor = car.isAvailable ? "rgba(34,197,94,.12)" : "rgba(255,255,255,.06)";
                              }}
                            >
                              <div style={{ position: "relative", height: "185px", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
                                <ImageCarousel
                                  images={car.images?.length ? car.images : (car.image ? [car.image] : [])}
                                  alt={car.model}
                                  height="185px"
                                  dotColor="#0ea5e9"
                                />
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(10,10,20,.95) 0%,rgba(10,10,20,.4) 50%,transparent 100%)", pointerEvents: "none" }} />
                                <div
                                  style={{
                                    position: "absolute", top: "12px", right: "12px",
                                    background: car.isAvailable ? "rgba(34,197,94,.9)" : "rgba(239,68,68,.85)",
                                    backdropFilter: "blur(12px)", color: "#fff",
                                    borderRadius: "20px", padding: "4px 12px",
                                    fontSize: "10px", fontWeight: "800",
                                    display: "flex", alignItems: "center", gap: "5px",
                                  }}
                                >
                                  <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#fff", animation: "pulseDot 2s ease-in-out infinite" }} />
                                  {car.isAvailable ? "LIVE" : "HIDDEN"}
                                </div>
                                <div style={{ position: "absolute", bottom: "12px", left: "14px" }}>
                                  <span style={{ color: "#fff", fontWeight: "800", fontSize: "22px" }}>${car.price}</span>
                                  <span style={{ color: "rgba(255,255,255,.55)", fontSize: "12px" }}>/day</span>
                                </div>
                                <div
                                  style={{
                                    position: "absolute", bottom: "12px", right: "14px",
                                    background: "rgba(14,165,233,.15)", backdropFilter: "blur(8px)",
                                    border: "1px solid rgba(14,165,233,.3)", color: "#0ea5e9",
                                    borderRadius: "8px", padding: "3px 8px",
                                    fontSize: "10px", fontWeight: "700",
                                  }}
                                >
                                  {car.type}
                                </div>
                              </div>

                              <div style={{ padding: "16px 18px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                                  <p style={{ margin: 0, color: "#fff", fontWeight: "800", fontSize: "15px" }}>{car.model}</p>
                                  {car.rating > 0 && (
                                    <span style={{ color: "#fbbf24", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "3px" }}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                      </svg>
                                      {car.rating.toFixed(1)}
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "12px" }}>
                                  {[`${car.seats} seats`, car.transmission, car.fuel].filter(Boolean).map((tag) => (
                                    <span
                                      key={tag}
                                      style={{
                                        padding: "3px 9px", borderRadius: "20px", fontSize: "10px",
                                        fontWeight: "600", background: "rgba(255,255,255,.05)",
                                        border: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.5)",
                                      }}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>

                                {car.location && (
                                  <p style={{ margin: "0 0 12px", color: "rgba(255,255,255,.35)", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                      <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {car.location}
                                  </p>
                                )}

                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: "600" }}>
                                    {bookings.filter((b) => b.carModel === car.model).length} bookings
                                  </span>
                                  <span style={{ fontSize: "11px", color: "#0ea5e9", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                                    View Details
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="5" y1="12" x2="19" y2="12" />
                                      <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
  
              {/* ══ VEHICLE STATUS ══ */}
              {activeTab === "vehicleStatus" && (
                <div
                  className="vs-container"
                  style={{
                    display: "flex",
                    height: "100%",
                    gap: "32px",
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "Quicksand,sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  <style>{`
                    .vs-container {
                      display: flex !important;
                      gap: 32px !important;
                      padding: 20px !important;
                    }
                    .vs-left {
                      flex: 0 0 22% !important;
                    }
                    .vs-right {
                      flex: 0 0 78% !important;
                    }
                    .vs-sticky-mobile {
                      display: none;
                    }
                    .vs-filter-toggle {
                      display: none !important;
                    }
                    .vs-filter-body {
                      display: flex !important;
                      flex-direction: column;
                      gap: 20px;
                    }
                    .vs-kpi-desktop {
                      display: block;
                    }

                    @media (max-width: 768px) {
                      .vs-container {
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px !important;
                        height: auto !important;
                      }
                      .vs-left {
                        flex: none !important;
                        width: 100% !important;
                      }
                      .vs-right {
                        flex: none !important;
                        width: 100% !important;
                        height: auto !important;
                      }
                      .vs-kpi-desktop {
                        display: none !important;
                      }
                      .vs-sticky-mobile {
                        display: flex !important;
                        flex-direction: column;
                        gap: 10px;
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 20 !important;
                        background: #0a0a14 !important;
                        padding-bottom: 6px !important;
                      }
                      .vs-filter-toggle {
                        display: flex !important;
                      }
                      .vs-filter-body {
                        max-height: ${vsFilterCollapsed ? '0px' : '3000px'} !important;
                        opacity: ${vsFilterCollapsed ? '0' : '1'} !important;
                        overflow: hidden !important;
                        transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease !important;
                        gap: 12px !important;
                      }
                    }

                    @media (max-width: 480px) {
                      .vs-container {
                        padding: 6px !important;
                        gap: 0px !important;
                      }
                    }
                  `}</style>

                  {/* MOBILE-ONLY sticky block: KPI + filter toggle together */}
                  <div className="vs-sticky-mobile">
                    <KpiWidget
                      gradient="linear-gradient(135deg,#164e63 0%,#06b6d4 100%)"
                      shadow="0 8px 24px rgba(6,182,212,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                      label="VEHICLE STATUS BOARD"
                      value={`${cars.length} Vehicles`}
                      sub="Live status tracking"
                      icon={
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      }
                    />
                    <button
                      className="vs-filter-toggle"
                      onClick={() => setVsFilterCollapsed((p) => !p)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        color: "rgba(255,255,255,0.7)",
                        fontFamily: "Quicksand,sans-serif",
                        fontSize: "12px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        cursor: "pointer",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Filters & Search</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transition: "transform 0.3s ease",
                          transform: vsFilterCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>

                  {/* ── LEFT 22% ── */}
                  <div
                    className="vs-left prem-scroll"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    <div className="vs-kpi-desktop">
                      <KpiWidget
                        gradient="linear-gradient(135deg,#164e63 0%,#06b6d4 100%)"
                        shadow="0 8px 24px rgba(6,182,212,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                        label="VEHICLE STATUS BOARD"
                        value={`${cars.length} Vehicles`}
                        sub="Live status tracking"
                        icon={
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                        }
                      />
                    </div>

                    <div className="vs-filter-body">
                      <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", color: "rgba(255,255,255,0.4)", paddingLeft: "4px" }}>
                        FILTER & SEARCH
                      </div>

                      {/* Search */}
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        </span>
                        <input
                          placeholder="Search model or plate…"
                          value={vsSearchTerm}
                          onChange={(e) => setVsSearchTerm(e.target.value)}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                            borderRadius: "14px", padding: "14px 16px 14px 44px",
                            color: "#fff", fontFamily: "Quicksand,sans-serif", fontSize: "13.5px", outline: "none",
                            transition: "border-color .25s cubic-bezier(0.16,1,0.3,1)",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "#06b6d4")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,.1)")}
                        />
                        {vsSearchTerm && (
                          <button
                            onClick={() => setVsSearchTerm("")}
                            style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", padding: 0 }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Filter buttons */}
                      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                        <button
                          onClick={() => setVsFilterStatus(null)}
                          style={{
                            padding: "10px 8px", borderRadius: "10px", border: "none",
                            background: !vsFilterStatus ? "rgba(6,182,212,0.08)" : "transparent",
                            color: !vsFilterStatus ? "#06b6d4" : "rgba(255,255,255,0.55)",
                            cursor: "pointer", fontFamily: "Quicksand,sans-serif", fontSize: "13px",
                            fontWeight: !vsFilterStatus ? "700" : "500",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            borderLeft: `3px solid ${!vsFilterStatus ? "#06b6d4" : "transparent"}`,
                            textAlign: "left", transition: "all 0.2s ease", width: "100%",
                          }}
                          onMouseEnter={(e) => { if (vsFilterStatus !== null) { e.currentTarget.style.background = "rgba(6,182,212,0.06)"; e.currentTarget.style.color = "#e2e8f0"; e.currentTarget.style.borderLeftColor = "#06b6d4"; } }}
                          onMouseLeave={(e) => { if (vsFilterStatus !== null) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; e.currentTarget.style.borderLeftColor = "transparent"; } }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ color: !vsFilterStatus ? "#06b6d4" : "rgba(255,255,255,0.35)", display: "flex", alignItems: "center" }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                              </svg>
                            </span>
                            All Vehicles
                          </span>
                          <span style={{ fontWeight: "700", color: !vsFilterStatus ? "#06b6d4" : "#fff" }}>{cars.length}</span>
                        </button>

                        {[
                          {
                            id: "available", label: "Available", color: "#22c55e",
                            icon: (color) => (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" fill={`${color}20`} />
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                            ),
                          },
                          {
                            id: "reserved", label: "Reserved", color: "#fbbf24",
                            icon: (color) => (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                              </svg>
                            ),
                          },
                          {
                            id: "pickup_awaited", label: "Pickup Awaited", color: "#3b82f6",
                            icon: (color) => (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" fill={`${color}30`} />
                              </svg>
                            ),
                          },
                          {
                            id: "on_trip", label: "On Trip", color: "#a855f7",
                            icon: (color) => (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                <path d="M4 22h16" />
                                <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                                <path d="M12 2a4 4 0 0 1 4 4v6H8V6a4 4 0 0 1 4-4z" />
                              </svg>
                            ),
                          },
                          {
                            id: "return_pending", label: "Return Pending", color: "#f59e0b",
                            icon: (color) => (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                              </svg>
                            ),
                          },
                          {
                            id: "cleaning", label: "Cleaning", color: "#06b6d4",
                            icon: (color) => (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z" />
                                <path d="M8 12h8" />
                                <path d="M10 16h4" />
                                <path d="M12 3v9" />
                              </svg>
                            ),
                          },
                          {
                            id: "under_maintenance", label: "Maintenance", color: "#ef4444",
                            icon: (color) => (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                              </svg>
                            ),
                          },
                          {
                            id: "unavailable", label: "Unavailable", color: "#6b7280",
                            icon: (color) => (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                            ),
                          },
                        ].map(({ id, label, color, icon }) => {
                          const active = vsFilterStatus === id;
                          const count = cars.filter((c) => {
                            const s = c.status || (c.isAvailable ? "available" : "unavailable");
                            return s === id;
                          }).length;
                          const iconColor = active ? color : "rgba(255,255,255,0.55)";

                          return (
                            <button
                              key={id}
                              onClick={() => setVsFilterStatus(active ? null : id)}
                              style={{
                                padding: "10px 8px", borderRadius: "10px", border: "none",
                                background: active ? "rgba(6,182,212,0.08)" : "transparent",
                                color: active ? color : "rgba(255,255,255,0.55)",
                                cursor: "pointer", fontFamily: "Quicksand,sans-serif", fontSize: "13px",
                                fontWeight: active ? "700" : "500",
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                borderLeft: `3px solid ${active ? color : "transparent"}`,
                                textAlign: "left", transition: "all 0.2s ease", width: "100%",
                              }}
                              onMouseEnter={(e) => {
                                if (!active) {
                                  e.currentTarget.style.background = "rgba(6,182,212,0.06)";
                                  e.currentTarget.style.color = "#e2e8f0";
                                  e.currentTarget.style.borderLeftColor = "#06b6d4";
                                  const svg = e.currentTarget.querySelector('svg');
                                  if (svg) svg.setAttribute('stroke', '#e2e8f0');
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!active) {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                                  e.currentTarget.style.borderLeftColor = "transparent";
                                  const svg = e.currentTarget.querySelector('svg');
                                  if (svg) svg.setAttribute('stroke', 'rgba(255,255,255,0.55)');
                                }
                              }}
                            >
                              <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ display: "inline-flex", alignItems: "center" }}>{icon(iconColor)}</span>
                                {label}
                              </span>
                              <span style={{ fontWeight: "700", color: active ? color : "#fff" }}>{count}</span>
                            </button>
                          );
                        })}
                      </div>

                      {vsFilterStatus && (
                        <button
                          onClick={() => setVsFilterStatus(null)}
                          style={{
                            width: "100%", padding: "14px 16px",
                            background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.25)",
                            borderRadius: "14px", color: "#fca5a5", cursor: "pointer",
                            fontWeight: "700", fontSize: "12px", letterSpacing: "0.5px",
                            fontFamily: "Quicksand,sans-serif", transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => { e.target.style.background = "rgba(239,68,68,0.12)"; e.target.style.borderColor = "rgba(239,68,68,0.4)"; }}
                          onMouseLeave={(e) => { e.target.style.background = "rgba(239,68,68,0.05)"; e.target.style.borderColor = "rgba(239,68,68,0.25)"; }}
                        >
                          CLEAR FILTER
                        </button>
                      )}
                    </div>
                  </div>
                  {/* end left */}

                  {/* ── RIGHT 78% ── */}
                  <div className="vs-right" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    <SectionHeader
                      title="Vehicle Status Board"
                      sub="Real-time vehicle condition and availability tracking"
                      badge="LIVE VEHICLE DATA"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      }
                    />
                    <div className="prem-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
                      <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "20px", padding: "24px", transition: "border-color 0.3s ease" }}>
                        <VehicleStatusBoard
                          cars={cars}
                          dealerId={dealerId}
                          filterStatus={vsFilterStatus}
                          setFilterStatus={setVsFilterStatus}
                          searchTerm={vsSearchTerm}
                          setSearchTerm={setVsSearchTerm}
                          onStatusChange={() => notify("Vehicle status updated", "success")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ USERS ══ */}
              {activeTab === "users" && (
                <div
                  className="customers-container"
                  style={{
                    display: "flex",
                    height: "100%",
                    gap: "32px",
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "Quicksand,sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  <style>{`
                    .customers-container {
                      display: flex !important;
                      gap: 32px !important;
                      padding: 20px !important;
                    }
                    .customers-left {
                      flex: 0 0 22% !important;
                    }
                    .customers-right {
                      flex: 0 0 78% !important;
                    }
                    .customers-sticky-mobile {
                      display: none;
                    }
                    .customers-filter-toggle {
                      display: none !important;
                    }
                    .customers-filter-body {
                      display: flex !important;
                      flex-direction: column;
                      gap: 20px;
                    }
                    .customers-kpi-desktop {
                      display: block;
                    }
                    .customer-row {
                      display: flex !important;
                      align-items: center !important;
                      gap: 24px !important;
                      justify-content: space-between !important;
                    }
                    .customer-row-stats {
                      display: flex !important;
                      gap: 30px !important;
                      align-items: center !important;
                      margin-left: auto !important;
                      flex-shrink: 0 !important;
                    }

                    @media (max-width: 768px) {
                      .customers-container {
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px !important;
                        height: auto !important;
                      }
                      .customers-left {
                        flex: none !important;
                        width: 100% !important;
                      }
                      .customers-right {
                        flex: none !important;
                        width: 100% !important;
                        height: auto !important;
                      }
                      .customers-kpi-desktop {
                        display: none !important;
                      }
                      .customers-sticky-mobile {
                        display: flex !important;
                        flex-direction: column;
                        gap: 10px;
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 20 !important;
                        background: #0a0a14 !important;
                        padding-bottom: 6px !important;
                      }
                      .customers-filter-toggle {
                        display: flex !important;
                      }
                      .customers-filter-body {
                        max-height: ${customersFilterCollapsed ? '0px' : '2000px'} !important;
                        opacity: ${customersFilterCollapsed ? '0' : '1'} !important;
                        overflow: hidden !important;
                        transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease !important;
                        gap: 12px !important;
                      }
                      .customer-row {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 14px !important;
                        padding: 16px !important;
                      }
                      .customer-row-stats {
                        gap: 0 !important;
                        justify-content: space-between !important;
                        width: 100% !important;
                        padding-top: 12px !important;
                        border-top: 1px solid rgba(255,255,255,0.05) !important;
                        margin-left: 0 !important;
                        flex-wrap: nowrap !important;
                      }
                      .customer-row-stats > div:nth-child(2) {
                        min-width: 0 !important;
                      }
                      .customer-row-header {
                        gap: 14px !important;
                      }
                    }

                    @media (max-width: 480px) {
                      .customers-container {
                        padding: 0px !important;
                        gap: 0px !important;
                      }                
                      .customer-row {
                        padding: 14px !important;
                      }
                      .customer-row-stats {
                        flex-wrap: nowrap !important;
                        gap: 8px !important;
                        justify-content: space-between !important;
                      }
                      .customer-row-stats > div {
                        flex-shrink: 0 !important;
                      }
                      .customer-row-stats > button {
                        width: auto !important;
                        flex-shrink: 0 !important;
                        padding: 8px 12px !important;
                        font-size: 10px !important;
                        white-space: nowrap !important;
                      }
                      .selected-user-card {
                        text-align: left !important;
                        padding: 14px !important;
                      }
                      .selected-user-toprow {
                        flex-direction: row !important;
                        align-items: center !important;
                        text-align: left !important;
                        width: 100% !important;
                      }
                      .selected-user-avatar {
                        flex-shrink: 0 !important;
                      }
                      .selected-user-info {
                        min-width: 0 !important;
                        flex: 1 !important;
                        text-align: left !important;
                      }
                      .selected-user-info h3,
                      .selected-user-info p {
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        white-space: nowrap !important;
                      }
                      .selected-user-stats {
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        width: 100% !important;
                        text-align: left !important;
                      }
                      .selected-user-stats p {
                        margin: 0 !important;
                      }
                      .booking-row2-route span {
                        font-size: 11px !important;
                      }
                      .booking-row2-grid span {
                        font-size: 11px !important;
                      }
                      .no_of_bookings {
                        font-size: 16px !important;
                      }
                      .revenue {
                        font-size: 13.5px !important;
                      }
                    }
                  `}</style>

                  {/* MOBILE-ONLY sticky block */}
                  <div className="customers-sticky-mobile">
                    {usersSubTab === "userBookings" ? (
                      <button
                        onClick={handleBackToUsers}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "12px 16px",
                          borderRadius: "14px",
                          border: "1px solid rgba(255,255,255,.08)",
                          background: "rgba(10,10,20,0.95)",
                          color: "rgba(255,255,255,.6)",
                          cursor: "pointer",
                          fontWeight: "700",
                          fontSize: "12.5px",
                          fontFamily: "inherit",
                          width: "100%",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="19" y1="12" x2="5" y2="12" />
                          <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Back to Customers
                      </button>
                    ) : (
                      <>
                        <KpiWidget
                          gradient="linear-gradient(135deg,#065f46 0%,#10b981 100%)"
                          shadow="0 8px 24px rgba(16,185,129,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                          label="TOTAL ACCOUNTS"
                          value={`${allUsers.length} Profiles`}
                          sub="Registered customers"
                          icon={
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                          }
                        />
                        <button
                          className="customers-filter-toggle"
                          onClick={() => setCustomersFilterCollapsed((p) => !p)}
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "12px",
                            color: "rgba(255,255,255,0.7)",
                            fontFamily: "Quicksand,sans-serif",
                            fontSize: "12px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            cursor: "pointer",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Filter Membership</span>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              transition: "transform 0.3s ease",
                              transform: customersFilterCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                            }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* LEFT 22% */}
                  <div
                    className="customers-left prem-scroll"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    {usersSubTab === "userBookings" ? (
                      <>
                        <button
                          className="customers-kpi-desktop"
                          onClick={handleBackToUsers}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "12px 16px",
                            borderRadius: "14px",
                            border: "1px solid rgba(255,255,255,.08)",
                            background: "rgba(255,255,255,.02)",
                            color: "rgba(255,255,255,.6)",
                            cursor: "pointer",
                            fontWeight: "700",
                            fontSize: "12.5px",
                            fontFamily: "inherit",
                            transition: "all 0.2s",
                            width: "100%",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,.08)";
                            e.currentTarget.style.color = "#fff";
                            e.currentTarget.style.transform = "translateX(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,.02)";
                            e.currentTarget.style.color = "rgba(255,255,255,.6)";
                            e.currentTarget.style.transform = "translateX(0)";
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                          </svg>
                          Back to Customers
                        </button>
                        {selectedUser && (
                          <div
                            className="selected-user-card"
                            style={{
                              background: "linear-gradient(135deg,rgba(14,165,233,.02),rgba(99,102,241,.02))",
                              border: "1px solid rgba(14,165,233,.12)",
                              padding: "18px 14px",
                              borderRadius: "16px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              textAlign: "center",
                              gap: "12px",
                            }}
                          >
                            <div
                              className="selected-user-toprow"
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "12px",
                              }}
                            >
                              <div
                                className="selected-user-avatar"
                                style={{
                                  width: "56px",
                                  height: "56px",
                                  borderRadius: "18px",
                                  background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "22px",
                                  fontWeight: "800",
                                  color: "#fff",
                                }}
                              >
                                {(selectedUser.name || selectedUser.email || "?")[0].toUpperCase()}
                              </div>
                              <div className="selected-user-info">
                                <h3 style={{ margin: "0 0 4px", fontSize: "15px", color: "#fff", fontWeight: "700" }}>
                                  {selectedUser.name || "Unknown"}
                                </h3>
                                <p style={{ margin: 0, color: "rgba(255,255,255,.4)", fontSize: "12px", wordBreak: "break-all" }}>
                                  {selectedUser.email}
                                </p>
                              </div>
                            </div>
                            <div
                              className="selected-user-stats"
                              style={{
                                padding: "8px 14px",
                                borderRadius: "10px",
                                background: "rgba(14,165,233,.08)",
                                border: "1px solid rgba(14,165,233,.15)",
                                width: "100%",
                                boxSizing: "border-box",
                              }}
                            >
                              <p className="no_of_bookings" style={{ margin: 0, fontSize: "18px", color: "#fff", fontWeight: "800" }}>
                                {userBookings.length} <span style={{ fontSize: "12px", opacity: 0.5 }}>Bookings</span>
                              </p>
                              <p className="revenue" style={{ margin: "2px 0 0", fontSize: "13px", color: "#22c55e", fontWeight: "700" }}>
                                ${selectedUser.revenue?.toLocaleString() || 0} Revenue
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="customers-kpi-desktop">
                          <KpiWidget
                            gradient="linear-gradient(135deg,#065f46 0%,#10b981 100%)"
                            shadow="0 8px 24px rgba(16,185,129,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                            label="TOTAL ACCOUNTS"
                            value={`${allUsers.length} Profiles`}
                            sub="Registered customers"
                            icon={
                              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                            }
                          />
                        </div>
                        <div className="customers-filter-body">
                          <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", color: "rgba(255,255,255,0.4)", paddingLeft: "4px" }}>
                            FILTER MEMBERSHIP
                          </div>
                          <FilterInput
                            icon={
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </svg>
                            }
                            placeholder="Search name, email..."
                            value={userSearch}
                            onChange={setUserSearch}
                            accentColor="#6366f1"
                          />
                          {userSearch && (
                            <ResetBtn onClick={() => setUserSearch("")} label="RESET DIRECTORY FILTERS" />
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* RIGHT 78% */}
                  <div className="customers-right" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    {usersSubTab === "userBookings" ? (
                      <>
                        <SectionHeader
                          title="User Reservation Ledger"
                          sub="Historical account transactions, active charters, and assignment schedules"
                        />
                        <div className="prem-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
                          {userBookings.length === 0 ? (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "100px 40px",
                                background: "rgba(255,255,255,.01)",
                                border: "1px dashed rgba(255,255,255,.06)",
                                borderRadius: "24px",
                              }}
                            >
                              <p style={{ fontSize: "32px", margin: "0 0 12px" }}>📭</p>
                              <p style={{ color: "rgba(255,255,255,.4)", fontSize: "14px" }}>
                                No bookings found for this customer.
                              </p>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              {userBookings.map((b, idx) => (
                                <div key={b.id} style={{ animation: `fadeIn 0.35s cubic-bezier(0.16,1,0.3,1) ${idx * 0.02}s backwards` }}>
                                  <BookingCard
                                    booking={b}
                                    onAction={handleBookingAction}
                                    showUser={false}
                                    onStartPickupVerification={handleStartPickupVerification}
                                    onStartReturnVerification={handleStartReturnVerification}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <SectionHeader
                          title="Customer Directory"
                          sub={`Operational matrix monitoring ${filteredUsers.length} connected active client ledgers`}
                          badge="REALTIME RECONCILIATION"
                          icon={<span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />}
                        />
                        <div className="prem-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
                          {filteredUsers.length === 0 ? (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "80px 40px",
                                background: "rgba(255,255,255,.01)",
                                border: "1px dashed rgba(255,255,255,.08)",
                                borderRadius: "24px",
                              }}
                            >
                              <p style={{ fontSize: "32px", margin: "0 0 12px" }}>👥</p>
                              <p style={{ color: "rgba(255,255,255,.4)", fontSize: "14px" }}>
                                {userSearch ? "No customers match your search" : "No customer bookings yet"}
                              </p>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              {filteredUsers.map((u, idx) => (
                                <div
                                  key={u.id}
                                  className="customer-row"
                                  style={{
                                    background: "rgba(255,255,255,0.01)",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                    borderRadius: "16px",
                                    padding: "18px 24px",
                                    cursor: "pointer",
                                    transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
                                    animation: `fadeIn 0.4s cubic-bezier(0.16,1,0.3,1) ${idx * 0.02}s backwards`,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                                    e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(255,255,255,0.01)";
                                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                                  }}
                                >
                                  <div className="customer-row-header" style={{ display: "flex", alignItems: "center", gap: "24px", flex: 1 }}>
                                    <div
                                      style={{
                                        width: "48px",
                                        height: "48px",
                                        borderRadius: "14px",
                                        flexShrink: 0,
                                        background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "18px",
                                        fontWeight: "800",
                                        color: "#fff",
                                      }}
                                    >
                                      {(u.name || u.email || "?")[0].toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <h4
                                        style={{
                                          margin: 0,
                                          fontWeight: "700",
                                          color: "#fff",
                                          fontSize: "15px",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {u.name}
                                      </h4>
                                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "rgba(255,255,255,.4)", fontFamily: "monospace", wordBreak: "break-all" }}>
                                        {u.email}
                                      </p>
                                      {u.phone && u.phone !== "—" && (
                                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "rgba(255,255,255,.3)" }}>
                                          📞 {u.phone}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="customer-row-stats">
                                    <div style={{ textAlign: "right" }}>
                                      <p style={{ margin: 0, fontSize: "10px", color: "rgba(255,255,255,.3)", fontWeight: "700", textTransform: "uppercase" }}>
                                        Activity
                                      </p>
                                      <p style={{ margin: 0, fontSize: "14px", color: "#fff", fontWeight: "600" }}>
                                        {u.bookings.length}{" "}
                                        <span style={{ fontSize: "12px", fontWeight: "400", opacity: 0.5 }}>
                                          Booking{u.bookings.length !== 1 ? "s" : ""}
                                        </span>
                                      </p>
                                    </div>
                                    <div style={{ textAlign: "right", minWidth: "80px" }}>
                                      <p style={{ margin: 0, fontSize: "10px", color: "rgba(255,255,255,.3)", fontWeight: "700", textTransform: "uppercase" }}>
                                        Revenue
                                      </p>
                                      <p style={{ margin: 0, fontSize: "16px", color: "#22c55e", fontWeight: "800" }}>
                                        ${u.revenue.toLocaleString()}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => handleViewUserBookings(u)}
                                      style={{
                                        padding: "10px 18px",
                                        borderRadius: "10px",
                                        border: "1px solid rgba(255,255,255,.1)",
                                        background: "rgba(255,255,255,.03)",
                                        color: "#fff",
                                        cursor: "pointer",
                                        fontWeight: "700",
                                        fontSize: "11px",
                                        letterSpacing: "0.5px",
                                        fontFamily: "Quicksand,sans-serif",
                                        transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#fff";
                                        e.currentTarget.style.color = "#000";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "rgba(255,255,255,.03)";
                                        e.currentTarget.style.color = "#fff";
                                      }}
                                    >
                                      BOOKINGS
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ══ LATE RETURNS ══ */}
              {activeTab === "lateReturns" && (
                <div
                  className="late-returns-container"
                  style={{
                    display: "flex",
                    height: "100%",
                    gap: "32px",
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "Quicksand,sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  <style>{`
                    .late-returns-container {
                      display: flex !important;
                      gap: 32px !important;
                      padding: 20px !important;
                    }
                    .late-returns-left {
                      flex: 0 0 22% !important;
                      display: flex;
                      flex-direction: column;
                      gap: 20px;
                      overflow-y: auto;
                      padding-right: 4px;
                    }
                    .late-returns-right {
                      flex: 0 0 78% !important;
                      display: flex;
                      flex-direction: column;
                      height: 100%;
                      overflow: hidden;
                    }
                    .late-returns-sticky-mobile {
                      display: none;
                    }

                    @media (max-width: 768px) {
                      .late-returns-container {
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px !important;
                        height: auto !important;
                      }
                      .late-returns-left {
                        flex: none !important;
                        width: 100% !important;
                        padding-right: 0 !important;
                        overflow-y: visible !important;
                      }
                      .late-returns-right {
                        flex: none !important;
                        width: 100% !important;
                        height: auto !important;
                      }
                      .late-returns-sticky-mobile {
                        display: flex !important;
                        flex-direction: column;
                        gap: 10px;
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 20 !important;
                        background: #0a0a14 !important;
                        padding-bottom: 6px !important;
                      }
                      .late-returns-left .late-returns-kpi-desktop {
                        display: none !important;
                      }
                      .late-returns-left .late-returns-action-box {
                        display: none !important;
                      }
                      .late-returns-right .late-returns-content-wrapper {
                        padding: 16px !important;
                      }
                    }

                    @media (max-width: 480px) {
                      .late-returns-container {
                        padding: 0px !important;
                        gap: 0px !important;
                      }
                      .late-returns-right .late-returns-content-wrapper {
                        padding: 12px !important;
                      }
                    }
                  `}</style>

                  {/* MOBILE-ONLY sticky block: KPI + action box */}
                  <div className="late-returns-sticky-mobile">
                    <KpiWidget
                      gradient="linear-gradient(135deg,#7f1d1d 0%,#ef4444 100%)"
                      shadow="0 8px 24px rgba(239,68,68,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                      label="LATE RETURNS"
                      value={`${lateBookingsCount} Overdue`}
                      sub="Vehicles past return date"
                      icon={
                        <svg
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      }
                    />
                    <div
                      style={{
                        background: "rgba(239,68,68,0.06)",
                        border: "1px solid rgba(239,68,68,0.22)",
                        borderRadius: "14px",
                        padding: "14px 16px",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontSize: "10px",
                          fontWeight: "700",
                          letterSpacing: "1.5px",
                          color: "#fb923c",
                          textTransform: "uppercase",
                        }}
                      >
                        ACTION REQUIRED
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "11.5px",
                          color: "rgba(255,255,255,0.45)",
                          lineHeight: "1.6",
                        }}
                      >
                        Late returns accumulate penalty charges. Contact
                        customers immediately to arrange vehicle return or
                        extension.
                      </p>
                    </div>
                  </div>

                  {/* LEFT 22% */}
                  <div className="late-returns-left">
                    <div className="late-returns-kpi-desktop">
                      <KpiWidget
                        gradient="linear-gradient(135deg,#7f1d1d 0%,#ef4444 100%)"
                        shadow="0 8px 24px rgba(239,68,68,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                        label="LATE RETURNS"
                        value={`${lateBookingsCount} Overdue`}
                        sub="Vehicles past return date"
                        icon={
                          <svg
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        }
                      />
                    </div>
                    <div className="late-returns-action-box">
                      <div
                        style={{
                          background: "rgba(239,68,68,0.06)",
                          border: "1px solid rgba(239,68,68,0.22)",
                          borderRadius: "14px",
                          padding: "14px 16px",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontSize: "10px",
                            fontWeight: "700",
                            letterSpacing: "1.5px",
                            color: "#fb923c",
                            textTransform: "uppercase",
                          }}
                        >
                          ACTION REQUIRED
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "11.5px",
                            color: "rgba(255,255,255,0.45)",
                            lineHeight: "1.6",
                          }}
                        >
                          Late returns accumulate penalty charges. Contact
                          customers immediately to arrange vehicle return or
                          extension.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT 78% */}
                  <div className="late-returns-right">
                    <SectionHeader
                      title="Late Return Monitor"
                      sub="Vehicles past their agreed return date — action required"
                      badge="OVERDUE ALERT"
                      icon={
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#ef4444",
                            display: "inline-block",
                            animation: "pulseDot 1s ease-in-out infinite",
                          }}
                        />
                      }
                    />
                    <div
                      className="prem-scroll"
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        paddingBottom: "40px",
                      }}
                    >
                      <div
                        className="late-returns-content-wrapper"
                        style={{
                          background: "rgba(255,255,255,0.01)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          borderRadius: "20px",
                          padding: "24px",
                        }}
                      >
                        <LateReturnList dealerId={dealerId} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ EXTENSION REQUESTS ══ */}
              {activeTab === "extensionRequests" && (
                <div
                  className="extension-requests-container"
                  style={{
                    display: "flex",
                    height: "100%",
                    gap: "32px",
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "Quicksand,sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  <style>{`
                    .extension-requests-container {
                      display: flex !important;
                      gap: 32px !important;
                      padding: 20px !important;
                    }
                    .extension-requests-left {
                      flex: 0 0 22% !important;
                      display: flex;
                      flex-direction: column;
                      gap: 20px;
                      overflow-y: auto;
                      padding-right: 4px;
                    }
                    .extension-requests-right {
                      flex: 0 0 78% !important;
                      display: flex;
                      flex-direction: column;
                      height: 100%;
                      overflow: hidden;
                    }
                    .extension-requests-sticky-mobile {
                      display: none;
                    }

                    @media (max-width: 768px) {
                      .extension-requests-container {
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px !important;
                        height: auto !important;
                      }
                      .extension-requests-left {
                        flex: none !important;
                        width: 100% !important;
                        padding-right: 0 !important;
                        overflow-y: visible !important;
                      }
                      .extension-requests-right {
                        flex: none !important;
                        width: 100% !important;
                        height: auto !important;
                      }
                      .extension-requests-sticky-mobile {
                        display: flex !important;
                        flex-direction: column;
                        gap: 10px;
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 20 !important;
                        background: #0a0a14 !important;
                        padding-bottom: 6px !important;
                      }
                      .extension-requests-left .extension-requests-kpi-desktop {
                        display: none !important;
                      }
                      .extension-requests-left .extension-requests-info-box {
                        display: none !important;
                      }
                      .extension-requests-right .extension-requests-content-wrapper {
                        padding: 16px !important;
                      }
                    }

                    @media (max-width: 480px) {
                      .extension-requests-container {
                        padding: 0px !important;
                        gap: 0px !important;
                      }
                      .extension-requests-right .extension-requests-content-wrapper {
                        padding: 12px !important;
                      }
                    }
                  `}</style>

                  {/* MOBILE-ONLY sticky block: KPI + info box */}
                  <div className="extension-requests-sticky-mobile">
                    <KpiWidget
                      gradient="linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%)"
                      shadow="0 8px 24px rgba(79,70,229,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                      label="EXTENSION REQUESTS"
                      value={`${pendingRequestsCount} Pending`}
                      sub="Awaiting your decision"
                      icon={
                        <svg
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                          <line x1="12" y1="14" x2="12" y2="18" />
                          <line x1="10" y1="16" x2="14" y2="16" />
                        </svg>
                      }
                    />
                    <div
                      style={{
                        background: "rgba(79,70,229,0.06)",
                        border: "1px solid rgba(79,70,229,0.22)",
                        borderRadius: "14px",
                        padding: "14px 16px",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontSize: "10px",
                          fontWeight: "700",
                          letterSpacing: "1.5px",
                          color: "#818cf8",
                          textTransform: "uppercase",
                        }}
                      >
                        ABOUT EXTENSIONS
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "11.5px",
                          color: "rgba(255,255,255,0.45)",
                          lineHeight: "1.6",
                        }}
                      >
                        Customers can request to extend their rental period.
                        Approve or reject with notes to the customer.
                      </p>
                    </div>
                  </div>

                  {/* LEFT 22% */}
                  <div className="extension-requests-left">
                    <div className="extension-requests-kpi-desktop">
                      <KpiWidget
                        gradient="linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%)"
                        shadow="0 8px 24px rgba(79,70,229,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                        label="EXTENSION REQUESTS"
                        value={`${pendingRequestsCount} Pending`}
                        sub="Awaiting your decision"
                        icon={
                          <svg
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                            <line x1="12" y1="14" x2="12" y2="18" />
                            <line x1="10" y1="16" x2="14" y2="16" />
                          </svg>
                        }
                      />
                    </div>
                    <div className="extension-requests-info-box">
                      <div
                        style={{
                          background: "rgba(79,70,229,0.06)",
                          border: "1px solid rgba(79,70,229,0.22)",
                          borderRadius: "14px",
                          padding: "14px 16px",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontSize: "10px",
                            fontWeight: "700",
                            letterSpacing: "1.5px",
                            color: "#818cf8",
                            textTransform: "uppercase",
                          }}
                        >
                          ABOUT EXTENSIONS
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "11.5px",
                            color: "rgba(255,255,255,0.45)",
                            lineHeight: "1.6",
                          }}
                        >
                          Customers can request to extend their rental period.
                          Approve or reject with notes to the customer.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT 78% */}
                  <div className="extension-requests-right">
                    <SectionHeader
                      title="Extension Requests"
                      sub="Manage customer requests to extend their rental period"
                      badge="PENDING DECISIONS"
                      icon={
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      }
                    />
                    <div
                      className="prem-scroll"
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        paddingBottom: "40px",
                      }}
                    >
                      <div
                        className="extension-requests-content-wrapper"
                        style={{
                          background: "rgba(255,255,255,0.01)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          borderRadius: "20px",
                          padding: "24px",
                        }}
                      >
                        <ExtensionRequestManager
                          dealerId={dealerId}
                          onProcessed={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ ASSISTANCE ══ */}
              {activeTab === "assistance" && (
                <div
                  className="assistance-container"
                  style={{
                    display: "flex",
                    height: "100%",
                    gap: "32px",
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "Quicksand,sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  <style>{`
                    .assistance-container {
                      display: flex !important;
                      gap: 32px !important;
                      padding: 20px !important;
                    }
                    .assistance-left {
                      flex: 0 0 22% !important;
                      display: flex;
                      flex-direction: column;
                      gap: 20px;
                      overflow-y: auto;
                      padding-right: 4px;
                    }
                    .assistance-right {
                      flex: 0 0 78% !important;
                      display: flex;
                      flex-direction: column;
                      height: 100%;
                      overflow: hidden;
                    }
                    .assistance-sticky-mobile {
                      display: none;
                    }
                    .assistance-tab-nav {
                      display: flex;
                      flex-direction: column;
                      gap: 4px;
                    }

                    @media (max-width: 768px) {
                      .assistance-container {
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px !important;
                        height: auto !important;
                      }
                      .assistance-left {
                        flex: none !important;
                        width: 100% !important;
                        padding-right: 0 !important;
                        overflow-y: visible !important;
                      }
                      .assistance-right {
                        flex: none !important;
                        width: 100% !important;
                        height: auto !important;
                      }
                      .assistance-sticky-mobile {
                        display: flex !important;
                        flex-direction: column;
                        gap: 10px;
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 20 !important;
                        background: #0a0a14 !important;
                        padding-bottom: 6px !important;
                      }
                      .assistance-left .assistance-kpi-desktop {
                        display: none !important;
                      }
                      .assistance-left .assistance-tab-nav {
                        display: none !important;
                      }
                      .assistance-tab-nav-mobile {
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 8px !important;
                        background: rgba(255,255,255,0.02);
                        border: 1px solid rgba(255,255,255,0.06);
                        border-radius: 14px;
                        padding: 6px;
                      }
                      .assistance-tab-nav-mobile button {
                        flex: 1 !important;
                        justify-content: center !important;
                        padding: 10px 12px !important;
                        font-size: 11px !important;
                      }
                      .assistance-right .assistance-content-wrapper {
                        padding: 16px !important;
                      }
                    }

                    @media (max-width: 480px) {
                      .assistance-container {
                        padding: 0px !important;
                        gap: 0px !important;
                      }
                      .assistance-right .assistance-content-wrapper {
                        padding: 12px !important;
                      }
                      .assistance-tab-nav-mobile button {
                        font-size: 11px !important;
                        padding: 10px !important;
                      }
                      .sp_heading h2 {
                        font-size: 16px !important;
                      }
                      .sp_heading p {
                        font-size: 12px !important;
                      }
                      .edit_form {
                        padding: 14px !important;
                      }
                      .edit_form form {
                        padding: 0px !important;
                        width: 100% !important;
                      }
                      .edit_form input {
                        font-size: 12px !important;
                      }
                      .edit_form button {
                        font-size: 12px !important;
                      }
                      .assistance-content-wrapper button {
                        font-size: 12px !important;
                      }
                    }
                  `}</style>

                  {/* MOBILE-ONLY sticky block: KPI + tab nav */}
                  <div className="assistance-sticky-mobile">
                    <KpiWidget
                      gradient="linear-gradient(135deg,#7f1d1d 0%,#ef4444 100%)"
                      shadow="0 8px 24px rgba(239,68,68,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                      label="INCIDENT COMMAND"
                      value={`${pendingAssistanceCount} Active`}
                      sub="Distress & assistance alerts"
                      icon={
                        <svg
                          width="19"
                          height="19"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      }
                    />
                    {/* Tab nav - mobile horizontal */}
                    <div className="assistance-tab-nav-mobile" style={{ display: "none" }}>
                      {[
                        {
                          id: "requests",
                          name: "Assistance Requests",
                          icon: (color) => (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.3s ease" }}>
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                          )
                        },
                        {
                          id: "providers",
                          name: "Service Providers",
                          icon: (color) => (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.3s ease" }}>
                              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                              <line x1="9" y1="22" x2="9" y2="16" />
                              <line x1="15" y1="22" x2="15" y2="16" />
                              <line x1="9" y1="16" x2="15" y2="16" />
                              <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01" />
                            </svg>
                          )
                        },
                      ].map((tab) => {
                        const isActive = selectedView === tab.id;
                        const currentIconColor = isActive ? "#fff" : "rgba(255,255,255,0.4)";

                        return (
                          <button
                            key={tab.id}
                            onClick={() => setSelectedView(tab.id)}
                            style={{
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "none",
                              fontFamily: "inherit",
                              background: isActive
                                ? "linear-gradient(135deg,#ef4444,#b91c1c)"
                                : "transparent",
                              color: isActive
                                ? "#fff"
                                : "rgba(255,255,255,0.5)",
                              fontSize: "12.5px",
                              fontWeight: "700",
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              width: "100%",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                                e.currentTarget.style.color = "#fca5a5";
                                const svg = e.currentTarget.querySelector("svg");
                                if (svg) svg.style.stroke = "#fca5a5";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                                const svg = e.currentTarget.querySelector("svg");
                                if (svg) svg.style.stroke = "rgba(255,255,255,0.4)";
                              }
                            }}
                          >
                            {tab.icon(currentIconColor)}
                            {tab.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* LEFT 22% */}
                  <div className="assistance-left">
                    <div className="assistance-kpi-desktop">
                      <KpiWidget
                        gradient="linear-gradient(135deg,#7f1d1d 0%,#ef4444 100%)"
                        shadow="0 8px 24px rgba(239,68,68,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                        label="INCIDENT COMMAND"
                        value={`${pendingAssistanceCount} Active`}
                        sub="Distress & assistance alerts"
                        icon={
                          <svg
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        }
                      />
                    </div>
                    {/* Tab nav - desktop vertical */}
                    <div className="assistance-tab-nav">
                      <div
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "14px",
                          padding: "6px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        {[
                          {
                            id: "requests",
                            name: "Assistance Requests",
                            icon: (color) => (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.3s ease" }}>
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                            )
                          },
                          {
                            id: "providers",
                            name: "Service Providers",
                            icon: (color) => (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.3s ease" }}>
                                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                                <line x1="9" y1="22" x2="9" y2="16" />
                                <line x1="15" y1="22" x2="15" y2="16" />
                                <line x1="9" y1="16" x2="15" y2="16" />
                                <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01" />
                              </svg>
                            )
                          },
                        ].map((tab) => {
                          const isActive = selectedView === tab.id;
                          const currentIconColor = isActive ? "#fff" : "rgba(255,255,255,0.4)";

                          return (
                            <button
                              key={tab.id}
                              onClick={() => setSelectedView(tab.id)}
                              style={{
                                padding: "12px 16px",
                                borderRadius: "10px",
                                border: "none",
                                fontFamily: "inherit",
                                background: isActive
                                  ? "linear-gradient(135deg,#ef4444,#b91c1c)"
                                  : "transparent",
                                color: isActive
                                  ? "#fff"
                                  : "rgba(255,255,255,0.5)",
                                fontSize: "12.5px",
                                fontWeight: "700",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                width: "100%",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                                  e.currentTarget.style.color = "#fca5a5";
                                  const svg = e.currentTarget.querySelector("svg");
                                  if (svg) svg.style.stroke = "#fca5a5";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                                  const svg = e.currentTarget.querySelector("svg");
                                  if (svg) svg.style.stroke = "rgba(255,255,255,0.4)";
                                }
                              }}
                            >
                              {tab.icon(currentIconColor)}
                              {tab.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT 78% */}
                  <div className="assistance-right">
                    <SectionHeader
                      title="Incident Command Matrix"
                      sub="Real-time vehicle distress requests and emergency assistance"
                      badge="LIVE INCIDENT FEED"
                      icon={
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#ef4444",
                            display: "inline-block",
                            animation: "pulseDot 2s infinite",
                          }}
                        />
                      }
                    />
                    <div
                      className="prem-scroll"
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        paddingBottom: "40px",
                      }}
                    >
                      <div
                        className="assistance-content-wrapper"
                        style={{
                          background: "rgba(255,255,255,0.01)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          borderRadius: "20px",
                          padding: "24px",
                        }}
                      >
                        {selectedView === "requests" ? (
                          <AssistanceRequestList
                            dealerId={dealerId}
                            onSelectRequest={(req) => {
                              setSelectedAssistance(req);
                              setShowAssistanceModal(true);
                            }}
                          />
                        ) : (
                          <ServiceProviderManager dealerId={dealerId} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ NOTIFICATIONS ══ */}
              {activeTab === "notifications" && (
                <div
                  className="notifications-container"
                  style={{
                    display: "flex",
                    height: "100%",
                    gap: "32px",
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "Quicksand,sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }}
                >
                  <style>{`
                    .notifications-container {
                      display: flex !important;
                      gap: 32px !important;
                      padding: 20px !important;
                    }
                    .notifications-left {
                      flex: 0 0 22% !important;
                      display: flex;
                      flex-direction: column;
                      gap: 20px;
                      overflow-y: auto;
                      padding-right: 4px;
                    }
                    .notifications-right {
                      flex: 0 0 78% !important;
                      display: flex;
                      flex-direction: column;
                      height: 100%;
                      overflow: hidden;
                    }
                    .notifications-sticky-mobile {
                      display: none;
                    }
                    .notifications-filter-toggle {
                      display: none !important;
                    }
                    .notifications-filter-body {
                      display: flex !important;
                      flex-direction: column;
                      gap: 20px;
                    }
                    .notifications-kpi-desktop {
                      display: block;
                    }
                    .notifications-filter-label {
                      display: block;
                    }
                    .notifications-search-input {
                      display: block;
                    }
                    .notifications-filters-component {
                      display: block;
                    }
                    .notifications-mobile-search {
                      display: none;
                    }
                    .notifications-mobile-filters {
                      display: none;
                    }

                    @media (max-width: 768px) {
                      .notifications-container {
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px !important;
                        height: auto !important;
                      }
                      .notifications-left {
                        flex: none !important;
                        width: 100% !important;
                        padding-right: 0 !important;
                        overflow-y: visible !important;
                      }
                      .notifications-right {
                        flex: none !important;
                        width: 100% !important;
                        height: auto !important;
                      }
                      .notifications-sticky-mobile {
                        display: flex !important;
                        flex-direction: column;
                        gap: 10px;
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 20 !important;
                        background: #0a0a14 !important;
                        padding-bottom: 6px !important;
                      }
                      .notifications-left .notifications-kpi-desktop {
                        display: none !important;
                      }
                      .notifications-left .notifications-filter-label {
                        display: none !important;
                      }
                      .notifications-left .notifications-search-input {
                        display: none !important;
                      }
                      .notifications-left .notifications-filters-component {
                        display: none !important;
                      }
                      .notifications-right .notifications-content-wrapper {
                        padding: 16px !important;
                      }
                      .notifications-mobile-search {
                        display: block !important;
                      }
                      .notifications-filter-toggle {
                        display: flex !important;
                      }
                      .notifications-filter-body {
                        max-height: ${notifFilterCollapsed ? '0px' : '2000px'} !important;
                        opacity: ${notifFilterCollapsed ? '0' : '1'} !important;
                        overflow: hidden !important;
                        transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease !important;
                        gap: 12px !important;
                      }
                      .notifications-mobile-filters {
                        display: block !important;
                      }
                    }

                    @media (max-width: 480px) {
                      .notifications-container {
                        padding: 0px !important;
                        gap: 0px !important;
                      }
                      .notifications-right .notifications-content-wrapper {
                        padding: 12px !important;
                      }
                    }
                  `}</style>

                  {/* MOBILE-ONLY sticky block: KPI + filter toggle */}
                  <div className="notifications-sticky-mobile">
                    <KpiWidget
                      gradient="linear-gradient(135deg,#312e81 0%,#6366f1 100%)"
                      shadow="0 8px 24px rgba(99,102,241,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                      label="TELEMETRY STREAM"
                      value="Notifications"
                      sub="Live platform activity"
                      icon={
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      }
                    />

                    {/* Mobile filter toggle button */}
                    <button
                      className="notifications-filter-toggle"
                      onClick={() => setNotifFilterCollapsed((p) => !p)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        color: "rgba(255,255,255,0.7)",
                        fontFamily: "Quicksand,sans-serif",
                        fontSize: "12px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        cursor: "pointer",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Filters & Search</span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transition: "transform 0.3s ease",
                          transform: notifFilterCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* Mobile filters body - collapsible */}
                    <div className="notifications-filter-body">
                      {/* Mobile search input */}
                      <div className="notifications-mobile-search" style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                          </svg>
                        </span>
                        <input
                          placeholder="Search notifications..."
                          value={notifSearchTerm}
                          onChange={(e) => setNotifSearchTerm(e.target.value)}
                          style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:"14px", padding:"14px 16px 14px 44px", color:"#fff", fontFamily:"Quicksand,sans-serif", fontSize:"13.5px", outline:"none", transition:"border-color .25s cubic-bezier(0.16,1,0.3,1)" }}
                          onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                          onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,.1)")}
                        />
                        {notifSearchTerm && (
                          <button onClick={() => setNotifSearchTerm("")}
                            style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center", padding:0 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Mobile filters component */}
                      <div className="notifications-mobile-filters">
                        <NotificationFilters
                          notifications={notifications}
                          filterPriority={notifPriorityFilter}
                          filterType={notifTypeFilter}
                          searchTerm={notifSearchTerm}
                          onFilterPriorityChange={setNotifPriorityFilter}
                          onFilterTypeChange={setNotifTypeFilter}
                          onClearFilters={() => {
                            setNotifPriorityFilter(null);
                            setNotifTypeFilter(null);
                            setNotifSearchTerm("");
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* LEFT 22% */}
                  <div className="notifications-left">
                    <div className="notifications-kpi-desktop">
                      <KpiWidget
                        gradient="linear-gradient(135deg,#312e81 0%,#6366f1 100%)"
                        shadow="0 8px 24px rgba(99,102,241,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                        label="TELEMETRY STREAM"
                        value="Notifications"
                        sub="Live platform activity"
                        icon={
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          </svg>
                        }
                      />
                    </div>

                    <div className="notifications-filter-label" style={{ fontSize:"11px", fontWeight:"700", letterSpacing:"2px", color:"rgba(255,255,255,0.4)", paddingLeft:"4px" }}>
                      FILTER & SEARCH
                    </div>

                    {/* Desktop search input */}
                    <div className="notifications-search-input" style={{ position:"relative" }}>
                      <span style={{ position:"absolute", left:"16px", top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center", pointerEvents:"none" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                      </span>
                      <input
                        placeholder="Search notifications..."
                        value={notifSearchTerm}
                        onChange={(e) => setNotifSearchTerm(e.target.value)}
                        style={{ width:"100%", boxSizing:"border-box", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:"14px", padding:"14px 16px 14px 44px", color:"#fff", fontFamily:"Quicksand,sans-serif", fontSize:"13.5px", outline:"none", transition:"border-color .25s cubic-bezier(0.16,1,0.3,1)" }}
                        onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
                        onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,.1)")}
                      />
                      {notifSearchTerm && (
                        <button onClick={() => setNotifSearchTerm("")}
                          style={{ position:"absolute", right:"14px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.3)", display:"flex", alignItems:"center", padding:0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Desktop filters component */}
                    <div className="notifications-filters-component">
                      <NotificationFilters
                        notifications={notifications}
                        filterPriority={notifPriorityFilter}
                        filterType={notifTypeFilter}
                        searchTerm={notifSearchTerm}
                        onFilterPriorityChange={setNotifPriorityFilter}
                        onFilterTypeChange={setNotifTypeFilter}
                        onClearFilters={() => {
                          setNotifPriorityFilter(null);
                          setNotifTypeFilter(null);
                          setNotifSearchTerm("");
                        }}
                      />
                    </div>
                  </div>{/* end left */}

                  {/* RIGHT 78% */}
                  <div className="notifications-right">
                    <SectionHeader
                      title="Notification Center"
                      sub="Real-time streaming ledger of platform actions and reservation events"
                      badge="LIVE ACTIVITY FEED"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      }
                    />
                    <div className="prem-scroll" style={{ flex:1, overflowY:"auto", paddingBottom:"40px" }}>
                      <div className="notifications-content-wrapper" style={{ background:"rgba(255,255,255,0.01)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"20px", padding:"24px" }}>
                        <DealerNotificationCenter
                          dealerId={dealerId}
                          filterPriority={notifPriorityFilter}
                          filterType={notifTypeFilter}
                          searchTerm={notifSearchTerm}
                          onNotificationAction={(n) => {
                            if (n.type === "extension_request") switchTab("extensionRequests");
                            else if (n.type === "late_return_alert" || n.type === "return_due") switchTab("lateReturns");
                            else if (n.type === "breakdown_request") switchTab("assistance");
                            else if (n.type === "sos_alert") switchTab("assistance");
                            else switchTab("bookings");
                          }}
                          onNotificationsLoaded={setNotifications}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ ANALYTICS ══ */}
              {activeTab === "analytics" && <AnalyticsTab />}

              {/* ══ SETTINGS ══ */}
              {activeTab === "settings" && <SettingsTab />}
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showLogoModal && (
        <LogoModal
          dealerId={dealerId}
          currentLogo={dealerLogo}
          businessName={dealerData.businessName}
          onClose={() => setShowLogoModal(false)}
          onSaved={(url) => {
            setDealerLogo(url);
            setShowLogoModal(false);
            notify("Logo updated successfully");
          }}
        />
      )}
      {showCarModal && (
        <CarModal
          dealerId={dealerId}
          dealerCity={dealerData?.city}
          car={editingCar}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            notify(editingCar ? "Car updated" : "Car added to fleet");
          }}
        />
      )}
      {showAssistanceModal && selectedAssistance && (
        <AssistanceDetailModal
          request={selectedAssistance}
          dealerId={dealerId}
          onClose={() => {
            setShowAssistanceModal(false);
            setSelectedAssistance(null);
          }}
          onUpdated={() => {
            setShowAssistanceModal(false);
            setSelectedAssistance(null);
          }}
        />
      )}
      {selectedFleetCar && (
        <CarDetailModal
          car={selectedFleetCar}
          bookings={bookings}
          onClose={() => setSelectedFleetCar(null)}
          onEdit={(car) => {
            setSelectedFleetCar(null);
            openEditCar(car);
          }}
          onToggleAvailability={(car) => {
            toggleAvailability(car);
            // update the selected car's availability optimistically
            setSelectedFleetCar((prev) =>
              prev ? { ...prev, isAvailable: !prev.isAvailable } : null
            );
          }}
          onDelete={(car) => {
            handleDeleteCar(car);
            setSelectedFleetCar(null);
          }}
        />
      )}
    </div>
  );
}