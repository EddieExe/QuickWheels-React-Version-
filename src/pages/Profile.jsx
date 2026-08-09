import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  updateProfile,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { db } from "../firebase";
import jsPDF from "jspdf";
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import "../styles/profile.css";
import { useLocation } from "react-router-dom";
import validateEmail from "../utils/emailValidator";
import {
  sendApprovalEmail,
  sendAutoConfirmEmail,
  sendCancellationEmail,
} from "../utils/emailService";
import { useCurrency } from "../context/CurrencyContext";
import ReviewModal from "../components/ReviewModal";
import ProfileImageUpload from "../components/ProfileImageUpload";
import EmergencyContactModal from "../components/EmergencyContactModal";
import { validatePhone, formatPhone } from "../utils/phoneValidator";
import { getEmergencyContact } from "../utils/emergencyService";
import {
  startStatusScheduler,
  stopStatusScheduler,
} from "../services/statusScheduler";
import TwoFactorSetup from "../components/TwoFactorSetup";
import { createPaymentRecord } from "../utils/paymentLedger";
import ColorSpots from "../components/ColorSpots";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function downloadReceipt(booking) {
  const doc = new jsPDF();
  doc.setFillColor(4, 0, 255);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("QuickWheels", 20, 18);
  doc.setFontSize(10);
  doc.text("Car Rental Receipt", 150, 18);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Booking ID: ${booking.bookingId}`, 20, 45);
  doc.text(`Date: ${booking.date}`, 20, 55);
  doc.setDrawColor(4, 0, 255);
  doc.line(20, 62, 190, 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Vehicle:", 20, 75);
  doc.setFont("helvetica", "bold");
  doc.text(booking.carModel, 80, 75);
  doc.setFont("helvetica", "normal");
  doc.text("Pickup Location:", 20, 88);
  doc.setFont("helvetica", "bold");
  doc.text(booking.pickup, 80, 88);
  doc.setFont("helvetica", "normal");
  doc.text("Drop-off Location:", 20, 101);
  doc.setFont("helvetica", "bold");
  doc.text(booking.dropoff, 80, 101);
  doc.setFont("helvetica", "normal");
  doc.text("Duration:", 20, 114);
  doc.setFont("helvetica", "bold");
  doc.text(`${booking.days} days`, 80, 114);
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 125, 190, 125);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Total Amount:", 20, 140);
  doc.setTextColor(4, 0, 255);
  doc.text(`${booking.currencySymbol || "$"}${booking.total} ${booking.currency || "USD"}`, 80, 140);
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for choosing QuickWheels!", 20, 270);
  doc.text("For support: support@quickwheels.com", 20, 278);
  doc.save(`QuickWheels-Receipt-${booking.bookingId}.pdf`);
}

function EyeIcon({ show }) {
  return show ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

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

function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email[0].toUpperCase() : "U";
}

/* ─────────────────────────────────────────────
   PendingApprovalNotice
───────────────────────────────────────────── */
function PendingApprovalNotice({ booking }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    function tick() {
      if (!booking.approvalDeadline) return;
      const deadline = booking.approvalDeadline?.toDate ? booking.approvalDeadline.toDate() : new Date(booking.approvalDeadline);
      const msLeft = deadline - new Date();
      if (msLeft <= 0) { setExpired(true); setTimeLeft("0m 0s"); }
      else {
        setExpired(false);
        const m = Math.floor(msLeft / 60000);
        const s = Math.floor((msLeft % 60000) / 1000);
        setTimeLeft(`${m}m ${s}s`);
      }
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [booking]);

  return (
    <div style={{ padding: "12px 14px", margin: "10px 0", background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "10px", fontSize: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <span>⏳</span>
        <span style={{ color: "#a855f7", fontWeight: "700" }}>Awaiting Dealer Approval</span>
      </div>
      <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 8px", lineHeight: "1.5" }}>
        Dealer has 60 min to approve. If no action, it&apos;ll be <strong style={{ color: "#22c55e" }}>auto-confirmed</strong>.
      </p>
      {timeLeft && (
        <span style={{ padding: "3px 10px", borderRadius: "7px", fontSize: "11px", fontWeight: "700", background: expired ? "rgba(34,197,94,0.08)" : "rgba(168,85,247,0.08)", border: `1px solid ${expired ? "rgba(34,197,94,0.25)" : "rgba(168,85,247,0.25)"}`, color: expired ? "#22c55e" : "#a855f7" }}>
          {expired ? "⚡ Auto-confirming soon…" : `⏱ ${timeLeft} remaining`}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   BookingCard (unchanged logic, tightened style)
───────────────────────────────────────────── */
function BookingCard({ booking, onCancelClick, onWriteReview }) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState("");
  const [canCancel, setCanCancel] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const canReview = booking.status === "completed" && !booking.reviewed;

  useEffect(() => {
    function checkCancellation() {
      if (!booking.pickupDate || booking.status === "cancelled") return;
      const dt = new Date(booking.pickupDate);
      dt.setHours(0, 0, 0, 0);
      const deadline = new Date(dt.getTime() - 12 * 60 * 60 * 1000);
      const msLeft = deadline - new Date();
      if (msLeft > 0) {
        setCanCancel(true);
        const h = Math.floor(msLeft / (1000 * 60 * 60));
        const m = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}h ${m}m`);
      } else { setCanCancel(false); setTimeLeft(""); }
    }
    checkCancellation();
    const interval = setInterval(checkCancellation, 60000);
    return () => clearInterval(interval);
  }, [booking]);

  const statusMap = {
  pending_approval: { 
    label: "Pending Approval", color: "#a855f7", bg: "rgba(168,85,247,0.1)", border: "rgba(168,85,247,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    )
  },
  confirmed: { 
    label: "Confirmed", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    )
  },
  upcoming_trip: { 
    label: "Upcoming Trip", color: "#a855f7", bg: "rgba(14,165,233,0.1)", border: "rgba(14,165,233,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    )
  },
  pickup_awaited: { 
    label: "Pickup Awaited", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
    )
  },
  ongoing_trip: { 
    label: "Ongoing Trip", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
    )
  },
  return_pending: { 
    label: "Return Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
    )
  },
  completed: { 
    label: "Completed", color: "#a855f7", bg: "rgba(14,165,233,0.1)", border: "rgba(14,165,233,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="22" x2="4" y2="2"/><path d="M4 15c3-2 8-2 11 0l5-2V3c-3-2-8-2-11 0l-5 2z"/></svg>
    )
  },
  cancelled: { 
    label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
    )
  },
  cancelled_dealer: { 
    label: "Cancelled by Dealer", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="22" y2="12"/><line x1="22" y1="8" x2="18" y2="12"/></svg>
    )
  },
  cancelled_admin: { 
    label: "Cancelled by Admin", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="10" y1="15" x2="14" y2="19"/><line x1="14" y1="15" x2="10" y2="19"/></svg>
    )
  },
  cancelled_user: { 
    label: "Cancelled by You", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    )
  },
  on_hold: { 
    label: "On Hold", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
    )
  },
  no_show: { 
    label: "No Show", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>
    )
  },
  rejected: { 
    label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)", 
    icon: (color) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    )
  },
};

  function getEffKey(b) {
    if (b.status === "cancelled") {
      if (b.cancelledBy === "dealer") return "cancelled_dealer";
      if (b.cancelledBy === "admin") return "cancelled_admin";
      if (b.cancelledBy === "user") return "cancelled_user";
      return "cancelled";
    }
    if (b.status === "rejected") return "rejected";
    return b.status;
  }

  const effKey = getEffKey(booking);
  const st = statusMap[effKey] || statusMap.confirmed;
  const adminNote = booking.adminActionReason || booking.dealerActionReason || "";
  const noteTrunc = adminNote.length > 100;
  const isCancelledByDealer = effKey === "cancelled_dealer";
  const isRejected = effKey === "rejected";
  const showAdminMessage = !!(booking.adminActionReason || booking.dealerActionReason) && (booking.status === "cancelled" || booking.status === "on_hold");
  const accentColor = st.color;

  return (
    <div style={{ position: "relative", marginBottom: "12px", background: "rgba(255,255,255,0.025)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `3px solid ${accentColor}`, overflow: "hidden", transition: "all 0.22s ease" }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.048)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 28px rgba(0,0,0,0.28), 0 0 0 1px ${accentColor}18`; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse at top right, ${accentColor}08 0%, transparent 60%)` }} />
      <div style={{ position: "relative", padding: "16px 18px" }}>
        {/* Row 1 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "10px", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "15px", fontWeight: "800" }}>{booking.carModel}</h3>
              <span style={{ padding: "2px 9px", borderRadius: "20px", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.06em", color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                {st.icon} {st.label}
              </span>
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.22)", fontSize: "10px", fontFamily: "monospace" }}>#{booking.bookingId}</p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: accentColor, lineHeight: 1 }}>{booking.currencySymbol || "$"}{booking.total?.toLocaleString()}</p>
            <p style={{ margin: "2px 0 0", fontSize: "8px", color: "rgba(255,255,255,0.22)", fontWeight: "700", letterSpacing: "0.08em" }}>TOTAL · {booking.currency || "USD"}</p>
          </div>
        </div>
        {/* Route */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "9px", marginBottom: "10px", background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#2e8eff", flexShrink: 0 }} />
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", flex: 1 }}>{booking.pickup}</span>
          <span style={{ color: "rgba(255,255,255,0.18)", fontSize: "10px" }}>→</span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", flex: 1, textAlign: "right" }}>{booking.dropoff}</span>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#a855f7", flexShrink: 0 }} />
        </div>
        {/* Dates row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "10px" }}>
          {[{ label: "PICKUP", value: booking.pickupDate || booking.date || "—" }, { label: "DROPOFF", value: booking.dropoffDate || "—" }, { label: "DURATION", value: `${booking.days} day${booking.days > 1 ? "s" : ""} · ${booking.tripType || "One Way"}` }].map(({ label, value }) => (
            <div key={label} style={{ padding: "7px 9px", borderRadius: "8px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <p style={{ margin: "0 0 2px", color: "rgba(255,255,255,0.22)", fontSize: "8px", fontWeight: "700", letterSpacing: "0.08em" }}>{label}</p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", fontSize: "11px", fontWeight: "600" }}>{value}</p>
            </div>
          ))}
        </div>
        {/* Addons */}
        {booking.addons?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
            {booking.addons.map(a => (
              <span key={a.id} style={{ padding: "2px 9px", borderRadius: "20px", fontSize: "10px", fontWeight: "600", color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {a.icon || "➕"} {a.name}
              </span>
            ))}
          </div>
        )}
        {booking.status === "pending_approval" && <PendingApprovalNotice booking={booking} />}
        {showAdminMessage && (
          <div style={{ padding: "10px 14px", marginBottom: "10px", borderRadius: "10px", background: booking.status === "on_hold" ? "rgba(245,158,11,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${booking.status === "on_hold" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px" }}>{booking.status === "on_hold" ? "⏸" : isCancelledByDealer ? "🚫" : isRejected ? "❌" : "🔴"}</span>
              <span style={{ fontWeight: "800", fontSize: "11px", letterSpacing: "0.05em", color: booking.status === "on_hold" ? "#f59e0b" : "#ef4444", textTransform: "uppercase" }}>
                {booking.status === "on_hold" ? "On Hold" : isCancelledByDealer ? "Cancelled by Dealer" : isRejected ? "Rejected" : "Cancelled by Admin"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "11px", lineHeight: "1.6", color: "rgba(255,255,255,0.5)" }}>
              {noteTrunc && !noteExpanded ? adminNote.slice(0, 100) + "…" : adminNote}
            </p>
            {noteTrunc && <button onClick={() => setNoteExpanded(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 0 0", color: booking.status === "on_hold" ? "#f59e0b" : "#ef4444", fontSize: "10px", fontWeight: "700" }}>{noteExpanded ? "Show less ▲" : "Read more ▼"}</button>}
          </div>
        )}
        {/* Bottom row */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "4px" }}>
          {["confirmed","completed","pending_approval","upcoming_trip","pickup_awaited","ongoing_trip","return_pending"].includes(booking.status) && (
            <button onClick={() => downloadReceipt(booking)} className="Documents-btn" style={{ transform: "scale(0.88)", transformOrigin: "left center" }}>
              <span className="folderContainer">
                <svg className="fileBack" width="146" height="113" viewBox="0 0 146 113" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 4C0 1.79086 1.79086 0 4 0H50.3802C51.8285 0 53.2056 0.627965 54.1553 1.72142L64.3303 13.4371C65.2799 14.5306 66.657 15.1585 68.1053 15.1585H141.509C143.718 15.1585 145.509 16.9494 145.509 19.1585V109C145.509 111.209 143.718 113 141.509 113H3.99999C1.79085 113 0 111.209 0 109V4Z" fill="url(#paint0_linear_117_4)"></path><defs><linearGradient id="paint0_linear_117_4" x1="0" y1="0" x2="72.93" y2="95.4804" gradientUnits="userSpaceOnUse"><stop stopColor="#8F88C2"></stop><stop offset="1" stopColor="#5C52A2"></stop></linearGradient></defs></svg>
                <svg className="filePage" width="88" height="99" viewBox="0 0 88 99" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="88" height="99" fill="url(#paint0_linear_117_6)"></rect><defs><linearGradient id="paint0_linear_117_6" x1="0" y1="0" x2="81" y2="160.5" gradientUnits="userSpaceOnUse"><stop stopColor="white"></stop><stop offset="1" stopColor="#686868"></stop></linearGradient></defs></svg>
                <svg className="fileFront" width="160" height="79" viewBox="0 0 160 79" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.29306 12.2478C0.133905 9.38186 2.41499 6.97059 5.28537 6.97059H30.419H58.1902C59.5751 6.97059 60.9288 6.55982 62.0802 5.79025L68.977 1.18034C70.1283 0.410771 71.482 0 72.8669 0H77H155.462C157.87 0 159.733 2.1129 159.43 4.50232L150.443 75.5023C150.19 77.5013 148.489 79 146.474 79H7.78403C5.66106 79 3.9079 77.3415 3.79019 75.2218L0.29306 12.2478Z" fill="url(#paint0_linear_117_5)"></path><defs><linearGradient id="paint0_linear_117_5" x1="38.7619" y1="8.71323" x2="66.9106" y2="82.8317" gradientUnits="userSpaceOnUse"><stop stopColor="#C3BBFF"></stop><stop offset="1" stopColor="#51469A"></stop></linearGradient></defs></svg>
              </span>
              <p className="download_text" style={{ color: "#a855f7", fontSize: "11px" }}>Receipt</p>
            </button>
          )}
          {["ongoing_trip","pickup_awaited","return_pending"].includes(booking.status) && (
            <button onClick={() => navigate(`/trip-dashboard/${booking.id}`)} style={{ padding: "6px 12px", borderRadius: "8px", cursor: "pointer", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7", fontSize: "11px", fontWeight: "700", fontFamily: "inherit" }}>🚗 Dashboard</button>
          )}
          {canReview && (
            <button onClick={() => setShowReviewModal(true)} style={{ padding: "6px 12px", borderRadius: "8px", cursor: "pointer", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24", fontSize: "11px", fontWeight: "700", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "5px" }}>
              <span>⭐</span> Review
            </button>
          )}
          <div style={{ flex: 1 }} />
          {!["cancelled","completed","on_hold","no_show","rejected","ongoing_trip","return_pending"].includes(booking.status) && (
            canCancel ? (!showCancelConfirm ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
                <button onClick={() => setShowCancelConfirm(true)} style={{ padding: "6px 12px", borderRadius: "8px", cursor: "pointer", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.22)", color: "#ef4444", fontSize: "11px", fontWeight: "700", fontFamily: "inherit" }}>Cancel</button>
                <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.2)", fontWeight: "600" }}>CLOSES IN {timeLeft}</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "7px", padding: "8px 12px", borderRadius: "9px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <span style={{ color: "#ef4444", fontSize: "11px", fontWeight: "700" }}>Confirm?</span>
                <button onClick={() => onCancelClick(booking)} style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: "700", cursor: "pointer" }}>Yes</button>
                <button onClick={() => setShowCancelConfirm(false)} style={{ padding: "4px 10px", borderRadius: "6px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontSize: "10px", fontWeight: "700", cursor: "pointer" }}>No</button>
              </div>
            )) : (
              <span style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "9px", color: "rgba(255,255,255,0.18)", fontWeight: "700", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>🔒 NON-CANCELLABLE</span>
            )
          )}
        </div>
      </div>
      {showReviewModal && <ReviewModal booking={booking} onClose={() => setShowReviewModal(false)} onReviewSubmitted={() => { setShowReviewModal(false); onWriteReview && onWriteReview(); }} />}
    </div>
  );
}

function NavIcon({ id }) {
  const icons = {
    personal: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
    password: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    security: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    bookings: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    emergency: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    contact: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    admin: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 6.9L21 9l-5.4 4.6L17.4 21 12 17l-5.4 4 1.8-7.4L3 9l6.6-.1z" />
      </svg>
    ),
    dealer: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    danger: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07" />
      </svg>
    ),
  };
  return icons[id] || null;
}

/* ─────────────────────────────────────────────
   Main Profile component
───────────────────────────────────────────── */
function Profile() {
  const [bookingFilter, setBookingFilter] = useState("all");
  const { user, logout, isAdmin, isDealer, dealerStatus, dealerData, twoFactorEnabled, refresh2FAStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("personal");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bookingHistory, setBookingHistory] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const { currency, changeCurrency, getAvailableCurrencies } = useCurrency();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState(null);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const fileInputRef = useRef(null);

  const [personalData, setPersonalData] = useState({
    displayName: user?.displayName || "",
    phone: localStorage.getItem(`phone_${user?.uid}`) || "",
    alternatePhone: localStorage.getItem(`altPhone_${user?.uid}`) || "",
    address: localStorage.getItem(`address_${user?.uid}`) || "",
    preferredCurrency: localStorage.getItem("preferredCurrency") || "USD",
    preferredLanguage: localStorage.getItem("preferredLanguage") || "English",
  });

  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    if (!user) return;
    const cleanup = startStatusScheduler(user.uid);
    return () => cleanup();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    async function loadEmergencyContact() {
      try {
        const contact = await getEmergencyContact(user.uid);
        if (contact) setEmergencyContact(contact);
      } catch (err) { console.error(err); }
    }
    const savedImage = localStorage.getItem(`profileImage_${user.uid}`);
    if (savedImage) setProfileImage(savedImage);
    loadEmergencyContact();
  }, [user]);

  useEffect(() => {
    if (location.state?.tab) setActiveTab(location.state.tab);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      bookings.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
      const now = new Date();
      const updatePromises = [];
      for (const booking of bookings) {
        if (booking.status !== "pending_approval" || !booking.approvalDeadline) continue;
        const deadline = booking.approvalDeadline?.toDate ? booking.approvalDeadline.toDate() : new Date(booking.approvalDeadline);
        if (now >= deadline) {
          updatePromises.push(
            updateDoc(doc(db, "bookings", booking.id), { status: "confirmed", autoConfirmedAt: new Date() })
              .then(() => {
                booking.status = "confirmed";
                createPaymentRecord(booking).catch(err => console.error(err));
                return sendAutoConfirmEmail({ name: booking.userName || booking.userEmail, email: booking.userEmail, carModel: booking.carModel, pickup: booking.pickup, dropoff: booking.dropoff, days: booking.days, tripType: booking.tripType || "One Way", carTotal: booking.carTotal || booking.total, addonsTotal: booking.addonsTotal || 0, total: booking.total, bookingId: booking.bookingId, addons: booking.addons || [] });
              })
              .catch(err => console.error("Auto-confirm failed:", err))
          );
        }
      }
      Promise.all(updatePromises).then(() => {
        const upd = [...bookings];
        upd.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
        setBookingHistory(upd);
      }).catch(() => setBookingHistory(bookings));
    }, err => console.error("Error fetching bookings:", err));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (message || error) {
      const t = setTimeout(() => { setMessage(""); setError(""); }, 3500);
      return () => clearTimeout(t);
    }
  }, [message, error]);

  function validateName(name) {
    if (!/^[a-zA-Z\s'\-]+$/.test(name)) return "Name can only contain letters, apostrophes and hyphens.";
    if (name.trim().split(/\s+/).length > 3) return "Name can have a maximum of 3 words.";
    return null;
  }
  function validatePassword(password) {
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Must contain an uppercase letter.";
    if (!/[a-z]/.test(password)) return "Must contain a lowercase letter.";
    if (!/[0-9]/.test(password)) return "Must contain a number.";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return "Must contain a special character.";
    return null;
  }
  function getPasswordStrength(password) {
    if (!password) return { label: "", color: "", width: "0%" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    if (score <= 2) return { label: "Weak", color: "#ff4d4d", width: "33%" };
    if (score <= 3) return { label: "Fair", color: "#ffa500", width: "60%" };
    if (score === 4) return { label: "Good", color: "#a855f7", width: "80%" };
    return { label: "Strong", color: "#22c55e", width: "100%" };
  }
  const strength = getPasswordStrength(passwordData.newPassword);

  async function handleUpdateProfile(e) {
    e.preventDefault();
    const nameError = validateName(personalData.displayName);
    if (nameError) { setError(nameError); return; }
    const phoneErr = validatePhone(personalData.phone, "Contact number");
    if (phoneErr) { setError(phoneErr); return; }
    if (personalData.alternatePhone) {
      const altErr = validatePhone(personalData.alternatePhone, "Alternate number");
      if (altErr) { setError(altErr); return; }
    }
    try {
      await updateProfile(user, { displayName: personalData.displayName });
      localStorage.setItem(`phone_${user.uid}`, personalData.phone);
      localStorage.setItem(`altPhone_${user.uid}`, personalData.alternatePhone);
      localStorage.setItem(`address_${user.uid}`, personalData.address);
      localStorage.setItem("preferredCurrency", personalData.preferredCurrency);
      localStorage.setItem("preferredLanguage", personalData.preferredLanguage);
      setMessage("Profile updated successfully!");
    } catch (err) { setError("Failed to update profile."); }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    if (!currentPassword) { setError("Please enter your current password."); return; }
    if (currentPassword === newPassword) { setError("New password cannot be same as current."); return; }
    const pwError = validatePassword(newPassword);
    if (pwError) { setError(pwError); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setMessage("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") setError("Current password is incorrect.");
      else setError("Failed to change password. Please try again.");
    }
  }

  async function handleDeleteConfirmed() {
    try {
      localStorage.removeItem(`phone_${user.uid}`);
      localStorage.removeItem("bookingHistory");
      await deleteUser(user);
      await logout();
      navigate("/");
    } catch (err) {
      setShowDeleteConfirm(false);
      setError("Please sign out and sign in again before deleting account.");
    }
  }

  function handleCancelClick(booking) {
    setCancelModalBooking(booking);
    setCancelReason("");
  }

  async function handleCancelBooking(bookingId, reason = "User requested cancellation") {
    try {
      const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      const bookingDoc = snapshot.docs.find(d => d.data().bookingId === bookingId);
      if (!bookingDoc) { setError("Booking not found."); return; }
      const bookingData = bookingDoc.data();
      await updateDoc(doc(db, "bookings", bookingDoc.id), { status: "cancelled", cancelledBy: "user", cancelledAt: new Date(), cancelReasonByUser: reason });
      await sendCancellationEmail({ name: bookingData.userName || bookingData.userEmail, email: bookingData.userEmail, carModel: bookingData.carModel, pickup: bookingData.pickup, dropoff: bookingData.dropoff, days: bookingData.days, total: bookingData.total, bookingId: bookingData.bookingId, reason: "You cancelled this booking. No charges have been made.", currency: bookingData.currency || "USD", currencySymbol: bookingData.currencySymbol || "$" });
      setMessage("Booking cancelled. Confirmation email sent.");
    } catch (err) { console.error(err); setError("Failed to cancel booking. Try again."); }
  }

  /* ── Sidebar nav config ── */
  const tabs = [
  { id: "personal", label: "Personal Details", section: "Account" },
  { id: "password", label: "Change Password", section: null },
  { id: "security", label: "Security", section: null },
  { id: "bookings", label: "Booking History", section: "Activity" },
  { id: "emergency", label: "Emergency", section: null },
  { id: "contact", label: "Contact Us", section: "Support" },
  ...(isAdmin ? [{ id: "admin", label: "Admin Portal", section: "Portals" }] : []),
  ...(isDealer && dealerStatus === "approved" ? [{ id: "dealer", label: "Dealer Dashboard", section: isAdmin ? null : "Portals" }] : []),
  { id: "danger", label: "Account Settings", section: "Danger", danger: true },
];

  const initials = getInitials(user?.displayName, user?.email);

  return (
    <div className="profile_page_wrapper">
      <div className="prf_stars" aria-hidden="true">
        <span className="prf_star_layer prf_star_layer_a"></span>
        <span className="prf_star_layer prf_star_layer_b"></span>
        <span className="prf_star_layer prf_star_layer_c"></span>
      </div>
      <div className="prf_ambient_a" aria-hidden="true"></div>
      <div className="prf_ambient_b" aria-hidden="true"></div>
      <ColorSpots density="sparse" />
      
      {/* ── Cancel modal ── */}
      {cancelModalBooking && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setCancelModalBooking(null)}>
          <div style={{ background: "linear-gradient(135deg, rgba(10,10,20,0.97), rgba(18,18,36,0.97))", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "18px", padding: "28px", maxWidth: "480px", width: "90%", boxShadow: "0 24px 64px rgba(0,0,0,0.55)", animation: "profileFadeIn 0.22s ease" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 8px", color: "#fff", fontSize: "18px", fontWeight: "800" }}>❌ Cancel Booking</h2>
            <p style={{ margin: "0 0 18px", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: "1.6" }}>Please share a reason — this helps us improve our service.</p>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="e.g., My plans changed, I found a better option…" style={{ width: "100%", minHeight: "90px", padding: "11px 13px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: "13px", fontFamily: "inherit", resize: "none", boxSizing: "border-box", marginBottom: "16px", outline: "none" }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={async () => { if (!cancelReason.trim()) { setError("Please provide a reason."); return; } setCancelLoading(true); try { await handleCancelBooking(cancelModalBooking.bookingId, cancelReason); setCancelModalBooking(null); setCancelReason(""); } catch (err) { console.error(err); } finally { setCancelLoading(false); } }} disabled={cancelLoading || !cancelReason.trim()} style={{ flex: 1, padding: "11px", borderRadius: "10px", background: cancelLoading ? "rgba(239,68,68,0.3)" : "#ef4444", border: "none", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: cancelLoading ? "not-allowed" : "pointer", opacity: cancelLoading || !cancelReason.trim() ? 0.6 : 1 }}>
                {cancelLoading ? "Cancelling…" : "Confirm Cancellation"}
              </button>
              <button onClick={() => setCancelModalBooking(null)} style={{ padding: "11px 18px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.65)", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>Back</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {(message || error) && (
        <div className={`prf-toast ${message ? "success" : "error"}`}>
          <span>{message ? "✓" : "✕"}</span>
          <span>{message || error}</span>
        </div>
      )}

      <div className="profile_page_container">
        {/* <div className="prf-back-row">
          <button onClick={() => navigate(-1)} className="back_btn_animate">
            <div className="back_btn_inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              <span>Back</span>
            </div>
          </button>
        </div> */}

        {/* ── Two-column layout ── */}
        <div className="prf-layout">
          {/* ═══ SIDEBAR ═══ */}
          <aside className="prf-sidebar">
            {/* User block */}
            <div className="prf-user-block">
              <div className="prf-avatar-wrap" onClick={() => { setActiveTab("personal"); setShowAvatarUpload(true); }} title="Change profile photo">
                {profileImage
                  ? <img src={profileImage} alt="Avatar" className="prf-avatar-img" />
                  : <div className="prf-avatar-initials">{initials}</div>
                }
                <div className="prf-avatar-overlay">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span>Edit</span>
                </div>
              </div>
              <div className="prf-user-text">
                <p className="prf-user-name">{user?.displayName || "QuickWheels User"}</p>
                <p className="prf-user-email">{user?.email}</p>
                {isDealer && (
                  <span className={`prf-role-badge dealer${dealerStatus !== "approved" ? " pending" : ""}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    {dealerStatus === "approved" ? "Verified Dealer" : "Pending Dealer"}
                  </span>
                )}
                {isAdmin && (
                  <span className="prf-role-badge admin">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2l2.4 6.9L21 9l-5.4 4.6L17.4 21 12 17l-5.4 4 1.8-7.4L3 9l6.6-.1z" />
                    </svg>
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Nav */}
            <nav className="prf-nav" aria-label="Profile sections">
              {(() => {
                let lastSection = null;
                return tabs.map(tab => {
                  const showSection = tab.section && tab.section !== lastSection;
                  if (tab.section) lastSection = tab.section;
                  return (
                    <div key={tab.id}>
                      {showSection && <div className="prf-nav-section">{tab.section}</div>}
                      <button
                        className={`prf-nav-btn${activeTab === tab.id ? " active" : ""}${tab.danger ? " danger-nav" : ""}`}
                        onClick={() => { setActiveTab(tab.id); setMessage(""); setError(""); }}
                        aria-current={activeTab === tab.id ? "page" : undefined}
                        style={{ fontFamily: "Quicksand" }}
                      >
                        <span className="prf-nav-icon-box" aria-hidden="true">
                          <NavIcon id={tab.id} />
                        </span>
                        {tab.label}
                      </button>
                    </div>
                  );
                });
              })()}
            </nav>

            {/* Footer */}
            <div className="prf-sidebar-footer">
              <button className="prf-logout-btn" onClick={async () => { await logout(); navigate("/"); }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign out
              </button>
            </div>
          </aside>

          {/* ═══ CONTENT PANE ═══ */}
          <main className="prf-content" key={activeTab}>

            {/* ── PERSONAL DETAILS ── */}
            {activeTab === "personal" && (
              <form
                onSubmit={handleUpdateProfile}
                className="prf-personal-container"
                style={{
                  color: "#f8fafc",
                  fontFamily: "Quicksand,sans-serif",
                  animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                <style>{`
                  .prf-personal-container {}
                  .prf-header-row {
                    padding-bottom: 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 12px;
                  }
                  .prf-grid-2col {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                  }
                  .prf-card {
                    background: linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 18px;
                    padding: 12px 16px 16px;
                    transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
                  }
                  .prf-card:hover {
                    border-color: rgba(14,165,233,0.18);
                  }
                  .prf-emergency-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-top: 12px;
                  }

                  @media (max-width: 768px) {
                    .prf-grid-2col {
                      grid-template-columns: 1fr !important;
                      gap: 10px !important;
                    }
                    .prf-card {
                      padding: 16px 16px !important;
                    }
                    .prf-header-row {
                      padding-bottom: 14px !important;
                      margin-bottom: 14px !important;
                    }
                    /* keep contact-number & preferred-currency/language pairs
                       side-by-side even on narrow screens */
                    .prf-contact-grid,
                    .prf-pref-grid {
                      grid-template-columns: 1fr 1fr !important;
                      gap: 8px !important;
                    }
                  }

                  @media (max-width: 480px) {
                    .prf-card {
                      padding: 14px !important;
                      border-radius: 14px !important;
                    }
                    .prf-contact-grid,
                    .prf-pref-grid {
                      gap: 6px !important;
                    }
                    .prf-contact-grid input,
                    .prf-pref-grid select {
                      font-size: 12px !important;
                      padding: 10px 10px !important;
                    }
                    .prf-emergency-grid {
                      gap: 8px !important;
                    }
                  }
                `}</style>

                {/* Header */}
                <div className="prf-header-row">
                  <div>
                    <h2 className="prf-section-title qw_shine_heading">
                      Personal Details
                    </h2>
                    <p className="prf-section-sub">
                      Update your name, contact info, and preferences.
                    </p>
                  </div>

                  {isDealer && dealerData && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        borderRadius: "999px",
                        background: "rgba(168,85,247,0.08)",
                        border: "1px solid rgba(168,85,247,0.22)",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                      <span className="qw_shine_heading" style={{ color: "#a855f7", fontWeight: "700", fontSize: "12px", letterSpacing: "0.3px" }}>
                        Dealer Account
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: "8px" }}>
                        {dealerData?.businessName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Avatar upload card */}
                {showAvatarUpload && (
                  <div
                    className="prf-card"
                    style={{
                      margin: "10px 0",
                      padding: "16px 24px 0px",
                      borderColor: "rgba(14,165,233,0.15)",
                      background: "linear-gradient(145deg,rgba(14,165,233,0.05),rgba(14,165,233,0.01))",
                      animation: "fadeIn 0.25s ease",
                      alignSelf: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "700", color: "#9333ea" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        Profile Photo
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAvatarUpload(false)}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,.04)",
                          border: "1px solid rgba(255,255,255,.08)",
                          cursor: "pointer",
                          color: "rgba(255,255,255,.5)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                          e.currentTarget.style.color = "#ef4444";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,.04)";
                          e.currentTarget.style.color = "rgba(255,255,255,.5)";
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <ProfileImageUpload
                      currentImageUrl={profileImage}
                      onImageUpdate={(url) => {
                        setProfileImage(url);
                        if (url) localStorage.setItem(`profileImage_${user.uid}`, url);
                        else localStorage.removeItem(`profileImage_${user.uid}`);
                        setShowAvatarUpload(false);
                      }}
                    />
                  </div>
                )}

                <div className="prf-tab-card">
                {/* Name + Email */}
                <div className="prf-grid-2col" style={{ marginBottom: "20px" }}>
                  <div className="prf_field">
                    <input
                      type="text"
                      id="pf-name"
                      placeholder=" "
                      maxLength={50}
                      autoComplete="off"
                      value={personalData.displayName}
                      onChange={(e) => setPersonalData({ ...personalData, displayName: e.target.value })}
                    />
                    <label htmlFor="pf-name">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Full Name *
                    </label>
                    <p className="prf_field_hint">Max 3 words · letters, apostrophes, hyphens only</p>
                  </div>
                  <div className="prf_field">
                    <input
                      type="email"
                      id="pf-email"
                      placeholder=" "
                      value={user?.email || ""}
                      disabled
                    />
                    <label htmlFor="pf-email">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      Email Address
                    </label>
                  </div>
                </div>

                {/* Phone + Alternate */}
                <div className="prf-grid-2col prf-contact-grid" style={{ marginBottom: "20px" }}>
                  <div className="prf_field">
                    <input
                      type="tel"
                      id="pf-phone"
                      placeholder=" "
                      inputMode="numeric"
                      minLength={10}
                      maxLength={10}
                      value={personalData.phone}
                      onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value.replace(/\D/g, "") })}
                    />
                    <label htmlFor="pf-phone">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.52 2.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 17z" />
                      </svg>
                      Contact Number *
                    </label>
                  </div>
                  <div className="prf_field">
                    <input
                      type="tel"
                      id="pf-altphone"
                      placeholder=" "
                      inputMode="numeric"
                      minLength={10}
                      maxLength={10}
                      value={personalData.alternatePhone}
                      onChange={(e) => setPersonalData({ ...personalData, alternatePhone: e.target.value.replace(/\D/g, "") })}
                    />
                    <label htmlFor="pf-altphone">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.52 2.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 17z" />
                      </svg>
                      Alternate Number
                    </label>
                  </div>
                </div>

                {/* Address */}
                <div className="prf_field" style={{ marginBottom: "20px" }}>
                  <textarea
                    id="pf-address"
                    placeholder=" "
                    value={personalData.address}
                    onChange={(e) => setPersonalData({ ...personalData, address: e.target.value })}
                    rows={2}
                  />
                  <label htmlFor="pf-address">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Full Address
                  </label>
                </div>

                {/* Currency + Language */}
                <div className="prf-grid-2col prf-pref-grid" style={{ marginBottom: "0px" }}>
                  <div className="prf_field select-field" style={{ position: "relative" }}>
                    <select
                      id="pf-currency"
                      value={personalData.preferredCurrency}
                      onChange={(e) => {
                        setPersonalData({ ...personalData, preferredCurrency: e.target.value });
                        changeCurrency(e.target.value);
                      }}
                    >
                      <option value="USD" style={{ background: "#0c0c16" }}>$ USD — US Dollar</option>
                      <option value="INR" style={{ background: "#0c0c16" }}>₹ INR — Indian Rupee</option>
                      <option value="EUR" style={{ background: "#0c0c16" }}>€ EUR — Euro</option>
                      <option value="GBP" style={{ background: "#0c0c16" }}>£ GBP — British Pound</option>
                    </select>
                    <label htmlFor="pf-currency">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      Preferred Currency
                    </label>
                    <div style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.3)" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                  </div>
                  <div className="prf_field select-field" style={{ position: "relative" }}>
                    <select
                      id="pf-language"
                      value={personalData.preferredLanguage}
                      onChange={(e) => setPersonalData({ ...personalData, preferredLanguage: e.target.value })}
                    >
                      <option value="English" style={{ background: "#0c0c16" }}>🇬🇧 English</option>
                      <option value="Hindi" style={{ background: "#0c0c16" }}>🇮🇳 Hindi</option>
                      <option value="French" style={{ background: "#0c0c16" }}>🇫🇷 French</option>
                      <option value="Arabic" style={{ background: "#0c0c16" }}>🇸🇦 Arabic</option>
                    </select>
                    <label htmlFor="pf-language">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      Preferred Language
                    </label>
                    <div style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.3)" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                  </div>
                </div>
                </div>

                {/* Save button */}
                <button type="submit" className="btn profile_btn" style={{ width: "100%", maxWidth: "180px" }}>
                  Save Changes
                </button>
              </form>
            )}

            {/* ── CHANGE PASSWORD ── */}
            {activeTab === "password" && (
              <form
                onSubmit={handleChangePassword}
                className="prf-password-container"
                style={{
                  color: "#f8fafc",
                  fontFamily: "Quicksand,sans-serif",
                  animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                <style>{`
                  .prf-pw-header-row {
                    padding-bottom: 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    margin-bottom: 20px;
                  }
                  .prf-pw-grid-2col {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                  }

                  @media (max-width: 768px) {
                    .prf-pw-grid-2col {
                      grid-template-columns: 1fr !important;
                      gap: 10px !important;
                    }
                    .prf-pw-header-row {
                      padding-bottom: 14px !important;
                      margin-bottom: 14px !important;
                    }
                  }
                `}</style>

                {/* Header */}
                <div className="prf-pw-header-row">
                  <h2 className="prf-section-title qw_shine_heading">
                    Change Password
                  </h2>
                  <p className="prf-section-sub">
                    Choose a strong password. You&apos;ll need to enter your current one first.
                  </p>
                </div>

                <div className="prf-tab-card">
                {/* Current Password */}
                <div className="prf_field pw-field" style={{ marginBottom: "16px" }}>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showCurrent ? "text" : "password"}
                      id="pw-current"
                      placeholder=" "
                      autoComplete="off"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    />
                    <label htmlFor="pw-current">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                        <rect x="3" y="11" width="18" height="10" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Current Password
                    </label>
                    <button type="button" className="prf-pw-eye-btn" onClick={() => setShowCurrent(!showCurrent)}>
                      <EyeIcon show={showCurrent} />
                    </button>
                  </div>
                </div>

                {/* New + Confirm */}
                <div className="prf-pw-grid-2col" style={{ marginBottom: "8px" }}>
                  <div className="prf_field pw-field">
                    <div style={{ position: "relative" }}>
                      <input
                        type={showNew ? "text" : "password"}
                        id="pw-new"
                        placeholder=" "
                        minLength={8}
                        maxLength={20}
                        autoComplete="off"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      />
                      <label htmlFor="pw-new">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                          <rect x="3" y="11" width="18" height="10" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        New Password
                      </label>
                      <button type="button" className="prf-pw-eye-btn" onClick={() => setShowNew(!showNew)}>
                        <EyeIcon show={showNew} />
                      </button>
                    </div>
                    {passwordData.newPassword && (
                      <div>
                        <div className="prf-strength-bar-track">
                          <div
                            className="prf-strength-bar-fill"
                            style={{ width: strength.width, background: strength.color }}
                          />
                        </div>
                        <p style={{ fontSize: "11px", marginTop: "5px", marginBottom: 0, color: strength.color, fontWeight: "700" }}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                    <p className="prf_field_hint">Min 8 · uppercase · lowercase · number · special character</p>
                  </div>

                  <div className="prf_field pw-field">
                    <div style={{ position: "relative" }}>
                      <input
                        type={showConfirm ? "text" : "password"}
                        id="pw-confirm"
                        placeholder=" "
                        minLength={8}
                        maxLength={20}
                        autoComplete="off"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      />
                      <label htmlFor="pw-confirm">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                          <path d="M9 12l2 2 4-4" />
                          <rect x="3" y="11" width="18" height="10" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Confirm New Password
                      </label>
                      <button type="button" className="prf-pw-eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                        <EyeIcon show={showConfirm} />
                      </button>
                    </div>
                    {passwordData.confirmPassword && (
                      <p
                        style={{
                          fontSize: "11px",
                          marginTop: "5px",
                          marginBottom: 0,
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          color: passwordData.newPassword === passwordData.confirmPassword ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {passwordData.newPassword === passwordData.confirmPassword ? (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Passwords match
                          </>
                        ) : (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Passwords do not match
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                </div>

                <button type="submit" className="btn profile_btn" style={{ width: "100%", maxWidth: "220px" }}>
                  Update Password
                </button>
              </form>
            )}

            {/* ── SECURITY ── */}
            {activeTab === "security" && (
              <div
                className="prf-security-container"
                style={{
                  color: "#f8fafc",
                  fontFamily: "Quicksand,sans-serif",
                  animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                }}
              >
                <style>{`
                  .prf-sec-header-row {
                    padding-bottom: 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    margin-bottom: 20px;
                  }

                  @media (max-width: 768px) {
                    .prf-sec-header-row {
                      padding-bottom: 14px !important;
                      margin-bottom: 14px !important;
                    }
                  }
                `}</style>

                {/* Header */}
                <div className="prf-sec-header-row">
                  <h2 className="prf-section-title qw_shine_heading">
                    Security
                  </h2>
                  <p className="prf-section-sub">
                    Manage two-factor authentication and other security settings.
                  </p>
                </div>

                <div className="prf-tab-card">
                  <TwoFactorSetup user={user} currentlyEnabled={twoFactorEnabled} onStatusChange={() => refresh2FAStatus()} />
                </div>
              </div>
            )}

            {/* ── BOOKINGS ── */}
            {activeTab === "bookings" && (
              <div>
                <div className="prf-section-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <h2 className="prf-section-title qw_shine_heading">Booking History</h2>
                    <p className="prf-section-sub">All your past and current reservations in one place.</p>
                  </div>
                  <button onClick={() => navigate("/trip-dashboard?demo=true")} style={{ padding: "7px 13px", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "8px", color: "#a855f7", fontWeight: "600", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>🎮 Demo</button>
                </div>

                {bookingHistory.length > 0 && (
                  <div className="prf-booking-filters">
                    {[{ key: "all", label: "Total", value: bookingHistory.length, color: "#a855f7" }, { key: "confirmed", label: "Confirmed", value: bookingHistory.filter(b => b.status === "confirmed").length, color: "#22c55e" }, { key: "pending_approval", label: "Pending", value: bookingHistory.filter(b => b.status === "pending_approval").length, color: "#a855f7" }, { key: "cancelled", label: "Cancelled", value: bookingHistory.filter(b => b.status === "cancelled").length, color: "#ef4444" }].map(({ key, label, value, color }) => {
                      const isActive = bookingFilter === key;
                      return (
                        <button key={key} className="prf-filter-chip" onClick={() => setBookingFilter(isActive && key !== "all" ? "all" : key)}
                          style={{ background: isActive ? `${color}12` : "rgba(255,255,255,0.025)", border: `1px solid ${isActive ? color + "40" : "rgba(255,255,255,0.06)"}`, transform: isActive ? "translateY(-2px)" : "none", boxShadow: isActive ? `0 6px 18px ${color}18` : "none" }}>
                          <span className="fc-num" style={{ color: isActive ? color : "#fff" }}>{value}</span>
                          <span className="fc-lbl" style={{ color: isActive ? color : "rgba(255,255,255,0.3)" }}>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto", paddingRight: "2px" }}>
                  {bookingHistory.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="4x4" 
                          height="44" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="rgba(255, 255, 255, 0.35)" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                          <circle cx="7" cy="17" r="2" />
                          <path d="M9 17h6" />
                          <circle cx="17" cy="17" r="2" />
                        </svg>
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px", margin: "0 0 20px" }}>No bookings yet.</p>
                      <button onClick={() => navigate("/booking")} className="btn">
                        Book a Ride
                      </button>
                    </div>
                  ) : (() => {
                    const filtered = bookingFilter === "all" ? bookingHistory : bookingHistory.filter(b => b.status === bookingFilter);
                    return filtered.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 20px", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "14px" }}>
                        <p style={{ fontSize: "32px", margin: "0 0 10px" }}>🔍</p>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", margin: "0 0 14px" }}>No {bookingFilter} bookings found.</p>
                        <button onClick={() => setBookingFilter("all")} style={{ padding: "7px 16px", borderRadius: "8px", border: "none", background: "rgba(14,165,233,0.1)", color: "#a855f7", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>Show All</button>
                      </div>
                    ) : filtered.map((booking, i) => (
                      <BookingCard key={i} booking={booking} onCancelClick={handleCancelClick} onWriteReview={() => setBookingHistory(prev => [...prev])} />
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* ── EMERGENCY ── */}
            {activeTab === "emergency" && (
              <div>
                <div className="prf-section-header">
                  <h2 className="prf-section-title qw_shine_heading">Emergency Contact</h2>
                  <p className="prf-section-sub">Used for SOS alerts and emergency notifications during your bookings.</p>
                </div>
                {emergencyContact ? (
                  <div>
                    <div className="prf-tab-card" style={{ marginBottom: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
                        <div>
                          <h3 style={{ margin: "0 0 3px", color: "#fff", fontSize: "17px", fontWeight: "700" }}>{emergencyContact.name}</h3>
                          <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>{emergencyContact.relation}</p>
                        </div>
                        <button onClick={() => setShowEmergencyModal(true)} style={{ padding: "7px 14px", borderRadius: "8px", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}>Edit</button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                        {[{ label: "Phone", val: formatPhone(emergencyContact.phone) }, { label: " Relationship", val: emergencyContact.relation }].map(({ label, val }) => (
                          <div key={label} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.025)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: "4px" }}>{label}</span>
                            <span style={{ color: "#fff", fontSize: "14px", fontWeight: "600" }}>{val}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: "10px 14px", background: emergencyContact.shareWithSupport ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${emergencyContact.shareWithSupport ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.05)"}`, borderRadius: "9px" }}>
                        <span style={{ fontSize: "12px", color: emergencyContact.shareWithSupport ? "#22c55e" : "rgba(255,255,255,0.4)", fontWeight: "500" }}>
                          {emergencyContact.shareWithSupport ? "✅ Shared with QuickWheels support" : "❌ Not shared with support team"}
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: "16px", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: "12px" }}>
                      <h4 style={{ margin: "0 0 8px", color: "#ef4444", fontSize: "13px", fontWeight: "700" }}>⚡ SOS Alert — what happens</h4>
                      <ul style={{ margin: "0", paddingLeft: "16px", color: "rgba(255,255,255,0.45)", fontSize: "12px", lineHeight: "1.9" }}>
                        <li>Your live location is shared with the emergency contact</li>
                        <li>QuickWheels support is notified immediately</li>
                        <li>Your booking details are provided for quick assistance</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="prf-tab-card" style={{ textAlign: "center", padding: "50px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="44" 
                        height="44" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="rgba(255,255,255,0.4)" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "20px", lineHeight: "1.6" }}>
                      No emergency contact added yet. Add one to stay protected during your trips.
                    </p>
                    <button onClick={() => setShowEmergencyModal(true)} className="btn">
                      Add Emergency Contact
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── CONTACT US ── */}
            {activeTab === "contact" && (
              <div>
                <div className="prf-section-header">
                  <h2 className="prf-section-title qw_shine_heading">Contact Us</h2>
                  <p className="prf-section-sub">Have a question or need support? We typically respond within 24 hours.</p>
                </div>
                <div className="prf-tab-card">
                <form onSubmit={async e => {
                  e.preventDefault();
                  const formEl = e.target;
                  const payload = { name: user?.displayName || "QuickWheels User", email: user?.email || "", subject: formEl.subject.value, message: formEl.message.value };
                  const emailError = validateEmail(user?.email || "");
                  if (emailError) { setError(emailError); return; }
                  try {
                    const response = await fetch("https://formspree.io/f/mrbpgvzd", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) });
                    const result = await response.json();
                    if (response.ok) { setMessage("Message sent! We'll get back to you soon."); formEl.reset(); }
                    else setError("Failed to send message. Please try again.");
                  } catch (err) { setError("Something went wrong. Please try again."); }
                }} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="prf-grid-2col-contact" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div className="prf_field">
                      <input type="text" id="ct-name" placeholder=" " value={user?.displayName || ""} disabled />
                      <label htmlFor="ct-name">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        Your Name
                      </label>
                    </div>
                    <div className="prf_field">
                      <input type="email" id="ct-email" placeholder=" " value={user?.email || ""} disabled />
                      <label htmlFor="ct-email">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        Email Address
                      </label>
                    </div>
                  </div>
                  <div className="prf_field">
                    <input type="text" id="ct-subject" name="subject" placeholder=" " autoComplete="off" required />
                    <label htmlFor="ct-subject">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                        <path d="M4 4h16v16H4z" /><path d="M4 9h16" />
                      </svg>
                      Subject *
                    </label>
                  </div>
                  <div className="prf_field">
                    <textarea id="ct-message" name="message" placeholder=" " required rows={4} />
                    <label htmlFor="ct-message">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "5px" }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Message *
                    </label>
                  </div>
                  <div>
                    <button type="submit" className="btn">
                      Send Message
                    </button>
                  </div>
                </form>
                </div>
                <div style={{ marginTop: "20px", padding: "14px 16px", background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.14)", borderRadius: "10px", textAlign: "center" }}>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="rgba(255,255,255,0.4)" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{ display: "inline-block" }}
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    support@quickwheels.com · Typical response within 24 hours
                  </p>
                </div>
              </div>
            )}

            {/* ── ADMIN ── */}
            {activeTab === "admin" && (
              <div>
                <div className="prf-section-header">
                  <h2 className="prf-section-title qw_shine_heading">Admin Portal</h2>
                  <p className="prf-section-sub">Manage bookings, users, and platform analytics.</p>
                </div>
                <div className="prf-portal-card" style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      strokeWidth="1.5" 
                      stroke="rgba(255,255,255,0.5)" 
                      style={{ width: "48px", height: "48px" }}
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" 
                      />
                    </svg>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", margin: "0 auto 28px", lineHeight: "1.6", maxWidth: "320px" }}>
                    Access the full admin dashboard to manage the QuickWheels platform.
                  </p>
                  <button onClick={() => navigate("/admin")} className="qw_fancy_btn">
                    <FancyButtonFx />
                    <span className="qw_fancy_btn_inner">Open Admin Dashboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── DEALER ── */}
            {activeTab === "dealer" && (
              <div>
                <div className="prf-section-header">
                  <h2 className="prf-section-title qw_shine_heading qw_shine_heading">Dealer Dashboard</h2>
                  <p className="prf-section-sub">Manage your fleet, view bookings, and track revenue.</p>
                </div>
                <div className="prf-portal-card" style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      strokeWidth="1.5" 
                      stroke="rgba(255,255,255,0.5)" 
                      style={{ width: "48px", height: "48px" }}
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" 
                      />
                    </svg>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", margin: "0 auto 28px", lineHeight: "1.6", maxWidth: "320px" }}>
                    Access your dealer portal to manage your fleet and booking requests.
                  </p>
                  <button onClick={() => navigate("/dealer")} className="qw_fancy_btn">
                    <FancyButtonFx />
                    <span className="qw_fancy_btn_inner">Open Dealer Dashboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── DANGER ZONE ── */}
            {activeTab === "danger" && (
              <div>
                <div className="prf-section-header">
                  <h2 className="prf-section-title qw_shine_heading">Account Settings</h2>
                  <p className="prf-section-sub">Manage account-level actions. These cannot be undone.</p>
                </div>
                <div className="prf-danger-card">
                  <h3 style={{ color: "#ef4444", margin: "0 0 10px", fontSize: "15px", fontWeight: "800", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      strokeWidth="2" 
                      stroke="currentColor" 
                      style={{ width: "16px", height: "16px" }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    Delete Account
                  </h3>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginBottom: "20px", lineHeight: "1.6" }}>Once you delete your account, all your booking history and personal data will be permanently removed. This action cannot be undone.</p>
                  {showDeleteConfirm ? (
                    <div style={{ padding: "16px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: "10px", marginBottom: "12px" }}>
                      <p style={{ color: "#ef4444", fontWeight: "700", margin: "0 0 12px", fontSize: "13px" }}>Are you absolutely sure? This cannot be undone.</p>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={handleDeleteConfirmed} style={{ padding: "9px 20px", borderRadius: "8px", background: "#ef4444", border: "none", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>Yes, Delete My Account</button>
                        <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: "9px 20px", borderRadius: "8px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowDeleteConfirm(true)} className="delete_btn">
                      <span>Delete Account</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="svg_icon"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Emergency Contact Modal */}
      <EmergencyContactModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        onSave={async () => {
          try {
            const contact = await getEmergencyContact(user.uid);
            if (contact) setEmergencyContact(contact);
          } catch (err) { console.error(err); }
        }}
      />
    </div>
  );
}

export default Profile;