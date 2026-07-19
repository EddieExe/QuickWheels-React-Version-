// src/components/admin/DateRangeFilter.jsx
import { useState } from "react";
import { useDateRange, PRESETS } from "../../context/DateRangeContext";

export default function DateRangeFilter() {
  const { activePreset, startDate, endDate, applyPreset, applyCustomRange } = useDateRange();
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");

  function handlePreset(id) {
    if (id === "custom") { setShowCustom(true); return; }
    setShowCustom(false);
    applyPreset(id);
  }

  function handleApplyCustom() {
    if (!customStart || !customEnd) return;
    const s = new Date(customStart); s.setHours(0,0,0,0);
    const e = new Date(customEnd);   e.setHours(23,59,59,999);
    if (s > e) return;
    applyCustomRange(s, e);
    setShowCustom(false);
  }

  const fmt = (d) => d?.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) ?? "";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
      {/* Preset pills */}
      <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ color:"rgba(255,255,255,0.3)", fontSize:"11px", fontWeight:"700",
          letterSpacing:"0.08em", marginRight:"4px" }}>RANGE</span>

        {PRESETS.map(p => {
          const isActive = activePreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handlePreset(p.id)}
              style={{
                padding:"6px 14px", borderRadius:"20px", cursor:"pointer",
                fontFamily:"Quicksand,sans-serif", fontSize:"12px", fontWeight:"700",
                border:"none", transition:"all 0.2s",
                background: isActive ? "linear-gradient(135deg,#6366f1,#a855f7)" : "rgba(255,255,255,0.05)",
                color:       isActive ? "#fff" : "rgba(255,255,255,0.45)",
                boxShadow:   isActive ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
              }}
            >
              {p.label}
            </button>
          );
        })}

        {/* Active range display */}
        {activePreset !== "custom" && (
          <span style={{
            marginLeft:"8px", padding:"5px 12px", borderRadius:"8px",
            background:"rgba(76,227,247,0.06)", border:"1px solid rgba(76,227,247,0.15)",
            color:"#4ce3f7", fontSize:"11px", fontWeight:"600",
          }}>
            {fmt(startDate)} — {fmt(endDate)}
          </span>
        )}
      </div>

      {/* Custom date picker */}
      {showCustom && (
        <div style={{
          display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap",
          padding:"12px 16px", borderRadius:"12px",
          background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
            <label style={{ color:"rgba(255,255,255,0.4)", fontSize:"10px", fontWeight:"700",
              letterSpacing:"0.06em" }}>FROM</label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              style={dateInputStyle}
            />
          </div>

          <span style={{ color:"rgba(255,255,255,0.3)", marginTop:"16px" }}>→</span>

          <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
            <label style={{ color:"rgba(255,255,255,0.4)", fontSize:"10px", fontWeight:"700",
              letterSpacing:"0.06em" }}>TO</label>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              style={dateInputStyle}
            />
          </div>

          <button
            onClick={handleApplyCustom}
            disabled={!customStart || !customEnd}
            style={{
              marginTop:"16px", padding:"9px 20px", borderRadius:"10px", border:"none",
              background: "linear-gradient(135deg,#6366f1,#a855f7)",
              color:"#fff", fontFamily:"Quicksand,sans-serif", fontWeight:"700",
              fontSize:"13px", cursor:"pointer",
              opacity: (!customStart || !customEnd) ? 0.5 : 1,
            }}
          >
            Apply
          </button>

          <button
            onClick={() => setShowCustom(false)}
            style={{
              marginTop:"16px", padding:"9px 16px", borderRadius:"10px",
              background:"transparent", border:"1px solid rgba(255,255,255,0.1)",
              color:"rgba(255,255,255,0.4)", fontFamily:"Quicksand,sans-serif",
              fontWeight:"600", fontSize:"13px", cursor:"pointer",
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

const dateInputStyle = {
  padding:"8px 12px", borderRadius:"8px",
  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
  color:"#fff", fontFamily:"Quicksand,sans-serif", fontSize:"13px",
  outline:"none", colorScheme:"dark",
};