// src/components/dealer/analytics/PerformanceMetrics.jsx
import { useState, useEffect } from "react";
import { calculateOnTimePerformance, calculateDamageRate, calculateAverageTripDuration } from "../../../utils/analyticsUtils";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  purple: "#a855f7",
  textSec: "rgba(255,255,255,0.4)",
  darkBg: "rgba(5,150,105,0.08)",
  borderColor: "rgba(5,150,105,0.25)",
  glowColor: "rgba(5,150,105,0.12)",
};

// ── Animated numeric counter (eased ramp from 0 → target) ─────────────────────
function useAnimatedValue(target, duration = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    let start = null;
    setValue(0);
    function step(ts) {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
}

// ── Progress bar that fills in from 0% on mount ────────────────────────────────
function FillBar({ pct, colorFrom, colorTo }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setRevealed(false);
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setRevealed(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [pct]);

  return (
    <div style={{ height: "4px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{
        width: revealed ? `${Math.min(pct, 100)}%` : "0%",
        height: "100%",
        background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})`,
        borderRadius: "4px",
        transition: "width 1s cubic-bezier(0.16,1,0.3,1)",
      }} />
    </div>
  );
}

export default function PerformanceMetrics({ bookings }) {
  const [onTimeData, setOnTimeData] = useState(null);
  const [damageData, setDamageData] = useState(null);
  const [tripData, setTripData] = useState(null);
  
  useEffect(() => {
    setOnTimeData(calculateOnTimePerformance(bookings));
    setDamageData(calculateDamageRate(bookings));
    setTripData(calculateAverageTripDuration(bookings));
  }, [bookings]);
  
  const onTimeAnimated = useAnimatedValue(onTimeData?.onTimeRate || 0);
  const damageAnimated = useAnimatedValue(damageData?.damageRate || 0);
  const tripAnimated   = useAnimatedValue(tripData?.averageDays || 0);

  if (!onTimeData || !damageData || !tripData) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: T.textSec }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: "30px", height: "30px", margin: "0 auto", border: "2px solid rgba(76,227,247,.2)", borderTopColor: T.cyan, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }
  
  const getPerformanceColor = (rate) => {
    if (rate >= 90) return T.green;
    if (rate >= 70) return T.orange;
    return T.red;
  };

  // SVG Icons
  const icons = {
    onTime: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    damage: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
        <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      </svg>
    ),
    trip: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    check: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    warning: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  };
  
  // Card wrapper function for consistency
  const MetricCard = ({ children, hoverColor = "#059669", accentColor = "#34d399" }) => (
    <div className="perf-card" style={{
      background: "linear-gradient(145deg, rgba(5,150,105,0.06), rgba(5,150,105,0.015))",
      border: `1px solid rgba(5,150,105,0.2)`,
      borderRadius: "16px",
      padding: "20px 22px",
      position: "relative",
      overflow: "hidden",
      transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = "rgba(5,150,105,0.4)";
      e.currentTarget.style.boxShadow = "0 4px 24px rgba(5,150,105,0.12)";
      e.currentTarget.style.transform = "translateY(-2px)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = "rgba(5,150,105,0.2)";
      e.currentTarget.style.boxShadow = "none";
      e.currentTarget.style.transform = "translateY(0)";
    }}>
      {/* Glow effect */}
      <div style={{
        position: "absolute", top: "-40px", right: "-40px",
        width: "120px", height: "120px",
        background: `radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />
      {children}
    </div>
  );

  const onTimeColor = getPerformanceColor(onTimeData.onTimeRate);
  const damageColor = damageData.damageRate > 10 ? T.red : T.orange;

  return (
    <div className="perf-root" style={{
      background: "linear-gradient(145deg,rgba(255,255,255,.02),rgba(255,255,255,.005))",
      border: "1px solid rgba(255,255,255,.06)",
      borderRadius: "22px",
      padding: "28px",
      marginTop: "20px",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .perf-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        @media (max-width: 860px) {
          .perf-root { padding: 20px !important; border-radius: 18px !important; }
          .perf-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .perf-root { padding: 16px !important; }
          .perf-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .perf-card { padding: 16px 18px !important; }
        }
        @media (max-width: 420px) {
          .perf-root { padding: 14px !important; border-radius: 16px !important; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div style={{
          width: "36px", height: "36px",
          borderRadius: "10px",
          background: "rgba(5,150,105,0.15)",
          border: "1px solid rgba(5,150,105,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#34d399",
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l3 3-3 3" />
            <path d="M18 15l-3-3 3-3" />
            <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
          </svg>
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#fff", letterSpacing: "-0.3px" }}>
            Performance Analytics
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
            Real-time operational metrics
          </p>
        </div>
      </div>
      
      {/* Responsive grid: 3 cols desktop → 2 cols tablet → 1 col mobile */}
      <div className="perf-grid">
        
        {/* ── On-Time Performance ── */}
        <MetricCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px", height: "32px",
                borderRadius: "8px",
                background: "rgba(5,150,105,0.12)",
                border: "1px solid rgba(5,150,105,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#34d399",
              }}>
                {icons.onTime}
              </div>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                On-Time
              </span>
            </div>
            <span style={{ 
              fontSize: "26px", 
              fontWeight: "800", 
              color: onTimeColor,
              lineHeight: 1,
            }}>
              {Math.round(onTimeAnimated)}%
            </span>
          </div>
          
          <div style={{ marginBottom: "12px" }}>
            <FillBar pct={onTimeData.onTimeRate} colorFrom={onTimeColor} colorTo={`${onTimeColor}dd`} />
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.35)", marginBottom: "12px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {icons.check}
              On-time: {onTimeData.onTimeReturns}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: T.orange }}>
              {icons.warning}
              Late: {onTimeData.lateReturns}
            </span>
          </div>
          
          {onTimeData.lateBreakdown.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {onTimeData.lateBreakdown.slice(0, 3).map(item => (
                <span key={item.range} style={{ 
                  fontSize: "9px", 
                  padding: "2px 8px", 
                  background: "rgba(255,255,255,0.04)", 
                  borderRadius: "10px",
                  color: "rgba(255,255,255,0.35)",
                }}>
                  {item.range}: {item.count}
                </span>
              ))}
            </div>
          )}
        </MetricCard>

        {/* ── Damage Rate ── */}
        <MetricCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px", height: "32px",
                borderRadius: "8px",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#ef4444",
              }}>
                {icons.damage}
              </div>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Damage Rate
              </span>
            </div>
            <span style={{ 
              fontSize: "26px", 
              fontWeight: "800", 
              color: damageColor,
              lineHeight: 1,
            }}>
              {damageAnimated.toFixed(1)}%
            </span>
          </div>
          
          <div style={{ marginBottom: "12px" }}>
            <FillBar pct={damageData.damageRate} colorFrom={damageColor} colorTo={`${damageColor}dd`} />
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.35)", marginBottom: "12px" }}>
            <span>Cases: {damageData.damageCases}</span>
            <span>Total: ${damageData.totalDamageCost.toLocaleString()}</span>
          </div>
          
          {damageData.damageTypes.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {damageData.damageTypes.filter(d => d.count > 0).map(d => (
                <span key={d.severity} style={{ 
                  fontSize: "9px", 
                  padding: "2px 8px", 
                  background: d.severity === "severe" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                  borderRadius: "10px",
                  color: d.severity === "severe" ? "#ef4444" : "#f59e0b",
                }}>
                  {d.severity}: {d.count}
                </span>
              ))}
            </div>
          )}
        </MetricCard>

        {/* ── Average Trip Duration ── */}
        <MetricCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px", height: "32px",
                borderRadius: "8px",
                background: "rgba(76,227,247,0.12)",
                border: "1px solid rgba(76,227,247,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#4ce3f7",
              }}>
                {icons.trip}
              </div>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Trip Duration
              </span>
            </div>
            <span style={{ 
              fontSize: "26px", 
              fontWeight: "800", 
              color: T.cyan,
              lineHeight: 1,
            }}>
              {tripAnimated.toFixed(1)}d
            </span>
          </div>
          
          <div style={{ marginBottom: "12px" }}>
            <FillBar pct={Math.min((tripData.averageDays / 14) * 100, 100)} colorFrom="#052e16" colorTo="#4ce3f7" />
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.35)", marginBottom: "12px" }}>
            <span>Trips: {tripData.totalTrips}</span>
            <span>Total Days: {tripData.totalDays}</span>
          </div>
          
          {tripData.chartData.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "auto", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {tripData.chartData.slice(0, 3).map(item => (
                <span key={item.range} style={{ 
                  fontSize: "9px", 
                  padding: "2px 8px", 
                  background: "rgba(255,255,255,0.04)", 
                  borderRadius: "10px",
                  color: "rgba(255,255,255,0.35)",
                }}>
                  {item.range}: {item.count}
                </span>
              ))}
            </div>
          )}
        </MetricCard>

      </div>
    </div>
  );
}