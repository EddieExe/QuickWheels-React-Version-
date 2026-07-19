// src/components/admin/RetentionAnalytics.jsx
import { useMemo, useState } from "react";
import { useDateRange } from "../../context/DateRangeContext";
import {
  buildUserActivity,
  buildCohortRetention,
  calculateRepeatStats,
  getTopRepeatCustomers,
} from "../../utils/retentionUtils";

function fmt(n, prefix = "₹") {
  if (n >= 100000) return `${prefix}${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${Math.round(n)}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ svg, label, value, sub, color }) {
  return (
    <div className="overview-stat-card" style={{
      background: "rgba(255,255,255,0.03)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "14px",
      padding: "18px",
      textAlign: "center",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
      cursor: "default",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = "rgba(168,85,247,0.3)";
      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.25), 0 0 20px rgba(168,85,247,0.05)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.15)";
    }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
        {svg}
      </div>
      <p style={{ margin: 0, color, fontSize: "1.5rem", fontWeight: "800", letterSpacing: "-0.5px" }}>{value}</p>
      {sub && <p style={{ margin: "2px 0 4px", color, fontSize: "10.5px", fontWeight: "600", opacity: 0.7 }}>{sub}</p>}
      <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "500" }}>{label}</p>
    </div>
  );
}

function SectionTitle({ svg, children }) {
  return (
    <h3 style={{
      margin: "0 0 16px", color: "#fff", fontSize: "13px",
      fontWeight: "800", letterSpacing: "0.06em", textTransform: "uppercase",
      display: "flex", alignItems: "center", gap: "8px",
    }}>
      {svg}
      <span>{children}</span>
    </h3>
  );
}

function retentionColor(pct) {
  if (pct === null) return "transparent";
  if (pct >= 50) return "#22c55e";
  if (pct >= 25) return "#f59e0b";
  if (pct === 0) return "rgba(255,255,255,0.03)";
  return "#ef4444";
}

function retentionTextColor(pct) {
  if (pct === null) return "rgba(255,255,255,0.15)";
  if (pct >= 50) return "#22c55e";
  if (pct >= 25) return "#f59e0b";
  if (pct === 0) return "rgba(255,255,255,0.25)";
  return "#ef4444";
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RetentionAnalytics({ bookings = [] }) {
  const { startDate, endDate } = useDateRange();
  const [activeTab, setActiveTab] = useState("overview");

  const users = useMemo(() => buildUserActivity(bookings), [bookings]);
  const repeatStats = useMemo(() => calculateRepeatStats(users), [users]);
  const topRepeat = useMemo(() => getTopRepeatCustomers(users, 10), [users]);

  const cohortRows = useMemo(
    () => buildCohortRetention(users, 6, [startDate, endDate]),
    [users, startDate, endDate]
  );

  const TABS = ["overview", "cohorts", "repeat customers"];

  return (
    <div style={{ fontFamily: "Quicksand, sans-serif", maxWidth: "100%", overflowX: "hidden" }}>
      <style>{`
        .cohort-cell {
          transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
        }
        .cohort-cell:not(.empty):hover {
          filter: brightness(1.25);
          transform: scale(1.02);
          box-shadow: 0 0 8px var(--cell-glow);
          z-index: 2;
        }

        .overview-tabs::-webkit-scrollbar { display: none; }

        /* ── MOBILE: stat grid wraps into 2-3 per row instead of overflowing ── */
        @media (max-width: 768px) {
          .retention-stat-grid {
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 16px !important;
          }
          .retention-stat-grid .overview-stat-card {
            padding: 12px 10px !important;
            border-radius: 12px !important;
          }
          .retention-stat-grid .overview-stat-card p:nth-child(2) {
            font-size: 1.15rem !important;
          }

          /* ── Tabs become a swipeable strip instead of overflowing the page ── */
          .overview-tabs {
            overflow-x: auto !important;
            overflow-y: hidden !important;
            flex-wrap: nowrap !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            padding-bottom: 2px !important;
          }
          .overview-tabs button {
            flex: 0 0 auto !important;
            padding: 9px 12px !important;
            font-size: 10.5px !important;
            white-space: nowrap !important;
          }

          .overview-cohort-grid { min-width: 560px !important; }
        }

        @media (max-width: 480px) {
          .retention-stat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .retention-stat-grid .overview-stat-card p:nth-child(2) {
            font-size: 1.05rem !important;
          }
          .overview-tabs button {
            padding: 8px 10px !important;
            font-size: 10px !important;
          }
        }
      `}</style>

      {/* ── Summary Cards ── */}
      <div className="retention-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "24px" }}>
        <StatCard 
          svg={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>} 
          label="Total Customers" 
          value={repeatStats.totalCustomers} 
          color="#a855f7" 
        />
        <StatCard 
          svg={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>} 
          label="Repeat Customers" 
          value={repeatStats.repeatCustomers} 
          color="#7c3aed" 
        />
        <StatCard
          svg={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={parseFloat(repeatStats.repeatRate) >= 30 ? "#22c55e" : "#f59e0b"} strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>}
          label="Repeat Rate"
          value={`${repeatStats.repeatRate}%`}
          color={parseFloat(repeatStats.repeatRate) >= 30 ? "#22c55e" : parseFloat(repeatStats.repeatRate) >= 15 ? "#f59e0b" : "#ef4444"}
        />
        <StatCard 
          svg={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>} 
          label="Avg Bookings / Cust" 
          value={repeatStats.avgBookingsPerCustomer} 
          color="#a855f7" 
        />
        <StatCard 
          svg={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} 
          label="Avg Interval Between" 
          value={`${repeatStats.avgDaysBetweenBookings}d`} 
          color="#f59e0b" 
        />
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="overview-tabs" style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "10px 16px", border: "none", cursor: "pointer",
              fontFamily: "Quicksand, sans-serif", fontSize: "11.5px", fontWeight: "700",
              textTransform: "uppercase", background: "transparent", letterSpacing: "0.5px",
              color: isActive ? "#a855f7" : "rgba(255,255,255,0.35)",
              borderBottom: isActive ? "2px solid #a855f7" : "2px solid transparent",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                e.currentTarget.style.background = "rgba(168,85,247,0.04)";
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.color = "rgba(255,255,255,0.35)";
                e.currentTarget.style.background = "transparent";
              }
            }}
            >{tab}</button>
          );
        })}
      </div>

      {/* ── Overview Panel ── */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Progress gauge metrics */}
          <div style={{ 
            padding: "20px", 
            borderRadius: "14px", 
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.06)",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
          }}
          >
            <SectionTitle svg={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}>
              Repeat Interaction Spectrum
            </SectionTitle>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                {repeatStats.repeatCustomers} of {repeatStats.totalCustomers} verified accounts initiated multicycle conversions
              </span>
              <span style={{ color: parseFloat(repeatStats.repeatRate) >= 30 ? "#22c55e" : "#f59e0b", fontWeight: "800", fontSize: "14px" }}>
                {repeatStats.repeatRate}%
              </span>
            </div>
            <div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "4px",
                width: `${Math.min(100, parseFloat(repeatStats.repeatRate) * 2.5)}%`,
                background: parseFloat(repeatStats.repeatRate) >= 30 ? "#22c55e" : parseFloat(repeatStats.repeatRate) >= 15 ? "#f59e0b" : "#ef4444",
                transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
              }} />
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "10px", flexWrap: "wrap" }}>
              {[["< 15%", "Deficit Threshold", "#ef4444"], ["15–30%", "Baseline Target", "#f59e0b"], ["> 30%", "Velocity Optimization", "#22c55e"]].map(([range, label, color]) => (
                <span key={range} style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>
                  <span style={{ color, fontWeight: "700" }}>{range}</span> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Top Repeat Grid Context */}
          <div style={{ 
            padding: "16px", 
            borderRadius: "14px", 
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.06)",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)";
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            e.currentTarget.style.background = "rgba(255,255,255,0.02)";
          }}
          >
            <SectionTitle svg={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>}>
              Highest Velocity Retention Channels
            </SectionTitle>
            {topRepeat.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", margin: 0 }}>
                No repeating parameters registered inside global arrays.
              </p>
            ) : (
              topRepeat.slice(0, 5).map((u, i) => (
                <div key={u.email} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", gap: "10px" }}>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                    <span style={{ color: "#a855f7", fontWeight: "800", marginRight: "8px" }}>{i + 1}</span>
                    {u.name}
                  </span>
                  <span style={{ color: "#a855f7", fontWeight: "700", fontSize: "12.5px", flexShrink: 0 }}>
                    {u.totalBookings}x cycles · {fmt(u.totalRevenue)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* System info log block */}
          <div style={{ 
            padding: "12px 18px", 
            background: "rgba(168,85,247,0.04)", 
            border: "1px solid rgba(168,85,247,0.1)", 
            borderRadius: "12px",
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)";
            e.currentTarget.style.background = "rgba(168,85,247,0.06)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "rgba(168,85,247,0.1)";
            e.currentTarget.style.background = "rgba(168,85,247,0.04)";
          }}
          >
            <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "12px", lineHeight: "1.6" }}>
              ⚡ Metric matrices and conversion nodes above reflect your <strong style={{ color: "#a855f7", fontWeight: "600" }}>entire pipeline logging history</strong> instead of isolated sub-ranges. This guarantees cross-window user returns are properly credited back to origin channels.
            </p>
          </div>
        </div>
      )}

      {/* ── Cohort Retention Heatmap ── */}
      {activeTab === "cohorts" && (
        <div>
          {cohortRows.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: "12px" }}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
                No cluster data points initialized inside active frame parameters.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div className="overview-cohort-grid" style={{ 
                minWidth: "640px", 
                padding: "4px",
                background: "rgba(255,255,255,0.01)",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.04)",
              }}>
                {/* Grid Header */}
                <div style={{ display: "grid", gridTemplateColumns: "140px 70px repeat(7, 1fr)", gap: "6px", marginBottom: "10px", padding: "8px 4px" }}>
                  <span style={{ color: "rgba(168,85,247,0.5)", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>Origin Window</span>
                  <span style={{ color: "rgba(168,85,247,0.5)", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>Volume</span>
                  {[0,1,2,3,4,5,6].map(m => (
                    <span key={m} style={{ color: "rgba(168,85,247,0.5)", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>
                      M{m}
                    </span>
                  ))}
                </div>

                {/* Grid Rows */}
                {cohortRows.map(row => (
                  <div key={row.cohort} style={{ display: "grid", gridTemplateColumns: "140px 70px repeat(7, 1fr)", gap: "6px", marginBottom: "6px", alignItems: "center", padding: "4px", borderRadius: "8px", transition: "background 0.2s ease" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(168,85,247,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ color: "#fff", fontSize: "12.5px", fontWeight: "700" }}>{row.label}</span>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", textAlign: "center", fontWeight: "600", fontFamily: "monospace" }}>{row.size}</span>
                    {row.retention.map(cell => {
                      const isBgEmpty = cell.pct === null;
                      const cColor = retentionColor(cell.pct);
                      return (
                        <div 
                          key={cell.month} 
                          className={`cohort-cell ${isBgEmpty ? 'empty' : ''}`}
                          style={{
                            height: "34px", borderRadius: "6px",
                            background: isBgEmpty ? "transparent" : cell.pct === 0 ? cColor : `${cColor}18`,
                            border: isBgEmpty ? "1px dashed rgba(255,255,255,0.05)" : `1px solid ${cColor}35`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            position: "relative",
                            "--cell-glow": cColor
                          }}
                        >
                          <span style={{ fontSize: "11px", fontWeight: "800", color: retentionTextColor(cell.pct) }}>
                            {cell.pct === null ? "—" : `${cell.pct}%`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Color mapping legend context */}
          <div style={{ display: "flex", gap: "16px", marginTop: "18px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "14px" }}>
            {[["≥ 50%", "Stable Cluster", "#22c55e"], ["25–49%", "Intermediate Shift", "#f59e0b"], ["1–24%", "Degradation Risk", "#ef4444"], ["—", "Awaiting Runtime Expiry", "rgba(255,255,255,0.25)"]].map(([range, label, color]) => (
              <span key={range} style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: color === 'rgba(255,255,255,0.25)' ? 'transparent' : color, border: color === 'rgba(255,255,255,0.25)' ? '1px dashed rgba(255,255,255,0.25)' : 'none' }} />
                <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: "700" }}>{range}</span> {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Repeat Customers Track ── */}
      {activeTab === "repeat customers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {topRepeat.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px" }}>No cross-window user patterns matching requirements.</p>
          ) : (
            topRepeat.map(u => {
              const isVip = u.totalBookings >= 5;
              return (
                <div key={u.email} style={{
                  padding: "14px 18px", 
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", 
                  alignItems: "center", 
                  gap: "14px",
                  flexWrap: "wrap",
                  borderLeft: `3px solid ${isVip ? "#22c55e" : u.totalBookings >= 3 ? "#a855f7" : "rgba(168,85,247,0.2)"}`,
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = "rgba(168,85,247,0.15)";
                  e.currentTarget.style.transform = "translateX(2px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
                >
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
                    background: isVip ? "rgba(34,197,94,0.12)" : "rgba(168,85,247,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isVip ? "#22c55e" : "#a855f7",
                    fontWeight: "800", fontSize: "14px",
                  }}>
                    {u.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: "140px" }}>
                    <p style={{ margin: 0, color: "#fff", fontWeight: "700", fontSize: "13px" }}>{u.name}</p>
                    <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.35)", fontSize: "11px", fontFamily: "monospace", wordBreak: "break-all" }}>{u.email}</p>
                    <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.3)", fontSize: "10.5px" }}>
                      Origin: {u.firstBookingDate.toLocaleDateString("en-IN")} · Terminus: {u.lastBookingDate.toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, color: isVip ? "#22c55e" : "#a855f7", fontWeight: "800", fontSize: "15px" }}>
                      {u.totalBookings}x
                    </p>
                    <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>
                      {fmt(u.totalRevenue)} LTV
                    </p>
                  </div>
                  {isVip && (
                    <span style={{
                      padding: "3px 10px", borderRadius: "20px", fontSize: "9.5px", fontWeight: "800",
                      background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                      color: "#22c55e", flexShrink: 0, letterSpacing: "0.5px"
                    }}>VIP Node</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}