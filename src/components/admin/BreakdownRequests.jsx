// src/components/admin/BreakdownRequests.jsx
import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import {
  REQUEST_STATUS,
  STATUS_META,
  ASSISTANCE_SERVICES,
  updateAssistanceStatus,
  cancelAssistanceRequest,
} from "../../utils/assistanceUtils";
import { renderIcon } from "../../utils/iconRenderer";

const T = {
  cyan: "#4ce3f7",
  red: "#ef4444",
  green: "#22c55e",
  orange: "#f59e0b",
  purple: "#a855f7",
  pink: "#ec4899",
  textSec: "rgba(255,255,255,0.4)",
  textMuted: "rgba(255,255,255,0.25)",
};

// ─── Helper to render status icon ──────────────────────────
const renderStatusIcon = (statusMeta, size = 16) => {
  if (!statusMeta || !statusMeta.icon) return null;
  return renderIcon(statusMeta.icon, size, statusMeta.color);
};

function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

function timeAgo(date) {
  if (!date) return "—";
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

// ─── Premium Stat Card with Glass Morphism ───────────────────────────
function StatCard({ label, value, color, icon, bg }) {
  return (
    <div className="emergency-stat-card" style={{
      background: "rgba(255,255,255,0.03)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: `1px solid ${color}25`,
      borderRadius: "14px",
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      cursor: "default",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
      e.currentTarget.style.borderColor = `${color}50`;
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = `0 8px 24px ${color}15, 0 4px 16px rgba(0,0,0,0.2)`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      e.currentTarget.style.borderColor = `${color}25`;
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.15)";
    }}
    >
      <div style={{
        width: "44px",
        height: "44px",
        borderRadius: "12px",
        background: bg || `${color}12`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: "11px", color: T.textSec, fontWeight: "600", letterSpacing: "0.3px" }}>
          {label}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: "800", color: "#fff" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Premium Action Modal ────────────────────────────────
function ActionModal({ title, accentColor, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState("");
  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(3,3,7,.92)", backdropFilter: "blur(12px)",
      zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0c0c16", border: `1px solid ${accentColor}66`, borderRadius: "20px",
        padding: "32px", maxWidth: "460px", width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.5)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "4px",
          background: accentColor,
        }} />
        <h3 style={{ margin: "0 0 12px", color: accentColor, fontSize: "18px", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: `${accentColor}15`, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </span>
          {title}
        </h3>
        <textarea
          rows={4}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Add a note (optional)…"
          style={{
            width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: "12px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff", fontSize: "13px", fontFamily: "Quicksand,sans-serif", resize: "vertical",
            outline: "none", transition: "all 0.25s ease",
          }}
          onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.background = "rgba(255,255,255,0.06)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
        />
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            style={{
              flex: 1, padding: "12px", borderRadius: "12px", border: "none",
              background: accentColor, color: "#000", cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "Quicksand,sans-serif", fontWeight: "800", fontSize: "14px",
              opacity: loading ? 0.6 : 1, transition: "all 0.2s ease",
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {loading ? "Processing…" : "Confirm"}
          </button>
          <button onClick={onCancel} style={{
            padding: "12px 20px", borderRadius: "12px", background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", cursor: "pointer",
            fontFamily: "Quicksand,sans-serif", fontWeight: "600", fontSize: "14px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Premium Dropdown Select ──────────────────────────────────
function PremiumSelect({ options, value, onChange, placeholder, icon, color = T.cyan }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(opt => opt.value === value);

  return (
    <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${isOpen ? color : "rgba(255,255,255,0.08)"}`,
          color: "#fff",
          fontFamily: "Quicksand,sans-serif",
          fontSize: "13px",
          cursor: "pointer",
          transition: "all 0.25s ease",
          gap: "8px",
        }}
        onMouseEnter={e => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          }
        }}
        onMouseLeave={e => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          }
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {icon && <span style={{ opacity: 0.5, fontSize: "14px" }}>{icon}</span>}
          {selected?.label || placeholder}
          {selected?.count !== undefined && selected.count > 0 && (
            <span style={{
              background: "rgba(255,255,255,0.06)",
              padding: "1px 8px",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "700",
              color: "rgba(255,255,255,0.4)",
            }}>
              {selected.count}
            </span>
          )}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: "transform 0.3s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "#12122a",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
          maxHeight: "260px",
          overflowY: "auto",
          zIndex: 100,
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          padding: "4px",
        }}>
          {options.map(opt => {
            const isActive = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: isActive ? `${color}15` : "transparent",
                  border: isActive ? `1px solid ${color}30` : "1px solid transparent",
                  transition: "all 0.15s ease",
                  marginBottom: "2px",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: isActive ? color : "rgba(255,255,255,0.7)",
                  fontSize: "13px",
                  fontWeight: isActive ? "700" : "500",
                }}>
                  {opt.icon && <span style={{ fontSize: "14px" }}>{opt.icon}</span>}
                  {opt.label}
                </span>
                {opt.count !== undefined && opt.count > 0 && (
                  <span style={{
                    background: isActive ? `${color}30` : "rgba(255,255,255,0.06)",
                    padding: "1px 8px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: "700",
                    color: isActive ? color : "rgba(255,255,255,0.3)",
                  }}>
                    {opt.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Premium Search Input ─────────────────────────────────
function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", flex: 2, minWidth: "200px" }}>
      <span style={{
        position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
        opacity: 0.4, display: "flex", alignItems: "center",
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "10px 14px 10px 42px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#fff",
          fontFamily: "Quicksand,sans-serif",
          fontSize: "13px",
          outline: "none",
          transition: "all 0.25s ease",
        }}
        onFocus={e => {
          e.target.style.borderColor = `${T.cyan}50`;
          e.target.style.background = "rgba(255,255,255,0.05)";
          e.target.style.boxShadow = `0 0 0 4px ${T.cyan}10`;
        }}
        onBlur={e => {
          e.target.style.borderColor = "rgba(255,255,255,0.08)";
          e.target.style.background = "rgba(255,255,255,0.03)";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

export default function BreakdownRequests({ bookings = [] }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionModal, setActionModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "assistance_requests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: toDate(d.data().createdAt),
        updatedAt: toDate(d.data().updatedAt),
        completedAt: toDate(d.data().completedAt),
      })));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  const bookingMap = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      map[b.id] = b;
      if (b.bookingId) map[b.bookingId] = b;
    });
    return map;
  }, [bookings]);

  const enriched = useMemo(() => requests.map(r => {
    const bId = r.bookingInfo?.bookingId;
    const booking = bId ? bookingMap[bId] : null;
    return {
      ...r,
      booking,
      dealerName: booking?.dealerBusinessName || booking?.dealerName || "—",
      customerName: booking?.userName || booking?.userEmail || "Unknown",
      customerEmail: booking?.userEmail || null,
    };
  }), [requests, bookingMap]);

  const filtered = useMemo(() => enriched.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (serviceFilter !== "all" && r.serviceType !== serviceFilter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      const haystack = [
        r.customerName, r.customerEmail, r.dealerName,
        r.bookingInfo?.carModel, r.bookingInfo?.carNumberPlate, r.bookingInfo?.bookingId,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(s)) return false;
    }
    return true;
  }), [enriched, statusFilter, serviceFilter, search]);

  const summary = useMemo(() => {
    const total = enriched.length;
    const pending = enriched.filter(r => r.status === REQUEST_STATUS.PENDING).length;
    const inProgress = enriched.filter(r =>
      [REQUEST_STATUS.CONFIRMED, REQUEST_STATUS.DISPATCHED, REQUEST_STATUS.EN_ROUTE, REQUEST_STATUS.ARRIVED, REQUEST_STATUS.IN_PROGRESS].includes(r.status)
    ).length;
    const completed = enriched.filter(r => r.status === REQUEST_STATUS.COMPLETED).length;
    const cancelled = enriched.filter(r => r.status === REQUEST_STATUS.CANCELLED).length;
    return { total, pending, inProgress, completed, cancelled };
  }, [enriched]);

  async function handleResolve(id) {
    setActionLoading(true);
    try {
      await updateAssistanceStatus(id, REQUEST_STATUS.COMPLETED, "Marked resolved by admin");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel(reason) {
    setActionLoading(true);
    try {
      await cancelAssistanceRequest(actionModal.id, reason || "Cancelled by admin");
      setActionModal(null);
    } finally {
      setActionLoading(false);
    }
  }

  const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses", icon: "📋", count: summary.total },
    ...Object.values(REQUEST_STATUS).map(s => ({
      value: s,
      label: STATUS_META[s]?.label || s,
      icon: renderStatusIcon(STATUS_META[s]),
      count: enriched.filter(r => r.status === s).length,
    }))
  ];

  const SERVICE_OPTIONS = [
    { value: "all", label: "All Services", icon: "🔧" },
    ...Object.values(ASSISTANCE_SERVICES).map(s => ({
      value: s.id,
      label: s.name,
      icon: renderIcon(s.icon, 16),
      count: enriched.filter(r => r.serviceType === s.id).length,
    }))
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "8px 0" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: "90px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.04)",
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
        ))}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Quicksand,sans-serif" }}>

      {actionModal?.type === "cancel" && (
        <ActionModal
          title="Cancel Assistance Request"
          accentColor={T.red}
          loading={actionLoading}
          onConfirm={handleCancel}
          onCancel={() => setActionModal(null)}
        />
      )}

      {/* ─── Summary Stats with Glass Morphism ── */}
      <div className="breakdown-stat-grid" style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, auto))", 
        gap: "14px", 
        marginBottom: "24px" 
      }}>
        <StatCard
          label="Total Requests"
          value={summary.total}
          color={T.cyan}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ce3f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          }
        />
        <StatCard
          label="Pending"
          value={summary.pending}
          color={T.orange}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        />
        <StatCard
          label="In Progress"
          value={summary.inProgress}
          color={T.purple}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          }
        />
        <StatCard
          label="Completed"
          value={summary.completed}
          color={T.green}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          }
        />
        <StatCard
          label="Cancelled"
          value={summary.cancelled}
          color={T.red}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          }
        />
      </div>

      {/* ─── Filters - 3 Column Layout ── */}
      <div className="breakdown-filter-grid" style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr",
        gap: "12px",
        marginBottom: "20px",
        alignItems: "start",
      }}>
        {/* Search */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by customer, dealer, car or plate…"
        />

        {/* Status Dropdown */}
        <PremiumSelect
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All Statuses"
          color={T.cyan}
        />

        {/* Service Type Dropdown */}
        <PremiumSelect
          options={SERVICE_OPTIONS}
          value={serviceFilter}
          onChange={setServiceFilter}
          placeholder="All Services"
          color={T.purple}
        />
      </div>

      {/* ─── Reset Button ── */}
      {(search || statusFilter !== "all" || serviceFilter !== "all") && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setServiceFilter("all"); }}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "12px",
              fontFamily: "Quicksand,sans-serif",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.05)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Reset Filters
          </button>
        </div>
      )}

      {/* ─── Requests List with Glass Morphism ── */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "80px 40px",
          border: "1px dashed rgba(255,255,255,0.08)",
          borderRadius: "20px",
          background: "rgba(255,255,255,0.01)",
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px" }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px", fontWeight: "500" }}>
            {requests.length === 0
              ? "No breakdown/assistance requests yet."
              : "No requests match your filters."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map(r => {
            const meta = STATUS_META[r.status] || STATUS_META.pending;
            const service = Object.values(ASSISTANCE_SERVICES).find(s => s.id === r.serviceType);
            const isExpanded = expandedId === r.id;
            const isActive = ![REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CANCELLED].includes(r.status);

            return (
              <div
                key={r.id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderLeft: `3px solid ${meta.color}`,
                  borderRadius: "14px",
                  overflow: "hidden",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.borderLeftColor = meta.color;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.25), 0 0 20px ${meta.color}10`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderLeftColor = meta.color;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.15)";
                }}
              >
                {/* Header - Click to expand */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  style={{
                    padding: "16px 20px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    flexShrink: 0,
                    background: `${(service?.color || meta.color)}15`,
                    border: `1px solid ${(service?.color || meta.color)}25`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                  }}>
                    {service?.icon ? renderIcon(service.icon, 20, service.color) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  )}
                  </div>

                  <div style={{ flex: 1, minWidth: "180px" }}>
                    <p style={{
                      margin: 0,
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}>
                      {r.serviceName || service?.name || "Assistance Request"}
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "9px",
                        fontWeight: "800",
                        background: `${meta.color}20`,
                        color: meta.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}>
                        {meta.icon && renderIcon(meta.icon, 12, meta.color)}
                        {meta.label}
                      </span>
                    </p>
                    <p style={{
                      margin: "2px 0 0",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "12px",
                    }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        {r.customerName}
                      </span>
                      {r.dealerName !== "—" && (
                        <>
                          <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                              <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                            {r.dealerName}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexShrink: 0,
                  }}>
                    <span style={{
                      color: "rgba(255,255,255,0.3)",
                      fontSize: "11px",
                      fontWeight: "500",
                    }}>
                      {timeAgo(r.createdAt)}
                    </span>
                    <span style={{
                      color: "rgba(255,255,255,0.25)",
                      fontSize: "12px",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.3s ease",
                      display: "flex",
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{
                    padding: "0 20px 20px",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "14px",
                      paddingTop: "16px",
                    }}>
                      {/* Booking Info - Changed heading to purple */}
                      <div style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.015)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}>
                        <p style={{
                          margin: "0 0 10px",
                          color: T.purple,
                          fontSize: "10px",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          Booking & Contact
                        </p>
                        {[
                          ["Customer", r.customerName],
                          ["Email", r.customerEmail],
                          ["Vehicle", r.bookingInfo?.carModel],
                          ["Plate", r.bookingInfo?.carNumberPlate],
                          ["Dealer", r.dealerName],
                          ["Booking ID", r.bookingInfo?.bookingId],
                        ].filter(([, v]) => v).map(([label, value]) => (
                          <div key={label} style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "4px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.02)",
                          }}>
                            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>{label}</span>
                            <span style={{
                              color: "rgba(255,255,255,0.8)",
                              fontSize: "11px",
                              fontWeight: label === "Booking ID" || label === "Plate" ? "600" : "400",
                              fontFamily: label === "Booking ID" || label === "Plate" ? "monospace" : "inherit",
                            }}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Location - Changed heading to purple */}
                      <div style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.015)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}>
                        <p style={{
                          margin: "0 0 10px",
                          color: T.purple,
                          fontSize: "10px",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          Location
                        </p>
                        {r.location ? (
                          <>
                            <p style={{
                              margin: 0,
                              color: "rgba(255,255,255,0.75)",
                              fontSize: "12px",
                              lineHeight: "1.4",
                            }}>
                              {r.location.address || "Coordinates only"}
                            </p>
                            <p style={{
                              margin: "4px 0 8px",
                              color: "rgba(255,255,255,0.3)",
                              fontSize: "11px",
                              fontFamily: "monospace",
                            }}>
                              {r.location.lat?.toFixed(5)}, {r.location.lng?.toFixed(5)}
                              {r.location.accuracy && ` · ±${Math.round(r.location.accuracy)}m`}
                            </p>
                            <a
                              href={r.location.googleMapsUrl || `https://maps.google.com/?q=${r.location.lat},${r.location.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: T.cyan,
                                fontSize: "11px",
                                fontWeight: "600",
                                textDecoration: "none",
                                transition: "opacity 0.2s ease",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                            >
                              Open in Maps →
                            </a>
                          </>
                        ) : (
                          <p style={{ margin: 0, color: "rgba(255,255,255,0.25)", fontSize: "12px" }}>
                            No location recorded
                          </p>
                        )}
                        {r.etaMinutes && (
                          <p style={{
                            margin: "8px 0 0",
                            color: "rgba(255,255,255,0.4)",
                            fontSize: "11px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            ETA: {r.etaMinutes} min
                          </p>
                        )}
                      </div>

                      {/* Assigned Provider - Changed heading to purple */}
                      <div style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.015)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}>
                        <p style={{
                          margin: "0 0 10px",
                          color: T.purple,
                          fontSize: "10px",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          Assigned Provider
                        </p>
                        {r.assignedProvider ? (
                          <>
                            <p style={{
                              margin: 0,
                              color: "#fff",
                              fontSize: "13px",
                              fontWeight: "700",
                            }}>
                              {r.assignedProvider.name}
                            </p>
                            <p style={{
                              margin: "2px 0 0",
                              color: "rgba(255,255,255,0.4)",
                              fontSize: "11px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                              </svg>
                              {r.assignedProvider.phone}
                            </p>
                            <p style={{
                              margin: "2px 0 0",
                              color: "rgba(255,255,255,0.3)",
                              fontSize: "10px",
                              textTransform: "capitalize",
                            }}>
                              {r.assignedProvider.type?.replace(/_/g, " ")}
                            </p>
                          </>
                        ) : (
                          <p style={{
                            margin: 0,
                            color: "rgba(255,255,255,0.25)",
                            fontSize: "12px",
                            fontStyle: "italic",
                          }}>
                            Not yet assigned by dealer
                          </p>
                        )}
                      </div>

                      {/* Status History - Changed heading to purple */}
                      <div style={{
                        padding: "14px 16px",
                        borderRadius: "12px",
                        background: "rgba(255,255,255,0.015)",
                        border: "1px solid rgba(255,255,255,0.04)",
                      }}>
                        <p style={{
                          margin: "0 0 10px",
                          color: T.purple,
                          fontSize: "10px",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          Status History
                        </p>
                        {(r.statusHistory || []).slice().reverse().map((h, i) => {
                          const hMeta = STATUS_META[h.status] || STATUS_META.pending;
                          const d = toDate(h.timestamp);
                          return (
                            <div key={i} style={{
                              marginBottom: i < (r.statusHistory || []).length - 1 ? "8px" : "0",
                              paddingBottom: i < (r.statusHistory || []).length - 1 ? "8px" : "0",
                              borderBottom: i < (r.statusHistory || []).length - 1
                                ? "1px solid rgba(255,255,255,0.03)"
                                : "none",
                            }}>
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}>
                                <span style={{
                                  color: hMeta.color,
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}>
                                  {hMeta.icon && renderIcon(hMeta.icon, 14, hMeta.color)}
                                  {hMeta.label}
                                </span>
                                <span style={{
                                  color: "rgba(255,255,255,0.3)",
                                  fontSize: "10px",
                                }}>
                                  {d ? timeAgo(d) : ""}
                                </span>
                              </div>
                              {h.note && (
                                <p style={{
                                  margin: "2px 0 0 18px",
                                  color: "rgba(255,255,255,0.35)",
                                  fontSize: "11px",
                                  fontStyle: "italic",
                                }}>
                                  {h.note}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {isActive && (
                      <div style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "16px",
                        paddingTop: "14px",
                        borderTop: "1px solid rgba(255,255,255,0.04)",
                        flexWrap: "wrap",
                      }}>
                        <button
                          onClick={() => handleResolve(r.id)}
                          disabled={actionLoading}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "10px",
                            border: "none",
                            background: "rgba(34,197,94,0.12)",
                            border: "1px solid rgba(34,197,94,0.25)",
                            color: T.green,
                            cursor: actionLoading ? "not-allowed" : "pointer",
                            fontFamily: "Quicksand,sans-serif",
                            fontWeight: "700",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={e => {
                            if (!actionLoading) {
                              e.currentTarget.style.background = "rgba(34,197,94,0.18)";
                              e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
                            }
                          }}
                          onMouseLeave={e => {
                            if (!actionLoading) {
                              e.currentTarget.style.background = "rgba(34,197,94,0.12)";
                              e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)";
                            }
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => setActionModal({ id: r.id, type: "cancel" })}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "10px",
                            border: "none",
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.2)",
                            color: T.red,
                            cursor: "pointer",
                            fontFamily: "Quicksand,sans-serif",
                            fontWeight: "700",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                            e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                            e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                          Cancel Request
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}