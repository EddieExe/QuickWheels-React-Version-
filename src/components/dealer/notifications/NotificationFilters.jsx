// src/components/dealer/notifications/NotificationFilters.jsx
import { DEALER_NOTIFICATION_TYPES } from "../../../utils/dealerNotificationService";
import { DEALER_NOTIFICATION_ICONS } from "../../../utils/dealerNotificationIcons";

// ─── Priority config (SVG icons + colors, matching your main file exactly) ───
const PRIORITY_OPTIONS = [
  {
    id: "unread",
    label: "Unread",
    color: "#818cf8",
    icon: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" fill={`${color}30`} />
      </svg>
    ),
  },
  {
    id: "critical",
    label: "Critical",
    color: "#ef4444",
    icon: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    id: "high",
    label: "High",
    color: "#f97316",
    icon: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 22v-4M4 12H2M6 12H4M20 12h-2M22 12h-2M19.07 4.93l-2.83 2.83M4.93 19.07l2.83-2.83" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    id: "medium",
    label: "Medium",
    color: "#fbbf24",
    icon: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 22v-4M4 12H2M6 12H4M20 12h-2M22 12h-2" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    id: "low",
    label: "Low",
    color: "#22c55e",
    icon: (color) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 22v-4M4 12H2M6 12H4" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
];

// ─── Reusable filter button (sidebar style from main file) ───────────────────
function SidebarFilterBtn({ active, color, icon, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 8px",
        borderRadius: "10px",
        border: "none",
        background: active ? "rgba(99,102,241,0.08)" : "transparent",
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
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(99,102,241,0.06)";
          e.currentTarget.style.color = "#e2e8f0";
          e.currentTarget.style.borderLeftColor = "#818cf8";
          const svg = e.currentTarget.querySelector("svg");
          if (svg) svg.setAttribute("stroke", "#e2e8f0");
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "rgba(255,255,255,0.55)";
          e.currentTarget.style.borderLeftColor = "transparent";
          const svg = e.currentTarget.querySelector("svg");
          if (svg) svg.setAttribute("stroke", "rgba(255,255,255,0.55)");
        }
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          {icon(active ? color : "rgba(255,255,255,0.55)")}
        </span>
        {label}
      </span>
      <span style={{ fontWeight: "700", color: active ? color : "#fff" }}>{count}</span>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function NotificationFilters({
  notifications = [],       // full array for counting
  filterPriority,           // string | null
  filterType,               // string | null
  searchTerm,               // string
  onFilterPriorityChange,   // (id | null) => void
  onFilterTypeChange,       // (id | null) => void
  onClearFilters,           // () => void
}) {
  // Build type options from DEALER_NOTIFICATION_TYPES (your service enum)
  // Each entry needs: id, label/title, color, icon(color) function
  // DEALER_NOTIFICATION_TYPES values should have { id, title, color, icon }
  // We wrap their icon (string/emoji) in an SVG-compatible span if needed,
  // OR if your service exports SVG render functions, they'll be used directly.
  const typeOptions = Object.values(DEALER_NOTIFICATION_TYPES);

  return (
    <>
      {/* ── Priority Filter ── */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "14px",
          padding: "6px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {/* All button */}
        <button
          onClick={() => onFilterPriorityChange(null)}
          style={{
            padding: "10px 8px",
            borderRadius: "10px",
            border: "none",
            background: !filterPriority ? "rgba(99,102,241,0.08)" : "transparent",
            color: !filterPriority ? "#818cf8" : "rgba(255,255,255,0.55)",
            cursor: "pointer",
            fontFamily: "Quicksand,sans-serif",
            fontSize: "13px",
            fontWeight: !filterPriority ? "700" : "500",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderLeft: `3px solid ${!filterPriority ? "#818cf8" : "transparent"}`,
            textAlign: "left",
            transition: "all 0.2s ease",
            width: "100%",
          }}
          onMouseEnter={(e) => {
            if (filterPriority !== null) {
              e.currentTarget.style.background = "rgba(99,102,241,0.06)";
              e.currentTarget.style.color = "#e2e8f0";
              e.currentTarget.style.borderLeftColor = "#818cf8";
            }
          }}
          onMouseLeave={(e) => {
            if (filterPriority !== null) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.55)";
              e.currentTarget.style.borderLeftColor = "transparent";
            }
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: !filterPriority ? "#818cf8" : "rgba(255,255,255,0.35)", display: "flex", alignItems: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
            </span>
            All
          </span>
          <span style={{ fontWeight: "700", color: !filterPriority ? "#818cf8" : "#fff" }}>
            {notifications.length}
          </span>
        </button>

        {/* Priority options */}
        {PRIORITY_OPTIONS.map(({ id, label, color, icon }) => {
          const active = filterPriority === id;
          // "unread" is a read-state filter, not a priority field — handle separately
          const count =
            id === "unread"
              ? notifications.filter((n) => !n.read).length
              : notifications.filter((n) => (n.priority || "low") === id).length;

          return (
            <SidebarFilterBtn
              key={id}
              active={active}
              color={color}
              icon={icon}
              label={label}
              count={count}
              onClick={() => onFilterPriorityChange(active ? null : id)}
            />
          );
        })}
      </div>

      {/* ── Notification Type Filter ── */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "14px",
          padding: "6px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        <div
          style={{
            padding: "8px 8px 4px",
            fontSize: "9px",
            fontWeight: "700",
            letterSpacing: "1.5px",
            color: "rgba(255,255,255,0.3)",
            textTransform: "uppercase",
          }}
        >
          Notification Type
        </div>

        {typeOptions.map((type) => {
          const active = filterType === type.id;
          const count = notifications.filter(
            (n) => (n.type || "new_booking") === type.id
          ).length;

          // Support both SVG render functions and emoji/string icons from the service
          const iconRenderer = DEALER_NOTIFICATION_ICONS[type.id] 
            ?? ((color) => <span style={{ fontSize: "14px" }}>🔔</span>);

          return (
            <SidebarFilterBtn
              key={type.id}
              active={active}
              color={type.color}
              icon={iconRenderer}
              label={type.title || type.label}
              count={count}
              onClick={() => onFilterTypeChange(active ? null : type.id)}
            />
          );
        })}
      </div>

      {/* ── Clear Filters ── */}
      {(filterPriority || filterType || searchTerm) && (
        <button
          onClick={onClearFilters}
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
          CLEAR ALL FILTERS
        </button>
      )}
    </>
  );
}