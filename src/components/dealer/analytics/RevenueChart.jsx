// src/components/dealer/analytics/RevenueChart.jsx
import { useState, useMemo, useEffect } from "react";

const C = {
  cyan:   "#4ce3f7",
  green:  "#22c55e",
  dim:    "rgba(255,255,255,0.4)",
  dimmer: "rgba(255,255,255,0.06)",
};

function fmt(v) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
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

function PillToggle({ options, value, onChange }) {
  return (
    <div className="rev-pills" style={{
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
            padding: "6px 13px",
            borderRadius: "9px",
            border: "none",
            background: value === o.id
              ? "linear-gradient(135deg,rgba(34,197,94,0.18),rgba(67,56,202,0.15))"
              : "transparent",
            color: value === o.id ? C.green : C.dim,
            cursor: "pointer",
            fontFamily: "Quicksand,sans-serif",
            fontSize: "11px",
            fontWeight: "700",
            transition: "all 0.2s ease",
            boxShadow: value === o.id ? "inset 0 0 0 1px rgba(34,197,94,0.3)" : "none",
            whiteSpace: "nowrap",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RevenueBar({ height, revenue, count, month, index = 0 }) {
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
      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0", cursor: "pointer", position: "relative", minWidth: "16px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip */}
      <div style={{
        position: "absolute",
        bottom: "calc(100% + 6px)",
        left: "50%",
        transform: `translateX(-50%) translateY(${hovered ? "0" : "4px"})`,
        padding: "7px 10px",
        background: "rgba(10,10,20,0.97)",
        border: "1px solid rgba(34,197,94,0.3)",
        borderRadius: "10px",
        opacity: hovered ? 1 : 0,
        transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
        pointerEvents: "none",
        zIndex: 20,
        minWidth: "90px",
        textAlign: "center",
      }}>
        <p style={{ margin: 0, fontSize: "12px", fontWeight: "800", color: C.green }}>{fmt(revenue)}</p>
        <p style={{ margin: "2px 0 0", fontSize: "10px", color: C.dim }}>{count} booking{count !== 1 ? "s" : ""}</p>
      </div>

      {/* Bar (grows in from 0 on mount / data change) */}
      <div style={{
        width: "100%",
        height: grown ? `${height}px` : "0px",
        background: hovered
          ? `linear-gradient(180deg, ${C.green}, #16a34a)`
          : `linear-gradient(180deg, ${C.green}cc, #16a34a88)`,
        borderRadius: "6px 6px 0 0",
        boxShadow: hovered ? `0 0 18px rgba(34,197,94,0.35)` : "none",
        transition: `height 0.75s cubic-bezier(0.16,1,0.3,1) ${index * 35}ms, transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, background 0.25s ease`,
        transform: hovered ? "scaleX(0.88)" : "scaleX(1)",
      }} />
    </div>
  );
}

export default function RevenueChart({ bookings }) {
  const [timeRange, setTimeRange] = useState("6months");

  const { data, maxRevenue } = useMemo(() => {
    const now    = new Date();
    const months = timeRange === "3months" ? 3 : timeRange === "12months" ? 12 : 6;
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const mb = bookings.filter((b) => {
        const d = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return ["completed", "dealer_confirmed"].includes(b.status) && d >= start && d < end;
      });
      result.push({
        month:   start.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        revenue: mb.reduce((s, b) => s + (b.total || 0), 0),
        count:   mb.length,
      });
    }
    return { data: result, maxRevenue: Math.max(...result.map((d) => d.revenue), 1) };
  }, [bookings, timeRange]);

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalCount   = data.reduce((s, d) => s + d.count, 0);
  const avgMonthly   = totalRevenue / (data.length || 1);
  const avgPerBk     = totalRevenue / (totalCount || 1);

  const animatedTotal = useAnimatedValue(totalRevenue, 1200);
  const barMinWidth = Math.max(data.length * 46, 100);

  return (
    <div className="rev-root" style={{
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
        .rev-root * { box-sizing: border-box; }
        .rev-trend-scroll { max-width: 100%; }

        @media (max-width: 900px) {
          .rev-root { padding: 20px !important; border-radius: 18px !important; }
        }
        @media (max-width: 600px) {
          .rev-root { padding: 16px !important; }
          .rev-title { font-size: 14px !important; }
          .rev-total { font-size: 17px !important; }
          .rev-pills button { padding: 5px 10px !important; font-size: 10px !important; }
          .rev-summary { gap: 8px !important; margin-top: 14px !important; padding-top: 14px !important; }
          .rev-summary p:last-child { font-size: 13px !important; }
        }
        @media (max-width: 420px) {
          .rev-root { padding: 14px !important; border-radius: 16px !important; }
          .rev-total { font-size: 16px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "22px", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "10px",
            background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center", color: C.green, flexShrink: 0,
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <h3 className="rev-title" style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#fff", letterSpacing: "-0.2px" }}>Revenue Trend</h3>
            <p className="rev-total" style={{ margin: "2px 0 0", fontSize: "20px", fontWeight: "800", color: C.green, letterSpacing: "-0.5px" }}>
              {fmt(Math.round(animatedTotal))}
            </p>
          </div>
        </div>
        <PillToggle
          options={[{ id: "3months", label: "3M" }, { id: "6months", label: "6M" }, { id: "12months", label: "12M" }]}
          value={timeRange}
          onChange={setTimeRange}
        />
      </div>

      {/* Bars (scrollable on narrow screens for 12M view) */}
      <div className="rev-trend-scroll" style={{ overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch", width: "100%" }}>
        <div key={timeRange} style={{ minWidth: `${barMinWidth}px`, width: `${barMinWidth}px` }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", height: "180px" }}>
            {data.map((item, i) => {
              const h = Math.max((item.revenue / maxRevenue) * 155, item.revenue > 0 ? 8 : 3);
              return (
                <RevenueBar key={i} index={i} height={h} revenue={item.revenue} count={item.count} month={item.month} />
              );
            })}
          </div>

          {/* X labels */}
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            {data.map((item) => (
              <div key={item.month} style={{ flex: 1, textAlign: "center" }}>
                <span style={{ fontSize: "9px", color: C.dim, fontWeight: "600" }}>{item.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="rev-summary" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: "12px", marginTop: "20px", paddingTop: "18px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        {[
          { label: "Avg Monthly", value: fmt(avgMonthly), color: "#fff" },
          { label: "Total Bookings", value: totalCount, color: "#fff" },
          { label: "Per Booking", value: fmt(avgPerBk), color: C.green },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "10px", color: C.dim, fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ margin: "5px 0 0", fontSize: "15px", fontWeight: "800", color }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}