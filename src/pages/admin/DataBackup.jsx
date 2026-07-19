// src/pages/admin/DataBackup.jsx
import { useState, useEffect } from "react";
import { 
  collection, getDocs, writeBatch, doc, 
  query, limit, startAfter, orderBy 
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { PERMISSIONS, hasPermission } from "../../utils/adminUtils.jsx";
import PermissionGuard from "../../components/PermissionGuard";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  purple: "#a855f7",
  darkPurple: "#7c3aed",
  textSec: "rgba(255,255,255,0.4)",
};

const COLLECTIONS = [
  { 
    id: "bookings", 
    name: "Bookings", 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ) 
  },
  { 
    id: "users", 
    name: "Users", 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ) 
  },
  { 
    id: "dealers", 
    name: "Dealers", 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
        <line x1="9" y1="22" x2="9" y2="16"/>
        <line x1="15" y1="22" x2="15" y2="16"/>
        <line x1="9" y1="16" x2="15" y2="16"/>
        <path d="M8 6h8M8 10h8"/>
      </svg>
    ) 
  },
  { 
    id: "notifications", 
    name: "Notifications", 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ) 
  },
  { 
    id: "reviews", 
    name: "Reviews", 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ) 
  },
  { 
    id: "emergency_events", 
    name: "Emergency Events", 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ) 
  },
  { 
    id: "assistance_requests", 
    name: "Assistance Requests", 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ) 
  },
  { 
    id: "email_queue", 
    name: "Email Queue", 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ) 
  },
  { 
    id: "email_logs", 
    name: "Email Logs", 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ) 
  },
  { 
    id: "system_logs", 
    name: "System Logs", 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ) 
  },
  { 
    id: "admin_audit_logs", 
    name: "Audit Logs", 
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="M12 18v-4"/>
        <path d="M8 18v-2"/>
        <path d="M16 18v-6"/>
      </svg>
    ) 
  },
];

export default function DataBackup() {
  const { user, adminRole } = useAuth();
  const [backups, setBackups] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [backupName, setBackupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [collectionCounts, setCollectionCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    loadBackups();
    fetchCollectionCounts();
  }, []);

  const loadBackups = () => {
    const savedBackups = localStorage.getItem("quickwheels_backups");
    if (savedBackups) {
      setBackups(JSON.parse(savedBackups));
    }
    setLoading(false);
  };

  const fetchCollectionCounts = async () => {
    const counts = {};
    for (const col of COLLECTIONS) {
      try {
        const snapshot = await getDocs(collection(db, col.id));
        counts[col.id] = snapshot.size;
      } catch (error) {
        console.error(`Failed to count ${col.id}:`, error);
        counts[col.id] = 0;
      }
    }
    setCollectionCounts(counts);
  };

  const saveBackupToLocal = (backup) => {
    const updatedBackups = [backup, ...backups].slice(0, 20);
    localStorage.setItem("quickwheels_backups", JSON.stringify(updatedBackups));
    setBackups(updatedBackups);
  };

  const deleteBackup = (backupId) => {
    if (confirm("Delete this backup file?")) {
      const updatedBackups = backups.filter(b => b.id !== backupId);
      localStorage.setItem("quickwheels_backups", JSON.stringify(updatedBackups));
      setBackups(updatedBackups);
      showMessage("Backup deleted successfully", "success");
    }
  };

  const showMessage = (msg, type = "success") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000);
  };

  const fetchCollectionData = async (collectionName) => {
    const data = [];
    let lastDoc = null;
    const batchSize = 500;

    try {
      while (true) {
        let q;
        if (lastDoc) {
          q = query(
            collection(db, collectionName),
            orderBy("__name__"),
            startAfter(lastDoc),
            limit(batchSize)
          );
        } else {
          q = query(
            collection(db, collectionName),
            orderBy("__name__"),
            limit(batchSize)
          );
        }

        const snapshot = await getDocs(q);
        if (snapshot.empty) break;

        snapshot.docs.forEach(docSnap => {
          data.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < batchSize) break;
      }
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
    }

    return data;
  };

  const createBackup = async () => {
    if (selectedCollections.length === 0) {
      showMessage("Please select at least one collection to backup", "error");
      return;
    }
    if (!backupName.trim()) {
      showMessage("Please enter a backup name", "error");
      return;
    }

    setIsCreating(true);
    showMessage("Creating backup...", "success");

    try {
      const backupData = {};
      let totalRecords = 0;

      for (const collectionId of selectedCollections) {
        const data = await fetchCollectionData(collectionId);
        backupData[collectionId] = data;
        totalRecords += data.length;
      }

      const backup = {
        id: Date.now().toString(),
        name: backupName,
        createdAt: new Date().toISOString(),
        createdBy: user?.email || "admin",
        collections: selectedCollections,
        totalRecords,
        data: backupData,
        size: JSON.stringify(backupData).length,
      };

      saveBackupToLocal(backup);
      setBackupName("");
      setSelectedCollections([]);
      showMessage(`Backup created successfully! ${totalRecords} records backed up.`, "success");
    } catch (error) {
      console.error("Backup failed:", error);
      showMessage("Backup failed: " + error.message, "error");
    } finally {
      setIsCreating(false);
    }
  };

  const downloadBackup = (backup) => {
    const dataStr = JSON.stringify(backup.data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${backup.name}_${new Date(backup.createdAt).toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage(`Downloaded ${backup.name}`, "success");
  };

  const restoreBackup = async (backup) => {
    if (!confirm(`Restoring will OVERWRITE existing data in ${backup.collections.join(", ")}. This cannot be undone. Continue?`)) {
      return;
    }

    setIsRestoring(true);
    showMessage("Restoring backup...", "success");

    try {
      for (const [collectionName, records] of Object.entries(backup.data)) {
        const colRef = collection(db, collectionName);

        const existingDocs = await getDocs(colRef);
        const deleteBatches = [];
        let currentBatch = writeBatch(db);
        let opCount = 0;

        existingDocs.docs.forEach(docSnap => {
          currentBatch.delete(docSnap.ref);
          opCount++;
          if (opCount === 500) {
            deleteBatches.push(currentBatch);
            currentBatch = writeBatch(db);
            opCount = 0;
          }
        });
        if (opCount > 0) deleteBatches.push(currentBatch);
        await Promise.all(deleteBatches.map(b => b.commit()));

        const restoreBatches = [];
        let restoreBatch = writeBatch(db);
        let restoreCount = 0;

        records.forEach(record => {
          const { id, ...data } = record;
          const docRef = doc(colRef, id);
          restoreBatch.set(docRef, data);
          restoreCount++;
          if (restoreCount === 500) {
            restoreBatches.push(restoreBatch);
            restoreBatch = writeBatch(db);
            restoreCount = 0;
          }
        });
        if (restoreCount > 0) restoreBatches.push(restoreBatch);
        await Promise.all(restoreBatches.map(b => b.commit()));
      }

      showMessage("Backup restored successfully! Refresh page to see changes.", "success");
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error("Restore failed:", error);
      showMessage("Restore failed: " + error.message, "error");
    } finally {
      setIsRestoring(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const toggleCollection = (collectionId) => {
    setSelectedCollections(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const selectAllCollections = () => {
    if (selectedCollections.length === COLLECTIONS.length) {
      setSelectedCollections([]);
    } else {
      setSelectedCollections(COLLECTIONS.map(c => c.id));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div style={{
          width: "32px", height: "32px", margin: "0 auto",
          border: "2px solid rgba(168,85,247,.2)",
          borderTopColor: T.purple, borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
      </div>
    );
  }

  return (
    <div className="backup-inner" style={{
      fontFamily: "'Quicksand', -apple-system, sans-serif",
      padding: "0 4px 20px 4px"
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .checkbox-container-grid {
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); 
          gap: 10px;
        }

        .ios-checkbox {
          --checkbox-size: 22px;
          --checkbox-color: ${T.purple};
          --checkbox-bg: rgba(168,85,247,0.1);
          --checkbox-border: rgba(255,255,255,0.15);

          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          cursor: pointer;
          user-select: none;
          transition: background 0.2s, border-color 0.2s;
        }

        .ios-checkbox input { display: none; }

        .checkbox-wrapper {
          position: relative;
          width: var(--checkbox-size);
          height: var(--checkbox-size);
          border-radius: 6px;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .checkbox-bg {
          position: absolute;
          inset: 0;
          border-radius: 6px;
          border: 2px solid var(--checkbox-border);
          background: rgba(255,255,255,0.03);
          transition: all 0.2s ease;
        }

        .checkbox-icon {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 80%;
          height: 80%;
          color: #111115;
          transform: scale(0);
          transition: all 0.2s ease;
        }

        .check-path {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          transition: stroke-dashoffset 0.3s ease 0.1s;
        }

        .ios-checkbox input:checked + .checkbox-wrapper .checkbox-bg {
          background: var(--checkbox-color);
          border-color: var(--checkbox-color);
        }

        .ios-checkbox input:checked + .checkbox-wrapper .checkbox-icon {
          transform: scale(1);
        }

        .ios-checkbox input:checked + .checkbox-wrapper .check-path {
          stroke-dashoffset: 0;
        }

        .ios-checkbox:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(168,85,247,0.2);
        }
        
        .ios-checkbox:hover .checkbox-wrapper {
          transform: scale(1.05);
        }

        .ios-checkbox:active .checkbox-wrapper {
          transform: scale(0.95);
        }

        .ios-checkbox input:focus + .checkbox-wrapper .checkbox-bg {
          box-shadow: 0 0 0 4px var(--checkbox-bg);
        }

        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .ios-checkbox input:checked + .checkbox-wrapper {
          animation: bounce 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Glass morphism for backup cards */
        .backup-create-card {
          background: rgba(255,255,255,0.02) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          border-radius: 16px !important;
          padding: 20px !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
        }
        .backup-create-card:hover {
          border-color: rgba(168,85,247,0.15) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 0 20px rgba(168,85,247,0.02) !important;
        }
        
        .backup-saved-card {
          background: rgba(255,255,255,0.02) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          border-radius: 16px !important;
          padding: 20px !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
        }
        .backup-saved-card:hover {
          border-color: rgba(168,85,247,0.15) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 0 20px rgba(168,85,247,0.02) !important;
        }
        
        .backup-item {
          background: rgba(255,255,255,0.02) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          border-radius: 10px !important;
          padding: 14px 16px !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
        }
        .backup-item:hover {
          background: rgba(255,255,255,0.04) !important;
          border-color: rgba(168,85,247,0.12) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15), 0 0 20px rgba(168,85,247,0.03) !important;
        }
      `}</style>

      {/* HEADER */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        paddingBottom: "16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: "20px"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(168,85,247,0.1)", padding: "8px", borderRadius: "10px",
          border: "1px solid rgba(168,85,247,0.2)"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
        </div>
        <div>
          <h2 style={{ margin: "0 0 2px", fontSize: "18px", fontWeight: "800", color: "#fff" }}>
            Data Backup & Restore
          </h2>
          <p style={{ margin: 0, color: T.textSec, fontSize: "12px" }}>
            Create backups of your data and restore when needed
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: "10px 14px",
          marginBottom: "16px",
          background: messageType === "success" ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)",
          border: `1px solid ${messageType === "success" ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}`,
          borderRadius: "8px",
          color: messageType === "success" ? T.green : T.red,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "12px"
        }}>
          {messageType === "success" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          )}
          {message}
        </div>
      )}

      {/* Create Backup Section */}
      <div className="backup-create-card">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: T.purple }}>
            Create New Backup
          </h3>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: T.textSec, fontSize: "11px", marginBottom: "6px", display: "block" }}>
            Backup Name
          </label>
          <input
            type="text"
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            placeholder="e.g., Weekly Backup - June 2024"
            style={{
              fontSize: "12px",
              width: "100%",
              maxWidth: "380px",
              padding: "10px 12px",
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: "8px",
              color: "#fff",
              fontFamily: "Quicksand",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onFocus={e => { e.target.style.borderColor = T.purple; e.target.style.boxShadow = `0 0 0 4px ${T.purple}10`; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,.1)"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <label style={{ color: T.textSec, fontSize: "11px" }}>Select Collections to Backup</label>
            <button
              onClick={selectAllCollections}
              style={{
                padding: "3px 10px",
                background: "rgba(168,85,247,.1)",
                border: "1px solid rgba(168,85,247,.3)",
                borderRadius: "5px",
                color: T.purple,
                cursor: "pointer",
                fontSize: "10px",
                fontFamily: "Quicksand",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(168,85,247,.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(168,85,247,.1)"; }}
            >
              {selectedCollections.length === COLLECTIONS.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="checkbox-container-grid">
            {COLLECTIONS.map(col => (
              <label key={col.id} className="ios-checkbox">
                <input
                  type="checkbox"
                  checked={selectedCollections.includes(col.id)}
                  onChange={() => toggleCollection(col.id)}
                />
                <div className="checkbox-wrapper">
                  <div className="checkbox-bg"></div>
                  <svg className="checkbox-icon" viewBox="0 0 24 24" fill="none">
                    <path
                      className="check-path"
                      d="M4 12L10 18L20 6"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </svg>
                </div>
                <span style={{ fontSize: "14px", display: "flex", alignItems: "center" }}>{col.icon}</span>
                <div style={{ flex: 1, paddingLeft: "2px" }}>
                  <div style={{ color: "#fff", fontSize: "12px", fontWeight: "500", lineHeight: "1.2" }}>{col.name}</div>
                  <div style={{ color: T.textSec, fontSize: "9px", marginTop: "2px" }}>{collectionCounts[col.id] || 0} records</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={createBackup}
          disabled={isCreating || selectedCollections.length === 0 || !backupName}
          className="btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          {isCreating ? "Creating Backup..." : "Create Backup"}
        </button>
      </div>

      {/* Saved Backups Section */}
      <div className="backup-saved-card" style={{ marginTop: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: T.purple }}>
            Saved Backups
          </h3>
        </div>

        {backups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px" }}>
            <p style={{ color: T.textSec, fontSize: "12px" }}>No backups created yet. Create your first backup above.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {backups.map(backup => (
              <div
                key={backup.id}
                className="backup-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px"
                }}
              >
                <div style={{ flex: 1, minWidth: "180px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.purple} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                    </svg>
                    <span style={{ fontWeight: "700", color: "#fff", fontSize: "13px" }}>{backup.name}</span>
                    <span style={{
                      padding: "1px 8px",
                      borderRadius: "10px",
                      fontSize: "9px",
                      background: "rgba(168,85,247,.1)",
                      color: T.purple,
                    }}>
                      {new Date(backup.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: T.textSec }}>
                    {backup.collections.length} collections • {backup.totalRecords} records • {formatFileSize(backup.size)}
                  </div>
                  <div style={{ fontSize: "10px", color: T.textSec, marginTop: "2px" }}>
                    Created by: {backup.createdBy}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => downloadBackup(backup)}
                    style={{
                      padding: "5px 10px",
                      background: "rgba(34,197,94,.1)",
                      border: "1px solid rgba(34,197,94,.3)",
                      borderRadius: "5px",
                      color: T.green,
                      cursor: "pointer",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      fontFamily: "Quicksand"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(34,197,94,.2)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(34,197,94,.1)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={() => restoreBackup(backup)}
                    disabled={isRestoring}
                    style={{
                      padding: "5px 10px",
                      background: "rgba(245,158,11,.1)",
                      border: "1px solid rgba(245,158,11,.3)",
                      borderRadius: "5px",
                      color: T.orange,
                      cursor: isRestoring ? "not-allowed" : "pointer",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      fontFamily: "Quicksand"
                    }}
                    onMouseEnter={e => { if(!isRestoring) { e.currentTarget.style.background = "rgba(245,158,11,.2)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                    onMouseLeave={e => { if(!isRestoring) { e.currentTarget.style.background = "rgba(245,158,11,.1)"; e.currentTarget.style.transform = "translateY(0)"; } }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Restore
                  </button>
                  <button
                    onClick={() => deleteBackup(backup.id)}
                    style={{
                      padding: "5px 10px",
                      background: "rgba(239,68,68,.1)",
                      border: "1px solid rgba(239,68,68,.3)",
                      borderRadius: "5px",
                      color: T.red,
                      cursor: "pointer",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      fontFamily: "Quicksand"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,.2)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,.1)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warning Note */}
      <div style={{
        marginTop: "16px",
        padding: "12px 16px",
        background: "rgba(245,158,11,.05)",
        borderRadius: "10px",
        border: "1px solid rgba(245,158,11,.2)",
        display: "flex",
        gap: "8px",
        alignItems: "flex-start"
      }}>
        <span style={{ display: "flex", marginTop: "1px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </span>
        <p style={{ margin: 0, fontSize: "11px", color: T.orange, lineHeight: "1.5" }}>
          <strong>Important:</strong> Restoring a backup will OVERWRITE existing data. Always create a backup before restoring. Backups are stored locally in your browser.
        </p>
      </div>
    </div>
  );
}