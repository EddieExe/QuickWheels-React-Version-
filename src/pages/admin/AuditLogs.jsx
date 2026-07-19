// src/pages/admin/AuditLogs.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { getAuditLogs } from "../../utils/adminUtils.jsx";

const ACTION_META = {
  booking_approved:   { color: "#22c55e", label: "Booking Approved" },
  booking_cancelled:  { color: "#ef4444", label: "Booking Cancelled" },
  booking_rejected:   { color: "#ef4444", label: "Booking Rejected" },
  booking_on_hold:    { color: "#f59e0b", label: "Booking On Hold" },
  dealer_approved:    { color: "#22c55e", label: "Dealer Approved" },
  dealer_rejected:    { color: "#ef4444", label: "Dealer Rejected" },
  dealer_suspended:   { color: "#f59e0b", label: "Dealer Suspended" },
  admin_created:      { color: "#a855f7", label: "Admin Created" },
  admin_role_changed: { color: "#a855f7", label: "Role Changed" },
  admin_deactivated:  { color: "#ef4444", label: "Admin Deactivated" },
  user_suspended:     { color: "#f59e0b", label: "User Suspended" },
  user_deleted:       { color: "#ef4444", label: "User Deleted" },
};

// ── SVG Icons for each action type ──
const ACTION_ICONS = {
  booking_approved: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  booking_cancelled: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  booking_rejected: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  booking_on_hold: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="10" y1="15" x2="10" y2="9"/>
      <line x1="14" y1="15" x2="14" y2="9"/>
    </svg>
  ),
  dealer_approved: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  dealer_rejected: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
    </svg>
  ),
  dealer_suspended: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  ),
  admin_created: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  admin_role_changed: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  admin_deactivated: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      <line x1="12" y1="12" x2="18" y2="18"/>
      <line x1="18" y1="12" x2="12" y2="18"/>
    </svg>
  ),
  user_suspended: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  ),
  user_deleted: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
};

const DEFAULT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

function getActionMeta(action) {
  return ACTION_META[action] || { color: "#94a3b8", label: action?.replace(/_/g, " ") || "Unknown" };
}

function getActionIcon(action) {
  return ACTION_ICONS[action] || DEFAULT_ICON;
}

function timeAgo(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (m < 1)   return "Just now";
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Fixed dark-purple accent used for every audit card's left border
const CARD_ACCENT = "#9333ea";
const CARD_ACCENT_HOVER = "#a855f7";

export default function AuditLogs() {
  const [logs, setLogs]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterAdmin, setFilterAdmin]   = useState("");
  const [search, setSearch]             = useState("");
  const [expanded, setExpanded]         = useState(null);

  // Holds the DOM node for each expanded log's payload panel so we can
  // measure its natural content height and animate max-height smoothly
  // instead of the panel snapping open/closed.
  const detailRefs = useRef({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getAuditLogs(200, {
          ...(filterAction && { action: filterAction }),
          ...(filterAdmin  && { adminEmail: filterAdmin }),
        });
        setLogs(data || []);
      } catch (err) {
        console.error("Error pulling system audit trails:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filterAction, filterAdmin]);

  const uniqueAdmins  = useMemo(() => [...new Set(logs.map(l => l.adminEmail).filter(Boolean))], [logs]);
  const uniqueActions = useMemo(() => [...new Set(logs.map(l => l.action).filter(Boolean))], [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        l.adminEmail?.toLowerCase().includes(s) ||
        l.action?.toLowerCase().includes(s) ||
        l.targetId?.toLowerCase().includes(s) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(s)
      );
    });
  }, [logs, search]);

  return (
    <div style={{ 
      color: "#f8fafc",
      fontFamily: "'Quicksand', -apple-system, sans-serif",
      animation: "auditFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      <style>{`
        @keyframes auditFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .audit-select-wrapper { position: relative; }
        .audit-select-wrapper::after {
          content: '↓';
          font-size: 10px;
          color: rgba(255, 255, 255, 0.3);
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .audit-select-wrapper:hover::after { color: #a855f7; }

        /* ── Sticky filters bar ──────────────────────────────────────────
           Bleeds to the edges of the parent card (via negative margin
           equal to the card's own padding) and pins to the top of the
           nearest scrolling ancestor so search/filters stay reachable
           while scrolling a long log list. */
        .audit-filters-sticky {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(15,15,25,0.94);
          backdrop-filter: blur(14px) saturate(150%);
          -webkit-backdrop-filter: blur(14px) saturate(150%);
          margin: -20px -20px 20px;
          padding: 20px 20px 16px;
          border-radius: 16px 16px 0 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .audit-filters-bar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .audit-filter-search {
          flex: 1;
          min-width: 260px;
          position: relative;
        }
        /* display:contents on desktop keeps the two selects behaving as
           plain flex siblings of the search box — i.e. today's layout,
           unchanged. Mobile turns this into an explicit 2-col grid below. */
        .audit-filter-dropdowns {
          display: contents;
        }

        /* Premium glass morphism card — dark purple accent border on the left,
           spans the full card height automatically (including expanded content)
           because it's set on the outer wrapper, not the header row.
           FIXED: border-radius: 14px on all corners so the left border has curves */
        .audit-row {
          position: relative;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          background: rgba(255, 255, 255, 0.025) !important;
          backdrop-filter: blur(14px) saturate(150%) !important;
          -webkit-backdrop-filter: blur(14px) saturate(150%) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-radius: 14px !important;
          box-shadow:
            0 2px 10px rgba(0,0,0,0.10),
            inset 0 1px 0 rgba(255,255,255,0.04) !important;
        }
        .audit-row:hover {
          background: rgba(255, 255, 255, 0.045) !important;
          border-top-color: rgba(147,51,234,0.22) !important;
          border-right-color: rgba(147,51,234,0.22) !important;
          border-bottom-color: rgba(147,51,234,0.22) !important;
          box-shadow:
            0 6px 20px rgba(0,0,0,0.16),
            0 0 0 1px rgba(147,51,234,0.06),
            inset 0 1px 0 rgba(255,255,255,0.06) !important;
        }
        .audit-row.is-open {
          background: rgba(147,51,234,0.035) !important;
          border-top-color: rgba(147,51,234,0.28) !important;
          border-right-color: rgba(147,51,234,0.28) !important;
          border-bottom-color: rgba(147,51,234,0.28) !important;
          box-shadow:
            0 10px 30px rgba(147,51,234,0.10),
            0 2px 10px rgba(0,0,0,0.14),
            inset 0 1px 0 rgba(255,255,255,0.05) !important;
        }

        /* Expanded payload panel — always mounted, animated via measured
           max-height (same pattern as CarAnalytics / RevenueRoutes)
           instead of instantly snapping open/closed. */
        .audit-details {
          max-height: 0px;
          opacity: 0;
          overflow: hidden;
          padding: 0 18px;
          background: rgba(0,0,0,0.14);
          transition:
            max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.3s ease,
            padding 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .audit-row.is-open .audit-details {
          padding: 0 18px 18px 18px;
          border-top: 1px solid rgba(147,51,234,0.08);
        }

        .audit-expand-icon {
          transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), color 0.3s ease;
        }

        .audit-input::placeholder { color: rgba(255, 255, 255, 0.3); }
        .audit-input:focus { border-color: #a855f7 !important; box-shadow: 0 0 0 4px rgba(168,85,247,0.08) !important; }
        
        .audit-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .audit-scroll::-webkit-scrollbar-track { background: transparent; }
        .audit-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
        
        .audit-select-wrapper select:focus {
          border-color: #a855f7 !important;
          box-shadow: 0 0 0 4px rgba(168,85,247,0.08) !important;
        }

        /* ══════════════════════════════════════════════════
           MOBILE (≤768px)
        ══════════════════════════════════════════════════ */
        @media (max-width: 768px) {
          /* Card padding shrinks to 12px at this breakpoint (see
             .audit-logs-content in the parent section), so the sticky
             bar's bleed margin has to shrink to match or it overshoots.
             top offset stacks this bar just below the sticky KPI widget
             in the sidebar above, instead of overlapping it. */
          .audit-filters-sticky {
            top: 100px;
            margin: -12px -12px 14px;
            padding: 12px 12px 12px;
            border-radius: 14px 14px 0 0;
          }
          .audit-filters-bar {
            flex-direction: column;
            gap: 10px;
          }
          .audit-filter-search {
            width: 100%;
            min-width: 0;
          }
          /* Guaranteed side-by-side: an explicit 2-col grid instead of
             relying on flex-wrap, which was stacking them one under the
             other depending on available width. */
          .audit-filter-dropdowns {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            width: 100%;
          }
          .audit-filter-dropdowns .audit-select-wrapper {
            min-width: 0 !important;
            width: 100%;
          }
          .audit-reset-btn {
            width: 100%;
            justify-content: center;
          }

          .audit-row-header {
            padding: 12px 14px !important;
            gap: 12px !important;
          }
          .audit-row-icon {
            width: 30px !important;
            height: 30px !important;
          }
          .audit-row-label {
            font-size: 12px !important;
          }
          .audit-row-sub {
            font-size: 10px !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          .audit-row-time {
            min-width: 60px !important;
          }
          .audit-row-time p:first-child {
            font-size: 10px !important;
          }
          .audit-row-time p:last-child {
            display: none;
          }

          .audit-details { padding: 0 !important; }
          .audit-row.is-open .audit-details { padding: 0 12px 12px !important; }
          .audit-details-payload { padding: 10px !important; margin-top: 10px !important; }
          .audit-details-payload pre { font-size: 10px !important; max-height: 160px !important; }
          .audit-meta-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
        }

        /* ══════════════════════════════════════════════════
           SMALL MOBILE (≤480px)
        ══════════════════════════════════════════════════ */
        @media (max-width: 480px) {
          .audit-filters-sticky {
            top: 92px;
            margin: -8px -8px 10px;
            padding: 8px 8px 8px;
            border-radius: 12px 12px 0 0;
          }
          .audit-row-header {
            padding: 10px 12px !important;
            gap: 10px !important;
          }
          .audit-row-icon {
            width: 26px !important;
            height: 26px !important;
          }
          .audit-row-label { font-size: 11px !important; }
          .audit-row-sub { font-size: 9px !important; }
          .audit-meta-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ── FILTERS BAR (sticky) ── */}
      <div className="audit-filters-sticky">
        <div className="audit-filters-bar">
          <div className="audit-filter-search">
            <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", opacity: 0.35, display: "flex" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
            <input
              className="audit-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search payload values, emails, target keys..."
              style={{ 
                width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 40px", 
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", 
                borderRadius: "10px", color: "#fff", fontSize: "12px", outline: "none",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)", fontFamily: "Quicksand"
              }}
              onFocus={e => { e.target.style.borderColor = "#a855f7"; e.target.style.boxShadow = "0 0 0 4px rgba(168,85,247,0.08)"; e.target.style.background = "rgba(168,85,247,0.03)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.06)"; e.target.style.boxShadow = "none"; e.target.style.background = "rgba(255,255,255,0.02)"; }}
            />
          </div>

          <div className="audit-filter-dropdowns">
            <div className="audit-select-wrapper" style={{ minWidth: "160px" }}>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                style={{ 
                  width: "100%", boxSizing: "border-box", padding: "10px 36px 10px 14px", background: "rgba(255,255,255,0.02)", 
                  border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", 
                  color: "#fff", fontSize: "12px", outline: "none", cursor: "pointer", appearance: "none", 
                  fontFamily: "Quicksand", transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
                onFocus={e => { e.target.style.borderColor = "#a855f7"; e.target.style.boxShadow = "0 0 0 4px rgba(168,85,247,0.08)"; e.target.style.background = "rgba(168,85,247,0.03)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.06)"; e.target.style.boxShadow = "none"; e.target.style.background = "rgba(255,255,255,0.02)"; }}
              >
                <option value="">All Action Types</option>
                {uniqueActions.map(a => (
                  <option key={a} value={a}>{getActionMeta(a).label}</option>
                ))}
              </select>
            </div>

            <div className="audit-select-wrapper" style={{ minWidth: "160px" }}>
              <select
                value={filterAdmin}
                onChange={e => setFilterAdmin(e.target.value)}
                style={{ 
                  width: "100%", boxSizing: "border-box", padding: "10px 36px 10px 14px", background: "rgba(255,255,255,0.02)", 
                  border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", 
                  color: "#fff", fontSize: "12px", outline: "none", cursor: "pointer", appearance: "none", 
                  fontFamily: "Quicksand", transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
                onFocus={e => { e.target.style.borderColor = "#a855f7"; e.target.style.boxShadow = "0 0 0 4px rgba(168,85,247,0.08)"; e.target.style.background = "rgba(168,85,247,0.03)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.06)"; e.target.style.boxShadow = "none"; e.target.style.background = "rgba(255,255,255,0.02)"; }}
              >
                <option value="">All Operators</option>
                {uniqueAdmins.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {(filterAction || filterAdmin || search) && (
            <button
              className="audit-reset-btn"
              onClick={() => { setFilterAction(""); setFilterAdmin(""); setSearch(""); }}
              style={{ 
                padding: "10px 16px", background: "rgba(239, 68, 68, 0.05)", 
                border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "10px", 
                color: "#fca5a5", fontSize: "11px", fontWeight: "700", cursor: "pointer",
                letterSpacing: "0.5px", transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)", 
                fontFamily: "Quicksand", display: "flex", alignItems: "center", gap: "6px"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)"; e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.25)"; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              RESET FILTERS
            </button>
          )}
        </div>
      </div>

      {/* ── LOGS LIST ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ 
              height: "64px", background: "rgba(255,255,255,0.01)", 
              borderRadius: "14px", border: "1px solid rgba(255,255,255,0.04)",
              position: "relative", overflow: "hidden"
            }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ 
          textAlign: "center", padding: "60px 40px", 
          background: "rgba(255,255,255,0.005)", border: "1px dashed rgba(255,255,255,0.06)", 
          borderRadius: "16px" 
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"> 
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="M12 18v-4"/>
            <path d="M8 18v-2"/>
            <path d="M16 18v-6"/>
          </svg>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px", fontWeight: "500", margin: 0 }}>
            No transaction events or security trails found matching active query params.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((log) => {
            const meta = getActionMeta(log.action);
            const icon = getActionIcon(log.action);
            const isOpen = expanded === log.id;

            return (
              <div
                key={log.id}
                className={`audit-row ${isOpen ? "is-open" : ""}`}
                style={{
                  // Fixed dark-purple accent with FULL rounded corners
                  borderLeft: `5px solid ${isOpen ? CARD_ACCENT_HOVER : CARD_ACCENT}`,
                  borderRadius: "14px !important",
                  boxShadow: `inset 8px 0 16px -10px ${isOpen ? "rgba(168,85,247,0.55)" : "rgba(147,51,234,0.35)"}`,
                  overflow: "hidden",
                }}
              >
                <div
                  className="audit-row-header"
                  onClick={() => setExpanded(isOpen ? null : log.id)}
                  style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 18px", cursor: "pointer" }}
                >
                  <div
                    className="audit-row-icon"
                    style={{
                      width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                      background: meta.color + "12", border: `1px solid ${meta.color}25`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.25s ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = meta.color + "20"; e.currentTarget.style.transform = "scale(1.05)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = meta.color + "12"; e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    {icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "3px" }}>
                      <span className="audit-row-label" style={{ color: "#fff", fontWeight: "700", fontSize: "13px" }}>{meta.label}</span>
                      {log.targetType && (
                        <span style={{ 
                          padding: "1px 8px", borderRadius: "5px", fontSize: "9px", fontWeight: "800", 
                          background: "rgba(147,51,234,0.10)", color: "rgba(196,148,247,0.75)", textTransform: "uppercase",
                          letterSpacing: "0.5px", border: "1px solid rgba(147,51,234,0.15)"
                        }}>
                          {log.targetType}
                        </span>
                      )}
                    </div>
                    <p className="audit-row-sub" style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "11px", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      operator: <span style={{ color: "rgba(255,255,255,0.6)" }}>{log.adminEmail}</span>
                      {log.targetId && <> &bull; asset_id: <span style={{ color: "rgba(255,255,255,0.5)" }}>{log.targetId}</span></>}
                    </p>
                  </div>

                  <div className="audit-row-time" style={{ textAlign: "right", flexShrink: 0, minWidth: "80px" }}>
                    <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700" }}>
                      {timeAgo(log.timestamp)}
                    </p>
                    <p style={{ margin: "2px 0 0 0", color: "rgba(255,255,255,0.18)", fontSize: "10px", fontFamily: "monospace" }}>
                      {log.ipAddress || "no_ip"}
                    </p>
                  </div>

                  <span className="audit-expand-icon" style={{ 
                    color: isOpen ? "rgba(196,148,247,0.7)" : "rgba(255,255,255,0.2)", fontSize: "10px", 
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" 
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </span>
                </div>

                {/* Expanded — always mounted, animated via measured max-height
                    instead of instantly mounting/unmounting. */}
                <div
                  ref={(el) => { if (el) detailRefs.current[log.id] = el; }}
                  className="audit-details"
                  style={{
                    maxHeight: isOpen ? `${detailRefs.current[log.id]?.scrollHeight ?? 1000}px` : "0px",
                    opacity: isOpen ? 1 : 0,
                  }}
                  aria-hidden={!isOpen}
                >
                  <div className="audit-details-payload" style={{ 
                    background: "rgba(0,0,0,0.25)", borderRadius: "10px", padding: "14px", marginTop: "14px", 
                    border: "1px solid rgba(147,51,234,0.06)",
                    backdropFilter: "blur(6px) saturate(140%)",
                    WebkitBackdropFilter: "blur(6px) saturate(140%)",
                  }}>
                    <p style={{ margin: "0 0 8px 0", color: CARD_ACCENT_HOVER, fontSize: "9px", fontWeight: "800", letterSpacing: "1px" }}>
                      PAYLOAD TELEMETRY OBJECT
                    </p>
                    <pre className="audit-scroll" style={{ 
                      margin: 0, color: "rgba(255,255,255,0.65)", fontSize: "11px", 
                      whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "monospace",
                      overflowX: "auto", maxHeight: "220px"
                    }}>
                      {JSON.stringify(log.details || {}, null, 2)}
                    </pre>
                  </div>

                  <div className="audit-meta-grid" style={{ display: "flex", gap: "20px", marginTop: "12px", flexWrap: "wrap", paddingLeft: "4px" }}>
                    {[
                      ["Authorized Administrator", log.adminEmail],
                      ["Network IP Origin", log.ipAddress || "system-internal"],
                      ["Database Entry Stamp", log.timestamp?.toDate?.()?.toLocaleString("en-IN") || "—"],
                      ["System Event Key", log.id]
                    ].map(([label, val]) => (
                      <div key={label} style={{ minWidth: "120px" }}>
                        <p style={{ margin: 0, color: "rgba(196,148,247,0.5)", fontSize: "8px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
                        <p style={{ margin: "2px 0 0 0", color: "rgba(255,255,255,0.55)", fontSize: "11px", fontFamily: "monospace", wordBreak: "break-all" }}>{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}