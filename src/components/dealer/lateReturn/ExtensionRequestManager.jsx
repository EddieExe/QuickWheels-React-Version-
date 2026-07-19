// src/components/dealer/lateReturn/ExtensionRequestManager.jsx
import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { getPendingExtensionRequests, processExtensionRequest } from "../../../utils/lateReturnUtils";
import { calculateExtensionCost, formatCurrency } from "../../../utils/extensionCalculator";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  textSec: "rgba(255,255,255,0.4)",
};

export default function ExtensionRequestManager({ dealerId, onProcessed }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    if (!dealerId) return;
    loadRequests();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, [dealerId]);

  const loadRequests = async () => {
    setLoading(true);
    const pendingRequests = await getPendingExtensionRequests(dealerId);
    setRequests(pendingRequests);
    setLoading(false);
  };

  const handleProcess = async (request, action) => {
    setProcessingId(request.id);
    try {
      const result = await processExtensionRequest(
        request.id,
        action,
        dealerId,
        notes[request.id] || ""
      );
      
      if (result.success) {
        // Update local state
        setRequests(prev => prev.filter(r => r.id !== request.id));
        if (onProcessed) onProcessed({ request, action, result });
        
        // Show success message
        alert(`Extension request ${action === "approve" ? "approved" : "rejected"} successfully`);
      } else {
        alert(`Failed to ${action} request: ${result.error}`);
      }
    } catch (error) {
      console.error("Error processing request:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setProcessingId(null);
      setNotes(prev => ({ ...prev, [request.id]: "" }));
    }
  };

  const getTimeRemaining = (expiresAt) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry - now;
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: T.textSec }}>
        <div style={{ width: "30px", height: "30px", margin: "0 auto", border: "2px solid rgba(99,102,241,.2)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ marginTop: "10px" }}>Loading extension requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
  return (
    <div style={{
      background: "rgba(255,255,255,.02)",
      borderRadius: "16px",
      padding: "40px",
      textAlign: "center",
      border: "1px solid rgba(255,255,255,.06)",
    }}>
      {/* Empty inbox / document SVG matching extension purple (#a855f7) */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        marginBottom: "14px" 
      }}>
        <svg 
          width="48" 
          height="48" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#4f46e5" 
          // stroke="rgba(255,255,255,0.2)" use this for gray
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </div>
      
      <h3 style={{ color: "#fff", marginBottom: "5px" }}>No Pending Requests</h3>
      <p style={{ color: T.textSec, fontSize: "13px" }}>All extension requests have been processed</p>
    </div>
  );
}

return (
  <div>
    <div style={{ marginBottom: "20px" }}>
      {/* Header with inline SVG instead of clipboard emoji */}
      <h2 style={{ 
        margin: "0 0 5px", 
        fontSize: "22px", 
        fontWeight: "800", 
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "10px"
      }}>
        <svg 
          width="22" 
          height="22" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#6366f1" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ transform: "translateY(-1px)" }}
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        Extension Requests
      </h2>
      <p style={{ margin: 0, color: T.textSec, fontSize: "13px" }}>
        {requests.length} pending request{requests.length !== 1 ? "s" : ""}
      </p>
    </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {requests.map(request => {
          const isExpiring = getTimeRemaining(request.expiresAt) === "Expired";
          return (
            <div
              key={request.id}
              style={{
                background: "linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",
                border: `1px solid ${isExpiring ? T.red + "40" : "#6366f1" + "40"}`,
                borderRadius: "16px",
                padding: "20px",
                transition: "all .3s ease",
                opacity: isExpiring ? 0.6 : 1,
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, color: "#fff", fontSize: "16px" }}>{request.carModel}</h3>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: "20px",
                      background: request.isLate ? `${T.orange}20` : `${T.green}20`,
                      border: `1px solid ${request.isLate ? T.orange : T.green}40`,
                      color: request.isLate ? T.orange : T.green,
                      fontSize: "11px",
                      fontWeight: "700",
                    }}>
                      {request.isLate ? "Late Request" : "Advance Request"}
                    </span>
                    {request.isPremiumRate && (
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        background: `${T.red}20`,
                        border: `1px solid ${T.red}40`,
                        color: T.red,
                        fontSize: "11px",
                        fontWeight: "700",
                      }}>
                        Premium Rate
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: T.textSec, fontSize: "12px" }}>
                    {request.customerName || request.customerEmail} • Requested {request.requestedDays} day{request.requestedDays !== 1 ? "s" : ""}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: isExpiring ? T.red : T.green }}>
                    ${request.proposedCharge}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: T.textSec }}>Proposed Charge</p>
                </div>
              </div>
              
              {/* Details Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "12px",
                padding: "12px 0",
                borderTop: "1px solid rgba(255,255,255,.05)",
                borderBottom: "1px solid rgba(255,255,255,.05)",
                marginBottom: "15px",
              }}>
                <div>
                  <p style={{ fontSize: "10px", color: T.textSec, marginBottom: "4px" }}>Current Return</p>
                  <p style={{ margin: 0, color: "#fff", fontSize: "13px", fontWeight: "600" }}>
                    {new Date(request.currentDropoffDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "10px", color: T.textSec, marginBottom: "4px" }}>New Return Date</p>
                  <p style={{ margin: 0, color: "#818cf8", fontSize: "13px", fontWeight: "600" }}>
                    {request.requestedNewDropoffDate}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "10px", color: T.textSec, marginBottom: "4px" }}>Daily Rate</p>
                  <p style={{ margin: 0, color: "#fff", fontSize: "13px" }}>
                    ${request.dailyRate}/day
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "10px", color: T.textSec, marginBottom: "4px" }}>Expires In</p>
                  <p style={{ margin: 0, color: isExpiring ? T.red : T.orange, fontSize: "13px", fontWeight: "600" }}>
                    {getTimeRemaining(request.expiresAt)}
                  </p>
                </div>
              </div>
              
              {/* Reason */}
              {request.reason && (
                <div style={{
                  background: "rgba(255,255,255,.02)",
                  borderRadius: "10px",
                  padding: "10px",
                  marginBottom: "15px",
                }}>
                  <p style={{ fontSize: "10px", color: T.textSec, marginBottom: "4px" }}>Customer Reason</p>
                  <p style={{ margin: 0, color: "#fff", fontSize: "12px" }}>{request.reason}</p>
                </div>
              )}
              
              {/* Dealer Notes */}
              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontSize: "11px", color: T.textSec, marginBottom: "5px", display: "block" }}>
                  Internal Notes (Optional)
                </label>
                <textarea
                  value={notes[request.id] || ""}
                  onChange={(e) => setNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                  rows={2}
                  placeholder="Add notes about this request..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                    resize: "vertical",
                  }}
                />
              </div>
              
              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleProcess(request, "approve")}
                  disabled={processingId === request.id || isExpiring}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    background: isExpiring ? "rgba(255,255,255,.1)" : `linear-gradient(135deg, ${T.green}, #16a34a)`,
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    cursor: (processingId === request.id || isExpiring) ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
                    opacity: (processingId === request.id || isExpiring) ? 0.6 : 1,
                  }}
                >
                  {processingId === request.id ? "Processing..." : "✅ Approve Extension"}
                </button>
                <button
                  onClick={() => handleProcess(request, "reject")}
                  disabled={processingId === request.id || isExpiring}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    background: isExpiring ? "rgba(255,255,255,.1)" : `linear-gradient(135deg, ${T.red}, #dc2626)`,
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    cursor: (processingId === request.id || isExpiring) ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "13px",
                    opacity: (processingId === request.id || isExpiring) ? 0.6 : 1,
                  }}
                >
                  ❌ Reject Request
                </button>
              </div>
              
              {isExpiring && (
                <div style={{ marginTop: "12px", fontSize: "11px", color: T.red, textAlign: "center" }}>
                  ⚠️ This request has expired and cannot be processed
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}