// src/components/admin/BulkActionBar.jsx
import { useState } from "react";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  textSec: "rgba(255,255,255,0.4)",
};

export default function BulkActionBar({ selectedCount, onConfirm, onClear }) {
  const [action, setAction] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleAction = () => {
    if (action === "confirm" || action === "hold" || action === "cancel") {
      setConfirming(true);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(action, reason);
    setLoading(false);
    setConfirming(false);
    setAction("");
    setReason("");
  };

  if (confirming) {
    return (
      <div style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 1000,
        background: "#1a1a2e",
        border: `1px solid ${action === "cancel" ? T.red : T.cyan}40`,
        borderRadius: "16px",
        padding: "20px",
        minWidth: "320px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
      }}>
        <h4 style={{ margin: "0 0 12px", color: action === "cancel" ? T.red : T.cyan }}>
          {action === "confirm" ? "Confirm Bookings" : action === "cancel" ? "Cancel Bookings" : "Put on Hold"}
        </h4>
        <p style={{ fontSize: "13px", color: T.textSec, marginBottom: "12px" }}>
          {selectedCount} booking{selectedCount !== 1 ? "s" : ""} will be {action === "confirm" ? "confirmed" : action === "cancel" ? "cancelled" : "put on hold"}.
        </p>
        {(action === "cancel" || action === "hold") && (
          <textarea
            placeholder="Reason for this action..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            style={{
              width: "100%",
              padding: "10px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "12px",
              marginBottom: "15px",
              resize: "vertical",
            }}
          />
        )}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => { setConfirming(false); setReason(""); }}
            style={{
              flex: 1,
              padding: "10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (action !== "confirm" && !reason)}
            style={{
              flex: 1,
              padding: "10px",
              background: action === "cancel" ? T.red : `linear-gradient(135deg, ${T.cyan}, #0400ff)`,
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              cursor: (loading || (action !== "confirm" && !reason)) ? "not-allowed" : "pointer",
              opacity: (loading || (action !== "confirm" && !reason)) ? 0.6 : 1,
            }}
          >
            {loading ? "Processing..." : `Yes, ${action === "confirm" ? "Confirm" : action === "cancel" ? "Cancel" : "Hold"}`}
          </button>
        </div>
      </div>
    );
  }

  if (selectedCount === 0) return null;

  return (
    <div style={{
      position: "sticky",
      bottom: "20px",
      zIndex: 100,
      background: "#0c0c16",
      border: `1px solid ${T.cyan}30`,
      borderRadius: "16px",
      padding: "12px 20px",
      marginTop: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "12px",
      backdropFilter: "blur(20px)",
    }}>
      <div>
        <span style={{ fontWeight: "700", color: "#fff" }}>{selectedCount}</span>
        <span style={{ color: T.textSec, marginLeft: "8px" }}>booking{selectedCount !== 1 ? "s" : ""} selected</span>
      </div>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          style={{
            padding: "8px 16px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            color: "#fff",
            fontSize: "13px",
            fontFamily: "Quicksand",
          }}
        >
          <option value="">Bulk Action</option>
          <option value="confirm">✅ Confirm Selected</option>
          <option value="hold">⏸ Put on Hold</option>
          <option value="cancel">🚫 Cancel Selected</option>
        </select>
        <button
          onClick={handleAction}
          disabled={!action}
          style={{
            padding: "8px 20px",
            background: !action ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${T.cyan}, #0400ff)`,
            border: "none",
            borderRadius: "10px",
            color: "#fff",
            cursor: !action ? "not-allowed" : "pointer",
            fontWeight: "600",
            fontFamily: "Quicksand",
            opacity: !action ? 0.5 : 1,
          }}
        >
          Apply
        </button>
        <button
          onClick={onClear}
          style={{
            padding: "8px 16px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "10px",
            color: T.red,
            cursor: "pointer",
            fontFamily: "Quicksand",
          }}
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
}