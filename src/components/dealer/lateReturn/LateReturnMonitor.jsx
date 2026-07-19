// src/components/dealer/lateReturn/LateReturnMonitor.jsx
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "../../../firebase";
import { checkLateStatus, sendLateReturnNotification, processAutoExtension } from "../../../utils/lateReturnUtils";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  orange: "#f59e0b",
  red: "#ef4444",
  textSec: "rgba(255,255,255,0.4)",
};

export default function LateReturnMonitor({ dealerId, onLateDetected }) {
  const [lateBookings, setLateBookings] = useState([]);
  const [processing, setProcessing] = useState({});
  const [lastCheck, setLastCheck] = useState(null);

  // Monitor for late returns
  useEffect(() => {
    if (!dealerId) return;
    
    const q = query(
      collection(db, "bookings"),
      where("dealerId", "==", dealerId),
      where("status", "in", ["active", "late_return", "critically_late", "overdue"])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Check each booking for late status
      bookings.forEach(async (booking) => {
        const lateInfo = checkLateStatus(booking);
        
        if (lateInfo.isLate) {
          // Update booking status if changed
          if (booking.status !== lateInfo.status) {
            await updateDoc(doc(db, "bookings", booking.id), {
              status: lateInfo.status,
              lateDetectedAt: new Date().toISOString(),
              lateDelayHours: lateInfo.delayHours,
            });
            
            // Send notification on first detection
            if (!booking.lateNotified) {
              await sendLateReturnNotification(booking, lateInfo);
              await updateDoc(doc(db, "bookings", booking.id), {
                lateNotified: true,
                lateNotifiedAt: new Date().toISOString(),
              });
            }
            
            if (onLateDetected) {
              onLateDetected({ booking, lateInfo });
            }
          }
          
          // Auto-extend for severe delays (over 12 hours)
          if (lateInfo.tier === "severe" || lateInfo.tier === "critical") {
            handleAutoExtension(booking);
          }
        }
      });
      
      // Update local state for display
      const late = bookings
        .map(booking => {
          const lateInfo = checkLateStatus(booking);
          return {
            ...booking,
            lateInfo: lateInfo.isLate ? lateInfo : null,
          };
        })
        .filter(booking => booking.lateInfo !== null);
      
      setLateBookings(late);
      setLastCheck(new Date().toLocaleTimeString());
    });
    
    return () => unsubscribe();
  }, [dealerId]);
  
  const handleAutoExtension = async (booking) => {
    if (processing[booking.id]) return;
    if (booking.lastAutoExtension && Date.now() - new Date(booking.lastAutoExtension).getTime() < 3600000) {
      return; // Only auto-extend once per hour
    }
    
    setProcessing(prev => ({ ...prev, [booking.id]: true }));
    
    try {
      const result = await processAutoExtension(booking, 1);
      if (result.success) {
        console.log(`Auto-extended booking ${booking.id} by 1 day`);
      }
    } catch (error) {
      console.error("Auto extension failed:", error);
    } finally {
      setProcessing(prev => ({ ...prev, [booking.id]: false }));
    }
  };
  
  if (lateBookings.length === 0) {
    return null; // Don't show anything if no late returns
  }
  
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))",
      border: "1px solid rgba(239,68,68,0.3)",
      borderRadius: "12px",
      padding: "12px 16px",
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <p style={{ margin: 0, color: "#fff", fontWeight: "700", fontSize: "13px" }}>
            {lateBookings.length} Late Return{lateBookings.length !== 1 ? "s" : ""}
          </p>
          <p style={{ margin: 0, color: T.textSec, fontSize: "11px" }}>
            Last checked: {lastCheck}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        {lateBookings.slice(0, 3).map(booking => (
          <span key={booking.id} style={{
            padding: "4px 8px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "6px",
            fontSize: "11px",
            color: T.red,
          }}>
            {booking.carModel} ({Math.round(booking.lateInfo.delayHours)}h)
          </span>
        ))}
        {lateBookings.length > 3 && (
          <span style={{ fontSize: "11px", color: T.textSec }}>
            +{lateBookings.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}