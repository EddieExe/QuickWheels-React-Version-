// src/components/admin/RevenueRoutes.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useDateRange } from "../../context/DateRangeContext";

function fmt(n, prefix = "₹") {
  if (n >= 100000) return `${prefix}${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${Math.round(n)}`;
}

// ── Defensive field readers ──────────────────────────────────────────────────
// If the booking schema's pickup/dropoff field names ever change (e.g. a form
// gets refactored from `pickup` to `pickupLocation`), every route/hub would
// silently compute as empty and this whole section would render nothing with
// no error. These helpers check every field name we've seen used for the same
// concept so the section keeps working regardless of which one is present.
function getPickup(b) {
  return (
    b.pickup ??
    b.pickupLocation ??
    b.pickUpLocation ??
    b.pickupAddress ??
    b.pickupCity ??
    b.from ??
    b.origin ??
    ""
  ).toString().trim();
}

function getDropoff(b) {
  return (
    b.dropoff ??
    b.dropOff ??
    b.dropoffLocation ??
    b.dropOffLocation ??
    b.dropoffAddress ??
    b.dropoffCity ??
    b.to ??
    b.destination ??
    ""
  ).toString().trim();
}

function getStatus(b) {
  return (b.status ?? "").toString().trim().toLowerCase();
}

const SORT_OPTIONS = [
  { id: "revenue",  label: "Revenue"  },
  { id: "bookings", label: "Bookings" },
  { id: "avgValue", label: "Avg Value"},
  { id: "avgDays",  label: "Avg Days" },
];

const ACCENT_COLORS = [
  "#4ce3f7", "#a855f7", "#22c55e", "#f59e0b",
  "#ec4899", "#3b82f6", "#10b981", "#f97316",
];

export default function RevenueRoutes({
  bookings = [],
  externalSearch,
  externalSortBy,
  externalViewMode
}) {
  const { filterByRange } = useDateRange();

  const [search, setSearch]     = useState(externalSearch   ?? "");
  const [sortBy, setSortBy]     = useState(externalSortBy   ?? "revenue");
  const [viewMode, setViewMode] = useState(externalViewMode ?? "routes");
  const [expanded, setExpanded] = useState(null);

  // Holds the DOM node for each expanded route panel so we can measure its
  // natural content height and animate max-height smoothly (same pattern
  // used in CarAnalytics) instead of the detail panel snapping open/closed.
  const detailRefs = useRef({});

  useEffect(() => { setSearch(externalSearch    ?? ""); },   [externalSearch]);
  useEffect(() => { setSortBy(externalSortBy    ?? "revenue"); }, [externalSortBy]);
  useEffect(() => { setViewMode(externalViewMode ?? "routes"); }, [externalViewMode]);

  const rangeBookings = useMemo(() => {
    return filterByRange(bookings, "createdAt").filter(
      (b) => !["cancelled", "rejected"].includes(getStatus(b))
    );
  }, [bookings, filterByRange]);

  const routes = useMemo(() => {
    const map = {};
    rangeBookings.forEach((b) => {
      const pickup  = getPickup(b);
      const dropoff = getDropoff(b);
      if (!pickup || !dropoff) return;
      const key = `${pickup}|||${dropoff}`;
      if (!map[key]) map[key] = { key, pickup, dropoff, bookings: 0, revenue: 0, totalDays: 0, statuses: {}, cars: {} };
      map[key].bookings++;
      map[key].revenue   += b.total || 0;
      map[key].totalDays += b.days  || 0;
      map[key].statuses[b.status] = (map[key].statuses[b.status] || 0) + 1;
      if (b.carModel) map[key].cars[b.carModel] = (map[key].cars[b.carModel] || 0) + 1;
    });
    return Object.values(map).map((r) => ({
      ...r,
      avgValue: r.bookings > 0 ? r.revenue / r.bookings : 0,
      avgDays:  r.bookings > 0 ? r.totalDays / r.bookings : 0,
      topCar:   Object.entries(r.cars).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
    }));
  }, [rangeBookings]);

  const pickupHubs = useMemo(() => {
    const map = {};
    rangeBookings.forEach((b) => {
      const p = getPickup(b);
      if (!p) return;
      if (!map[p]) map[p] = { location: p, bookings: 0, revenue: 0, destinations: {} };
      map[p].bookings++;
      map[p].revenue += b.total || 0;
      const d = getDropoff(b);
      if (d) map[p].destinations[d] = (map[p].destinations[d] || 0) + 1;
    });
    return Object.values(map).map((h) => ({
      ...h,
      topDestination: Object.entries(h.destinations).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
      avgValue: h.bookings > 0 ? h.revenue / h.bookings : 0,
    }));
  }, [rangeBookings]);

  const dropoffHubs = useMemo(() => {
    const map = {};
    rangeBookings.forEach((b) => {
      const d = getDropoff(b);
      if (!d) return;
      if (!map[d]) map[d] = { location: d, bookings: 0, revenue: 0, origins: {} };
      map[d].bookings++;
      map[d].revenue += b.total || 0;
      const p = getPickup(b);
      if (p) map[d].origins[p] = (map[d].origins[p] || 0) + 1;
    });
    return Object.values(map).map((h) => ({
      ...h,
      topOrigin: Object.entries(h.origins).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
      avgValue: h.bookings > 0 ? h.revenue / h.bookings : 0,
    }));
  }, [rangeBookings]);

  const displayed = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (viewMode === "routes") {
      let list = [...routes];
      if (query) list = list.filter(r => r.pickup.toLowerCase().includes(query) || r.dropoff.toLowerCase().includes(query));
      list.sort((a, b) => b[sortBy] - a[sortBy]);
      return list;
    }
    const sourceHubs = viewMode === "pickups" ? pickupHubs : dropoffHubs;
    let list = [...sourceHubs];
    if (query) list = list.filter(h => h.location.toLowerCase().includes(query));
    list.sort((a, b) =>
      sortBy === "revenue"  ? b.revenue  - a.revenue  :
      sortBy === "avgValue" ? b.avgValue - a.avgValue :
      b.bookings - a.bookings
    );
    return list;
  }, [routes, pickupHubs, dropoffHubs, sortBy, search, viewMode]);

  const summary = useMemo(() => ({
    totalRoutes:   routes.length,
    totalPickups:  pickupHubs.length,
    totalDropoffs: dropoffHubs.length,
    totalRevenue:  rangeBookings.reduce((sum, b) => sum + (b.total || 0), 0),
    topRoute:      [...routes].sort((a, b) => b.revenue - a.revenue)[0] ?? null,
    topPickup:     [...pickupHubs].sort((a, b) => b.bookings - a.bookings)[0] ?? null,
  }), [routes, pickupHubs, dropoffHubs, rangeBookings]);

  const maxRevenue = Math.max(...displayed.map((d) => d.revenue ?? 0), 1);

  const STAT_CARDS = [
    {
      label: "Unique Routes", value: summary.totalRoutes, color: "#4ce3f7",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h4.5a3.5 3.5 0 0 0 3.5-3.5v-4A3.5 3.5 0 0 1 20.5 8H21"/></svg>
    },
    {
      label: "Pickup Hubs", value: summary.totalPickups, color: "#a855f7",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
    },
    {
      label: "Dropoff Hubs", value: summary.totalDropoffs, color: "#22c55e",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
    },
    {
      label: "Route Revenue", value: fmt(summary.totalRevenue), color: "#f59e0b",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    },
    {
      label: "Top Route",
      value: summary.topRoute
        ? `${summary.topRoute.pickup} → ${summary.topRoute.dropoff}`.length > 20
          ? `${summary.topRoute.pickup} → ${summary.topRoute.dropoff}`.slice(0, 20) + "…"
          : `${summary.topRoute.pickup} → ${summary.topRoute.dropoff}`
        : "—",
      color: "#4ce3f7",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    },
    {
      label: "Busiest Pickup",
      value: summary.topPickup?.location?.length > 18
        ? summary.topPickup.location.slice(0, 18) + "…"
        : summary.topPickup?.location ?? "—",
      color: "#ec4899",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
    },
  ];

  return (
    <div style={{ fontFamily: "Quicksand, sans-serif", color: "#fff" }}>

      {/* ── Summary Cards — forced 3-col ── */}
      <div className="route-stat-grid">
        {STAT_CARDS.map(({ icon, label, value, color }) => (
          <div key={label} style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px",
            padding: "14px 10px",
            textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <div style={{ color, display: "flex", justifyContent: "center", alignItems: "center", height: "22px", marginBottom: "6px" }}>
              {icon}
            </div>
            <p className="stat-value" style={{ margin: 0, color, fontSize: "1.05rem", fontWeight: "800", wordBreak: "break-word", lineHeight: 1.2 }}>{value}</p>
            <p className="stat-label" style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.38)", fontSize: "10px", letterSpacing: "0.02em", lineHeight: 1.3 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Control Bar — mobile only ── */}
      <div className="route-inline-controls" style={{ display: "none", marginBottom: "16px" }}>
        {/* Search */}
        <div style={{ position: "relative", width: "100%" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", opacity: 0.35, display: "flex", alignItems: "center", pointerEvents: "none" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search locations or hubs..."
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "9px 12px 9px 36px", borderRadius: "10px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              color: "#fff", fontFamily: "Quicksand, sans-serif", fontSize: "12px", outline: "none",
              transition: "border-color 0.2s ease",
            }}
            onFocus={e => e.target.style.borderColor = "#6366f1"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"}
          />
        </div>

        {/* View + Sort row */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%" }}>
          {/* View tabs */}
          <div style={{ display: "flex", gap: "3px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "3px", flex: 1 }}>
            {[
              { id: "routes",   label: "Routes",
                icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h4.5a3.5 3.5 0 0 0 3.5-3.5v-4A3.5 3.5 0 0 1 20.5 8H21"/></svg> },
              { id: "pickups",  label: "Pickups",
                icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
              { id: "dropoffs", label: "Dropoffs",
                icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z"/><line x1="4" x2="4" y1="22" y2="15"/></svg> },
            ].map(({ id, label, icon }) => (
              <button key={id} onClick={() => setViewMode(id)} style={{
                flex: 1, padding: "6px 4px", borderRadius: "8px", border: "none", cursor: "pointer",
                fontFamily: "Quicksand, sans-serif", fontSize: "10px", fontWeight: "700",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                background: viewMode === id ? "rgba(99,102,241,0.18)" : "transparent",
                color: viewMode === id ? "#818cf8" : "rgba(255,255,255,0.38)",
                transition: "all 0.2s ease",
              }}>{icon}{label}</button>
            ))}
          </div>

          {/* Sort select */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <span style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", opacity: 0.35, display: "flex", alignItems: "center", pointerEvents: "none" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="10" y2="18"/>
              </svg>
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: "7px 10px 7px 26px", borderRadius: "9px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                color: "#fff", fontFamily: "Quicksand, sans-serif", fontSize: "10px",
                cursor: "pointer", outline: "none", appearance: "none",
              }}
            >
              <option value="revenue"  style={{ background: "#111" }}>Revenue</option>
              <option value="bookings" style={{ background: "#111" }}>Bookings</option>
              <option value="avgValue" style={{ background: "#111" }}>Avg Value</option>
              {viewMode === "routes" && <option value="avgDays" style={{ background: "#111" }}>Avg Days</option>}
            </select>
          </div>
        </div>
      </div>

      {/* ── Empty State ── */}
      {displayed.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "20px" }}>
          <div style={{ color: "rgba(255,255,255,0.2)", display: "flex", justifyContent: "center", marginBottom: "14px" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/>
              <path d="M9 19h4.5a3.5 3.5 0 0 0 3.5-3.5v-4A3.5 3.5 0 0 1 20.5 8H21"/>
            </svg>
          </div>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px", fontWeight: "500", margin: 0 }}>
            {search ? "No locations match your search." : "No route data found for this period."}
          </p>
        </div>
      )}

      {/* ── Routes View ── */}
      {viewMode === "routes" && displayed.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {displayed.map((route, idx) => {
            const color      = ACCENT_COLORS[idx % ACCENT_COLORS.length];
            const isExpanded = expanded === route.key;
            const revPct     = Math.min(Math.round((route.revenue / maxRevenue) * 100), 100);

            return (
              <div
                key={route.key}
                className={`route-card${isExpanded ? " expanded" : ""}`}
                style={{
                  borderRadius: "14px", overflow: "hidden",
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderLeft: `3px solid ${color}`,
                  transition: "background 0.2s ease",
                }}
              >
                <div
                  className="route-card-row"
                  style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: "14px" }}
                  onClick={() => setExpanded(isExpanded ? null : route.key)}
                  onMouseEnter={e => e.currentTarget.parentElement.style.background = "rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.parentElement.style.background = "rgba(255,255,255,0.025)"}
                >
                  {/* Rank */}
                  <div className="route-rank" style={{
                    width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                    background: `${color}18`, border: `1px solid ${color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: "800", color,
                  }}>{idx + 1}</div>

                  {/* Route + bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                      <span className="route-pickup" style={{ color: "#fff", fontWeight: "700", fontSize: "13px" }}>{route.pickup}</span>
                      <span style={{ color, fontWeight: "900", fontSize: "13px", display: "flex", alignItems: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </span>
                      <span className="route-dropoff" style={{ color: "#fff", fontWeight: "700", fontSize: "13px" }}>{route.dropoff}</span>
                    </div>
                    <div style={{ height: "4px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${revPct}%`, background: color, borderRadius: "3px", boxShadow: `0 0 8px ${color}55`, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="route-metrics" style={{ display: "flex", gap: "20px", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, color, fontWeight: "800", fontSize: "14px" }}>{fmt(route.revenue)}</p>
                      <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em" }}>REVENUE</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, color: "#fff", fontWeight: "700", fontSize: "14px" }}>{route.bookings}</p>
                      <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em" }}>TRIPS</p>
                    </div>
                    <span style={{
                      color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>
                </div>

                {/* Expanded — always mounted, animated via measured max-height
                    (same pattern as CarAnalytics) instead of instant mount/unmount. */}
                <div
                  ref={(el) => { if (el) detailRefs.current[route.key] = el; }}
                  className="route-details"
                  style={{
                    maxHeight: isExpanded ? `${detailRefs.current[route.key]?.scrollHeight ?? 1000}px` : "0px",
                    opacity: isExpanded ? 1 : 0,
                  }}
                  aria-hidden={!isExpanded}
                >
                  <div className="route-details-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", paddingTop: "14px" }}>
                    {[
                      ["Total Revenue",     fmt(route.revenue),              color    ],
                      ["Total Bookings",    route.bookings,                  "#fff"   ],
                      ["Avg Booking Value", fmt(route.avgValue),             "#22c55e"],
                      ["Avg Trip Duration", `${route.avgDays.toFixed(1)}d`,  "#4ce3f7"],
                      ["Most Popular Car",  route.topCar,                    "#a855f7"],
                      ["Revenue Share",     `${revPct}%`,                    color    ],
                    ].map(([label, value, c]) => (
                      <div className="route-detail-item" key={label} style={{
                        padding: "10px 12px", borderRadius: "10px",
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.3)", fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                        <p style={{ margin: 0, color: c, fontWeight: "800", fontSize: "13px" }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pickup / Dropoff Hubs View ── */}
      {(viewMode === "pickups" || viewMode === "dropoffs") && displayed.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {displayed.map((hub, idx) => {
            const color  = ACCENT_COLORS[idx % ACCENT_COLORS.length];
            const revPct = Math.min(Math.round((hub.revenue / maxRevenue) * 100), 100);
            const subLabel = viewMode === "pickups"
              ? `Top destination: ${hub.topDestination}`
              : `Top origin: ${hub.topOrigin}`;
            const HubIcon = viewMode === "pickups"
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>;

            return (
              <div key={hub.location} className="hub-card" style={{
                padding: "14px 18px", borderRadius: "14px",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderLeft: `3px solid ${color}`,
                display: "flex", alignItems: "center", gap: "14px",
                transition: "background 0.2s ease",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
              >
                <div className="hub-rank" style={{
                  width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                  background: `${color}18`, border: `1px solid ${color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: "800", color,
                }}>{idx + 1}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <span style={{ color, display: "flex", alignItems: "center" }}>{HubIcon}</span>
                    <p className="hub-name" style={{ margin: 0, color: "#fff", fontWeight: "700", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {hub.location}
                    </p>
                  </div>
                  <p className="hub-sub" style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.35)", fontSize: "10px", fontWeight: "500" }}>{subLabel}</p>
                  <div style={{ height: "4px", borderRadius: "3px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${revPct}%`, background: color, borderRadius: "3px", boxShadow: `0 0 6px ${color}55` }} />
                  </div>
                </div>

                <div className="hub-metrics" style={{ display: "flex", gap: "20px", flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, color, fontWeight: "800", fontSize: "14px" }}>{fmt(hub.revenue)}</p>
                    <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em" }}>REVENUE</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, color: "#fff", fontWeight: "700", fontSize: "14px" }}>{hub.bookings}</p>
                    <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em" }}>TRIPS</p>
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