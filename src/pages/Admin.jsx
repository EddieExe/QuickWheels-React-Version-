// Admin.jsx  — RBAC-integrated build (new version)
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, getDocs, query, orderBy, where,
  doc, updateDoc, onSnapshot, deleteDoc, addDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import jsPDF from "jspdf";
import emailjs from "@emailjs/browser";
import { sendApprovalEmail, sendRejectionEmail } from "../utils/emailService";
import {
  logAdminAction,
  getFilteredNavItems,
  hasPermission,
  PERMISSIONS,
  ROLE_NAMES,
  ROLE_COLORS,
} from "../utils/adminUtils.jsx";
import "../styles/home.css";
import ColorSpots from "../components/ColorSpots";
import PermissionGuard from "../components/PermissionGuard";
import BulkActionBar from "../components/admin/BulkActionBar";
import DealerLocationModal from "../components/admin/DealerLocationModal";
import AdminEmergencyDashboard from "./admin/AdminEmergencyDashboard";
import SystemMonitoring from "./admin/SystemMonitoring";
import EmailTemplateEditor from "./admin/EmailTemplateEditor";
import AdminSettings from "./admin/AdminSettings";
import AuditLogs from "./admin/AuditLogs";
import ExportReports from "./admin/ExportReports";
import DataBackup from "./admin/DataBackup";
import DateRangeFilter from "../components/admin/DateRangeFilter";
import AddDealerModal from "../components/admin/AddDealerModal";
import CarAnalytics from "../components/admin/CarAnalytics";
import NoShowAnalytics from "../components/admin/NoShowAnalytics";
import RetentionAnalytics from "../components/admin/RetentionAnalytics";
import RevenueRoutes from "../components/admin/RevenueRoutes";
import DealerDocuments from "../components/admin/DealerDocuments";
import DealerPerformance from "../components/admin/DealerPerformance";
import DealerCommission from "../components/admin/DealerCommission";
import { createPaymentRecord } from "../utils/paymentLedger";
import BreakdownRequests from "../components/admin/BreakdownRequests";
import DemandAnalytics from "../components/admin/DemandAnalytics";
import AdminStatusAutomation from "../components/admin/AdminStatusAutomation";
import AdminExtensionRequests from "../components/admin/AdminExtensionRequests";
import { RESPONSIVE_CSS } from "../hooks/adminResponsivePatch";

const EMAILJS_SERVICE_ID  = "service_crw994k";
const EMAILJS_RECEIPT_ID  = "template_npbllll";
const EMAILJS_PUBLIC_KEY  = "TJIFq6s5ghB-Qg91W";

// ─── Helpers ─────────────────────────────────────────────
function isUpcoming(b) {
  if (!b.pickupDate) return false;
  const p = new Date(b.pickupDate); p.setHours(0,0,0,0);
  const t = new Date();             t.setHours(0,0,0,0);
  return p >= t;
}
function canAdminAct(b) {
  return !["cancelled","completed","rejected"].includes(b.status) && isUpcoming(b);
}

// ─── Status map ───────────────────────────────────────────
const STATUS_MAP = {
  confirmed:        { label:"Confirmed",          color:"#22c55e", bg:"rgba(34,197,94,0.08)",   border:"rgba(34,197,94,0.25)",   glow:"rgba(34,197,94,0.15)"  },
  cancelled:        { label:"Cancelled",          color:"#ef4444", bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.25)",   glow:"rgba(239,68,68,0.15)"  },
  cancelled_dealer: { label:"Cancelled by Dealer",color:"#f97316", bg:"rgba(249,115,22,0.08)",  border:"rgba(249,115,22,0.25)",  glow:"rgba(249,115,22,0.15)" },
  cancelled_admin:  { label:"Cancelled by Admin", color:"#ef4444", bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.25)",   glow:"rgba(239,68,68,0.15)"  },
  cancelled_user:   { label:"Cancelled by User",  color:"#94a3b8", bg:"rgba(148,163,184,0.08)", border:"rgba(148,163,184,0.25)", glow:"rgba(148,163,184,0.15)"},
  completed:        { label:"Completed",          color:"#a855f7", bg:"rgba(168,85,247,0.08)",  border:"rgba(168,85,247,0.25)",  glow:"rgba(168,85,247,0.15)" },
  on_hold:          { label:"On Hold",            color:"#f59e0b", bg:"rgba(245,158,11,0.08)",  border:"rgba(245,158,11,0.25)",  glow:"rgba(245,158,11,0.15)" },
  active:           { label:"Active",             color:"#a855f7", bg:"rgba(168,85,247,0.08)",  border:"rgba(168,85,247,0.25)",  glow:"rgba(168,85,247,0.15)" },
  pending_approval: { label:"Pending",            color:"#a855f7", bg:"rgba(168,85,247,0.08)",  border:"rgba(168,85,247,0.25)",  glow:"rgba(168,85,247,0.15)" },
  upcoming_trip:    { label:"Upcoming Trip",      color:"#3b82f6", bg:"rgba(59,130,246,0.08)",  border:"rgba(59,130,246,0.25)",  glow:"rgba(59,130,246,0.15)" },
  pickup_awaited:   { label:"Pickup Awaited",     color:"#f59e0b", bg:"rgba(245,158,11,0.08)",  border:"rgba(245,158,11,0.25)",  glow:"rgba(245,158,11,0.15)" },
  ongoing_trip:     { label:"Ongoing Trip",       color:"#10b981", bg:"rgba(16,185,129,0.08)",  border:"rgba(16,185,129,0.25)",  glow:"rgba(16,185,129,0.15)" },
  return_pending:   { label:"Return Pending",     color:"#f59e0b", bg:"rgba(245,158,11,0.08)",  border:"rgba(245,158,11,0.25)",  glow:"rgba(245,158,11,0.15)" },
  no_show:          { label:"No Show",            color:"#ef4444", bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.25)",   glow:"rgba(239,68,68,0.15)"  },
  dealer_confirmed: { label:"Dealer Approved",    color:"#a855f7", bg:"rgba(168,85,247,0.08)",  border:"rgba(168,85,247,0.25)",  glow:"rgba(168,85,247,0.15)" },
  rejected:         { label:"Rejected",           color:"#ef4444", bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.25)",   glow:"rgba(239,68,68,0.15)"  },
};

function getEffectiveStatus(b) {
  if (!b) return "pending_approval";
  if (b.status === "cancelled") {
    if (b.cancelledBy === "dealer") return "cancelled_dealer";
    if (b.cancelledBy === "admin")  return "cancelled_admin";
    if (b.cancelledBy === "user")   return "cancelled_user";
  }
  return b.status;
}

const TERMINAL_RED = new Set(["cancelled","cancelled_dealer","cancelled_admin","cancelled_user","rejected","no_show"]);
function totalColor(effKey) {
  if (TERMINAL_RED.has(effKey)) return "#ef4444";
  if (effKey === "completed")   return "#a855f7";
  return "#22c55e";
}

function StatusBadge({ booking }) {
  const key = getEffectiveStatus(booking);
  const s = STATUS_MAP[key] || { label: key?.replace(/_/g," ") || "Unknown", color:"#94a3b8", bg:"rgba(148,163,184,0.08)", border:"rgba(148,163,184,0.25)", glow:"rgba(148,163,184,0.1)" };
  return (
    <span style={{ padding:"4px 10px", borderRadius:"6px", fontSize:"10px", fontWeight:"800", letterSpacing:"0.05em", textTransform:"uppercase", color:s.color, background:s.bg, border:`1px solid ${s.border}`, boxShadow:`0 0 8px ${s.glow}`, whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:"5px" }}>
      <span style={{ width:"4px", height:"4px", borderRadius:"50%", background:s.color }} />
      {s.label}
    </span>
  );
}

// ─── Role badge shown in header ───────────────────────────
function RoleBadge({ role }) {
  if (!role) return null;

  const currentColors = ROLE_COLORS[role] || ROLE_COLORS.support;
  const baseColor = currentColors.color; // Your dynamic Yellow or Role Color

  const cleanRoleName = role.replace(/[^a-zA-Z0-9]/g, "");
  const className = `pure-text-shine-${cleanRoleName}`;

  return (
    <>
      <style>{`
        .${className} {
          display: inline-block;
          font-size: 13px;          
          font-weight: 850;         
          text-transform: uppercase;
          letter-spacing: 0.09em;
          white-space: nowrap;
          cursor: default;
          user-select: none;
          
          /* Native Apple Linear Metallic Gradient */
          background: linear-gradient(
            to right, 
            #4A5B7C 0%,       
            #4A5B7C 25%, 
            ${baseColor} 50%, 
            #4A5B7C 75%, 
            #4A5B7C 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          
          /* Seamless continuous animation loop */
          animation: luxuryPureSeamlessShine 3s infinite linear;
          
          /* Ambient typographic glow that follows character kerning perfectly */
          filter: drop-shadow(0 0 5px ${baseColor}55);
        }

        @keyframes luxuryPureSeamlessShine {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: 0% center;
          }
        }
      `}</style>

      {/* Renders exclusively the raw typography layout node */}
      <span className={className}>
        {ROLE_NAMES[role] || role}
      </span>
    </>
  );
}

// ─── Admin KPI Widget (matches Dealer's KpiWidget exactly) ────
function AdminKpiWidget({ gradient, shadow, label, value, sub, icon }) {
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
        <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>
          {label}
        </p>
        <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>
          {value}
        </p>
        {sub && (
          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>{sub}</p>
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

// ─── Admin Section Header (matches Dealer's SectionHeader exactly) ─
function AdminSectionHeader({
  title,
  sub,
  badge,
  icon,
}) {
  return (
    <div
      className="admin-section-header"
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
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "22px" }}>{title}</h2>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "13.5px" }}>{sub}</p>
      </div>
      {badge && (
        <div className="admin-section-header-badge qw_shine_heading" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {icon}
          <span style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}

function TabSkeleton() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"12px", padding:"8px 0" }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ background:"rgba(255,255,255,0.04)", borderRadius:"14px", padding:"20px", border:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
            <div style={{ width:"48px", height:"48px", borderRadius:"14px", background:"rgba(255,255,255,0.06)" }} />
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"8px" }}>
              <div style={{ height:"14px", width:`${60+i*10}%`, borderRadius:"4px", background:"rgba(255,255,255,0.06)" }} />
              <div style={{ height:"10px", width:`${40+i*5}%`,  borderRadius:"4px", background:"rgba(255,255,255,0.04)" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingCountdown({ booking }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    function tick() {
      if (!booking.approvalDeadline) return;
      const deadline = booking.approvalDeadline?.toDate ? booking.approvalDeadline.toDate() : new Date(booking.approvalDeadline);
      const ms = deadline - new Date();
      if (ms <= 0) { setTimeLeft("Auto-confirming"); return; }
      const m = Math.floor(ms/60000), s = Math.floor((ms%60000)/1000);
      setTimeLeft(`${m}m ${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [booking]);
  if (!timeLeft) return null;
  return (
    <span style={{ padding:"6px 12px", borderRadius:"6px", fontSize:"12px", fontWeight:"700", background:"rgba(168,85,247,0.1)", border:"1px solid rgba(168,85,247,0.3)", color:"#a855f7", alignSelf:"center" }}>
      ⏱ {timeLeft}
    </span>
  );
}

function StarRating({ rating }) {
  return (
    <div style={{ display:"flex", gap:"2px" }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize:"14px", color: i <= rating ? "#fbbf24" : "rgba(255,255,255,0.15)" }}>★</span>
      ))}
    </div>
  );
}



const ICONS = {
  business: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  documents: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  fleet: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="22" height="13" rx="2" ry="2"/><polyline points="22 7 12 12 2 7"/></svg>,
  bookings: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  users: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  close: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  alert: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  back: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
};

const TABS = [
  { id: "business", label: "Core Profile", short: "Profile", icon: ICONS.business },
  { id: "documents", label: "Verification Vault", short: "Docs", icon: ICONS.documents },
  { id: "fleet", label: "Hardware Portfolio", short: "Fleet", icon: ICONS.fleet },
  { id: "bookings", label: "Reservation Matrix", short: "Bookings", icon: ICONS.bookings },
  { id: "users", label: "Ecosystem Client Base", short: "Clients", icon: ICONS.users },
];

const TAB_COPY = {
  business: ["Profile Information", "Comprehensive corporate registry and state validation keys"],
  documents: ["Security Documents", "Verify identity cards, corporate filings and financial validation vectors"],
  fleet: ["Fleet Management", "Real-time verification of physical assets allocated on platform networks"],
  bookings: ["Booking Transaction Log", "Immutable tracking record of rentals, financial ledger totals, and timelines"],
  users: ["Associated Users Map", "Ecosystem clients cross-referenced into database interactions"],
};

function getStatusMeta(status) {
  if (status === "approved") return { color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)" };
  if (status === "suspended" || status === "rejected") return { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" };
  return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)" };
}

function DealerDetailModal({ dealer, onClose, onAction }) {
  const [activeTab, setActiveTab] = useState("business");
  const [dealerCars, setDealerCars] = useState([]);
  const [dealerBookings, setDealerBookings] = useState([]);
  const [dealerUsers, setDealerUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingData(true);
      try {
        const [carsSnap, bookSnap] = await Promise.all([
          getDocs(collection(db, "dealers", dealer.id, "cars")),
          getDocs(query(collection(db, "bookings"), where("dealerId", "==", dealer.id))),
        ]);
        if (cancelled) return;
        const cars = carsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const bookings = bookSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDealerCars(cars);
        setDealerBookings(bookings);

        const userMap = {};
        bookings.forEach(b => {
          if (b.userEmail) {
            userMap[b.userEmail] = {
              email: b.userEmail,
              name: b.userName || b.userEmail,
              count: (userMap[b.userEmail]?.count || 0) + 1,
              revenue: (userMap[b.userEmail]?.revenue || 0) + (b.total || 0),
            };
          }
        });
        setDealerUsers(Object.values(userMap));
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [dealer.id]);

  async function switchTab(tab) {
    if (tab === activeTab) return;
    setTabLoading(true);
    setActiveTab(tab);
    await new Promise(r => setTimeout(r, 120));
    setTabLoading(false);
  }

  const totalRevenue = dealerBookings
    .filter(b => b.status === "confirmed" || b.status === "completed")
    .reduce((s, b) => s + (b.total || 0), 0);

  const statusMeta = getStatusMeta(dealer.status);
  const [tabTitle, tabDesc] = TAB_COPY[activeTab];

  return (
    <div className="dm-overlay" onClick={onClose}>
      <style>{`
        @keyframes dmFadeInModal { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        @keyframes dmInnerFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dmSpin { to { transform: rotate(360deg); } }

        .dm-overlay {
          position: fixed; inset: 0; background: rgba(15, 11, 28, 0.65); z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          padding: 30px;
        }

        .dm-wrapper {
          background: #0f0b1c; 
          border: 1px solid rgba(255,255,255,0.08); 
          border-radius: 24px;
          max-width: 960px; 
          width: 100%; 
          height: 80vh;
          min-height: 0;
          display: flex; 
          overflow: hidden;
          box-shadow: 0 25px 60px -15px rgba(0,0,0,0.7);
          animation: dmFadeInModal 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
          font-family: 'Quicksand', -apple-system, sans-serif; color: #f8fafc;
        }

        .dm-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .dm-scroll::-webkit-scrollbar-track { background: transparent; }
        .dm-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .dm-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

        /* ── SIDEBAR ── */
        .dm-sidebar {
          flex: 0 0 30%; display: flex; flex-direction: column; gap: 18px;
          overflow-y: auto; padding: 20px; border-right: 1px solid rgba(255,255,255,0.06);
        }

        .dm-brand {
          background: linear-gradient(135deg, #9f1239 0%, #f43f5e 100%);
          padding: 15px; border-radius: 18px; color: #fff;
          box-shadow: 0 8px 24px rgba(244,63,94,0.25), inset 0 1px 1px rgba(255,255,255,0.15);
          flex-shrink: 0;
        }
        .dm-brand-top { display: flex; gap: 14px; align-items: center; margin-bottom: 16px; }
        .dm-brand-avatar {
          width: 48px; height: 48px; border-radius: 12px; overflow: hidden; flex-shrink: 0;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700;
        }
        .dm-brand-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .dm-brand-name { margin: 0 0 2px; font-weight: 800; font-size: 16px; letter-spacing: -0.3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dm-brand-loc { margin: 0; font-size: 11px; font-weight: 500; opacity: 0.75; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dm-brand-foot { display: flex; justify-content: space-between; align-items: center; }
        .dm-status-pill {
          display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 6px;
          font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
          color: #fff; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .dm-status-dot { width: 5px; height: 5px; border-radius: 50%; background: #fff; }
        .dm-brand-revenue { font-size: 15px; opacity: 0.85; font-weight: 700; }

        .dm-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: rgba(255,255,255,0.35); padding-left: 6px; }

        .dm-tabs {
          background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px;
          padding: 6px; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;
        }
        .dm-tab-btn {
          padding: 11px 14px; border-radius: 10px; border: none; border-left: 3px solid transparent;
          background: transparent; color: rgba(255,255,255,0.45); cursor: pointer; font-family: inherit;
          font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 12px; text-align: left;
          transition: all 0.2s ease; white-space: nowrap;
        }
        .dm-tab-btn:hover { background: rgba(244,63,94,0.1); color: #f43f5e; border-left-color: #f43f5e; }
        .dm-tab-btn.active { background: rgba(244,63,94,0.15); color: #f43f5e; border-left-color: #f43f5e; }
        .dm-tab-btn .dm-tab-icon { opacity: 0.5; display: flex; align-items: center; flex-shrink: 0; }
        .dm-tab-btn.active .dm-tab-icon { opacity: 0.9; }
        .dm-tab-label-full { display: inline; }
        .dm-tab-label-short { display: none; }

        .dm-safety {
          background: rgba(244,63,94,0.04); border: 1px solid rgba(244,63,94,0.12); border-radius: 16px;
          padding: 14px 16px; margin-top: auto; flex-shrink: 0;
        }
        .dm-safety-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; color: #f43f5e; }
        .dm-safety-head p { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; }
        .dm-safety p.dm-safety-body { margin: 0; font-size: 11.5px; color: rgba(255,255,255,0.4); line-height: 1.5; }

        /* ── CONTENT ── */
        .dm-content { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; height: 100%; overflow: hidden; padding: 28px 32px; }
        .dm-header { padding-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-shrink: 0; position: sticky; top: 0; z-index: 5; background: #0f0b1c;}
        .dm-header h2 { margin: 0 0 2px; font-size: 22px; color: #fff; font-weight: 800; letter-spacing: -0.5px; }
        .dm-header p { margin: 0; color: rgba(255,255,255,0.4); font-size: 13px; }
        .dm-close {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.2s; flex-shrink: 0;
        }
        .dm-close:hover { color: #fff; background: rgba(255,255,255,0.08); }

        .dm-viewport { flex: 1; min-height: 0; overflow-y: auto; padding-bottom: 10px; }
        .dm-loading { display: flex; justify-content: center; align-items: center; height: 60%; }
        .dm-spinner { width: 22px; height: 22px; border: 2px solid rgba(244,63,94,0.15); border-top-color: #f43f5e; border-radius: 50%; animation: dmSpin 0.75s linear infinite; }
        .dm-fade { min-height: 100%; animation: dmInnerFade 0.25s ease forwards; }

        /* Business tab */
        .dm-business { display: flex; flex-direction: column; height: 100%; justify-content: space-between; gap: 20px; }
        .dm-profile-card { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 6px 24px; }
        .dm-profile-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.04); flex-wrap: wrap; }
        .dm-profile-row:last-of-type { border-bottom: none; }
        .dm-profile-label { color: rgba(255,255,255,0.4); font-size: 13.5px; font-weight: 500; flex-shrink: 0; }
        .dm-profile-value { color: #fff; font-size: 13.5px; font-weight: 600; text-align: right; word-break: break-word; }
        .dm-status-chip { border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; }
        .dm-profile-desc { padding: 16px 0 10px; border-top: 1px solid rgba(255,255,255,0.04); color: rgba(255,255,255,0.4); font-size: 13px; line-height: 1.6; font-style: italic; }

        .dm-actions { display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap; }
        .dm-action-btn { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); border-radius: 12px; padding: 13px 28px; font-weight: 700; font-size: 13px; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; border: none; }
        .dm-action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); opacity: 0.95; }
        .dm-action-btn:active { transform: translateY(0); opacity: 1; }
        .dm-action-btn.dm-approve { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #fff; flex: 1 1 auto; }
        .dm-action-btn.dm-reject { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #f87171; flex: 1 1 auto; }
        .dm-action-btn.dm-suspend { background: linear-gradient(135deg, #9f1239 0%, #f43f5e 100%); color: #fff; width: 100%; }
        .dm-action-btn.dm-reinstate { background: linear-gradient(135deg, #065f46 0%, #059669 100%); color: #fff; width: 100%; }

        /* Fleet */
        .dm-fleet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }
        .dm-fleet-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; overflow: hidden; }
        .dm-fleet-card img { width: 100%; height: 95px; object-fit: cover; display: block; }
        .dm-fleet-body { padding: 12px; }
        .dm-fleet-model { margin: 0; color: #fff; font-size: 13px; font-weight: 700; }
        .dm-fleet-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; gap: 6px; flex-wrap: wrap; }
        .dm-fleet-price { margin: 0; color: #f43f5e; font-size: 13px; font-weight: 700; }
        .dm-fleet-price span { opacity: 0.5; font-size: 11px; font-weight: 500; }
        .dm-fleet-badge { padding: 2px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; white-space: nowrap; }

        /* Bookings */
        .dm-booking-list { display: flex; flex-direction: column; gap: 12px; }
        .dm-booking-card { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 16px 20px; }
        .dm-booking-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
        .dm-booking-model { margin: 0; color: #fff; font-weight: 700; font-size: 14px; }
        .dm-booking-hash { margin: 2px 0 0; color: rgba(255,255,255,0.3); font-size: 11px; font-family: monospace; }
        .dm-booking-price { margin: 0; color: #f43f5e; font-weight: 800; font-size: 16px; text-align: right; }
        .dm-booking-status { margin: 2px 0 0; font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; text-align: right; }
        .dm-booking-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.04); }
        .dm-meta-label { margin: 0; color: rgba(255,255,255,0.3); font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
        .dm-meta-value { margin: 3px 0 0; color: rgba(255,255,255,0.65); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Users */
        .dm-user-list { display: flex; flex-direction: column; gap: 10px; }
        .dm-user-card { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 14px; padding: 14px 20px; display: flex; align-items: center; gap: 16px; }
        .dm-user-avatar { width: 36px; height: 36px; border-radius: 10px; background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.2); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #f43f5e; flex-shrink: 0; }
        .dm-user-info { flex: 1; min-width: 0; }
        .dm-user-name { margin: 0; color: #fff; font-weight: 700; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dm-user-email { margin: 1px 0 0; color: rgba(255,255,255,0.35); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dm-user-stats { text-align: right; flex-shrink: 0; }
        .dm-user-count { margin: 0; color: #f43f5e; font-weight: 700; font-size: 13px; }
        .dm-user-revenue { margin: 2px 0 0; color: rgba(255,255,255,0.4); font-size: 12px; }

        .dm-empty { text-align: center; padding: 40px 0; color: rgba(255,255,255,0.3); font-size: 13px; }
        .dm-doc-panel { display: flex; flex-direction: column; gap: 16px; overflow: visible; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 24px; }

        /* ═══ TABLET (≤ 1023px): tighten sidebar, keep split ═══ */
        @media (max-width: 1023px) {
          .dm-overlay { padding: 16px; }
          .dm-wrapper { height: 88vh; }
          .dm-sidebar { flex: 0 0 34%; padding: 16px; gap: 14px; }
          .dm-content { padding: 22px 22px; }
          .dm-booking-meta { grid-template-columns: repeat(2, 1fr); }
        }

        /* ═══ MOBILE (≤ 700px): stack, full-screen, top tab strip ═══ */
        @media (max-width: 700px) {
          .dm-overlay { padding: 0; align-items: stretch; }
          .dm-wrapper {
            flex-direction: column; max-width: 100%; width: 100%; height: 100dvh;
            border-radius: 0; border: none;
          }
          .dm-doc-panel { padding: 16px; gap: 12px; }
          .dm-sidebar {
            flex: 0 0 auto; flex-direction: row; flex-wrap: wrap; gap: 10px;
            border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06);
            padding: 14px 14px 12px; overflow: visible; align-items: stretch;
          }
          .dm-brand { flex: 1 1 100%; padding: 12px 14px; }
          .dm-brand-top { margin-bottom: 10px; }
          .dm-brand-avatar { width: 40px; height: 40px; }
          .dm-brand-name { font-size: 14px; }
          .dm-eyebrow { display: none; }

          .dm-tabs {
            flex: 1 1 100%; flex-direction: row; overflow-x: auto; -webkit-overflow-scrolling: touch;
            scrollbar-width: none; padding: 5px;
          }
          .dm-tabs::-webkit-scrollbar { display: none; }
          .dm-tab-btn { flex: 0 0 auto; padding: 9px 13px; font-size: 12px; gap: 7px; border-left: none; border-bottom: 3px solid transparent; }
          .dm-tab-btn:hover, .dm-tab-btn.active { border-left-color: transparent; border-bottom-color: #f43f5e; }
          .dm-tab-label-full { display: none; }
          .dm-tab-label-short { display: inline; }

          .dm-safety { display: none; }

          .dm-content { padding: 16px; overflow: hidden; }
          .dm-header { padding-bottom: 12px; margin-bottom: 14px; }
          .dm-header h2 { font-size: 18px; }
          .dm-header p { font-size: 12px; }

          .dm-profile-card { padding: 4px 16px; }
          .dm-profile-row { padding: 12px 0; gap: 4px 12px; }
          .dm-profile-label { font-size: 12.5px; flex: 1 1 100%; }
          .dm-profile-value { font-size: 13px; text-align: left; flex: 1 1 100%; }

          .dm-actions { flex-direction: column; }
          .dm-action-btn { width: 100%; padding: 13px 20px; }

          .dm-fleet-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .dm-booking-card { padding: 14px 16px; }
          .dm-booking-meta { grid-template-columns: repeat(2, 1fr); gap: 10px 14px; }
          .dm-user-card { padding: 12px 14px; gap: 12px; }
        }

        @media (max-width: 380px) {
          .dm-fleet-grid { grid-template-columns: 1fr 1fr; }
          .dm-tab-btn { padding: 8px 10px; font-size: 11px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .dm-wrapper, .dm-fade, .dm-spinner { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="dm-wrapper" onClick={e => e.stopPropagation()}>

        {/* SIDEBAR / MOBILE TOP BAR */}
        <div className="dm-sidebar dm-scroll">
          <div className="dm-brand">
            <div className="dm-brand-top">
              <div className="dm-brand-avatar">
                {dealer.logo ? <img src={dealer.logo} alt="logo" /> : dealer.businessName?.[0]?.toUpperCase()}
              </div>
              <div style={{ overflow: "hidden" }}>
                <p className="dm-brand-name">{dealer.businessName}</p>
                <p className="dm-brand-loc">{dealer.city}, {dealer.state}</p>
              </div>
            </div>
            <div className="dm-brand-foot">
              <span className="dm-status-pill"><span className="dm-status-dot" />{dealer.status}</span>
              <span className="dm-brand-revenue">${totalRevenue.toLocaleString()}</span>
            </div>
          </div>

          <div className="dm-eyebrow">DATA HORIZONS</div>

          <div className="dm-tabs">
            {TABS.map(({ id, label, short, icon }) => (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className={`dm-tab-btn ${activeTab === id ? "active" : ""}`}
              >
                <span className="dm-tab-icon">{icon}</span>
                <span className="dm-tab-label-full">{label}</span>
                <span className="dm-tab-label-short">{short}</span>
              </button>
            ))}
          </div>

          <div className="dm-safety">
            <div className="dm-safety-head">{ICONS.alert}<p>REVENUE RECONCILIATION</p></div>
            <p className="dm-safety-body">Aggregated statistics show verified values compiled from completed platform bookings.</p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="dm-content">
          <div className="dm-header">
            <div>
              <h2>{tabTitle}</h2>
              <p>{tabDesc}</p>
            </div>
            <button className="dm-close" onClick={onClose}>{ICONS.close}</button>
          </div>

          <div className="dm-viewport dm-scroll">
            {tabLoading || loadingData ? (
              <div className="dm-loading"><div className="dm-spinner" /></div>
            ) : (
              <div className="dm-fade">

                {activeTab === "business" && (
                  <div className="dm-business">
                    <div className="dm-profile-card">
                      {[
                        ["Corporate Registry Owner", dealer.ownerName],
                        ["Comms Gateway Address", dealer.ownerEmail],
                        ["Secure Contact Line", dealer.phone],
                        ["Physical Operations Base", dealer.businessAddress],
                        ["Fiscal GST Identifier", dealer.gstNumber || "Unprovided"],
                        ["Current Status Node", dealer.status],
                        ["Genesis Enlistment Date", dealer.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "—"],
                      ].map(([label, value]) => (
                        <div key={label} className="dm-profile-row">
                          <span className="dm-profile-label">{label}</span>
                          <span className="dm-profile-value">
                            {label === "Current Status Node" ? (
                              <span className="dm-status-chip" style={{ background: statusMeta.bg, border: `1px solid ${statusMeta.border}`, color: statusMeta.color }}>{value}</span>
                            ) : value}
                          </span>
                        </div>
                      ))}
                      {dealer.description && <div className="dm-profile-desc">"{dealer.description}"</div>}
                    </div>

                    <div className="dm-actions">
                      {dealer.status === "pending" && (
                        <>
                          <button onClick={() => onAction(dealer, "approved")} className="dm-action-btn dm-approve">{ICONS.check} Authorize Grid Access</button>
                          <button onClick={() => onAction(dealer, "rejected")} className="dm-action-btn dm-reject">Deny Core Profile</button>
                        </>
                      )}
                      {dealer.status === "approved" && (
                        <button onClick={() => onAction(dealer, "suspended")} className="dm-action-btn dm-suspend">Revoke Operational Node Authority</button>
                      )}
                      {dealer.status === "suspended" && (
                        <button onClick={() => onAction(dealer, "approved")} className="dm-action-btn dm-reinstate">Re-Activate Node Operations</button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "documents" && (
                  <div className="dm-doc-panel">
                    <DealerDocuments dealer={dealer} />
                  </div>
                )}

                {activeTab === "fleet" && (
                  dealerCars.length === 0 ? (
                    <div className="dm-empty">No architectural assets mapped to ledger portfolio.</div>
                  ) : (
                    <div className="dm-fleet-grid">
                      {dealerCars.map(car => (
                        <div key={car.id} className="dm-fleet-card">
                          {car.image && <img src={car.image} alt={car.model} />}
                          <div className="dm-fleet-body">
                            <p className="dm-fleet-model">{car.model}</p>
                            <div className="dm-fleet-foot">
                              <p className="dm-fleet-price">${car.price}<span>/day</span></p>
                              <span className="dm-fleet-badge" style={{ background: car.isAvailable ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: car.isAvailable ? "#10b981" : "#ef4444" }}>
                                {car.isAvailable ? "ACTIVE" : "STAGED"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === "bookings" && (
                  dealerBookings.length === 0 ? (
                    <div className="dm-empty">No operational transaction data present.</div>
                  ) : (
                    <div className="dm-booking-list">
                      {dealerBookings.map(b => (
                        <div key={b.id} className="dm-booking-card">
                          <div className="dm-booking-top">
                            <div>
                              <p className="dm-booking-model">{b.carModel}</p>
                              <p className="dm-booking-hash">MUT_HASH_{b.bookingId?.slice(-8).toUpperCase()}</p>
                            </div>
                            <div>
                              <p className="dm-booking-price">${b.total}</p>
                              <p className="dm-booking-status">{b.status}</p>
                            </div>
                          </div>
                          <div className="dm-booking-meta">
                            {[
                              { label: "USER LOG", desc: b.userName || b.userEmail },
                              { label: "ROUTE GAP", desc: `${b.pickup} → ${b.dropoff}` },
                              { label: "TIMELINE", desc: b.pickupDate },
                              { label: "QUANTUM", desc: `${b.days} Days` },
                            ].map((chunk, i) => (
                              <div key={i}>
                                <p className="dm-meta-label">{chunk.label}</p>
                                <p className="dm-meta-value">{chunk.desc || "—"}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === "users" && (
                  dealerUsers.length === 0 ? (
                    <div className="dm-empty">No client maps bound to this operational node's history.</div>
                  ) : (
                    <div className="dm-user-list">
                      {dealerUsers.map(u => (
                        <div key={u.email} className="dm-user-card">
                          <div className="dm-user-avatar">{(u.name || u.email)?.[0]?.toUpperCase()}</div>
                          <div className="dm-user-info">
                            <p className="dm-user-name">{u.name}</p>
                            <p className="dm-user-email">{u.email}</p>
                          </div>
                          <div className="dm-user-stats">
                            <p className="dm-user-count">{u.count} entries</p>
                            <p className="dm-user-revenue">${u.revenue.toLocaleString()} Gross</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function OverviewMetricCard({ card }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="metric-panel"
      style={{
        border: isOpen ? `1px solid ${card.accent}33` : "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "16px",
        boxShadow: isOpen ? `0 20px 40px -10px ${card.accent}10` : "none",
        position: "relative",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        background: isOpen ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.01)"
      }}
      onClick={() => setIsOpen(!isOpen)}
      onMouseEnter={e => { if (!isOpen) e.currentTarget.style.borderColor = card.accent + "33"; }}
      onMouseLeave={e => { if (!isOpen) e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)"; }}
    >
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: card.accent + "12", display: "flex",
              alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}>
              {card.svg}
            </div>
            <h3 style={{ 
              color: "rgba(255,255,255,0.7)", 
              margin: 0, 
              fontSize: "11px", 
              fontWeight: "800", 
              letterSpacing: "1px", 
              textTransform: "uppercase" 
            }}>
              {card.title}
            </h3>
          </div>
          <div className="toggle-indicator" style={{ 
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", 
            display: "flex", 
            alignItems: "center",
            transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", fontWeight: "600" }}>{card.heroLabel}</span>
          <span style={{ color: card.heroColor, fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px" }}>{card.heroValue}</span>
        </div>
      </div>

      <div
        className="sub-drawer"
        style={{
          maxHeight: isOpen ? "160px" : "0px",
          opacity: isOpen ? 1 : 0,
          borderTop: isOpen ? "1px solid rgba(255,255,255,0.04)" : "1px solid transparent",
          background: "rgba(0,0,0,0.12)",
          borderRadius: "0 0 16px 16px",
          overflow: "hidden",
          transition: "max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, padding 0.35s ease"
        }}
      >
        <div style={{ padding: "8px 20px 16px 20px" }}>
          {card.rows.map(([label, value, color]) => (
            <div
              key={label}
              className="sub-row"
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.02)",
                transition: "background 0.2s ease, transform 0.2s ease"
              }}
              onMouseEnter={e => { 
                e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseLeave={e => { 
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12.5px", fontWeight: "500" }}>{label}</span>
              <span style={{ color, fontSize: "13.5px", fontWeight: "700" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionBanner({ gradient, glow, icon, label, title, sub, badge, badgeColor }) {
  return (
    <div style={{
      flexShrink: 0, margin: "0 0 24px",
      background: `linear-gradient(135deg, rgba(255,255,255,0.01), rgba(255,255,255,0.005))`,
      border: "1px solid rgba(255,255,255,0.06)", borderRadius: "18px", overflow: "hidden"
    }}>
      {/* Colored top strip */}
      <div style={{ height: "3px", background: gradient }} />
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "14px", flexShrink: 0,
            background: gradient, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 8px 20px ${glow}`
          }}>
            {icon}
          </div>
          <div>
            <p style={{ margin: "0 0 3px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", color: badgeColor, textTransform: "uppercase", opacity: 0.9 }}>{label}</p>
            <h2 style={{ margin: "0 0 2px", fontSize: "20px", color: "#fff", fontWeight: "800", letterSpacing: "-0.5px" }}>{title}</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "12.5px" }}>{sub}</p>
          </div>
        </div>
        <div style={{
          padding: "5px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "700",
          letterSpacing: "0.5px", color: badgeColor,
          background: `${badgeColor}12`, border: `1px solid ${badgeColor}30`,
          display: "flex", alignItems: "center", gap: "6px", flexShrink: 0
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: badgeColor, display: "inline-block", boxShadow: `0 0 6px ${badgeColor}` }} />
          {badge}
        </div>
      </div>
    </div>
  );
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

// ─── Status filter options (used by the Bookings sidebar IconSelect) ───
const STATUS_OPTIONS = [
  { value: "", label: "All Operational Status", color: "rgba(255,255,255,0.5)", icon: null },
  { value: "pending_approval", label: "Pending Approval", color: "#fbbf24",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>) },
  { value: "dealer_confirmed", label: "Dealer Approved", color: "#38bdf8",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></svg>) },
  { value: "confirmed", label: "Confirmed", color: "#34d399",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="8 12 11 15 16 9" /></svg>) },
  { value: "upcoming_trip", label: "Upcoming Trip", color: "#a78bfa",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>) },
  { value: "pickup_awaited", label: "Pickup Awaited", color: "#60a5fa",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" /><rect x="3" y="11" width="18" height="6" rx="2" /></svg>) },
  { value: "ongoing_trip", label: "Ongoing Trip", color: "#22d3ee",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18" /><path d="M16 6l6 6-6 6" /></svg>) },
  { value: "return_pending", label: "Return Pending", color: "#fb923c",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 1 3 6.7" /><polyline points="3 17 3 21 7 21" /></svg>) },
  { value: "on_hold", label: "On Hold", color: "#facc15",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round"><line x1="9" y1="5" x2="9" y2="19" /><line x1="15" y1="5" x2="15" y2="19" /></svg>) },
  { value: "cancelled", label: "System Cancelled", color: "#f87171",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>) },
  { value: "cancelled_dealer", label: "Cancelled by Dealer", color: "#fb923c",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>) },
  { value: "cancelled_admin", label: "Cancelled by Admin", color: "#ef4444",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>) },
  { value: "cancelled_user", label: "Cancelled by User", color: "#94a3b8",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></svg>) },
  { value: "no_show", label: "No Show", color: "#6b7280",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9c0-2 1.5-3 3-3s3 1 3 3c0 2-3 2.5-3 5" /><circle cx="12" cy="17.5" r="0.6" fill={c} /></svg>) },
  { value: "completed", label: "Journey Completed", color: "#4ade80",
    icon: (c, s = 13) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>) },
];

// ─── Custom dropdown used by the Status filter (options can't render SVGs natively) ───
function IconSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "10px",
          padding: "14px 40px 14px 16px", background: "rgba(255,255,255,0.03)",
          border: open ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px", color: "#fff", fontSize: "13.5px", fontFamily: "Quicksand",
          cursor: "pointer", textAlign: "left", position: "relative",
          boxShadow: open ? "0 0 0 4px rgba(147,51,234,0.15)" : "none",
          transition: "all 0.25s ease"
        }}
      >
        <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {selected.icon ? selected.icon(selected.color, 14) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
            </svg>
          )}
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.label}</span>
        <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: "transform 0.25s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100,
          background: "#13131f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px",
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)", maxHeight: "280px", overflowY: "auto", padding: "6px"
        }}>
          {options.map(opt => (
            <div
              key={opt.value || "all"}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
                borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "Quicksand",
                color: opt.value === value ? "#fff" : "rgba(255,255,255,0.75)",
                background: opt.value === value ? "rgba(147,51,234,0.18)" : "transparent",
                transition: "background 0.15s ease"
              }}
              onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ display: "flex", alignItems: "center", flexShrink: 0, width: "14px" }}>
                {opt.icon ? opt.icon(opt.color, 13) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
                  </svg>
                )}
              </span>
              <span>{opt.label}</span>
              {opt.value === value && (
                <span style={{ marginLeft: "auto" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ADMIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function Admin() {
  const { user, logout, adminRole } = useAuth();
  const navigate = useNavigate();

  const [activeNav, setActiveNav]           = useState("bookings");
  const [tabLoading, setTabLoading]         = useState(false);
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [bookings, setBookings]             = useState([]);
  const [users, setUsers]                   = useState([]);
  const [selectedUser, setSelectedUser]     = useState(null);
  const [userBookings, setUserBookings]     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [searchTerm, setSearchTerm]         = useState("");
  const [filterCar, setFilterCar]           = useState("");
  const [filterDate, setFilterDate]         = useState("");
  const [filterStatus, setFilterStatus]     = useState("");
  const [showAddDealer, setShowAddDealer] = useState(false);
  const [sortBy, setSortBy]                 = useState("newest");
  const [adminModal, setAdminModal]         = useState(null);
  const [adminType, setAdminType]           = useState("");
  const [adminForm, setAdminForm]           = useState({ subject:"", message:"" });
  const [adminLoading, setAdminLoading]     = useState(false);
  const [adminError, setAdminError]         = useState("");
  const [stats, setStats]                   = useState({ revenue:0, monthlyRevenue:0, bookings:0, users:0, avgValue:0, avgDays:0 });
  const [notifications, setNotifications]   = useState([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [approvingId, setApprovingId]       = useState(null);
  const [notification, setNotification]     = useState({ message:"", type:"", visible:false });
  const [reviews, setReviews]               = useState([]);
  const [selectedBookings, setSelectedBookings] = useState(new Set());
  const [selectAllMode, setSelectAllMode]   = useState(false);
  const [dealers, setDealers] = useState([]);
  const [cars, setCars] = useState([]);
  const [emergencyTab, setEmergencyTab] = useState("breakdown");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [isStatsVisible, setIsStatsVisible] = useState(true);
  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showCommission, setShowCommission] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState(null);
  const [locationModalDealer, setLocationModalDealer] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [suspensionModal, setSuspensionModal] = useState(null);
  const [suspensionForm, setSuspensionForm] = useState({ subject: "", reason: "" });
  const [suspensionLoading, setSuspensionLoading] = useState(false);

  const bookingsRef  = useRef(null);
  const isFirstLoad  = useRef(true);
  const [svcOpen, setSvcOpen] = useState(true);
  const [telOpen, setTelOpen] = useState(true);
  const [uptimeOpen, setUptimeOpen] = useState(true);
  const [templateOpen, setTemplateOpen] = useState(true);
  const [templateStatsOpen, setTemplateStatsOpen] = useState(true);
  const [metricsOpen, setMetricsOpen] = useState(true);
  const [filterOpen, setFilterOpen] = useState(true);
  const [fleetOpen, setFleetOpen] = useState(true);
  const [trendsOpen, setTrendsOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(true);
  const [auditOpen, setAuditOpen] = useState(true);
  const [tamperOpen, setTamperOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(true);
  const [adminOnlyOpen, setAdminOnlyOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(true);
  const [dataOpen, setDataOpen] = useState(true);
  const [noteOpen, setNoteOpen] = useState(true);
  const [backupOpen, setBackupOpen] = useState(true);
  const [recoveryOpen, setRecoveryOpen] = useState(true);
  const [retentionOpen, setRetentionOpen] = useState(true);

  // ── Filtered nav from RBAC ────────────────────────────────
  const filteredNav = getFilteredNavItems(adminRole);

  // ─── Pre-flight: classify each booking before touching Firestore ──────────────
const BULK_ACTION_ALLOWED = {
  confirm: (b) => ["pending_approval", "dealer_confirmed", "on_hold"].includes(b.status),
  cancel:  (b) => canAdminAct(b) || b.status === "on_hold",
  hold:    (b) => canAdminAct(b) && b.status !== "on_hold",
};

const BULK_SKIP_REASON = (b, action) => {
  const effKey = getEffectiveStatus(b);
  if (TERMINAL_RED.has(effKey)) {
    return `"${b.carModel}" (#${b.bookingId}) is ${STATUS_MAP[effKey]?.label || effKey} — terminal status, no actions allowed.`;
  }
  if (effKey === "completed") {
    return `"${b.carModel}" (#${b.bookingId}) is already Completed.`;
  }
  if (action === "hold" && b.status === "on_hold") {
    return `"${b.carModel}" (#${b.bookingId}) is already On Hold.`;
  }
  if (action === "confirm" && !["pending_approval", "dealer_confirmed", "on_hold"].includes(b.status)) {
    return `"${b.carModel}" (#${b.bookingId}) has status "${STATUS_MAP[effKey]?.label || effKey}" — cannot confirm.`;
  }
  if ((action === "cancel" || action === "hold") && !isUpcoming(b)) {
    return `"${b.carModel}" (#${b.bookingId}) pickup date has passed — cannot ${action}.`;
  }
  return `"${b.carModel}" (#${b.bookingId}) — action not applicable for current status.`;
};

const handleBulkAction = async (action, reason) => {
  const bookingIds = Array.from(selectedBookings);
  if (bookingIds.length === 0) return;

  // ── Pre-flight pass ────────────────────────────────────────────────────────
  const eligible   = [];
  const skipped    = [];

  for (const bookingId of bookingIds) {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) { skipped.push(`Unknown booking ${bookingId}`); continue; }

    const allowed = BULK_ACTION_ALLOWED[action];
    if (allowed && allowed(booking)) {
      eligible.push(booking);
    } else {
      skipped.push(BULK_SKIP_REASON(booking, action));
    }
  }

  // ── Early exit if nothing eligible ────────────────────────────────────────
  if (eligible.length === 0) {
    const reasons = skipped.slice(0, 3).join("\n");
    const extra   = skipped.length > 3 ? `\n…and ${skipped.length - 3} more.` : "";
    showNotification(
      `Cannot apply "${action}" — no eligible bookings selected.\n${reasons}${extra}`,
      "error"
    );
    setSelectedBookings(new Set());
    setSelectAllMode(false);
    return;
  }

  // ── Confirm with admin if some will be skipped ────────────────────────────
  if (skipped.length > 0) {
    const proceed = window.confirm(
      `${eligible.length} booking(s) will be updated.\n` +
      `${skipped.length} will be skipped:\n\n` +
      skipped.slice(0, 5).join("\n") +
      (skipped.length > 5 ? `\n…and ${skipped.length - 5} more.` : "") +
      `\n\nProceed with ${eligible.length} eligible booking(s)?`
    );
    if (!proceed) return;
  }

  // ── Execute on eligible only ───────────────────────────────────────────────
  let successCount = 0, failCount = 0;

  for (const booking of eligible) {
    try {
      if (action === "confirm") {
        await handleApproveBooking(booking);
        successCount++;
      } else if (action === "cancel") {
        await updateDoc(doc(db, "bookings", booking.id), {
          status: "cancelled",
          cancelledBy: "admin",
          adminActionReason: reason,
          cancelledAt: new Date(),
        });
        successCount++;
      } else if (action === "hold") {
        await updateDoc(doc(db, "bookings", booking.id), {
          status: "on_hold",
          adminActionReason: reason,
          onHoldAt: new Date(),
        });
        successCount++;
      }
    } catch (err) {
      console.error(`Failed ${action} for ${booking.id}:`, err);
      failCount++;
    }
  }

  // ── Result toast ───────────────────────────────────────────────────────────
  const type = successCount > 0 ? "success" : "error";
  const msg  = failCount === 0
    ? `✅ Bulk ${action}: ${successCount} booking(s) updated.`
    : `⚠️ Bulk ${action}: ${successCount} updated, ${failCount} failed (Firestore error).`;

  showNotification(msg, type);
  setSelectedBookings(new Set());
  setSelectAllMode(false);
};

  const handleUserAction = async (u, action, reason="") => {
    try {
      if (action==="suspend") { await updateDoc(doc(db,"users",u.email),{ isActive:false, suspendedAt:new Date(), suspendedReason:reason }); showNotification(`User ${u.email} suspended`); }
      else if (action==="unsuspend") { await updateDoc(doc(db,"users",u.email),{ isActive:true, unsuspendedAt:new Date() }); showNotification(`User ${u.email} reactivated`); }
      else if (action==="delete") { await deleteDoc(doc(db,"users",u.email)); setUsers(users.filter(x=>x.email!==u.email)); showNotification(`User ${u.email} deleted`); }
      else if (action==="make_dealer") { await updateDoc(doc(db,"users",u.email),{ isDealer:true, dealerStatus:"pending", role:"dealer" }); showNotification(`User ${u.email} promoted to dealer (pending approval)`); }
      else if (action==="remove_dealer") { await updateDoc(doc(db,"users",u.email),{ isDealer:false, dealerId:null, dealerStatus:null, role:"user" }); showNotification(`Dealer status removed from ${u.email}`); }
    } catch(err) { showNotification(`Failed to ${action} user`,"error"); }
  };

  const handleLocationUpdate = (updatedDealer) => {
  setDealers(prev => prev.map(d => d.id === updatedDealer.id ? { ...d, ...updatedDealer } : d));
  showNotification(`Locations updated for ${updatedDealer.businessName}`, "success");
};

async function handleDealerAction(dealer, newStatus) {
  if (newStatus === "suspended") {
    setSuspensionModal(dealer);
    setSuspensionForm({ subject: "", reason: "" });
    return;
  }
  setActionLoading(dealer.id);
  try {
    if (newStatus === "approved") {
      await updateDoc(doc(db, "dealers", dealer.id), { status: "approved", isActive: true, approvedAt: new Date(), updatedAt: new Date() });
      await updateDoc(doc(db, "users", dealer.ownerEmail), { isDealer: true, dealerId: dealer.id, dealerStatus: "approved", isActive: true, role: "dealer", updatedAt: new Date() });
      if (user) await logAdminAction(user.uid, user.email, `dealer_${newStatus}`, { dealerId: dealer.id, dealerName: dealer.businessName }, dealer.id, "dealer");
      showNotification(`✅ ${dealer.businessName} approved!`, "success");
    } else if (newStatus === "rejected") {
      await updateDoc(doc(db, "dealers", dealer.id), { status: "rejected", isActive: false, rejectedAt: new Date(), updatedAt: new Date() });
      await updateDoc(doc(db, "users", dealer.ownerEmail), { isDealer: false, dealerStatus: "rejected", dealerId: null, role: "user", updatedAt: new Date() });
      if (user) await logAdminAction(user.uid, user.email, `dealer_${newStatus}`, { dealerId: dealer.id, dealerName: dealer.businessName }, dealer.id, "dealer");
      showNotification(`${dealer.businessName} rejected`, "error");
    }
    setSelectedDealer(null);
  } catch (err) {
    showNotification("Action failed: " + err.message, "error");
  } finally {
    setActionLoading(null);
  }
}

async function confirmSuspension() {
  if (!suspensionForm.subject || !suspensionForm.reason) {
    showNotification("Please fill in both subject and reason", "error");
    return;
  }
  setSuspensionLoading(true);
  const dealer = suspensionModal;
  try {
    await updateDoc(doc(db, "dealers", dealer.id), {
      status: "suspended", isActive: false, suspendedAt: new Date(), suspendedBy: "Admin",
      adminActionSubject: suspensionForm.subject, adminActionReason: suspensionForm.reason, updatedAt: new Date(),
    });
    await updateDoc(doc(db, "users", dealer.ownerEmail), { dealerStatus: "suspended", isActive: false, updatedAt: new Date() });
    showNotification(`🚫 ${dealer.businessName} suspended`, "error");
    setSuspensionModal(null);
    setSuspensionForm({ subject: "", reason: "" });
  } catch (err) {
    showNotification("Suspension failed: " + err.message, "error");
  } finally {
    setSuspensionLoading(false);
  }
}

async function handleDeleteDealer(dealer) {
  if (!window.confirm(`Permanently delete "${dealer.businessName}"?\n\nThis cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, "dealers", dealer.id));
    await updateDoc(doc(db, "users", dealer.ownerEmail), { isDealer: false, dealerStatus: null, dealerId: null, role: "user" });
    showNotification(`${dealer.businessName} deleted`, "error");
  } catch (err) {
    showNotification("Delete failed. Try again.", "error");
  }
}

  function showNotification(message, type="success") {
    setNotification({ message, type, visible:true });
    setTimeout(() => setNotification({ message:"", type:"", visible:false }), 3000);
  }

  async function switchNav(nav) {
  setTabLoading(true);
  setActiveNav(nav);
  setSearchTerm("");
  setFilterCar("");
  setFilterDate("");
  setFilterStatus(nav === "dealers" ? "all" : ""); // Dealers' "no filter" sentinel is "all", not ""
  setSortBy("newest");
  setSearch("");
  setFilterType("all");
  setIsFiltersVisible(true);

  await new Promise(r => setTimeout(r, 350));
  setTabLoading(false);
}

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db,"bookings"), orderBy("createdAt","desc")),
      snap => {
        const data = snap.docs.map(d=>({ id:d.id,...d.data() }));
        if (isFirstLoad.current) {
          isFirstLoad.current = false; bookingsRef.current = data.map(b=>b.id);
          setBookings(data); recalc(data); setLoading(false); return;
        }
        const prev = new Set(bookingsRef.current||[]);
        const newOnes = data.filter(b=>!prev.has(b.id));
        if (newOnes.length>0) {
          const notifs = newOnes.map(b=>({ id:Date.now()+Math.random(), type:"new_booking", carModel:b.carModel, pickup:b.pickup, dropoff:b.dropoff, days:b.days, total:b.total, user:b.userEmail, bookingId:b.bookingId, timestamp:new Date(), read:false }));
          setNotifications(p=>[...notifs,...p]);
          setUnreadCount(p=>p+newOnes.length);
        }
        bookingsRef.current = data.map(b=>b.id);
        setBookings(data); recalc(data); setLoading(false);
      },
      err => { console.error(err); setLoading(false); }
    );
    getDocs(collection(db,"users")).then(s=>setUsers(s.docs.map(d=>({ id:d.id, email:d.id,...d.data() })))).catch(console.error);
    getDocs(collection(db,"reviews")).then(s=>setReviews(s.docs.map(d=>({ id:d.id,...d.data() })))).catch(()=>{});
    getDocs(collection(db,"dealers")).then(s=>setDealers(s.docs.map(d=>({ id:d.id,...d.data() })))).catch(console.error);
    return () => unsub();
  }, []);

  function recalc(data) {
    const now=new Date(), cm=now.getMonth(), cy=now.getFullYear();
    const lm=cm===0?11:cm-1, ly=cm===0?cy-1:cy;
    const cmb=data.filter(b=>{const d=b.createdAt?.toDate();return d&&d.getMonth()===cm&&d.getFullYear()===cy;});
    const lmb=data.filter(b=>{const d=b.createdAt?.toDate();return d&&d.getMonth()===lm&&d.getFullYear()===ly;});
    const cmr=cmb.reduce((s,b)=>s+(b.total||0),0), lmr=lmb.reduce((s,b)=>s+(b.total||0),0);
    const cav=cmb.length>0?cmr/cmb.length:0, lav=lmb.length>0?lmr/lmb.length:0;
    setStats({ revenue:lmr===0?100:((cmr-lmr)/lmr)*100, monthlyRevenue:lmr===0?100:((cmr-lmr)/lmr)*100, bookings:lmb.length===0?100:((data.length-lmb.length)/lmb.length)*100, users:0, avgValue:lav===0?100:((cav-lav)/lav)*100, avgDays:0 });
  }

  async function handleAdminAction() {
    if (!adminForm.subject||!adminForm.message) { setAdminError("Please fill in both fields."); return; }
    setAdminLoading(true); setAdminError("");
    try {
      const isReject=adminType==="reject", isCancel=adminType==="cancel";
      const ns = isReject||isCancel ? "cancelled" : "on_hold";
      await updateDoc(doc(db,"bookings",adminModal.id),{ status:ns, adminActionAt:new Date(), adminActionReason:adminForm.message, adminActionSubject:adminForm.subject, ...(isCancel||isReject?{cancelledBy:"admin"}:{}) });
      if (isReject) {
        await sendRejectionEmail({ name:adminModal.userName||adminModal.userEmail, email:adminModal.userEmail, carModel:adminModal.carModel, pickup:adminModal.pickup, dropoff:adminModal.dropoff, days:adminModal.days, total:adminModal.total, bookingId:adminModal.bookingId, reason:adminForm.message, currency:adminModal.currency||"USD", currencySymbol:adminModal.currencySymbol||"$" });
      } else {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_RECEIPT_ID, { email:adminModal.userEmail, email_subject:adminForm.subject, header_color:isCancel?"linear-gradient(135deg,#7f0000,#ff4d4d)":"linear-gradient(135deg,#7f4a00,#ffa500)", header_subtitle:isCancel?"Booking Cancelled":"Booking On Hold", email_icon:isCancel?"❌":"⏸️", greeting:`Hi, ${adminModal.userName||adminModal.userEmail}!`, email_subtitle:adminForm.subject, admin_message:adminForm.message, admin_message_bg:isCancel?"#fff5f5":"#fffbf0", admin_message_border:isCancel?"4px solid #ff4d4d":"4px solid #ffa500", admin_message_padding:"20px 24px", admin_message_margin:"0 0 24px", details_title:"Booking Details", car_model:adminModal.carModel, pickup:adminModal.pickup, dropoff:adminModal.dropoff, date_label:"Pickup Date", date_value:adminModal.pickupDate||adminModal.date, extra_label:"📅 Return Date", extra_value:adminModal.dropoffDate||"—", amount_label:"Total", total:`${adminModal.currencySymbol||"$"}${adminModal.total} ${adminModal.currency||"USD"}`, addons_display:"none", addons:"", days:"", car_total:"", addons_total:"", footer_message:"Contact us at support@quickwheels.com", booking_id:adminModal.bookingId }, EMAILJS_PUBLIC_KEY);
      }
      const upd = { ...adminModal, status:ns, ...(isCancel||isReject?{cancelledBy:"admin"}:{}), adminActionReason:adminForm.message };
      setBookings(p=>p.map(b=>b.id===adminModal.id?upd:b));
      setUserBookings(p=>p.map(b=>b.id===adminModal.id?upd:b));
      setAdminModal(null); setAdminForm({ subject:"", message:"" }); setAdminType("");
      showNotification(isReject?"❌ Booking rejected and email sent!":isCancel?"🚫 Booking cancelled and email sent!":"⏸ Booking suspended and email sent!");
    } catch(e) { console.error(e); setAdminError("Failed. Please try again."); }
    setAdminLoading(false);
  }

  async function handleApproveBooking(booking) {
    if (!["pending_approval", "dealer_confirmed", "on_hold"].includes(booking.status)) return;
    if (approvingId===booking.id) return;
    setApprovingId(booking.id);
    try {
      await updateDoc(doc(db,"bookings",booking.id),{ status:"confirmed", approvedAt:new Date(), approvedByAdmin:true });
      createPaymentRecord({ ...booking, status: "confirmed" }).catch(err => console.error("Payment record creation failed:", err));
      if (user) await logAdminAction(user.uid,user.email,"booking_approved",{ bookingId:booking.id, carModel:booking.carModel },booking.id,"booking");
      await sendApprovalEmail({ name:booking.userName||booking.userEmail, email:booking.userEmail, carModel:booking.carModel, pickup:booking.pickup, dropoff:booking.dropoff, days:booking.days, tripType:booking.tripType||"One Way", carTotal:booking.carTotal||booking.total, addonsTotal:booking.addonsTotal||0, total:booking.total, bookingId:booking.bookingId, addons:booking.addons||[], currency:booking.currency||"USD", currencySymbol:booking.currencySymbol||"$" });
      showNotification("✅ Booking approved and email sent!");
      const updatedBooking = { ...booking, status:"confirmed", approvedAt:new Date(), approvedByAdmin:true };
      setBookings(p=>p.map(b=>b.id===booking.id?updatedBooking:b));
      setUserBookings(p=>p.map(b=>b.id===booking.id?updatedBooking:b));
    } catch(err) { console.error("Approve error:",err); showNotification("❌ Failed to approve booking","error"); }
    finally { setApprovingId(null); }
  }

 const toggleSelectAll = () => {
  // If any are selected (whether from manual or bulk), clear all
  if (selectedBookings.size > 0) {
    setSelectedBookings(new Set());
    setSelectAllMode(false);
    return;
  }
  // Otherwise select all eligible
  const newSelected = new Set();
  sorted.forEach(b => {
    const hasAnyAction =
      BULK_ACTION_ALLOWED.confirm(b) ||
      BULK_ACTION_ALLOWED.cancel(b)  ||
      BULK_ACTION_ALLOWED.hold(b);
    if (hasAnyAction) newSelected.add(b.id);
  });

  if (newSelected.size === 0) {
    showNotification("No bookings on this page have eligible bulk actions.", "error");
    return;
  }
  setSelectedBookings(newSelected);
  setSelectAllMode(true);
};

  const toggleSelectOne = (id, checked) => {
    const newSelected = new Set(selectedBookings);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedBookings(newSelected);
    // Auto-exit selectAllMode label if user manually deselects down to zero
    if (newSelected.size === 0) setSelectAllMode(false);
  };

  async function viewUserBookings(u, mode = "customer") {
  setSelectedUser(u); setLoading(true);
  setSearchTerm(""); setFilterCar(""); setFilterDate(""); setFilterStatus(""); setSortBy("newest");
    try {
      let merged = [];
      if (mode === "dealer") {
        // Bookings made THROUGH this dealer, not bookings this dealer made as a customer
        const dealerKey = u.dealerId || u.id;
        const s = await getDocs(query(collection(db, "bookings"), where("dealerId", "==", dealerKey)));
        merged = s.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        let all = [];
        if (u.uid) { const s=await getDocs(query(collection(db,"bookings"),where("userId","==",u.uid))); all=s.docs.map(d=>({ id:d.id,...d.data() })); }
        const s2=await getDocs(query(collection(db,"bookings"),where("userEmail","==",u.email)));
        merged=[...all,...s2.docs.map(d=>({ id:d.id,...d.data() }))];
      }
      setUserBookings(merged.filter((b,i,a)=>i===a.findIndex(x=>x.id===b.id)));
      switchNav("userBookings");
    } catch(e) { console.error(e); setUserBookings([]); }
    finally { setLoading(false); }
  }

  function downloadReceipt(booking) {
    const d=new jsPDF();
    d.setFillColor(4,0,255); d.rect(0,0,210,30,"F");
    d.setTextColor(255,255,255); d.setFontSize(20); d.setFont("helvetica","bold");
    d.text("QuickWheels",20,18); d.setFontSize(10); d.text("Booking Receipt",150,18);
    d.setTextColor(0,0,0); d.setFontSize(12); d.setFont("helvetica","bold");
    d.text(`Booking ID: ${booking.bookingId}`,20,45); d.text(`Date: ${booking.date}`,20,55);
    d.setDrawColor(4,0,255); d.line(20,62,190,62);
    [["Vehicle:",booking.carModel],["Pickup:",booking.pickup],["Drop-off:",booking.dropoff],["Duration:",`${booking.days} days`]].forEach(([l,v],i)=>{
      d.setFont("helvetica","normal"); d.setFontSize(11); d.text(l,20,75+13*i); d.setFont("helvetica","bold"); d.text(String(v||""),80,75+13*i);
    });
    d.setDrawColor(200,200,200); d.line(20,125,190,125);
    d.setFont("helvetica","bold"); d.setFontSize(13); d.text("Total Amount:",20,140);
    d.setTextColor(4,0,255); d.text(`$${booking.total} USD`,80,140);
    d.setTextColor(150,150,150); d.setFontSize(9); d.setFont("helvetica","normal");
    d.text("Thank you for choosing QuickWheels!",20,270); d.text("For support: support@quickwheels.com",20,278);
    d.save(`QuickWheels-Receipt-${booking.bookingId}.pdf`);
  }

  const totalRevenue   = bookings.reduce((s,b)=>s+(b.total||0),0);
  const monthlyRevenue = bookings.filter(b=>{ const d=b.createdAt?.toDate(),n=new Date(); return d&&d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); }).reduce((s,b)=>s+(b.total||0),0);
  const popularCars      = Object.entries(bookings.reduce((a,b)=>{ a[b.carModel]=(a[b.carModel]||0)+1; return a; },{})).sort((a,b)=>b[1]-a[1]);
  const popularLocations = Object.entries(bookings.reduce((a,b)=>{ a[b.pickup]=(a[b.pickup]||0)+1; return a; },{})).sort((a,b)=>b[1]-a[1]);
  const avgVal = bookings.length>0?totalRevenue/bookings.length:0;
  const avgDur = bookings.length>0?bookings.reduce((s,b)=>s+(b.days||0),0)/bookings.length:0;
  const uniqueDates = [...new Set(bookings.map(b=>b.date).filter(Boolean))].sort();

  const filtered = bookings.filter(b => {
    const s = searchTerm.toLowerCase();
    return (!searchTerm||b.carModel?.toLowerCase().includes(s)||b.bookingId?.toLowerCase().includes(s)||b.pickup?.toLowerCase().includes(s)||b.userEmail?.toLowerCase().includes(s)) && (!filterCar||b.carModel?.toLowerCase().includes(filterCar.toLowerCase())) && (!filterDate||b.date===filterDate) && (!filterStatus||b.status===filterStatus||(filterStatus==="cancelled_dealer"&&b.status==="cancelled"&&b.cancelledBy==="dealer")||(filterStatus==="cancelled_admin"&&b.status==="cancelled"&&b.cancelledBy==="admin")||(filterStatus==="cancelled_user"&&b.status==="cancelled"&&b.cancelledBy==="user"));
  });
  const sorted = [...filtered].sort((a,b) => {
  if (sortBy==="newest") return new Date(b.createdAt?.toDate())-new Date(a.createdAt?.toDate());
  if (sortBy==="oldest") return new Date(a.createdAt?.toDate())-new Date(b.createdAt?.toDate());
  if (sortBy==="priceHigh") return (b.total||0)-(a.total||0);
  if (sortBy==="priceLow")  return (a.total||0)-(b.total||0);
  if (sortBy==="daysHigh")  return (b.days||0)-(a.days||0);
  return 0;
});

// ── Filtered/sorted view for the userBookings (user OR dealer) panel ──
const filteredUserBookings = userBookings.filter(b => {
  const s = searchTerm.toLowerCase();
  return (!searchTerm||b.carModel?.toLowerCase().includes(s)||b.bookingId?.toLowerCase().includes(s)||b.pickup?.toLowerCase().includes(s)||b.userEmail?.toLowerCase().includes(s))
    && (!filterCar||b.carModel?.toLowerCase().includes(filterCar.toLowerCase()))
    && (!filterDate||b.date===filterDate)
    && (!filterStatus||b.status===filterStatus||(filterStatus==="cancelled_dealer"&&b.status==="cancelled"&&b.cancelledBy==="dealer")||(filterStatus==="cancelled_admin"&&b.status==="cancelled"&&b.cancelledBy==="admin")||(filterStatus==="cancelled_user"&&b.status==="cancelled"&&b.cancelledBy==="user"));
});
const sortedUserBookings = [...filteredUserBookings].sort((a,b) => {
  if (sortBy==="newest") return new Date(b.createdAt?.toDate())-new Date(a.createdAt?.toDate());
  if (sortBy==="oldest") return new Date(a.createdAt?.toDate())-new Date(b.createdAt?.toDate());
  if (sortBy==="priceHigh") return (b.total||0)-(a.total||0);
  if (sortBy==="priceLow")  return (a.total||0)-(b.total||0);
  if (sortBy==="daysHigh")  return (b.days||0)-(a.days||0);
  return 0;
});
const userBookingsUniqueDates = [...new Set(userBookings.map(b=>b.date).filter(Boolean))].sort();

  const PAGE_TITLES = {
    bookings:"All Bookings", users:"Users", userBookings:selectedUser?.email||"",
    notifications:"Notifications", overview:"Overview", cars:"Car Analytics",
    locations:"Location Analytics", trends:"Trends & Insights", reviews:"Reviews",
    emergency:"Emergency Dashboard", system:"System Monitoring", templates:"Email Templates",
    audit_logs:"Audit Logs", admin_settings:"Admin Settings",
  };

  const iS = sidebarOpen ? "250px" : "90px";

  function NavItem({ item }) {
    const isActive = activeNav===item.id||(item.id==="users"&&activeNav==="userBookings");
    return (
      <button
        onClick={() => {
          if (item.id==="notifications") { setUnreadCount(0); setNotifications(p=>p.map(n=>({...n,read:true}))); }
          switchNav(item.id); setMobileSidebarOpen(false);
        }}
        style={{ display:"flex", alignItems:"center", gap:"14px", width:"100%", padding:"12px 16px", borderRadius:"14px", border:"none", cursor:"pointer", fontFamily:"Quicksand,sans-serif", fontSize:"14px", fontWeight:isActive?"700":"500", color:isActive?"#fff":"rgba(255,255,255,0.45)", background:isActive?"linear-gradient(90deg,rgba(147,51,234,0.14),rgba(147,51,234,0.02))":"transparent", boxShadow:isActive?"inset 3px 0 0 #9333ea":"none", transition:"all 0.25s", marginBottom:"4px", textAlign:"left", position:"relative", boxSizing:"border-box", overflow:"hidden" }}
        onMouseEnter={e=>{ if(!isActive){e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color="rgba(255,255,255,0.8)";e.currentTarget.style.transform="translateX(4px)";} }}
        onMouseLeave={e=>{ if(!isActive){e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.45)";e.currentTarget.style.transform="translateX(0px)";} }}
      >
        <span style={{ fontSize:"18px", flexShrink:0, width:"24px", textAlign:"center", filter:isActive?"drop-shadow(0 0 8px rgba(147,51,234,0.55))":"none", color:isActive?"#9333ea":"inherit" }}>{item.icon}</span>
        {sidebarOpen && (
          <div style={{ display:"flex", alignItems:"center", flex:1, justifyContent:"space-between" }}>
            <span style={{ whiteSpace:"nowrap" }}>{item.label}</span>
            {item.badge>0 && <span style={{ background:"#ff4d4d", color:"#fff", borderRadius:"8px", minWidth:"18px", height:"18px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", fontWeight:"900", padding:"0 4px" }}>{item.badge>9?"9+":item.badge}</span>}
          </div>
        )}
        {!sidebarOpen&&item.badge>0 && <span style={{ position:"absolute", top:"8px", right:"8px", background:"#ff4d4d", borderRadius:"50%", width:"12px", height:"12px", border:"2px solid #0c0c16" }} />}
        {isActive && <div style={{ position:"absolute", left:0, top:"20%", bottom:"20%", width:"4px", background:"#9333ea", borderRadius:"0 4px 4px 0", boxShadow:"0 0 15px #9333ea" }} />}
      </button>
    );
  }

  function BookingCard({ booking, showUser=true, isSelected=false, onSelect=null }) {
    const [noteExpanded, setNoteExpanded] = useState(false);
    const effKey   = getEffectiveStatus(booking);
    const sc       = STATUS_MAP[effKey]||STATUS_MAP.confirmed;
    const isPending   = (booking.status==="pending_approval"||booking.status==="dealer_confirmed")&&booking.status!=="cancelled";
    const isTerminal  = TERMINAL_RED.has(effKey)||effKey==="completed";
    const isActive    = canAdminAct(booking)&&!isPending&&!isTerminal;
    const hasNote     = !!booking.adminActionReason||!!booking.dealerActionReason;
    const noteText    = booking.adminActionReason||booking.dealerActionReason||"";
    const noteTrunc   = noteText.length>80;

    return (
      <div className="admin-booking-card" style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.07)", borderLeft:`3px solid ${sc.color}`, borderRadius:"14px", padding:"16px 20px", transition:"all 0.25s ease", position:"relative", ...(isSelected&&{background:"rgba(147,51,234,0.06)",borderColor:"#9333ea"}) }}
        onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.045)";e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.25)";}}
        onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.025)";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}
      >
        {onSelect && (
          <div style={{ position: "absolute", top: "16px", left: "16px", zIndex: 5 }}>
            <label
              className="ios-checkbox"
              onClick={e => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={e => {
                  e.stopPropagation();
                  onSelect(booking.id, e.target.checked);
                }}
              />
              <div className="checkbox-wrapper">
                <div className="checkbox-bg" />
                <svg
                  className="checkbox-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    className="check-path"
                    d="M4 12L10 18L20 6"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </label>
          </div>
        )}
        <div style={{ marginLeft:onSelect?"28px":"0" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"12px" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"3px" }}>
                <h4 style={{ margin:0, color:"#fff", fontSize:"15px", fontWeight:"700" }}>{booking.carModel}</h4>
                <span className="booking-card-status-badge">
                  <StatusBadge booking={booking} />
                </span>
                {isPending && <PendingCountdown booking={booking} />}
              </div>
              <p style={{ margin:0, color:"rgba(255,255,255,0.28)", fontSize:"11px", fontFamily:"monospace" }}>#{booking.bookingId}</p>
              {booking.dealerBusinessName && (
                <p style={{ margin:"2px 0 0", color:"rgba(168,85,247,0.7)", fontSize:"11px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <line x1="9" y1="22" x2="9" y2="16" />
                    <line x1="15" y1="22" x2="15" y2="16" />
                    <line x1="9" y1="16" x2="15" y2="16" />
                    <path d="M8 6h8M8 10h8" />
                  </svg>
                  {booking.dealerBusinessName}
                </p>
              )}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
              <div style={{ textAlign:"right" }}>
                <p style={{ margin:0, color:totalColor(effKey), fontWeight:"800", fontSize:"17px", lineHeight:1 }}>${booking.total?.toLocaleString()}</p>
                <p style={{ margin:"2px 0 0", color:"rgba(255,255,255,0.28)", fontSize:"9px", fontWeight:"700", letterSpacing:"0.05em" }}>TOTAL</p>
              </div>
              <button className="booking-receipt-btn" onClick={() => downloadReceipt(booking)} style={{ background:"rgba(147,51,234,0.08)", border:"1px solid rgba(147,51,234,0.25)", borderRadius:"7px", padding:"6px 12px", cursor:"pointer", color:"#a855f7", fontSize:"11px", fontFamily:"Quicksand", fontWeight:"700" }}>RECEIPT</button>
            </div>
          </div>
          <div className="booking-card-meta-grid" style={{ display:"grid", gridTemplateColumns:showUser?"1fr 1fr 1fr":"1fr 1fr", gap:"8px", padding:"10px 0", borderTop:"1px solid rgba(255,255,255,0.05)", borderBottom:"1px solid rgba(255,255,255,0.05)", marginBottom:"12px" }}>
            <div>
              <p style={{ margin:"0 0 2px", color:"rgba(255,255,255,0.28)", fontSize:"9px", fontWeight:"700", letterSpacing:"0.08em" }}>ROUTE</p>
              <span style={{ color:"rgba(255,255,255,0.75)", fontSize:"12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {booking.pickup} → {booking.dropoff}
              </span>
            </div>
            <div>
              <p style={{ margin:"0 0 2px", color:"rgba(255,255,255,0.28)", fontSize:"9px", fontWeight:"700", letterSpacing:"0.08em" }}>DATES</p>
              <span style={{ color:"rgba(255,255,255,0.75)", fontSize:"12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {booking.pickupDate||booking.date} · {booking.days}d
              </span>
            </div>
            {showUser && (
              <div>
                <p style={{ margin:"0 0 2px", color:"rgba(255,255,255,0.28)", fontSize:"9px", fontWeight:"700", letterSpacing:"0.08em" }}>CUSTOMER</p>
                <span style={{ color:"#a855f7", fontSize:"12px", fontWeight:"600", display: "flex", alignItems: "center", gap: "4px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {booking.userEmail}
                </span>
              </div>
            )}
          </div>
          {hasNote && (
            <div style={{ padding:"8px 12px", background:TERMINAL_RED.has(effKey)?"rgba(239,68,68,0.06)":"rgba(245,158,11,0.06)", border:`1px solid ${TERMINAL_RED.has(effKey)?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.15)"}`, borderRadius:"8px", marginBottom:"10px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"8px" }}>
                <p style={{ margin:0, fontSize:"11px", color:"rgba(255,255,255,0.55)", lineHeight:"1.5", flex:1 }}>
                  <span style={{ color:TERMINAL_RED.has(effKey)?"#ef4444":"#f59e0b", fontWeight:"700" }}>{booking.cancelledBy?`Cancelled by ${booking.cancelledBy}: `:"Note: "}</span>
                  {noteTrunc&&!noteExpanded?noteText.slice(0,80)+"…":noteText}
                </p>
                {noteTrunc && <button onClick={() => setNoteExpanded(p=>!p)} style={{ background:"none", border:"none", cursor:"pointer", color:TERMINAL_RED.has(effKey)?"#ef4444":"#f59e0b", fontSize:"10px", fontWeight:"700", padding:0, flexShrink:0 }}>{noteExpanded?"Show less":"Read more"}</button>}
              </div>
            </div>
          )}
          {isPending && (
            <div className="booking-card-actions" style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
              <PermissionGuard permission={PERMISSIONS.APPROVE_BOOKING}>
                <button onClick={() => handleApproveBooking(booking)} disabled={approvingId===booking.id} style={{ padding:"7px 16px", borderRadius:"8px", background:approvingId===booking.id?"rgba(34,197,94,0.08)":"rgba(34,197,94,0.14)", border:"1px solid rgba(34,197,94,0.38)", color:"#22c55e", cursor:approvingId===booking.id?"not-allowed":"pointer", fontFamily:"Quicksand,sans-serif", fontWeight:"700", fontSize:"11px", opacity:approvingId===booking.id?0.6:1, display: "flex", alignItems: "center", gap: "6px" }}>
                  {approvingId===booking.id ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {approvingId===booking.id?"Approving…":booking.status==="dealer_confirmed"?"Final Confirm & Email":"Approve"}
                </button>
                <button onClick={() => { setAdminModal(booking); setAdminType("reject"); setAdminForm({ subject:"", message:"" }); }} style={{ padding:"7px 16px", borderRadius:"8px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.32)", color:"#ef4444", cursor:"pointer", fontFamily:"Quicksand,sans-serif", fontWeight:"700", fontSize:"11px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Reject
                </button>
              </PermissionGuard>
            </div>
          )}
          {isActive && (
            <div className="booking-card-actions" style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
              {booking.status!=="on_hold" && (
                <PermissionGuard permission={PERMISSIONS.SUSPEND_BOOKING}>
                  <button onClick={() => { setAdminModal(booking); setAdminType("hold"); setAdminForm({ subject:"", message:"" }); }} style={{ padding:"7px 14px", borderRadius:"8px", background:"transparent", border:"1px solid rgba(245,158,11,0.35)", color:"#f59e0b", cursor:"pointer", fontSize:"11px", fontFamily:"Quicksand", fontWeight:"700", display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="10" y1="4" x2="10" y2="20" />
                      <line x1="14" y1="4" x2="14" y2="20" />
                    </svg>
                    Suspend
                  </button>
                </PermissionGuard>
              )}
              <PermissionGuard permission={PERMISSIONS.CANCEL_BOOKING}>
                <button onClick={() => { setAdminModal(booking); setAdminType("cancel"); setAdminForm({ subject:"", message:"" }); }} style={{ padding:"7px 14px", borderRadius:"8px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.32)", color:"#ef4444", cursor:"pointer", fontSize:"11px", fontFamily:"Quicksand", fontWeight:"700", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  Cancel
                </button>
              </PermissionGuard>
            </div>
          )}
        </div>
      </div>
    );
  }

function CarAnalyticsSection({ bookings, dealers }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("revenue");
  const [fleetOpen, setFleetOpen] = useState(true);
  const [filterOpen, setFilterOpen] = useState(true);

  return (
    <div
      className="admin-split-layout"
      style={{
        display: "flex", height: "100%", gap: "32px",
        padding: "20px 30px 20px 0px",
        color: "#f8fafc",
        fontFamily: "'Quicksand', -apple-system, sans-serif",
        animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)"
      }}
    >
      <style>{`
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes barPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  .ca-scroll::-webkit-scrollbar { width: 6px; }
  .ca-scroll::-webkit-scrollbar-track { background: transparent; }
  .ca-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  .ca-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
  
  /* Glass morphism sidebar */
  .fleet-sidebar {
    background: rgba(10, 10, 20, 0.3) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
  }
  
  .fleet-sidebar-header {
    background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
  }
  
  /* Glass morphism for car cards */
  .car-card {
    background: rgba(255, 255, 255, 0.03) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 14px !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
    overflow: hidden !important;
  }
  .car-card:hover {
    background: rgba(255, 255, 255, 0.06) !important;
    transform: translateY(-2px) !important;
    border-color: rgba(14, 165, 233, 0.3) !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 0 20px rgba(14, 165, 233, 0.05) !important;
  }
  
  /* Glass morphism for fleet stat cards */
  .fleet-stat-card {
    background: rgba(255, 255, 255, 0.03) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 14px !important;
    padding: 16px !important;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
    cursor: default !important;
  }
  .fleet-stat-card:hover {
    background: rgba(255, 255, 255, 0.06) !important;
    transform: translateY(-2px) !important;
    border-color: rgba(14, 165, 233, 0.3) !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 0 20px rgba(14, 165, 233, 0.05) !important;
  }
  
  /* Performance tier items with glass */
  .performance-tier-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-left: 3px solid var(--tier-color);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .performance-tier-item:hover {
    background: rgba(255, 255, 255, 0.04);
    transform: translateX(4px);
    border-color: var(--tier-color);
  }
  
  .tier-bar {
    height: 4px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.07);
    overflow: hidden;
    flex: 1;
  }
  .tier-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    animation: barPulse 2s ease-in-out infinite;
  }
  
  /* Mobile responsive styles */
  @media (max-width: 768px) {
    .admin-split-layout {
      flex-direction: column !important;
      gap: 12px !important;
      padding: 0 !important;
    }
    .admin-split-layout > div:first-child {
      flex: 0 0 auto !important;
      width: 100% !important;
      position: relative !important;
      height: auto !important;
      max-height: 400px !important;
      overflow-y: auto !important;
      padding: 12px !important;
    }
    .admin-content-area {
      flex: 1 !important;
      width: 100% !important;
      padding: 0 4px !important;
    }
    
    .fleet-stat-grid {
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 6px !important;
      margin-bottom: 16px !important;
    }
    .fleet-stat-grid > div {
      padding: 10px 6px !important;
      border-radius: 10px !important;
    }
    .fleet-stat-grid > div > div:first-child {
      margin-bottom: 4px !important;
    }
    .fleet-stat-grid > div > div:first-child svg {
      width: 14px !important;
      height: 14px !important;
    }
    .fleet-stat-grid > div p:first-child {
      font-size: 1rem !important;
      margin: 0 !important;
    }
    .fleet-stat-grid > div p:last-child {
      font-size: 8px !important;
      margin: 2px 0 0 !important;
    }
    
    .fleet-alert {
      padding: 8px 12px !important;
      margin-bottom: 24px !important;
      border-radius: 10px !important;
      gap: 6px !important;
    }
    .fleet-alert svg {
      width: 14px !important;
      height: 14px !important;
    }
    .fleet-alert p {
      font-size: 11px !important;
      line-height: 1.4 !important;
    }
    
    .car-card-row {
      flex-wrap: wrap !important;
      gap: 10px !important;
      padding: 12px 14px !important;
    }
    .car-rank {
      width: 28px !important;
      height: 28px !important;
      font-size: 11px !important;
    }
    .car-thumbnail {
      width: 44px !important;
      height: 32px !important;
    }
    .car-model {
      font-size: 12px !important;
    }
    .car-dealer {
      font-size: 9px !important;
      flex-wrap: wrap !important;
      gap: 4px !important;
    }
    .car-dealer span {
      font-size: 9px !important;
    }
    .car-utilization {
      width: 100% !important;
      flex: 1 !important;
      min-width: 80px !important;
    }
    .car-utilization > div:first-child span:first-child {
      font-size: 8px !important;
    }
    .car-utilization > div:first-child span:last-child {
      font-size: 10px !important;
    }
    .car-revenue p:first-child {
      font-size: 14px !important;
    }
    .car-revenue p:last-child {
      font-size: 9px !important;
    }
    .car-expand {
      margin-left: auto !important;
    }
    
    .car-details > div {
      grid-template-columns: 1fr !important;
      gap: 8px !important;
    }
    .car-details {
      padding: 0 12px 14px !important;
    }
    
    .car-details > div > div {
      padding: 10px !important;
    }
    .car-details > div > div p:first-child {
      font-size: 9px !important;
      margin-bottom: 6px !important;
    }
    .car-details > div > div > div span:first-child {
      font-size: 10px !important;
    }
    .car-details > div > div > div span:last-child {
      font-size: 11px !important;
    }
    
    .car-details > div:last-child {
      margin-top: 10px !important;
    }
    .car-details > div:last-child > div {
      padding: 8px 12px !important;
      font-size: 10px !important;
    }
    .car-details > div:last-child > div p {
      font-size: 10px !important;
    }
    
    .admin-section-header {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 6px !important;
      padding-bottom: 10px !important;
      margin-bottom: 10px !important;
    }
    .admin-section-header h2 {
      font-size: 18px !important;
    }
    .admin-section-header p {
      font-size: 11px !important;
    }
    .admin-section-header-badge {
      font-size: 8px !important;
    }
    .admin-section-header-badge span:last-child {
      font-size: 8px !important;
    }
    .car-analytics-container .fleet-stat-grid {
      grid-template-columns: repeat(3, 1fr) !important;
    }
  }
  
  @media (max-width: 480px) {
    .fleet-stat-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 4px !important;
    }
    .fleet-stat-grid > div {
      padding: 8px 4px !important;
    }
    .fleet-stat-grid > div > div:first-child svg {
      width: 12px !important;
      height: 12px !important;
    }
    .fleet-stat-grid > div p:first-child {
      font-size: 0.85rem !important;
    }
    .fleet-stat-grid > div p:last-child {
      font-size: 7px !important;
    }
    
    .fleet-alert {
      padding: 6px 10px !important;
      margin-bottom: 20px !important;
    }
    .fleet-alert p {
      font-size: 10px !important;
    }
    .fleet-alert svg {
      width: 12px !important;
      height: 12px !important;
    }
    
    .car-card-row {
      padding: 10px 12px !important;
      gap: 8px !important;
    }
    .car-rank {
      width: 24px !important;
      height: 24px !important;
      font-size: 10px !important;
    }
    .car-thumbnail {
      width: 36px !important;
      height: 26px !important;
    }
    .car-model {
      font-size: 11px !important;
    }
    .car-revenue p:first-child {
      font-size: 12px !important;
    }
    
    .admin-section-header h2 {
      font-size: 16px !important;
    }
    .admin-section-header p {
      font-size: 10px !important;
    }
    .car-analytics-container .fleet-stat-grid {
      grid-template-columns: repeat(3, 1fr) !important;
    }
  }
      `}</style>

      {/* LEFT SIDEBAR — 22% - STICKY - WITH GLASS MORPHISM */}
      <div
        className="fleet-sidebar"
        style={{
          display: "grid",
          gridTemplateRows: "auto 1fr",
          height: "calc(100vh - 80px)",
          position: "sticky",
          top: 0,
          overflow: "hidden",
          paddingRight: "4px",
          flex: "0 0 22%",
          zIndex: 100
        }}
      >
        {/* STICKY HEADER - WITH GLASS MORPHISM */}
        <div className="fleet-sidebar-header" style={{
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink: 0
        }}>
          {/* FLEET: Sky / Ocean Blue Core Card - UNCHANGED */}
          <div style={{
            background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
            padding: "16px", borderRadius: "16px", color: "#fff",
            boxShadow: "0 8px 24px rgba(14,165,233,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "12px"
          }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>FLEET ASSETS</p>
              <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>Fleet Analytics</p>
              <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Vehicle utilization engine</p>
            </div>
            <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2" ry="2"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT - WITH GLASS MORPHISM */}
        <div className="ca-scroll" style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingTop: "4px", background: "transparent" }}>

          {/* ── FILTER & SORT — COLLAPSIBLE ── */}
          <div style={{ marginBottom: "12px" }}>
            <button
              onClick={() => setFilterOpen(p => !p)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "9px 12px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: filterOpen ? "12px 12px 0 0" : "12px",
                color: "rgba(255,255,255,0.5)", cursor: "pointer",
                fontFamily: "inherit", fontSize: "11px", fontWeight: "700",
                letterSpacing: "1.5px", textTransform: "uppercase",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(14,165,233,0.06)";
                e.currentTarget.style.borderColor = "rgba(14,165,233,0.2)";
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={e => {
                if (!filterOpen) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                }
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                FILTER & SORT
              </span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: filterOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div style={{
              maxHeight: filterOpen ? "300px" : "0px",
              overflow: "hidden",
              transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
              background: "rgba(255,255,255,0.02)",
              border: filterOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
              borderTop: "none",
              borderRadius: "0 0 12px 12px"
            }}>
              <div style={{ padding: "8px 12px 10px" }}>
                {/* Search */}
                <div style={{ position: "relative", marginBottom: "10px" }}>
                  <span style={{
                    position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
                    opacity: 0.4, display: "flex", alignItems: "center", pointerEvents: "none"
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </span>
                  <input
                    placeholder="Search model or dealer..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: "100%", fontFamily: "inherit", boxSizing: "border-box",
                      padding: "10px 12px 10px 36px",
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "10px", color: "#fff", fontSize: "12px", outline: "none",
                      transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)"
                    }}
                    onFocus={e => { e.target.style.borderColor = "#0ea5e9"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
                  />
                </div>

                {/* Sort select */}
                <div style={{ position: "relative", marginBottom: "10px" }}>
                  <span style={{
                    position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
                    zIndex: 1, opacity: 0.4, display: "flex", alignItems: "center", pointerEvents: "none"
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                  </span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    style={{
                      width: "100%", fontFamily: "inherit", boxSizing: "border-box",
                      padding: "10px 36px 10px 36px",
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "10px", color: "#fff", fontSize: "12px",
                      cursor: "pointer", outline: "none", appearance: "none"
                    }}
                    onFocus={e => e.target.style.borderColor = "#0ea5e9"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  >
                    <option value="revenue"     style={{ background: "#111" }}>Sort by Revenue</option>
                    <option value="utilization" style={{ background: "#111" }}>Sort by Utilization</option>
                    <option value="bookings"    style={{ background: "#111" }}>Sort by Bookings</option>
                    <option value="idle"        style={{ background: "#111" }}>Sort by Idle Days</option>
                  </select>
                </div>

                {/* Reset */}
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      width: "100%", padding: "10px 14px", background: "rgba(239,68,68,0.05)",
                      border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", color: "#fca5a5",
                      cursor: "pointer", fontWeight: "700", fontSize: "11px", letterSpacing: "0.5px",
                      fontFamily: "inherit", transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                    }}
                    onMouseEnter={e => { e.target.style.background = "rgba(239,68,68,0.12)"; e.target.style.borderColor = "rgba(239,68,68,0.4)"; }}
                    onMouseLeave={e => { e.target.style.background = "rgba(239,68,68,0.05)"; e.target.style.borderColor = "rgba(239,68,68,0.25)"; }}
                  >
                    RESET FILTERS
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── PERFORMANCE TIER — ENHANCED ── */}
          <div style={{ marginBottom: "12px" }}>
            <button
              onClick={() => setFleetOpen(p => !p)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "9px 12px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: fleetOpen ? "12px 12px 0 0" : "12px",
                color: "rgba(255,255,255,0.5)", cursor: "pointer",
                fontFamily: "inherit", fontSize: "11px", fontWeight: "700",
                letterSpacing: "1.5px", textTransform: "uppercase",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(14,165,233,0.06)";
                e.currentTarget.style.borderColor = "rgba(14,165,233,0.2)";
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
              onMouseLeave={e => {
                if (!fleetOpen) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                }
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                PERFORMANCE TIER
              </span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: fleetOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div style={{
              maxHeight: fleetOpen ? "260px" : "0px",
              overflow: "hidden",
              transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
              background: "rgba(255,255,255,0.02)",
              border: fleetOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
              borderTop: "none",
              borderRadius: "0 0 12px 12px"
            }}>
              <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: "5px" }}>
                {[
                  { color: "#22c55e", glow: "rgba(34,197,94,0.3)", label: "High Performer", sub: "≥70% utilized", pct: 85, icon: "🚀" },
                  { color: "#f59e0b", glow: "rgba(245,158,11,0.3)", label: "Moderate", sub: "40 – 69%", pct: 55, icon: "⚡" },
                  { color: "#ef4444", glow: "rgba(239,68,68,0.3)", label: "Underutilized", sub: "< 40%", pct: 22, icon: "⚠️" },
                ].map(({ color, glow, label, sub, pct, icon }) => (
                  <div 
                    key={label} 
                    className="performance-tier-item"
                    style={{ 
                      "--tier-color": color,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = `0 4px 16px ${glow}`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <span style={{ fontSize: "14px", flexShrink: 0 }}>{icon}</span>
                    <p style={{
                      margin: 0, fontSize: "12px", fontWeight: "700",
                      color: "#fff", whiteSpace: "nowrap", width: "88px", flexShrink: 0,
                    }}>
                      {label}
                    </p>
                    <div className="tier-bar">
                      <div 
                        className="tier-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: color,
                          boxShadow: `0 0 8px ${glow}`,
                        }} 
                      />
                    </div>
                    <p style={{
                      margin: 0, fontSize: "11px", fontWeight: "700",
                      color, whiteSpace: "nowrap", flexShrink: 0, width: "68px", textAlign: "right",
                    }}>
                      {sub}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT CONTENT — 78% */}
      <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

        <AdminSectionHeader
          title="Fleet Analytics"
          sub="Utilization, revenue and performance per vehicle across all dealers"
          badge="LIVE FLEET DATA"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          }
        />

        <div className="ca-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px", background: "transparent" }}>
          <div style={{
            animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
            background: "rgba(255,255,255,0.01)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "20px",
            padding: "20px"
          }}>
            <CarAnalytics bookings={bookings} dealers={dealers} externalSearch={search} externalSortBy={sortBy} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LocationsSection({ bookings }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("revenue");
  const [viewMode, setViewMode] = useState("routes");
  const [viewOpen, setViewOpen] = useState(true);
  const [filterOpen, setFilterOpen] = useState(true);

  return (
    <div
      className="admin-split-layout"
      style={{
        display: "flex", height: "100%", gap: "32px",
        padding: "20px 30px 20px 0px",
        color: "#f8fafc",
        fontFamily: "'Quicksand', -apple-system, sans-serif",
        animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)"
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .loc-scroll::-webkit-scrollbar { width: 6px; }
        .loc-scroll::-webkit-scrollbar-track { background: transparent; }
        .loc-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .loc-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

        /* Glass morphism route cards */
        .route-card {
          background: rgba(255, 255, 255, 0.03) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 14px !important;
          padding: 10px !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
          cursor: default !important;
        }
        .route-card:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          transform: translateY(-2px) !important;
          border-color: rgba(168, 85, 247, 0.3) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 0 20px rgba(168, 85, 247, 0.05) !important;
        }

        /* Expanded detail panel — always mounted, animated via max-height
           (measured from actual content, same approach as CarAnalytics)
           instead of instantly snapping open/closed. */
        .route-details {
          max-height: 0px;
          opacity: 0;
          overflow: hidden;
          padding: 0 18px;
          border-top: 1px solid transparent;
          transition:
            max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.3s ease,
            padding 0.35s cubic-bezier(0.4, 0, 0.2, 1),
            border-color 0.3s ease;
        }
        .route-card.expanded .route-details {
          padding: 0 18px 16px;
          border-top-color: rgba(255,255,255,0.05);
        }

        /* Glass morphism stat cards */
        .route-stat-card {
          background: rgba(255, 255, 255, 0.03) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 14px !important;
          padding: 16px !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
          text-align: center !important;
          cursor: default !important;
        }
        .route-stat-card:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          transform: translateY(-2px) !important;
          border-color: rgba(168, 85, 247, 0.3) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 0 20px rgba(168, 85, 247, 0.05) !important;
        }

        /* Glass morphism hub cards */
        .hub-card {
          background: rgba(255, 255, 255, 0.03) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 14px !important;
          padding: 14px 18px !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
          cursor: default !important;
        }
        .hub-card:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          transform: translateY(-2px) !important;
          border-color: rgba(168, 85, 247, 0.3) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 0 20px rgba(168, 85, 247, 0.05) !important;
        }

        .route-stat-grid {
          display: grid !important;
          grid-template-columns: repeat(6, auto) !important;
          gap: 12px !important;
          margin-bottom: 24px !important;
        }

        /* View mode buttons with purple accent */
        .view-mode-btn {
          padding: 10px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-left: 3px solid transparent;
          text-align: left;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%;
        }
        .view-mode-btn.active {
          background: rgba(168,85,247,0.1);
          color: #a855f7;
          font-weight: 700;
          border-left-color: #7c3aed;
        }
        .view-mode-btn:not(.active) {
          color: rgba(255,255,255,0.4);
          font-weight: 500;
        }
        .view-mode-btn:not(.active):hover {
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.65);
          border-left-color: rgba(168,85,247,0.3);
        }

        /* Sidebar inputs with purple focus */
        .sidebar-input {
          width: 100%;
          font-family: inherit;
          box-sizing: border-box;
          padding: 8px 10px 8px 32px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          color: #fff;
          font-size: 11px;
          outline: none;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sidebar-input:focus {
          border-color: #a855f7;
          background: rgba(168,85,247,0.05);
          box-shadow: 0 0 0 4px rgba(168,85,247,0.1);
        }
        .sidebar-select {
          width: 100%;
          font-family: inherit;
          box-sizing: border-box;
          padding: 8px 10px 8px 32px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          color: #fff;
          font-size: 11px;
          cursor: pointer;
          outline: none;
          appearance: none;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sidebar-select:focus { 
          border-color: #a855f7;
          box-shadow: 0 0 0 4px rgba(168,85,247,0.1);
        }
        .reset-btn {
          width: 100%;
          margin-top: 8px;
          padding: 8px 12px;
          background: rgba(239,68,68,0.05);
          border: 1px solid rgba(239,68,68,0.22);
          border-radius: 8px;
          color: #fca5a5;
          cursor: pointer;
          font-weight: 700;
          font-size: 10px;
          letter-spacing: 0.8px;
          font-family: inherit;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .reset-btn:hover {
          background: rgba(239,68,68,0.12);
          border-color: rgba(239,68,68,0.4);
        }

        /* Collapsible trigger with purple accent */
        .collapsible-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 9px 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .collapsible-trigger:hover {
          background: rgba(168,85,247,0.04);
          color: rgba(255,255,255,0.7);
          border-color: rgba(168,85,247,0.15);
        }
        .collapsible-trigger.open {
          border-color: rgba(168,85,247,0.15);
          background: rgba(168,85,247,0.04);
          color: rgba(255,255,255,0.7);
        }

        /* Glass morphism sidebar */
        .locations-sidebar {
          background: rgba(10, 10, 20, 0.3) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
        }
        
        .locations-sidebar-header {
          background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
        }

        @media (max-width: 768px) {
          .route-inline-controls {
            display: flex !important;
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }
          .admin-split-layout {
            flex-direction: column !important;
            gap: 12px !important;
            padding: 0 !important;
          }
          .admin-split-layout > div:first-child {
            flex: 0 0 auto !important;
            width: 100% !important;
            position: relative !important;
            height: auto !important;
            max-height: 400px !important;
            overflow-y: auto !important;
            padding: 12px !important;
          }
          .admin-content-area {
            flex: 1 !important;
            width: 100% !important;
            padding: 0 4px !important;
          }
          .route-stat-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
            margin-bottom: 16px !important;
          }
          .route-stat-grid > div {
            padding: 8px 4px !important;
            border-radius: 10px !important;
          }
          .route-stat-grid > div svg {
            width: 14px !important;
            height: 14px !important;
          }
          .route-stat-grid > div .stat-value {
            font-size: 0.78rem !important;
          }
          .route-stat-grid > div .stat-label {
            font-size: 7px !important;
          }
          .route-card-row {
            flex-wrap: wrap !important;
            gap: 10px !important;
            padding: 12px 14px !important;
          }
          .route-rank { width: 24px !important; height: 24px !important; font-size: 10px !important; }
          .route-pickup, .route-dropoff { font-size: 12px !important; }
          .route-metrics { flex-wrap: wrap !important; gap: 12px !important; width: 100% !important; justify-content: space-between !important; }
          .route-metrics > div { flex: 1 !important; min-width: 60px !important; }
          .route-metrics > div p:first-child { font-size: 12px !important; }
          .route-details-grid { grid-template-columns: 1fr 1fr !important; gap: 6px !important; }
          .route-detail-item { padding: 8px 10px !important; }
          .route-detail-item p:first-child { font-size: 8px !important; }
          .route-detail-item p:last-child { font-size: 12px !important; }
          /* Detail panel side padding removed on mobile — it was eating too
             much horizontal space on narrow screens. The detail cards keep
             their own internal padding, so content still reads fine. */
          .route-details { padding: 0 !important; }
          .route-card.expanded .route-details { padding: 0 !important; }
          .hub-card { flex-wrap: wrap !important; padding: 12px 14px !important; gap: 10px !important; }
          .hub-rank { width: 24px !important; height: 24px !important; font-size: 10px !important; }
          .hub-name { font-size: 12px !important; }
          .hub-sub { font-size: 9px !important; }
          .hub-metrics { flex-wrap: wrap !important; gap: 12px !important; width: 100% !important; justify-content: space-between !important; }
          .hub-metrics > div { flex: 1 !important; min-width: 60px !important; }
          .hub-metrics > div p:first-child { font-size: 12px !important; }
          .admin-section-header { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; padding-bottom: 10px !important; margin-bottom: 10px !important; }
          .admin-section-header h2 { font-size: 18px !important; }
          .admin-section-header p { font-size: 11px !important; }
          .admin-section-header-badge { font-size: 8px !important; }
        }

        @media (max-width: 480px) {
          .route-stat-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 4px !important;
          }
          .route-stat-grid > div .stat-value { font-size: 0.7rem !important; }
          .route-stat-grid > div .stat-label { font-size: 6px !important; }
          .admin-section-header h2 { font-size: 16px !important; }
          .admin-section-header p { font-size: 10px !important; }
        }
      `}</style>

      {/* LEFT SIDEBAR - 22% - STICKY */}
      <div
        className="locations-sidebar"
        style={{
          display: "grid", gridTemplateRows: "auto 1fr",
          height: "calc(100vh - 80px)", position: "sticky", top: 0,
          overflow: "hidden", paddingRight: "4px",
          flex: "0 0 22%", zIndex: 100
        }}
      >
        {/* KPI Header */}
        <div className="locations-sidebar-header" style={{
          paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0
        }}>
          <div style={{
            background: "linear-gradient(135deg, #2e1065 0%, #7c3aed 100%)",
            padding: "16px", borderRadius: "16px", color: "#fff",
            boxShadow: "0 8px 24px rgba(124,58,237,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "12px"
          }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>ROUTE NETWORK</p>
              <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>Revenue Routes</p>
              <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Spatial analytics engine</p>
            </div>
            <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Scrollable Sidebar */}
        <div className="loc-scroll" style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingTop: "4px", background: "transparent" }}>
          {/* ── VIEW MODE — COLLAPSIBLE ── */}
          <div style={{ marginBottom: "8px" }}>
            <button
              onClick={() => setViewOpen(p => !p)}
              className={`collapsible-trigger ${viewOpen ? 'open' : ''}`}
              style={{ borderRadius: viewOpen ? "12px 12px 0 0" : "12px" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/>
                  <path d="M9 19h4.5a3.5 3.5 0 0 0 3.5-3.5v-4A3.5 3.5 0 0 1 20.5 8H21"/>
                </svg>
                VIEW MODE
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: "transform 0.3s ease", transform: viewOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            <div style={{
              maxHeight: viewOpen ? "180px" : "0px",
              overflow: "hidden",
              transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
              background: "rgba(255,255,255,0.02)",
              border: viewOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
              borderTop: "none",
              borderRadius: "0 0 12px 12px"
            }}>
              <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
                {[
                  {
                    id: "routes", label: "Route Pairs",
                    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h4.5a3.5 3.5 0 0 0 3.5-3.5v-4A3.5 3.5 0 0 1 20.5 8H21"/></svg>
                  },
                  {
                    id: "pickups", label: "Pickup Hubs",
                    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  },
                  {
                    id: "dropoffs", label: "Dropoff Hubs",
                    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                  },
                ].map(({ id, icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setViewMode(id)}
                    className={`view-mode-btn${viewMode === id ? " active" : ""}`}
                  >
                    <span style={{ opacity: viewMode === id ? 1 : 0.5, display: "flex", alignItems: "center" }}>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── FILTER & SORT — COLLAPSIBLE ── */}
          <div style={{ marginBottom: "12px" }}>
            <button
              onClick={() => setFilterOpen(p => !p)}
              className={`collapsible-trigger ${filterOpen ? 'open' : ''}`}
              style={{ borderRadius: filterOpen ? "12px 12px 0 0" : "12px" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                FILTER & SORT
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: "transform 0.3s ease", transform: filterOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div style={{
              maxHeight: filterOpen ? "260px" : "0px",
              overflow: "hidden",
              transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
              background: "rgba(255,255,255,0.02)",
              border: filterOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
              borderTop: "none",
              borderRadius: "0 0 12px 12px"
            }}>
              <div style={{ padding: "10px 12px 12px" }}>

                {/* Search */}
                <p style={{ margin: "0 0 6px", fontSize: "9px", fontWeight: "800", letterSpacing: "1.5px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>SEARCH</p>
                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", opacity: 0.35, display: "flex", alignItems: "center", pointerEvents: "none" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </span>
                  <input
                    className="sidebar-input"
                    placeholder="Search location..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {/* Sort */}
                <p style={{ margin: "0 0 6px", fontSize: "9px", fontWeight: "800", letterSpacing: "1.5px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>SORT BY</p>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", zIndex: 1, opacity: 0.35, display: "flex", alignItems: "center", pointerEvents: "none" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/>
                    </svg>
                  </span>
                  <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", opacity: 0.35, display: "flex", alignItems: "center", pointerEvents: "none" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </span>
                  <select
                    className="sidebar-select"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                  >
                    <option value="revenue"  style={{ background: "#111" }}>Revenue</option>
                    <option value="bookings" style={{ background: "#111" }}>Bookings</option>
                    <option value="avgValue" style={{ background: "#111" }}>Avg Value</option>
                    {viewMode === "routes" && <option value="avgDays" style={{ background: "#111" }}>Avg Days</option>}
                  </select>
                </div>

                {search && (
                  <button className="reset-btn" onClick={() => setSearch("")}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    CLEAR FILTER
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT CONTENT - 78% */}
      <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        
        <AdminSectionHeader
          title="Revenue Routes"
          sub="Top pickup → dropoff pairs by revenue, bookings and average trip value"
          badge="ROUTE INTELLIGENCE"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          }
        />

        <div className="loc-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px", background: "transparent" }}>
          <div style={{
            animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
            background: "rgba(255,255,255,0.01)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "20px",
            padding: "20px"
          }}>
            <RevenueRoutes
              bookings={bookings}
              externalSearch={search}
              externalSortBy={sortBy}
              externalViewMode={viewMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(n, prefix = "$") {
  if (n >= 100000) return `${prefix}${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${Math.round(n)}`;
}

function TrendsSection({ bookings, cars, popularCars, popularLocations }) {
  return (
    <div
      className="admin-split-layout"
      style={{
        display: "flex", height: "100%", gap: "32px",
        padding: "20px", color: "#f8fafc",
        fontFamily: "'Quicksand', -apple-system, sans-serif",
        animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)"
      }}
    >
      <style>{`
        .tr-scroll::-webkit-scrollbar { width: 6px; }
        .tr-scroll::-webkit-scrollbar-track { background: transparent; }
        .tr-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .tr-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        .tr-insight-card { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
        .tr-insight-card:hover { transform: translateY(-2px); border-color: rgba(20,184,166,0.2) !important; }
      `}</style>

      {/* LEFT SIDEBAR — 22% */}
      <div
        className="admin-filter-sidebar tr-scroll"
        style={{
          flex: "0 0 22%", display: "flex", flexDirection: "column",
          gap: "20px", overflowY: "auto", paddingRight: "4px"
        }}
      >
        {/* KPI Widget */}
        <div style={{
          background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
          padding: "16px", borderRadius: "16px", color: "#fff",
          boxShadow: "0 8px 24px rgba(20,184,166,0.15), inset 0 1px 1px rgba(255,255,255,0.2)",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontSize: "11px", letterSpacing: "1.5px", fontWeight: "700", opacity: 0.85 }}>INTELLIGENCE HUB</span>
          <span style={{ fontWeight: "800", fontSize: "15px" }}>BI ENGINE</span>
        </div>

        <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", color: "rgba(255,255,255,0.4)", marginBottom: "-8px", paddingLeft: "4px" }}>
          QUICK INSIGHTS
        </div>

        {/* Snapshot metrics */}
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "14px", padding: "6px", display: "flex", flexDirection: "column"
        }}>
          {[
            { icon: "💡", label: "Revenue Driver",  value: popularCars[0]?.[0]        || "N/A", color: "#14b8a6" },
            { icon: "📅", label: "Peak Days",       value: "Fri & Sat",                          color: "#a855f7" },
            { icon: "☀️", label: "Peak Season",     value: "Jun – Aug",                          color: "#f59e0b" },
            { icon: "⏳", label: "Lead Time",       value: "~14 days",                           color: "#4ce3f7" },
            { icon: "🏆", label: "Top Vehicle",     value: popularCars[0]?.[0]        || "N/A", color: "#22c55e" },
            { icon: "📍", label: "Busiest Hub",     value: popularLocations[0]?.[0]   || "N/A", color: "#ec4899" },
          ].map(({ icon, label, value, color }) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "9px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px" }}>{icon}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11.5px" }}>{label}</span>
              </div>
              <span style={{
                color, fontSize: "11.5px", fontWeight: "700",
                maxWidth: "80px", textAlign: "right",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}>{value}</span>
            </div>
          ))}
        </div>

        {/* About card */}
        <div style={{
          background: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.15)",
          borderRadius: "14px", padding: "14px 16px"
        }}>
          <p style={{ margin: "0 0 6px", fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", color: "#14b8a6", textTransform: "uppercase" }}>ABOUT THIS VIEW</p>
          <p style={{ margin: 0, fontSize: "11.5px", color: "rgba(255,255,255,0.45)", lineHeight: "1.6" }}>
            Data-driven demand analysis, seasonality patterns, and AI pricing recommendations based on your real historical fleet data.
          </p>
        </div>
      </div>

      {/* RIGHT CONTENT — 78% */}
      <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

        {/* Sticky header */}
        <div className="admin-section-header" style={{
          paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "20px", display: "flex", justifyContent: "space-between",
          alignItems: "center", flexShrink: 0
        }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "24px", color: "#fff", fontWeight: "800", letterSpacing: "-0.5px" }}>Business Intelligence</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "13.5px" }}>
              Demand patterns, seasonality forecasts, and data-driven pricing recommendations
            </p>
          </div>
          <div className="admin-section-header-badge" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.4)", letterSpacing: "1px" }}>DEMAND INTELLIGENCE</span>
          </div>
        </div>

        <div className="tr-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Hero insight */}
            <div style={{
              background: "linear-gradient(135deg, rgba(20,184,166,0.08), rgba(76,227,247,0.04))",
              border: "1px solid rgba(20,184,166,0.2)", borderRadius: "18px",
              padding: "24px", display: "flex", alignItems: "center", gap: "20px"
            }}>
              <div style={{
                width: "52px", height: "52px", borderRadius: "16px", flexShrink: 0,
                background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px"
              }}>💡</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "700", color: "#14b8a6", letterSpacing: "1.5px", textTransform: "uppercase" }}>PRIMARY REVENUE DRIVER</p>
                <p style={{ margin: 0, fontSize: "15px", color: "#fff", lineHeight: "1.6" }}>
                  The <strong style={{ color: "#14b8a6" }}>{popularCars[0]?.[0] || "your top vehicle"}</strong> is your most profitable asset, generating{" "}
                  <strong style={{ color: "#22c55e" }}>
                    {fmt(bookings.filter(b => b.carModel === popularCars[0]?.[0]).reduce((s, b) => s + (b.total || 0), 0))}
                  </strong>{" "}
                  across <strong style={{ color: "#fff" }}>{popularCars[0]?.[1] || 0}</strong> bookings.
                </p>
              </div>
            </div>

            {/* Demand patterns card */}
            <div style={{
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "18px", padding: "24px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "10px",
                  background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, color: "#fff", fontSize: "15px", fontWeight: "800" }}>Demand Patterns</h3>
                  <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>Historical booking behaviour and operational rhythms</p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {[
                  {
                    label: "High-Traffic Days",
                    value: "Friday & Saturday",
                    color: "#f59e0b",
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    )
                  },
                  {
                    label: "Peak Season Window",
                    value: "June – August",
                    color: "#f59e0b",
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                      </svg>
                    )
                  },
                  {
                    label: "Average Lead Time",
                    value: "~14 days in advance",
                    color: "#4ce3f7",
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ce3f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                    )
                  },
                  {
                    label: "Standard Retention",
                    value: "7 days (weekly avg)",
                    color: "#22c55e",
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                      </svg>
                    )
                  },
                  {
                    label: "Top Performer",
                    value: popularCars[0]?.[0] || "N/A",
                    color: "#a855f7",
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    )
                  },
                  {
                    label: "Busiest Hub",
                    value: popularLocations[0]?.[0] || "N/A",
                    color: "#ec4899",
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    )
                  },
                ].map(({ icon, label, value, color }) => (
                  <div key={label} className="tr-insight-card" style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 16px", borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.04)",
                    background: "rgba(255,255,255,0.01)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ display: "flex", alignItems: "center", width: "16px", height: "16px" }}>
                        {icon}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13.5px" }}>{label}</span>
                    </div>
                    <span style={{ color, fontSize: "14px", fontWeight: "700" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

              {/* DemandAnalytics card */}
              <div style={{
                background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "18px", padding: "24px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "10px",
                    background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                      <polyline points="17 6 23 6 23 12"/>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: "#fff", fontSize: "15px", fontWeight: "800" }}>Advanced Demand Analytics</h3>
                    <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>Peak seasons, booking heatmaps, 8-week forecasts & pricing recommendations</p>
                  </div>
                </div>
                <DemandAnalytics bookings={bookings} cars={cars} />
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Build nav groups with live badges, filtered by role ──
  const pendingBookingCount = bookings.filter(b=>b.status==="pending_approval").length;
  const unreadReviewCount   = reviews.filter(r=>!r.viewedByAdmin).length;

  const navGroupsFiltered = [
    {
      label: null,
      items: filteredNav.main.map(item => ({
        ...item,
        badge: item.id==="bookings" ? pendingBookingCount : item.id==="reviews" ? unreadReviewCount : item.id==="notifications" ? unreadCount : 0,
      })),
    },
    {
      label: "Analytics",
      items: filteredNav.analytics,
    },
    ...(filteredNav.admin.length > 0 ? [{
      label: "Admin",
      items: filteredNav.admin,
    }] : []),
  ].filter(g => g.items.length > 0);

  return (
  <div
    className="admin-root"
    style={{
      position: "relative",
      isolation: "isolate",
      display: "flex",
      height: "100vh",
      overflow: "hidden",
      background:
        "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(67,56,202,0.1) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(147,51,234,0.08) 0%, transparent 50%), #05050b",
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
    <style>
      {`
          .admin-split-layout {
            gap: 24px !important;
          }
          .admin-split-layout > div:first-child {
            flex: 0 0 250px !important;
            width: 250px !important;
            min-width: 250px !important;
            max-width: 250px !important;
          }
          .admin-split-layout .admin-content-area,
          .admin-split-layout > div:last-child {
            flex: 1 1 0% !important;
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
          }

          @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
          @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
          @keyframes spin    { to{transform:rotate(360deg)} }
          .page-section { animation: slideUp 0.2s ease both; }
          ::-webkit-scrollbar { width:4px; height:4px; }
          ::-webkit-scrollbar-track { background:transparent; }
          ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.2); border-radius:4px; }
          ::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.3); }
          input::placeholder { color:rgba(255,255,255,0.4); }
          select, option { background:#1a1a2e; color:#fff; }
          @media(max-width:768px){
            .admin-sidebar { position:fixed!important; z-index:200; transform:translateX(-100%); transition:transform 0.25s ease!important; }
            .admin-sidebar.open { transform:translateX(0)!important; }
            .mobile-menu-btn { display:flex!important; }
            .header-stats { display:none!important; }
          }
          ${RESPONSIVE_CSS}`
        }
      </style>

      {mobileSidebarOpen && <div onClick={() => setMobileSidebarOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:199 }} />}

      {/* SIDEBAR */}
      <aside 
        className={`admin-sidebar ${mobileSidebarOpen ? "open" : ""}`} 
        style={{ 
          width: iS, 
          minWidth: iS, 
          height: "100vh", 
          background: "linear-gradient(180deg, rgba(10,10,18,0.98), rgba(15,15,30,0.99))", 
          borderRight: "1px solid rgba(255,255,255,0.05)", 
          display: "flex", 
          flexDirection: "column", 
          transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)", 
          overflow: "hidden", 
          flexShrink: 0, 
          backdropFilter: "blur(24px)", 
          boxShadow: "10px 0 30px rgba(0,0,0,0.3)", 
          zIndex: 100 
        }}
      >
        {/* Header Title Branding Block */}
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
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              position: "relative",
              zIndex: 1,
            }}
          >
            <span style={{ color: "white", fontWeight: "bold", fontSize: "14px" }}>A</span>
          </div>
          {sidebarOpen && (
            <div className="qw_shine_heading" style={{ marginLeft: "16px", overflow: "hidden", whiteSpace: "nowrap" }}>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#fff", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                ADMIN <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: "500" }}>DASHBOARD</span>
              </p>
            </div>
          )}
        </div>

        {/* Main Filtered Navigation Core Scroll Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {navGroupsFiltered.map((group, gi) => (
            <div key={gi} style={{ marginBottom: "20px" }}>
              {group.label && sidebarOpen && (
                <p style={{ padding: "0 16px", margin: "0 0 10px", fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", fontWeight: "700", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {group.label}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {group.items.map(item => (
                  <NavItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Options Controls Block */}
        <div style={{ padding: "16px", background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          {[
            { 
              id: "toggle",
              label: sidebarOpen ? "Collapse" : "Expand", 
              action: () => setSidebarOpen(p => !p), 
              color: "rgba(255,255,255,0.5)",
              icon: sidebarOpen ? (
                /* Minimize Left Arrow SVG Icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
              ) : (
                /* Maximize Right Arrow SVG Icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
              )
            },
            { 
              id: "logout",
              label: "Sign Out", 
              action: async () => { await logout(); navigate("/"); }, 
              color: "#ff5f5f",
              icon: (
                /* Sign-out / Door Exit SVG Icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              )
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
                gap: "12px" 
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = id === "logout" ? "#ff5f5f" : "#fff";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = color;
              }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", flexShrink: 0 }}>
                {icon}
              </span>
              {sidebarOpen && <span style={{ fontSize: "14px", fontWeight: "500", whiteSpace: "nowrap" }}>{label}</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        {/* Header */}
          <header className="dnav-header">
            <nav className="dnav-shell">
              {/* Mobile menu toggle */}
              <button
                className="dnav-home-btn mobile-menu-btn"
                onClick={() => setMobileSidebarOpen(p => !p)}
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

              {/* Actions */}
              <div className="dnav-actions">
                {/* Stats strip */}
                <div className="header-stats" style={{ display: "flex", gap: "32px", paddingRight: "32px", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  {[
                    { label: "Revenue", value: `$${totalRevenue.toLocaleString()}`, color: "#10b981", glow: "rgba(16,185,129,0.15)" },
                    { label: "Bookings", value: bookings.length, color: "#3b82f6", glow: "rgba(59,130,246,0.15)" },
                    { label: "Users", value: users.length, color: "#f59e0b", glow: "rgba(245,158,11,0.15)" },
                  ].map(s => (
                    <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                      <p style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: s.color, letterSpacing: "-0.01em", textShadow: `0 2px 10px ${s.glow}` }}>
                        {s.value}
                      </p>
                      <p style={{ margin: 0, fontSize: "10px", color: "rgba(255,255,255,0.35)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Role badge */}
                <div className="admin-role-badge-wrapper" style={{ transform: "scale(0.95)" }}>
                  <RoleBadge role={adminRole} />
                </div>

                {/* Home button */}
                <button className="dnav-home-btn" onClick={() => switchNav("dashboard")} title="Go to Home">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </button>

                {/* Notification bell */}
                <button
                  className="dnav-bell-btn"
                  onClick={() => {
                    switchNav("notifications");
                    setUnreadCount(0);
                    setNotifications(p => p.map(n => ({ ...n, read: true })));
                  }}
                  title="Notifications"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="dnav-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  )}
                </button>

                {/* Profile button - fancy button styling */}
                {(() => {
                  const name = user?.displayName || "";
                  const firstName = name.trim().split(/\s+/).filter(Boolean)[0] || user?.email?.[0] || "A";
                  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
                  return (
                    <button className="qw_fancy_btn dnav-profile-btn" onClick={() => navigate("/profile")}>
                      <FancyButtonFx />
                      <span className="qw_fancy_btn_inner">
                        <svg className="qw_fancy_btn_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        {displayName}
                      </span>
                    </button>
                  );
                })()}
              </div>
            </nav>
          </header>

          {["bookings","overview","users","cars","locations","trends","dealers","reviews","notifications","emergency","system","templates","audit_logs","admin_settings","export_reports","data_backup"].includes(activeNav) && (
            <div style={{ position: "relative", width: "100%", zIndex: 40, flexShrink: 0 }}>
              
              {/* Collapsible Wrapper */}
              <div 
                className="admin-overview-collapsible"
                style={{ 
                  width: "100%",
                  maxHeight: isStatsVisible ? "500px" : "0px", 
                  opacity: isStatsVisible ? 1 : 0,
                  pointerEvents: isStatsVisible ? "auto" : "none",
                  overflow: "hidden",
                  background: "rgba(10,10,20,0.7)", 
                  backdropFilter: "blur(20px)", 
                  borderBottom: isStatsVisible ? "1px solid rgba(255,255,255,0.04)" : "1px solid transparent",
                  transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.4s ease",
                }}
              >
                <div className="admin-overview-stats-pad" style={{ padding: "20px 32px 24px 32px" }}>
                  <div className="admin-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,auto))", gap: "14px" }}>
                    {[
                      { label: "Total Revenue",   value: `$${totalRevenue.toLocaleString()}`,   change: stats.revenue,       color: "#10b981", sub: "All time"     },
                      { label: "Monthly Revenue", value: `$${monthlyRevenue.toLocaleString()}`, change: stats.monthlyRevenue, color: "#3b82f6", sub: "This month"   },
                      { label: "Bookings",        value: bookings.length,                       change: stats.bookings,      color: "#8b5cf6", sub: "Total orders" },
                      { label: "Active Users",    value: users.length,                          change: 12,                  color: "#f59e0b", sub: "Registered"   },
                      { label: "Avg. Value",      value: `$${avgVal.toFixed(0)}`,               change: stats.avgValue,      color: "#06b6d4", sub: "Per booking"  },
                      { label: "Avg. Duration",   value: `${avgDur.toFixed(1)}d`,               change: -2,                  color: "#ec4899", sub: "Rental days"  },
                    ].map(s => (
                      <div key={s.label} style={{ position: "relative", padding: "16px", borderRadius: "16px", background: "linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", transition: "transform 0.2s ease, border-color 0.2s ease", cursor: "default" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                          <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
                          {s.change !== 0 && <div style={{ fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: "6px", background: s.change > 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: s.change > 0 ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", gap: "2px" }}>{s.change > 0 ? "↑" : "↓"}{Math.abs(s.change).toFixed ? Math.abs(s.change).toFixed(0) : Math.abs(s.change)}%</div>}
                        </div>
                        <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#fff" }}>{s.value}</h2>
                        <p style={{ margin: "4px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: "500" }}>{s.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Premium Right-Aligned Control Node */}
              <div 
                style={{ 
                  position: "absolute", 
                  bottom: isStatsVisible ? "-10px" : "-30px", 
                  right: "30px", 
                  zIndex: 45,
                  transition: "bottom 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
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
                    background: isStatsVisible ? "rgba(15, 15, 25, 0.85)" : "rgba(147, 51, 234, 0.15)",
                    backdropFilter: "blur(12px)",
                    border: isStatsVisible ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(147, 51, 234, 0.4)",
                    boxShadow: isStatsVisible 
                      ? "0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)" 
                      : "0 4px 20px rgba(147, 51, 234, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                    color: isStatsVisible ? "rgba(255, 255, 255, 0.5)" : "#a855f7",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    outline: "none",
                    padding: 0
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = isStatsVisible ? "rgba(255, 255, 255, 0.25)" : "rgba(147, 51, 234, 0.7)";
                    e.currentTarget.style.color = isStatsVisible ? "#fff" : "#c084fc";
                    e.currentTarget.style.boxShadow = isStatsVisible 
                      ? "0 6px 16px rgba(0,0,0,0.5), 0 0 10px rgba(255,255,255,0.08)" 
                      : "0 6px 24px rgba(147, 51, 234, 0.45), 0 0 12px rgba(147, 51, 234, 0.2)";
                    // Micro floating translation effect on hover
                    e.currentTarget.style.transform = "translateY(1px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = isStatsVisible ? "rgba(255, 255, 255, 0.08)" : "rgba(147, 51, 234, 0.4)";
                    e.currentTarget.style.color = isStatsVisible ? "rgba(255, 255, 255, 0.5)" : "#a855f7";
                    e.currentTarget.style.boxShadow = isStatsVisible 
                      ? "0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)" 
                      : "0 4px 20px rgba(147, 51, 234, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* Animated Custom Arrow */}
                  <svg 
                    width="11" 
                    height="7" 
                    viewBox="0 0 11 7" 
                    fill="none" 
                    style={{ 
                      transform: isStatsVisible ? "rotate(180deg)" : "rotate(0deg)", 
                      transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
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

          {/* <div style={{ flexShrink:0, padding:"12px 32px",
              borderBottom:"1px solid rgba(255,255,255,0.04)",
              background:"rgba(10,10,20,0.6)", backdropFilter:"blur(20px)" }}>
            <DateRangeFilter />
          </div> */}

        {/* Scrollable content */}
        <div className="admin-main-content" style={{ flex:1, overflowY:"auto", padding:"0px 24px" }}>
          {tabLoading ? <TabSkeleton /> : (
            <>
              {/* ── BOOKINGS ─────────────────────────────────── */}
              {activeNav === "bookings" && (
                <div className="admin-split-layout"
                  style={{ 
                    display: "flex", 
                    height: "100%", 
                    gap: "32px", 
                    padding: "20px",
                    color: "#f8fafc",
                    animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                >
                  {/* CSS Keyframes injected for smooth UI states */}
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    .premium-input::placeholder { color: rgba(255, 255, 255, 0.35); }
                    .premium-scroll::-webkit-scrollbar { width: 6px; }
                    .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                    .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                    .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
                    
                    /* Glass morphism booking card */
                    .admin-booking-card {
                      background: rgba(255, 255, 255, 0.03) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.08) !important;
                      border-left: 3px solid var(--status-color, rgba(147,51,234,0.4)) !important;
                      border-radius: 14px !important;
                      padding: 16px 20px !important;
                      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                      position: relative !important;
                      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
                    }
                    .admin-booking-card:hover {
                      background: rgba(255, 255, 255, 0.06) !important;
                      transform: translateY(-2px) !important;
                      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(147,51,234,0.05) !important;
                      border-color: rgba(255, 255, 255, 0.15) !important;
                    }
                    .admin-booking-card.selected {
                      background: rgba(147, 51, 234, 0.1) !important;
                      border-color: #9333ea !important;
                      box-shadow: 0 4px 24px rgba(147,51,234,0.15) !important;
                    }
                    
                    /* iOS Checkbox */
                    .ios-checkbox {
                      --checkbox-size: 22px;
                      --checkbox-color: #9333ea;
                      --checkbox-bg: rgba(147,51,234,0.15);
                      --checkbox-border: rgba(147,51,234,0.5);
                      position: relative;
                      display: inline-block;
                      cursor: pointer;
                      user-select: none;
                      -webkit-tap-highlight-color: transparent;
                    }
                    .ios-checkbox input { display: none; }
                    .ios-checkbox .checkbox-wrapper {
                      position: relative;
                      width: var(--checkbox-size);
                      height: var(--checkbox-size);
                      border-radius: 6px;
                      transition: transform 0.2s ease;
                      flex-shrink: 0;
                    }
                    .ios-checkbox .checkbox-bg {
                      position: absolute;
                      inset: 0;
                      border-radius: 6px;
                      border: 2px solid var(--checkbox-border);
                      background: rgba(255,255,255,0.03);
                      transition: all 0.2s ease;
                    }
                    .ios-checkbox .checkbox-icon {
                      position: absolute;
                      inset: 0;
                      margin: auto;
                      width: 80%;
                      height: 80%;
                      color: #0a0a14;
                      transform: scale(0);
                      transition: transform 0.15s ease 0.05s;
                    }
                    .ios-checkbox .check-path {
                      stroke-dasharray: 40;
                      stroke-dashoffset: 40;
                      transition: stroke-dashoffset 0.35s cubic-bezier(0.65,0,0.35,1) 0.1s;
                    }
                    .ios-checkbox input:checked + .checkbox-wrapper .checkbox-bg {
                      background: var(--checkbox-color);
                      border-color: var(--checkbox-color);
                      box-shadow: 0 0 10px rgba(147,51,234,0.4);
                    }
                    .ios-checkbox input:checked + .checkbox-wrapper .checkbox-icon { transform: scale(1); }
                    .ios-checkbox input:checked + .checkbox-wrapper .check-path { stroke-dashoffset: 0; }
                    .ios-checkbox:hover .checkbox-wrapper { transform: scale(1.08); }
                    .ios-checkbox:active .checkbox-wrapper { transform: scale(0.93); }
                    .ios-checkbox input:focus + .checkbox-wrapper .checkbox-bg { box-shadow: 0 0 0 4px var(--checkbox-bg); }
                    .ios-checkbox input:checked + .checkbox-wrapper { animation: cbBounce 0.3s cubic-bezier(0.4,0,0.2,1); }
                    @keyframes cbBounce {
                      0%, 100% { transform: scale(1); }
                      50% { transform: scale(1.15); }
                    }
                    
                    /* Glass morphism sidebar */
                    .booking-sidebar {
  background: none !important;
  border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
}
.booking-sidebar-header {
  background: none !important;
  padding-bottom: 12px !important;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
}
                  `}</style>

                  {/* LEFT SIDEBAR - FILTERS (22%) */}
                  <div 
                    className="booking-sidebar"
                    style={{ 
                      flex: "0 0 22%", 
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      height: "calc(100vh - 80px)",
                      position: "sticky",
                      top: 0,
                      overflow: "hidden",
                      paddingRight: "4px",
                      zIndex: 100
                    }}
                  >
                    {/* HEADER - Fixed at top using grid */}
                    <div 
                      className="booking-sidebar-header"
                      style={{
                        paddingBottom: "12px",
                        zIndex: 50,
                        borderBottom: "1px solid rgba(255,255,255,0.05)"
                      }}
                    >
                      <AdminKpiWidget
                        gradient="linear-gradient(135deg,#4338ca 0%,#9333ea 100%)"
                        shadow="0 8px 24px rgba(147,51,234,0.25),inset 0 1px 1px rgba(255,255,255,0.15)"
                        label="BOOKING LEDGER"
                        value={`${sorted.length} Records`}
                        sub="Active reservation log"
                        icon={
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                          </svg>
                        }
                      />

                      {/* FILTER TOGGLE BUTTON */}
                      <button 
                        className="filter-toggle-btn"
                        onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 14px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          color: "rgba(255,255,255,0.6)",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "1px",
                          transition: "all 0.3s ease"
                        }}
                      >
                        <span>FILTER & SEARCH</span>
                        <svg 
                          className={`toggle-icon ${isFiltersVisible ? 'open' : ''}`}
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{
                            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            transform: isFiltersVisible ? "rotate(180deg)" : "rotate(0deg)"
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                    </div>

                    {/* SCROLLABLE FILTERS CONTAINER */}
                    <div 
                      className="premium-scroll"
                      style={{ 
                        overflowY: "auto",
                        overflowX: "hidden",
                        paddingRight: "2px",
                        paddingTop: "4px",
                        minHeight: 0
                      }}
                    >
                      <div 
                        className={`filter-collapsible-wrapper ${isFiltersVisible ? '' : 'collapsed'}`}
                        style={{
                          overflow: "hidden",
                          transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          maxHeight: isFiltersVisible ? "800px" : "0"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {/* Search by name */}
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="7" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </svg>
                            </span>
                            <input 
                              className="premium-input"
                              placeholder="Search identity, email, vehicle..." 
                              value={searchTerm} 
                              onChange={e => setSearchTerm(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 16px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                fontFamily: "Quicksand",
                                outline: "none",
                                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)"
                              }} 
                              onFocus={e => {
                                e.target.style.borderColor = "rgba(168, 85, 247, 0.6)";
                                e.target.style.background = "rgba(147, 51, 234, 0.15)";
                                e.target.style.boxShadow = "0 0 0 4px rgba(147, 51, 234, 0.15)";
                              }} 
                              onBlur={e => {
                                e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
                                e.target.style.background = "rgba(255, 255, 255, 0.03)";
                                e.target.style.boxShadow = "none";
                              }} 
                            />
                          </div>

                          {/* Filter Model */}
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
                                <rect x="3" y="11" width="18" height="6" rx="2" />
                                <circle cx="7.5" cy="17.5" r="1.5" fill="#60a5fa" stroke="none" />
                                <circle cx="16.5" cy="17.5" r="1.5" fill="#60a5fa" stroke="none" />
                              </svg>
                            </span>
                            <input 
                              className="premium-input"
                              placeholder="Specific Vehicle Model" 
                              value={filterCar} 
                              onChange={e => setFilterCar(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 16px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                fontFamily: "Quicksand",
                                outline: "none",
                                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)"
                              }} 
                              onFocus={e => {
                                e.target.style.borderColor = "rgba(129, 140, 248, 0.6)";
                                e.target.style.background = "rgba(255, 255, 255, 0.05)";
                              }}
                              onBlur={e => {
                                e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
                                e.target.style.background = "rgba(255, 255, 255, 0.03)";
                              }}
                            />
                          </div>

                          {/* All Dates */}
                          <div className="premium-select-wrapper" style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 1, pointerEvents: "none", display: "flex" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="5" width="18" height="16" rx="2" />
                                <line x1="16" y1="3" x2="16" y2="7" />
                                <line x1="8" y1="3" x2="8" y2="7" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                            </span>
                            <select 
                              value={filterDate} 
                              onChange={e => setFilterDate(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 40px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                cursor: "pointer", 
                                outline: "none", 
                                appearance: "none",
                                transition: "all 0.25s ease",
                                fontFamily: "Quicksand",
                              }}
                              onFocus={e => e.target.style.borderColor = "rgba(168, 85, 247, 0.6)"}
                              onBlur={e => e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"}
                            >
                              <option value="" style={{ background: "#111", color: "#fff" }}>All Dynamic Dates</option>
                              {uniqueDates.map(d => <option key={d} value={d} style={{ background: "#111", color: "#fff" }}>{d}</option>)}
                            </select>
                            <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </span>
                          </div>

                          {/* All Status — custom dropdown with colored SVG icons per option */}
                          <IconSelect value={filterStatus} options={STATUS_OPTIONS} onChange={setFilterStatus} />

                          {/* Sort By */}
                          <div className="premium-select-wrapper" style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 1, pointerEvents: "none", display: "flex" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 7h12M3 12h8M3 17h4" />
                                <path d="M17 5v14M17 5l-3 3M17 5l3 3" />
                              </svg>
                            </span>
                            <select 
                              value={sortBy} 
                              onChange={e => setSortBy(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 40px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                cursor: "pointer", 
                                outline: "none", 
                                appearance: "none",
                                transition: "all 0.25s ease",
                                fontFamily: "Quicksand",
                              }}
                              onFocus={e => e.target.style.borderColor = "rgba(168, 85, 247, 0.6)"}
                              onBlur={e => e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"}
                            >
                              <option value="newest" style={{ background: "#111" }}>Chronological: Newest</option>
                              <option value="oldest" style={{ background: "#111" }}>Chronological: Oldest</option>
                              <option value="priceHigh" style={{ background: "#111" }}>Valuation: High to Low</option>
                              <option value="priceLow" style={{ background: "#111" }}>Valuation: Low to High</option>
                            </select>
                            <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </span>
                          </div>

                          {/* Select All Button */}
                          <PermissionGuard permission={PERMISSIONS.APPROVE_BOOKING}>
                            <button 
                              onClick={toggleSelectAll} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 16px", 
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                background: selectAllMode ? "rgba(147, 51, 234, 0.15)" : "transparent", 
                                border: selectAllMode ? "1px solid #9333ea" : "1px solid rgba(255,255,255,0.1)", 
                                color: selectAllMode ? "#c084fc" : "rgba(255,255,255,0.7)",
                                borderRadius: "14px", 
                                cursor: "pointer", 
                                fontWeight: "600", 
                                fontSize: "13px",
                                fontFamily: "Quicksand",
                                letterSpacing: "0.5px",
                                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                              }}
                              onMouseEnter={e => {
                                if(!selectAllMode) {
                                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                                }
                              }}
                              onMouseLeave={e => {
                                if(!selectAllMode) {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                                }
                              }}
                            >
                              {selectAllMode && (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                              {selectAllMode
                                ? `Clear Selection (${selectedBookings.size} selected)`
                                : selectedBookings.size > 0
                                  ? `Select All Eligible (${selectedBookings.size} selected)`
                                  : "Select All Eligible"}
                            </button>
                          </PermissionGuard>

                          {/* Reset Button */}
                          {(searchTerm || filterCar || filterDate || filterStatus) && (
                            <button 
                              onClick={() => { setSearchTerm(""); setFilterCar(""); setFilterDate(""); setFilterStatus(""); setSortBy("newest"); }} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 16px", 
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                background: "rgba(239, 68, 68, 0.05)", 
                                border: "1px solid rgba(239, 68, 68, 0.25)", 
                                borderRadius: "14px", 
                                color: "#fca5a5", 
                                cursor: "pointer", 
                                fontWeight: "600", 
                                fontSize: "12.5px",
                                letterSpacing: "0.5px",
                                transition: "all 0.2s ease"
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
                                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
                                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.25)";
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                              RESET ACTIVE FILTERS
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT CONTENT - BOOKINGS (78%) */}
                  <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

                    {/* STEADY / NON-SCROLLING HEADER LAYER */}
                    <AdminSectionHeader
                      title="Bookings Directory"
                      sub="Real-time reservation oversight with automated status transitions and risk monitoring"
                      badge="ACTIVE BOOKINGS MONITOR"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <polyline points="16 13 11 18 8 15"></polyline>
                        </svg>
                      }
                    />
                    
                    <div className="premium-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
                      {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "160px 0", gap: "16px" }}>
                          <div style={{ width: "24px", height: "24px", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                          <p style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "3px", fontSize: "11px", fontWeight: "600" }}>SYNCHRONIZING SECURE LEDGER...</p>
                          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                      ) : sorted.length === 0 ? (
                        <div style={{ 
                          textAlign: "center", 
                          padding: "80px 40px", 
                          background: "rgba(255,255,255,0.01)",
                          border: "1px dashed rgba(255,255,255,0.08)", 
                          borderRadius: "24px", 
                          marginTop: "4px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center"
                        }}>
                          <div style={{
                            width: "56px", height: "56px", borderRadius: "16px",
                            background: "rgba(255,255,255,0.04)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            marginBottom: "16px"
                          }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
                              <path d="M3 8l9 5 9-5" />
                              <path d="M12 13v8" />
                            </svg>
                          </div>
                          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "500", margin: 0 }}>No bookings records found matching current parameters.</p>
                        </div>
                      ) : (
                        <div className="booking-cards-grid" style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "4px" }}>
                          {sorted.map((b, index) => (
                            <div 
                              key={b.id} 
                              style={{ 
                                animation: `fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.03}s backwards` 
                              }}
                            >
                              <BookingCard 
                                booking={b} 
                                showUser={true} 
                                isSelected={selectedBookings.has(b.id)} 
                                onSelect={toggleSelectOne}
                              />
                            </div>
                          ))}
                          
                          {selectedBookings.size > 0 && (
                            <div className="admin-bulk-bar" style={{ position: "fixed", bottom: "32px", right: "32px", zIndex: 100, animation: "fadeIn 0.3s ease" }}>
                              <BulkActionBar 
                                selectedCount={selectedBookings.size} 
                                onConfirm={handleBulkAction} 
                                onClear={() => { setSelectedBookings(new Set()); setSelectAllMode(false); }} 
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── USERS ────────────────────────────────────── */}
              {activeNav === "users" && (
                <div className="admin-split-layout"
                  style={{ 
                    display: "flex", 
                    height: "100%", 
                    gap: "32px", 
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                >
                  {/* Global Keyframes and Layer Effects */}
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    .premium-input::placeholder { color: rgba(255, 255, 255, 0.35); }
                    .premium-scroll::-webkit-scrollbar { width: 6px; }
                    .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                    .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                    .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
                    .premium-select-wrapper::after {
                      content: '↓';
                      font-size: 10px;
                      color: rgba(255, 255, 255, 0.4);
                      position: absolute;
                      right: 16px;
                      top: 50%;
                      transform: translateY(-50%);
                      pointer-events: none;
                      transition: color 0.2s ease;
                    }
                    .premium-select-wrapper:hover::after { color: #6366f1; }
                    .action-pill-btn { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important; }
                    .action-pill-btn:hover { filter: brightness(1.2); transform: translateY(-1px); }
                    .action-pill-btn:active { transform: translateY(0); }
                    
                    /* Glass morphism user card - ADDED BLUR EFFECT */
                    .user-card-inner {
                      background: rgba(255, 255, 255, 0.03) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.08) !important;
                      border-radius: 14px !important;
                      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                      position: relative !important;
                      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
                    }
                    .user-card-inner:hover {
                      background: rgba(255, 255, 255, 0.06) !important;
                      transform: translateY(-2px) !important;
                      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99, 102, 241, 0.05) !important;
                      border-color: rgba(255, 255, 255, 0.15) !important;
                    }
                    
                    /* Glass morphism sidebar - ADDED BLUR EFFECT */
                    .users-sidebar {
                      background: none !important;
                      border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                      display: grid;
                      grid-template-rows: auto 1fr;
                      height: calc(100vh - 80px);
                      position: sticky;
                      top: 0;
                      overflow: hidden;
                      padding-right: 4px;
                      z-index: 100;
                    }
                    .users-sidebar-header {
                      background: none !important;
                      padding-bottom: 12px !important;
                      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                    }
                  `}</style>

                  {/* LEFT SIDEBAR - USER DIRECTORY FILTER MECHANISM */}
                  <div className="users-sidebar">
                    {/* STICKY HEADER */}
                    <div className="users-sidebar-header">
                      {/* KPIWidget - KEEP EMERALD GREEN */}
                      <div className="kpi-widget-sticky" style={{
                        background: "linear-gradient(135deg, #065f46 0%, #10b981 100%)",
                        padding: "16px", borderRadius: "16px", color: "#fff",
                        boxShadow: "0 8px 24px rgba(16,185,129,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>TOTAL ACCOUNTS</p>
                          <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>{users.length} Profiles</p>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Registered platform users</p>
                        </div>
                        <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                        </div>
                      </div>

                      {/* FILTER TOGGLE BUTTON */}
                      <button 
                        className="filter-toggle-btn"
                        onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 14px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          color: "rgba(255,255,255,0.6)",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "1px",
                          transition: "all 0.3s ease"
                        }}
                      >
                        <span>FILTER MEMBERSHIP</span>
                        <svg 
                          className={`toggle-icon ${isFiltersVisible ? 'open' : ''}`}
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{
                            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            transform: isFiltersVisible ? "rotate(180deg)" : "rotate(0deg)"
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                    </div>

                    {/* SCROLLABLE FILTERS */}
                    <div className="premium-scroll" style={{ 
                      overflowY: "auto",
                      overflowX: "hidden",
                      paddingRight: "2px",
                      paddingTop: "4px",
                      minHeight: 0
                    }}>
                      <div 
                        className={`filter-collapsible-wrapper ${isFiltersVisible ? '' : 'collapsed'}`}
                        style={{
                          overflow: "hidden",
                          transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          maxHeight: isFiltersVisible ? "800px" : "0"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {/* Search */}
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="7" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </svg>
                            </span>
                            <input 
                              className="premium-input"
                              placeholder="Search name, email, uid..." 
                              value={searchTerm} 
                              onChange={e => setSearchTerm(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                fontFamily: "inherit",
                                padding: "14px 16px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                outline: "none",
                                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)"
                              }} 
                              onFocus={e => { 
                                e.target.style.borderColor = "rgba(99, 102, 241, 0.6)"; 
                                e.target.style.background = "rgba(99, 102, 241, 0.15)";
                                e.target.style.boxShadow = "0 0 0 4px rgba(99, 102, 241, 0.15)";
                              }} 
                              onBlur={e => { 
                                e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"; 
                                e.target.style.background = "rgba(255, 255, 255, 0.03)";
                                e.target.style.boxShadow = "none";
                              }} 
                            />
                          </div>

                          {/* Car Model Filter */}
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="3" width="22" height="13" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="16" x2="12" y2="21"></line>
                              </svg>
                            </span>
                            <input 
                              className="premium-input"
                              placeholder="Filter by active car model..." 
                              value={filterCar} 
                              onChange={e => setFilterCar(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                fontFamily: "inherit",
                                padding: "14px 16px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                outline: "none",
                                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)"
                              }} 
                              onFocus={e => { 
                                e.target.style.borderColor = "rgba(129, 140, 248, 0.6)";
                                e.target.style.background = "rgba(255, 255, 255, 0.05)";
                              }}
                              onBlur={e => { 
                                e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
                                e.target.style.background = "rgba(255, 255, 255, 0.03)";
                              }}
                            />
                          </div>

                          {/* Account Type */}
                          <div className="premium-select-wrapper" style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 1, pointerEvents: "none", display: "flex" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                              </svg>
                            </span>
                            <select 
                              value={filterStatus} 
                              onChange={e => setFilterStatus(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                fontFamily: "inherit", 
                                padding: "14px 40px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                cursor: "pointer", 
                                outline: "none", 
                                appearance: "none",
                                transition: "all 0.25s ease"
                              }}
                              onFocus={e => e.target.style.borderColor = "rgba(168, 85, 247, 0.6)"}
                              onBlur={e => e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"}
                            >
                              <option value="" style={{ background: "#111", color: "#fff" }}>All Profile Account Types</option>
                              <option value="admin" style={{ background: "#111", color: "#fff" }}>System Administrators</option>
                              <option value="dealer" style={{ background: "#111", color: "#fff" }}>Merchant Dealers</option>
                              <option value="client" style={{ background: "#111", color: "#fff" }}>Standard Clients</option>
                            </select>
                            <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </span>
                          </div>

                          {/* Reset Button */}
                          {(searchTerm || filterCar || filterStatus) && (
                            <button 
                              onClick={() => { setSearchTerm(""); setFilterCar(""); setFilterStatus(""); }} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 16px", 
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                background: "rgba(239, 68, 68, 0.05)", 
                                border: "1px solid rgba(239, 68, 68, 0.25)", 
                                borderRadius: "14px", 
                                color: "#fca5a5", 
                                cursor: "pointer", 
                                fontWeight: "600", 
                                fontSize: "12.5px",
                                letterSpacing: "0.5px",
                                transition: "all 0.2s ease"
                              }}
                              onMouseEnter={e => {
                                e.target.style.background = "rgba(239, 68, 68, 0.12)";
                                e.target.style.borderColor = "rgba(239, 68, 68, 0.4)";
                              }}
                              onMouseLeave={e => {
                                e.target.style.background = "rgba(239, 68, 68, 0.05)";
                                e.target.style.borderColor = "rgba(239, 68, 68, 0.25)";
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                              RESET DIRECTORY FILTERS
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT CONTENT WORKSPACE (78% for asymmetric match) */}
                  <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* STEADY / NON-SCROLLING HEADER LAYER */}
                    <AdminSectionHeader
                      title="Customer Directory"
                      sub="Operational matrix monitoring connected active client ledgers"
                      badge="REALTIME RECONCILIATION"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      }
                    />

                    {/* CORE ACTIVE DIRECTORY VIEWPORT LIST */}
                    <div className="premium-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
                      {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "140px 0", gap: "16px" }}>
                          <div style={{ width: "24px", height: "24px", border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                          <p style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "2px", fontSize: "11px", fontWeight: "600" }}>LOADING SYSTEM DIRECTORY...</p>
                        </div>
                      ) : users.length === 0 ? (
                        <div style={{ 
                          textAlign: "center", 
                          padding: "80px 40px", 
                          background: "rgba(255,255,255,0.01)",
                          border: "1px dashed rgba(255,255,255,0.08)", 
                          borderRadius: "24px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center"
                        }}>
                          <div style={{
                            width: "56px", height: "56px", borderRadius: "16px",
                            background: "rgba(255,255,255,0.04)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            marginBottom: "16px"
                          }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                          </div>
                          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "500" }}>No user matching tracking variables found inside the index matrix.</p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {users
                            .filter(u => {
                              const matchesSearch = !searchTerm || 
                                (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                (u.uid && u.uid.toLowerCase().includes(searchTerm.toLowerCase()));
                              
                              const matchesStatus = !filterStatus ||
                                (filterStatus === "admin" && u.isAdmin) ||
                                (filterStatus === "dealer" && u.isDealer) ||
                                (filterStatus === "client" && !u.isAdmin && !u.isDealer);

                              return matchesSearch && matchesStatus;
                            })
                            .map((u, index) => {
                              const uBookings = bookings.filter(b => b.userId === u.uid || b.userEmail === u.email);
                              const cnt = uBookings.length;
                              const rev = uBookings.reduce((s, b) => s + (b.total || 0), 0);

                              return (
                                <div 
                                  key={u.id} 
                                  className="user-card-inner"
                                  onClick={() => viewUserBookings({ id: u.id, uid: u.uid, email: u.email, displayName: u.displayName || u.name || u.fullName || u.userName || "", isAdmin: u.isAdmin })}
                                  style={{ 
                                    display: "flex", 
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: "24px",
                                    padding: "14px 18px",
                                    width: "100%",
                                    animation: `fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.02}s backwards`
                                  }}
                                >
                                  {/* GROUP 1: Avatar + Name + Email + Role */}
                                  <div className="user-card-row-top" style={{ 
                                      display: "flex", alignItems: "center", gap: "14px",
                                      flex: "1 1 260px", minWidth: 0
                                    }}>
                                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0, background: u.isAdmin ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800", color: "#fff" }}>
                                      {(u.displayName || u.email || "?")[0].toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                        <span style={{ fontWeight: "700", color: "#fff", fontSize: "14px" }}>
                                          {u.displayName || "Anonymous Driver"}
                                        </span>
                                        <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "9px", fontWeight: "800", textTransform: "uppercase", background: u.isAdmin ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.04)", color: u.isAdmin ? "#fbbf24" : "rgba(255,255,255,0.4)", border: u.isAdmin ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(255,255,255,0.08)" }}>
                                          {u.isAdmin ? "✦ Admin" : "Verified"}
                                        </span>
                                      </div>
                                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace", wordBreak: "break-all" }}>{u.email}</p>
                                    </div>
                                  </div>

                                  {/* GROUP 2: Stats */}
                                  <div className="user-card-row-stats" style={{ 
                                    display: "flex", alignItems: "center", gap: "32px",
                                    flexShrink: 0,
                                    borderLeft: "1px solid rgba(255,255,255,0.06)",
                                    paddingLeft: "24px"
                                  }} onClick={e => e.stopPropagation()}>
                                    <div>
                                      <p style={{ margin: "0 0 2px 0", fontSize: "9px", color: "rgba(255,255,255,0.3)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Activity</p>
                                      <p style={{ margin: 0, fontSize: "14px", color: "#fff", fontWeight: "700" }}>{cnt} <span style={{ fontSize: "12px", fontWeight: "400", opacity: 0.5 }}>Bookings</span></p>
                                    </div>
                                    <div>
                                      <p style={{ margin: "0 0 2px 0", fontSize: "9px", color: "rgba(255,255,255,0.3)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Lifetime Rev</p>
                                      <p style={{ margin: 0, fontSize: "15px", color: "#10b981", fontWeight: "800" }}>${rev.toLocaleString()}</p>
                                    </div>
                                  </div>

                                  {/* GROUP 3: Actions */}
                                  <div className="user-card-row-actions" style={{ 
                                    display: "flex", alignItems: "center", gap: "10px",
                                    flexShrink: 0,
                                    borderLeft: "1px solid rgba(255,255,255,0.06)",
                                    paddingLeft: "24px"
                                  }} onClick={e => e.stopPropagation()}>
                                    {/* Bookings button */}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        viewUserBookings({ id: u.id, uid: u.uid, email: u.email, displayName: u.displayName || u.name || u.fullName || u.userName || "", isAdmin: u.isAdmin });
                                      }} 
                                      style={{ 
                                        padding: "7px 16px", 
                                        borderRadius: "8px", 
                                        border: "1px solid rgba(255,255,255,0.1)", 
                                        background: "rgba(255,255,255,0.03)", 
                                        color: "#fff", 
                                        cursor: "pointer", 
                                        fontWeight: "700", 
                                        fontSize: "11px", 
                                        fontFamily: "inherit",
                                        transition: "all 0.2s ease",
                                        whiteSpace: "nowrap"
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#000"; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "#fff"; }}
                                    >
                                      BOOKINGS
                                    </button>

                                    {/* Suspend button */}
                                    <PermissionGuard permission={PERMISSIONS.SUSPEND_USER}>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if(confirm(`Suspend user ${u.email}?`)){const reason=prompt("Reason for suspension:");if(reason)handleUserAction(u,"suspend",reason);}
                                        }} 
                                        style={{ 
                                          padding: "7px 14px", 
                                          background: "rgba(239,68,68,0.06)", 
                                          border: "1px solid rgba(239,68,68,0.2)", 
                                          borderRadius: "8px", 
                                          color: "#f87171", 
                                          cursor: "pointer", 
                                          fontSize: "11px", 
                                          fontWeight: "700", 
                                          fontFamily: "inherit",
                                          whiteSpace: "nowrap",
                                          transition: "all 0.2s ease"
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
                                      >
                                        Suspend
                                      </button>
                                    </PermissionGuard>

                                    {/* Make Dealer OR Revoke Dealer button */}
                                    {u.isDealer ? (
                                      <PermissionGuard permission={PERMISSIONS.EDIT_USER}>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if(confirm(`Remove dealer status from ${u.email}?`))handleUserAction(u,"remove_dealer");
                                          }} 
                                          style={{ 
                                            padding: "7px 14px", 
                                            background: "rgba(245,158,11,0.06)", 
                                            border: "1px solid rgba(245,158,11,0.2)", 
                                            borderRadius: "8px", 
                                            color: "#fbbf24", 
                                            cursor: "pointer", 
                                            fontSize: "11px", 
                                            fontWeight: "700", 
                                            fontFamily: "inherit",
                                            whiteSpace: "nowrap",
                                            transition: "all 0.2s ease"
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.12)"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)"; }}
                                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.06)"; e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)"; }}
                                        >
                                          Revoke Dealer
                                        </button>
                                      </PermissionGuard>
                                    ) : (
                                      <PermissionGuard permission={PERMISSIONS.EDIT_USER}>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if(confirm(`Make ${u.email} a dealer?`))handleUserAction(u,"make_dealer");
                                          }} 
                                          style={{ 
                                            padding: "7px 14px", 
                                            background: "rgba(34,197,94,0.06)", 
                                            border: "1px solid rgba(34,197,94,0.2)", 
                                            borderRadius: "8px", 
                                            color: "#34d399", 
                                            cursor: "pointer", 
                                            fontSize: "11px", 
                                            fontWeight: "700", 
                                            fontFamily: "inherit",
                                            whiteSpace: "nowrap",
                                            transition: "all 0.2s ease"
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(34,197,94,0.12)"; e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)"; }}
                                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(34,197,94,0.06)"; e.currentTarget.style.borderColor = "rgba(34,197,94,0.2)"; }}
                                        >
                                          Make Dealer
                                        </button>
                                      </PermissionGuard>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── DEALERS ──────────────────────────────────── */}
              {activeNav === "dealers" && (
                <div className="admin-split-layout"
                  style={{
                    display: "flex",
                    height: "100%",
                    gap: "32px",
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    position: "relative",
                  }}
                >
                  {(() => {
                    // ─── DEALER FILTERING ───
                    const filtered = dealers.filter(d => {
                      const matchStatus = filterStatus === "all" || d.status === filterStatus;
                      const matchSearch = !search || 
                        d.businessName?.toLowerCase().includes(search.toLowerCase()) || 
                        d.ownerEmail?.toLowerCase().includes(search.toLowerCase()) || 
                        d.city?.toLowerCase().includes(search.toLowerCase());
                      return matchStatus && matchSearch;
                    });

                    const counts = { 
                      total: dealers.length, 
                      approved: dealers.filter(d => d.status === "approved").length, 
                      pending: dealers.filter(d => d.status === "pending").length, 
                      suspended: dealers.filter(d => d.status === "suspended").length 
                    };

                    return (
                      <>
                        <style>{`
                          @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(8px); }
                            to { opacity: 1; transform: translateY(0); }
                          }
                          @keyframes dealersDrift1 {
                            0%, 100% { transform: translate(0, 0) scale(1); }
                            50%      { transform: translate(30px, -24px) scale(1.08); }
                          }
                          @keyframes dealersDrift2 {
                            0%, 100% { transform: translate(0, 0) scale(1); }
                            50%      { transform: translate(-24px, 26px) scale(1.05); }
                          }
                          @keyframes dealersShimmerSweep {
                            0%   { transform: translateX(-120%) skewX(-15deg); }
                            100% { transform: translateX(220%) skewX(-15deg); }
                          }
                          @keyframes dealersPulseGlow {
                            0%, 100% { opacity: 0.5; }
                            50%      { opacity: 1; }
                          }
                          @keyframes dealersSpin { to { transform: rotate(360deg); } }

                          .dealers-bg-glow-a, .dealers-bg-glow-b {
                            position: absolute !important;
                            border-radius: 50%;
                            pointer-events: none;
                            z-index: 0;
                            filter: blur(70px);
                          }
                          .dealers-bg-glow-a {
                            width: 460px; height: 460px; top: -160px; left: -60px;
                            background: radial-gradient(circle, rgba(244,63,94,0.13) 0%, transparent 70%);
                            animation: dealersDrift1 17s ease-in-out infinite;
                          }
                          .dealers-bg-glow-b {
                            width: 400px; height: 400px; bottom: -160px; right: -80px;
                            background: radial-gradient(circle, rgba(159,18,57,0.12) 0%, transparent 70%);
                            animation: dealersDrift2 19s ease-in-out infinite;
                          }
                          .admin-split-layout > * { position: relative; z-index: 1; }

                          .premium-input::placeholder { color: rgba(255, 255, 255, 0.35); }
                          .premium-scroll::-webkit-scrollbar { width: 6px; }
                          .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                          .premium-scroll::-webkit-scrollbar-thumb { background: rgba(244,63,94,0.16); border-radius: 10px; }
                          .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(244,63,94,0.3); }

                          /* Glass morphism dealer card */
                          .dealer-card {
                            background: rgba(255, 255, 255, 0.028) !important;
                            backdrop-filter: blur(14px) !important;
                            -webkit-backdrop-filter: blur(14px) !important;
                            border: 1px solid rgba(255, 255, 255, 0.08) !important;
                            border-left: 3px solid #f43f5e !important;
                            border-radius: 14px !important;
                            padding: 16px 20px !important;
                            cursor: pointer !important;
                            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
                            position: relative !important;
                            overflow: hidden !important;
                          }
                          .dealer-card::before {
                            content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
                            background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.05) 48%, transparent 66%);
                            transform: translateX(-120%) skewX(-15deg);
                          }
                          .dealer-card:hover::before { animation: dealersShimmerSweep 1.1s ease; }
                          .dealer-card:hover {
                            background: rgba(255, 255, 255, 0.055) !important;
                            border-color: rgba(255, 255, 255, 0.16) !important;
                            border-left-color: #fb7185 !important;
                            transform: translateY(-3px) !important;
                            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.32), 0 0 26px rgba(244,63,94,0.12) !important;
                          }
                          .dealer-card > * { position: relative; z-index: 1; }

                          /* Sidebar — NO backdrop-filter on this element: it's position:sticky,
                            and blur + sticky on the same element renders as a solid block in
                            some browsers instead of actually blurring. This was the bug. */
                          .dealers-sidebar {
                            background: none !important;
                            border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                          }

                          /* Header is NOT the sticky-conflict element, so it can safely keep blur */
                          .dealers-sidebar-header {
                            background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
                            backdrop-filter: blur(12px) !important;
                            -webkit-backdrop-filter: blur(12px) !important;
                          }

                          .filter-toggle-btn {
                            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                          }
                          .filter-toggle-btn:hover {
                            background: rgba(244,63,94,0.08) !important;
                            border-color: rgba(244,63,94,0.25) !important;
                            color: rgba(255,255,255,0.85) !important;
                          }

                          .dealers-sidebar .premium-scroll {
                            background: transparent !important;
                          }
                          .dealers-sidebar .premium-scroll .filter-collapsible-wrapper {
                            background: transparent !important;
                          }

                          .stat-item-premium { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important; }

                          .dealers-quick-stats {
                            position: relative; overflow: hidden;
                          }
                          .dealers-quick-stats::before {
                            content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
                            background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%);
                            transform: translateX(-140%) skewX(-15deg);
                          }
                          .dealers-quick-stats:hover::before { animation: dealersShimmerSweep 1.3s ease; }

                          .dealers-action-card {
                            position: relative; overflow: hidden;
                            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                          }
                          .dealers-action-card::after {
                            content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
                            background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
                            transform: translateX(-140%) skewX(-15deg);
                          }
                          .dealers-action-card:hover::after { animation: dealersShimmerSweep 0.9s ease; }

                          .premium-input, .premium-select-wrapper select {
                            backdrop-filter: blur(6px);
                            -webkit-backdrop-filter: blur(6px);
                          }

                          .dealers-spin {
                            width: 24px; height: 24px;
                            border: 2px solid rgba(255,255,255,0.1);
                            border-top-color: #f43f5e;
                            border-radius: 50%;
                            animation: dealersSpin 0.8s linear infinite;
                          }

                          @media (prefers-reduced-motion: reduce) {
                            .dealer-card, .dealers-bg-glow-a, .dealers-bg-glow-b, .dealers-quick-stats::before,
                            .dealers-action-card::after, .dealers-spin { animation: none !important; transition: none !important; }
                          }

                          /* ─── MOBILE RESPONSIVE OVERRIDES ─── */
                          @media (max-width: 767px) {
                            /* Stats collapsible wrapper */
                            .dealer-stats-collapsible {
                              background: rgba(255, 255, 255, 0.02) !important;
                              border: 1px solid rgba(255, 255, 255, 0.06) !important;
                              border-radius: 14px !important;
                              padding: 8px !important;
                              margin-bottom: 10px !important;
                            }
                            
                            .dealer-stats-toggle {
                              display: flex !important;
                              align-items: center !important;
                              justify-content: space-between !important;
                              width: 100% !important;
                              padding: 10px 12px !important;
                              background: transparent !important;
                              border: none !important;
                              color: #fff !important;
                              font-weight: 700 !important;
                              font-size: 13px !important;
                              cursor: pointer !important;
                              font-family: 'Quicksand', sans-serif !important;
                              letter-spacing: 1px !important;
                            }
                            
                            .dealer-stats-grid {
                              display: grid !important;
                              grid-template-columns: repeat(2, 1fr) !important;
                              gap: 6px !important;
                              padding: 6px 2px !important;
                            }
                            
                            .dealer-stat-item {
                              background: rgba(255, 255, 255, 0.02) !important;
                              border: 1px solid rgba(255, 255, 255, 0.05) !important;
                              border-radius: 10px !important;
                              padding: 8px !important;
                              text-align: center !important;
                            }
                            
                            .dealer-stat-item .stat-value {
                              font-size: 18px !important;
                              font-weight: 800 !important;
                              color: #fff !important;
                            }
                            
                            .dealer-stat-item .stat-label {
                              font-size: 9px !important;
                              color: rgba(255, 255, 255, 0.4) !important;
                              text-transform: uppercase !important;
                              letter-spacing: 0.5px !important;
                              font-weight: 700 !important;
                            }
                            
                            /* Add Dealer button inside stats wrapper */
                            .dealer-add-btn-mobile {
                              width: 100% !important;
                              padding: 12px !important;
                              margin-top: 8px !important;
                              background: linear-gradient(135deg, #9f1239, #f43f5e) !important;
                              border: none !important;
                              border-radius: 12px !important;
                              color: #fff !important;
                              font-weight: 700 !important;
                              font-size: 13px !important;
                              cursor: pointer !important;
                              font-family: 'Quicksand', sans-serif !important;
                              display: flex !important;
                              align-items: center !important;
                              justify-content: center !important;
                              gap: 8px !important;
                              transition: all 0.2s ease !important;
                              box-shadow: 0 4px 16px rgba(244,63,94,0.25) !important;
                            }
                            
                            /* Performance & Commission buttons side by side */
                            .dealer-action-buttons-row {
                              display: grid !important;
                              grid-template-columns: 1fr 1fr !important;
                              gap: 8px !important;
                              margin-top: 8px !important;
                            }
                            
                            .dealer-action-buttons-row button {
                              padding: 10px !important;
                              border-radius: 12px !important;
                              font-size: 11px !important;
                              font-weight: 700 !important;
                              font-family: 'Quicksand', sans-serif !important;
                              cursor: pointer !important;
                              transition: all 0.2s ease !important;
                              border: none !important;
                            }
                            
                            .dealer-action-btn-performance {
                              background: rgba(168,85,247,0.08) !important;
                              border: 1px solid rgba(168,85,247,0.2) !important;
                              color: #c084fc !important;
                            }
                            
                            .dealer-action-btn-commission {
                              background: rgba(34,197,94,0.08) !important;
                              border: 1px solid rgba(34,197,94,0.2) !important;
                              color: #4ade80 !important;
                            }

                            /* Hide desktop stats, show mobile collapsible */
                            .dealers-quick-stats-desktop {
                              display: none !important;
                            }
                            
                            .dealers-quick-stats-mobile {
                              display: block !important;
                            }

                            /* Dealer card buttons - single row fix */
                            .dealer-card .dealer-card-actions {
                              display: flex !important;
                              flex-wrap: nowrap !important;
                              gap: 4px !important;
                              overflow-x: auto !important;
                              -webkit-overflow-scrolling: touch !important;
                              padding: 2px 0 !important;
                              scrollbar-width: none !important;
                            }
                            
                            .dealer-card .dealer-card-actions::-webkit-scrollbar {
                              display: none !important;
                            }
                            
                            .dealer-card .dealer-card-actions button {
                              flex: 0 0 auto !important;
                              padding: 5px 8px !important;
                              font-size: 8px !important;
                              white-space: nowrap !important;
                              min-width: 0 !important;
                              flex-shrink: 0 !important;
                              letter-spacing: 0.3px !important;
                            }
                            
                            .dealer-card .dealer-card-actions .dealer-card-btn-delete {
                              flex: 0 0 auto !important;
                              padding: 5px 7px !important;
                              font-size: 10px !important;
                            }

                            .dealer-card .dealer-card-actions button svg {
                              width: 9px !important;
                              height: 9px !important;
                            }

                            /* Dealer card layout on mobile */
                            .dealer-card {
                              flex-direction: column !important;
                              gap: 10px !important;
                              padding: 12px 14px !important;
                            }

                            .dealer-card .dealer-card-left {
                              flex: 1 1 100% !important;
                              min-width: 0 !important;
                            }

                            .dealer-card .dealer-card-right {
                              flex: 1 1 100% !important;
                              min-width: 0 !important;
                            }

                            .dealer-card .dealer-stats-row {
                              grid-template-columns: repeat(4, 1fr) !important;
                              gap: 4px !important;
                              padding: 6px 0 !important;
                            }

                            .dealer-card .dealer-stats-row .stat-item {
                              padding: 4px !important;
                            }

                            .dealer-card .dealer-stats-row .stat-item .stat-label {
                              font-size: 7px !important;
                              letter-spacing: 0.3px !important;
                            }

                            .dealer-card .dealer-stats-row .stat-item .stat-value {
                              font-size: 13px !important;
                            }

                            .dealer-card .dealer-info {
                              flex: 1 1 100% !important;
                              min-width: 0 !important;
                            }

                            .dealer-card .dealer-avatar {
                              width: 36px !important;
                              height: 36px !important;
                              font-size: 14px !important;
                            }

                            .dealer-card .dealer-name {
                              font-size: 13px !important;
                            }

                            .dealer-card .dealer-detail-text {
                              font-size: 10px !important;
                            }

                            /* Filter section on mobile */
                            .dealers-sidebar {
                              flex: 0 0 100% !important;
                              height: auto !important;
                              position: relative !important;
                              padding-right: 0 !important;
                            }

                            .dealers-sidebar-header {
                              position: relative !important;
                            }

                            .admin-split-layout {
                              flex-direction: column !important;
                              gap: 16px !important;
                              padding: 12px !important;
                            }

                            .admin-content-area {
                              flex: 0 0 100% !important;
                              height: auto !important;
                              overflow: visible !important;
                              padding: 0 !important;
                            }

                            .premium-scroll {
                              overflow-y: visible !important;
                              max-height: none !important;
                            }
                          }

                          @media (max-width: 479px) {
                            .dealer-card .dealer-card-actions button {
                              padding: 4px 6px !important;
                              font-size: 7px !important;
                            }

                            .dealer-card .dealer-stats-row .stat-item .stat-value {
                              font-size: 11px !important;
                            }

                            .dealer-card .dealer-name {
                              font-size: 12px !important;
                            }

                            .dealer-card .dealer-detail-text {
                              font-size: 9px !important;
                            }

                            .dealer-card .dealer-avatar {
                              width: 30px !important;
                              height: 30px !important;
                              font-size: 12px !important;
                            }

                            .dealer-stats-grid {
                              grid-template-columns: 1fr 1fr !important;
                              gap: 4px !important;
                            }

                            .dealer-stat-item {
                              padding: 6px !important;
                            }

                            .dealer-stat-item .stat-value {
                              font-size: 15px !important;
                            }

                            .dealer-action-buttons-row {
                              grid-template-columns: 1fr 1fr !important;
                              gap: 6px !important;
                            }

                            .dealer-action-buttons-row button {
                              font-size: 10px !important;
                              padding: 8px !important;
                            }
                          }
                        `}</style>

                        <div className="dealers-bg-glow-a" />
                        <div className="dealers-bg-glow-b" />

                        {/* ─── LEFT SIDEBAR - 22% ────────────────────────────── */}
                        <div
                          className="dealers-sidebar"
                          style={{
                            display: "grid",
                            gridTemplateRows: "auto 1fr",
                            height: "calc(100vh - 80px)",
                            position: "sticky",
                            top: 0,
                            overflowX: "visible",
                            overflowY: "hidden",
                            paddingRight: "14px",
                            boxSizing: "border-box",
                            flex: "0 0 22%",
                            zIndex: 100
                          }}
                        >
                          {/* STICKY HEADER */}
                          <div
                            className="dealers-sidebar-header"
                            style={{
                              position: "sticky",
                              top: 0,
                              zIndex: 9999,
                              paddingBottom: "12px",
                              paddingRight: "2px",
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              flexShrink: 0
                            }}
                          >
                            {/* KPI Widget - ROSE PINK */}
                            <div className="kpi-widget-sticky" style={{
                              background: "linear-gradient(135deg, #9f1239 0%, #f43f5e 100%)",
                              padding: "16px",
                              borderRadius: "16px",
                              color: "#fff",
                              boxShadow: "0 8px 24px rgba(244,63,94,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "12px"
                            }}>
                              <div>
                                <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>MERCHANT NETWORK</p>
                                <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>{dealers.length} Firms</p>
                                <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Active dealer partners</p>
                              </div>
                              <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                                  <line x1="9" y1="22" x2="9" y2="16" />
                                  <line x1="15" y1="22" x2="15" y2="16" />
                                  <line x1="9" y1="16" x2="15" y2="16" />
                                  <path d="M8 6h8M8 10h8" />
                                </svg>
                              </div>
                            </div>

                            {/* ─── DESKTOP QUICK STATS ─── */}
                            <div className="dealers-quick-stats-desktop" style={{ marginBottom: "20px" }}>
                              <div className="dealers-quick-stats" style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                                background: "rgba(255,255,255,0.045)",
                                backdropFilter: "blur(10px)",
                                WebkitBackdropFilter: "blur(10px)",
                                borderRadius: "14px",
                                border: "1px solid rgba(255,255,255,0.08)",
                                marginBottom: "10px",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
                              }}>
                                {[
                                  { 
                                    label: "Total Dealers", 
                                    value: counts.total, 
                                    color: "#f43f5e",
                                    icon: (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                                      </svg>
                                    )
                                  },
                                  { 
                                    label: "Approved", 
                                    value: counts.approved, 
                                    color: "#f43f5e",
                                    icon: (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                        <polyline points="22 4 12 14.01 9 11.01"/>
                                      </svg>
                                    )
                                  },
                                  { 
                                    label: "Pending", 
                                    value: counts.pending, 
                                    color: "#f43f5e",
                                    icon: (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                      </svg>
                                    )
                                  },
                                  { 
                                    label: "Suspended", 
                                    value: counts.suspended, 
                                    color: "#ef4444",
                                    icon: (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"/>
                                        <line x1="15" y1="9" x2="9" y2="15"/>
                                        <line x1="9" y1="9" x2="15" y2="15"/>
                                      </svg>
                                    )
                                  },
                                ].map(({ label, value, color, icon }) => (
                                  <div 
                                    key={label} 
                                    className="stat-item stat-item-premium"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "12px",
                                      padding: "6px 12px",
                                      borderRadius: "10px",
                                      background: "transparent",
                                      border: "none",
                                      borderLeft: "3px solid transparent",
                                      cursor: "default",
                                      position: "relative",
                                      zIndex: 1
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                                      e.currentTarget.style.borderLeftColor = color;
                                      e.currentTarget.style.transform = "translateX(3px)";
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.background = "transparent";
                                      e.currentTarget.style.borderLeftColor = "transparent";
                                      e.currentTarget.style.transform = "translateX(0)";
                                    }}
                                  >
                                    <div style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "8px",
                                      background: `rgba(255,255,255,0.03)`,
                                      color: color,
                                      flexShrink: 0,
                                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.background = `${color}18`;
                                      e.currentTarget.style.transform = "scale(1.1)";
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                                      e.currentTarget.style.transform = "scale(1)";
                                    }}>
                                      {icon}
                                    </div>
                                    
                                    <span style={{
                                      flex: 1,
                                      color: "rgba(255,255,255,0.5)",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      letterSpacing: "0.3px",
                                      transition: "color 0.25s ease"
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.color = "rgba(255,255,255,0.78)";
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                                    }}>
                                      {label}
                                    </span>
                                    
                                    <span style={{
                                      color: color,
                                      fontSize: "16px",
                                      fontWeight: "800",
                                      letterSpacing: "-0.3px",
                                      minWidth: "24px",
                                    }}>
                                      {value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* ─── MOBILE COLLAPSIBLE STATS ─── */}
                            <div className="dealers-quick-stats-mobile" style={{ display: "none", marginBottom: "12px" }}>
                              <div className="dealer-stats-collapsible">
                                <button 
                                  className="dealer-stats-toggle"
                                  onClick={() => {
                                    const wrapper = document.querySelector('.dealer-stats-collapsible .dealer-stats-content');
                                    if (wrapper) {
                                      const isOpen = wrapper.style.maxHeight !== '0px';
                                      wrapper.style.maxHeight = isOpen ? '0px' : '500px';
                                      wrapper.style.opacity = isOpen ? '0' : '1';
                                      const icon = wrapper.parentElement.querySelector('.stats-toggle-icon');
                                      if (icon) {
                                        icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                                      }
                                    }
                                  }}
                                >
                                  <span>📊 DEALER STATISTICS</span>
                                  <svg className="stats-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.3s ease" }}>
                                    <polyline points="6 9 12 15 18 9"/>
                                  </svg>
                                </button>
                                
                                <div className="dealer-stats-content" style={{ maxHeight: "0px", overflow: "hidden", opacity: "0", transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease" }}>
                                  <div className="dealer-stats-grid">
                                    {[
                                      { label: "Total", value: counts.total, color: "#f43f5e" },
                                      { label: "Approved", value: counts.approved, color: "#22c55e" },
                                      { label: "Pending", value: counts.pending, color: "#f59e0b" },
                                      { label: "Suspended", value: counts.suspended, color: "#ef4444" },
                                    ].map(({ label, value, color }) => (
                                      <div key={label} className="dealer-stat-item">
                                        <div className="stat-value" style={{ color }}>{value}</div>
                                        <div className="stat-label">{label}</div>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Add Dealer Button inside stats */}
                                  <button
                                    className="dealer-add-btn-mobile"
                                    onClick={() => setShowAddDealer(true)}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="12" y1="5" x2="12" y2="19"/>
                                      <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                    Add Dealer
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* ─── DESKTOP PERFORMANCE & COMMISSION ─── */}
                            <div className="dealers-quick-stats-desktop" style={{ marginBottom: "10px" }}>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  className="dealers-action-card"
                                  onClick={() => setShowPerformance(true)}
                                  style={{
                                    flex: 1,
                                    padding: "10px 14px",
                                    borderRadius: "10px",
                                    background: "rgba(168,85,247,0.08)",
                                    border: "1px solid rgba(168,85,247,0.2)",
                                    color: "#c084fc",
                                    fontWeight: "700",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    letterSpacing: "0.3px",
                                    textTransform: "uppercase",
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = "rgba(168,85,247,0.16)";
                                    e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)";
                                    e.currentTarget.style.color = "#d8b4fe";
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(168,85,247,0.2)";
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = "rgba(168,85,247,0.08)";
                                    e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)";
                                    e.currentTarget.style.color = "#c084fc";
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                                    <polyline points="17 6 23 6 23 12"/>
                                  </svg>
                                  Performance
                                </button>
                                
                                <button
                                  className="dealers-action-card"
                                  onClick={() => setShowCommission(true)}
                                  style={{
                                    flex: 1,
                                    padding: "10px 14px",
                                    borderRadius: "10px",
                                    background: "rgba(34,197,94,0.08)",
                                    border: "1px solid rgba(34,197,94,0.2)",
                                    color: "#4ade80",
                                    fontWeight: "700",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    letterSpacing: "0.3px",
                                    textTransform: "uppercase",
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = "rgba(34,197,94,0.16)";
                                    e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
                                    e.currentTarget.style.color = "#86efac";
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(34,197,94,0.2)";
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = "rgba(34,197,94,0.08)";
                                    e.currentTarget.style.borderColor = "rgba(34,197,94,0.2)";
                                    e.currentTarget.style.color = "#4ade80";
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                  </svg>
                                  Commission
                                </button>
                              </div>
                            </div>

                            {/* ─── MOBILE PERFORMANCE & COMMISSION ─── */}
                            <div className="dealers-quick-stats-mobile" style={{ display: "none", marginBottom: "10px" }}>
                              <div className="dealer-action-buttons-row">
                                <button
                                  className="dealer-action-btn-performance"
                                  onClick={() => setShowPerformance(true)}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                                    <polyline points="17 6 23 6 23 12"/>
                                  </svg>
                                  Performance
                                </button>
                                
                                <button
                                  className="dealer-action-btn-commission"
                                  onClick={() => setShowCommission(true)}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                  </svg>
                                  Commission
                                </button>
                              </div>
                            </div>

                            {/* FILTER TOGGLE BUTTON */}
                            <button
                              className="filter-toggle-btn"
                              onClick={() => {
                                setIsFiltersVisible(!isFiltersVisible);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                                padding: "10px 14px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "12px",
                                color: "rgba(255,255,255,0.6)",
                                cursor: "pointer",
                                fontFamily: "'Quicksand', sans-serif",
                                fontSize: "12px",
                                fontWeight: "700",
                                letterSpacing: "1px",
                              }}
                            >
                              <span>FILTER & SEARCH</span>
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
                                  transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                  transform: isFiltersVisible ? "rotate(180deg)" : "rotate(0deg)"
                                }}
                              >
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </button>
                          </div>

                          {/* SCROLLABLE FILTERS */}
                          <div className="premium-scroll" style={{
                            overflowY: "auto",
                            overflowX: "hidden",
                            minHeight: 0,
                            background: "transparent",
                            paddingRight: "10px",
                            paddingTop: "4px",
                            flex: 1,
                            zIndex: 1,
                            position: "relative"
                          }}>
                            {/* COLLAPSIBLE WRAPPER */}
                            <div
                              className={`filter-collapsible-wrapper ${isFiltersVisible ? '' : 'collapsed'}`}
                              style={{
                                overflow: "hidden",
                                transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
                                maxHeight: isFiltersVisible ? "800px" : "0",
                                opacity: isFiltersVisible ? 1 : 0,
                                pointerEvents: isFiltersVisible ? "auto" : "none"
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {/* Search */}
                                <div style={{ position: "relative" }}>
                                  <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", opacity: 0.4, display: "flex", alignItems: "center" }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="11" cy="11" r="8"/>
                                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                    </svg>
                                  </span>
                                  <input
                                    className="premium-input"
                                    placeholder="Search name, email, city..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{
                                      width: "100%",
                                      fontFamily: "'Quicksand', sans-serif",
                                      padding: "14px 16px 14px 44px",
                                      background: "rgba(255, 255, 255, 0.03)",
                                      border: "1px solid rgba(255, 255, 255, 0.08)",
                                      borderRadius: "14px",
                                      color: "#fff",
                                      fontSize: "13.5px",
                                      outline: "none",
                                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                      boxSizing: "border-box"
                                    }}
                                    onFocus={e => { e.target.style.borderColor = "rgba(244,63,94,0.6)"; e.target.style.background = "rgba(255, 255, 255, 0.06)"; e.target.style.boxShadow = "0 0 0 4px rgba(244,63,94,0.1)"; }}
                                    onBlur={e => { e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"; e.target.style.background = "rgba(255, 255, 255, 0.03)"; e.target.style.boxShadow = "none"; }}
                                  />
                                </div>

                                {/* Status Filter */}
                                <div className="premium-select-wrapper" style={{ position: "relative" }}>
                                  <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 1, opacity: 0.4, display: "flex", alignItems: "center" }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                      <line x1="16" y1="2" x2="16" y2="6"/>
                                      <line x1="8" y1="2" x2="8" y2="6"/>
                                      <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                  </span>
                                  <select
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                    style={{
                                      width: "100%",
                                      fontFamily: "'Quicksand', sans-serif",
                                      padding: "14px 40px 14px 44px",
                                      background: "rgba(255, 255, 255, 0.03)",
                                      border: "1px solid rgba(255, 255, 255, 0.08)",
                                      borderRadius: "14px",
                                      color: "#fff",
                                      fontSize: "13.5px",
                                      cursor: "pointer",
                                      outline: "none",
                                      appearance: "none",
                                      transition: "all 0.25s ease",
                                      boxSizing: "border-box"
                                    }}
                                    onFocus={e => { e.target.style.borderColor = "rgba(244,63,94,0.6)"; e.target.style.boxShadow = "0 0 0 4px rgba(244,63,94,0.1)"; }}
                                    onBlur={e => { e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"; e.target.style.boxShadow = "none"; }}
                                  >
                                    <option value="all" style={{ background: "#111" }}>All Statuses</option>
                                    <option value="approved" style={{ background: "#111" }}>Approved</option>
                                    <option value="pending" style={{ background: "#111" }}>Pending</option>
                                    <option value="suspended" style={{ background: "#111" }}>Suspended</option>
                                    <option value="rejected" style={{ background: "#111" }}>Rejected</option>
                                  </select>
                                </div>

                                {/* Reset Button */}
                                {(search || filterStatus !== "all") && (
                                  <button
                                    onClick={() => { setSearch(""); setFilterStatus("all"); }}
                                    style={{
                                      width: "100%",
                                      padding: "12px 16px",
                                      background: "rgba(239, 68, 68, 0.05)",
                                      border: "1px solid rgba(239, 68, 68, 0.25)",
                                      borderRadius: "12px",
                                      color: "#fca5a5",
                                      cursor: "pointer",
                                      fontWeight: "700",
                                      fontSize: "11px",
                                      letterSpacing: "0.5px",
                                      fontFamily: "'Quicksand', sans-serif",
                                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                                    }}
                                    onMouseEnter={e => { e.target.style.background = "rgba(239, 68, 68, 0.12)"; e.target.style.borderColor = "rgba(239, 68, 68, 0.4)"; e.target.style.transform = "translateY(-1px)"; }}
                                    onMouseLeave={e => { e.target.style.background = "rgba(239, 68, 68, 0.05)"; e.target.style.borderColor = "rgba(239, 68, 68, 0.25)"; e.target.style.transform = "translateY(0)"; }}
                                  >
                                    RESET FILTERS
                                  </button>
                                )}

                                {/* Pending Alert */}
                                {counts.pending > 0 && (
                                  <div style={{
                                    padding: "10px 14px",
                                    background: "rgba(245,158,11,0.08)",
                                    border: "1px solid rgba(245,158,11,0.25)",
                                    borderRadius: "10px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    flexShrink: 0,
                                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)"; e.currentTarget.style.background = "rgba(245,158,11,0.12)"; }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.25)"; e.currentTarget.style.background = "rgba(245,158,11,0.08)"; }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                    <div>
                                      <p style={{ margin: 0, color: "#f59e0b", fontSize: "11px", fontWeight: "700" }}>{counts.pending} Pending</p>
                                      <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.3)", fontSize: "8px" }}>Awaiting review</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ─── RIGHT CONTENT - 78% ────────────────────────────── */}
                        <div className="admin-content-area" style={{
                          flex: "0 0 78%",
                          display: "flex",
                          flexDirection: "column",
                          height: "100%",
                          overflow: "hidden"
                        }}>

                          {/* HEADER */}
                          <AdminSectionHeader
                            title="Dealer Directory"
                            sub="Complete merchant partner network with real-time status tracking and performance metrics"
                            badge="MERCHANT NETWORK"
                            icon={
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                              </svg>
                            }
                          />

                          {/* DEALER LIST */}
                          <div className="premium-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px", background: "transparent" }}>
                            {loading ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "140px 0", gap: "16px" }}>
                                <div className="dealers-spin" />
                                <p style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "2px", fontSize: "11px", fontWeight: "600", fontFamily: "'Quicksand', sans-serif" }}>LOADING DEALER DIRECTORY...</p>
                              </div>
                            ) : filtered.length === 0 ? (
                              <div style={{
                                textAlign: "center",
                                padding: "80px 40px",
                                background: "rgba(255,255,255,0.015)",
                                backdropFilter: "blur(8px)",
                                border: "1px dashed rgba(255,255,255,0.09)",
                                borderRadius: "24px",
                                marginTop: "4px"
                              }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" style={{ marginBottom: "16px" }}>
                                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                                  <line x1="9" y1="22" x2="9" y2="16"/>
                                  <line x1="15" y1="22" x2="15" y2="16"/>
                                  <line x1="9" y1="16" x2="15" y2="16"/>
                                  <path d="M8 6h8M8 10h8"/>
                                </svg>
                                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "500", fontFamily: "'Quicksand', sans-serif" }}>
                                  {search ? "No dealers match your search" : "No dealers in the network yet"}
                                </p>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {filtered.map((dealer, index) => {
                                  const dealerBookings = bookings.filter(b => b.dealerId === dealer.id || b.dealerId === dealer.ownerEmail);
                                  const dealerReviews = reviews ? reviews.filter(r => r.dealerId === dealer.id || r.dealerId === dealer.ownerEmail) : [];
                                  const avgRating = dealerReviews.length
                                    ? (dealerReviews.reduce((acc, curr) => acc + curr.rating, 0) / dealerReviews.length).toFixed(1)
                                    : null;
                                  const uniqueCustomers = new Set(dealerBookings.map(b => b.userEmail).filter(Boolean)).size;
                                  const totalRevenue = dealerBookings
                                    .filter(b => ["confirmed", "completed", "dealer_confirmed"].includes(b.status))
                                    .reduce((s, b) => s + (b.total || 0), 0);

                                  return (
                                    <div
                                      key={dealer.id}
                                      className="dealer-card"
                                      onClick={() => setSelectedDealer(dealer)}
                                      style={{
                                        animation: `fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(index, 10) * 0.03}s backwards`,
                                        fontFamily: "'Quicksand', sans-serif",
                                        display: "flex",
                                        gap: "20px",
                                        flexWrap: "wrap"
                                      }}
                                    >
                                      {/* LEFT: Logo + Dealer Info */}
                                      <div className="dealer-card-left" style={{ 
                                        display: "flex", 
                                        alignItems: "flex-start", 
                                        gap: "14px", 
                                        flex: "1 1 45%",
                                        minWidth: "280px"
                                      }}>
                                        <div className="dealer-avatar" style={{
                                          width: "48px",
                                          height: "48px",
                                          borderRadius: "12px",
                                          flexShrink: 0,
                                          background: dealer.status === "approved"
                                            ? "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)"
                                            : "rgba(255,255,255,0.06)",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: "20px",
                                          fontWeight: "800",
                                          color: "#fff"
                                        }}>
                                          {dealer.logo ? (
                                            <img src={dealer.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" }} />
                                          ) : (
                                            dealer.businessName?.[0]?.toUpperCase() || "D"
                                          )}
                                        </div>

                                        <div className="dealer-info" style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                                            <span className="dealer-name" style={{ fontWeight: "700", color: "#fff", fontSize: "15px" }}>{dealer.businessName}</span>
                                            <span style={{
                                              padding: "2px 10px",
                                              borderRadius: "5px",
                                              fontSize: "9px",
                                              fontWeight: "800",
                                              textTransform: "uppercase",
                                              background: dealer.status === "approved" ? "rgba(34,197,94,0.12)" :
                                                dealer.status === "suspended" ? "rgba(239,68,68,0.12)" :
                                                dealer.status === "rejected" ? "rgba(239,68,68,0.08)" :
                                                "rgba(245,158,11,0.12)",
                                              color: dealer.status === "approved" ? "#22c55e" :
                                                dealer.status === "suspended" || dealer.status === "rejected" ? "#ef4444" :
                                                "#f59e0b",
                                              border: `1px solid ${dealer.status === "approved" ? "rgba(34,197,94,0.3)" :
                                                dealer.status === "suspended" || dealer.status === "rejected" ? "rgba(239,68,68,0.3)" :
                                                "rgba(245,158,11,0.3)"}`
                                            }}>
                                              {dealer.status}
                                            </span>
                                          </div>
                                          
                                          <p className="dealer-detail-text" style={{ margin: "3px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                              <circle cx="12" cy="7" r="4"/>
                                            </svg>
                                            {dealer.ownerName}
                                          </p>
                                          
                                          <p className="dealer-detail-text" style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                              <circle cx="12" cy="10" r="3"/>
                                            </svg>
                                            {dealer.city}, {dealer.state}, {dealer.country}
                                          </p>
                                          
                                          {dealer.phone && (
                                            <p className="dealer-detail-text" style={{ margin: "5px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "6px" }}>
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.574 2.81.7A2 2 0 0 1 22 16.92z"/>
                                              </svg>
                                              {dealer.phone}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      {/* RIGHT: Stats + Buttons */}
                                      <div className="dealer-card-right" style={{ 
                                        display: "flex", 
                                        flexDirection: "column",
                                        gap: "12px",
                                        flex: "1 1 40%",
                                        minWidth: "200px"
                                      }}>
                                        {/* Stats Row */}
                                        <div className="dealer-stats-row" style={{
                                          display: "grid",
                                          gridTemplateColumns: "repeat(4, 1fr)",
                                          gap: "8px",
                                          padding: "8px 0",
                                          borderBottom: "1px solid rgba(255,255,255,0.04)"
                                        }} onClick={e => e.stopPropagation()}>
                                          <div className="stat-item" style={{ textAlign: "center" }}>
                                            <p className="stat-label" style={{ margin: "0 0 2px", fontSize: "10px", color: "rgba(255,255,255,0.6)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 2px", opacity: 0.5 }}>
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                              </svg>
                                              Rating
                                            </p>
                                            <p className="stat-value" style={{ margin: 0, fontSize: "15px", color: "#fbbf24", fontWeight: "700" }}>
                                              {avgRating ? avgRating : "—"}
                                            </p>
                                          </div>
                                          <div className="stat-item" style={{ textAlign: "center" }}>
                                            <p className="stat-label" style={{ margin: "0 0 2px", fontSize: "10px", color: "rgba(255,255,255,0.6)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 2px", opacity: 0.5 }}>
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                                <circle cx="9" cy="7" r="4"/>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                              </svg>
                                              Customers
                                            </p>
                                            <p className="stat-value" style={{ margin: 0, fontSize: "15px", color: "#fff", fontWeight: "700" }}>{uniqueCustomers}</p>
                                          </div>
                                          <div className="stat-item" style={{ textAlign: "center" }}>
                                            <p className="stat-label" style={{ margin: "0 0 2px", fontSize: "10px", color: "rgba(255,255,255,0.6)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 2px", opacity: 0.5 }}>
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                                <line x1="16" y1="2" x2="16" y2="6"/>
                                                <line x1="8" y1="2" x2="8" y2="6"/>
                                                <line x1="3" y1="10" x2="21" y2="10"/>
                                              </svg>
                                              Bookings
                                            </p>
                                            <p className="stat-value" style={{ margin: 0, fontSize: "15px", color: "#fff", fontWeight: "700" }}>{dealerBookings.length}</p>
                                          </div>
                                          <div className="stat-item" style={{ textAlign: "center" }}>
                                            <p className="stat-label" style={{ margin: "0 0 2px", fontSize: "10px", color: "rgba(255,255,255,0.6)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 2px", opacity: 0.5 }}>
                                                <line x1="12" y1="1" x2="12" y2="23"/>
                                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                              </svg>
                                              Revenue
                                            </p>
                                            <p className="stat-value" style={{ margin: 0, fontSize: "15px", color: "#22c55e", fontWeight: "700" }}>${totalRevenue.toLocaleString()}</p>
                                          </div>
                                        </div>

                                        {/* Buttons Row - Updated to stay in single row */}
                                        <div className="dealer-card-actions" style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                          flexWrap: "nowrap",
                                          justifyContent: "flex-end"
                                        }} onClick={e => e.stopPropagation()}>
                                          {/* Details Button */}
                                          <button
                                            onClick={() => setSelectedDealer(dealer)}
                                            style={{
                                              padding: "6px 14px",
                                              borderRadius: "8px",
                                              border: "1px solid rgba(76,227,247,0.2)",
                                              background: "rgba(76,227,247,0.06)",
                                              color: "#4ce3f7",
                                              cursor: "pointer",
                                              fontFamily: "'Quicksand', sans-serif",
                                              fontWeight: "700",
                                              fontSize: "10px",
                                              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                              whiteSpace: "nowrap",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "5px",
                                              textTransform: "uppercase",
                                              letterSpacing: "0.5px",
                                              flexShrink: 0
                                            }}
                                            onMouseEnter={e => { 
                                              e.currentTarget.style.background = "rgba(76,227,247,0.15)"; 
                                              e.currentTarget.style.borderColor = "rgba(76,227,247,0.4)";
                                              e.currentTarget.style.transform = "translateY(-1px)";
                                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(76,227,247,0.15)";
                                            }}
                                            onMouseLeave={e => { 
                                              e.currentTarget.style.background = "rgba(76,227,247,0.06)"; 
                                              e.currentTarget.style.borderColor = "rgba(76,227,247,0.2)";
                                              e.currentTarget.style.transform = "translateY(0)";
                                              e.currentTarget.style.boxShadow = "none";
                                            }}
                                          >
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                              <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                            Details
                                          </button>

                                          {/* Locations Button */}
                                          <button
                                            onClick={() => setLocationModalDealer(dealer)}
                                            style={{
                                              padding: "6px 14px",
                                              borderRadius: "8px",
                                              border: "1px solid rgba(168,85,247,0.2)",
                                              background: "rgba(168,85,247,0.06)",
                                              color: "#a855f7",
                                              cursor: "pointer",
                                              fontFamily: "'Quicksand', sans-serif",
                                              fontWeight: "700",
                                              fontSize: "10px",
                                              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                              whiteSpace: "nowrap",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "5px",
                                              textTransform: "uppercase",
                                              letterSpacing: "0.5px",
                                              flexShrink: 0
                                            }}
                                            onMouseEnter={e => { 
                                              e.currentTarget.style.background = "rgba(168,85,247,0.15)"; 
                                              e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)";
                                              e.currentTarget.style.transform = "translateY(-1px)";
                                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(168,85,247,0.15)";
                                            }}
                                            onMouseLeave={e => { 
                                              e.currentTarget.style.background = "rgba(168,85,247,0.06)"; 
                                              e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)";
                                              e.currentTarget.style.transform = "translateY(0)";
                                              e.currentTarget.style.boxShadow = "none";
                                            }}
                                          >
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                              <circle cx="12" cy="10" r="3"/>
                                            </svg>
                                            Locations
                                          </button>

                                          {/* Status Action Buttons */}
                                          {dealer.status === "pending" && (
                                            <>
                                              <PermissionGuard permission={PERMISSIONS.APPROVE_DEALER}>
                                                <button
                                                  onClick={() => handleDealerAction(dealer, "approved")}
                                                  disabled={actionLoading === dealer.id}
                                                  style={{
                                                    padding: "6px 14px",
                                                    borderRadius: "8px",
                                                    border: "1px solid rgba(34,197,94,0.3)",
                                                    background: "rgba(34,197,94,0.08)",
                                                    color: "#22c55e",
                                                    cursor: actionLoading === dealer.id ? "not-allowed" : "pointer",
                                                    fontFamily: "'Quicksand', sans-serif",
                                                    fontWeight: "700",
                                                    fontSize: "10px",
                                                    opacity: actionLoading === dealer.id ? 0.5 : 1,
                                                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                                    whiteSpace: "nowrap",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "5px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.5px",
                                                    flexShrink: 0
                                                  }}
                                                  onMouseEnter={e => { 
                                                    if (!actionLoading) {
                                                      e.currentTarget.style.background = "rgba(34,197,94,0.16)"; 
                                                      e.currentTarget.style.borderColor = "rgba(34,197,94,0.5)";
                                                      e.currentTarget.style.transform = "translateY(-1px)";
                                                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(34,197,94,0.15)";
                                                    }
                                                  }}
                                                  onMouseLeave={e => { 
                                                    e.currentTarget.style.background = "rgba(34,197,94,0.08)"; 
                                                    e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)";
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                    e.currentTarget.style.boxShadow = "none";
                                                  }}
                                                >
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"/>
                                                  </svg>
                                                  {actionLoading === dealer.id ? "..." : "Approve"}
                                                </button>
                                              </PermissionGuard>
                                              <PermissionGuard permission={PERMISSIONS.APPROVE_DEALER}>
                                                <button
                                                  onClick={() => handleDealerAction(dealer, "rejected")}
                                                  disabled={actionLoading === dealer.id}
                                                  style={{
                                                    padding: "6px 14px",
                                                    borderRadius: "8px",
                                                    border: "1px solid rgba(239,68,68,0.25)",
                                                    background: "rgba(239,68,68,0.06)",
                                                    color: "#ef4444",
                                                    cursor: actionLoading === dealer.id ? "not-allowed" : "pointer",
                                                    fontFamily: "'Quicksand', sans-serif",
                                                    fontWeight: "700",
                                                    fontSize: "10px",
                                                    opacity: actionLoading === dealer.id ? 0.5 : 1,
                                                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                                    whiteSpace: "nowrap",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "5px",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.5px",
                                                    flexShrink: 0
                                                  }}
                                                  onMouseEnter={e => { 
                                                    if (!actionLoading) {
                                                      e.currentTarget.style.background = "rgba(239,68,68,0.12)"; 
                                                      e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
                                                      e.currentTarget.style.transform = "translateY(-1px)";
                                                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(239,68,68,0.15)";
                                                    }
                                                  }}
                                                  onMouseLeave={e => { 
                                                    e.currentTarget.style.background = "rgba(239,68,68,0.06)"; 
                                                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)";
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                    e.currentTarget.style.boxShadow = "none";
                                                  }}
                                                >
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                                  </svg>
                                                  {actionLoading === dealer.id ? "..." : "Reject"}
                                                </button>
                                              </PermissionGuard>
                                            </>
                                          )}

                                          {dealer.status === "approved" && (
                                            <PermissionGuard permission={PERMISSIONS.SUSPEND_DEALER}>
                                              <button
                                                onClick={() => handleDealerAction(dealer, "suspended")}
                                                disabled={actionLoading === dealer.id}
                                                style={{
                                                  padding: "6px 14px",
                                                  borderRadius: "8px",
                                                  border: "1px solid rgba(239,68,68,0.25)",
                                                  background: "rgba(239,68,68,0.06)",
                                                  color: "#ef4444",
                                                  cursor: actionLoading === dealer.id ? "not-allowed" : "pointer",
                                                  fontFamily: "'Quicksand', sans-serif",
                                                  fontWeight: "700",
                                                  fontSize: "10px",
                                                  opacity: actionLoading === dealer.id ? 0.5 : 1,
                                                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                                  whiteSpace: "nowrap",
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  gap: "5px",
                                                  textTransform: "uppercase",
                                                  letterSpacing: "0.5px",
                                                  flexShrink: 0
                                                }}
                                                onMouseEnter={e => { 
                                                  if (!actionLoading) {
                                                    e.currentTarget.style.background = "rgba(239,68,68,0.12)"; 
                                                    e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
                                                    e.currentTarget.style.transform = "translateY(-1px)";
                                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(239,68,68,0.15)";
                                                  }
                                                }}
                                                onMouseLeave={e => { 
                                                  e.currentTarget.style.background = "rgba(239,68,68,0.06)"; 
                                                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)";
                                                  e.currentTarget.style.transform = "translateY(0)";
                                                  e.currentTarget.style.boxShadow = "none";
                                                }}
                                              >
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                  <circle cx="12" cy="12" r="10"/>
                                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                                                </svg>
                                                {actionLoading === dealer.id ? "..." : "Suspend"}
                                              </button>
                                            </PermissionGuard>
                                          )}

                                          {dealer.status === "suspended" && (
                                            <PermissionGuard permission={PERMISSIONS.APPROVE_DEALER}>
                                              <button
                                                onClick={() => handleDealerAction(dealer, "approved")}
                                                disabled={actionLoading === dealer.id}
                                                style={{
                                                  padding: "6px 14px",
                                                  borderRadius: "8px",
                                                  border: "1px solid rgba(34,197,94,0.3)",
                                                  background: "rgba(34,197,94,0.08)",
                                                  color: "#22c55e",
                                                  cursor: actionLoading === dealer.id ? "not-allowed" : "pointer",
                                                  fontFamily: "'Quicksand', sans-serif",
                                                  fontWeight: "700",
                                                  fontSize: "10px",
                                                  opacity: actionLoading === dealer.id ? 0.5 : 1,
                                                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                                  whiteSpace: "nowrap",
                                                  display: "inline-flex",
                                                  alignItems: "center",
                                                  gap: "5px",
                                                  textTransform: "uppercase",
                                                  letterSpacing: "0.5px",
                                                  flexShrink: 0
                                                }}
                                                onMouseEnter={e => { 
                                                  if (!actionLoading) {
                                                    e.currentTarget.style.background = "rgba(34,197,94,0.16)"; 
                                                    e.currentTarget.style.borderColor = "rgba(34,197,94,0.5)";
                                                    e.currentTarget.style.transform = "translateY(-1px)";
                                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(34,197,94,0.15)";
                                                  }
                                                }}
                                                onMouseLeave={e => { 
                                                  e.currentTarget.style.background = "rgba(34,197,94,0.08)"; 
                                                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.3)";
                                                  e.currentTarget.style.transform = "translateY(0)";
                                                  e.currentTarget.style.boxShadow = "none";
                                                }}
                                              >
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                  <polyline points="23 4 23 10 17 10"/>
                                                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                                                </svg>
                                                {actionLoading === dealer.id ? "..." : "Reinstate"}
                                              </button>
                                            </PermissionGuard>
                                          )}

                                          {/* Delete Button */}
                                          <PermissionGuard permission={PERMISSIONS.DELETE_DEALER}>
                                            <button
                                              className="dealer-card-btn-delete"
                                              onClick={() => handleDeleteDealer(dealer)}
                                              style={{
                                                padding: "6px 10px",
                                                borderRadius: "8px",
                                                border: "1px solid rgba(239,68,68,0.15)",
                                                background: "rgba(239,68,68,0.04)",
                                                color: "rgba(239,68,68,0.5)",
                                                cursor: "pointer",
                                                fontFamily: "'Quicksand', sans-serif",
                                                fontWeight: "600",
                                                fontSize: "11px",
                                                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                                whiteSpace: "nowrap",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                flexShrink: 0
                                              }}
                                              title="Delete dealer permanently"
                                              onMouseEnter={e => { 
                                                e.currentTarget.style.background = "rgba(239,68,68,0.12)"; 
                                                e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; 
                                                e.currentTarget.style.color = "#ef4444";
                                                e.currentTarget.style.transform = "translateY(-1px)";
                                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(239,68,68,0.15)";
                                              }}
                                              onMouseLeave={e => { 
                                                e.currentTarget.style.background = "rgba(239,68,68,0.04)"; 
                                                e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)"; 
                                                e.currentTarget.style.color = "rgba(239,68,68,0.5)";
                                                e.currentTarget.style.transform = "translateY(0)";
                                                e.currentTarget.style.boxShadow = "none";
                                              }}
                                            >
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"/>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                              </svg>
                                            </button>
                                          </PermissionGuard>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ── REVIEWS ──────────────────────────────────── */}
              {activeNav === "reviews" && (
                <div className="admin-split-layout"
                  style={{ 
                    display: "flex", 
                    height: "100%", 
                    gap: "32px", 
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                >
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    .premium-input::placeholder { color: rgba(255, 255, 255, 0.35); }
                    .premium-scroll::-webkit-scrollbar { width: 6px; }
                    .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                    .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                    .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
                    .premium-select-wrapper::after {
                      content: '↓';
                      font-size: 10px;
                      color: rgba(255, 255, 255, 0.4);
                      position: absolute;
                      right: 16px;
                      top: 50%;
                      transform: translateY(-50%);
                      pointer-events: none;
                      transition: color 0.2s ease;
                    }
                    .premium-select-wrapper:hover::after { color: #fbbf24; }
                    .review-card-action { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
                    .reviews-sidebar {
                      background: rgba(10, 10, 20, 0.3) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                    }
                    .reviews-sidebar-header {
                      background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                    }
                  `}</style>

                  {/* LEFT SIDEBAR - 22% */}
                  <div 
                    className="reviews-sidebar"
                    style={{ 
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      height: "calc(100vh - 80px)",
                      position: "sticky",
                      top: 0,
                      overflow: "hidden",
                      paddingRight: "4px",
                      flex: "0 0 22%",
                      zIndex: 100
                    }}
                  >
                    {/* STICKY HEADER */}
                    <div 
                      className="reviews-sidebar-header"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 9999,
                        background: "#0a0a14",
                        paddingBottom: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        flexShrink: 0
                      }}
                    >
                      {/* REVIEWS: amber/star rating themed */}
                      <div className="kpi-widget-sticky" style={{
                        background: "linear-gradient(135deg, #92400e 0%, #f59e0b 100%)",
                        padding: "16px", borderRadius: "16px", color: "#fff",
                        boxShadow: "0 8px 24px rgba(245,158,11,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>TOTAL LEDGER</p>
                          <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>{reviews.length} Reviews</p>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Passenger evaluations</p>
                        </div>
                        <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        </div>
                      </div>

                      {/* FILTER TOGGLE BUTTON */}
                      <button 
                        className="filter-toggle-btn"
                        onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 14px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          color: "rgba(255,255,255,0.6)",
                          cursor: "pointer",
                          fontFamily: "'Quicksand', sans-serif",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "1px",
                          transition: "all 0.3s ease"
                        }}
                      >
                        <span>FILTER MATRIX</span>
                        <svg 
                          className={`toggle-icon ${isFiltersVisible ? 'open' : ''}`}
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{
                            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            transform: isFiltersVisible ? "rotate(180deg)" : "rotate(0deg)"
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                    </div>

                    {/* SCROLLABLE FILTERS */}
                    <div className="premium-scroll" style={{
                      overflowY: "auto",
                      overflowX: "hidden",
                      minHeight: 0,
                      background: "#0a0a14",
                      paddingRight: "2px",
                      paddingTop: "4px",
                      flex: 1,
                      zIndex: 1,
                      position: "relative"
                    }}>
                      <div 
                        className={`filter-collapsible-wrapper ${isFiltersVisible ? '' : 'collapsed'}`}
                        style={{
                          overflow: "hidden",
                          transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          maxHeight: isFiltersVisible ? "600px" : "0"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {/* Global Text Search */}
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", opacity: 0.4, display: "flex", alignItems: "center" }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                              </svg>
                            </span>
                            <input 
                              className="premium-input"
                              placeholder="Search comments, emails..." 
                              value={searchTerm} 
                              onChange={e => setSearchTerm(e.target.value)} 
                              style={{ 
                                width: "100%", fontFamily: "'Quicksand', sans-serif",
                                padding: "14px 16px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", color: "#fff", fontSize: "13.5px", outline: "none",
                                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                boxSizing: "border-box"
                              }} 
                              onFocus={e => { e.target.style.borderColor = "#fbbf24"; e.target.style.background = "rgba(255, 255, 255, 0.05)"; }} 
                              onBlur={e => { e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"; e.target.style.background = "rgba(255, 255, 255, 0.03)"; }} 
                            />
                          </div>

                          {/* Car Model Search */}
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", opacity: 0.4, display: "flex", alignItems: "center" }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 1 12v4c0 .6.4 1 1 1h2"/>
                                <circle cx="7" cy="17" r="3"/>
                                <circle cx="17" cy="17" r="3"/>
                              </svg>
                            </span>
                            <input 
                              className="premium-input"
                              placeholder="Filter by vehicle model..." 
                              value={filterCar} 
                              onChange={e => setFilterCar(e.target.value)} 
                              style={{ 
                                width: "100%", fontFamily: "'Quicksand', sans-serif",
                                padding: "14px 16px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", color: "#fff", fontSize: "13.5px", outline: "none",
                                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                boxSizing: "border-box"
                              }} 
                              onFocus={e => { e.target.style.borderColor = "#fbbf24"; e.target.style.background = "rgba(255, 255, 255, 0.05)"; }}
                              onBlur={e => { e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"; e.target.style.background = "rgba(255, 255, 255, 0.03)"; }}
                            />
                          </div>

                          {/* Star Rating Filter */}
                          <div className="premium-select-wrapper" style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 1, opacity: 0.4, display: "flex", alignItems: "center" }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                              </svg>
                            </span>
                            <select 
                              value={filterStatus} 
                              onChange={e => setFilterStatus(e.target.value)} 
                              style={{ 
                                width: "100%", fontFamily: "'Quicksand', sans-serif", padding: "14px 40px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", color: "#fff", fontSize: "13.5px", cursor: "pointer", outline: "none", appearance: "none",
                                boxSizing: "border-box"
                              }}
                              onFocus={e => e.target.style.borderColor = "#fbbf24"}
                              onBlur={e => e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"}
                            >
                              <option value="" style={{ background: "#111" }}>All Star Ratings</option>
                              <option value="5" style={{ background: "#111" }}>5 Stars Perfect</option>
                              <option value="4" style={{ background: "#111" }}>4 Stars &amp; Above</option>
                              <option value="critical" style={{ background: "#111" }}>Critical Ratings (&lt;3 Stars)</option>
                            </select>
                          </div>

                          {/* Reset Button */}
                          {(searchTerm || filterCar || filterStatus) && (
                            <button 
                              onClick={() => { setSearchTerm(""); setFilterCar(""); setFilterStatus(""); }} 
                              style={{ 
                                width: "100%", padding: "14px 16px", background: "rgba(239, 68, 68, 0.05)", 
                                border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "14px", color: "#fca5a5", 
                                cursor: "pointer", fontWeight: "700", fontSize: "12px", letterSpacing: "0.5px",
                                fontFamily: "'Quicksand', sans-serif", transition: "all 0.2s ease",
                                boxSizing: "border-box"
                              }}
                              onMouseEnter={e => { e.target.style.background = "rgba(239, 68, 68, 0.12)"; e.target.style.borderColor = "rgba(239, 68, 68, 0.4)"; }}
                              onMouseLeave={e => { e.target.style.background = "rgba(239, 68, 68, 0.05)"; e.target.style.borderColor = "rgba(239, 68, 68, 0.25)"; }}
                            >
                              RESET DIRECTORY FILTERS
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT CONTENT - 78% */}
                  <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* HEADER */}
                    <AdminSectionHeader
                      title="Customer Reviews"
                      sub="Aggregated passenger evaluations and service ratings tracking log"
                      badge="VERIFIED REVIEWS METRIC"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      }
                    />

                    {/* REVIEWS LIST */}
                    <div className="premium-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
                      {reviews.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "80px 40px", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "24px" }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" style={{ marginBottom: "16px" }}>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "500", fontFamily: "'Quicksand', sans-serif" }}>No matching evaluation reports tracked inside current parameters.</p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {/* Your existing review cards here */}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── USER BOOKINGS ─────────────────────────────── */}
              {activeNav === "userBookings" && selectedUser && (
                <div className="admin-split-layout"
                  style={{ 
                    display: "flex", 
                    height: "100%", 
                    gap: "32px", 
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                >
                  {/* Layout Keyframes & Global Component Adjustments */}
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    .premium-scroll::-webkit-scrollbar { width: 6px; }
                    .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                    .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                    .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
                    .back-action-btn { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
                    .back-action-btn:hover { background: rgba(255, 255, 255, 0.08) !important; color: #fff !important; transform: translateX(-2px); }
                    
                    /* Glass morphism booking card */
                    .admin-booking-card {
                      background: rgba(255, 255, 255, 0.03) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.08) !important;
                      border-left: 3px solid var(--status-color, rgba(147,51,234,0.4)) !important;
                      border-radius: 14px !important;
                      padding: 16px 20px !important;
                      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                      position: relative !important;
                      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
                    }
                    .admin-booking-card:hover {
                      background: rgba(255, 255, 255, 0.06) !important;
                      transform: translateY(-2px) !important;
                      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(147,51,234,0.05) !important;
                      border-color: rgba(255, 255, 255, 0.15) !important;
                    }
                    
                    /* Glass morphism sidebar */
                    .user-bookings-sidebar {
                      flex: 0 0 22%;
                      display: grid;
                      grid-template-rows: auto 1fr;
                      height: calc(100vh - 80px);
                      position: sticky;
                      top: 0;
                      overflow: hidden;
                      padding-right: 4px;
                      background: rgba(10, 10, 20, 0.3) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                      z-index: 100;
                    }
                    
                    /* Sticky header with glass morphism */
                    .user-bookings-header {
                      position: sticky;
                      top: 0;
                      z-index: 9999;
                      background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      padding-bottom: 12px;
                      border-bottom: 1px solid rgba(255,255,255,0.05);
                      flex-shrink: 0;
                    }
                    
                    .user-profile-card {
                      display: flex;
                      align-items: center;
                      gap: 14px;
                      padding: 16px;
                      background: rgba(255,255,255,0.03);
                      border-radius: 14px;
                      border: 1px solid rgba(255,255,255,0.06);
                      margin-bottom: 12px;
                      backdrop-filter: blur(8px);
                    }
                    
                    .user-profile-avatar {
                      width: 44px;
                      height: 44px;
                      border-radius: 12px;
                      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 16px;
                      font-weight: 800;
                      color: #fff;
                      flex-shrink: 0;
                    }
                    
                    .user-profile-info {
                      flex: 1;
                      min-width: 0;
                    }
                    
                    .user-profile-name {
                      margin: 0;
                      font-weight: 700;
                      color: #fff;
                      font-size: 14px;
                    }
                    
                    .user-profile-email {
                      margin: 2px 0 0;
                      font-size: 12px;
                      color: rgba(255,255,255,0.35);
                      font-family: monospace;
                      word-break: break-all;
                    }
                    
                    .user-bookings-count {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      padding: 10px 14px;
                      background: rgba(255,255,255,0.02);
                      border-radius: 10px;
                      border: 1px solid rgba(255,255,255,0.05);
                      margin-bottom: 12px;
                    }
                    
                    .user-bookings-count-label {
                      font-size: 10px;
                      font-weight: 700;
                      color: rgba(255,255,255,0.3);
                      letter-spacing: 1px;
                      text-transform: uppercase;
                    }
                    
                    .user-bookings-count-value {
                      font-size: 14px;
                      font-weight: 700;
                      color: #c084fc;
                    }
                    
                    .user-bookings-back-btn {
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      padding: 8px 14px;
                      background: rgba(255,255,255,0.03);
                      border: 1px solid rgba(255,255,255,0.08);
                      border-radius: 10px;
                      color: rgba(255,255,255,0.6);
                      cursor: pointer;
                      font-family: inherit;
                      font-size: 13px;
                      font-weight: 600;
                      transition: all 0.2s ease;
                      margin-bottom: 12px;
                      width: 100%;
                      justify-content: center;
                    }
                    .user-bookings-back-btn:hover {
                      background: rgba(255,255,255,0.08);
                      color: #fff;
                      transform: translateX(-2px);
                    }
                    
                    .premium-scroll {
                      background: transparent !important;
                    }
                  `}</style>

                  {/* LEFT SIDEBAR - CONTROL & PROFILE MATRIX (22%) */}
                  <div 
                    className="user-bookings-sidebar"
                  >
                    {/* STICKY HEADER */}
                    <div className="user-bookings-header">
                      {/* Back Button */}
                      <button 
                        onClick={() => switchNav(selectedUser?.isDealer ? "dealers" : "users")} 
                        className="user-bookings-back-btn"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="19" y1="12" x2="5" y2="12"></line>
                          <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back
                      </button>

                      {/* User Profile Card */}
                      <div className="user-profile-card">
                        <div className="user-profile-avatar">
                          {(selectedUser.displayName || selectedUser.email || "?")[0].toUpperCase()}
                        </div>
                        <div className="user-profile-info">
                          <p className="user-profile-name">{selectedUser.displayName || "Standard Passenger"}</p>
                          <p className="user-profile-email">{selectedUser.email}</p>
                        </div>
                      </div>

                      {/* Total Records Count */}
                      <div className="user-bookings-count">
                        <span className="user-bookings-count-label">TOTAL RECORDS</span>
                        <span className="user-bookings-count-value">{sortedUserBookings.length} of {userBookings.length}</span>
                      </div>

                      {/* FILTER TOGGLE BUTTON */}
                      <button 
                        className="filter-toggle-btn"
                        onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 14px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          color: "rgba(255,255,255,0.6)",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "1px",
                          transition: "all 0.3s ease"
                        }}
                      >
                        <span>FILTER & SEARCH</span>
                        <svg 
                          className={`toggle-icon ${isFiltersVisible ? 'open' : ''}`}
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{
                            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            transform: isFiltersVisible ? "rotate(180deg)" : "rotate(0deg)"
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                    </div>

                    {/* SCROLLABLE FILTERS */}
                    <div className="premium-scroll" style={{ background: "transparent", overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingTop: "4px" }}>
                      <div 
                        className={`filter-collapsible-wrapper ${isFiltersVisible ? '' : 'collapsed'}`}
                        style={{
                          overflow: "hidden",
                          transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          maxHeight: isFiltersVisible ? "600px" : "0"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {/* Search */}
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", opacity: 0.4, pointerEvents: "none" }}>🔍</span>
                            <input 
                              className="premium-input"
                              placeholder="Search vehicle, route, ID..." 
                              value={searchTerm} 
                              onChange={e => setSearchTerm(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 16px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                fontFamily: "Quicksand",
                                outline: "none",
                                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)"
                              }} 
                              onFocus={e => { e.target.style.borderColor = "rgba(129, 140, 248, 0.6)"; e.target.style.background = "rgba(255, 255, 255, 0.05)"; }} 
                              onBlur={e => { e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"; e.target.style.background = "rgba(255, 255, 255, 0.03)"; }} 
                            />
                          </div>

                          {/* Filter Model */}
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", opacity: 0.4, pointerEvents: "none" }}>🚗</span>
                            <input 
                              className="premium-input"
                              placeholder="Specific Vehicle Model" 
                              value={filterCar} 
                              onChange={e => setFilterCar(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 16px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                fontFamily: "Quicksand",
                                outline: "none",
                                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)"
                              }} 
                              onFocus={e => { e.target.style.borderColor = "rgba(129, 140, 248, 0.6)"; e.target.style.background = "rgba(255, 255, 255, 0.05)"; }}
                              onBlur={e => { e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"; e.target.style.background = "rgba(255, 255, 255, 0.03)"; }}
                            />
                          </div>

                          {/* Dates */}
                          <div className="premium-select-wrapper" style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 1, fontSize: "13px", opacity: 0.5 }}>📅</span>
                            <select 
                              value={filterDate} 
                              onChange={e => setFilterDate(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 40px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                cursor: "pointer", 
                                outline: "none", 
                                appearance: "none",
                                transition: "all 0.25s ease",
                                fontFamily: "Quicksand",
                              }}
                              onFocus={e => e.target.style.borderColor = "rgba(168, 85, 247, 0.6)"}
                              onBlur={e => e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"}
                            >
                              <option value="" style={{ background: "#111", color: "#fff" }}>All Dynamic Dates</option>
                              {userBookingsUniqueDates.map(d => <option key={d} value={d} style={{ background: "#111", color: "#fff" }}>{d}</option>)}
                            </select>
                          </div>

                          {/* Status */}
                          <div className="premium-select-wrapper" style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 1, fontSize: "13px", opacity: 0.5 }}>🛡️</span>
                            <select 
                              value={filterStatus} 
                              onChange={e => setFilterStatus(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 40px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                cursor: "pointer", 
                                outline: "none", 
                                appearance: "none",
                                transition: "all 0.25s ease",
                                fontFamily: "Quicksand",
                              }}
                              onFocus={e => e.target.style.borderColor = "rgba(168, 85, 247, 0.6)"}
                              onBlur={e => e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"}
                            >
                              <option value="" style={{ background: "#111" }}>All Operational Status</option>
                              <option value="pending_approval" style={{ background: "#111" }}>⏳ Pending Approval</option>
                              <option value="dealer_confirmed" style={{ background: "#111" }}>📤 Dealer Approved</option>
                              <option value="confirmed" style={{ background: "#111" }}>✅ Confirmed</option>
                              <option value="upcoming_trip" style={{ background: "#111" }}>🗓️ Upcoming Trip</option>
                              <option value="pickup_awaited" style={{ background: "#111" }}>🚗 Pickup Awaited</option>
                              <option value="ongoing_trip" style={{ background: "#111" }}>🛣️ Ongoing Trip</option>
                              <option value="return_pending" style={{ background: "#111" }}>🔄 Return Pending</option>
                              <option value="on_hold" style={{ background: "#111" }}>⏸ On Hold</option>
                              <option value="cancelled" style={{ background: "#111" }}>❌ System Cancelled</option>
                              <option value="cancelled_dealer" style={{ background: "#111" }}>🔶 Cancelled by Dealer</option>
                              <option value="cancelled_admin" style={{ background: "#111" }}>🔴 Cancelled by Admin</option>
                              <option value="cancelled_user" style={{ background: "#111" }}>👤 Cancelled by User</option>
                              <option value="no_show" style={{ background: "#111" }}>👻 No Show</option>
                              <option value="completed" style={{ background: "#111" }}>🏁 Journey Completed</option>
                            </select>
                          </div>

                          {/* Sort */}
                          <div className="premium-select-wrapper" style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", zIndex: 1, fontSize: "13px", opacity: 0.5 }}>🔃</span>
                            <select 
                              value={sortBy} 
                              onChange={e => setSortBy(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 40px 14px 44px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "14px", 
                                color: "#fff", 
                                fontSize: "13.5px", 
                                cursor: "pointer", 
                                outline: "none", 
                                appearance: "none",
                                transition: "all 0.25s ease",
                                fontFamily: "Quicksand",
                              }}
                              onFocus={e => e.target.style.borderColor = "rgba(168, 85, 247, 0.6)"}
                              onBlur={e => e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"}
                            >
                              <option value="newest" style={{ background: "#111" }}>Chronological: Newest</option>
                              <option value="oldest" style={{ background: "#111" }}>Chronological: Oldest</option>
                              <option value="priceHigh" style={{ background: "#111" }}>Valuation: High to Low</option>
                              <option value="priceLow" style={{ background: "#111" }}>Valuation: Low to High</option>
                            </select>
                          </div>

                          {/* Reset Button */}
                          {(searchTerm || filterCar || filterDate || filterStatus) && (
                            <button 
                              onClick={() => { setSearchTerm(""); setFilterCar(""); setFilterDate(""); setFilterStatus(""); setSortBy("newest"); }} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 16px", 
                                background: "rgba(239, 68, 68, 0.05)", 
                                border: "1px solid rgba(239, 68, 68, 0.25)", 
                                borderRadius: "14px", 
                                color: "#fca5a5", 
                                cursor: "pointer", 
                                fontWeight: "600", 
                                fontSize: "12.5px",
                                letterSpacing: "0.5px",
                                fontFamily: "Quicksand",
                                transition: "all 0.2s ease"
                              }}
                              onMouseEnter={e => { e.target.style.background = "rgba(239, 68, 68, 0.12)"; e.target.style.borderColor = "rgba(239, 68, 68, 0.4)"; }}
                              onMouseLeave={e => { e.target.style.background = "rgba(239, 68, 68, 0.05)"; e.target.style.borderColor = "rgba(239, 68, 68, 0.25)"; }}
                            >
                              RESET ACTIVE FILTERS
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT CONTENT DISPLAY - RESERVATION FEED (78%) */}
                  <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* STEADY / STICKY HEADER COMPONENT */}
                    <AdminSectionHeader
                      title="User Reservation Ledger"
                      sub="Historical account transactions, active charters, and assignment schedules"
                      badge="ACTIVE RESERVATIONS"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      }
                    />

                    {/* STREAMING BOOKING CARDS FEED WRAPPER */}
                    <div className="premium-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px", background: "transparent" }}>
                      {userBookings.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "100px 40px", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "24px" }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(255,255,255,0.15)", marginBottom: "16px" }}><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                          <h3 style={{ color: "#fff", margin: "0 0 6px 0", fontSize: "16px", fontWeight: "700" }}>No Activity Logs</h3>
                          <p style={{ color: "rgba(255,255,255,0.3)", maxWidth: "320px", margin: "0 auto", fontSize: "13.5px", lineHeight: "1.5" }}>
                            This specific account channel has not initialized any booking protocols or vehicle requests.
                          </p>
                        </div>
                      ) : sortedUserBookings.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "100px 40px", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "24px" }}>
                          <p style={{ fontSize: "32px", margin: "0 0 12px 0", opacity: 0.5 }}>📭</p>
                          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", fontWeight: "500" }}>No bookings match the current filters.</p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {sortedUserBookings.map((b, index) => (
                            <div 
                              key={b.id}
                              style={{
                                animation: `fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.02}s backwards`
                              }}
                            >
                              <BookingCard booking={b} showUser={false} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── NOTIFICATIONS ─────────────────────────────── */}
              {activeNav === "notifications" && (
                <div className="admin-split-layout"
                  style={{ 
                    display: "flex", 
                    height: "100%", 
                    gap: "32px", 
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                >
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    .premium-scroll::-webkit-scrollbar { width: 6px; }
                    .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                    .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                    .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
                    .notification-card-hover { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
                    .filter-pill { transition: all 0.2s ease; cursor: pointer; }
                  `}</style>

                  {/* LEFT SIDEBAR - 22% */}
                  <div 
                    className="notifications-sidebar"
                    style={{ 
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      height: "calc(100vh - 80px)",
                      position: "sticky",
                      top: 0,
                      overflow: "hidden",
                      paddingRight: "4px",
                      background: "#0a0a14",
                      flex: "0 0 22%",
                      zIndex: 100
                    }}
                  >
                    {/* STICKY HEADER */}
                    <div 
                      className="notifications-sidebar-header"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 9999,
                        background: "#0a0a14",
                        paddingBottom: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        flexShrink: 0
                      }}
                    >
                      {/* NOTIFICATIONS: indigo/purple bell themed */}
                      <div className="kpi-widget-sticky" style={{
                        background: "linear-gradient(135deg, #312e81 0%, #6366f1 100%)",
                        padding: "16px", borderRadius: "16px", color: "#fff",
                        boxShadow: "0 8px 24px rgba(99,102,241,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>TELEMETRY STREAM</p>
                          <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>{notifications.length} Events</p>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Live platform activity</p>
                        </div>
                        <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                          </svg>
                        </div>
                      </div>

                      {/* FILTER TOGGLE BUTTON */}
                      <button 
                        className="filter-toggle-btn"
                        onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 14px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          color: "rgba(255,255,255,0.6)",
                          cursor: "pointer",
                          fontFamily: "'Quicksand', sans-serif",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "1px",
                          transition: "all 0.3s ease"
                        }}
                      >
                        <span>LOG FILTERS</span>
                        <svg 
                          className={`toggle-icon ${isFiltersVisible ? 'open' : ''}`}
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{
                            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            transform: isFiltersVisible ? "rotate(180deg)" : "rotate(0deg)"
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                    </div>

                    {/* SCROLLABLE FILTERS */}
                    <div className="premium-scroll" style={{
                      overflowY: "auto",
                      overflowX: "hidden",
                      minHeight: 0,
                      background: "#0a0a14",
                      paddingRight: "2px",
                      paddingTop: "4px",
                      flex: 1,
                      zIndex: 1,
                      position: "relative"
                    }}>
                      <div 
                        className={`filter-collapsible-wrapper ${isFiltersVisible ? '' : 'collapsed'}`}
                        style={{
                          overflow: "hidden",
                          transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          maxHeight: isFiltersVisible ? "400px" : "0"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {/* Filter Pills */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div 
                              onClick={() => setFilterType("all")}
                              className="filter-pill"
                              style={{ 
                                padding: "12px 16px", 
                                background: (!filterType || filterType === "all") ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.01)",
                                border: "1px solid " + ((!filterType || filterType === "all") ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)"),
                                borderRadius: "12px", fontSize: "13px", fontWeight: "600", display: "flex", justifyContent: "space-between",
                                fontFamily: "'Quicksand', sans-serif",
                                transition: "all 0.2s ease",
                                cursor: "pointer"
                              }}
                              onMouseEnter={e => { 
                                if (filterType !== "all") {
                                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                                }
                              }}
                              onMouseLeave={e => { 
                                if (filterType !== "all") {
                                  e.currentTarget.style.background = "rgba(255,255,255,0.01)";
                                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                                }
                              }}
                            >
                              <span>All Activities</span>
                              <span style={{ opacity: 0.5 }}>{notifications.length}</span>
                            </div>
                            
                            <div 
                              onClick={() => setFilterType("unread")}
                              className="filter-pill"
                              style={{ 
                                padding: "12px 16px", 
                                background: filterType === "unread" ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.01)",
                                border: "1px solid " + (filterType === "unread" ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.04)"),
                                borderRadius: "12px", fontSize: "13px", fontWeight: "600", display: "flex", justifyContent: "space-between",
                                color: filterType === "unread" ? "#818cf8" : "inherit",
                                fontFamily: "'Quicksand', sans-serif",
                                transition: "all 0.2s ease",
                                cursor: "pointer"
                              }}
                              onMouseEnter={e => { 
                                if (filterType !== "unread") {
                                  e.currentTarget.style.background = "rgba(99,102,241,0.05)";
                                  e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)";
                                  e.currentTarget.style.color = "#818cf8";
                                }
                              }}
                              onMouseLeave={e => { 
                                if (filterType !== "unread") {
                                  e.currentTarget.style.background = "rgba(255,255,255,0.01)";
                                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                                  e.currentTarget.style.color = "inherit";
                                }
                              }}
                            >
                              <span>Unread Inbound</span>
                              <span>{notifications.filter(n => !n.read).length}</span>
                            </div>
                          </div>

                          {/* Clear Logs Button */}
                          {notifications.length > 0 && (
                            <button 
                              onClick={() => setNotifications([])} 
                              style={{ 
                                width: "100%", 
                                padding: "14px 16px", 
                                background: "rgba(239, 68, 68, 0.05)", 
                                border: "1px solid rgba(239, 68, 68, 0.25)", 
                                borderRadius: "14px", 
                                color: "#fca5a5", 
                                cursor: "pointer", 
                                fontWeight: "700", 
                                fontSize: "12px", 
                                letterSpacing: "0.5px",
                                fontFamily: "'Quicksand', sans-serif",
                                transition: "all 0.2s ease"
                              }}
                              onMouseEnter={e => { e.target.style.background = "rgba(239, 68, 68, 0.12)"; e.target.style.borderColor = "rgba(239, 68, 68, 0.4)"; }}
                              onMouseLeave={e => { e.target.style.background = "rgba(239, 68, 68, 0.05)"; e.target.style.borderColor = "rgba(239, 68, 68, 0.25)"; }}
                            >
                              PURGE SYSTEM LOGS
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT CONTENT - 78% */}
                  <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* HEADER */}
                    <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#0a0a14" }}>
                      <AdminSectionHeader
                        title="System Activity Log"
                        sub="Real-time streaming ledger of platform actions and reservation events"
                        badge="LIVE ACTIVITY FEED"
                        icon={
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                        }
                      />
                    </div>

                    {/* NOTIFICATIONS LIST */}
                    <div className="premium-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
                      {notifications.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "100px 40px", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "24px" }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" style={{ marginBottom: "16px" }}>
                            <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                          </svg>
                          <h3 style={{ color: "#fff", margin: "0 0 6px 0", fontSize: "16px", fontWeight: "700", fontFamily: "'Quicksand', sans-serif" }}>All Systems Nominal</h3>
                          <p style={{ color: "rgba(255,255,255,0.3)", maxWidth: "340px", margin: "0 auto", fontSize: "13.5px", lineHeight: "1.5", fontFamily: "'Quicksand', sans-serif" }}>
                            No incoming events require attention. Live vehicle operations are quiet.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {/* Your existing notification cards here */}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── EMERGENCY ALERTS ─────────────────────────────── */}
              {activeNav === "emergency" && (
                <div className="admin-split-layout"
                  style={{ 
                    display: "flex", 
                    height: "100%", 
                    gap: "32px", 
                    padding: "20px",
                    color: "#f8fafc",
                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                >
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }
                    .premium-scroll::-webkit-scrollbar { width: 6px; }
                    .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                    .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                    .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
                    .emergency-tab-btn { 
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      justify-content: center !important;
                    }
                    .emergency-tab-btn:hover { filter: brightness(1.1); }
                    .status-card { 
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      background: rgba(255, 255, 255, 0.03) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.08) !important;
                      border-radius: 14px;
                      padding: 16px 20px;
                      cursor: pointer;
                      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
                    }
                    .status-card:hover { 
                      transform: translateY(-2px); 
                      border-color: rgba(239,68,68,0.25) !important;
                      background: rgba(255, 255, 255, 0.06) !important;
                      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
                    }
                    .emergency-stat-card {
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      background: rgba(255, 255, 255, 0.03) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.08) !important;
                      border-radius: 14px;
                      padding: 16px 20px;
                      cursor: default;
                      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
                    }
                    .emergency-stat-card:hover {
                      transform: translateY(-2px);
                      border-color: rgba(76, 227, 247, 0.25) !important;
                      background: rgba(255, 255, 255, 0.06) !important;
                      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
                    }
                    .filter-toggle-btn {
                      transition: all 0.3s ease;
                    }
                    .filter-toggle-btn:hover {
                      background: rgba(255, 255, 255, 0.06) !important;
                      border-color: rgba(255, 255, 255, 0.15) !important;
                    }
                    
                    /* Emergency Sidebar with Glass Morphism */
                    .emergency-sidebar {
                      display: grid !important;
                      grid-template-rows: auto 1fr !important;
                      height: calc(100vh - 80px) !important;
                      position: sticky !important;
                      top: 0 !important;
                      overflow: hidden !important;
                      background: rgba(10, 10, 20, 0.3) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      padding-right: 4px !important;
                      flex: 0 0 22% !important;
                      z-index: 100 !important;
                    }
                    
                    .emergency-sidebar-header {
                      position: sticky !important;
                      top: 0 !important;
                      z-index: 9999 !important;
                      background: rgba(10, 10, 20, 0.85) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      padding-bottom: 12px !important;
                      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                      flex-shrink: 0 !important;
                    }
                    
                    .emergency-sidebar-header .kpi-widget-sticky {
                      z-index: 10000 !important;
                      position: relative !important;
                      margin-bottom: 12px !important;
                    }
                    
                    .emergency-sidebar-header .filter-toggle-btn {
                      z-index: 10000 !important;
                      position: relative !important;
                    }
                    
                    .emergency-sidebar .premium-scroll {
                      overflow-y: auto !important;
                      overflow-x: hidden !important;
                      min-height: 0 !important;
                      background: transparent !important;
                      padding-right: 2px !important;
                      padding-top: 4px !important;
                      flex: 1 !important;
                      z-index: 1 !important;
                      position: relative !important;
                    }
                    
                    .emergency-sidebar .premium-scroll .filter-collapsible-wrapper {
                      background: transparent !important;
                    }
                    
                    .emergency-tab-content {
                      background: rgba(255, 255, 255, 0.03) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.08) !important;
                      border-radius: 20px !important;
                      padding: 24px !important;
                      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
                    }
                  `}</style>

                  {/* LEFT SIDEBAR - 22% */}
                  <div 
                    className="emergency-sidebar"
                    style={{ 
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      height: "calc(100vh - 80px)",
                      position: "sticky",
                      top: 0,
                      overflow: "hidden",
                      paddingRight: "4px",
                      flex: "0 0 22%",
                      zIndex: 100
                    }}
                  >
                    {/* STICKY HEADER */}
                    <div 
                      className="emergency-sidebar-header"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 9999,
                        paddingBottom: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        flexShrink: 0
                      }}
                    >
                      {/* EMERGENCY: red alert themed */}
                      <div className="kpi-widget-sticky" style={{
                        background: "linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)",
                        padding: "16px", borderRadius: "16px", color: "#fff",
                        boxShadow: "0 8px 24px rgba(239,68,68,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>INCIDENT COMMAND</p>
                          <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>
                            {(bookings?.filter(b => b.breakdownRequested || b.extensionRequested)?.length || 0)} Active
                          </p>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Distress & extension alerts</p>
                        </div>
                        <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                          </svg>
                        </div>
                      </div>

                      {/* Tab Navigation - CENTERED */}
                      <div className="emergency-tab-nav" style={{ 
                        background: "rgba(255,255,255,0.02)", 
                        border: "1px solid rgba(255,255,255,0.06)", 
                        borderRadius: "14px", 
                        padding: "6px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        marginBottom: "12px"
                      }}>
                        {/* Breakdown Tab - CENTERED */}
                        <button
                          onClick={() => setEmergencyTab("breakdown")}
                          className="emergency-tab-btn"
                          style={{
                            padding: "12px 16px",
                            borderRadius: "10px",
                            border: "none",
                            fontFamily: "'Quicksand', sans-serif",
                            background: emergencyTab === "breakdown" ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "transparent",
                            color: emergencyTab === "breakdown" ? "#fff" : "rgba(255,255,255,0.5)",
                            fontSize: "12.5px",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            width: "100%",
                            textAlign: "center"
                          }}
                          onMouseEnter={e => {
                            if (emergencyTab !== "breakdown") {
                              e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                              e.currentTarget.style.color = "#fca5a5";
                            }
                          }}
                          onMouseLeave={e => {
                            if (emergencyTab !== "breakdown") {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                            }
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                          </svg>
                          <span>Breakdowns</span>
                          {(bookings?.filter(b => b.breakdownRequested)?.length || 0) > 0 && (
                            <span style={{
                              background: emergencyTab === "breakdown" ? "rgba(255,255,255,0.22)" : "#ef4444",
                              color: "#fff", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "800"
                            }}>
                              {bookings?.filter(b => b.breakdownRequested)?.length}
                            </span>
                          )}
                        </button>

                        {/* Automation Tab - CENTERED */}
                        <button
                          onClick={() => setEmergencyTab("automation")}
                          className="emergency-tab-btn"
                          style={{
                            padding: "12px 16px",
                            borderRadius: "10px",
                            border: "none",
                            fontFamily: "'Quicksand', sans-serif",
                            background: emergencyTab === "automation" ? "linear-gradient(135deg, #6366f1, #4338ca)" : "transparent",
                            color: emergencyTab === "automation" ? "#fff" : "rgba(255,255,255,0.5)",
                            fontSize: "12.5px",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            width: "100%",
                            textAlign: "center"
                          }}
                          onMouseEnter={e => {
                            if (emergencyTab !== "automation") {
                              e.currentTarget.style.background = "rgba(99,102,241,0.06)";
                              e.currentTarget.style.color = "#a5b4fc";
                            }
                          }}
                          onMouseLeave={e => {
                            if (emergencyTab !== "automation") {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                            }
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                          </svg>
                          <span>Automation</span>
                        </button>

                        {/* Extensions Tab - CENTERED */}
                        <button
                          onClick={() => setEmergencyTab("extension")}
                          className="emergency-tab-btn"
                          style={{
                            padding: "12px 16px",
                            borderRadius: "10px",
                            border: "none",
                            fontFamily: "'Quicksand', sans-serif",
                            background: emergencyTab === "extension" ? "linear-gradient(135deg, #10b981, #047857)" : "transparent",
                            color: emergencyTab === "extension" ? "#fff" : "rgba(255,255,255,0.5)",
                            fontSize: "12.5px",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "10px",
                            width: "100%",
                            textAlign: "center"
                          }}
                          onMouseEnter={e => {
                            if (emergencyTab !== "extension") {
                              e.currentTarget.style.background = "rgba(16,185,129,0.06)";
                              e.currentTarget.style.color = "#6ee7b7";
                            }
                          }}
                          onMouseLeave={e => {
                            if (emergencyTab !== "extension") {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                            }
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <span>Extensions</span>
                          {(bookings?.filter(b => b.extensionRequested)?.length || 0) > 0 && (
                            <span style={{
                              background: emergencyTab === "extension" ? "rgba(255,255,255,0.22)" : "#10b981",
                              color: "#fff", padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "800"
                            }}>
                              {bookings?.filter(b => b.extensionRequested)?.length}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* FILTER TOGGLE BUTTON */}
                      <button 
                        className="filter-toggle-btn"
                        onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "10px 14px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "12px",
                          color: "rgba(255,255,255,0.6)",
                          cursor: "pointer",
                          fontFamily: "'Quicksand', sans-serif",
                          fontSize: "12px",
                          fontWeight: "700",
                          letterSpacing: "1px",
                          transition: "all 0.3s ease"
                        }}
                      >
                        <span>FILTER EVENTS</span>
                        <svg 
                          className={`toggle-icon ${isFiltersVisible ? 'open' : ''}`}
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{
                            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            transform: isFiltersVisible ? "rotate(180deg)" : "rotate(0deg)"
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                    </div>

                    {/* SCROLLABLE FILTERS */}
                    <div className="premium-scroll" style={{
                      overflowY: "auto",
                      overflowX: "hidden",
                      minHeight: 0,
                      paddingRight: "2px",
                      paddingTop: "4px",
                      flex: 1,
                      zIndex: 1,
                      position: "relative"
                    }}>
                      <div 
                        className={`filter-collapsible-wrapper ${isFiltersVisible ? '' : 'collapsed'}`}
                        style={{
                          overflow: "hidden",
                          transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                          maxHeight: isFiltersVisible ? "400px" : "0"
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {/* Search */}
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                              </svg>
                            </span>
                            <input 
                              placeholder="Search by ID or vehicle..." 
                              value={search} 
                              onChange={e => setSearch(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                fontFamily: "'Quicksand', sans-serif",
                                padding: "12px 14px 12px 42px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "10px", 
                                color: "#fff", 
                                fontSize: "13px", 
                                outline: "none",
                                transition: "all 0.25s ease",
                                boxSizing: "border-box",
                                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)"
                              }} 
                              onFocus={e => { 
                                e.target.style.borderColor = "rgba(239,68,68,0.6)"; 
                                e.target.style.background = "rgba(239,68,68,0.15)";
                                e.target.style.boxShadow = "0 0 0 4px rgba(239,68,68,0.15)";
                              }} 
                              onBlur={e => { 
                                e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"; 
                                e.target.style.background = "rgba(255, 255, 255, 0.03)";
                                e.target.style.boxShadow = "none";
                              }} 
                            />
                          </div>

                          {/* Type Filter */}
                          <div className="premium-select-wrapper" style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", zIndex: 1, pointerEvents: "none", display: "flex", alignItems: "center" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </span>
                            <select 
                              value={filterType} 
                              onChange={e => setFilterType(e.target.value)} 
                              style={{ 
                                width: "100%", 
                                fontFamily: "'Quicksand', sans-serif", 
                                padding: "12px 40px 12px 42px", 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid rgba(255, 255, 255, 0.08)", 
                                borderRadius: "10px", 
                                color: "#fff", 
                                fontSize: "13px", 
                                cursor: "pointer", 
                                outline: "none", 
                                appearance: "none",
                                boxSizing: "border-box",
                                transition: "all 0.25s ease"
                              }}
                              onFocus={e => e.target.style.borderColor = "rgba(239,68,68,0.6)"}
                              onBlur={e => e.target.style.borderColor = "rgba(255, 255, 255, 0.08)"}
                            >
                              <option value="all" style={{ background: "#111", color: "#fff" }}>All Types</option>
                              <option value="breakdown" style={{ background: "#111", color: "#fff" }}>Breakdown Only</option>
                              <option value="extension" style={{ background: "#111", color: "#fff" }}>Extension Only</option>
                            </select>
                            <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </span>
                          </div>

                          {/* Reset Button */}
                          {(search || filterType !== "all") && (
                            <button 
                              onClick={() => { setSearch(""); setFilterType("all"); }} 
                              style={{ 
                                width: "100%", 
                                padding: "12px 16px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                background: "rgba(239, 68, 68, 0.05)", 
                                border: "1px solid rgba(239, 68, 68, 0.25)", 
                                borderRadius: "12px", 
                                color: "#fca5a5", 
                                cursor: "pointer", 
                                fontWeight: "600", 
                                fontSize: "11.5px", 
                                letterSpacing: "0.5px",
                                fontFamily: "'Quicksand', sans-serif",
                                transition: "all 0.2s ease"
                              }}
                              onMouseEnter={e => { 
                                e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)"; 
                                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)"; 
                              }}
                              onMouseLeave={e => { 
                                e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)"; 
                                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.25)"; 
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                              RESET FILTERS
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT CONTENT - 78% */}
                  <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* HEADER */}
                    <AdminSectionHeader
                      title="Incident Command Matrix"
                      sub="Real-time vehicle distress requests, automated thresholds, and timeline extensions"
                      badge={
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ 
                            width: "8px", 
                            height: "8px", 
                            borderRadius: "50%", 
                            background: "#ef4444", 
                            display: "inline-block",
                            animation: "pulse 2s infinite"
                          }} />
                          LIVE INCIDENT FEED
                        </span>
                      }
                    />

                    {/* CONTENT AREA */}
                    <div 
                      className="premium-scroll"
                      style={{ 
                        flex: 1, 
                        overflowY: "auto", 
                        paddingBottom: "40px"
                      }}
                    >
                      <div
                        key={emergencyTab}
                        className="emergency-tab-content"
                        style={{
                          animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                        }}
                      >
                        {emergencyTab === "breakdown" && <BreakdownRequests bookings={bookings} />}
                        {emergencyTab === "automation" && <AdminStatusAutomation bookings={bookings} />}
                        {emergencyTab === "extension" && <AdminExtensionRequests bookings={bookings} />}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* ── SYSTEM ─────────────────────────────── merged version */}
              {activeNav === "system" && (
                <div className="admin-split-layout"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(260px, 22%) minmax(0, 1fr)",
                    width: "100%",
                    maxWidth: "100%",
                    height: "100%",
                    gap: "32px",
                    padding: "20px 30px 20px 0px",
                    boxSizing: "border-box",
                    color: "#f8fafc",
                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }
                    .premium-scroll::-webkit-scrollbar { width: 6px; }
                    .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                    .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                    .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

                    .admin-split-layout > * { position: relative; z-index: 1; }

                    /* Glass morphism sidebar */
                    .system-sidebar {
                      background: rgba(10, 10, 20, 0.3) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                      min-width: 0 !important;
                    }

                    .system-sidebar-header {
                      background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                    }

                    /* Collapsible trigger with cyan accent */
                    .system-collapsible-trigger {
                      display: flex; align-items: center; justify-content: space-between;
                      width: 100%; padding: 9px 12px;
                      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
                      color: rgba(255,255,255,0.5); cursor: pointer;
                      font-family: inherit; font-size: 11px; font-weight: 700;
                      letter-spacing: 1.5px; text-transform: uppercase;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      border-radius: 12px;
                    }
                    .system-collapsible-trigger:hover {
                      background: rgba(6,182,212,0.08);
                      color: #67e8f9;
                      border-color: rgba(6,182,212,0.15);
                    }
                    .system-collapsible-trigger.open {
                      border-radius: 12px 12px 0 0;
                      border-color: rgba(6,182,212,0.15);
                      background: rgba(6,182,212,0.06);
                      color: #67e8f9;
                    }

                    .system-collapsible-content {
                      overflow: hidden;
                      transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1);
                      background: rgba(255,255,255,0.02);
                      border: 1px solid rgba(255,255,255,0.06);
                      border-top: none;
                      border-radius: 0 0 12px 12px;
                    }

                    /* Glass morphism cards */
                    .system-metric-card {
                      background: rgba(255, 255, 255, 0.03) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.08) !important;
                      border-radius: 14px !important;
                      padding: 16px 20px !important;
                      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
                    }
                    .system-metric-card:hover {
                      background: rgba(255, 255, 255, 0.06) !important;
                      transform: translateY(-2px) !important;
                      border-color: rgba(6,182,212,0.3) !important;
                      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 0 20px rgba(6,182,212,0.05) !important;
                    }

                    /* System status row with glass */
                    .system-status-row {
                      background: rgba(255, 255, 255, 0.02) !important;
                      backdrop-filter: blur(8px) !important;
                      -webkit-backdrop-filter: blur(8px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.06) !important;
                      border-radius: 12px !important;
                      padding: 10px 14px !important;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
                      display: flex !important;
                      justify-content: space-between !important;
                      align-items: center !important;
                    }
                    .system-status-row:hover {
                      background: rgba(255, 255, 255, 0.04) !important;
                      border-color: rgba(6,182,212,0.2) !important;
                      transform: translateX(2px) !important;
                    }

                    /* ══════════════════════════════════════════════
                       MOBILE RESPONSIVE — targets real class names,
                       not the fragile ":first-child" positional
                       selector (that never matched because the
                       <style> tag itself was the actual first child).
                    ══════════════════════════════════════════════ */
                    @media (max-width: 768px) {
                      .admin-split-layout {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px !important;
                        width: 100% !important;
                        overflow: visible !important;
                      }

                      .system-sidebar {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        min-width: 0 !important;
                        position: relative !important;
                        top: auto !important;
                        height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        padding-right: 0 !important;
                      }

                      .system-sidebar-header {
                        position: relative !important;
                        top: auto !important;
                      }

                      .system-sidebar .premium-scroll {
                        overflow-y: visible !important;
                        overflow-x: hidden !important;
                        max-height: none !important;
                      }

                      .admin-content-area {
                        width: 100% !important;
                        min-width: 0 !important;
                        max-width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                      }

                      .admin-section-header {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 8px !important;
                        padding-bottom: 12px !important;
                        margin-bottom: 12px !important;
                      }
                      .admin-section-header h2 {
                        font-size: 18px !important;
                      }
                      .admin-section-header p {
                        font-size: 11px !important;
                      }
                      .admin-section-header > div:last-child {
                        font-size: 9px !important;
                      }
                      .admin-section-header > div:last-child span:last-child {
                        font-size: 9px !important;
                      }
                    }
                  `}</style>

                  {/* LEFT SIDEBAR - 22% - STICKY on desktop, stacks on mobile */}
                  <div
                    className="system-sidebar"
                    style={{
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      height: "calc(100vh - 80px)",
                      position: "sticky",
                      top: 0,
                      overflow: "hidden",
                      minWidth: 0,
                      paddingRight: "4px",
                      zIndex: 100
                    }}
                  >
                    {/* STICKY HEADER */}
                    <div className="system-sidebar-header" style={{
                      paddingBottom: "12px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      flexShrink: 0
                    }}>
                      {/* KPI Widget - UNCHANGED */}
                      <div style={{
                        background: "linear-gradient(135deg, #164e63 0%, #06b6d4 100%)",
                        padding: "16px", borderRadius: "16px", color: "#fff",
                        boxShadow: "0 8px 24px rgba(6,182,212,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>INFRASTRUCTURE LAYER</p>
                          <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>System Monitor</p>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Platform health & uptime</p>
                        </div>
                        <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* SCROLLABLE CONTENT — Service Status, Telemetry, Uptime, Automation */}
                    <div className="premium-scroll" style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingTop: "4px", background: "transparent" }}>

                      {/* ── Service Status — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setSvcOpen(p => !p)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            width: "100%", padding: "9px 12px",
                            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: svcOpen ? "12px 12px 0 0" : "12px",
                            color: "rgba(255,255,255,0.5)", cursor: "pointer",
                            fontFamily: "inherit", fontSize: "11px", fontWeight: "700",
                            letterSpacing: "1.5px", textTransform: "uppercase",
                            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(6,182,212,0.08)";
                            e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)";
                            e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                          }}
                          onMouseLeave={e => {
                            if (!svcOpen) {
                              e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                              e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                            }
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            Service Status
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: svcOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div style={{
                          maxHeight: svcOpen ? "300px" : "0px",
                          overflow: "hidden",
                          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
                          background: "rgba(255,255,255,0.02)",
                          border: svcOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
                          borderTop: "none",
                          borderRadius: "0 0 12px 12px"
                        }}>
                          <div style={{ padding: "4px 12px 8px" }}>
                            {[
                              { label: "Database",       status: "Operational", color: "#22c55e" },
                              { label: "API Gateway",    status: "Operational", color: "#22c55e" },
                              { label: "Authentication", status: "Operational", color: "#22c55e" },
                              { label: "Email Service",  status: "Degraded",    color: "#f59e0b" },
                            ].map(({ label, status, color }) => (
                              <div 
                                key={label} 
                                style={{
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                  borderRadius: "6px",
                                  borderLeft: "3px solid transparent",
                                  cursor: "pointer",
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = "rgba(6,182,212,0.06)";
                                  e.currentTarget.style.borderLeftColor = "#06b6d4";
                                  e.currentTarget.style.transform = "translateX(2px)";
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.borderLeftColor = "transparent";
                                  e.currentTarget.style.transform = "translateX(0)";
                                }}
                              >
                                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "500" }}>{label}</span>
                                <span style={{ color, fontSize: "12px", fontWeight: "700" }}>{status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── Telemetry Scopes — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setTelOpen(p => !p)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            width: "100%", padding: "9px 12px",
                            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: telOpen ? "12px 12px 0 0" : "12px",
                            color: "rgba(255,255,255,0.5)", cursor: "pointer",
                            fontFamily: "inherit", fontSize: "11px", fontWeight: "700",
                            letterSpacing: "1.5px", textTransform: "uppercase",
                            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(6,182,212,0.08)";
                            e.currentTarget.style.borderColor = "rgba(6,182,212,0.2)";
                            e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                          }}
                          onMouseLeave={e => {
                            if (!telOpen) {
                              e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                              e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                            }
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            Telemetry Scopes
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: telOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div style={{
                          maxHeight: telOpen ? "300px" : "0px",
                          overflow: "hidden",
                          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
                          background: "rgba(255,255,255,0.02)",
                          border: telOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
                          borderTop: "none",
                          borderRadius: "0 0 12px 12px"
                        }}>
                          <div style={{ padding: "4px 12px 8px" }}>
                            {[
                              { label: "Core API Metrics", value: "12.4k req/min", color: "#06b6d4" },
                              { label: "Error Rate",       value: "0.02%",         color: "#22c55e" },
                              { label: "Response Time",    value: "34ms",          color: "#f59e0b" },
                              { label: "Active Sessions",  value: "1,247",         color: "#6366f1" },
                            ].map(({ label, value, color }) => (
                              <div 
                                key={label} 
                                style={{
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                  borderRadius: "6px",
                                  borderLeft: "3px solid transparent",
                                  cursor: "pointer",
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = "rgba(6,182,212,0.06)";
                                  e.currentTarget.style.borderLeftColor = "#06b6d4";
                                  e.currentTarget.style.transform = "translateX(2px)";
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.borderLeftColor = "transparent";
                                  e.currentTarget.style.transform = "translateX(0)";
                                }}
                              >
                                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: "500" }}>{label}</span>
                                <span style={{ color, fontSize: "12px", fontWeight: "700" }}>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── Uptime + Automation — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setUptimeOpen(p => !p)}
                          className={`system-collapsible-trigger ${uptimeOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            System Health
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: uptimeOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="system-collapsible-content" style={{ maxHeight: uptimeOpen ? "300px" : "0px" }}>
                          <div style={{ padding: "8px 12px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              
                              {/* System Uptime Card */}
                              <div className="system-metric-card" style={{
                                background: "linear-gradient(145deg, rgba(6,182,212,0.08), rgba(6,182,212,0.02))",
                                border: "1px solid rgba(6,182,212,0.25)",
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
                                  background: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)",
                                  pointerEvents: "none",
                                }} />
                                
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                  <div style={{
                                    width: "28px", height: "28px",
                                    borderRadius: "8px",
                                    background: "rgba(6,182,212,0.15)",
                                    border: "1px solid rgba(6,182,212,0.2)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ce3f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10"/>
                                      <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                  </div>
                                  <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", color: "#4ce3f7", textTransform: "uppercase" }}>
                                    System Uptime
                                  </p>
                                </div>
                                
                                <p style={{ margin: "0 0 6px", fontSize: "24px", color: "#fff", fontWeight: "800" }}>99.97%</p>
                                
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                                    Last 30 days
                                  </span>
                                  <span style={{ fontSize: "13px", color: "#4ce3f7", fontWeight: "700" }}>
                                    ✓ All systems nominal
                                  </span>
                                </div>
                                
                                <div style={{ height: "3px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: "6px" }}>
                                  <div style={{
                                    height: "100%",
                                    width: "99.97%",
                                    background: "linear-gradient(90deg, #164e63, #06b6d4)",
                                    borderRadius: "3px",
                                    transition: "width 0.8s ease",
                                  }} />
                                </div>
                              </div>

                              {/* Automation Card */}
                              <div className="system-metric-card" style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div style={{
                                    width: "28px", height: "28px",
                                    borderRadius: "8px",
                                    background: "rgba(76,227,247,0.1)",
                                    border: "1px solid rgba(76,227,247,0.15)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ce3f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="23 4 23 10 17 10"/>
                                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                                    </svg>
                                  </div>
                                  <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", letterSpacing: "1px", color: "#4ce3f7", textTransform: "uppercase" }}>
                                    Automation Sweeps
                                  </p>
                                </div>
                                
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                                  <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.5)", lineHeight: "1.5", flex: 1 }}>
                                    No platform automation sweeps recorded.
                                  </p>
                                  <button style={{
                                    background: "rgba(76,227,247,0.08)",
                                    border: "1px solid rgba(76,227,247,0.2)",
                                    color: "#4ce3f7",
                                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                                    padding: "6px 14px",
                                    borderRadius: "8px",
                                    fontWeight: "700",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    fontFamily: "'Quicksand', sans-serif",
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.background = "rgba(76,227,247,0.16)";
                                    e.currentTarget.style.borderColor = "rgba(76,227,247,0.4)";
                                    e.currentTarget.style.color = "#67e8f9";
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(76,227,247,0.15)";
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.background = "rgba(76,227,247,0.08)";
                                    e.currentTarget.style.borderColor = "rgba(76,227,247,0.2)";
                                    e.currentTarget.style.color = "#4ce3f7";
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                                      <polyline points="23 4 23 10 17 10"/>
                                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                                    </svg>
                                    Refire
                                  </button>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* RIGHT CONTENT — now a robust minmax(0,1fr) grid column, stacks full-width on mobile */}
                  <div className="admin-content-area" style={{ minWidth: 0, width: "100%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* HEADER */}
                    <AdminSectionHeader
                      title="System Monitoring"
                      sub="Real-time platform health, uptime telemetry, and operational diagnostics"
                      badge={
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ 
                            width: "8px", 
                            height: "8px", 
                            borderRadius: "50%", 
                            background: "#22c55e", 
                            display: "inline-block",
                            animation: "pulse 2s infinite"
                          }} />
                          ALL SYSTEMS ACTIVE
                        </span>
                      }
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                          <line x1="8" y1="21" x2="16" y2="21"/>
                          <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                      }
                    />

                    {/* SystemMonitoring fills the right panel */}
                    <div className="premium-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px", background: "transparent" }}>
                      <div style={{
                        animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "20px",
                        padding: "24px"
                      }}>
                        <SystemMonitoring />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TEMPLATES ─────────────────────────────── */}
              {activeNav === "templates" && (
                <div className="admin-split-layout"
                  style={{ 
                    display: "flex", 
                    height: "100%", 
                    gap: "32px", 
                    padding: "20px 30px 20px 0px",
                    color: "#f8fafc",
                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                >
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }
                    .premium-scroll::-webkit-scrollbar { width: 6px; }
                    .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                    .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                    .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
                    
                    /* Glass morphism sidebar */
                    .template-sidebar {
                      background: rgba(10, 10, 20, 0.3) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                    }
                    
                    .template-sidebar-header {
                      background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                    }
                    
                    .template-metric { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
                    .template-metric:hover { transform: translateY(-2px); border-color: rgba(22,163,74,0.3) !important; }
                    
                    /* Template category items with glass */
                    .template-category {
                      padding: 10px 12px;
                      border-radius: 10px;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      cursor: pointer;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      background: rgba(255,255,255,0.01);
                      border-left: 3px solid transparent;
                    }
                    .template-category:hover {
                      background: rgba(255,255,255,0.04);
                      border-left-color: var(--cat-color);
                      transform: translateX(2px);
                    }
                    
                    /* Collapsible trigger with green accent */
                    .template-collapsible-trigger {
                      display: flex; align-items: center; justify-content: space-between;
                      width: 100%; padding: 9px 12px;
                      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
                      color: rgba(255,255,255,0.5); cursor: pointer;
                      font-family: inherit; font-size: 11px; font-weight: 700;
                      letter-spacing: 1.5px; text-transform: uppercase;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      border-radius: 12px;
                    }
                    .template-collapsible-trigger:hover {
                      background: rgba(22,163,74,0.08);
                      color: #86efac;
                      border-color: rgba(22,163,74,0.15);
                    }
                    .template-collapsible-trigger.open {
                      border-radius: 12px 12px 0 0;
                      border-color: rgba(22,163,74,0.15);
                      background: rgba(22,163,74,0.06);
                      color: #86efac;
                    }
                    
                    .template-collapsible-content {
                      overflow: hidden;
                      transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1);
                      background: rgba(255,255,255,0.02);
                      border: 1px solid rgba(255,255,255,0.06);
                      border-top: none;
                      border-radius: 0 0 12px 12px;
                    }
                    
                    /* Mobile responsive styles */
                    @media (max-width: 768px) {
                      .admin-split-layout {
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px !important;
                      }
                      .admin-split-layout > div:first-child {
                        flex: 0 0 auto !important;
                        width: 100% !important;
                        position: relative !important;
                        height: auto !important;
                        max-height: 400px !important;
                        overflow-y: auto !important;
                      }
                      .admin-content-area {
                        flex: 1 !important;
                        width: 100% !important;
                      }
                      .admin-section-header {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 8px !important;
                        padding-bottom: 12px !important;
                        margin-bottom: 12px !important;
                      }
                      .admin-section-header h2 {
                        font-size: 18px !important;
                      }
                      .admin-section-header p {
                        font-size: 11px !important;
                      }
                      .admin-section-header-badge {
                        font-size: 9px !important;
                      }
                      .admin-section-header-badge span:last-child {
                        font-size: 9px !important;
                      }
                      .template-categories-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 4px !important;
                      }
                      .template-categories-grid > div {
                        padding: 8px 10px !important;
                        font-size: 11px !important;
                      }
                      .template-categories-grid > div span:last-child {
                        font-size: 9px !important;
                        padding: 0px 6px !important;
                      }
                      .template-categories-grid > div svg {
                        width: 12px !important;
                        height: 12px !important;
                      }
                      .template-content-wrapper {
                        padding: 0 !important;
                        border: none !important;
                        background: transparent !important;
                        border-radius: 0 !important;
                      }
                      .template-content-wrapper > div {
                        padding: 12px !important;
                      }
                    }
                    @media (max-width: 480px) {
                      .template-categories-grid {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 3px !important;
                      }
                      .template-categories-grid > div {
                        padding: 6px 8px !important;
                        font-size: 10px !important;
                        border-radius: 8px !important;
                      }
                      .template-categories-grid > div svg {
                        width: 10px !important;
                        height: 10px !important;
                      }
                      .admin-section-header h2 {
                        font-size: 16px !important;
                      }
                      .admin-section-header p {
                        font-size: 10px !important;
                      }
                      .template-content-wrapper > div {
                        padding: 8px !important;
                      }
                    }
                  `}</style>

                  {/* LEFT SIDEBAR - 22% - STICKY */}
                  <div
                    className="template-sidebar"
                    style={{
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      height: "calc(100vh - 80px)",
                      position: "sticky",
                      top: 0,
                      overflow: "hidden",
                      paddingRight: "4px",
                      flex: "0 0 22%",
                      zIndex: 100
                    }}
                  >
                    {/* STICKY HEADER — never scrolls away */}
                    <div className="template-sidebar-header" style={{
                      paddingBottom: "12px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      flexShrink: 0
                    }}>
                      {/* KPI Widget - Green themed for templates - UNCHANGED */}
                      <div style={{
                        background: "linear-gradient(135deg, #14532d 0%, #16a34a 100%)",
                        padding: "16px", borderRadius: "16px", color: "#fff",
                        boxShadow: "0 8px 24px rgba(22,163,74,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>COMMUNICATION ENGINE</p>
                          <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>Email Templates</p>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Transactional layout library</p>
                        </div>
                        <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* SCROLLABLE CONTENT — Template Categories, Quick Actions */}
                    <div className="premium-scroll" style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingTop: "4px", background: "transparent" }}>

                      {/* ── Template Categories — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setTemplateOpen(p => !p)}
                          className={`template-collapsible-trigger ${templateOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                              <polyline points="22,6 12,13 2,6"/>
                            </svg>
                            Template Types
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: templateOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="template-collapsible-content" style={{ maxHeight: templateOpen ? "300px" : "0px" }}>
                          <div style={{ padding: "4px 8px 8px" }}>
                            <div className="template-categories-grid" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              {[
                                { 
                                  label: "Booking Confirmation", 
                                  count: 2,
                                  color: "#22c55e",
                                  icon: (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                      <polyline points="22 4 12 14.01 9 11.01"/>
                                    </svg>
                                  )
                                },
                                { 
                                  label: "Cancellation", 
                                  count: 1,
                                  color: "#ef4444",
                                  icon: (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10"/>
                                      <line x1="15" y1="9" x2="9" y2="15"/>
                                      <line x1="9" y1="9" x2="15" y2="15"/>
                                    </svg>
                                  )
                                },
                                { 
                                  label: "On Hold", 
                                  count: 1,
                                  color: "#f59e0b",
                                  icon: (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10"/>
                                      <line x1="10" y1="15" x2="10" y2="9"/>
                                      <line x1="14" y1="15" x2="14" y2="9"/>
                                    </svg>
                                  )
                                },
                                { 
                                  label: "Receipt", 
                                  count: 1,
                                  color: "#6366f1",
                                  icon: (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                      <polyline points="14 2 14 8 20 8"/>
                                      <line x1="16" y1="13" x2="8" y2="13"/>
                                      <line x1="16" y1="17" x2="8" y2="17"/>
                                      <polyline points="10 9 9 9 8 9"/>
                                    </svg>
                                  )
                                },
                              ].map(({ icon, label, count, color }) => (
                                <div 
                                  key={label} 
                                  className="template-category"
                                  style={{ 
                                    "--cat-color": color,
                                  }}
                                >
                                  <span style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12.5px", color: "rgba(255,255,255,0.6)", fontWeight: "500" }}>
                                    {icon}
                                    {label}
                                  </span>
                                  <span style={{ 
                                    fontSize: "11px", 
                                    color: color,
                                    background: `${color}15`,
                                    padding: "1px 8px",
                                    borderRadius: "4px",
                                    fontWeight: "700"
                                  }}>
                                    {count}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Template Stats — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setTemplateStatsOpen(p => !p)}
                          className={`template-collapsible-trigger ${templateStatsOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            Template Stats
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: templateStatsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="template-collapsible-content" style={{ maxHeight: templateStatsOpen ? "200px" : "0px" }}>
                          <div style={{ padding: "8px 12px 10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>Total Templates</span>
                              <span style={{ color: "#4ade80", fontSize: "12px", fontWeight: "700" }}>5</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>Active</span>
                              <span style={{ color: "#22c55e", fontSize: "12px", fontWeight: "700" }}>5</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>Last Updated</span>
                              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>2 days ago</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Quick Actions ── */}
                      <button 
                        style={{ 
                          width: "100%", 
                          padding: "12px 16px", 
                          background: "linear-gradient(135deg, #14532d 0%, #16a34a 100%)",
                          border: "1px solid rgba(74, 222, 128, 0.2)",
                          borderRadius: "12px", 
                          color: "#fff", 
                          fontWeight: "700", 
                          fontSize: "12.5px",
                          cursor: "pointer", 
                          fontFamily: "inherit",
                          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                          boxShadow: "0 4px 16px rgba(22, 163, 74, 0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          position: "relative",
                          overflow: "hidden",
                        }}
                        onMouseEnter={e => { 
                          e.currentTarget.style.transform = "translateY(-2px)"; 
                          e.currentTarget.style.boxShadow = "0 8px 30px rgba(22, 163, 74, 0.4)";
                          e.currentTarget.style.borderColor = "rgba(74, 222, 128, 0.4)";
                          e.currentTarget.style.background = "linear-gradient(135deg, #166534 0%, #22c55e 100%)";
                        }}
                        onMouseLeave={e => { 
                          e.currentTarget.style.transform = "translateY(0)"; 
                          e.currentTarget.style.boxShadow = "0 4px 16px rgba(22, 163, 74, 0.25)";
                          e.currentTarget.style.borderColor = "rgba(74, 222, 128, 0.2)";
                          e.currentTarget.style.background = "linear-gradient(135deg, #14532d 0%, #16a34a 100%)";
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Create New Template
                      </button>

                    </div>
                  </div>

                  {/* RIGHT CONTENT - 78% */}
                  <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* HEADER */}
                    <AdminSectionHeader
                      title="Email Templates"
                      sub="Design and manage transactional email layouts for booking lifecycle events"
                      badge={
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ 
                            width: "8px", 
                            height: "8px", 
                            borderRadius: "50%", 
                            background: "#22c55e", 
                            display: "inline-block",
                            animation: "pulse 2s infinite"
                          }} />
                          TEMPLATE EDITOR
                        </span>
                      }
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      }
                    />

                    {/* EMAIL TEMPLATES CONTENT */}
                    <div className="premium-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px", background: "transparent" }}>
                      <div className="template-content-wrapper" style={{
                        animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "20px",
                        padding: "24px"
                      }}>
                        <EmailTemplateEditor />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ADMIN SETTINGS ─────────────────────────────── */}
              {activeNav === "admin_settings" && (
                <div className="admin-split-layout" style={{
                  display: "flex", height: "100%", gap: "32px", 
                  padding: "20px 30px 20px 0px",
                  color: "#f8fafc", fontFamily: "'Quicksand', -apple-system, sans-serif",
                  animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)"
                }}>
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }
                    .as-scroll::-webkit-scrollbar { width: 6px; }
                    .as-scroll::-webkit-scrollbar-track { background: transparent; }
                    .as-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    .as-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                    
                    /* Glass morphism sidebar */
                    .settings-sidebar {
                      background: rgba(10, 10, 20, 0.3) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                    }
                    
                    .settings-sidebar-header {
                      background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                    }
                    
                    .settings-module-item {
                      display: flex; align-items: center; gap: 10px;
                      padding: 10px 14px; border-radius: 10px;
                      border: none; background: transparent;
                      color: rgba(255,255,255,0.45);
                      border-left: 3px solid transparent;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      cursor: pointer;
                      font-family: inherit;
                      font-size: 13px;
                      font-weight: 500;
                      width: 100%;
                      text-align: left;
                    }
                    .settings-module-item:hover {
                      background: rgba(30,64,175,0.08);
                      color: #93c5fd;
                      border-left-color: #1e40af;
                      transform: translateX(2px);
                    }
                    
                    /* Collapsible trigger with navy blue accent */
                    .settings-collapsible-trigger {
                      display: flex; align-items: center; justify-content: space-between;
                      width: 100%; padding: 9px 12px;
                      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
                      color: rgba(255,255,255,0.5); cursor: pointer;
                      font-family: inherit; font-size: 11px; font-weight: 700;
                      letter-spacing: 1.5px; text-transform: uppercase;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      border-radius: 12px;
                    }
                    .settings-collapsible-trigger:hover {
                      background: rgba(30,64,175,0.08);
                      color: #93c5fd;
                      border-color: rgba(30,64,175,0.2);
                    }
                    .settings-collapsible-trigger.open {
                      border-radius: 12px 12px 0 0;
                      border-color: rgba(30,64,175,0.2);
                      background: rgba(30,64,175,0.06);
                      color: #93c5fd;
                    }
                    
                    .settings-collapsible-content {
                      overflow: hidden;
                      transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1);
                      background: rgba(255,255,255,0.02);
                      border: 1px solid rgba(255,255,255,0.06);
                      border-top: none;
                      border-radius: 0 0 12px 12px;
                    }
                    
                    /* Mobile responsive */
                    @media (max-width: 768px) {
                      .admin-split-layout { flex-direction: column !important; gap: 12px !important; padding: 0 !important; }
                      .admin-split-layout > div:first-child {
                        flex: 0 0 auto !important; width: 100% !important; position: relative !important;
                        height: auto !important; max-height: 400px !important;
                        overflow-y: auto !important; padding: 12px !important;
                      }
                      .admin-content-area { flex: 1 !important; width: 100% !important; padding: 0 4px !important; }
                      .admin-section-header { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; padding-bottom: 10px !important; margin-bottom: 10px !important; }
                      .admin-section-header h2 { font-size: 18px !important; }
                      .admin-section-header p { font-size: 11px !important; }
                      .admin-section-header-badge { font-size: 8px !important; }
                      .admin-section-header-badge span:last-child { font-size: 8px !important; }
                      .settings-module-item { padding: 10px 12px !important; font-size: 11px !important; }
                      .settings-content { padding: 12px !important; border-radius: 14px !important; }
                      .settings-inner { padding: 0 4px 20px 4px !important; }
                      .settings-inner > div:first-child { 
                        flex-direction: column !important; align-items: flex-start !important; gap: 12px !important;
                        padding-bottom: 16px !important; margin-bottom: 16px !important;
                      }
                      .settings-inner > div:first-child h2 { font-size: 18px !important; }
                      .settings-inner > div:first-child p { font-size: 11px !important; }
                      .settings-form-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                      .settings-admin-card { padding: 14px 16px !important; flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
                      .settings-admin-card > div:first-child { min-width: auto !important; width: 100% !important; }
                      .settings-admin-card > div:last-child { width: 100% !important; justify-content: flex-start !important; flex-wrap: wrap !important; }
                    }
                    @media (max-width: 480px) {
                      .admin-section-header h2 { font-size: 16px !important; }
                      .admin-section-header p { font-size: 10px !important; }
                      .settings-module-item { padding: 10px !important; font-size: 11px !important; }
                      .settings-content { padding: 8px !important; }
                      .settings-inner { padding: 0 2px 16px 2px !important; }
                      .settings-inner > div:first-child h2 { font-size: 16px !important; }
                      .settings-admin-card { padding: 10px 12px !important; }
                      .settings-admin-card > div:first-child > div:first-child { 
                        width: 24px !important; height: 24px !important; font-size: 11px !important;
                      }
                      .settings-admin-card > div:first-child > span { font-size: 13px !important; }
                    }
                  `}</style>

                  {/* LEFT SIDEBAR — 22% - STICKY */}
                  <div
                    className="settings-sidebar"
                    style={{
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      height: "calc(100vh - 80px)",
                      position: "sticky",
                      top: 0,
                      overflow: "hidden",
                      paddingRight: "4px",
                      flex: "0 0 22%",
                      zIndex: 100
                    }}
                  >
                    {/* STICKY HEADER */}
                    <div
                      className="settings-sidebar-header"
                      style={{
                        paddingBottom: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        flexShrink: 0
                      }}
                    >
                      {/* KPI Widget - NAVY BLUE (UNCHANGED) */}
                      <div style={{
                        background: "linear-gradient(135deg, #0c1a2e 0%, #1e40af 100%)",
                        padding: "16px", borderRadius: "16px", color: "#fff",
                        boxShadow: "0 8px 24px rgba(30,64,175,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>SYSTEM CONFIGURATION</p>
                          <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>Admin Settings</p>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Platform-wide controls</p>
                        </div>
                        <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* SCROLLABLE CONTENT */}
                    <div className="as-scroll" style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingTop: "4px", background: "transparent" }}>

                      {/* ── CONFIG MODULES — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setConfigOpen(p => !p)}
                          className={`settings-collapsible-trigger ${configOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            CONFIG MODULES
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: configOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="settings-collapsible-content" style={{ maxHeight: configOpen ? "400px" : "0px" }}>
                          <div style={{ padding: "6px 8px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {[
                              { label: "General",      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
                              { label: "Roles & RBAC", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
                              { label: "Notifications", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
                              { label: "Security",     icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
                              { label: "Integrations", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
                            ].map(({ label, icon }) => (
                              <button key={label} className="settings-module-item">
                                <span style={{ opacity: 0.5, display: "flex", alignItems: "center" }}>{icon}</span>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── ADMIN ONLY — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setAdminOnlyOpen(p => !p)}
                          className={`settings-collapsible-trigger ${adminOnlyOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            ADMIN ONLY
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: adminOnlyOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="settings-collapsible-content" style={{ maxHeight: adminOnlyOpen ? "120px" : "0px" }}>
                          <div style={{ padding: "10px 12px" }}>
                            <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.4)", lineHeight: "1.6" }}>
                              Changes here affect the entire platform. Only super-admins can modify security and RBAC settings.
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* RIGHT CONTENT — 78% */}
                  <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* HEADER */}
                    <AdminSectionHeader
                      title="Admin Settings"
                      sub="Platform-wide controls, permissions, and operational parameter configuration"
                      badge="SYSTEM CONFIGURATION"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                        </svg>
                      }
                    />

                    {/* ADMIN SETTINGS CONTENT */}
                    <div className="as-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px", background: "transparent" }}>
                      <div className="settings-content" style={{
                        animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "16px",
                        padding: "20px"
                      }}>
                        <AdminSettings />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── AUDIT LOGS ─────────────────────────────── */}
              {activeNav === "audit_logs" && (
                <div className="admin-split-layout" style={{
                  display: "flex", height: "100%", gap: "32px", 
                  padding: "20px 30px 20px 0px",
                  color: "#f8fafc", fontFamily: "'Quicksand', -apple-system, sans-serif",
                  animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)"
                }}>
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }
                    .al-scroll::-webkit-scrollbar { width: 6px; }
                    .al-scroll::-webkit-scrollbar-track { background: transparent; }
                    .al-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    .al-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                    
                    /* Glass morphism sidebar */
                    .audit-sidebar {
                      background: rgba(10, 10, 20, 0.3) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                    }
                    
                    .audit-sidebar-header {
                      background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                    }
                    
                    .audit-filter-item {
                      display: flex; align-items: center; gap: 10px;
                      padding: 10px 14px; border-radius: 10px;
                      border: none; background: transparent;
                      color: rgba(255,255,255,0.45);
                      border-left: 3px solid transparent;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      cursor: pointer;
                      font-family: inherit;
                      font-size: 13px;
                      font-weight: 500;
                      width: 100%;
                      text-align: left;
                    }
                    .audit-filter-item:hover {
                      background: rgba(168,85,247,0.08);
                      color: #c084fc;
                      border-left-color: #a855f7;
                      transform: translateX(2px);
                    }
                    .audit-filter-item.active {
                      background: rgba(168,85,247,0.08);
                      color: #c084fc;
                      border-left-color: #a855f7;
                    }
                    
                    /* Collapsible trigger with purple accent */
                    .audit-collapsible-trigger {
                      display: flex; align-items: center; justify-content: space-between;
                      width: 100%; padding: 9px 12px;
                      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
                      color: rgba(255,255,255,0.5); cursor: pointer;
                      font-family: inherit; font-size: 11px; font-weight: 700;
                      letter-spacing: 1.5px; text-transform: uppercase;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      border-radius: 12px;
                    }
                    .audit-collapsible-trigger:hover {
                      background: rgba(168,85,247,0.04);
                      color: rgba(255,255,255,0.7);
                      border-color: rgba(168,85,247,0.15);
                    }
                    .audit-collapsible-trigger.open {
                      border-radius: 12px 12px 0 0;
                      border-color: rgba(168,85,247,0.15);
                      background: rgba(168,85,247,0.04);
                      color: rgba(255,255,255,0.7);
                    }
                    
                    .audit-collapsible-content {
                      overflow: hidden;
                      transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1);
                      background: rgba(255,255,255,0.02);
                      border: 1px solid rgba(255,255,255,0.06);
                      border-top: none;
                      border-radius: 0 0 12px 12px;
                    }

                    /* Glass morphism for audit log cards */
                    .audit-log-card {
                      background: rgba(255, 255, 255, 0.02) !important;
                      backdrop-filter: blur(8px) !important;
                      -webkit-backdrop-filter: blur(8px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.04) !important;
                      border-radius: 14px !important;
                      padding: 14px 18px !important;
                      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
                      cursor: pointer !important;
                    }
                    .audit-log-card:hover {
                      background: rgba(255, 255, 255, 0.04) !important;
                      border-color: rgba(168,85,247,0.15) !important;
                      transform: translateX(2px) !important;
                      box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
                    }
                    
                    /* Mobile responsive */
                    @media (max-width: 768px) {
                      .admin-split-layout { flex-direction: column !important; gap: 12px !important; padding: 0 !important; }
                      .admin-split-layout > div:first-child {
                        flex: 0 0 auto !important; width: 100% !important; position: relative !important;
                        height: auto !important; max-height: 400px !important;
                        overflow-y: auto !important; padding: 12px !important;
                      }
                      .admin-content-area { flex: 1 !important; width: 100% !important; padding: 0 4px !important; }
                      .admin-section-header { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; padding-bottom: 10px !important; margin-bottom: 10px !important; }
                      .admin-section-header h2 { font-size: 18px !important; }
                      .admin-section-header p { font-size: 11px !important; }
                      .admin-section-header-badge { font-size: 8px !important; }
                      .admin-section-header-badge span:last-child { font-size: 8px !important; }
                      .audit-filter-item { padding: 12px !important; font-size: 12px !important; }
                      .audit-logs-content { padding: 12px !important; border-radius: 14px !important; }

                      /* ── KPI widget: pin to the top of the page instead of
                         scrolling away with the rest of the sidebar. The
                         sidebar itself goes back to plain document flow
                         (no sticky, no capped scroll box) — only its small
                         header portion detaches and sticks. The extra
                         specificity here (.admin-split-layout > .audit-sidebar)
                         matches the generic rule above so this wins the cascade. */
                      .admin-split-layout > .audit-sidebar {
                        position: relative !important;
                        height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        display: block !important;
                        padding: 0 !important;
                      }
                      .audit-sidebar-header {
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 40 !important;
                        padding: 10px 12px !important;
                        margin: 0 0 10px !important;
                        border-radius: 14px !important;
                        border-bottom: none !important;
                      }
                      .audit-sidebar .al-scroll {
                        overflow: visible !important;
                        max-height: none !important;
                        padding: 0 !important;
                      }
                    }
                    @media (max-width: 480px) {
                      .admin-section-header h2 { font-size: 16px !important; }
                      .admin-section-header p { font-size: 10px !important; }
                      .audit-filter-item { padding: 10px !important; font-size: 12px !important; }
                      .audit-logs-content { padding: 8px !important; }
                      .audit-sidebar-header { padding: 0px !important; }
                    }
                  `}</style>

                  {/* LEFT SIDEBAR — 22% - STICKY */}
                  <div
                    className="audit-sidebar"
                    style={{
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      height: "calc(100vh - 80px)",
                      position: "sticky",
                      top: 0,
                      overflow: "hidden",
                      paddingRight: "4px",
                      flex: "0 0 22%",
                      zIndex: 100
                    }}
                  >
                    {/* STICKY HEADER */}
                    <div
                      className="audit-sidebar-header"
                      style={{
                        paddingBottom: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        flexShrink: 0
                      }}
                    >
                      {/* KPI Widget - Purple theme */}
                      <div style={{
                        background: "linear-gradient(135deg, #2e1065 0%, #7c3aed 100%)",
                        padding: "16px", borderRadius: "16px", color: "#fff",
                        boxShadow: "0 8px 24px rgba(124,58,237,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>COMPLIANCE TRAIL</p>
                          <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>Audit Logs</p>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Immutable action record</p>
                        </div>
                        <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* SCROLLABLE CONTENT */}
                    <div className="al-scroll" style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingTop: "4px", background: "transparent" }}>

                      {/* ── LOG FILTERS — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setAuditOpen(p => !p)}
                          className={`audit-collapsible-trigger ${auditOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            LOG FILTERS
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: auditOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="audit-collapsible-content" style={{ maxHeight: auditOpen ? "400px" : "0px" }}>
                          <div style={{ padding: "6px 8px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {[
                              { id: "all",     label: "All Actions",       icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
                              { id: "booking", label: "Booking Events",    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                              { id: "dealer",  label: "Dealer Actions",    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
                              { id: "user",    label: "User Mutations",    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
                              { id: "system",  label: "System Events",     icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
                            ].map(({ id, label, icon }) => (
                              <button 
                                key={id} 
                                className="audit-filter-item"
                                onClick={() => {
                                  if (id === "all") {
                                    setFilterAction("");
                                  } else {
                                    const actionMap = {
                                      booking: ["booking_approved", "booking_cancelled", "booking_rejected", "booking_on_hold"],
                                      dealer: ["dealer_approved", "dealer_rejected", "dealer_suspended"],
                                      user: ["user_suspended", "user_deleted"],
                                      system: ["admin_created", "admin_role_changed", "admin_deactivated"],
                                    };
                                    setFilterAction(actionMap[id]?.[0] || "");
                                  }
                                }}
                              >
                                <span style={{ opacity: 0.5, display: "flex", alignItems: "center" }}>{icon}</span>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── TAMPER-PROOF — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setTamperOpen(p => !p)}
                          className={`audit-collapsible-trigger ${tamperOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            TAMPER-PROOF
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: tamperOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="audit-collapsible-content" style={{ maxHeight: tamperOpen ? "120px" : "0px" }}>
                          <div style={{ padding: "10px 12px" }}>
                            <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.4)", lineHeight: "1.6" }}>
                              All entries are write-once. No admin can delete or modify log history once committed.
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* RIGHT CONTENT — 78% */}
                  <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* HEADER */}
                    <AdminSectionHeader
                      title="Audit Logs"
                      sub="Immutable chronological record of all admin actions and platform events"
                      badge="SECURE COMPLIANCE TRAIL"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      }
                    />

                    {/* AUDIT LOGS CONTENT */}
                    <div className="al-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px", background: "transparent" }}>
                      <div className="audit-logs-content" style={{
                        animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "16px",
                        padding: "20px"
                      }}>
                        <AuditLogs />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── EXPORT REPORTS ─────────────────────────────── */}
              {activeNav === "export_reports" && (
                <div className="admin-split-layout" style={{
                  display: "flex", height: "100%", gap: "32px", 
                  padding: "20px 30px 20px 0px",
                  color: "#f8fafc", fontFamily: "'Quicksand', -apple-system, sans-serif",
                  animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)"
                }}>
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }
                    .er-scroll::-webkit-scrollbar { width: 6px; }
                    .er-scroll::-webkit-scrollbar-track { background: transparent; }
                    .er-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    .er-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                    
                    /* Glass morphism sidebar */
                    .export-sidebar {
                      background: rgba(10, 10, 20, 0.3) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                    }
                    
                    .export-sidebar-header {
                      background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                    }
                    
                    .export-format-item {
                      display: flex; align-items: center; justify-content: space-between;
                      padding: 10px 14px; border-radius: 10px;
                      border: none; background: transparent;
                      color: rgba(255,255,255,0.45);
                      border-left: 3px solid transparent;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      cursor: pointer;
                      font-family: inherit;
                      font-size: 13px;
                      font-weight: 500;
                      width: 100%;
                      text-align: left;
                    }
                    .export-format-item:hover {
                      background: rgba(16,185,129,0.08);
                      color: #a7f3d0;
                      border-left-color: #10b981;
                      transform: translateX(2px);
                    }
                    
                    /* Collapsible trigger with green accent */
                    .export-collapsible-trigger {
                      display: flex; align-items: center; justify-content: space-between;
                      width: 100%; padding: 9px 12px;
                      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
                      color: rgba(255,255,255,0.5); cursor: pointer;
                      font-family: inherit; font-size: 11px; font-weight: 700;
                      letter-spacing: 1.5px; text-transform: uppercase;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      border-radius: 12px;
                    }
                    .export-collapsible-trigger:hover {
                      background: rgba(16,185,129,0.08);
                      color: #a7f3d0;
                      border-color: rgba(16,185,129,0.15);
                    }
                    .export-collapsible-trigger.open {
                      border-radius: 12px 12px 0 0;
                      border-color: rgba(16,185,129,0.15);
                      background: rgba(16,185,129,0.06);
                      color: #a7f3d0;
                    }
                    
                    .export-collapsible-content {
                      overflow: hidden;
                      transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1);
                      background: rgba(255,255,255,0.02);
                      border: 1px solid rgba(255,255,255,0.06);
                      border-top: none;
                      border-radius: 0 0 12px 12px;
                    }
                    
                    /* Mobile responsive */
                    @media (max-width: 768px) {
                      .admin-split-layout { flex-direction: column !important; gap: 12px !important; padding: 0 !important; }
                      .admin-split-layout > div:first-child {
                        flex: 0 0 auto !important; width: 100% !important; position: relative !important;
                        height: auto !important; max-height: 400px !important;
                        overflow-y: auto !important; padding: 12px !important;
                      }
                      .admin-content-area { flex: 1 !important; width: 100% !important; padding: 0 4px !important; }
                      .admin-section-header { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; padding-bottom: 10px !important; margin-bottom: 10px !important; }
                      .admin-section-header h2 { font-size: 18px !important; }
                      .admin-section-header p { font-size: 11px !important; }
                      .admin-section-header-badge { font-size: 8px !important; }
                      .admin-section-header-badge span:last-child { font-size: 8px !important; }
                      .export-format-item { padding: 10px 12px !important; font-size: 11px !important; }
                      .export-content { padding: 12px !important; border-radius: 14px !important; }
                      .export-inner { padding: 0 4px 20px 4px !important; }
                      .export-inner > div:first-child { 
                        padding-bottom: 14px !important; margin-bottom: 16px !important;
                      }
                      .export-inner > div:first-child h2 { font-size: 18px !important; }
                      .export-inner > div:first-child p { font-size: 11px !important; }
                      .export-form-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                      .export-control-bar { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; padding: 14px 16px !important; }
                      .export-control-bar > div:first-child { text-align: center !important; }
                      .export-control-bar > div:first-child span:first-child { font-size: 11px !important; }
                      .export-control-bar > div:first-child span:last-child { font-size: 18px !important; }
                      .export-format-buttons { flex-wrap: wrap !important; }
                      .export-format-buttons button { flex: 1 1 auto !important; min-width: 80px !important; padding: 10px 12px !important; font-size: 11px !important; }
                      .export-quick-links { flex-direction: column !important; gap: 6px !important; }
                      .export-quick-links button { width: 100% !important; justify-content: center !important; padding: 10px !important; font-size: 11px !important; }
                    }
                    @media (max-width: 480px) {
                      .admin-section-header h2 { font-size: 16px !important; }
                      .admin-section-header p { font-size: 10px !important; }
                      .export-format-item { padding: 10px !important; font-size: 11px !important; }
                      .export-content { padding: 8px !important; }
                      .export-inner { padding: 0 2px 16px 2px !important; }
                      .export-inner > div:first-child h2 { font-size: 16px !important; }
                      .export-form-grid { gap: 8px !important; }
                      .export-control-bar { padding: 10px 12px !important; }
                      .export-control-bar > div:first-child span:last-child { font-size: 16px !important; }
                      .export-format-buttons button { min-width: 60px !important; padding: 8px !important; font-size: 10px !important; }
                      .export-quick-links button { font-size: 10px !important; padding: 8px !important; }
                    }
                  `}</style>

                  {/* LEFT SIDEBAR — 22% - STICKY */}
                  <div
                    className="export-sidebar"
                    style={{
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      height: "calc(100vh - 80px)",
                      position: "sticky",
                      top: 0,
                      overflow: "hidden",
                      paddingRight: "4px",
                      flex: "0 0 22%",
                      zIndex: 100
                    }}
                  >
                    {/* STICKY HEADER */}
                    <div
                      className="export-sidebar-header"
                      style={{
                        paddingBottom: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        flexShrink: 0
                      }}
                    >
                      {/* KPI Widget - Green theme (UNCHANGED) */}
                      <div style={{
                        background: "linear-gradient(135deg, #052e16 0%, #059669 100%)",
                        padding: "16px", borderRadius: "16px", color: "#fff",
                        boxShadow: "0 8px 24px rgba(5,150,105,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>DATA EXPORT ENGINE</p>
                          <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>Export Reports</p>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Structured data downloads</p>
                        </div>
                        <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* SCROLLABLE CONTENT */}
                    <div className="er-scroll" style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingTop: "4px", background: "transparent" }}>

                      {/* ── EXPORT FORMATS — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setExportOpen(p => !p)}
                          className={`export-collapsible-trigger ${exportOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            EXPORT FORMATS
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: exportOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="export-collapsible-content" style={{ maxHeight: exportOpen ? "400px" : "0px" }}>
                          <div style={{ padding: "6px 8px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {[
                              { label: "Bookings CSV",    badge: "CSV",  color: "#34d399",
                                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
                              { label: "Users JSON",      badge: "JSON", color: "#60a5fa",
                                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
                              { label: "Revenue PDF",     badge: "PDF",  color: "#f87171",
                                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
                              { label: "Dealers Report",  badge: "XLSX", color: "#fbbf24",
                                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
                            ].map(({ label, badge, color, icon }) => (
                              <button key={label} className="export-format-item">
                                <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{ opacity: 0.5, display: "flex", alignItems: "center" }}>{icon}</span>
                                  {label}
                                </span>
                                <span style={{ fontSize: "9px", fontWeight: "800", color, background: `${color}18`, border: `1px solid ${color}35`, padding: "2px 7px", borderRadius: "5px", letterSpacing: "0.5px" }}>
                                  {badge}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── AVAILABLE DATA — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setDataOpen(p => !p)}
                          className={`export-collapsible-trigger ${dataOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="20" x2="18" y2="10"/>
                              <line x1="12" y1="20" x2="12" y2="4"/>
                              <line x1="6" y1="20" x2="6" y2="14"/>
                            </svg>
                            AVAILABLE DATA
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: dataOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="export-collapsible-content" style={{ maxHeight: dataOpen ? "200px" : "0px" }}>
                          <div style={{ padding: "8px 12px 10px" }}>
                            {[
                              ["Total Bookings",  bookings.length,  "#34d399"],
                              ["Total Users",     users.length,     "#60a5fa"],
                              ["Total Dealers",   dealers.length,   "#fbbf24"],
                              ["Total Cars",      cars.length,      "#a855f7"],
                            ].map(([label, value, color]) => (
                              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>{label}</span>
                                <span style={{ color, fontSize: "11px", fontWeight: "700" }}>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── EXPORT NOTE — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setNoteOpen(p => !p)}
                          className={`export-collapsible-trigger ${noteOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            EXPORT NOTE
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: noteOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="export-collapsible-content" style={{ maxHeight: noteOpen ? "120px" : "0px" }}>
                          <div style={{ padding: "10px 12px" }}>
                            <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.4)", lineHeight: "1.6" }}>
                              Exports include all records up to the moment of generation. Large datasets may take a few seconds.
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* RIGHT CONTENT — 78% */}
                  <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* HEADER */}
                    <AdminSectionHeader
                      title="Export Reports"
                      sub="Generate and download structured data exports across all platform modules"
                      badge="DATA EXPORT ENGINE"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      }
                    />

                    {/* EXPORT REPORTS CONTENT */}
                    <div className="er-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px", background: "transparent" }}>
                      <div className="export-content" style={{
                        animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "16px",
                        padding: "20px"
                      }}>
                        <ExportReports bookings={bookings} users={users} dealers={dealers} cars={cars} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── DATA BACKUP ─────────────────────────────── */}
              {activeNav === "data_backup" && (
                <div className="admin-split-layout" style={{
                  display: "flex", height: "100%", gap: "32px", 
                  padding: "20px 30px 20px 0px",
                  color: "#f8fafc", fontFamily: "'Quicksand', -apple-system, sans-serif",
                  animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)"
                }}>
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }
                    .db-scroll::-webkit-scrollbar { width: 6px; }
                    .db-scroll::-webkit-scrollbar-track { background: transparent; }
                    .db-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    .db-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                    
                    /* Glass morphism sidebar */
                    .backup-sidebar {
                      background: rgba(10, 10, 20, 0.3) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                    }
                    
                    .backup-sidebar-header {
                      background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                    }
                    
                    .backup-status-item {
                      display: flex; justify-content: space-between; align-items: center;
                      padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
                      cursor: pointer;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      border-radius: 6px;
                      padding: 8px 10px;
                    }
                    .backup-status-item:hover {
                      background: rgba(234,88,12,0.08);
                      padding-left: 14px;
                      border-color: rgba(234,88,12,0.15);
                    }
                    
                    .backup-type-item {
                      display: flex; align-items: center; gap: 10px;
                      padding: 10px 14px; border-radius: 10px;
                      border: none; background: transparent;
                      color: rgba(255,255,255,0.45);
                      border-left: 3px solid transparent;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      cursor: pointer;
                      font-family: inherit;
                      font-size: 13px;
                      font-weight: 500;
                      width: 100%;
                      text-align: left;
                    }
                    .backup-type-item:hover {
                      background: rgba(234,88,12,0.08);
                      color: #fdba74;
                      border-left-color: #ea580c;
                      transform: translateX(2px);
                    }
                    
                    /* Collapsible trigger with copper/orange accent */
                    .backup-collapsible-trigger {
                      display: flex; align-items: center; justify-content: space-between;
                      width: 100%; padding: 9px 12px;
                      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
                      color: rgba(255,255,255,0.5); cursor: pointer;
                      font-family: inherit; font-size: 11px; font-weight: 700;
                      letter-spacing: 1.5px; text-transform: uppercase;
                      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                      border-radius: 12px;
                    }
                    .backup-collapsible-trigger:hover {
                      background: rgba(234,88,12,0.08);
                      color: #fdba74;
                      border-color: rgba(234,88,12,0.15);
                    }
                    .backup-collapsible-trigger.open {
                      border-radius: 12px 12px 0 0;
                      border-color: rgba(234,88,12,0.15);
                      background: rgba(234,88,12,0.06);
                      color: #fdba74;
                    }
                    
                    .backup-collapsible-content {
                      overflow: hidden;
                      transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1);
                      background: rgba(255,255,255,0.02);
                      border: 1px solid rgba(255,255,255,0.06);
                      border-top: none;
                      border-radius: 0 0 12px 12px;
                    }
                    
                    /* Glass morphism for backup cards */
                    .backup-item-card {
                      background: rgba(255, 255, 255, 0.02) !important;
                      backdrop-filter: blur(8px) !important;
                      -webkit-backdrop-filter: blur(8px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.06) !important;
                      border-radius: 14px !important;
                      padding: 14px 18px !important;
                      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
                    }
                    .backup-item-card:hover {
                      background: rgba(255, 255, 255, 0.04) !important;
                      border-color: rgba(234,88,12,0.15) !important;
                      transform: translateY(-2px) !important;
                      box-shadow: 0 8px 24px rgba(0,0,0,0.15), 0 0 20px rgba(234,88,12,0.03) !important;
                    }
                    
                    /* Mobile responsive */
                    @media (max-width: 768px) {
                      .admin-split-layout { flex-direction: column !important; gap: 12px !important; padding: 0 !important; }
                      .admin-split-layout > div:first-child {
                        flex: 0 0 auto !important; width: 100% !important; position: relative !important;
                        height: auto !important; max-height: 400px !important;
                        overflow-y: auto !important; padding: 12px !important;
                      }
                      .admin-content-area { flex: 1 !important; width: 100% !important; padding: 0 4px !important; }
                      .admin-section-header { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; padding-bottom: 10px !important; margin-bottom: 10px !important; }
                      .admin-section-header h2 { font-size: 18px !important; }
                      .admin-section-header p { font-size: 11px !important; }
                      .admin-section-header-badge { font-size: 8px !important; }
                      .admin-section-header-badge span:last-child { font-size: 8px !important; }
                      .backup-type-item { padding: 8px 12px !important; font-size: 11px !important; }
                      .backup-content { padding: 12px !important; border-radius: 14px !important; }
                      .backup-inner { padding: 0 2px 16px 2px !important; }
                      .backup-inner > div:first-child { 
                        flex-direction: column !important; align-items: flex-start !important; gap: 8px !important;
                        padding-bottom: 12px !important; margin-bottom: 14px !important;
                      }
                      .backup-inner > div:first-child h2 { font-size: 18px !important; }
                      .backup-inner > div:first-child p { font-size: 11px !important; }
                      .backup-create-card { padding: 16px !important; border-radius: 14px !important; }
                      .backup-create-card > div:first-child h3 { font-size: 15px !important; }
                      .backup-checkbox-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
                      .backup-checkbox-grid label { padding: 8px 10px !important; }
                      .backup-checkbox-grid label span { font-size: 12px !important; }
                      .backup-checkbox-grid label > div:last-child > div:first-child { font-size: 12px !important; }
                      .backup-saved-card { padding: 16px !important; border-radius: 14px !important; }
                      .backup-saved-card > div:first-child h3 { font-size: 15px !important; }
                      .backup-item { padding: 12px 14px !important; flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
                      .backup-item > div:first-child { width: 100% !important; }
                      .backup-item > div:last-child { width: 100% !important; justify-content: flex-start !important; flex-wrap: wrap !important; }
                      .backup-item > div:last-child button { flex: 1 !important; min-width: 80px !important; justify-content: center !important; font-size: 11px !important; padding: 6px 10px !important; }
                    }
                    @media (max-width: 480px) {
                      .admin-section-header h2 { font-size: 16px !important; }
                      .admin-section-header p { font-size: 10px !important; }
                      .backup-type-item { padding: 6px 10px !important; font-size: 10px !important; }
                      .backup-content { padding: 8px !important; }
                      .backup-inner { padding: 0 2px 12px 2px !important; }
                      .backup-inner > div:first-child h2 { font-size: 16px !important; }
                      .backup-create-card { padding: 12px !important; }
                      .backup-checkbox-grid { grid-template-columns: 1fr !important; gap: 6px !important; }
                      .backup-checkbox-grid label { padding: 6px 8px !important; }
                      .backup-item { padding: 10px 12px !important; }
                      .backup-item > div:last-child button { min-width: 60px !important; font-size: 10px !important; padding: 5px 8px !important; }
                      .backup-item > div:first-child > div:first-child span:first-child { font-size: 13px !important; }
                    }
                  `}</style>

                  {/* LEFT SIDEBAR — 22% - STICKY */}
                  <div
                    className="backup-sidebar"
                    style={{
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      height: "calc(100vh - 80px)",
                      position: "sticky",
                      top: 0,
                      overflow: "hidden",
                      paddingRight: "4px",
                      flex: "0 0 22%",
                      zIndex: 100
                    }}
                  >
                    {/* STICKY HEADER */}
                    <div
                      className="backup-sidebar-header"
                      style={{
                        paddingBottom: "12px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        flexShrink: 0
                      }}
                    >
                      {/* KPI Widget - Orange/Copper theme (UNCHANGED) */}
                      <div style={{
                        background: "linear-gradient(135deg, #431407 0%, #ea580c 100%)",
                        padding: "16px", borderRadius: "16px", color: "#fff",
                        boxShadow: "0 8px 24px rgba(234,88,12,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>DATA RESILIENCE</p>
                          <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>Data Backup</p>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Snapshots & recovery points</p>
                        </div>
                        <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="5" rx="9" ry="3"/>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* SCROLLABLE CONTENT */}
                    <div className="db-scroll" style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingTop: "4px", background: "transparent" }}>

                      {/* ── BACKUP STATUS — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setBackupOpen(p => !p)}
                          className={`backup-collapsible-trigger ${backupOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            BACKUP STATUS
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: backupOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="backup-collapsible-content" style={{ maxHeight: backupOpen ? "300px" : "0px" }}>
                          <div style={{ padding: "8px 12px 10px" }}>
                            {[
                              { label: "Bookings",  time: "2h ago",   color: "#34d399", ok: true },
                              { label: "Users",     time: "2h ago",   color: "#34d399", ok: true },
                              { label: "Dealers",   time: "6h ago",   color: "#fbbf24", ok: true },
                              { label: "Reviews",   time: "Failed",   color: "#f87171", ok: false },
                            ].map(({ label, time, color, ok }) => (
                              <div key={label} className="backup-status-item">
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  {ok
                                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                  }
                                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>{label}</span>
                                </div>
                                <span style={{ color, fontSize: "11px", fontWeight: "700" }}>{time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── RECOVERY TYPES — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setRecoveryOpen(p => !p)}
                          className={`backup-collapsible-trigger ${recoveryOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                            </svg>
                            RECOVERY TYPES
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: recoveryOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="backup-collapsible-content" style={{ maxHeight: recoveryOpen ? "200px" : "0px" }}>
                          <div style={{ padding: "6px 8px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
                            {[
                              { label: "Auto Snapshot",   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> },
                              { label: "Manual Export",   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
                              { label: "Point-in-Time",   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
                            ].map(({ label, icon }) => (
                              <button key={label} className="backup-type-item">
                                <span style={{ opacity: 0.5, display: "flex", alignItems: "center" }}>{icon}</span>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── RETENTION POLICY — COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setRetentionOpen(p => !p)}
                          className={`backup-collapsible-trigger ${retentionOpen ? 'open' : ''}`}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            RETENTION POLICY
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: retentionOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className="backup-collapsible-content" style={{ maxHeight: retentionOpen ? "120px" : "0px" }}>
                          <div style={{ padding: "10px 12px" }}>
                            <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.4)", lineHeight: "1.6" }}>
                              Snapshots are retained for 30 days. Manual exports persist indefinitely in your storage bucket.
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* RIGHT CONTENT — 78% */}
                  <div className="admin-content-area" style={{ flex: "0 0 78%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* HEADER */}
                    <AdminSectionHeader
                      title="Data Backup"
                      sub="Scheduled snapshots, recovery points, and platform data integrity management"
                      badge="DATA RESILIENCE LAYER"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <ellipse cx="12" cy="5" rx="9" ry="3"/>
                          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                        </svg>
                      }
                    />

                    {/* DATA BACKUP CONTENT */}
                    <div className="db-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px", background: "transparent" }}>
                      <div className="backup-content" style={{
                        animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)",
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "16px",
                        padding: "20px"
                      }}>
                        <DataBackup />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── OVERVIEW ─────────────────────────────────── */}
              {activeNav === "overview" && (
                <div className="admin-split-layout"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(260px, 22%) minmax(0, 1fr)",
                    width: "100%",
                    maxWidth: "100%",
                    height: "100%",
                    gap: "32px",
                    padding: "20px 30px 20px 0px",
                    boxSizing: "border-box",
                    color: "#f8fafc",
                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <style>{`
                    @keyframes fadeIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }

                    .admin-split-layout > * { position: relative; z-index: 1; }
                    
                    /* Glass morphism metric panels */
                    .metric-panel {
                      background: rgba(255, 255, 255, 0.03) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.08) !important;
                      border-radius: 16px !important;
                      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
                      position: relative !important;
                      overflow: hidden !important;
                    }
                    .metric-panel:hover {
                      background: rgba(255, 255, 255, 0.06) !important;
                      transform: translateY(-2px) !important;
                      border-color: rgba(168, 85, 247, 0.3) !important;
                      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 0 20px rgba(168, 85, 247, 0.05) !important;
                    }
                    
                    .sub-drawer {
                      transition: max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, padding 0.35s ease;
                      overflow: hidden;
                      background: rgba(0, 0, 0, 0.12) !important;
                      border-top: 1px solid rgba(255, 255, 255, 0.04) !important;
                    }
                    .sub-row {
                      transition: background 0.2s ease, transform 0.2s ease;
                    }
                    .sub-row:hover {
                      background: rgba(168, 85, 247, 0.04) !important;
                      transform: translateX(4px) !important;
                      border-radius: 6px !important;
                    }
                    
                    /* Glass morphism subsystem cards */
                    .subsystem-card {
                      background: rgba(255, 255, 255, 0.02) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.06) !important;
                      border-radius: 16px !important;
                      padding: 20px !important;
                      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
                      max-width: 100% !important;
                      overflow-x: hidden !important;
                    }
                    .subsystem-card:hover {
                      border-color: rgba(168, 85, 247, 0.2) !important;
                      background: rgba(255, 255, 255, 0.04) !important;
                      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 20px rgba(168, 85, 247, 0.03) !important;
                      transform: translateY(-2px) !important;
                    }
                    
                    .toggle-indicator {
                      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    
                    .premium-scroll::-webkit-scrollbar { width: 6px; }
                    .premium-scroll::-webkit-scrollbar-track { background: transparent; }
                    .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                    .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

                    /* Glass morphism sidebar */
                    .overview-sidebar {
                      background: rgba(10, 10, 20, 0.3) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                      min-width: 0 !important;
                    }
                    
                    .overview-sidebar-header {
                      background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                    }
                    
                    /* Live telemetry container */
                    .live-telemetry-container {
                      background: rgba(255, 255, 255, 0.02) !important;
                      backdrop-filter: blur(8px) !important;
                      -webkit-backdrop-filter: blur(8px) !important;
                      border: 1px solid rgba(255, 255, 255, 0.06) !important;
                      border-radius: 14px !important;
                      padding: 14px !important;
                      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    }
                    .live-telemetry-container:hover {
                      border-color: rgba(168, 85, 247, 0.2) !important;
                      background: rgba(255, 255, 255, 0.04) !important;
                    }

                    /* ══════════════════════════════════════════════
                       MOBILE RESPONSIVE — targets real class names,
                       not the fragile ":first-child" positional
                       selector (that never matched because the
                       <style> tag itself was the actual first child).
                    ══════════════════════════════════════════════ */
                    @media (max-width: 768px) {
                      .admin-split-layout {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 12px 0px !important;
                        width: 100% !important;
                        overflow: visible !important;
                      }

                      .overview-sidebar {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        min-width: 0 !important;
                        position: relative !important;
                        top: auto !important;
                        height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        padding-right: 0 !important;
                      }

                      .overview-sidebar-header {
                        position: relative !important;
                        top: auto !important;
                      }

                      .overview-sidebar .premium-scroll {
                        overflow-y: visible !important;
                        overflow-x: hidden !important;
                        max-height: none !important;
                      }

                      .admin-content-area {
                        width: 100% !important;
                        min-width: 0 !important;
                        max-width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                      }

                      .live-telemetry-container {
                        flex-direction: row !important;
                        flex-wrap: wrap !important;
                        align-items: center !important;
                        gap: 8px !important;
                      }
                      .live-telemetry-container > div:first-child {
                        flex: 1 !important;
                        min-width: 120px !important;
                        font-size: 9px !important;
                        padding: 8px !important;
                      }
                      .live-telemetry-container > div:last-child {
                        flex: 0 0 auto !important;
                        border-top: none !important;
                        padding-top: 0 !important;
                        padding-left: 12px !important;
                        border-left: 1px solid rgba(255,255,255,0.06) !important;
                      }
                      .admin-overview-metric-grid {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 10px !important;
                      }
                      .admin-section-header {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 8px !important;
                        padding-bottom: 12px !important;
                        margin-bottom: 12px !important;
                      }
                      .admin-section-header h2 { font-size: 18px !important; }
                      .admin-section-header p { font-size: 11px !important; }
                      .admin-section-header > div:last-child { font-size: 9px !important; }
                      .admin-section-header > div:last-child span:last-child { font-size: 9px !important; }
                    }

                    @media (max-width: 480px) {
                      .admin-overview-metric-grid {
                        grid-template-columns: 1fr !important;
                        gap: 8px !important;
                      }
                      .admin-section-header h2 { font-size: 16px !important; }
                      .admin-section-header p { font-size: 10px !important; }
                      .subsystem-card { padding: 14px !important; }
                      .subsystem-card h3 { font-size: 12px !important; }
                    }
                  `}</style>

                  {/* LEFT SIDEBAR - 22% - STICKY on desktop, stacks on mobile */}
                  <div
                    className="overview-sidebar"
                    style={{
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      height: "calc(100vh - 80px)",
                      position: "sticky",
                      top: 0,
                      overflow: "hidden",
                      minWidth: 0,
                      paddingRight: "4px",
                      zIndex: 100
                    }}
                  >
                    {/* STICKY HEADER */}
                    <div className="overview-sidebar-header" style={{
                      paddingBottom: "12px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      flexShrink: 0
                    }}>
                      
                      {/* KPI Widget - Steel Slate themed */}
                      <div style={{
                        background: "linear-gradient(135deg, #334155 0%, #64748b 100%)",
                        padding: "16px", borderRadius: "16px", color: "#fff",
                        boxShadow: "0 8px 24px rgba(100,116,139,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        marginBottom: "12px"
                      }}>
                        <div>
                          <p style={{ margin: "0 0 4px", fontSize: "10px", letterSpacing: "2px", fontWeight: "700", opacity: 0.65 }}>COMMAND OVERVIEW</p>
                          <p style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "18px", letterSpacing: "-0.4px", lineHeight: 1.1 }}>Performance</p>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "500", opacity: 0.55 }}>Platform KPI index</p>
                        </div>
                        <div style={{ width: "40px", height: "40px", borderRadius: "11px", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"/>
                            <rect x="14" y="3" width="7" height="7"/>
                            <rect x="14" y="14" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* SCROLLABLE CONTENT — Telemetry, Metadata */}
                    <div className="premium-scroll" style={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, paddingTop: "4px", background: "transparent" }}>

                      {/* ── Live Telemetry Panel ── */}
                      <div className="live-telemetry-container" style={{ 
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        marginBottom: "12px"
                      }}>
                        <div style={{ 
                          fontSize: "10px", 
                          color: "#a855f7", 
                          fontWeight: "700", 
                          textTransform: "uppercase", 
                          letterSpacing: "1px", 
                          background: "rgba(168,85,247,0.08)", 
                          padding: "4px 10px", 
                          borderRadius: "6px", 
                          border: "1px solid rgba(168,85,247,0.15)", 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "6px", 
                          justifyContent: "center" 
                        }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a855f7", display: "inline-block", boxShadow: "0 0 6px #a855f7" }} />
                          Live telemetry active
                        </div>
                        <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
                          <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: "500" }}>System Clock</p>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#fff", fontWeight: "700" }}>
                            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>

                      {/* ── Micro Metrics Sidebar Ledger - COLLAPSIBLE ── */}
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setMetricsOpen(p => !p)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            width: "100%", padding: "9px 12px",
                            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: metricsOpen ? "12px 12px 0 0" : "12px",
                            color: "rgba(255,255,255,0.5)", cursor: "pointer",
                            fontFamily: "inherit", fontSize: "11px", fontWeight: "700",
                            letterSpacing: "1.5px", textTransform: "uppercase",
                            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(168,85,247,0.04)";
                            e.currentTarget.style.borderColor = "rgba(168,85,247,0.15)";
                            e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            Platform Metrics
                          </span>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", transform: metricsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div className={`platform-metrics-collapsible ${!metricsOpen ? 'collapsed' : ''}`} style={{
                          maxHeight: metricsOpen ? "300px" : "0px",
                          overflow: "hidden",
                          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
                          background: "rgba(255,255,255,0.02)",
                          border: metricsOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
                          borderTop: "none",
                          borderRadius: "0 0 12px 12px"
                        }}>
                          <div style={{ padding: "8px 12px 10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <span style={{ color: "rgba(255,255,255,0.4)" }}>User Profiles:</span>
                              <span style={{ color: "#a855f7", fontWeight: "700" }}>{users.length}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <span style={{ color: "rgba(255,255,255,0.4)" }}>Gross Ledger:</span>
                              <span style={{ color: "#22c55e", fontWeight: "700" }}>${totalRevenue.toLocaleString()}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <span style={{ color: "rgba(255,255,255,0.4)" }}>Total Bookings:</span>
                              <span style={{ color: "#4ce3f7", fontWeight: "700" }}>{bookings.length}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0" }}>
                              <span style={{ color: "rgba(255,255,255,0.4)" }}>Avg. Booking Value:</span>
                              <span style={{ color: "#a855f7", fontWeight: "700" }}>${(totalRevenue / (bookings.length || 1)).toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* RIGHT CONTENT — now a robust minmax(0,1fr) grid column, stacks full-width on mobile */}
                  <div className="admin-content-area" style={{ minWidth: 0, width: "100%", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                    
                    {/* HEADER BANNER */}
                    <AdminSectionHeader
                      title="Performance Insights"
                      sub="Real-time financial breakdown, booking conversions, and lifecycle metrics"
                      badge="VERIFIED TELEMETRY"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      }
                    />

                    {/* SCROLLABLE CONTENT BODY */}
                    <div className="premium-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "40px", background: "transparent" }}>
                      
                      {/* METRICS DISPATCH GRID */}
                      <div className="admin-overview-metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
                        {[
                          {
                            id: "revenue",
                            title: "Revenue Breakdown",
                            accent: "#a855f7",
                            heroLabel: "Total Revenue",
                            heroValue: `$${totalRevenue.toLocaleString()}`,
                            heroColor: "#22c55e",
                            svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
                            rows: [
                              ["Monthly Revenue", `$${monthlyRevenue.toLocaleString()}`, "#a855f7"],
                              ["Avg. per Booking", `$${avgVal.toFixed(0)}`, "#f59e0b"],
                              ["Revenue per User", `$${(totalRevenue / (users.length || 1)).toFixed(0)}`, "#7c3aed"]
                            ]
                          },
                          {
                            id: "bookings",
                            title: "Booking Metrics",
                            accent: "#a855f7",
                            heroLabel: "Total Bookings",
                            heroValue: bookings.length,
                            heroColor: "#fff",
                            svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
                            rows: [
                              ["Confirmed Slots", bookings.filter(b => b.status === "confirmed").length, "#22c55e"],
                              ["Cancelled / Dropped", bookings.filter(b => b.status === "cancelled").length, "#ef4444"],
                              ["On Hold Arrays", bookings.filter(b => b.status === "on_hold").length, "#f59e0b"]
                            ]
                          },
                          {
                            id: "users",
                            title: "User Stats",
                            accent: "#a855f7",
                            heroLabel: "Total Users",
                            heroValue: users.length,
                            heroColor: "#a855f7",
                            svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
                            rows: [
                              ["With Active Bookings", users.filter(u => bookings.some(b => b.userEmail === u.email)).length, "#4ce3f7"],
                              ["Avg Bookings / User", (bookings.length / (users.length || 1)).toFixed(1), "#22c55e"],
                              ["Conversion Rate", `${((users.filter(u => bookings.some(b => b.userEmail === u.email)).length / (users.length || 1)) * 100).toFixed(1)}%`, "#ec4899"]
                            ]
                          },
                        ].map((card) => (
                          <OverviewMetricCard key={card.id} card={card} />
                        ))}
                      </div>

                      {/* ANCILLARY SUBSYSTEM MODULES */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "24px" }}>
                        
                        {/* NO-SHOW TRACKING SYSTEM */}
                        <div className="subsystem-card">
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(168,85,247,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            </div>
                            <div>
                              <h3 style={{ margin: 0, color: "#fff", fontSize: "14px", fontWeight: "800", letterSpacing: "-0.1px" }}>
                                No-Show Tracking Vector
                              </h3>
                              <p style={{ margin: "2px 0 0 0", color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>Data analysis matrix tracking absolute profile presence failures</p>
                            </div>
                          </div>
                          <NoShowAnalytics bookings={bookings} />
                        </div>

                        {/* CUSTOMER RETENTION WRAPPER */}
                        <div className="subsystem-card">
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(168,85,247,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                            </div>
                            <div>
                              <h3 style={{ margin: 0, color: "#fff", fontSize: "14px", fontWeight: "800", letterSpacing: "-0.1px" }}>
                                Customer Retention Matrix
                              </h3>
                              <p style={{ margin: "2px 0 0 0", color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>Return threshold frequencies across distinct consumer pipelines</p>
                            </div>
                          </div>
                          <RetentionAnalytics bookings={bookings} />
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CARS ────────────────────────────────────── */}
              {activeNav === "cars" && (
                <CarAnalyticsSection bookings={bookings} dealers={dealers} />
              )}

              {/* ── LOCATIONS ─────────────────────────────── */}
              {activeNav === "locations" && (
                <LocationsSection bookings={bookings} />
              )}

              {/* ── TRENDS ─────────────────────────────── */}
              {activeNav === "trends" && (
                <div className="admin-split-layout"
                  style={{
                    display: "flex", height: "100%", gap: "32px",
                    padding: "20px 30px 20px 0px",
                    color: "#f8fafc",
                    fontFamily: "'Quicksand', -apple-system, sans-serif",
                    animation: "fadeIn 0.4s cubic-bezier(0.16,1,0.3,1)"
                  }}
                >
                  <style>{`
                    @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                    @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
                    @keyframes countUp { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.5; }
                    }

                    .premium-scroll::-webkit-scrollbar { width:6px; }
                    .premium-scroll::-webkit-scrollbar-track { background:transparent; }
                    .premium-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:10px; }
                    .premium-scroll::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.2); }

                    /* Glass morphism insight rows - transparent background */
                    .trends-insight-row {
                      display:flex; justify-content:space-between; align-items:center;
                      padding:11px 14px; border-radius:10px;
                      background:rgba(255,255,255,0.02) !important;
                      backdrop-filter: blur(8px) !important;
                      -webkit-backdrop-filter: blur(8px) !important;
                      border:1px solid rgba(255,255,255,0.06) !important;
                      transition:all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
                      cursor:default !important;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
                    }
                    .trends-insight-row:hover {
                      background:rgba(255,255,255,0.04) !important;
                      border-color:rgba(168,85,247,0.2) !important;
                      transform:translateX(4px) !important;
                      box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
                    }

                    /* Glass morphism KPI cards - transparent background */
                    .trends-kpi-card {
                      background:rgba(255,255,255,0.02) !important;
                      backdrop-filter: blur(8px) !important;
                      -webkit-backdrop-filter: blur(8px) !important;
                      border:1px solid rgba(255,255,255,0.06) !important;
                      border-radius:12px !important;
                      padding:12px !important;
                      transition:all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
                      cursor:default !important;
                    }
                    .trends-kpi-card:hover {
                      background:rgba(255,255,255,0.04) !important;
                      border-color:rgba(168,85,247,0.2) !important;
                      transform:translateY(-2px) !important;
                      box-shadow: 0 4px 16px rgba(0,0,0,0.15), 0 0 20px rgba(168,85,247,0.03) !important;
                    }

                    /* Section cards - transparent background */
                    .trends-section-card {
                      background:rgba(255,255,255,0.01) !important;
                      border:1px solid rgba(255,255,255,0.06) !important;
                      border-radius:18px !important;
                      padding:20px !important;
                      overflow:hidden !important;
                      transition:all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
                    }
                    .trends-section-card:hover {
                      border-color:rgba(168,85,247,0.15) !important;
                    }

                    /* Sidebar glass morphism */
                    .trends-sidebar {
                      background: rgba(10, 10, 20, 0.3) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                      border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
                    }
                    
                    .trends-sidebar-header {
                      background: linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(10,10,20,0.7) 80%, rgba(10,10,20,0) 100%) !important;
                      backdrop-filter: blur(12px) !important;
                      -webkit-backdrop-filter: blur(12px) !important;
                    }

                    /* Primary revenue driver card */
                    .primary-driver-card {
                      background: rgba(255,255,255,0.02) !important;
                      backdrop-filter: blur(8px) !important;
                      -webkit-backdrop-filter: blur(8px) !important;
                      border: 1px solid rgba(168,85,247,0.15) !important;
                      border-radius: 14px !important;
                      padding: 14px !important;
                      transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
                    }
                    .primary-driver-card:hover {
                      background: rgba(255,255,255,0.04) !important;
                      border-color: rgba(168,85,247,0.3) !important;
                      transform: translateY(-2px) !important;
                      box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
                    }

                    .collapsible-trigger-trends {
                      display:flex; align-items:center; justify-content:space-between;
                      width:100%; padding:9px 12px;
                      background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06);
                      color:rgba(255,255,255,0.5); cursor:pointer;
                      font-family:inherit; font-size:11px; font-weight:700;
                      letter-spacing:1.5px; text-transform:uppercase;
                      transition:all 0.25s cubic-bezier(0.16,1,0.3,1);
                      border-radius:12px;
                    }
                    .collapsible-trigger-trends:hover {
                      background:rgba(168,85,247,0.04);
                      color:rgba(255,255,255,0.7);
                      border-color:rgba(168,85,247,0.15);
                    }
                    .collapsible-trigger-trends.open {
                      border-radius: 12px 12px 0 0;
                      border-color: rgba(168,85,247,0.15);
                      background: rgba(168,85,247,0.04);
                      color: rgba(255,255,255,0.7);
                    }

                    /* Stats & Demand Patterns side by side */
                    .stats-demand-row {
                      display:grid; grid-template-columns:30% 70%; gap:18px;
                    }

                    .demand-pattern-list {
                      display:flex; flex-direction:column; gap:3px;
                    }

                    .stats-cards-grid {
                      display:flex; flex-direction:column; gap:8px;
                    }

                    @media (max-width:768px) {
                      .admin-split-layout { 
                        flex-direction:column !important; 
                        gap:12px !important; 
                        padding:0 !important; 
                        overflow:hidden !important;
                      }
                      .admin-split-layout > div:first-child {
                        flex:0 0 auto !important; width:100% !important; position:relative !important;
                        height:auto !important; max-height:480px !important;
                        overflow-y:auto !important; padding:12px !important;
                      }
                      .admin-content-area { 
                        flex:1 !important; 
                        width:100% !important; 
                        padding:0 4px !important;
                        overflow:hidden !important;
                      }
                      .premium-scroll {
                        overflow-x:hidden !important;
                      }
                      .admin-section-header { 
                        flex-direction:column !important; 
                        align-items:flex-start !important; 
                        gap:6px !important; 
                        padding-bottom:10px !important; 
                        margin-bottom:10px !important;
                      }
                      .admin-section-header h2 { font-size:18px !important; }
                      .admin-section-header p { font-size:11px !important; }
                      .trends-section-card { 
                        padding:12px !important; 
                        border-radius:12px !important;
                        overflow:hidden !important;
                      }
                      
                      .stats-demand-row {
                        grid-template-columns:1fr !important; 
                        gap:12px !important;
                        overflow:hidden !important;
                      }
                      
                      .stats-cards-grid {
                        display:grid !important; 
                        grid-template-columns:1fr 1fr !important; 
                        gap:6px !important;
                        overflow:hidden !important;
                      }
                      
                      .trends-kpi-card { 
                        padding:8px !important;
                        overflow:hidden !important;
                      }
                      .trends-kpi-card p:first-of-type {
                        font-size:12px !important;
                      }
                      .trends-kpi-card p:last-of-type {
                        font-size:9px !important;
                      }
                      .trends-kpi-card > div:first-child {
                        margin-bottom:4px !important;
                      }
                      .trends-kpi-card > div:first-child span:last-child {
                        font-size:8px !important;
                        padding:1px 4px !important;
                      }
                      .trends-insight-row { 
                        padding:9px 12px !important;
                        flex-wrap:wrap !important;
                        gap:4px !important;
                      }
                      .trends-insight-row > div:first-child {
                        flex:1 !important;
                        min-width:120px !important;
                      }
                      .trends-insight-row > div:first-child span:last-child { 
                        font-size:11px !important; 
                      }
                      .trends-insight-row > span:last-child { 
                        font-size:11px !important;
                        max-width:80px !important;
                        overflow:hidden !important;
                        text-overflow:ellipsis !important;
                        white-space:nowrap !important;
                      }
                      
                      .trends-section-card > div:last-child {
                        overflow-x:auto !important;
                        -webkit-overflow-scrolling:touch !important;
                      }
                      .trends-section-card > div:last-child > div {
                        min-width:100% !important;
                        max-width:100% !important;
                      }
                    }
                    @media (max-width:480px) {
                      .admin-section-header h2 { font-size:16px !important; }
                      .stats-cards-grid {
                        grid-template-columns:1fr 1fr !important; 
                        gap:4px !important;
                      }
                      .trends-kpi-card p:first-of-type {
                        font-size:11px !important;
                      }
                      .trends-insight-row > div:first-child span:last-child {
                        font-size:10px !important;
                      }
                      .trends-insight-row > span:last-child {
                        font-size:10px !important;
                        max-width:60px !important;
                      }
                    }
                  `}</style>

                  {/* LEFT SIDEBAR - 22% - STICKY */}
                  <div className="trends-sidebar" style={{
                    display:"grid", gridTemplateRows:"auto 1fr",
                    height:"calc(100vh - 80px)", position:"sticky", top:0,
                    overflow:"hidden", paddingRight:"4px",
                    flex:"0 0 22%", zIndex:100
                  }}>
                    {/* KPI Header */}
                    <div className="trends-sidebar-header" style={{
                      paddingBottom:"12px", borderBottom:"1px solid rgba(255,255,255,0.05)", flexShrink:0
                    }}>
                      {/* KPI Widget - ROSE RED (restored) */}
                      <div style={{
                        background:"linear-gradient(135deg, #881337 0%, #e11d48 100%)",
                        padding:"16px", borderRadius:"16px", color:"#fff",
                        boxShadow:"0 8px 24px rgba(225,29,72,0.25), inset 0 1px 1px rgba(255,255,255,0.15)",
                        display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px"
                      }}>
                        <div>
                          <p style={{ margin:"0 0 4px", fontSize:"10px", letterSpacing:"2px", fontWeight:"700", opacity:0.65 }}>INTELLIGENCE HUB</p>
                          <p style={{ margin:"0 0 2px", fontWeight:"800", fontSize:"18px", letterSpacing:"-0.4px", lineHeight:1.1 }}>BI Engine</p>
                          <p style={{ margin:0, fontSize:"10px", fontWeight:"500", opacity:0.55 }}>Demand & pricing analytics</p>
                        </div>
                        <div style={{ width:"40px", height:"40px", borderRadius:"11px", background:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable sidebar */}
                    <div className="premium-scroll" style={{ overflowY:"auto", overflowX:"hidden", minHeight:0, paddingTop:"4px", background:"transparent" }}>

                      {/* PRIMARY REVENUE DRIVER */}
                      <div className="primary-driver-card" style={{
                        display:"flex", alignItems:"center", gap:"12px",
                        marginBottom:"12px",
                      }}>
                        <div style={{
                          width:"38px", height:"38px", borderRadius:"11px", flexShrink:0,
                          background:"rgba(168,85,247,0.12)", border:"1px solid rgba(168,85,247,0.22)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                        }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:"0 0 4px", fontSize:"9px", fontWeight:"700", color:"#a855f7", letterSpacing:"1.2px", textTransform:"uppercase" }}>REVENUE DRIVER</p>
                          <p style={{ margin:0, fontSize:"11.5px", color:"rgba(255,255,255,0.7)", lineHeight:"1.5" }}>
                            <strong style={{ color:"#a855f7" }}>{popularCars[0]?.[0] || "Top vehicle"}</strong> generates{" "}
                            <strong style={{ color:"#22c55e" }}>{fmt(bookings.filter(b => b.carModel === popularCars[0]?.[0]).reduce((s,b) => s+(b.total||0), 0))}</strong>
                            {" "}across <strong style={{ color:"#fff" }}>{popularCars[0]?.[1] || 0}</strong> bookings.
                          </p>
                        </div>
                      </div>

                      {/* ABOUT THIS VIEW */}
                      <div style={{ marginBottom:"12px" }}>
                        <button
                          onClick={() => setAboutOpen(p => !p)}
                          className={`collapsible-trigger-trends ${aboutOpen ? 'open' : ''}`}
                        >
                          <span style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                            ABOUT THIS VIEW
                          </span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition:"transform 0.3s ease", transform: aboutOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </button>
                        <div style={{
                          maxHeight: aboutOpen ? "120px" : "0px",
                          overflow:"hidden",
                          transition:"max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
                          background:"rgba(255,255,255,0.02)",
                          border: aboutOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
                          borderTop:"none", borderRadius:"0 0 12px 12px"
                        }}>
                          <div style={{ padding:"10px 12px" }}>
                            <p style={{ margin:0, fontSize:"11px", color:"rgba(255,255,255,0.4)", lineHeight:"1.6" }}>
                              Data-driven demand analysis, seasonality patterns, and AI pricing recommendations based on your real historical fleet data.
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* RIGHT CONTENT - 78% */}
                  <div className="admin-content-area" style={{ flex:"0 0 78%", display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

                    {/* Header */}
                    <AdminSectionHeader
                      title="Business Intelligence"
                      sub="Demand patterns, seasonality forecasts, and data-driven pricing recommendations"
                      badge="DEMAND INTELLIGENCE"
                      icon={
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      }
                    />

                    {/* Scrollable content */}
                    <div className="premium-scroll" style={{ flex:1, overflowY:"auto", overflowX:"hidden", paddingBottom:"40px", background:"transparent" }}>
                      <div style={{ display:"flex", flexDirection:"column", gap:"18px", maxWidth:"100%" }}>

                        {/* DemandAnalytics wrapper */}
                        <div className="trends-section-card" style={{ overflow:"hidden" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"18px" }}>
                            <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"rgba(168,85,247,0.08)", border:"1px solid rgba(168,85,247,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                              </svg>
                            </div>
                            <div>
                              <h3 style={{ margin:0, color:"#fff", fontSize:"15px", fontWeight:"800" }}>Advanced Demand Analytics</h3>
                              <p style={{ margin:"2px 0 0", color:"rgba(255,255,255,0.35)", fontSize:"12px" }}>Peak seasons, booking heatmaps, 8-week forecasts & pricing recommendations</p>
                            </div>
                          </div>
                          <DemandAnalytics bookings={bookings} cars={cars} />
                        </div>
                        
                        {/* Stats + Demand Patterns side by side row */}
                        <div className="stats-demand-row">
                          {/* Stats Cards (30%) */}
                          <div className="trends-section-card" style={{ padding:"16px", overflow:"hidden" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"12px" }}>
                              <div style={{ width:"28px", height:"28px", borderRadius:"8px", background:"rgba(168,85,247,0.1)", border:"1px solid rgba(168,85,247,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                </svg>
                              </div>
                              <span style={{ fontSize:"10px", fontWeight:"700", color:"rgba(168,85,247,0.5)", letterSpacing:"1px", textTransform:"uppercase" }}>Key Metrics</span>
                            </div>
                            
                            <div className="stats-cards-grid">
                              {[
                                { label:"Peak Days", value:"Fri & Sat", sub:"Highest demand", color:"#f97316", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                                { label:"Peak Season", value:"Jun – Aug", sub:"Summer surge", color:"#eab308", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
                                { label:"Avg Lead Time", value:"~14 days", sub:"Before pickup", color:"#a855f7", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
                                { label:"Avg Rental", value:"7 days", sub:"Per booking", color:"#22c55e", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> },
                              ].map(({ label, value, sub, color, icon }) => (
                                <div key={label} className="trends-kpi-card" style={{ padding:"10px", overflow:"hidden" }}>
                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"6px" }}>
                                    <span style={{ color, display:"flex", alignItems:"center" }}>{icon}</span>
                                    <span style={{ fontSize:"10px", fontWeight:"800", letterSpacing:"0.5px", color:"rgba(255,255,255,0.35)", textTransform:"uppercase" }}>{sub}</span>
                                  </div>
                                  <p style={{ margin:"0 0 3px", fontSize:"14px", fontWeight:"800", color, letterSpacing:"-0.2px" }}>{value}</p>
                                  <p style={{ margin:0, fontSize:"10px", color:"rgba(255,255,255,0.35)", fontWeight:"600" }}>{label}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Demand Patterns (70%) */}
                          <div className="trends-section-card" style={{ overflow:"hidden" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
                              <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"rgba(168,85,247,0.08)", border:"1px solid rgba(168,85,247,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                </svg>
                              </div>
                              <div>
                                <h3 style={{ margin:0, color:"#fff", fontSize:"15px", fontWeight:"800" }}>Demand Patterns</h3>
                                <p style={{ margin:"2px 0 0", color:"rgba(255,255,255,0.35)", fontSize:"12px" }}>Historical booking behaviour and operational rhythms</p>
                              </div>
                            </div>
                            <div className="demand-pattern-list">
                              {[
                                { icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label:"High-Traffic Days",  value:"Friday & Saturday" },
                                { icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>, label:"Peak Season Window", value:"June – August" },
                                { icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label:"Average Lead Time",  value:"~14 days ahead" },
                                { icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>, label:"Standard Retention", value:"7 days (weekly avg)" },
                                { icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, label:"Top Performer",      value: popularCars[0]?.[0] || "N/A" },
                                { icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label:"Busiest Hub",        value: popularLocations[0]?.[0] || "N/A" },
                              ].map(({ icon, label, value }) => (
                                <div key={label} className="trends-insight-row">
                                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                                    <span style={{ display:"flex", alignItems:"center", flexShrink:0, color:"rgba(255,255,255,0.35)" }}>{icon}</span>
                                    <span style={{ color:"rgba(255,255,255,0.5)", fontSize:"13px" }}>{label}</span>
                                  </div>
                                  <span style={{ color:"#fff", fontSize:"13px", fontWeight:"700" }}>{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Toast */}
        {notification.visible && (
          <div className="admin-toast" style={{ position:"fixed", bottom:"24px", right:"24px", zIndex:2000, animation:"slideUp 0.3s ease-out" }}>
            <div style={{ background:notification.type==="success"?"linear-gradient(135deg,#22c55e,#16a34a)":"linear-gradient(135deg,#ef4444,#dc2626)", color:"#fff", padding:"12px 20px", borderRadius:"12px", display:"flex", alignItems:"center", gap:"10px", boxShadow:"0 10px 25px rgba(0,0,0,0.2)", fontWeight:"600", fontSize:"13px" }}>
              <span>{notification.type==="success"?"✅":"❌"}</span>{notification.message}
            </div>
          </div>
        )}
      </div>

      {selectedDealer && (
        <DealerDetailModal
          dealer={selectedDealer}
          onClose={() => setSelectedDealer(null)}
          onAction={handleDealerAction}
        />
      )}

      {locationModalDealer && (
        <DealerLocationModal
          dealer={locationModalDealer}
          onClose={() => setLocationModalDealer(null)}
          onUpdate={handleLocationUpdate}
        />
      )}

      {/* ─── SUSPENSION MODAL ──────────────────────────────── */}
      {suspensionModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(3,3,7,0.92)", backdropFilter:"blur(12px)", zIndex:4000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }} onClick={() => { setSuspensionModal(null); setSuspensionForm({ subject:"", reason:"" }); }}>
          <div style={{ background:"#0c0c16", border:"1px solid rgba(239,68,68,0.4)", borderRadius:"24px", padding:"32px", maxWidth:"520px", width:"100%", boxShadow:"0 30px 60px rgba(0,0,0,0.6)", position:"relative", overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"4px", background:"#ef4444" }} />
            <h3 style={{ color:"#ef4444", margin:"0 0 8px", fontSize:"20px", fontWeight:"800" }}>⚠️ Suspend Dealer Account</h3>
            <div style={{ background:"rgba(255,255,255,0.03)", padding:"14px", borderRadius:"14px", border:"1px solid rgba(255,255,255,0.06)", marginBottom:"24px" }}>
              <p style={{ color:"#fff", fontSize:"14px", fontWeight:"700", margin:"0 0 4px" }}>{suspensionModal.businessName}</p>
              <p style={{ color:"rgba(255,255,255,0.4)", fontSize:"12px", margin:0 }}>👤 {suspensionModal.ownerEmail}</p>
              <p style={{ color:"rgba(255,255,255,0.4)", fontSize:"12px", margin:"4px 0 0" }}>📍 {suspensionModal.city}, {suspensionModal.state}</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
              <div>
                <label style={{ color:"#4ce3f7", fontSize:"11px", fontWeight:"800", display:"block", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"1px" }}>Suspension Subject</label>
                <input type="text" value={suspensionForm.subject} onChange={e => setSuspensionForm(p=>({...p,subject:e.target.value}))} placeholder="e.g., Terms of Service Violation" style={{ width:"100%", padding:"12px 16px", background:"rgba(0,0,0,0.2)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"12px", color:"#fff", fontSize:"14px", outline:"none", boxSizing:"border-box" }} />
              </div>
              <div>
                <label style={{ color:"#4ce3f7", fontSize:"11px", fontWeight:"800", display:"block", marginBottom:"8px", textTransform:"uppercase", letterSpacing:"1px" }}>Detailed Reason</label>
                <textarea value={suspensionForm.reason} onChange={e => setSuspensionForm(p=>({...p,reason:e.target.value}))} placeholder="Provide detailed reason for suspension..." rows={4} style={{ width:"100%", padding:"12px 16px", background:"rgba(0,0,0,0.2)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"12px", color:"#fff", fontSize:"14px", fontFamily:"inherit", resize:"none", outline:"none", boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ display:"flex", gap:"12px", marginTop:"32px" }}>
              <button onClick={confirmSuspension} disabled={suspensionLoading} style={{ flex:2, padding:"14px", background:"#ef4444", border:"none", borderRadius:"12px", color:"#fff", fontFamily:"inherit", fontWeight:"800", fontSize:"16px", cursor:suspensionLoading?"not-allowed":"pointer", opacity:suspensionLoading?0.6:1 }}>{suspensionLoading?"Processing...":"🚫 Confirm Suspension"}</button>
              <button onClick={() => { setSuspensionModal(null); setSuspensionForm({ subject:"", reason:"" }); }} style={{ flex:1, padding:"14px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"12px", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontFamily:"inherit", fontWeight:"600", fontSize:"16px" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PERFORMANCE MODAL ──────────────────────────────── */}
      {showPerformance && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4000,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setShowPerformance(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "960px",
              height: "85vh",
              background: "#0f0b1c",
              borderRadius: "20px",
              overflow: "hidden",
              border: "1px solid rgba(168,85,247,0.15)",
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.7)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <DealerPerformance 
              dealers={dealers} 
              bookings={bookings} 
              reviews={reviews} 
              onClose={() => setShowPerformance(false)} 
            />
          </div>
        </div>
      )}

      {/* ─── COMMISSION MODAL ──────────────────────────────── */}
      {showCommission && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4000,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setShowCommission(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "960px",
              height: "85vh",
              background: "#0f0b1c",
              borderRadius: "20px",
              overflow: "hidden",
              border: "1px solid rgba(34,197,94,0.15)",
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.7)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <DealerCommission 
              dealers={dealers} 
              bookings={bookings} 
              onClose={() => setShowCommission(false)} 
            />
          </div>
        </div>
      )}

      {/* Admin Action Modal */}
      {adminModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(3,3,7,0.92)", backdropFilter: "blur(12px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => { setAdminModal(null); setAdminError(""); }}>
          <div className="admin-action-modal" style={{ background: "#0c0c16", border: `1px solid ${adminType === "cancel" || adminType === "reject" ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.4)"}`, borderRadius: "24px", padding: "32px", maxWidth: "520px", width: "100%", boxShadow: "0 30px 60px rgba(0,0,0,0.6)", position: "relative", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: adminType === "cancel" || adminType === "reject" ? "#ef4444" : "#f59e0b" }} />
            
            {/* Modal Dynamic Header Title */}
            <h3 style={{ color: adminType === "cancel" || adminType === "reject" ? "#ef4444" : "#f59e0b", margin: "0 0 16px", fontSize: "20px", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", flexShrink: 0 }}>
                {adminType === "cancel" ? (
                  /* Warning / Alert Triangle SVG */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                ) : adminType === "reject" ? (
                  /* Close / Cancel Circle SVG */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                ) : (
                  /* Pause Circle / Suspend SVG */
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="15" x2="10" y2="9"></line><line x1="14" y1="15" x2="14" y2="9"></line></svg>
                )}
              </span>
              <span>
                {adminType === "cancel" ? "Terminate Booking" : adminType === "reject" ? "Reject Booking Request" : "Suspend Booking"}
              </span>
            </h3>

            {/* Meta Item Overview Segment */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "24px" }}>
              <p style={{ color: "#fff", fontSize: "14px", fontWeight: "700", margin: "0 0 10px" }}>{adminModal.carModel} · #{adminModal.bookingId}</p>
              
              {/* User Line */}
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", margin: "0 0 6px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", color: "rgba(255,255,255,0.3)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </span>
                {adminModal.userEmail}
              </p>
              
              {/* Schedule Line */}
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", color: "rgba(255,255,255,0.3)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </span>
                {adminModal.pickupDate || adminModal.date} → {adminModal.dropoffDate || "—"}
              </p>
            </div>

            {/* Input Subscriptions Configurations */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ color: "#4ce3f7", fontSize: "11px", fontWeight: "800", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Notification Subject</label>
                <input type="text" value={adminForm.subject} onChange={e => setAdminForm(p => ({ ...p, subject: e.target.value }))} placeholder={adminType === "cancel" ? "Booking Cancelled" : adminType === "reject" ? "Booking Rejected" : "Booking On Hold"} style={{ width: "100%", padding: "12px 16px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#4ce3f7"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              </div>
              <div>
                <label style={{ color: "#4ce3f7", fontSize: "11px", fontWeight: "800", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Message to Client</label>
                <textarea value={adminForm.message} onChange={e => setAdminForm(p => ({ ...p, message: e.target.value }))} placeholder="Provide a detailed reason..." rows={4} style={{ width: "100%", padding: "12px 16px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "14px", fontFamily: "inherit", resize: "none", outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#4ce3f7"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              </div>
            </div>

            {/* Dynamic Validation Warning Notification */}
            {adminError && (
              <div style={{ marginTop: "16px", color: "#ef4444", fontSize: "12px", textAlign: "center", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span>{adminError}</span>
              </div>
            )}

            {/* Footer Interface Buttons Sub-deck */}
            <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
              <button onClick={handleAdminAction} disabled={adminLoading} style={{ flex: 2, padding: "14px", background: adminType === "cancel" || adminType === "reject" ? "#ef4444" : "#f59e0b", border: "none", borderRadius: "12px", color: "#000", fontFamily: "inherit", fontWeight: "800", fontSize: "16px", cursor: adminLoading ? "not-allowed" : "pointer", opacity: adminLoading ? 0.6 : 1 }}>
                {adminLoading ? "Processing..." : adminType === "cancel" ? "Confirm Cancellation" : adminType === "reject" ? "Reject & Notify User" : "Confirm Suspension"}
              </button>
              <button onClick={() => { setAdminModal(null); setAdminError(""); setAdminForm({ subject: "", message: "" }); }} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontFamily: "inherit", fontWeight: "600", fontSize: "16px" }}>Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}