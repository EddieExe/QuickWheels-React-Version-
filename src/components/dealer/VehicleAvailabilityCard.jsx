import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  textSec: "rgba(255,255,255,0.4)",
};

export default function VehicleAvailabilityCard({ dealerId }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealerId) return;
    
    const unsubscribe = onSnapshot(
      collection(db, "dealers", dealerId, "cars"),
      (snapshot) => {
        const carList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCars(carList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching cars:", error);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [dealerId]);

  const totalCars = cars.length;
  const availableCars = cars.filter(c => c.isAvailable === true).length;
  const availabilityPercent = totalCars > 0 ? (availableCars / totalCars) * 100 : 0;

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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M5 11V7a3 3 0 0 1 6 0v4M19 11V7a3 3 0 0 0-6 0v4" />
            </svg>
            Vehicle Availability
          </h3>
          <p className="dash-big-num" style={{ margin: "6px 0 0", fontSize: "32px", fontWeight: "800", color: "#fff", fontFamily: "Quicksand, sans-serif" }}>
            {availableCars} <span style={{ fontSize: "20px", color: T.textSec, fontWeight: "500" }}>/ {totalCars}</span>
          </p>
        </div>
        <div className="dash-icon-box" style={{
          width: "48px",
          height: "48px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.02))",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#3b82f6",
          boxShadow: "0 4px 20px rgba(59, 130, 246, 0.1)"
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="10" r="1" />
            <circle cx="17" cy="10" r="1" />
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
      ) : totalCars === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 20px", color: T.textSec, fontSize: "13px" }}>
          No vehicles in fleet yet
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
              fontSize: "11px",
              color: T.textSec,
            }}>
              <span>Available</span>
              <span>{availabilityPercent.toFixed(0)}%</span>
            </div>
            <div style={{
              height: "8px",
              borderRadius: "4px",
              background: "rgba(255,255,255,.06)",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${availabilityPercent}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${T.green}, ${T.cyan})`,
                borderRadius: "4px",
                transition: "width .3s ease",
              }} />
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1, textAlign: "center", padding: "10px", background: "rgba(34,197,94,.08)", borderRadius: "12px" }}>
              <div style={{ fontSize: "11px", color: T.textSec }}>Available</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: T.green }}>{availableCars}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", padding: "10px", background: "rgba(239,68,68,.08)", borderRadius: "12px" }}>
              <div style={{ fontSize: "11px", color: T.textSec }}>Unavailable</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: T.red }}>{totalCars - availableCars}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}