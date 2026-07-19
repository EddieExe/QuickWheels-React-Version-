// src/components/admin/DemandAnalytics.jsx
import { useState, useMemo } from "react";
import {
  calculatePeakSeasonAnalysis,
  calculatePickupDayFrequency,
  calculateBookingCreationHeatmap,
  forecastUpcomingDemand,
  generatePricingSuggestions,
} from "../../utils/demandAnalyticsUtils";

function StatTile({ icon, label, value, sub, color }) {
  return (
    <div className="da-stat-tile" style={{
      background: "rgba(255,255,255,0.03)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "10px",
      padding: "14px 14px",
      transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
      cursor: "pointer",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
      e.currentTarget.style.borderColor = "rgba(168,85,247,0.3)";
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2), 0 0 20px rgba(168,85,247,0.03)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
    }}
    >
      <div style={{ color, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"8px" }}>{icon}</div>
      <p style={{ margin:0, color, fontSize:"1.2rem", fontWeight:"800", letterSpacing:"-0.2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", width:"100%" }}>{value}</p>
      {sub && <p style={{ margin:"3px 0 0", color, fontSize:"12px", fontWeight:"600", opacity:0.65, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", width:"100%" }}>{sub}</p>}
      <p style={{ margin:"4px 0 0", color:"rgba(255,255,255,0.36)", fontSize:"10px", fontWeight:"600", width:"100%" }}>{label}</p>
    </div>
  );
}

function SectionTitle({ children, color = "#fff" }) {
  return (
    <h3 style={{
      margin:"0 0 14px", color, fontSize:"13px", fontWeight:"800",
      letterSpacing:"0.05em", textTransform:"uppercase",
      display:"flex", alignItems:"center", gap:"8px",
      opacity:0.9,
    }}>
      {children}
    </h3>
  );
}

const HOUR_LABEL = (h) => h === 0 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`;

export default function DemandAnalytics({ bookings = [], cars = [] }) {
  const [activeTab, setActiveTab] = useState("peak season");

  const peak = useMemo(() => calculatePeakSeasonAnalysis(bookings), [bookings]);
  const dayFreq = useMemo(() => calculatePickupDayFrequency(bookings), [bookings]);
  const heatmap = useMemo(() => calculateBookingCreationHeatmap(bookings), [bookings]);
  const forecastData = useMemo(() => forecastUpcomingDemand(bookings, 8), [bookings]);
  const pricing = useMemo(
    () => generatePricingSuggestions(forecastData.forecast, forecastData.stdDev, cars, bookings),
    [forecastData, cars, bookings]
  );

  const TABS = ["peak season", "demand patterns", "forecast & pricing"];

  return (
    <div style={{ fontFamily: "Quicksand,sans-serif" }}>
      <style>{`
  @keyframes countUp {
    from { opacity:0; transform:translateY(5px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes barRise {
    from { transform: scaleY(0); transform-origin: bottom; }
    to   { transform: scaleY(1); transform-origin: bottom; }
  }
  @keyframes heatFade {
    from { opacity:0; }
    to   { opacity:1; }
  }
  .da-bar {
    animation: barRise 1.1s cubic-bezier(0.16,1,0.3,1) both;
    transition: filter 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
  }
  .da-bar:hover {
    filter: brightness(1.25);
  }
  .da-heat-cell {
    animation: heatFade 0.9s ease both;
    transition: transform 0.15s ease, outline 0.15s ease;
    cursor: pointer;
  }
  .da-heat-cell:hover {
    transform: scale(1.15);
    outline: 1px solid rgba(168,85,247,0.3);
    position: relative;
    z-index: 2;
  }
  
  /* Glass morphism insight rows */
  .da-insight-row {
    display:flex; justify-content:space-between; align-items:center;
    padding:10px 14px; border-radius:10px;
    background:rgba(255,255,255,0.02) !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    border:1px solid rgba(255,255,255,0.06) !important;
    transition:all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
  }
  .da-insight-row:hover {
    background:rgba(255,255,255,0.04) !important;
    border-color:rgba(168,85,247,0.2) !important;
    transform:translateX(4px) !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
  }
  
  /* Glass morphism pricing rows */
  .da-pricing-row {
    display:flex; justify-content:space-between; align-items:center;
    padding:10px 14px; border-radius:10px;
    background:rgba(255,255,255,0.02) !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    border:1px solid rgba(255,255,255,0.06) !important;
    transition:all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
    flex-wrap:wrap; gap:8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
  }
  .da-pricing-row:hover {
    background:rgba(255,255,255,0.04) !important;
    border-color:rgba(168,85,247,0.2) !important;
    transform:translateX(4px) !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
  }
  
  /* Glass morphism section boxes */
  .da-section-box {
    padding:18px; border-radius:14px;
    background:rgba(255,255,255,0.01) !important;
    border:1px solid rgba(255,255,255,0.06) !important;
    backdrop-filter: blur(4px) !important;
    -webkit-backdrop-filter: blur(4px) !important;
    transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important;
  }
  .da-section-box:hover {
    border-color: rgba(168,85,247,0.15) !important;
  }
  
  .da-2col {
    display: grid;
    grid-template-columns: 20% 80%;
    gap: 16px;
  }
  .da-stat-col {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .da-stat-tile {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 14px 14px;
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    cursor: default;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  }
  .da-stat-tile:hover {
    background: rgba(255,255,255,0.045);
    border-color: rgba(255,255,255,0.12);
    transform: translateX(2px);
  }

  /* Mobile responsive */
  @media (max-width: 1024px) {
    .da-2col {
      grid-template-columns: 1fr !important;
      gap: 14px !important;
    }
    .da-stat-col {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)) !important;
      gap: 8px !important;
    }
    .da-stat-tile {
      padding: 12px !important;
    }
    .da-stat-tile p:first-of-type {
      font-size: 1rem !important;
    }
  }

  @media (max-width: 768px) {
    .da-section-box {
      padding: 14px !important;
      overflow-x: auto !important;
    }
    .da-stat-tile {
      padding: 10px !important;
    }
    .da-stat-tile p:first-of-type {
      font-size: 0.9rem !important;
    }
    .da-stat-tile p:last-of-type {
      font-size: 8px !important;
    }
    .da-2col {
      gap: 12px !important;
    }
    .da-stat-col {
      gap: 6px !important;
      grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)) !important;
    }
    .da-section-box > div {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
    }
    .da-section-box > div > div {
      min-width: 100% !important;
    }
    .da-section-box > div > div[style*="display: flex; gap: 10px; align-items: flex-end; height: 120px;"] {
      min-width: 100% !important;
      overflow-x: auto !important;
      padding-bottom: 4px;
    }
    .da-section-box > div > div[style*="display: flex; gap: 10px; align-items: flex-end; height: 110px;"] {
      min-width: 100% !important;
      overflow-x: auto !important;
    }
  }

  @media (max-width: 480px) {
    .da-stat-col {
      grid-template-columns: repeat(auto-fit, minmax(75px, 1fr)) !important;
      gap: 4px !important;
    }
    .da-stat-tile {
      padding: 8px !important;
    }
    .da-stat-tile p:first-of-type {
      font-size: 0.8rem !important;
    }
    .da-stat-tile p:last-of-type {
      font-size: 7px !important;
    }
    .da-stat-tile div {
      margin-bottom: 4px !important;
    }
    .da-stat-tile svg {
      width: 12px !important;
      height: 12px !important;
    }
  }
      `}</style>

      {/* ── Tabs ── */}
      <div style={{ display:"flex", gap:"3px", marginBottom:"20px", background:"rgba(255,255,255,0.02)", borderRadius:"12px", padding:"4px", flexWrap:"wrap", backdropFilter:"blur(4px)", border:"1px solid rgba(255,255,255,0.04)" }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding:"8px 10px", border:"none", cursor:"pointer",
              fontFamily:"Quicksand,sans-serif", fontSize:"12px", fontWeight:"700",
              textTransform:"capitalize", borderRadius:"9px",
              background: isActive ? "rgba(168,85,247,0.12)" : "transparent",
              color: isActive ? "#a855f7" : "rgba(255,255,255,0.3)",
              outline: isActive ? "1px solid rgba(168,85,247,0.25)" : "1px solid transparent",
              transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",
              minWidth:"80px",
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.color = "rgba(255,255,255,0.3)";
                e.currentTarget.style.background = "transparent";
              }
            }}
            >{tab}</button>
          );
        })}
      </div>

      {/* ── Peak Season ── */}
      {activeTab === "peak season" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          <div className="da-2col">
            <div className="da-stat-col">
              <StatTile
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                label="Avg Bookings / Week" value={peak.overallMean} color="#a855f7"
              />
              <StatTile
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>}
                label="Peak Weeks" value={peak.peakWeeks.length} color="#f59e0b"
              />
              <StatTile
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z"/></svg>}
                label="Busiest Week" value={peak.busiestWeek?.label || "—"} sub={`${peak.busiestWeek?.count ?? 0} bookings`} color="#22c55e"
              />
              <StatTile
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ce3f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>}
                label="Total Analyzed" value={peak.totalBookings} color="#4ce3f7"
              />
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"16px", minWidth:0 }}>
              <div className="da-section-box">
                <SectionTitle>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Weekly Demand — Actual vs Rolling Average
                </SectionTitle>
                <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.35)", fontSize: "11px", lineHeight: "1.6" }}>
                  Each bar is a week of the year (aggregated across all years in your data). The pale background bar is the 4-week rolling average;
                  the foreground bar is the actual count. Weeks highlighted in <span style={{ color: "#f59e0b", fontWeight: "700" }}>orange</span> exceed
                  their rolling average by more than one standard deviation — these are statistically identified peak weeks.
                </p>

                {peak.totalBookings === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", textAlign: "center", padding: "30px" }}>
                    Not enough booking data to analyze seasonality.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto", paddingBottom: "8px", width: "100%" }}>
                    <div style={{ display: "flex", gap: "3px", alignItems: "flex-end", height: "140px", minWidth: "600px" }}>
                      {peak.weeks.map(w => {
                        const actualH = (w.count / peak.maxCount) * 100;
                        const rollingH = (w.rollingAvg / peak.maxCount) * 100;
                        return (
                          <div key={w.week} title={`Week ${w.week} (${w.label}): ${w.count} bookings · rolling avg ${w.rollingAvg}`}
                            style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "flex-end" }}>
                            <div style={{
                              position: "absolute", bottom: 0, left: 0, right: 0,
                              height: `${Math.max(2, rollingH)}%`,
                              background: "rgba(255,255,255,0.08)",
                              borderRadius: "2px 2px 0 0",
                            }} />
                            <div className="da-bar" style={{
                              position: "relative", width: "100%",
                              height: `${Math.max(2, actualH)}%`,
                              background: w.isPeak ? "#f59e0b" : "#a855f7",
                              borderRadius: "2px 2px 0 0",
                              boxShadow: w.isPeak ? "0 0 8px rgba(245,158,11,0.4)" : "0 0 8px rgba(168,85,247,0.15)",
                              animationDelay: `${w.week * 20}ms`,
                            }} />
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: "3px", minWidth: "600px", marginTop: "6px" }}>
                      {peak.weeks.map(w => (
                        <div key={w.week} style={{ flex: 1, textAlign: "center" }}>
                          {w.week % 4 === 1 && (
                            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{w.label}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="da-section-box">
                <SectionTitle>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                  </svg>
                  Identified Peak Weeks
                </SectionTitle>
                {peak.peakWeeks.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", margin: 0 }}>
                    No statistically significant peaks detected yet — demand looks fairly even, or there isn't enough data.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {peak.peakWeeks
                      .sort((a, b) => b.deviation - a.deviation)
                      .map(w => (
                        <div key={w.week} className="da-insight-row" style={{
                          border: "1px solid rgba(245,158,11,0.14)",
                        }}>
                          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "12px" }}>
                            Week {w.week} <span style={{ color: "rgba(255,255,255,0.4)" }}>(~{w.label})</span>
                          </span>
                          <span style={{ color: "#f59e0b", fontWeight: "700", fontSize: "12px" }}>
                            {w.count} bookings <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: "400" }}>(+{w.deviation} vs trend)</span>
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{
            padding: "12px 18px", background: "rgba(168,85,247,0.04)",
            border: "1px solid rgba(168,85,247,0.12)", borderRadius: "12px",
            display: "flex", gap: "10px", alignItems: "flex-start",
            backdropFilter: "blur(4px)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "rgba(168,85,247,0.25)";
            e.currentTarget.style.background = "rgba(168,85,247,0.06)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "rgba(168,85,247,0.12)";
            e.currentTarget.style.background = "rgba(168,85,247,0.04)";
          }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
              <line x1="9" y1="18" x2="15" y2="18"/>
              <line x1="10" y1="22" x2="14" y2="22"/>
            </svg>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "11px", lineHeight: "1.6" }}>
              This is <strong style={{ color: "#a855f7" }}>frequency analysis on your real booking dates</strong>, not machine learning —
              weeks are aggregated across all years of data and compared against a rolling average. As you collect more seasons of data,
              these peaks will become more reliable for fleet and pricing planning.
            </p>
          </div>
        </div>
      )}

      {/* ── Demand Patterns ── */}
      {activeTab === "demand patterns" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          <div className="da-2col">
            <div className="da-stat-col">
              <StatTile
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                label="Busiest Pickup Day" value={dayFreq.busiestDay} color="#22c55e"
              />
              <StatTile
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                label="Peak Booking Time" value={`${heatmap.dayNames[heatmap.busiest.day]} ${HOUR_LABEL(heatmap.busiest.hour)}`} sub={`${heatmap.busiest.count} bookings`} color="#a855f7"
              />
              <StatTile
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ce3f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>}
                label="Total Bookings" value={dayFreq.total} color="#4ce3f7"
              />
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"16px", minWidth:0 }}>
              <div className="da-section-box">
                <SectionTitle>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Trips by Pickup Day of Week
                </SectionTitle>
                <div style={{ overflowX: "auto", width: "100%" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", height: "110px", minWidth: "400px" }}>
                    {dayFreq.days.map(({ day, count, pct }, i) => (
                      <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: count > 0 ? "#a855f7" : "rgba(255,255,255,0.2)", fontSize: "11px", fontWeight: "700" }}>
                          {count > 0 ? count : ""}
                        </span>
                        <div style={{ width: "100%", height: "70px", display: "flex", alignItems: "flex-end" }}>
                          <div className="da-bar" style={{
                            width: "100%", borderRadius: "5px 5px 0 0",
                            height: `${Math.max(4, pct)}%`,
                            background: pct >= 80
                              ? "linear-gradient(180deg, #c084fc, #a855f7)"
                              : pct >= 40
                                ? "rgba(168,85,247,0.55)"
                                : "rgba(255,255,255,0.07)",
                            animationDelay: `${i * 150}ms`,
                          }} />
                        </div>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", fontWeight: "700" }}>{day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="da-section-box">
                <SectionTitle>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  When Customers Book (Day × Hour)
                </SectionTitle>
                <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>
                  Based on booking <em>creation</em> time — useful for timing support staffing and marketing pushes.
                </p>

                {dayFreq.total === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", textAlign: "center", padding: "20px" }}>
                    Not enough data yet.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto", width: "100%" }}>
                    <div style={{ minWidth: "500px" }}>
                      <div style={{ display: "flex", marginLeft: "36px", marginBottom: "4px" }}>
                        {Array.from({ length: 24 }, (_, h) => (
                          <div key={h} style={{ flex: 1, textAlign: "center" }}>
                            {h % 3 === 0 && (
                              <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.3)" }}>{HOUR_LABEL(h)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {heatmap.grid.map((row, day) => (
                        <div key={day} style={{ display: "flex", alignItems: "center", marginBottom: "2px" }}>
                          <span style={{ width: "32px", flexShrink: 0, fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: "700" }}>
                            {heatmap.dayNames[day]}
                          </span>
                          <div style={{ display: "flex", flex: 1, gap: "2px" }}>
                            {row.map((count, hour) => {
                              const intensity = count / heatmap.max;
                              return (
                                <div
                                  key={hour}
                                  className="da-heat-cell"
                                  title={`${heatmap.dayNames[day]} ${HOUR_LABEL(hour)}: ${count} bookings`}
                                  style={{
                                    flex: 1, height: "16px", borderRadius: "2px",
                                    animationDelay: `${(day * 24 + hour) * 6}ms`,
                                    background: count === 0
                                      ? "rgba(255,255,255,0.03)"
                                      : `rgba(168,85,247,${0.15 + intensity * 0.75})`,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>Less</span>
                  {[0.1, 0.3, 0.5, 0.7, 0.9].map(o => (
                    <div key={o} style={{ width: "16px", height: "10px", borderRadius: "2px", background: `rgba(168,85,247,${0.15 + o * 0.75})` }} />
                  ))}
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>More</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Forecast & Pricing ── */}
      {activeTab === "forecast & pricing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {forecastData.yearsSpan < 2 && (
            <div style={{
              padding: "12px 18px", background: "rgba(245,158,11,0.04)",
              border: "1px solid rgba(245,158,11,0.12)", borderRadius: "12px",
              display: "flex", gap: "10px", alignItems: "flex-start",
              backdropFilter: "blur(4px)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(245,158,11,0.25)";
              e.currentTarget.style.background = "rgba(245,158,11,0.06)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(245,158,11,0.12)";
              e.currentTarget.style.background = "rgba(245,158,11,0.04)";
            }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "11px", lineHeight: "1.6" }}>
                Forecast is based on <strong style={{ color: "#f59e0b" }}>{forecastData.yearsSpan} year</strong> of historical data —
                predictions will become more reliable as more seasonal data accumulates.
              </p>
            </div>
          )}

          <div className="da-2col">
            <div className="da-stat-col">
              <StatTile
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                label="Forecast Window" value="8 weeks" color="#a855f7"
              />
              <StatTile
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                label="Model Mean" value={pricing.modelMean} sub={`σ = ${pricing.modelStd}`} color="#f59e0b"
              />
              <StatTile
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2" ry="2" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>}
                label="Vehicles Analyzed" value={pricing.carSuggestions.length} color="#22c55e"
              />
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"16px", minWidth:0 }}>
              <div className="da-section-box">
                <SectionTitle>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
                  </svg>
                  8-Week Demand Forecast
                </SectionTitle>
                <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.35)", fontSize: "11px", lineHeight: "1.6" }}>
                  Predicted bookings per week, based on the historical pattern for that week-of-year (per-year average).
                  Bars colored orange indicate weeks that historically ran significantly above trend.
                </p>

                <div style={{ overflowX: "auto", width: "100%" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", height: "120px", minWidth: "400px" }}>
                    {pricing.weeklySuggestions.map(f => {
                      const h = (f.predictedBookings / forecastData.maxPredicted) * 100;
                      return (
                        <div key={f.weekOffset} title={`${f.forecastDateLabel}: ~${f.predictedBookings} bookings predicted`}
                          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                            <div className="da-bar" style={{
                              width: "100%", borderRadius: "4px 4px 0 0",
                              height: `${Math.max(4, h)}%`,
                              background: f.isHistoricalPeak ? "#f59e0b" : "#a855f7",
                              animationDelay: `${f.weekOffset * 180}ms`,
                              boxShadow: f.isHistoricalPeak ? "0 0 8px rgba(245,158,11,0.3)" : "0 0 8px rgba(168,85,247,0.1)",
                            }} />
                          </div>
                          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "6px", whiteSpace: "nowrap" }}>
                            {f.forecastDateLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="da-section-box">
                <SectionTitle>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  Fleet-Wide Pricing Suggestions (Next 8 Weeks)
                </SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {pricing.weeklySuggestions.map(f => (
                    <div key={f.weekOffset} className="da-pricing-row" style={{
                      border: `1px solid ${f.adjustmentPct !== 0 ? `${f.adjustmentPct > 0 ? "#f59e0b" : "#a855f7"}28` : "rgba(255,255,255,0.06)"}`,
                    }}>
                      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>
                        Week of <strong style={{ color: "#fff" }}>{f.forecastDateLabel}</strong>
                        <span style={{ color: "rgba(255,255,255,0.35)" }}> · ~{f.predictedBookings} bookings predicted</span>
                      </span>
                      <span style={{
                        color: f.adjustmentPct > 0 ? "#f59e0b" : f.adjustmentPct < 0 ? "#a855f7" : "rgba(255,255,255,0.35)",
                        fontWeight: "700", fontSize: "12px", whiteSpace: "nowrap",
                      }}>
                        {f.label} {f.adjustmentPct !== 0 && `(${f.adjustmentPct > 0 ? "+" : ""}${f.adjustmentPct}%)`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="da-section-box">
                <SectionTitle>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" rx="2" ry="2" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  Per-Vehicle Pricing Suggestions
                </SectionTitle>
                <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.35)", fontSize: "11px", lineHeight: "1.6" }}>
                  Based on each model's booking volume (excluding cancelled/rejected) vs the fleet average
                  ({pricing.modelMean} bookings/model, σ = {pricing.modelStd}).
                </p>

                {pricing.carSuggestions.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>No vehicles to analyze.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {pricing.carSuggestions.map(c => (
                      <div key={c.carId} className="da-pricing-row" style={{
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        <div>
                          <p style={{ margin: 0, color: "#fff", fontSize: "12.5px", fontWeight: "700" }}>{c.model}</p>
                          <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>
                            {c.bookingCount} booking{c.bookingCount !== 1 ? "s" : ""} · current ${c.currentPrice}/day
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{
                            margin: 0, fontWeight: "700", fontSize: "12px",
                            color: c.adjustmentPct > 0 ? "#f59e0b" : c.adjustmentPct < 0 ? "#a855f7" : "rgba(255,255,255,0.35)",
                          }}>
                            {c.label}
                          </p>
                          {c.adjustmentPct !== 0 && (
                            <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
                              Suggested: <strong style={{ color: "#22c55e" }}>${c.suggestedPrice}/day</strong> ({c.adjustmentPct > 0 ? "+" : ""}{c.adjustmentPct}%)
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{
            padding: "12px 18px", background: "rgba(168,85,247,0.04)",
            border: "1px solid rgba(168,85,247,0.12)", borderRadius: "12px",
            display: "flex", gap: "10px", alignItems: "flex-start",
            backdropFilter: "blur(4px)",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "rgba(168,85,247,0.25)";
            e.currentTarget.style.background = "rgba(168,85,247,0.06)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "rgba(168,85,247,0.12)";
            e.currentTarget.style.background = "rgba(168,85,247,0.04)";
          }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
              <line x1="9" y1="18" x2="15" y2="18"/>
              <line x1="10" y1="22" x2="14" y2="22"/>
            </svg>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "11px", lineHeight: "1.6" }}>
              These are <strong style={{ color: "#a855f7" }}>advisory suggestions only</strong> — nothing here changes
              car prices automatically. To act on a suggestion, edit the car's price in the Cars management section.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}