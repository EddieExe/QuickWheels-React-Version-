// src/pages/admin/SystemMonitoring.jsx
import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  purple: "#a855f7",
  darkPurple: "#7c3aed",
  textSec: "rgba(255,255,255,0.4)",
};

const LEVEL_TABS = ["all", "info", "warn", "error"];

export default function SystemMonitoring() {
  const [systemLogs, setSystemLogs] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [failedJobs, setFailedJobs] = useState([]);
  const [deadLetterJobs, setDeadLetterJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("system");
  const [levelFilter, setLevelFilter] = useState("all");
  const [notification, setNotification] = useState(null);
  const [resurrecting, setResurrecting] = useState(null);

  // ── ALL FOUR FIRESTORE STREAMS ARE LIVE (onSnapshot) ──────────────────
  useEffect(() => {
    const unsubSystem = onSnapshot(
      query(collection(db, "system_logs"), orderBy("timestamp", "desc"), limit(100)),
      (snapshot) => setSystemLogs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => {
        console.error("Error fetching system logs:", error);
        showNotification("Error fetching system logs", "error");
      }
    );

    const unsubEmail = onSnapshot(
      query(collection(db, "email_logs"), orderBy("sentAt", "desc"), limit(100)),
      (snapshot) => {
        setEmailLogs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching email logs:", error);
        showNotification("Error fetching email logs", "error");
        setLoading(false);
      }
    );

    const unsubFailed = onSnapshot(
      query(
        collection(db, "email_queue"),
        where("sent", "==", false),
        orderBy("createdAt", "desc")
      ),
      (snapshot) => setFailedJobs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => {
        console.error("Error fetching failed jobs:", error);
        showNotification("Error fetching failed jobs", "error");
      }
    );

    const unsubDlq = onSnapshot(
      query(collection(db, "dead_letter_queue"), orderBy("failedAt", "desc"), limit(50)),
      (snapshot) => setDeadLetterJobs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => {
        console.error("Error fetching dead letter queue:", error);
        showNotification("Error fetching dead letter queue", "error");
      }
    );

    return () => {
      unsubSystem();
      unsubEmail();
      unsubFailed();
      unsubDlq();
    };
  }, []);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const resurrectEmail = async (job) => {
    setResurrecting(job.id);
    try {
      await addDoc(collection(db, "email_queue"), {
        to: job.to,
        type: job.type,
        bookingId: job.bookingId,
        carModel: job.carModel,
        userName: job.userName,
        pickup: job.pickup,
        dropoff: job.dropoff,
        pickupDate: job.pickupDate,
        dropoffDate: job.dropoffDate,
        total: job.total,
        createdAt: serverTimestamp(),
        sent: false,
        retryCount: 0,
      });
      await deleteDoc(doc(db, "dead_letter_queue", job.id));
      showNotification("Email re-queued for delivery", "success");
    } catch (error) {
      console.error("Resurrect failed:", error);
      showNotification("Failed to re-queue: " + error.message, "error");
    } finally {
      setResurrecting(null);
    }
  };

  const retryEmail = async (jobId) => {
    try {
      await updateDoc(doc(db, "email_queue", jobId), {
        sent: false,
        retryCount: 0,
        retriedAt: new Date(),
      });
      showNotification("Retry triggered successfully", "success");
    } catch (error) {
      console.error("Retry failed:", error);
      showNotification("Failed to trigger retry: " + error.message, "error");
    }
  };

  const getLogColor = (level) => {
    switch (level) {
      case "error": return T.red;
      case "warn": return T.orange;
      case "info": return T.purple;
      default: return T.textSec;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "—";
    if (typeof timestamp?.toDate === "function") return timestamp.toDate().toLocaleString();
    if (timestamp instanceof Date) return timestamp.toLocaleString();
    return "—";
  };

  const timeAgo = (timestamp) => {
    const d = typeof timestamp?.toDate === "function" ? timestamp.toDate() : timestamp instanceof Date ? timestamp : null;
    if (!d) return "—";
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  };

  const lastSweep = useMemo(
    () => systemLogs.find((l) => l.message?.startsWith("Global automation sweep completed")),
    [systemLogs]
  );

  const errorCount = useMemo(
    () => systemLogs.filter((l) => l.level === "error").length,
    [systemLogs]
  );

  const deliveredCount = useMemo(
    () => emailLogs.filter((l) => l.success === true).length,
    [emailLogs]
  );
  const notDeliveredCount = useMemo(
    () => emailLogs.filter((l) => l.success === false).length,
    [emailLogs]
  );
  const successRate = useMemo(
    () => (emailLogs.length > 0 ? Math.round((deliveredCount / emailLogs.length) * 1000) / 10 : 0),
    [emailLogs, deliveredCount]
  );

  const filteredSystemLogs = useMemo(
    () => levelFilter === "all" ? systemLogs : systemLogs.filter((l) => l.level === levelFilter),
    [systemLogs, levelFilter]
  );

  // Single consolidated KPI set — every card is live Firestore data.
  const kpiCards = [
    {
      id: "transmitted",
      label: "TRANSMITTED MAIL",
      value: emailLogs.length,
      sub: "Total dispatch attempts",
      color: T.purple,
      border: "rgba(168,85,247,0.15)",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
    {
      id: "delivered",
      label: "DELIVERED",
      value: deliveredCount,
      sub: `${successRate}% success rate`,
      color: T.green,
      border: "rgba(34,197,94,0.15)",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
    },
    {
      id: "notdelivered",
      label: "NOT DELIVERED",
      value: notDeliveredCount,
      sub: "Failed deliveries",
      color: T.red,
      border: `rgba(239,68,68,${notDeliveredCount > 0 ? 0.25 : 0.1})`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      ),
    },
    {
      id: "pending",
      label: "PENDING QUEUE",
      value: failedJobs.length,
      sub: "Awaiting retry",
      color: T.orange,
      border: `rgba(245,158,11,${failedJobs.length > 0 ? 0.25 : 0.1})`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.orange} strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      id: "exceptions",
      label: "RUNTIME EXCEPTIONS",
      value: errorCount,
      sub: "Last 100 log items",
      color: T.red,
      border: `rgba(239,68,68,${errorCount > 0 ? 0.25 : 0.1})`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
    },
    {
      id: "dlq",
      label: "DEAD LETTER (DLQ)",
      value: deadLetterJobs.length,
      sub: "Permanent drops",
      color: T.red,
      border: `rgba(239,68,68,${deadLetterJobs.length > 0 ? 0.3 : 0.1})`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      ),
    },
    {
      id: "cron",
      label: "CRON AUTOMATION",
      value: lastSweep ? timeAgo(lastSweep.timestamp) : "Stale / Inactive",
      sub: lastSweep?.details?.total !== undefined ? `${lastSweep.details.total} nodes audited` : "Waiting telemetry run",
      color: T.purple,
      border: `rgba(168,85,247,${lastSweep ? 0.2 : 0.1})`,
      isText: true,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={lastSweep ? T.purple : "rgba(255,255,255,0.25)"} strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      ),
    },
  ];

  const NAV_ITEMS = [
    {
      id: "email",
      label: "Email History",
      shortLabel: "Email",
      count: emailLogs.length,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
    {
      id: "failed",
      label: "Failed Outbound",
      shortLabel: "Failed",
      count: failedJobs.length,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      id: "dlq",
      label: "Dead Letter Vault",
      shortLabel: "Dead Letter",
      count: deadLetterJobs.length,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      ),
    },
    {
      id: "system",
      label: "Core Engine Logs",
      shortLabel: "Core Logs",
      count: systemLogs.length,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        color: "#f8fafc",
        fontFamily: "'Quicksand', -apple-system, sans-serif",
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }

        @keyframes toastIn {
          from { transform: translateY(-20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes dataFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .premium-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .premium-scroll::-webkit-scrollbar-track { background: transparent; }
        .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.06); border-radius: 10px; }
        .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }

        .nav-item-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        .nav-item-btn:hover {
          color: #fff !important;
          background: rgba(255,255,255,0.02) !important;
        }

        .action-hover-btn { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
        .action-hover-btn:hover { transform: translateY(-1px); filter: brightness(1.15); }

        /* Glass morphism KPI cards */
        .kpi-glass-card {
          background: rgba(255, 255, 255, 0.03) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border-radius: 16px !important;
          padding: 20px 18px !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
          min-width: 0 !important;
        }
        .kpi-glass-card:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          transform: translateY(-2px) !important;
          border-color: rgba(168, 85, 247, 0.3) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25), 0 0 20px rgba(168, 85, 247, 0.05) !important;
        }

        /* Glass morphism log cards */
        .log-glass-card {
          background: rgba(255, 255, 255, 0.02) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
          border-radius: 14px !important;
          padding: 16px 20px !important;
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
          min-width: 0 !important;
          max-width: 100% !important;
          overflow-wrap: anywhere !important;
        }
        .log-glass-card:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(168, 85, 247, 0.15) !important;
          transform: translateX(2px) !important;
        }

        /* ══════════════════════════════════════════════
           TWO-COLUMN NAV + CONTENT LAYOUT (desktop base)
        ══════════════════════════════════════════════ */
        .system-monitoring-tabs {
          display: flex;
          gap: 24px;
          min-height: 0;
          width: 100%;
          max-width: 100%;
          align-items: flex-start;
        }

        .telemetry-tabs-wrapper {
          width: 220px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 20px;
          padding: 16px 12px;
          box-sizing: border-box;
        }

        .telemetry-tabs-title {
          text-align: center;
          padding: 0 12px 10px 12px;
          font-size: 11px;
          font-weight: 800;
          color: rgba(255,255,255,0.4);
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .telemetry-tabs-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }

        .telemetry-tab-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          width: 100%;
          text-align: left;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }

        .telemetry-tab-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          flex-shrink: 0;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .telemetry-tab-label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          letter-spacing: 0.3px;
          transition: color 0.25s ease;
        }

        .telemetry-tab-count {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.3px;
          min-width: 22px;
          text-align: right;
          flex-shrink: 0;
        }

        .tab-content-container {
          flex: 1;
          min-width: 0;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          max-height: 600px;
          padding-right: 4px;
        }

        /* ══════════════════════════════════════════════
           MOBILE (≤768px) — stack nav above content,
           keep the nav as a compact full-width vertical
           list instead of a fixed 220px sidebar column.
        ══════════════════════════════════════════════ */
        @media (max-width: 768px) {
          .system-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .system-kpi-grid > div {
            padding: 14px 12px !important;
          }
          .system-kpi-grid > div > div:first-child span {
            font-size: 9px !important;
          }
          .system-kpi-grid > div > div:last-child div:first-child {
            font-size: 20px !important;
          }
          .system-kpi-grid > div > div:last-child div:last-child {
            font-size: 9px !important;
          }
          .system-kpi-grid > div svg {
            width: 16px !important;
            height: 16px !important;
          }

          .system-monitoring-tabs {
            flex-direction: column !important;
            gap: 14px !important;
            width: 100% !important;
          }

          .telemetry-tabs-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            flex-shrink: 1 !important;
            padding: 10px !important;
            border-radius: 14px !important;
          }

          .telemetry-tabs-title {
            text-align: left !important;
            padding: 0 4px 8px !important;
            font-size: 10px !important;
          }

          .telemetry-tabs-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
          }

          .telemetry-tab-btn {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
            padding: 10px !important;
            border-left: none !important;
            border: 1px solid rgba(255,255,255,0.05) !important;
          }

          .telemetry-tab-btn.active {
            border-color: rgba(168,85,247,0.35) !important;
          }

          .telemetry-tab-row {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
          }

          .telemetry-tab-icon {
            width: 24px !important;
            height: 24px !important;
          }
          .telemetry-tab-icon svg {
            width: 12px !important;
            height: 12px !important;
          }

          .telemetry-tab-label {
            font-size: 11px !important;
            white-space: normal !important;
          }

          .telemetry-tab-count {
            font-size: 14px !important;
            min-width: auto !important;
          }

          .tab-content-container {
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow-y: visible !important;
            overflow-x: hidden !important;
            padding-right: 0 !important;
          }

          .level-filter-tabs {
            flex-wrap: wrap !important;
            gap: 4px !important;
          }
          .level-filter-tabs button {
            padding: 4px 10px !important;
            font-size: 9px !important;
          }

          .log-glass-card {
            padding: 12px 14px !important;
          }

          .stale-sweep-bar {
            padding: 10px 14px !important;
          }
          .stale-sweep-bar p {
            font-size: 10px !important;
          }

          /* Failed / DLQ job cards: stack action button under details */
          .job-action-card {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .job-action-card button {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        @media (max-width: 480px) {
          .system-kpi-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .system-kpi-grid > div {
            padding: 10px 10px !important;
          }
          .system-kpi-grid > div > div:last-child div:first-child {
            font-size: 16px !important;
          }
          .system-kpi-grid > div svg {
            width: 14px !important;
            height: 14px !important;
          }

          .telemetry-tabs-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 5px !important;
          }
          .telemetry-tab-btn {
            padding: 8px !important;
          }
          .telemetry-tab-label {
            font-size: 10px !important;
          }
          .telemetry-tab-count {
            font-size: 12px !important;
          }
        }
      `}</style>

      {/* Global Toast Notification */}
      {notification && (
        <div
          className="system-toast"
          style={{
            position: "fixed",
            top: "24px",
            right: "32px",
            padding: "14px 24px",
            borderRadius: "14px",
            background: notification.type === "error" ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "linear-gradient(135deg, #10b981, #059669)",
            color: "#fff",
            fontSize: "13px",
            fontWeight: "700",
            zIndex: 1100,
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            maxWidth: "calc(100vw - 24px)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          {notification.message}
        </div>
      )}

      {/* ── SINGLE CONSOLIDATED KPI ROW — with glass morphism and hover effects ── */}
      <div
        className="system-kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
          width: "100%",
        }}
      >
        {kpiCards.map((metric) => (
          <div
            key={metric.id}
            className="kpi-glass-card"
            style={{
              borderColor: metric.border,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: metric.color, letterSpacing: "1px" }}>
                {metric.label}
              </span>
              {metric.icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: metric.isText ? "20px" : "28px",
                  fontWeight: "800",
                  color: metric.value !== 0 && metric.value !== "Stale / Inactive" ? metric.color : "rgba(255,255,255,0.5)",
                  letterSpacing: "-0.5px",
                }}
              >
                {metric.value}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                {metric.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* STALE SWEEP INFOBAR */}
      {!lastSweep && (
        <div
          className="stale-sweep-bar"
          style={{
            padding: "14px 18px", borderRadius: "14px", marginBottom: "20px",
            background: "rgba(245,158,11,0.02)", border: "1px solid rgba(245,158,11,0.12)",
            display: "flex", alignItems: "center", gap: "12px", flexShrink: 0
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.orange} strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <p style={{ margin: 0, color: "rgba(245,158,11,0.85)", fontSize: "12.5px", fontWeight: "600" }}>
            No platform automation sweeps recorded. Initialize an execution inside Status Automation dashboards or standby for standard incoming workflow updates.
          </p>
        </div>
      )}

      {/* TWO-COLUMN LAYOUT: left nav tabs + right content — stacks on mobile via CSS above */}
      <div className="system-monitoring-tabs">

        {/* NAV TABS */}
        <div className="telemetry-tabs-wrapper">
          <div className="telemetry-tabs-title">
            Telemetry Scopes
          </div>

          <div className="telemetry-tabs-grid">
            {NAV_ITEMS.map(({ id, label, shortLabel, count, icon }) => {
              const isActive = activeTab === id;
              const activeColor = T.purple;

              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`nav-item-btn telemetry-tab-btn${isActive ? " active" : ""}`}
                  style={{
                    background: isActive ? `rgba(168,85,247,0.08)` : "transparent",
                    borderLeft: isActive ? `3px solid ${activeColor}` : "3px solid transparent",
                    color: isActive ? activeColor : "rgba(255,255,255,0.5)",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                    }
                  }}
                >
                  <div className="telemetry-tab-row">
                    {/* Icon */}
                    <div className="telemetry-tab-icon" style={{
                      background: isActive ? `rgba(168,85,247,0.12)` : "rgba(255,255,255,0.03)",
                      color: isActive ? activeColor : "rgba(255,255,255,0.3)",
                    }}>
                      {icon}
                    </div>
                  </div>

                  {/* Label */}
                  <span className="telemetry-tab-label" style={{
                    color: isActive ? activeColor : "rgba(255,255,255,0.5)",
                    fontWeight: isActive ? "700" : "600",
                  }}>
                    {label}
                  </span>

                  {/* Count */}
                  <span className="telemetry-tab-count" style={{
                    color: isActive ? activeColor : "rgba(255,255,255,0.3)",
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB CONTENT (right on desktop, below on mobile) */}
        <div className="tab-content-container premium-scroll">

          {/* LOGIC ROUTER VIEWPORT: SYSTEM RUNTIME STREAM */}
          {activeTab === "system" && (
            <div style={{ animation: "dataFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
              <div className="level-filter-tabs" style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
                {LEVEL_TABS.map((lvl) => {
                  const isActive = levelFilter === lvl;
                  const color = lvl === "all" ? T.purple : getLogColor(lvl);
                  return (
                    <button
                      key={lvl}
                      onClick={() => setLevelFilter(lvl)}
                      style={{
                        padding: "6px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", fontFamily: "inherit", transition: "all 0.2s ease",
                        background: isActive ? `${color}15` : "rgba(255,255,255,0.01)",
                        border: isActive ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.05)",
                        color: isActive ? color : "rgba(255,255,255,0.4)"
                      }}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredSystemLogs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 40px", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: "20px" }}>
                    <p style={{ color: T.textSec, margin: 0, fontSize: "14px" }}>No validation/diagnostic traces found matching the current sub-level threshold.</p>
                  </div>
                ) : (
                  filteredSystemLogs.map((log) => (
                    <div
                      key={log.id}
                      className="log-glass-card"
                      style={{
                        borderLeft: `4px solid ${getLogColor(log.level)}`
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                        <span style={{ color: getLogColor(log.level), fontWeight: "800", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>
                          [{log.level || "LOG"}]
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <div style={{ color: "#fff", fontSize: "13.5px", fontWeight: "500", lineHeight: "1.5" }}>
                        {log.message}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre
                          style={{
                            margin: "12px 0 0 0", padding: "12px 16px", borderRadius: "10px", background: "rgba(0,0,0,0.15)",
                            color: "rgba(168,85,247,0.75)", fontSize: "11px", fontFamily: "monospace", overflowX: "auto",
                            border: "1px solid rgba(255,255,255,0.02)", maxWidth: "100%"
                          }}
                        >
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* LOGIC ROUTER VIEWPORT: DISPATCHED HISTORICAL LIST */}
          {activeTab === "email" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", animation: "dataFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
              {emailLogs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 40px", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: "20px" }}>
                  <p style={{ color: T.textSec, margin: 0, fontSize: "14px" }}>No transactional mailing records located inside history parameters.</p>
                </div>
              ) : (
                emailLogs.map((log) => (
                  <div
                    key={log.id}
                    className="log-glass-card"
                    style={{
                      borderLeft: `4px solid ${log.success ? T.green : T.red}`
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                      <span style={{ color: log.success ? T.green : T.red, fontWeight: "800", fontSize: "11px", letterSpacing: "1px" }}>
                        {log.success ? "PIPELINE_COMPLETE" : "PIPELINE_ERROR"}
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                        {formatTimestamp(log.sentAt || log.timestamp)}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ color: "#fff", fontSize: "14px", fontWeight: "600" }}>
                        To: <span style={{ fontWeight: "400", color: "rgba(255,255,255,0.75)" }}>{log.to}</span>
                      </div>
                      <div style={{ color: T.purple, fontSize: "12px", fontWeight: "700" }}>
                        Schema Descriptor: {log.type}
                      </div>
                    </div>
                    {log.error && (
                      <div style={{ color: T.red, fontSize: "12px", background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.1)", padding: "12px", borderRadius: "10px", marginTop: "12px", fontFamily: "monospace", wordBreak: "break-word" }}>
                        Exception: {log.error}
                      </div>
                    )}
                    {log.retryCount !== undefined && (
                      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: "10px", fontWeight: "700", marginTop: "10px", letterSpacing: "0.5px" }}>
                        Total Delivery Iterations Executed: {log.retryCount}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* LOGIC ROUTER VIEWPORT: OUTBOUND RETRY DISPATCH PANEL */}
          {activeTab === "failed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", animation: "dataFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
              {failedJobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 40px", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: "20px" }}>
                  <p style={{ color: T.textSec, margin: 0, fontSize: "14px" }}>No operational failures currently blocking active queues.</p>
                </div>
              ) : (
                failedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="log-glass-card job-action-card"
                    style={{
                      border: `1px solid rgba(245,158,11,0.15)`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "20px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
                      <div>
                        <div style={{ fontWeight: "700", color: "#fff", fontSize: "14.5px", wordBreak: "break-word" }}>Target: {job.to}</div>
                        <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>Template Model: {job.type}</div>
                      </div>
                      {job.carModel && (
                        <div style={{ fontSize: "11px", color: T.purple, fontWeight: "700", textTransform: "uppercase" }}>
                          Hardware Element: {job.carModel}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "16px", marginTop: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>Registered: {formatTimestamp(job.createdAt)}</span>
                        {job.retriedAt && <span style={{ fontSize: "11px", color: T.orange }}>Dispatched Trace: {formatTimestamp(job.retriedAt)}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => retryEmail(job.id)}
                      className="action-hover-btn"
                      style={{
                        padding: "10px 18px", background: "rgba(168,85,247,0.08)", border: `1px solid ${T.purple}`, borderRadius: "10px", color: T.purple,
                        fontWeight: "700", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px", fontFamily: "inherit",
                        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)", flexShrink: 0,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = "rgba(168,85,247,0.16)";
                        e.currentTarget.style.borderColor = T.darkPurple;
                        e.currentTarget.style.color = "#c084fc";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(168,85,247,0.15)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = "rgba(168,85,247,0.08)";
                        e.currentTarget.style.borderColor = T.purple;
                        e.currentTarget.style.color = T.purple;
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                      Re-Fire Process
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* LOGIC ROUTER VIEWPORT: DEAD LETTER STORAGE PROTOCOL */}
          {activeTab === "dlq" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", animation: "dataFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
              {deadLetterJobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "80px 40px", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: "20px" }}>
                  <p style={{ color: T.green, margin: 0, fontSize: "14px", fontWeight: "600" }}>Vault clean. Zero terminal exceptions preserved in storage arrays.</p>
                </div>
              ) : (
                <>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12.5px", margin: "0 0 -4px 4px", lineHeight: "1.5" }}>
                    The items below have exhausted all automated system recovery logic sequences. Direct override bypass will force initialization variables directly back to standard operational pipelines.
                  </p>
                  {deadLetterJobs.map((job) => (
                    <div
                      key={job.id}
                      className="log-glass-card job-action-card"
                      style={{
                        border: `1px solid rgba(239,68,68,0.18)`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        gap: "24px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: 0 }}>
                        <div>
                          <div style={{ fontWeight: "700", color: "#fff", fontSize: "14.5px", wordBreak: "break-word" }}>Recipient Reference: {job.to}</div>
                          <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>Channel Context: {job.type}</div>
                        </div>
                        {job.carModel && (
                          <div style={{ fontSize: "11px", color: T.purple, fontWeight: "700" }}>
                            Linked Construct: {job.carModel}
                          </div>
                        )}
                        <div style={{ color: T.red, fontSize: "12px", background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.1)", padding: "12px", borderRadius: "10px", marginTop: "6px", fontFamily: "monospace", width: "100%", boxSizing: "border-box", wordBreak: "break-word" }}>
                          Terminal Storage Context: {job.error || "System process thread hardware execution drop exception"}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "4px" }}>
                          Hard Drop Record Instance: {formatTimestamp(job.failedAt)}
                        </div>
                      </div>
                      <button
                        onClick={() => resurrectEmail(job)}
                        disabled={resurrecting === job.id}
                        className="action-hover-btn"
                        style={{
                          padding: "10px 18px", background: "rgba(34,197,94,0.08)", border: `1px solid ${T.green}`, borderRadius: "10px", color: T.green,
                          fontWeight: "700", cursor: resurrecting === job.id ? "not-allowed" : "pointer", fontSize: "12px",
                          opacity: resurrecting === job.id ? 0.6 : 1, display: "flex", alignItems: "center", gap: "8px", fontFamily: "inherit", flexShrink: 0,
                          transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                        onMouseEnter={e => {
                          if (resurrecting !== job.id) {
                            e.currentTarget.style.background = "rgba(34,197,94,0.16)";
                            e.currentTarget.style.borderColor = "#22c55e";
                            e.currentTarget.style.color = "#4ade80";
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(34,197,94,0.15)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (resurrecting !== job.id) {
                            e.currentTarget.style.background = "rgba(34,197,94,0.08)";
                            e.currentTarget.style.borderColor = T.green;
                            e.currentTarget.style.color = T.green;
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                        {resurrecting === job.id ? "Re-queuing Loop…" : "Resurrect Element"}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}