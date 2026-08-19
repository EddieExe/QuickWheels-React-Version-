import { useEffect, useRef } from "react";
import TollAlerts from "./TollAlerts";
import { useTripNavigation } from "../context/TripNavigationContext";
import { SIM_SPEED_PRESETS } from "../utils/simDriver";

/**
 * LiveNavigation — presentational.
 * Route, tracking and every figure below come from TripNavigationContext,
 * which is also what RouteMap reads, so the two panels can no longer disagree.
 */
export default function LiveNavigation({ pickupAddress = "", dropoffAddress = "" }) {
  const {
    loadingRoute,
    routeError,
    refreshRoute,
    steps,
    traffic,
    originName,
    destinationName,
    totalDistanceText,
    etaText,
    arrivalTime,
    progressPercent,
    currentStepIndex,
    isTracking,
    toggleTracking,
    positionError,
    offRoute,
    hasFix,
    isSimulated,
    simMultiplier,
    setSimMultiplier,
  } = useTripNavigation();

  const activeStepRef = useRef(null);

  useEffect(() => {
    activeStepRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentStepIndex]);

  return (
    <div>
      <div style={styles.tabStrip}>
        <div style={styles.tab}>🧭 Live Navigation</div>
      </div>

      {routeError && (
        <div style={styles.banner("#ef4444")}>⚠️ {routeError}</div>
      )}
      {positionError && (
        <div style={styles.banner("#f59e0b")}>📍 {positionError}</div>
      )}
      {offRoute && (
        <div style={styles.banner("#f59e0b")}>
          ↪️ Off route — showing distance back to the planned road
        </div>
      )}

      <div style={styles.statGrid}>
        {[
          { label: "Distance", value: totalDistanceText, icon: "📏" },
          { label: "ETA", value: etaText, icon: "🕐" },
          { label: "Arrival", value: arrivalTime, icon: "🏁" },
        ].map(({ label, value, icon }) => (
          <div key={label} style={styles.statCard}>
            <div style={styles.statLabel}>
              {icon} {label}
            </div>
            <div style={styles.statValue}>{value}</div>
          </div>
        ))}
      </div>

      {traffic && (
        <div style={styles.trafficRow(traffic.color)}>
          <span style={{ fontSize: "16px" }}>{traffic.icon}</span>
          <span style={{ color: traffic.color, fontWeight: "700", fontSize: "13px" }}>
            {traffic.label}
          </span>
          {traffic.delay > 0 && (
            <span style={styles.trafficDelay}>+{traffic.delay}% delay</span>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <button
          onClick={toggleTracking}
          disabled={loadingRoute}
          style={styles.trackButton(isTracking, loadingRoute)}
        >
          {isTracking ? (
            <>
              <span
                className="pulse-dot"
                style={{ background: "#22c55e", width: "8px", height: "8px" }}
              />
              {isSimulated ? "Simulating Drive" : "Live Tracking"}
            </>
          ) : (
            <>📍 {isSimulated ? "Start Simulated Drive" : "Start Tracking"}</>
          )}
        </button>
        <button
          onClick={refreshRoute}
          disabled={loadingRoute}
          style={styles.refreshButton(loadingRoute)}
        >
          {loadingRoute ? "⏳" : "🔄"}
        </button>
      </div>

      {isSimulated && (
        <div style={styles.simRow}>
          <span style={styles.simLabel}>Sim speed</span>
          {SIM_SPEED_PRESETS.map(({ label, multiplier }) => (
            <button
              key={label}
              onClick={() => setSimMultiplier(multiplier)}
              style={styles.simPreset(simMultiplier === multiplier)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginBottom: "14px" }}>
        <div style={styles.progressLabels}>
          <span>{shortName(originName)}</span>
          <span>{Math.round(progressPercent)}%</span>
          <span>{shortName(destinationName)}</span>
        </div>
        <div style={styles.progressTrack}>
          <div style={styles.progressFill(progressPercent)} />
        </div>
        {!hasFix && !loadingRoute && (
          <div style={styles.progressHint}>
            Progress updates once tracking starts.
          </div>
        )}
      </div>

      {pickupAddress && dropoffAddress && (
        <div style={{ marginBottom: "14px" }}>
          <TollAlerts pickup={pickupAddress} dropoff={dropoffAddress} />
        </div>
      )}

      {steps.length > 0 && (
        <div style={{ maxHeight: "180px", overflowY: "auto" }}>
          <div style={styles.stepsHeading}>📋 Turn-by-Turn ({steps.length} steps)</div>
          {steps.map((step, i) => {
            const isActive = hasFix && i === currentStepIndex;
            return (
              <div
                key={step.index}
                ref={isActive ? activeStepRef : null}
                style={styles.step(isActive, i < steps.length - 1)}
              >
                <span style={{ fontSize: "18px", flexShrink: 0, marginTop: "1px" }}>
                  {step.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.stepText(isActive)}>{step.instruction}</div>
                  <div style={styles.stepMeta}>
                    {step.distance} · {step.duration}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loadingRoute && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          Loading directions...
        </div>
      )}
    </div>
  );
}

function shortName(name) {
  return name?.split(",")[0] ?? "";
}

const styles = {
  tabStrip: {
    display: "flex",
    gap: "4px",
    marginBottom: "14px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "12px",
    padding: "4px",
  },
  tab: {
    flex: 1,
    padding: "8px 6px",
    borderRadius: "10px",
    background: "rgba(76,227,247,0.12)",
    color: "#4ce3f7",
    fontSize: "11px",
    fontWeight: "600",
    fontFamily: "Quicksand, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
  },
  banner: (color) => ({
    textAlign: "center",
    fontSize: "10px",
    color,
    marginBottom: "8px",
    padding: "6px",
    background: `${color}14`,
    border: `1px solid ${color}33`,
    borderRadius: "6px",
    lineHeight: 1.4,
  }),
  statGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
    marginBottom: "14px",
  },
  statCard: {
    padding: "10px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px",
    textAlign: "center",
  },
  statLabel: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  statValue: {
    fontSize: "14px",
    color: "#4ce3f7",
    fontWeight: "700",
    marginTop: "3px",
  },
  trafficRow: (color) => ({
    padding: "10px 15px",
    background: `${color}15`,
    border: `1px solid ${color}30`,
    borderRadius: "10px",
    marginBottom: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }),
  trafficDelay: {
    marginLeft: "auto",
    color: "rgba(255,255,255,0.5)",
    fontSize: "11px",
  },
  trackButton: (isTracking, disabled) => ({
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    border: `1px solid ${isTracking ? "rgba(34,197,94,0.4)" : "rgba(76,227,247,0.3)"}`,
    background: isTracking ? "rgba(34,197,94,0.1)" : "rgba(76,227,247,0.06)",
    color: isTracking ? "#22c55e" : "#4ce3f7",
    fontWeight: "700",
    fontSize: "12px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "Quicksand, sans-serif",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  }),
  refreshButton: (disabled) => ({
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    fontSize: "12px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "Quicksand, sans-serif",
    opacity: disabled ? 0.5 : 1,
  }),
  simRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "14px",
  },
  simLabel: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.35)",
    fontWeight: "600",
    textTransform: "uppercase",
    marginRight: "auto",
  },
  simPreset: (active) => ({
    padding: "4px 10px",
    borderRadius: "6px",
    border: `1px solid ${active ? "rgba(76,227,247,0.4)" : "rgba(255,255,255,0.1)"}`,
    background: active ? "rgba(76,227,247,0.12)" : "rgba(255,255,255,0.03)",
    color: active ? "#4ce3f7" : "rgba(255,255,255,0.4)",
    fontSize: "10px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "Quicksand, sans-serif",
  }),
  progressLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "10px",
    color: "rgba(255,255,255,0.35)",
    marginBottom: "4px",
  },
  progressTrack: {
    height: "6px",
    borderRadius: "3px",
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: (percent) => ({
    height: "100%",
    width: `${percent}%`,
    background: "linear-gradient(90deg, #0400ff, #4ce3f7)",
    borderRadius: "3px",
    transition: "width 0.5s ease",
  }),
  progressHint: {
    fontSize: "9px",
    color: "rgba(255,255,255,0.25)",
    marginTop: "4px",
    textAlign: "center",
  },
  stepsHeading: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
    marginBottom: "8px",
    textTransform: "uppercase",
  },
  step: (isActive, hasDivider) => ({
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "6px 8px",
    borderRadius: "8px",
    background: isActive ? "rgba(76,227,247,0.1)" : "transparent",
    borderBottom: hasDivider ? "1px solid rgba(255,255,255,0.04)" : "none",
  }),
  stepText: (isActive) => ({
    color: isActive ? "#4ce3f7" : "rgba(255,255,255,0.8)",
    fontSize: "11px",
    lineHeight: "1.4",
    fontWeight: isActive ? "700" : "400",
  }),
  stepMeta: {
    color: "rgba(255,255,255,0.3)",
    fontSize: "10px",
    marginTop: "2px",
  },
  loading: {
    textAlign: "center",
    padding: "30px",
    color: "rgba(255,255,255,0.4)",
  },
  spinner: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    border: "2px solid rgba(76,227,247,0.2)",
    borderTopColor: "#4ce3f7",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 10px",
  },
};
