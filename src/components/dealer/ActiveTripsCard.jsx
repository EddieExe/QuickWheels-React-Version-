import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

const T = {
  cyan: "#4ce3f7",
  textSec: "rgba(255,255,255,0.4)",
};

export default function ActiveTripsCard({ dealerId }) {
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealerId) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    const q = query(
      collection(db, "bookings"),
      where("dealerId", "==", dealerId),
      where("status", "in", ["confirmed", "dealer_confirmed", "active"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const active = bookings.filter(b => {
        if (!b.pickupDate || !b.dropoffDate) return false;
        return b.pickupDate <= today && b.dropoffDate >= today;
      });
      setActiveTrips(active);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching active trips:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dealerId]);

  return (
    <div className="dash-card" style={{
      background: "linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",
      border: "1px solid rgba(255,255,255,.07)",
      borderRadius: "20px",
      padding: "20px",
    }}>
      <style>{`
        .dash-card {
          transition: all 0.3s ease;
        }
        .dash-card:hover {
          border-color: rgba(147,51,234,0.3) !important;
          box-shadow: 0 12px 32px -12px rgba(147,51,234,0.3);
          transform: translateY(-3px);
        }
        @media (max-width: 768px) {
          .dash-card { padding: 14px !important; }
        }
        @media (max-width: 480px) {
          .dash-card { padding: 12px !important; }
          .dash-big-num { font-size: 22px !important; }
          .dash-icon-box { width: 40px !important; height: 40px !important; }
        }
        @media (max-width: 360px) {
          .dash-card { padding: 10px !important; }
        }
      `}</style>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "16px",
        padding: "4px"
      }}>
        <div>
          <h3 style={{ 
            margin: 0, 
            fontSize: "13px", 
            color: T.textSec, 
            fontWeight: "600",
            letterSpacing: "0.3px",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M9 17h6" />
              <circle cx="17" cy="17" r="2" />
            </svg>
            Active Trips
          </h3>
          <p className="dash-big-num" style={{ margin: "6px 0 0", fontSize: "32px", fontWeight: "800", color: "#fff", fontFamily: "Quicksand, sans-serif" }}>
            {activeTrips.length}
          </p>
        </div>
        <div className="dash-icon-box" style={{
          width: "48px",
          height: "48px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.02))",
          border: "1px solid rgba(168, 85, 247, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#a855f7",
          boxShadow: "0 4px 20px rgba(168, 85, 247, 0.1)"
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
        </div>
      </div>
      
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px", color: T.textSec }}>
          <div style={{ width: "30px", height: "30px", margin: "0 auto", border: "2px solid rgba(147,51,234,.2)", borderTopColor: "#9333ea", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : activeTrips.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 20px", color: T.textSec, fontSize: "13px" }}>
          No active trips at the moment
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "320px", overflowY: "auto" }}>
          {activeTrips.map(booking => (
            <div key={booking.id} style={{
              padding: "12px",
              background: "rgba(255,255,255,.02)",
              borderRadius: "12px",
              borderLeft: `3px solid ${T.cyan}`,
            }}>
              <div style={{ fontWeight: "700", color: "#fff", fontSize: "13px", marginBottom: "4px" }}>
                {booking.carModel}
              </div>
              <div style={{ fontSize: "11px", color: T.textSec }}>
                {booking.userName || booking.userEmail?.split('@')[0] || "Guest"} • {booking.pickup} → {booking.dropoff}
              </div>
              <div style={{ fontSize: "10px", color: T.textSec, marginTop: "6px" }}>
                Returns: {booking.dropoffDate}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}