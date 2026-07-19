import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  textSec: "rgba(255,255,255,0.4)",
};

export default function TodaysReturnsCard({ dealerId }) {
  const [returns, setReturns] = useState([]);
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
      where("dropoffDate", ">=", todayStr),
      where("dropoffDate", "<", tomorrowStr)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReturns(bookings);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching returns:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dealerId]);

  const activeReturns = returns.filter(b => 
    b.status === "confirmed" || b.status === "active" || b.status === "dealer_confirmed"
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Today's Returns
          </h3>
          <p className="dash-big-num" style={{ margin: "6px 0 0", fontSize: "32px", fontWeight: "800", color: "#fff", fontFamily: "Quicksand, sans-serif" }}>
            {activeReturns.length}
          </p>
        </div>
        <div className="dash-icon-box" style={{
          width: "48px",
          height: "48px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.02))",
          border: "1px solid rgba(34, 197, 94, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#22c55e",
          boxShadow: "0 4px 20px rgba(34, 197, 94, 0.1)"
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </div>
      </div>
      
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px", color: T.textSec }}>
          <div style={{ width: "30px", height: "30px", margin: "0 auto", border: "2px solid rgba(147,51,234,.2)", borderTopColor: "#9333ea", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : returns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 20px", color: T.textSec, fontSize: "13px" }}>
          No returns scheduled for today
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "320px", overflowY: "auto" }}>
          {returns.map(booking => (
            <div key={booking.id} style={{
              padding: "12px",
              background: "rgba(255,255,255,.02)",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,.05)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontWeight: "700", color: "#fff", fontSize: "13px" }}>{booking.carModel}</span>
                <span style={{ fontSize: "10px", color: T.green, fontWeight: "600" }}>Due today</span>
              </div>
              <div style={{ fontSize: "11px", color: T.textSec }}>
                {booking.userName || booking.userEmail?.split('@')[0] || "Guest"} • {booking.dropoffTime || "End of day"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}