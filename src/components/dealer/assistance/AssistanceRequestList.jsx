// src/components/dealer/assistance/AssistanceRequestList.jsx
import { useState, useEffect } from "react";
import { getPendingAssistanceRequests, REQUEST_STATUS, STATUS_META } from "../../../utils/assistanceUtils";
import { ASSISTANCE_SERVICES } from "../../../utils/assistanceService";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  textSec: "rgba(255,255,255,0.4)",
};

export default function AssistanceRequestList({ dealerId, onSelectRequest }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  
  useEffect(() => {
    if (!dealerId) return;
    loadRequests();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, [dealerId]);
  
  const loadRequests = async () => {
    setLoading(true);
    const pendingRequests = await getPendingAssistanceRequests(dealerId);
    setRequests(pendingRequests);
    setLoading(false);
  };
  
  const filteredRequests = requests.filter(req => {
    if (filter === "all") return true;
    return req.status === filter;
  });
  
  const getPriorityInfo = (serviceType) => {
    const priorities = {
      breakdown: { label: "High", color: T.red, icon: "🔴" },
      accident: { label: "High", color: T.red, icon: "🔴" },
      flat_tire: { label: "Medium", color: T.orange, icon: "🟡" },
      battery_jumpstart: { label: "Medium", color: T.orange, icon: "🟡" },
      lockout: { label: "Medium", color: T.orange, icon: "🟡" },
      fuel_delivery: { label: "Low", color: T.green, icon: "🟢" },
      mechanical: { label: "Medium", color: T.orange, icon: "🟡" },
      towing: { label: "High", color: T.red, icon: "🔴" },
    };
    return priorities[serviceType] || { label: "Medium", color: T.orange, icon: "🟡" };
  };
  
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: T.textSec }}>
        <div style={{ width: "30px", height: "30px", margin: "0 auto", border: "2px solid rgba(239,68,68,.2)", borderTopColor: T.red, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ marginTop: "10px" }}>Loading assistance requests...</p>
      </div>
    );
  }
  
  return (
    <div className="assistance-request-list">
      <style>{`
        @media (max-width: 768px) {
          .assistance-request-list .ar-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .assistance-request-list .ar-header h2 {
            font-size: 18px !important;
          }
          .assistance-request-list .ar-header p {
            font-size: 12px !important;
          }
          .assistance-request-list .ar-filters {
            gap: 6px !important;
            flex-wrap: wrap !important;
          }
          .assistance-request-list .ar-filters button {
            padding: 6px 12px !important;
            font-size: 11px !important;
          }
          .assistance-request-list .ar-card {
            padding: 14px !important;
          }
          .assistance-request-list .ar-card-top {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }
          .assistance-request-list .ar-card-top-left {
            width: 100% !important;
          }
          .assistance-request-list .ar-card-top-left > div {
            flex-wrap: wrap !important;
          }
          .assistance-request-list .ar-card-top-left h3 {
            font-size: 14px !important;
          }
          .assistance-request-list .ar-card-top-right {
            width: 100% !important;
            text-align: left !important;
          }
          .assistance-request-list .ar-card-middle {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .assistance-request-list .ar-card-middle > div {
            width: 100% !important;
          }
          .assistance-request-list .ar-empty-state {
            padding: 40px 20px !important;
          }
          .assistance-request-list .ar-empty-state h3 {
            font-size: 16px !important;
          }
          .assistance-request-list .ar-empty-state p {
            font-size: 12px !important;
          }
        }

        @media (max-width: 480px) {
          .assistance-request-list .ar-header h2 {
            font-size: 16px !important;
          }
          .assistance-request-list .ar-filters button {
            padding: 5px 10px !important;
            font-size: 10px !important;
          }
          .assistance-request-list .ar-card {
            padding: 12px !important;
          }
          .assistance-request-list .ar-card-top-left h3 {
            font-size: 13px !important;
          }
          .assistance-request-list .ar-card-top-left > div span {
            font-size: 9px !important;
            padding: 2px 8px !important;
          }
          .assistance-request-list .ar-card-middle p {
            font-size: 11px !important;
          }
        }
      `}</style>

      <div>
        {/* Header */}
        <div className="ar-header" style={{ 
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div>
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
                stroke="#ef4444" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ transform: "translateY(-1px)" }}
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Assistance Requests
            </h2>
            <p style={{ margin: 0, color: T.textSec, fontSize: "13px" }}>
              {requests.length} pending request{requests.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="ar-filters" style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}>
          {[
            { id: "all", label: "All Requests", count: requests.length },
            { id: "pending", label: "Pending", count: requests.filter(r => r.status === "pending").length },
            { id: "confirmed", label: "Confirmed", count: requests.filter(r => r.status === "confirmed").length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                background: filter === tab.id ? `${T.red}20` : "rgba(255,255,255,.05)",
                border: filter === tab.id ? `1px solid ${T.red}` : "1px solid rgba(255,255,255,.1)",
                color: filter === tab.id ? T.red : T.textSec,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                fontFamily: "Quicksand",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (filter !== tab.id) {
                  e.currentTarget.style.background = "rgba(255,255,255,.08)";
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== tab.id) {
                  e.currentTarget.style.background = "rgba(255,255,255,.05)";
                }
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        
        {filteredRequests.length === 0 ? (
          <div className="ar-empty-state" style={{
            background: "rgba(255,255,255,.02)",
            borderRadius: "16px",
            padding: "60px",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,.06)",
          }}>
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
                stroke="#22c55e" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>

            <h3 style={{ color: "#fff", marginBottom: "5px" }}>No Assistance Requests</h3>
            <p style={{ color: T.textSec, fontSize: "13px" }}>All clear! No pending assistance needed.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredRequests.map(request => {
              const service = ASSISTANCE_SERVICES[request.serviceType] || { name: request.serviceType, icon: "🛠️" };
              const priority = getPriorityInfo(request.serviceType);
              const statusMeta = STATUS_META[request.status];
              
              return (
                <div
                  key={request.id}
                  className="ar-card"
                  onClick={() => onSelectRequest?.(request)}
                  style={{
                    background: "linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",
                    border: `1px solid ${priority.color}40`,
                    borderRadius: "16px",
                    padding: "18px",
                    transition: "all .3s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateX(4px)";
                    e.currentTarget.style.borderColor = `${priority.color}80`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.borderColor = `${priority.color}40`;
                  }}
                >
                  <div className="ar-card-top" style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start", 
                    marginBottom: "12px", 
                    flexWrap: "wrap", 
                    gap: "10px" 
                  }}>
                    <div className="ar-card-top-left">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "24px" }}>{service.icon}</span>
                        <h3 style={{ margin: 0, color: "#fff", fontSize: "16px", fontWeight: "700" }}>{service.name}</h3>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "20px",
                          background: `${priority.color}20`,
                          border: `1px solid ${priority.color}40`,
                          color: priority.color,
                          fontSize: "10px",
                          fontWeight: "700",
                          whiteSpace: "nowrap",
                        }}>
                          {priority.icon} {priority.label}
                        </span>
                        <span style={{
                          padding: "3px 10px",
                          borderRadius: "20px",
                          background: `${statusMeta.color}20`,
                          border: `1px solid ${statusMeta.color}40`,
                          color: statusMeta.color,
                          fontSize: "10px",
                          fontWeight: "700",
                          whiteSpace: "nowrap",
                        }}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: T.textSec, fontSize: "12px" }}>
                        {request.booking?.carModel} • {request.booking?.userName || request.booking?.userEmail}
                      </p>
                    </div>
                    <div className="ar-card-top-right" style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: "11px", color: T.textSec }}>
                        {request.createdAt?.toDate ? new Date(request.createdAt.toDate()).toLocaleString() : new Date(request.createdAt).toLocaleString()}
                      </p>
                      {request.estimatedArrival && (
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#fca5a5", fontWeight: "600" }}>
                          ETA: {request.etaMinutes} min
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="ar-card-middle" style={{
                    display: "flex",
                    gap: "15px",
                    padding: "10px 0",
                    borderTop: "1px solid rgba(255,255,255,.05)",
                    borderBottom: "1px solid rgba(255,255,255,.05)",
                    marginBottom: "12px",
                    flexWrap: "wrap",
                  }}>
                    <div style={{ flex: 1, minWidth: "150px" }}>
                      <p style={{ fontSize: "10px", color: T.textSec, marginBottom: "3px" }}>Location</p>
                      <p style={{ margin: 0, color: "#fff", fontSize: "12px" }}>
                        {request.location?.address || `${request.location?.lat?.toFixed(4)}, ${request.location?.lng?.toFixed(4)}`}
                      </p>
                    </div>
                    {request.assignedProvider && (
                      <div style={{ flex: 1, minWidth: "120px" }}>
                        <p style={{ fontSize: "10px", color: T.textSec, marginBottom: "3px" }}>Assigned To</p>
                        <p style={{ margin: 0, color: T.green, fontSize: "12px", fontWeight: "600" }}>
                          {request.assignedProvider.name}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ fontSize: "12px", color: priority.color }}>
                    {request.status === "pending" ? "⏳ Awaiting your action" : "✅ Service provider assigned"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}