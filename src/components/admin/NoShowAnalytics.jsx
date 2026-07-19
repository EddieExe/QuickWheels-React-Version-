// src/components/admin/NoShowAnalytics.jsx
import { useState, useMemo } from "react";
import { useDateRange } from "../../context/DateRangeContext";

function fmt(n, prefix = "₹") {
  if (n >= 100000) return `${prefix}${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${Math.round(n)}`;
}

function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  return new Date(val);
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

function Table({ headers, rows, emptyMsg = "No data" }) {
  if (rows.length === 0) {
    return (
      <div style={{
        padding: "32px", textAlign: "center",
        border: "1px dashed rgba(255,255,255,0.07)", borderRadius: "12px",
      }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div className="ns-table-scroll" style={{ overflowX: "auto" }}>
      <div className="ns-table" style={{
        borderRadius: "12px", overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.02)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        minWidth: "420px",
      }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${headers.length}, 1fr)`,
          background: "rgba(168,85,247,0.06)",
          padding: "12px 18px",
        }}>
          {headers.map(h => (
            <span key={h} style={{
              color: "rgba(168,85,247,0.7)",
              fontSize: "10px",
              fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase",
            }}>{h}</span>
          ))}
        </div>
        {/* Rows */}
        {rows.map((row, i) => (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: `repeat(${headers.length}, 1fr)`,
            padding: "12px 18px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(168,85,247,0.04)";
              e.currentTarget.style.transform = "translateX(2px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)";
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            {row.map((cell, j) => (
              <span key={j} style={{
                color: j === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
                fontSize: "12.5px", fontWeight: j === 0 ? "600" : "500",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{cell}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function NoShowAnalytics({ bookings = [] }) {
  const { filterByRange } = useDateRange();
  const [activeTab, setActiveTab] = useState("overview");

  // Filter to range
  const rangeBookings = useMemo(
    () => filterByRange(bookings, "createdAt"),
    [bookings, filterByRange]
  );

  const noShows = useMemo(
    () => rangeBookings.filter(b => b.status === "no_show"),
    [rangeBookings]
  );

  // ── Summary metrics ───────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total          = rangeBookings.length;
    const noShowCount    = noShows.length;
    const noShowRate     = total > 0 ? ((noShowCount / total) * 100).toFixed(1) : "0.0";
    const lostRevenue    = noShows.reduce((s, b) => s + (b.total || 0), 0);
    const avgLostPerNS   = noShowCount > 0 ? lostRevenue / noShowCount : 0;

    // Trend calculation
    const sorted      = [...noShows].sort((a, b) => toDate(a.createdAt) - toDate(b.createdAt));
    const mid         = Math.floor(sorted.length / 2);
    const firstHalf   = sorted.slice(0, mid).length;
    const secondHalf  = sorted.slice(mid).length;
    const trend       = firstHalf === 0 ? 0 : Math.round(((secondHalf - firstHalf) / firstHalf) * 100);

    return { total, noShowCount, noShowRate, lostRevenue, avgLostPerNS, trend };
  }, [noShows, rangeBookings]);

  // Data processing matrices
  const byCar = useMemo(() => {
    const map = {};
    noShows.forEach(b => {
      const key = b.carModel || "Unknown";
      if (!map[key]) map[key] = { model: key, count: 0, lost: 0 };
      map[key].count++;
      map[key].lost += b.total || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [noShows]);

  const byUser = useMemo(() => {
    const map = {};
    noShows.forEach(b => {
      const key = b.userEmail || "Unknown";
      if (!map[key]) map[key] = { email: key, name: b.userName || b.userEmail || "—", count: 0, lost: 0 };
      map[key].count++;
      map[key].lost += b.total || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [noShows]);

  const byDealer = useMemo(() => {
    const map = {};
    noShows.forEach(b => {
      const key = b.dealerId || "Unknown";
      if (!map[key]) map[key] = { id: key, name: b.dealerBusinessName || b.dealerId || "Unknown Dealer", count: 0, lost: 0 };
      map[key].count++;
      map[key].lost += b.total || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [noShows]);

  const byDow = useMemo(() => {
    const days  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const count = Array(7).fill(0);
    noShows.forEach(b => {
      const d = toDate(b.pickupDate || b.createdAt);
      if (d) count[d.getDay()]++;
    });
    return days.map((day, i) => ({ day, count: count[i] }));
  }, [noShows]);

  const maxDow = Math.max(...byDow.map(d => d.count), 1);

  const recentNoShows = useMemo(() =>
    [...noShows].sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt)).slice(0, 10),
    [noShows]
  );

  const TABS = ["overview", "by car", "by user", "by dealer", "recent"];

  return (
    <div style={{ fontFamily: "Quicksand, sans-serif", maxWidth: "100%", overflowX: "hidden" }}>
      <style>{`
        .chart-bar-fill {
          animation: barGrow 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: bottom;
        }
        @keyframes barGrow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .bar-container:hover .bar-visual-element {
          filter: brightness(1.2);
          box-shadow: 0 0 12px var(--bar-glow);
        }

        .overview-tabs::-webkit-scrollbar { display: none; }
        .ns-table-scroll::-webkit-scrollbar { height: 4px; }
        .ns-table-scroll::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.2); border-radius: 10px; }

        /* ── MOBILE: stat grid wraps into 2-3 per row instead of overflowing ── */
        @media (max-width: 768px) {
          .overview-stat-grid {
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 16px !important;
          }
          .overview-stat-grid .overview-stat-card {
            padding: 12px 10px !important;
            border-radius: 12px !important;
          }
          .overview-stat-grid .overview-stat-card p:nth-child(2) {
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

          /* ── Side-by-side breakdowns stack on mobile ── */
          .overview-side-by-side {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          .overview-dow-chart {
            gap: 6px !important;
          }
          .overview-dow-chart span {
            font-size: 9px !important;
          }
        }

        @media (max-width: 480px) {
          .overview-stat-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .overview-stat-grid .overview-stat-card p:nth-child(2) {
            font-size: 1.05rem !important;
          }
          .overview-tabs button {
            padding: 8px 10px !important;
            font-size: 10px !important;
          }
        }
      `}</style>

      {/* ── Summary Cards ── */}
      <div className="overview-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "24px" }}>
        <StatCard 
          svg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>} 
          label="No-Shows" 
          value={summary.noShowCount} 
          color="#ef4444" 
        />
        <StatCard 
          svg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={parseFloat(summary.noShowRate) > 10 ? "#ef4444" : "#a855f7"} strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>} 
          label="No-Show Rate" 
          value={`${summary.noShowRate}%`} 
          color={parseFloat(summary.noShowRate) > 10 ? "#ef4444" : parseFloat(summary.noShowRate) > 5 ? "#f59e0b" : "#22c55e"} 
          sub="of all bookings" 
        />
        <StatCard 
          svg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>} 
          label="Lost Revenue" 
          value={fmt(summary.lostRevenue)} 
          color="#ef4444" 
        />
        <StatCard 
          svg={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>} 
          label="Avg Loss / NS" 
          value={fmt(summary.avgLostPerNS)} 
          color="#f59e0b" 
        />
        <StatCard
          svg={
            summary.trend > 0 ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            ) : summary.trend < 0 ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            )
          }
          label="Trend (vs prior period)"
          value={summary.trend === 0 ? "Stable" : `${summary.trend > 0 ? "+" : ""}${summary.trend}%`}
          color={summary.trend > 10 ? "#ef4444" : summary.trend > 0 ? "#f59e0b" : "#22c55e"}
        />
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="overview-tabs" style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "10px 16px", border: "none", cursor: "pointer",
              fontFamily: "Quicksand, sans-serif", fontSize: "12px", fontWeight: "700",
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

          {/* No-show rate gauge */}
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
            <SectionTitle svg={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>}>
              No-Show Rate Conversion
            </SectionTitle>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                    {summary.noShowCount} failures out of {summary.total} array requests
                  </span>
                  <span style={{ color: parseFloat(summary.noShowRate) > 10 ? "#ef4444" : "#22c55e", fontWeight: "800", fontSize: "14px" }}>
                    {summary.noShowRate}%
                  </span>
                </div>
                <div style={{ height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: "4px",
                    width: `${Math.min(100, parseFloat(summary.noShowRate) * 5)}%`,
                    background: parseFloat(summary.noShowRate) > 10 ? "#ef4444" : parseFloat(summary.noShowRate) > 5 ? "#f59e0b" : "#22c55e",
                    transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC Day of week heatmap */}
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
            <SectionTitle svg={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>}>
              No-Shows Matrix By Day of Week
            </SectionTitle>
            <div className="overview-dow-chart" style={{ display: "flex", gap: "12px", alignItems: "flex-end", height: "100px", padding: "10px 4px 0" }}>
              {byDow.map(({ day, count }) => {
                const pct = (count / maxDow) * 100;
                const activeColor = count === 0 ? "rgba(255,255,255,0.04)" : count >= maxDow * 0.7 ? "#ef4444" : count >= maxDow * 0.4 ? "#f59e0b" : "#a855f7";
                return (
                  <div 
                    key={day} 
                    className="bar-container" 
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer", "--bar-glow": activeColor }}
                  >
                    <span style={{ color: count > 0 ? activeColor : "rgba(255,255,255,0.15)", fontSize: "11px", fontWeight: "700", transition: "color 0.2s ease" }}>
                      {count}
                    </span>
                    <div style={{ width: "100%", height: "60px", display: "flex", alignItems: "flex-end", background: "rgba(255,255,255,0.015)", borderRadius: "6px" }}>
                      <div 
                        className="chart-bar-fill bar-visual-element" 
                        style={{
                          width: "100%", borderRadius: "4px 4px 2px 2px",
                          height: `${Math.max(8, pct)}%`,
                          background: activeColor,
                          transition: "filter 0.2s ease, box-shadow 0.2s ease",
                        }} 
                      />
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>{day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side by side breakdowns */}
          <div className="overview-side-by-side" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
              <SectionTitle svg={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><rect x="1" y="3" width="22" height="13" rx="2" ry="2"></rect><path d="M7 21h10"></path><path d="M12 16v5"></path></svg>}>
                Top Channels with Failures
              </SectionTitle>
              {byCar.slice(0, 5).length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", margin: 0 }}>No failure paths matching target spectrum</p>
              ) : (
                byCar.slice(0, 5).map((c, i) => (
                  <div key={c.model} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", gap: "10px" }}>
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ color: "#ef4444", fontWeight: "800", marginRight: "8px" }}>{i + 1}</span>
                      {c.model}
                    </span>
                    <span style={{ color: "#ef4444", fontWeight: "700", fontSize: "12.5px", flexShrink: 0 }}>{c.count}x · {fmt(c.lost)}</span>
                  </div>
                ))
              )}
            </div>

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
              <SectionTitle svg={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}>
                High Frequency Drop Profiles
              </SectionTitle>
              {byUser.filter(u => u.count > 1).slice(0, 5).length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", margin: 0 }}>All pipelines operating within expected margins</p>
              ) : (
                byUser.filter(u => u.count > 1).slice(0, 5).map((u, i) => (
                  <div key={u.email} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", gap: "10px" }}>
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                      <span style={{ color: "#f59e0b", fontWeight: "800", marginRight: "8px" }}>{i + 1}</span>
                      {u.name}
                    </span>
                    <span style={{ color: "#f59e0b", fontWeight: "700", fontSize: "12.5px", flexShrink: 0 }}>{u.count}x drops</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Views (Nested Data Arrays) ── */}
      {activeTab === "by car" && (
        <Table
          headers={["Asset Class", "No-Shows", "Lost Vector", "Avg Deficit"]}
          rows={byCar.map(c => [c.model, c.count, fmt(c.lost), fmt(c.count > 0 ? c.lost / c.count : 0)])}
          emptyMsg="No active data failures logged."
        />
      )}

      {activeTab === "by user" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {byUser.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px" }}>No profile mismatch parameters detected.</p>
          ) : (
            byUser.map(u => (
              <div key={u.email} style={{
                padding: "14px 18px", borderRadius: "12px",
                background: "rgba(255,255,255,0.02)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", gap: "14px",
                flexWrap: "wrap",
                borderLeft: `3px solid ${u.count >= 3 ? "#ef4444" : u.count >= 2 ? "#f59e0b" : "rgba(168,85,247,0.3)"}`,
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
                  background: u.count >= 3 ? "rgba(239,68,68,0.12)" : "rgba(168,85,247,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: u.count >= 3 ? "#ef4444" : "#a855f7",
                  fontWeight: "800", fontSize: "14px",
                }}>
                  {u.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div style={{ flex: 1, minWidth: "140px" }}>
                  <p style={{ margin: 0, color: "#fff", fontWeight: "700", fontSize: "13px" }}>{u.name}</p>
                  <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.35)", fontSize: "11px", fontFamily: "monospace", wordBreak: "break-all" }}>{u.email}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, color: u.count >= 3 ? "#ef4444" : "#f59e0b", fontWeight: "800", fontSize: "15px" }}>{u.count}x</p>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>{fmt(u.lost)} lost</p>
                </div>
                {u.count >= 3 && (
                  <span style={{
                    padding: "3px 10px", borderRadius: "20px", fontSize: "9.5px", fontWeight: "800",
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444"
                  }}>CRITICAL TRACK</span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "by dealer" && (
        <Table
          headers={["Merchant Entity", "No-Shows", "Lost Revenue", "Avg Damage"]}
          rows={byDealer.map(d => [d.name, d.count, fmt(d.lost), fmt(d.count > 0 ? d.lost / d.count : 0)])}
          emptyMsg="All provider terminals operating safely."
        />
      )}

      {activeTab === "recent" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {recentNoShows.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px" }}>No recent transaction faults logged.</p>
          ) : (
            recentNoShows.map(b => (
              <div key={b.id} style={{
                padding: "14px 18px", borderRadius: "12px",
                background: "rgba(239,68,68,0.02)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(239,68,68,0.1)",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px",
                flexWrap: "wrap",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(239,68,68,0.06)";
                e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
                e.currentTarget.style.transform = "translateX(2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(239,68,68,0.02)";
                e.currentTarget.style.borderColor = "rgba(239,68,68,0.1)";
                e.currentTarget.style.transform = "translateX(0)";
              }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, color: "#fff", fontWeight: "700", fontSize: "13px" }}>
                      {b.carModel}
                      <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: "400", fontSize: "11px", marginLeft: "8px", fontFamily: "monospace" }}>#{b.bookingId}</span>
                    </p>
                    <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>
                      {b.userName || b.userEmail} · {b.pickupDate || "—"}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ margin: 0, color: "#ef4444", fontWeight: "800", fontSize: "14px" }}>{fmt(b.total || 0)}</p>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                    {toDate(b.createdAt)?.toLocaleDateString("en-IN") ?? "—"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}