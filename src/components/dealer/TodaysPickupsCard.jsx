import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  orange: "#f59e0b",
  textSec: "rgba(255,255,255,0.4)",
};

export default function TodaysPickupsCard({ dealerId }) {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealerId) return;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const q = query(
      collection(db, "bookings"),
      where("dealerId", "==", dealerId),
      where("pickupDate", ">=", todayStr),
      where("pickupDate", "<", tomorrowStr)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPickups(bookings);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching pickups:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dealerId]);

  const pendingPickups = pickups.filter(b => b.status === "pending_approval");
  const confirmedPickups = pickups.filter(b => 
    b.status === "confirmed" || b.status === "dealer_confirmed"
  );

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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ce3f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Today's Pickups
          </h3>
          <p className="dash-big-num" style={{ margin: "6px 0 0", fontSize: "32px", fontWeight: "800", color: "#fff", fontFamily: "Quicksand, sans-serif" }}>
            {pickups.length}
          </p>
        </div>
        <div className="dash-icon-box" style={{
          width: "48px",
          height: "48px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(76, 227, 247, 0.15), rgba(76, 227, 247, 0.02))",
          border: "1px solid rgba(76, 227, 247, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#4ce3f7",
          boxShadow: "0 4px 20px rgba(76, 227, 247, 0.1)"
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
      </div>
      
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px", color: T.textSec }}>
          <div style={{ width: "30px", height: "30px", margin: "0 auto", border: "2px solid rgba(147,51,234,.2)", borderTopColor: "#9333ea", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : pickups.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 20px", color: T.textSec, fontSize: "13px" }}>
          No pickups scheduled for today
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "320px", overflowY: "auto" }}>
          {pickups.map(booking => (
            <div key={booking.id} style={{
              padding: "12px",
              background: "rgba(255,255,255,.02)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,.05)",
              transition: "all .2s ease",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontWeight: "700", color: "#fff", fontSize: "13px" }}>{booking.carModel}</span>
                <span style={{ 
                  fontSize: "10px", 
                  padding: "2px 8px",
                  borderRadius: "10px",
                  background: booking.status === "confirmed" || booking.status === "dealer_confirmed" 
                    ? `${T.green}15` 
                    : `${T.orange}15`,
                  color: booking.status === "confirmed" || booking.status === "dealer_confirmed" ? T.green : T.orange,
                  fontWeight: "600"
                }}>
                  {booking.status === "confirmed" || booking.status === "dealer_confirmed" ? "Confirmed" : "Pending"}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: T.textSec }}>
                {booking.userName || booking.userEmail?.split('@')[0] || "Guest"} • {booking.pickupTime || "Flexible"}
              </div>
              {booking.bookingId && (
                <div style={{ fontSize: "9px", color: T.textSec, marginTop: "4px", fontFamily: "monospace" }}>
                  #{booking.bookingId.slice(-8)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}