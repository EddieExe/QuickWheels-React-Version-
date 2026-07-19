// src/components/dealer/analytics/FleetUtilizationChart.jsx
import { useState, useEffect } from "react";
import { calculateFleetUtilization } from "../../../utils/analyticsUtils";

const C = {
  cyan:    "#4ce3f7",
  green:   "#22c55e",
  orange:  "#f59e0b",
  red:     "#ef4444",
  dim:     "rgba(255,255,255,0.4)",
  dimmer:  "rgba(255,255,255,0.06)",
};

function getUtilColor(u) {
  if (u >= 70) return C.green;
  if (u >= 40) return C.orange;
  return C.red;
}

// ── Animated numeric counter (eased ramp from 0 → target) ─────────────────────
function useAnimatedValue(target, duration = 1100) {
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

// ── Shared pill toggle ────────────────────────────────────────────────────────
function PillToggle({ options, value, onChange }) {
  return (
    <div className="fuc-pills" style={{
      display: "flex",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "12px",
      padding: "4px",
      gap: "4px",
    }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          style={{
            padding: "6px 14px",
            borderRadius: "9px",
            border: "none",
            background: value === o.id
              ? "linear-gradient(135deg,rgba(76,227,247,0.2),rgba(67,56,202,0.2))"
              : "transparent",
            color: value === o.id ? C.cyan : C.dim,
            cursor: "pointer",
            fontFamily: "Quicksand,sans-serif",
            fontSize: "11px",
            fontWeight: "700",
            transition: "all 0.2s ease",
            boxShadow: value === o.id ? "inset 0 0 0 1px rgba(76,227,247,0.3)" : "none",
            textTransform: "capitalize",
            whiteSpace: "nowrap",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Premium arc gauge (speedometer sweep) ─────────────────────────────────────
function ArcGauge({ value, color }) {
  const animated = useAnimatedValue(value, 1100);
  const r = 58;
  const cx = 80, cy = 80;
  const startAngle = -210;
  const totalAngle = 240;
  const pct = Math.min(Math.max(animated, 0), 100) / 100;

  function polar(angle, radius) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arc(startDeg, endDeg, radius) {
    const s = polar(startDeg, radius);
    const e = polar(endDeg, radius);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const trackEnd = startAngle + totalAngle;
  const fillEnd  = startAngle + totalAngle * pct;

  return (
    <div className="fuc-gauge-wrap" style={{ width: "100%", maxWidth: "200px", minHeight: "1px", margin: "0 auto", aspectRatio: "160 / 110" }}>
      <svg viewBox="0 0 160 110" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#4338ca" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path d={arc(startAngle, trackEnd, r)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round" />

        {/* Subtle tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = startAngle + (totalAngle * tick) / 100;
          const inner = polar(angle, r - 7);
          const outer = polar(angle, r + 7);
          return (
            <line
              key={tick}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
              strokeLinecap="round"
            />
          );
        })}

        {/* Fill arc (sweeps as animated value ramps up) */}
        {pct > 0 && (
          <path
            d={arc(startAngle, fillEnd, r)}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
          />
        )}

        {/* Needle dot */}
        {pct > 0 && (() => {
          const tip = polar(fillEnd, r);
          return (
            <circle cx={tip.x} cy={tip.y} r="5" fill={color} filter="url(#gaugeGlow)" />
          );
        })()}

        {/* Center text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize="26" fontWeight="800" fontFamily="Quicksand,sans-serif">
          {Math.round(animated)}%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill={C.dim} fontSize="10" fontFamily="Quicksand,sans-serif" fontWeight="600" letterSpacing="1">
          UTILIZATION
        </text>

        {/* Min / Max labels */}
        {(() => {
          const minPt = polar(startAngle, r + 16);
          const maxPt = polar(trackEnd,   r + 16);
          return (
            <>
              <text x={minPt.x} y={minPt.y + 4} textAnchor="middle" fill={C.dim} fontSize="9" fontFamily="Quicksand,sans-serif">0</text>
              <text x={maxPt.x} y={maxPt.y + 4} textAnchor="middle" fill={C.dim} fontSize="9" fontFamily="Quicksand,sans-serif">100</text>
            </>
          );
        })()}
      </svg>
    </div>
  );
}

// ── Premium bar with hover tooltip + grow-in animation ────────────────────────
function HoverBar({ height, color, label, value, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    setGrown(false);
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setGrown(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [height]);

  return (
    <div
      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0", cursor: "pointer", position: "relative", minWidth: "10px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip */}
      <div style={{
        position: "absolute",
        bottom: "100%",
        left: "50%",
        transform: `translateX(-50%) translateY(${hovered ? "-6px" : "0px"})`,
        padding: "4px 8px",
        background: "rgba(12,12,22,0.95)",
        border: `1px solid ${color}44`,
        borderRadius: "7px",
        fontSize: "10px",
        fontWeight: "700",
        color,
        whiteSpace: "nowrap",
        opacity: hovered ? 1 : 0,
        transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
        pointerEvents: "none",
        zIndex: 10,
      }}>
        {value}%
      </div>
      <div style={{
        width: "100%",
        height: grown ? `${height}px` : "0px",
        background: hovered
          ? `linear-gradient(180deg, ${color}, ${color}99)`
          : `linear-gradient(180deg, ${color}bb, ${color}44)`,
        borderRadius: "5px 5px 0 0",
        boxShadow: hovered ? `0 0 14px ${color}55` : "none",
        transition: `height 0.7s cubic-bezier(0.16,1,0.3,1) ${index * 30}ms, transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, background 0.25s ease`,
        transform: hovered ? "scaleX(0.88)" : "scaleX(1)",
      }} />
    </div>
  );
}

export default function FleetUtilizationChart({ cars, bookings }) {
  const [period, setPeriod] = useState("monthly");
  const [data, setData]   = useState(null);

  useEffect(() => {
    setData(calculateFleetUtilization(cars, bookings, period));
  }, [cars, bookings, period]);

  if (!data) {
    return (
      <div style={{ padding: "48px", textAlign: "center" }}>
        <div style={{ width: "28px", height: "28px", margin: "0 auto", borderRadius: "50%", border: "2px solid rgba(76,227,247,0.15)", borderTopColor: C.cyan, animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const color = getUtilColor(data.utilization);
  const maxU  = Math.max(...data.chartData.map((d) => d.utilization), 10);
  const trendMinWidth = Math.max(data.chartData.length * 22, 100);

  return (
    <div className="fuc-root" style={{
      background: "linear-gradient(145deg,rgba(255,255,255,0.025),rgba(255,255,255,0.01))",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "22px",
      padding: "26px",
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      boxSizing: "border-box",
      overflowX: "hidden",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .fuc-root * { box-sizing: border-box; }
        .fuc-trend-scroll { max-width: 100%; }

        @media (max-width: 900px) {
          .fuc-root { padding: 20px !important; border-radius: 18px !important; }
          .fuc-header { gap: 14px !important; }
        }
        @media (max-width: 600px) {
          .fuc-root { padding: 16px !important; }
          .fuc-gauge-wrap { max-width: 170px !important; }
          .fuc-pills button { padding: 5px 10px !important; font-size: 10px !important; }
          .fuc-legend { gap: 8px !important; flex-wrap: wrap !important; }
          .fuc-legend span { font-size: 9px !important; }
          .fuc-trend-label { font-size: 10px !important; }
        }
        @media (max-width: 420px) {
          .fuc-root { padding: 14px !important; border-radius: 16px !important; }
          .fuc-title { font-size: 14px !important; }
          .fuc-sub { font-size: 10.5px !important; }
        }
      `}</style>

      {/* Header */}
      <div className="fuc-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "22px", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "10px",
            background: "rgba(76,227,247,0.12)", border: "1px solid rgba(76,227,247,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center", color: C.cyan, flexShrink: 0,
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div>
            <h3 className="fuc-title" style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#fff", letterSpacing: "-0.2px" }}>Fleet Utilization</h3>
            <p className="fuc-sub" style={{ margin: "2px 0 0", fontSize: "11.5px", color: C.dim }}>
              {data.totalCars} vehicles · {data.activeBookings} active
            </p>
          </div>
        </div>
        <PillToggle
          options={[{ id: "daily", label: "Daily" }, { id: "weekly", label: "Weekly" }, { id: "monthly", label: "Monthly" }]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {/* Gauge */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
        <ArcGauge value={data.utilization} color={color} />
      </div>

      {/* Status pills row */}
      <div className="fuc-legend" style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "22px", flexWrap: "wrap" }}>
        {[
          { label: "High (≥70%)",  color: C.green  },
          { label: "Mid (40–69%)", color: C.orange },
          { label: "Low (<40%)",   color: C.red    },
        ].map(({ label, color: c }) => (
          <span key={label} style={{
            display: "flex", alignItems: "center", gap: "5px",
            fontSize: "10px", fontWeight: "600", color: C.dim,
          }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: c, flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginBottom: "18px" }} />

      {/* Trend bars */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <span className="fuc-trend-label" style={{ fontSize: "11px", color: C.dim, fontWeight: "600" }}>Daily Trend</span>
        <span className="fuc-trend-label" style={{ fontSize: "11px", color: C.cyan, fontWeight: "700" }}>{data.chartData.length} data points</span>
      </div>

      <div className="fuc-trend-scroll" style={{ overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch", width: "100%" }}>
        <div key={period} style={{ minWidth: `${trendMinWidth}px`, width: `${trendMinWidth}px` }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height: "100px" }}>
            {data.chartData.map((item, i) => {
              const h = Math.max((item.utilization / maxU) * 82, 4);
              return (
                <HoverBar key={i} index={i} height={h} color={C.cyan} label={item.date} value={item.utilization} />
              );
            })}
          </div>

          {/* X labels */}
          <div style={{ display: "flex", gap: "5px", marginTop: "6px" }}>
            {data.chartData.map((item, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <span style={{ fontSize: "8px", color: C.dimmer, display: "block", transform: "rotate(-40deg)", transformOrigin: "center", whiteSpace: "nowrap" }}>
                  {item.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}