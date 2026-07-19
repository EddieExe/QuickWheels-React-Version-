// src/components/admin/AdminExtensionRequests.jsx
import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { processExtensionRequest, formatCurrency } from "../../utils/lateReturnUtils";
import {
  STATUS_SVG_ICONS,
  REQUEST_STATUS,
} from "../../utils/assistanceUtils";
import { renderIcon } from "../../utils/iconRenderer";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  purple: "#a855f7",
  pink: "#ec4899",
  textSec: "rgba(255,255,255,0.4)",
  textMuted: "rgba(255,255,255,0.25)",
};

// ─── Premium Stat Card with Glass Morphism ───────────────────────────
function StatCard({ label, value, color, icon, bg, subtitle }) {
  return (
    <div style={{
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
        {subtitle && (
          <p style={{ margin: "2px 0 0", fontSize: "10px", color: T.textMuted, fontWeight: "500" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Premium Filter Tabs ──────────────────────────────────
function FilterTabs({ options, value, onChange, color = T.cyan }) {
  return (
    <div style={{
      display: "flex", gap: "4px",
      background: "rgba(255,255,255,0.02)",
      padding: "4px",
      borderRadius: "12px",
      border: "1px solid rgba(255,255,255,0.06)",
      flexWrap: "wrap",
    }}>
      {options.map(opt => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              border: "none",
              fontFamily: "Quicksand,sans-serif",
              background: isActive ? `linear-gradient(135deg, ${color}20, ${color}08)` : "transparent",
              color: isActive ? color : "rgba(255,255,255,0.4)",
              fontWeight: isActive ? "700" : "500",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: isActive ? `1px solid ${color}40` : "1px solid transparent",
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {opt.icon && (
              <span style={{ display: "flex", alignItems: "center" }}>
                {opt.icon}
              </span>
            )}
            {opt.label}
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
          </button>
        );
      })}
    </div>
  );
}

// ─── Premium Search Input ─────────────────────────────────
function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
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

// ─── Premium Reject Modal ─────────────────────────────────
function RejectModal({ onConfirm, onCancel, loading }) {
  const [notes, setNotes] = useState("");
  
  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(3,3,7,.92)", backdropFilter: "blur(12px)",
      zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0c0c16", border: `1px solid ${T.red}66`, borderRadius: "20px",
        padding: "32px", maxWidth: "460px", width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.5)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "4px",
          background: T.red,
        }} />
        <h3 style={{
          margin: "0 0 12px",
          color: T.red,
          fontSize: "18px",
          fontWeight: "800",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          <span style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: `${T.red}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </span>
          Reject Extension Request
        </h3>
        <p style={{
          margin: "0 0 16px",
          color: "rgba(255,255,255,0.4)",
          fontSize: "13px",
        }}>
          Provide a reason for rejecting this extension request. This will be visible to the dealer.
        </p>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Reason for rejection (visible to dealer)…"
          style={{
            width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: "12px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff", fontSize: "13px", fontFamily: "Quicksand,sans-serif", resize: "vertical",
            outline: "none", transition: "all 0.25s ease",
          }}
          onFocus={e => { e.target.style.borderColor = T.red; e.target.style.background = "rgba(255,255,255,0.06)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
        />
        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={() => onConfirm(notes)}
            disabled={loading}
            style={{
              flex: 1, padding: "12px", borderRadius: "12px", border: "none",
              background: T.red, color: "#fff", cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "Quicksand,sans-serif", fontWeight: "800", fontSize: "14px",
              opacity: loading ? 0.6 : 1, transition: "all 0.2s ease",
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            {loading ? "Processing…" : "Confirm Reject"}
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

function timeAgo(iso) {
  if (!iso) return "—";
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function timeUntil(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const hr = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return hr > 0 ? `${hr}h ${min}m` : `${min}m`;
}

const STATUS_META = {
  pending:  { label: "Pending",  color: T.orange, icon: STATUS_SVG_ICONS.PENDING },
  approved: { label: "Approved", color: T.green,  icon: STATUS_SVG_ICONS.CONFIRMED },
  rejected: { label: "Rejected", color: T.red,    icon: STATUS_SVG_ICONS.CANCELLED },
};

export default function AdminExtensionRequests({ bookings = [] }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [rejectModalId, setRejectModalId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "extensionRequests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
    return () => unsub();
  }, []);

  const bookingMap = useMemo(() => {
    const map = {};
    bookings.forEach(b => { map[b.id] = b; });
    return map;
  }, [bookings]);

  const enriched = useMemo(() => requests.map(r => {
    const booking = bookingMap[r.bookingId];
    return {
      ...r,
      booking,
      dealerName: booking?.dealerBusinessName || booking?.dealerName || "—",
      bookingRefId: booking?.bookingId || r.bookingId,
    };
  }), [requests, bookingMap]);

  const filtered = useMemo(() => enriched.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      const haystack = [r.customerName, r.customerEmail, r.dealerName, r.carModel, r.bookingRefId]
        .filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(s)) return false;
    }
    return true;
  }), [enriched, statusFilter, search]);

  const summary = useMemo(() => {
    const pending = enriched.filter(r => r.status === "pending");
    const approved = enriched.filter(r => r.status === "approved");
    const rejected = enriched.filter(r => r.status === "rejected");
    const expiredPending = pending.filter(r => r.expiresAt && new Date(r.expiresAt) < new Date());
    const approvedRevenue = approved.reduce((sum, r) => sum + (r.proposedCharge || 0), 0);
    return {
      total: enriched.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      expiredPending: expiredPending.length,
      approvedRevenue,
    };
  }, [enriched]);

  async function handleAction(requestId, action, notes = "") {
    setActionLoading(true);
    try {
      const result = await processExtensionRequest(requestId, action, "admin", notes);
      if (!result.success) alert(`Failed: ${result.error}`);
      setRejectModalId(null);
    } finally {
      setActionLoading(false);
    }
  }

  // ─── STATUS TABS WITH SVGs ───
  const STATUS_TABS = [
    { 
      value: "pending", 
      label: "Pending", 
      icon: renderIcon(STATUS_SVG_ICONS.PENDING, 16, T.orange),
      count: summary.pending 
    },
    { 
      value: "approved", 
      label: "Approved", 
      icon: renderIcon(STATUS_SVG_ICONS.CONFIRMED, 16, T.green),
      count: summary.approved 
    },
    { 
      value: "rejected", 
      label: "Rejected", 
      icon: renderIcon(STATUS_SVG_ICONS.CANCELLED, 16, T.red),
      count: summary.rejected 
    },
    { 
      value: "all", 
      label: "All", 
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.cyan} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      count: summary.total 
    },
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

      {rejectModalId && (
        <RejectModal
          loading={actionLoading}
          onConfirm={(notes) => handleAction(rejectModalId, "reject", notes)}
          onCancel={() => setRejectModalId(null)}
        />
      )}

      {/* ── Summary Stats with Glass Morphism ── */}
      <div className="emergency-stat-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "14px",
        marginBottom: "24px",
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
          subtitle={summary.expiredPending > 0 ? `${summary.expiredPending} expired` : "Awaiting review"}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        />
        <StatCard
          label="Approved"
          value={summary.approved}
          color={T.green}
          subtitle={`${formatCurrency(summary.approvedRevenue, "$")} total revenue`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          }
        />
        <StatCard
          label="Rejected"
          value={summary.rejected}
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

      {/* ── Expired Warning with Glass Morphism ── */}
      {summary.expiredPending > 0 && (
        <div style={{
          padding: "14px 18px",
          borderRadius: "12px",
          marginBottom: "20px",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(239,68,68,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)";
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ margin: 0, color: T.red, fontSize: "13px", fontWeight: "700" }}>
            {summary.expiredPending} pending extension request{summary.expiredPending !== 1 ? "s" : ""} have expired without a dealer response —
            consider approving or rejecting these directly.
          </p>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginBottom: "20px",
      }}>
        <div style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by customer, dealer, car or booking ID…"
          />
        </div>

        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}>
          <p style={{
            margin: 0,
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "1.5px",
            color: "rgba(255,255,255,0.3)",
            textTransform: "uppercase",
          }}>
            Status
          </p>
          <FilterTabs
            options={STATUS_TABS}
            value={statusFilter}
            onChange={setStatusFilter}
            color={T.cyan}
          />
        </div>
      </div>

      {/* ── Requests List with Glass Morphism ── */}
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
              ? "No extension requests yet."
              : "No requests match your filters."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map(r => {
            const meta = STATUS_META[r.status] || STATUS_META.pending;
            const isExpanded = expandedId === r.id;
            const remaining = r.status === "pending" ? timeUntil(r.expiresAt) : null;
            const isExpired = r.status === "pending" && !remaining;
            const isLate = r.isLate || false;
            const isPremium = r.isPremiumRate || false;

            return (
              <div
                key={r.id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderLeft: `3px solid ${isExpired ? T.red : meta.color}`,
                  borderRadius: "14px",
                  overflow: "hidden",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.borderLeftColor = isExpired ? T.red : meta.color;
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.25), 0 0 20px ${meta.color}10`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.borderLeftColor = isExpired ? T.red : meta.color;
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
                  {/* Status Icon - Using SVG */}
                  <div style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    flexShrink: 0,
                    background: `${meta.color}15`,
                    border: `1px solid ${meta.color}25`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}>
                    {meta.icon ? renderIcon(meta.icon, 20, meta.color) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    )}
                    {isExpired && (
                      <span style={{
                        position: "absolute",
                        top: "-4px",
                        right: "-4px",
                        fontSize: "12px",
                      }}>
                        ⚠️
                      </span>
                    )}
                  </div>

                  {/* Main Info */}
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
                      {r.carModel || "Unknown car"}
                      <span style={{
                        color: "rgba(255,255,255,0.3)",
                        fontWeight: "500",
                        fontSize: "11px",
                        fontFamily: "monospace",
                      }}>
                        #{r.bookingRefId?.substring(0, 8) || r.bookingRefId}
                      </span>
                      {isLate && (
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "9px",
                          fontWeight: "800",
                          background: `${T.orange}20`,
                          color: T.orange,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}>
                          Late
                        </span>
                      )}
                      {isPremium && (
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "9px",
                          fontWeight: "800",
                          background: `${T.purple}20`,
                          color: T.purple,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}>
                          Premium
                        </span>
                      )}
                    </p>
                    <p style={{
                      margin: "2px 0 0",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        {r.customerName || r.customerEmail}
                      </span>
                      {r.dealerName !== "—" && (
                        <>
                          <span style={{ opacity: 0.3 }}>·</span>
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

                  {/* Right side: Amount + Status + Expand */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    flexShrink: 0,
                  }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{
                        margin: 0,
                        color: T.green,
                        fontWeight: "800",
                        fontSize: "15px",
                      }}>
                        {formatCurrency(r.proposedCharge, "$")}
                      </p>
                      <p style={{
                        margin: "2px 0 0",
                        color: "rgba(255,255,255,0.25)",
                        fontSize: "9px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}>
                        +{r.requestedDays}d extension
                      </p>
                    </div>
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "10px",
                      fontWeight: "800",
                      background: isExpired ? `${T.red}20` : `${meta.color}20`,
                      color: isExpired ? T.red : meta.color,
                      border: `1px solid ${isExpired ? T.red : meta.color}25`,
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}>
                      {isExpired ? (
                        <>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          EXPIRED
                        </>
                      ) : (
                        meta.label.toUpperCase()
                      )}
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
                      {/* Customer & Dealer Info - Dark Purple heading */}
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          Customer & Dealer
                        </p>
                        {[
                          ["Customer", r.customerName || r.customerEmail],
                          ["Email", r.customerEmail],
                          ["Dealer", r.dealerName],
                          ["Booking ID", r.bookingRefId],
                        ].filter(([, v]) => v && v !== "—").map(([label, value]) => (
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
                              fontWeight: label === "Booking ID" ? "600" : "400",
                              fontFamily: label === "Booking ID" ? "monospace" : "inherit",
                            }}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Extension Details - Dark Purple heading */}
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          Extension Details
                        </p>
                        {[
                          ["Requested Days", `${r.requestedDays} day${r.requestedDays > 1 ? 's' : ''}`],
                          ["Proposed Charge", formatCurrency(r.proposedCharge, "$")],
                          ["Reason", r.reason || "Not provided"],
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
                              fontWeight: label === "Proposed Charge" ? "700" : "400",
                              color: label === "Proposed Charge" ? T.green : "rgba(255,255,255,0.8)",
                            }}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Status & Timing - Dark Purple heading */}
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          Status & Timing
                        </p>
                        {[
                          ["Status", meta.label.toUpperCase()],
                          ["Requested", timeAgo(r.createdAt)],
                          ["Expires", r.expiresAt ? new Date(r.expiresAt).toLocaleString() : "—"],
                          ["Remaining", remaining || (isExpired ? "Expired" : "—")],
                        ].filter(([, v]) => v && v !== "—").map(([label, value]) => (
                          <div key={label} style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "4px 0",
                            borderBottom: "1px solid rgba(255,255,255,0.02)",
                          }}>
                            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>{label}</span>
                            <span style={{
                              color: label === "Status" ? meta.color : "rgba(255,255,255,0.8)",
                              fontSize: "11px",
                              fontWeight: label === "Status" ? "700" : "400",
                            }}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {r.status === "pending" && (
                      <div style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "16px",
                        paddingTop: "14px",
                        borderTop: "1px solid rgba(255,255,255,0.04)",
                        flexWrap: "wrap",
                      }}>
                        <button
                          onClick={() => handleAction(r.id, "approve")}
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
                          Approve Extension
                        </button>
                        <button
                          onClick={() => setRejectModalId(r.id)}
                          disabled={actionLoading}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "10px",
                            border: "none",
                            background: "rgba(239,68,68,0.08)",
                            border: "1px solid rgba(239,68,68,0.2)",
                            color: T.red,
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
                              e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                              e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)";
                            }
                          }}
                          onMouseLeave={e => {
                            if (!actionLoading) {
                              e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                              e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
                            }
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                          Reject
                        </button>
                        {isExpired && (
                          <span style={{
                            color: T.red,
                            fontSize: "11px",
                            alignSelf: "center",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Expired — dealer never responded. Admin can still process this.
                          </span>
                        )}
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