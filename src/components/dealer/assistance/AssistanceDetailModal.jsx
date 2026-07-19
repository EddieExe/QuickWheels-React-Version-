// src/components/dealer/assistance/AssistanceDetailModal.jsx
import { useState, useEffect } from "react";
import { updateAssistanceStatus, cancelAssistanceRequest } from "../../../utils/assistanceUtils";
import { ASSISTANCE_SERVICES, REQUEST_STATUS, STATUS_META } from "../../../utils/assistanceService";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  textSec: "rgba(255,255,255,0.4)",
};

const SERVICE_EMOJI = {
  flat_tire: "🔧",
  battery_jumpstart: "🔋",
  fuel_delivery: "⛽",
  lockout: "🔓",
  mechanical: "⚙️",
  towing: "🚛",
};

const SERVICE_LABELS = {
  flat_tire: "Flat Tire",
  battery_jumpstart: "Battery Jumpstart",
  fuel_delivery: "Fuel Delivery",
  lockout: "Lockout Help",
  mechanical: "Mechanical Assistance",
  towing: "Vehicle Towing",
};

const SERVICE_ETA = {
  flat_tire: 35,
  battery_jumpstart: 25,
  fuel_delivery: 35,
  lockout: 25,
  mechanical: 50,
  towing: 75,
};

export default function AssistanceDetailModal({ request, dealerId, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerPhone, setProviderPhone] = useState("");

  const serviceType = request.serviceType;
  const serviceEmoji = SERVICE_EMOJI[serviceType] || "🆘";
  const serviceName = SERVICE_LABELS[serviceType] || request.serviceName || "Assistance";
  const etaMinutes = SERVICE_ETA[serviceType] || 45;
  const statusMeta = STATUS_META[request.status] || STATUS_META.pending;

  const handleAssignProvider = async () => {
    if (!providerName.trim()) {
      alert("Please enter a provider name");
      return;
    }
    setLoading(true);
    try {
      // Update status to confirmed and store provider info in a note
      const result = await updateAssistanceStatus(
        request.id,
        REQUEST_STATUS.CONFIRMED,
        `Provider assigned: ${providerName}${providerPhone ? ` (${providerPhone})` : ""}`
      );
      if (result.success) {
        onUpdated?.();
        setAction(null);
        alert("Provider assigned successfully");
      } else {
        alert("Failed to assign provider: " + result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    setLoading(true);
    try {
      const result = await cancelAssistanceRequest(request.id, rejectReason);
      if (result.success) {
        onUpdated?.();
        onClose();
      } else {
        alert("Failed to reject request: " + result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus, note) => {
    setLoading(true);
    try {
      const result = await updateAssistanceStatus(request.id, newStatus, note);
      if (result.success) {
        onUpdated?.();
        if (newStatus === REQUEST_STATUS.COMPLETED) onClose();
      } else {
        alert("Failed to update status: " + result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.92)",
        backdropFilter: "blur(12px)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0c0c16", borderRadius: "24px",
          maxWidth: "700px", width: "100%",
          maxHeight: "90vh", overflowY: "auto",
          border: "1px solid rgba(239,68,68,0.2)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "24px", borderBottom: "1px solid rgba(255,255,255,.1)",
          background: "rgba(0,0,0,.3)", position: "sticky", top: 0, zIndex: 1,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div>
              <span style={{ fontSize: "28px", marginRight: "10px" }}>{serviceEmoji}</span>
              <span style={{ fontSize: "20px", fontWeight: "800", color: "#fff" }}>{serviceName}</span>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: T.textSec, fontSize: "24px", cursor: "pointer" }}>×</button>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <span style={{
              padding: "4px 12px", borderRadius: "20px",
              background: `${statusMeta.color}20`, border: `1px solid ${statusMeta.color}40`,
              color: statusMeta.color, fontSize: "12px", fontWeight: "600",
            }}>
              {statusMeta.label}
            </span>
            <span style={{
              padding: "4px 12px", borderRadius: "20px",
              background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
              color: T.textSec, fontSize: "12px",
            }}>
              ETA: {etaMinutes} minutes
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>

          {/* Customer Info */}
          <div style={{ background: "rgba(255,255,255,.03)", borderRadius: "16px", padding: "16px", marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 12px", color: "#ef4444", fontSize: "14px" }}>Customer Information</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                ["Name", request.booking?.userName || request.userId || "—"],
                ["Vehicle", request.booking?.carModel || request.bookingInfo?.carModel || "—"],
                ["Contact", request.booking?.userEmail || "—"],
                ["Request Time", request.createdAt?.toDate
                  ? new Date(request.createdAt.toDate()).toLocaleString()
                  : request.createdAt ? new Date(request.createdAt).toLocaleString() : "—"],
              ].map(([label, val]) => (
                <div key={label}>
                  <p style={{ fontSize: "10px", color: T.textSec, marginBottom: "3px" }}>{label}</p>
                  <p style={{ margin: 0, color: "#fff" }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <div style={{ background: "rgba(255,255,255,.03)", borderRadius: "16px", padding: "16px", marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 12px", color: T.cyan, fontSize: "14px" }}>📍 Location</h4>
            <p style={{ margin: 0, color: "#fff" }}>
              {request.location?.address || `${request.location?.lat?.toFixed(5)}, ${request.location?.lng?.toFixed(5)}`}
            </p>
            <a
              href={request.location?.googleMapsUrl || `https://maps.google.com/?q=${request.location?.lat},${request.location?.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#f87171", fontSize: "12px", marginTop: "8px", display: "inline-block" }}
            >
              Open in Google Maps →
            </a>
          </div>

          {/* Assigned Provider (if any) */}
          {request.assignedProvider && (
            <div style={{
              background: "rgba(34,197,94,.08)", borderRadius: "16px", padding: "16px",
              marginBottom: "20px", border: "1px solid rgba(34,197,94,.2)",
            }}>
              <h4 style={{ margin: "0 0 12px", color: T.green, fontSize: "14px" }}>✅ Assigned Provider</h4>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <p style={{ margin: 0, color: "#fff", fontWeight: "600" }}>{request.assignedProvider.name}</p>
                  <p style={{ margin: "4px 0 0", color: T.textSec, fontSize: "11px" }}>📞 {request.assignedProvider.phone}</p>
                </div>
                <button
                  onClick={() => window.open(`tel:${request.assignedProvider.phone}`)}
                  style={{
                    padding: "8px 16px", background: "rgba(34,197,94,.1)",
                    border: "1px solid rgba(34,197,94,.3)", borderRadius: "8px",
                    color: T.green, cursor: "pointer", fontSize: "12px",
                  }}
                >
                  📞 Call Provider
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons — only for pending */}
          {request.status === "pending" && !action && (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={() => setAction("assign")}
                style={{
                  flex: 1, padding: "12px",
                  background: "linear-gradient(135deg, #4338ca, #9333ea)",
                  border: "none", borderRadius: "10px",
                  color: "#fff", cursor: "pointer", fontWeight: "700",
                }}
              >
                Assign Provider
              </button>
              <button
                onClick={() => setAction("reject")}
                style={{
                  flex: 1, padding: "12px",
                  background: `linear-gradient(135deg, ${T.red}, #dc2626)`,
                  border: "none", borderRadius: "10px",
                  color: "#fff", cursor: "pointer", fontWeight: "700",
                }}
              >
                Reject Request
              </button>
            </div>
          )}

          {/* Assign Provider Form */}
          {action === "assign" && (
            <div>
              <h4 style={{ margin: "0 0 15px", color: T.cyan, fontSize: "14px" }}>Assign Service Provider</h4>
              <input
                value={providerName}
                onChange={e => setProviderName(e.target.value)}
                placeholder="Provider name *"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px",
                  background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: "10px", color: "#fff", marginBottom: "10px", fontSize: "13px",
                }}
              />
              <input
                value={providerPhone}
                onChange={e => setProviderPhone(e.target.value)}
                placeholder="Provider phone (optional)"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px",
                  background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: "10px", color: "#fff", marginBottom: "15px", fontSize: "13px",
                }}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setAction(null)}
                  style={{
                    flex: 1, padding: "10px", background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)", borderRadius: "8px",
                    color: "#fff", cursor: "pointer",
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleAssignProvider}
                  disabled={loading || !providerName.trim()}
                  style={{
                    flex: 2, padding: "10px",
                    background: (loading || !providerName.trim()) ? "rgba(255,255,255,.1)" : `linear-gradient(135deg, ${T.green}, #16a34a)`,
                    border: "none", borderRadius: "8px",
                    color: "#fff", cursor: (loading || !providerName.trim()) ? "not-allowed" : "pointer",
                    fontWeight: "700",
                  }}
                >
                  {loading ? "Assigning..." : "Confirm Assignment →"}
                </button>
              </div>
            </div>
          )}

          {/* Reject Form */}
          {action === "reject" && (
            <div>
              <h4 style={{ margin: "0 0 15px", color: T.red, fontSize: "14px" }}>Rejection Reason</h4>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Please provide a reason for rejecting this assistance request..."
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px",
                  background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: "10px", color: "#fff", resize: "vertical", marginBottom: "15px",
                }}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setAction(null)}
                  style={{
                    flex: 1, padding: "10px", background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)", borderRadius: "8px",
                    color: "#fff", cursor: "pointer",
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !rejectReason.trim()}
                  style={{
                    flex: 2, padding: "10px",
                    background: (loading || !rejectReason.trim()) ? "rgba(255,255,255,.1)" : `linear-gradient(135deg, ${T.red}, #dc2626)`,
                    border: "none", borderRadius: "8px",
                    color: "#fff", cursor: (loading || !rejectReason.trim()) ? "not-allowed" : "pointer",
                    fontWeight: "700",
                  }}
                >
                  {loading ? "Rejecting..." : "Confirm Rejection →"}
                </button>
              </div>
            </div>
          )}

          {/* Status Update for active (non-pending, non-terminal) requests */}
          {!["pending", "completed", "cancelled"].includes(request.status) && (
            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
              <h4 style={{ margin: "0 0 15px", color: T.cyan, fontSize: "14px" }}>Update Status</h4>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["dispatched", "en_route", "arrived", "in_progress", "completed"].map(status => {
                  const meta = STATUS_META[status];
                  return (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(status, `Status updated to ${meta.label}`)}
                      disabled={loading}
                      style={{
                        padding: "8px 12px",
                        background: "rgba(255,255,255,.05)",
                        border: `1px solid ${meta.color}40`,
                        borderRadius: "8px", color: meta.color,
                        cursor: loading ? "not-allowed" : "pointer",
                        fontSize: "11px", fontWeight: "600",
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}