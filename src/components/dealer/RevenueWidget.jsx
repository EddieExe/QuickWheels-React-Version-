import { useState, useEffect, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  textSec: "rgba(255,255,255,0.4)",
};

export default function RevenueWidget({ dealerId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealerId) return;
    
    const q = query(
      collection(db, "bookings"),
      where("dealerId", "==", dealerId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bookings for revenue:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dealerId]);

  const revenue = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    const completedStatuses = ["confirmed", "completed", "dealer_confirmed"];
    
    const todayRevenue = bookings
      .filter(b => {
        const bookingDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return completedStatuses.includes(b.status) && bookingDate.toISOString().split('T')[0] === today;
      })
      .reduce((sum, b) => sum + (b.total || 0), 0);
    
    const weekRevenue = bookings
      .filter(b => {
        const bookingDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return completedStatuses.includes(b.status) && bookingDate >= weekAgo;
      })
      .reduce((sum, b) => sum + (b.total || 0), 0);
    
    const monthRevenue = bookings
      .filter(b => {
        const bookingDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return completedStatuses.includes(b.status) && bookingDate >= monthAgo;
      })
      .reduce((sum, b) => sum + (b.total || 0), 0);
    
    return { today: todayRevenue, week: weekRevenue, month: monthRevenue };
  }, [bookings]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
        marginBottom: "20px",
        padding: "4px"
      }}>
        <div>
          <h3 style={{ 
            margin: 0, 
            fontSize: "14px", 
            color: "#fff", 
            fontWeight: "700",
            letterSpacing: "0.3px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Revenue Summary
          </h3>
        </div>
        <div className="dash-icon-box" style={{
          width: "44px",
          height: "44px",
          borderRadius: "14px",
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.02))",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f59e0b",
          boxShadow: "0 4px 20px rgba(245, 158, 11, 0.1)"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
      </div>
      
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px", color: T.textSec }}>
          <div style={{ width: "30px", height: "30px", margin: "0 auto", border: "2px solid rgba(147,51,234,.2)", borderTopColor: "#9333ea", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{
            padding: "14px",
            background: "linear-gradient(135deg, rgba(34,197,94,.1), rgba(34,197,94,.03))",
            borderRadius: "14px",
            border: "1px solid rgba(34,197,94,.15)",
          }}>
            <div style={{ fontSize: "11px", color: T.textSec, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Today</div>
            <div className="dash-big-num" style={{ fontSize: "28px", fontWeight: "800", color: T.green }}>
              {formatCurrency(revenue.today)}
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,.03)", borderRadius: "12px" }}>
              <div style={{ fontSize: "10px", color: T.textSec, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>This Week</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#fff" }}>
                {formatCurrency(revenue.week)}
              </div>
            </div>
            <div style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,.03)", borderRadius: "12px" }}>
              <div style={{ fontSize: "10px", color: T.textSec, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>This Month</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#fff" }}>
                {formatCurrency(revenue.month)}
              </div>
            </div>
          </div>
          
          <div style={{ fontSize: "10px", color: T.textSec, textAlign: "center", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
            Updated in real-time from confirmed bookings
          </div>
        </div>
      )}
    </div>
  );
}