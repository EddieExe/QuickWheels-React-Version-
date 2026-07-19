// src/components/dealer/lateReturn/LateReturnList.jsx
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase";
import { checkLateStatus, sendLateReturnNotification, calculateLatePenalty } from "../../../utils/lateReturnUtils";
import { calculateExtensionCost, formatCurrency } from "../../../utils/extensionCalculator";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  purple: "#a855f7",
  textSec: "rgba(255,255,255,0.4)",
};

export default function LateReturnList({ dealerId }) {
  const [lateBookings, setLateBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  useEffect(() => {
    if (!dealerId) return;
    
    const q = query(
      collection(db, "bookings"),
      where("dealerId", "==", dealerId),
      where("status", "in", ["active", "late_return", "critically_late", "overdue"])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const late = bookings
        .map(booking => {
          const lateInfo = checkLateStatus(booking);
          return {
            ...booking,
            lateInfo: lateInfo.isLate ? lateInfo : null,
            delayHours: lateInfo.delayHours || 0,
          };
        })
        .filter(booking => booking.lateInfo !== null)
        .sort((a, b) => b.delayHours - a.delayHours);
      
      setLateBookings(late);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [dealerId]);

  const handleApplyPenalty = async (booking) => {
    const dailyRate = booking.dailyRate || (booking.total / booking.days) || 50;
    const penalty = calculateLatePenalty(booking.delayHours, dailyRate);
    
    if (confirm(`Apply ${penalty.percentage}% penalty (${penalty.penalty} to this booking?`)) {
      try {
        await updateDoc(doc(db, "bookings", booking.id), {
          latePenalty: penalty.penalty,
          latePenaltyPercentage: penalty.percentage,
          latePenaltyAppliedAt: new Date().toISOString(),
          status: "late_return",
          total: (booking.total || 0) + penalty.penalty,
        });
        alert("Penalty applied successfully");
      } catch (error) {
        console.error("Error applying penalty:", error);
        alert("Failed to apply penalty");
      }
    }
  };

  const handleSendReminder = async (booking) => {
    await sendLateReturnNotification(booking, booking.lateInfo);
    alert(`Reminder sent to ${booking.userEmail}`);
  };

  const getSeverityColor = (delayHours) => {
    if (delayHours <= 2) return T.orange;
    if (delayHours <= 6) return "#f97316";
    if (delayHours <= 12) return T.red;
    if (delayHours <= 24) return "#7f1d1d";
    return "#450a0a";
  };

  const getSeverityLabel = (delayHours) => {
    if (delayHours <= 2) return "Mild Delay";
    if (delayHours <= 6) return "Moderate Delay";
    if (delayHours <= 12) return "Serious Delay";
    if (delayHours <= 24) return "Severe Delay";
    return "Critical";
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: T.textSec }}>
        <div style={{ width: "30px", height: "30px", margin: "0 auto", border: "2px solid rgba(239,68,68,.2)", borderTopColor: T.red, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ marginTop: "10px" }}>Loading late returns...</p>
      </div>
    );
  }

  if (lateBookings.length === 0) {
    return (
      <div style={{
        background: "rgba(255,255,255,.02)",
        borderRadius: "16px",
        padding: "40px",
        textAlign: "center",
        border: "1px solid rgba(255,255,255,.06)",
      }}>
        {/* Properly colored SVG instead of emoji */}
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
        
        <h3 style={{ color: "#fff", marginBottom: "5px" }}>No Late Returns</h3>
        <p style={{ color: T.textSec, fontSize: "13px" }}>All active trips are on schedule</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 5px", fontSize: "22px", fontWeight: "800", color: "#fff" }}>
          ⏰ Late Returns
        </h2>
        <p style={{ margin: 0, color: T.textSec, fontSize: "13px" }}>
          {lateBookings.length} booking{lateBookings.length !== 1 ? "s" : ""} currently late
        </p>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {lateBookings.map(booking => {
          const severityColor = getSeverityColor(booking.delayHours);
          const dailyRate = booking.dailyRate || (booking.total / booking.days) || 50;
          const penalty = calculateLatePenalty(booking.delayHours, dailyRate);
          
          return (
            <div
              key={booking.id}
              style={{
                background: "linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",
                border: `1px solid ${severityColor}66`,
                borderRadius: "14px",
                padding: "18px",
                transition: "all .3s ease",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, color: "#fff", fontSize: "15px", fontWeight: "700" }}>{booking.carModel}</h3>
                    <span style={{
                      padding: "3px 10px",
                      borderRadius: "20px",
                      background: `${severityColor}20`,
                      border: `1px solid ${severityColor}40`,
                      color: severityColor,
                      fontSize: "10px",
                      fontWeight: "700",
                    }}>
                      {getSeverityLabel(booking.delayHours)}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: T.textSec, fontSize: "11px" }}>
                    {booking.userName || booking.userEmail} • #{booking.bookingId?.slice(-8)}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: T.red }}>
                    {booking.delayHours}h
                  </p>
                  <p style={{ margin: 0, fontSize: "10px", color: T.textSec }}>Delay</p>
                </div>
              </div>
              
              {/* Details */}
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "15px",
                padding: "12px 0",
                borderTop: "1px solid rgba(255,255,255,.05)",
                borderBottom: "1px solid rgba(255,255,255,.05)",
                marginBottom: "12px",
              }}>
                <div>
                  <p style={{ fontSize: "9px", color: T.textSec, marginBottom: "3px" }}>Expected Return</p>
                  <p style={{ margin: 0, color: "#fff", fontSize: "12px", fontWeight: "500" }}>
                    {new Date(booking.dropoffDate).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "9px", color: T.textSec, marginBottom: "3px" }}>Daily Rate</p>
                  <p style={{ margin: 0, color: T.purple, fontSize: "12px", fontWeight: "600" }}>
                    ${dailyRate}/day
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "9px", color: T.textSec, marginBottom: "3px" }}>Proposed Penalty</p>
                  <p style={{ margin: 0, color: T.orange, fontSize: "14px", fontWeight: "700" }}>
                    ${penalty.penalty} ({penalty.percentage}%)
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleSendReminder(booking)}
                  style={{
                    padding: "7px 14px",
                    background: "rgba(168,85,247,.1)",
                    border: "1px solid rgba(168,85,247,.3)",
                    borderRadius: "8px",
                    color: T.purple,
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  📧 Send Reminder
                </button>
                <button
                  onClick={() => handleApplyPenalty(booking)}
                  style={{
                    padding: "7px 14px",
                    background: "rgba(245,158,11,.1)",
                    border: "1px solid rgba(245,158,11,.3)",
                    borderRadius: "8px",
                    color: T.orange,
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  💰 Apply Penalty
                </button>
                <button
                  style={{
                    padding: "7px 14px",
                    background: "rgba(34,197,94,.1)",
                    border: "1px solid rgba(34,197,94,.3)",
                    borderRadius: "8px",
                    color: "#22c55e",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  🔄 Process Extension
                </button>
                <button
                  style={{
                    marginLeft: "auto",
                    padding: "7px 14px",
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: "8px",
                    color: T.textSec,
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  View Details →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}