// src/pages/admin/AdminEmergencyDashboard.jsx
import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

const T = {
  cyan: "#4ce3f7",
  red: "#ef4444",
  orange: "#f59e0b",
  green: "#22c55e",
  purple: "#a855f7",
  textSec: "rgba(255,255,255,0.4)",
};

// ── Priority calculation ────────────────────────────────────────────
// P1: unassigned + active + 5+ minutes old      → red, pulsing, sound
// P2: unassigned + active + <5 min, OR assigned + active + 15+ min old
// P3: assigned + active + recent, or resolved   → no urgency styling
function getPriority(event) {
  if (event.status === "resolved") return null;
  const created = event.createdAt instanceof Date ? event.createdAt : new Date(event.createdAt);
  const ageMin = (Date.now() - created.getTime()) / 60000;
  const assigned = !!event.assignedTo;

  if (!assigned && ageMin >= 5) return "P1";
  if (!assigned && ageMin < 5) return "P2";
  if (assigned && ageMin >= 15) return "P2";
  return "P3";
}

const PRIORITY_META = {
  P1: { label: "P1 · URGENT",   color: T.red,    bg: "rgba(239,68,68,.15)",  border: "rgba(239,68,68,.5)"  },
  P2: { label: "P2 · ATTENTION", color: T.orange, bg: "rgba(245,158,11,.12)", border: "rgba(245,158,11,.4)" },
  P3: { label: "P3 · ASSIGNED",  color: T.cyan,   bg: "rgba(76,227,247,.1)",  border: "rgba(76,227,247,.3)" },
};

// ── Simple beep via Web Audio API (no asset files needed) ────────────
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch (_) { /* AudioContext unavailable */ }
}

// ── Live "time ago" ticker ────────────────────────────────────────────
function useTick(intervalMs = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m ago`;
}

export default function AdminEmergencyDashboard() {
  const [emergencyEvents, setEmergencyEvents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, active, resolved
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const lastBeepRef = useRef(0);

  // Tick every second so "time ago" + priority recompute live
  useTick(1000);

  useEffect(() => {
    const q = query(collection(db, "emergency_events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
      }));
      setEmergencyEvents(events);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load admin team members for the assign dropdown
  useEffect(() => {
    getDocs(collection(db, "admins"))
      .then(snap => setAdmins(snap.docs.map(d => ({ email: d.id, ...d.data() }))))
      .catch(err => console.error("Failed to load admins:", err));
  }, []);

  const handleMarkResolved = async (eventId) => {
    await updateDoc(doc(db, "emergency_events", eventId), {
      status: "resolved",
      resolvedAt: new Date(),
    });
  };

  const handleAssign = async (eventId, adminEmail) => {
    setAssigningId(eventId);
    try {
      await updateDoc(doc(db, "emergency_events", eventId), {
        assignedTo: adminEmail || null,
        assignedAt: adminEmail ? new Date() : null,
      });
    } finally {
      setAssigningId(null);
    }
  };

  const filteredEvents = emergencyEvents.filter(event => {
    if (filter === "active") return event.status !== "resolved";
    if (filter === "resolved") return event.status === "resolved";
    return true;
  });

  // Sort: P1 first, then P2, then P3, then resolved — newest within each group
  const PRIORITY_RANK = { P1: 0, P2: 1, P3: 2, null: 3 };
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const pa = PRIORITY_RANK[getPriority(a)];
    const pb = PRIORITY_RANK[getPriority(b)];
    if (pa !== pb) return pa - pb;
    return b.createdAt - a.createdAt;
  });

  const activeCount = emergencyEvents.filter(e => e.status !== "resolved").length;
  const p1Events = emergencyEvents.filter(e => getPriority(e) === "P1");
  const p1Count = p1Events.length;

  // Sound alert loop — beep every 8s while any P1 alert exists and sound is on
  useEffect(() => {
    if (!soundEnabled || p1Count === 0) return;
    const beepNow = () => {
      playBeep();
      lastBeepRef.current = Date.now();
    };
    beepNow();
    const id = setInterval(beepNow, 8000);
    return () => clearInterval(id);
  }, [soundEnabled, p1Count]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: T.textSec }}>
        <div style={{ width: "30px", height: "30px", margin: "0 auto", border: "2px solid rgba(76,227,247,.2)", borderTopColor: T.cyan, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes p1pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.45); border-color: rgba(239,68,68,0.6); }
          50%      { box-shadow: 0 0 0 8px rgba(239,68,68,0);    border-color: rgba(239,68,68,0.9); }
        }
      `}</style>

      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: "800", color: "#fff" }}>
            🚨 Emergency Monitoring
          </h2>
          <p style={{ margin: 0, color: T.textSec, fontSize: "13px" }}>
            {activeCount} active emergency event{activeCount !== 1 ? "s" : ""}
            {p1Count > 0 && (
              <span style={{ color: T.red, fontWeight: "700", marginLeft: "8px" }}>
                · {p1Count} P1 unassigned 5+ min
              </span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(p => !p)}
            title={soundEnabled ? "Disable P1 sound alerts" : "Enable P1 sound alerts"}
            style={{
              padding: "8px 14px",
              borderRadius: "20px",
              background: soundEnabled ? "rgba(239,68,68,.15)" : "rgba(255,255,255,.05)",
              border: soundEnabled ? `1px solid ${T.red}` : "1px solid rgba(255,255,255,.1)",
              color: soundEnabled ? T.red : T.textSec,
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "700",
            }}
          >
            {soundEnabled ? "🔔 Sound On" : "🔕 Sound Off"}
          </button>

          {[
            { id: "all", label: "All Events" },
            { id: "active", label: "Active", badge: activeCount },
            { id: "resolved", label: "Resolved" },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                background: filter === opt.id ? `${T.red}20` : "rgba(255,255,255,.05)",
                border: filter === opt.id ? `1px solid ${T.red}` : "1px solid rgba(255,255,255,.1)",
                color: filter === opt.id ? T.red : T.textSec,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                position: "relative",
              }}
            >
              {opt.label}
              {opt.badge > 0 && (
                <span style={{
                  position: "absolute", top: "-4px", right: "-4px",
                  background: T.red, color: "#fff", borderRadius: "50%",
                  minWidth: "16px", height: "16px", fontSize: "10px", padding: "0 4px",
                }}>
                  {opt.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {sortedEvents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px", background: "rgba(255,255,255,.02)", borderRadius: "20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "10px" }}>🆗</div>
          <h3 style={{ color: "#fff", marginBottom: "5px" }}>No Emergency Events</h3>
          <p style={{ color: T.textSec, fontSize: "13px" }}>All clear! No active emergencies.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sortedEvents.map(event => {
            const priority = getPriority(event);
            const pMeta = priority ? PRIORITY_META[priority] : null;
            const isP1 = priority === "P1";

            return (
              <div
                key={event.id}
                style={{
                  background: "linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",
                  border: `1px solid ${event.status === "resolved" ? "rgba(34,197,94,.2)" : pMeta ? pMeta.border : T.red + "40"}`,
                  borderRadius: "16px",
                  padding: "20px",
                  transition: "all .3s ease",
                  animation: isP1 ? "p1pulse 1.4s ease-in-out infinite" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "24px" }}>🚨</span>
                      <h3 style={{ margin: 0, color: "#fff", fontSize: "16px", fontWeight: "700" }}>
                        SOS Alert
                      </h3>
                      <span style={{
                        padding: "4px 10px", borderRadius: "20px",
                        background: event.status === "resolved" ? "rgba(34,197,94,.15)" : `${T.red}20`,
                        color: event.status === "resolved" ? T.green : T.red,
                        fontSize: "10px", fontWeight: "700",
                      }}>
                        {event.status === "resolved" ? "RESOLVED" : "ACTIVE"}
                      </span>
                      {pMeta && (
                        <span style={{
                          padding: "4px 10px", borderRadius: "20px",
                          background: pMeta.bg, color: pMeta.color,
                          fontSize: "10px", fontWeight: "800", letterSpacing: "0.04em",
                        }}>
                          {pMeta.label}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: T.textSec, fontSize: "12px" }}>
                      User ID: {event.userId?.slice(-8)} • {timeAgo(event.createdAt)}
                    </p>
                    {event.bookingId && (
                      <p style={{ margin: "4px 0 0", color: T.cyan, fontSize: "11px" }}>
                        Booking: #{event.bookingId.slice(-8)}
                      </p>
                    )}
                    {event.assignedTo && (
                      <p style={{ margin: "4px 0 0", color: T.purple, fontSize: "11px" }}>
                        👤 Assigned to: {event.assignedTo}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    {event.status !== "resolved" && (
                      <select
                        value={event.assignedTo || ""}
                        onChange={(e) => handleAssign(event.id, e.target.value)}
                        disabled={assigningId === event.id}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "rgba(255,255,255,.05)",
                          border: "1px solid rgba(255,255,255,.15)",
                          color: "#fff",
                          fontSize: "12px",
                          cursor: assigningId === event.id ? "not-allowed" : "pointer",
                        }}
                      >
                        <option value="">— Unassigned —</option>
                        {admins.map(a => (
                          <option key={a.email} value={a.email}>{a.email}</option>
                        ))}
                      </select>
                    )}

                    {event.status !== "resolved" && (
                      <button
                        onClick={() => handleMarkResolved(event.id)}
                        style={{
                          padding: "8px 16px",
                          background: "rgba(34,197,94,.1)",
                          border: "1px solid rgba(34,197,94,.3)",
                          borderRadius: "8px",
                          color: T.green,
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Mark Resolved ✓
                      </button>
                    )}
                  </div>
                </div>

                {event.location && (
                  <div style={{ padding: "12px", background: "rgba(255,255,255,.02)", borderRadius: "10px", marginBottom: "12px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "11px", color: T.textSec }}>📍 Location</p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#fff", fontFamily: "monospace" }}>
                        {event.location.lat?.toFixed(6)}, {event.location.lng?.toFixed(6)}
                      </p>
                      <a
                        href={`https://maps.google.com/?q=${event.location.lat},${event.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: T.cyan, fontSize: "11px", marginTop: "6px", display: "inline-block" }}
                      >
                        Open in Maps →
                      </a>
                    </div>
                  )}
                </div>
            );
          })}
        </div>
      )}
    </div>
  );
}