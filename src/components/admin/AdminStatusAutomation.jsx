// src/components/admin/AdminStatusAutomation.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import {
  getNoShowRisks,
  getLateReturnRisks,
  getUpcomingTransitions,
  formatMinutes,
} from "../../utils/statusAutomationUtils";
import { runGlobalStatusSweep } from "../../services/statusScheduler";
import { renderIcon } from "../../utils/iconRenderer";

const T = {
  cyan: "#4ce3f7",
  red: "#ef4444",
  green: "#22c55e",
  orange: "#f59e0b",
  purple: "#a855f7",
  pink: "#ec4899",
  textSec: "rgba(255,255,255,0.4)",
  textMuted: "rgba(255,255,255,0.25)",
};

// ─── Premium Stat Card with Glass Morphism ───────────────────────────
function StatCard({ label, value, color, icon, bg, subtitle }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: `1px solid ${color}25`,
      borderRadius: "14px",
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      cursor: "default",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
      e.currentTarget.style.borderColor = `${color}50`;
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = `0 8px 24px ${color}15, 0 4px 16px rgba(0,0,0,0.2)`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      e.currentTarget.style.borderColor = `${color}25`;
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.15)";
    }}
    >
      <div style={{
        width: "44px",
        height: "44px",
        borderRadius: "12px",
        background: bg || `${color}12`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: "11px", color: T.textSec, fontWeight: "600", letterSpacing: "0.3px" }}>
          {label}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: "800", color: "#fff" }}>
          {value}
        </p>
        {subtitle && (
          <p style={{ margin: "2px 0 0", fontSize: "10px", color: T.textMuted, fontWeight: "500" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Premium Section Title ────────────────────────────────
function SectionTitle({ children, icon }) {
  return (
    <h3 style={{
      margin: "0 0 14px",
      color: "#fff",
      fontSize: "14px",
      fontWeight: "800",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }}>
      <span style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "28px",
        height: "28px",
        borderRadius: "8px",
        background: "rgba(168,85,247,0.08)",
        border: "1px solid rgba(168,85,247,0.15)",
      }}>
        {icon}
      </span>
      {children}
    </h3>
  );
}

// ─── Premium Risk Row with Glass Morphism ──────────────────────────────────────
function RiskRow({ booking, rightLabel, rightColor, leftMeta, statusIcon }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 16px",
      borderRadius: "12px",
      border: `1px solid ${rightColor}25`,
      borderLeft: `3px solid ${rightColor}`,
      marginBottom: "8px",
      gap: "14px",
      flexWrap: "wrap",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.06)";
      e.currentTarget.style.borderColor = `${rightColor}50`;
      e.currentTarget.style.borderLeftColor = rightColor;
      e.currentTarget.style.transform = "translateX(4px)";
      e.currentTarget.style.boxShadow = `0 4px 16px ${rightColor}15, 0 2px 8px rgba(0,0,0,0.15)`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      e.currentTarget.style.borderColor = `${rightColor}25`;
      e.currentTarget.style.borderLeftColor = rightColor;
      e.currentTarget.style.transform = "translateX(0)";
      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
    }}
    >
      <div style={{ minWidth: "180px", flex: 1 }}>
        <p style={{
          margin: 0,
          color: "#fff",
          fontSize: "13px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}>
          {statusIcon && <span style={{ display: "flex", alignItems: "center" }}>{statusIcon}</span>}
          {booking.carModel || "Unknown car"}
          <span style={{
            color: "rgba(255,255,255,0.3)",
            fontWeight: "500",
            fontSize: "11px",
            fontFamily: "monospace",
          }}>
            #{booking.bookingId?.substring(0, 8) || booking.id?.substring(0, 8)}
          </span>
        </p>
        <p style={{
          margin: "2px 0 0",
          color: "rgba(255,255,255,0.4)",
          fontSize: "11px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {booking.userName || booking.userEmail || "Unknown"}
          </span>
          {leftMeta && (
            <>
              <span style={{ opacity: 0.3 }}>·</span>
              <span style={{ color: "rgba(255,255,255,0.35)" }}>{leftMeta}</span>
            </>
          )}
        </p>
      </div>
      <span style={{
        padding: "5px 14px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: "800",
        background: `${rightColor}18`,
        color: rightColor,
        border: `1px solid ${rightColor}25`,
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}>
        <span style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: rightColor,
          display: "inline-block",
          boxShadow: `0 0 8px ${rightColor}`,
        }} />
        {rightLabel}
      </span>
    </div>
  );
}

// ─── Premium Sweep Controls ──────────────────────────────
function SweepControls({ onSweep, sweeping, autoRun, setAutoRun, lastResult }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      flexWrap: "wrap",
      padding: "12px",
      borderRadius: "16px",
      marginBottom: "24px",
      background: "rgba(255,255,255,0.03)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(76,227,247,0.15)",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
    }}>
      {/* Subtle glow effect */}
      <div style={{
        position: "absolute",
        top: "-50%",
        right: "-20%",
        width: "200px",
        height: "200px",
        borderRadius: "50%",
        background: "rgba(76,227,247,0.03)",
        filter: "blur(60px)",
        pointerEvents: "none",
      }} />
      
      <button
        onClick={onSweep}
        disabled={sweeping}
        style={{
          padding: "10px 22px",
          borderRadius: "12px",
          border: "none",
          background: sweeping ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #06b6d4, #0e7490)",
          color: "#fff",
          fontWeight: "800",
          fontSize: "13px",
          cursor: sweeping ? "not-allowed" : "pointer",
          opacity: sweeping ? 0.6 : 1,
          fontFamily: "Quicksand,sans-serif",
          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: sweeping ? "none" : "0 4px 16px rgba(6,182,212,0.25)",
        }}
        onMouseEnter={e => {
          if (!sweeping) {
            e.currentTarget.style.transform = "scale(1.02)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(6,182,212,0.35)";
          }
        }}
        onMouseLeave={e => {
          if (!sweeping) {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(6,182,212,0.25)";
          }
        }}
      >
        {sweeping ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Running Sweep…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
            Run Automation Sweep Now
          </>
        )}
      </button>

      <label style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        color: "rgba(255,255,255,0.6)",
        fontSize: "12px",
        fontWeight: "600",
        cursor: "pointer",
        padding: "6px 12px",
        borderRadius: "8px",
        background: autoRun ? "rgba(76,227,247,0.08)" : "transparent",
        border: `1px solid ${autoRun ? "rgba(76,227,247,0.2)" : "rgba(255,255,255,0.06)"}`,
        transition: "all 0.2s ease",
      }}>
        <input
          type="checkbox"
          checked={autoRun}
          onChange={(e) => setAutoRun(e.target.checked)}
          style={{
            width: "16px",
            height: "16px",
            accentColor: T.cyan,
            cursor: "pointer",
          }}
        />
        <span>Auto-run every 5 min</span>
        {autoRun && (
          <span style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: T.green,
            display: "inline-block",
            boxShadow: `0 0 8px ${T.green}`,
            animation: "pulse 2s infinite",
          }} />
        )}
      </label>

      {lastResult && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 14px",
          borderRadius: "8px",
          background: lastResult.error ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
          border: `1px solid ${lastResult.error ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)"}`,
        }}>
          {lastResult.error ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          )}
          <span style={{
            color: lastResult.error ? T.red : "rgba(255,255,255,0.6)",
            fontSize: "11px",
            fontWeight: "500",
          }}>
            {lastResult.error
              ? `Error: ${lastResult.error}`
              : `${lastResult.processed} booking${lastResult.processed === 1 ? "" : "s"} checked at ${lastResult.ranAt?.toLocaleTimeString()}`}
          </span>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default function AdminStatusAutomation({ bookings = [] }) {
  const [autoRun, setAutoRun] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const intervalRef = useRef(null);

  // Recompute every 60s so "minutes past" stays fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const noShowRisks = useMemo(() => getNoShowRisks(bookings), [bookings]);
  const lateReturnRisks = useMemo(() => getLateReturnRisks(bookings), [bookings]);
  const upcoming = useMemo(() => getUpcomingTransitions(bookings, 60), [bookings]);

  async function handleSweep() {
    setSweeping(true);
    try {
      const result = await runGlobalStatusSweep();
      setLastResult({ ...result, ranAt: new Date() });
    } catch (err) {
      setLastResult({ error: err.message, ranAt: new Date() });
    } finally {
      setSweeping(false);
    }
  }

  // Auto-run every 5 minutes while toggled on
  useEffect(() => {
    if (autoRun) {
      handleSweep();
      intervalRef.current = setInterval(handleSweep, 5 * 60 * 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRun]);

  const overdueNoShows = noShowRisks.filter((r) => r.isOverdue).length;
  const overdueLateReturns = lateReturnRisks.filter((r) => r.isOverdue).length;

  return (
    <div style={{ fontFamily: "Quicksand,sans-serif" }}>

      {/* ── Sweep Controls ── */}
      <SweepControls
        onSweep={handleSweep}
        sweeping={sweeping}
        autoRun={autoRun}
        setAutoRun={setAutoRun}
        lastResult={lastResult}
      />

      {/* ── Info Banner ── */}
      <div style={{
        padding: "14px 18px",
        borderRadius: "12px",
        marginBottom: "24px",
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(168,85,247,0.12)",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(168,85,247,0.25)";
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(168,85,247,0.12)";
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style={{
          margin: 0,
          color: "rgba(255,255,255,0.5)",
          fontSize: "12px",
          lineHeight: "1.6",
        }}>
          <strong style={{ color: T.cyan }}>Automation Sweep</strong> applies the same transition rules as the per-user client scheduler
          (auto-confirm, pickup-day, return-day, no-show after 2h, late return fees), but across <strong style={{ color: T.cyan }}>every active booking</strong> —
          not just bookings belonging to a currently logged-in user. It's a manual/scheduled stopgap until a Firebase
          Cloud Function runs this on a Pub/Sub schedule server-side.
        </p>
      </div>

      {/* ── Summary Stats ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "14px",
        marginBottom: "28px",
      }}>
        <StatCard
          label="No-Show Risks"
          value={noShowRisks.length}
          color={overdueNoShows > 0 ? T.red : T.orange}
          subtitle={overdueNoShows > 0 ? `${overdueNoShows} overdue` : "Monitoring active"}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={overdueNoShows > 0 ? T.red : T.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"/>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          }
        />
        <StatCard
          label="Overdue No-Shows"
          value={overdueNoShows}
          color={T.red}
          subtitle="Requires immediate action"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          }
        />
        <StatCard
          label="Late Return Risks"
          value={lateReturnRisks.length}
          color={overdueLateReturns > 0 ? T.red : T.orange}
          subtitle={overdueLateReturns > 0 ? `${overdueLateReturns} overdue` : "Monitoring active"}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={overdueLateReturns > 0 ? T.red : T.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        />
        <StatCard
          label="Upcoming Transitions"
          value={upcoming.length}
          color={T.purple}
          subtitle="Next 60 minutes"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          }
        />
      </div>

      {/* ── No-Show Risks ── */}
      <div style={{ marginBottom: "28px" }}>
        <SectionTitle
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"/>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          }
        >
          No-Show Risks <span style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.3)" }}>
            (Pickup Awaited, Past Pickup Time)
          </span>
        </SectionTitle>
        {noShowRisks.length === 0 ? (
          <div style={{
            padding: "32px",
            textAlign: "center",
            background: "rgba(255,255,255,0.01)",
            border: "1px dashed rgba(255,255,255,0.06)",
            borderRadius: "12px",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
              No bookings currently at risk of no-show.
            </p>
          </div>
        ) : (
          noShowRisks.map(({ booking, minutesPast, isOverdue, minutesUntilAutoNoShow }) => (
            <RiskRow
              key={booking.id}
              booking={booking}
              leftMeta={`pickup ${formatMinutes(minutesPast)} ago`}
              rightLabel={isOverdue ? "Auto no-show pending — run sweep" : `Auto no-show in ${formatMinutes(minutesUntilAutoNoShow)}`}
              rightColor={isOverdue ? T.red : T.orange}
              statusIcon={isOverdue ? "🚨" : "⏳"}
            />
          ))
        )}
      </div>

      {/* ── Late Return Risks ── */}
      <div style={{ marginBottom: "28px" }}>
        <SectionTitle
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        >
          Late Return Risks <span style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.3)" }}>
            (Return Pending, Past Dropoff Time)
          </span>
        </SectionTitle>
        {lateReturnRisks.length === 0 ? (
          <div style={{
            padding: "32px",
            textAlign: "center",
            background: "rgba(255,255,255,0.01)",
            border: "1px dashed rgba(255,255,255,0.06)",
            borderRadius: "12px",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
              No overdue returns right now.
            </p>
          </div>
        ) : (
          lateReturnRisks.map(({ booking, minutesPast, isOverdue, feeApplied, minutesUntilFee }) => (
            <RiskRow
              key={booking.id}
              booking={booking}
              leftMeta={`dropoff ${formatMinutes(minutesPast)} ago`}
              rightLabel={
                feeApplied
                  ? "Late fee already applied"
                  : isOverdue
                  ? "Late fee pending — run sweep"
                  : `Fee triggers in ${formatMinutes(minutesUntilFee)}`
              }
              rightColor={feeApplied ? T.green : isOverdue ? T.red : T.orange}
              statusIcon={feeApplied ? "💰" : isOverdue ? "🚨" : "⏳"}
            />
          ))
        )}
      </div>

      {/* ── Upcoming Transitions ── */}
      <div>
        <SectionTitle
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          }
        >
          Upcoming Transitions <span style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.3)" }}>
            (Next 60 Minutes)
          </span>
        </SectionTitle>
        {upcoming.length === 0 ? (
          <div style={{
            padding: "32px",
            textAlign: "center",
            background: "rgba(255,255,255,0.01)",
            border: "1px dashed rgba(255,255,255,0.06)",
            borderRadius: "12px",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
              Nothing scheduled to transition in the next hour.
            </p>
          </div>
        ) : (
          upcoming.map(({ booking, minutes }) => (
            <RiskRow
              key={booking.id}
              booking={booking}
              leftMeta={`status: ${booking.status?.replace(/_/g, " ")}`}
              rightLabel={`in ${formatMinutes(minutes)}`}
              rightColor={T.purple}
              statusIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}