// src/components/dealer/analytics/CustomerSatisfaction.jsx
import { useState, useEffect } from "react";
import { calculateCustomerSatisfaction } from "../../../utils/analyticsUtils";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  orange: "#f59e0b",
  gold: "#fbbf24",
  textSec: "rgba(255,255,255,0.4)",
};

// ── Animated numeric counter (eased ramp from 0 → target) ─────────────────────
function useAnimatedValue(target, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    let start = null;
    setValue(0);
    function step(ts) {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
}

// ── Distribution bar that fills in from 0% on mount ────────────────────────────
function DistBar({ pct, color }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setRevealed(false);
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setRevealed(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [pct]);

  return (
    <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
      <div style={{
        width: revealed ? `${pct}%` : "0%",
        height: "100%",
        background: color,
        borderRadius: "3px",
        transition: "width 0.9s cubic-bezier(0.16,1,0.3,1)",
      }} />
    </div>
  );
}

// ── Trend bar that grows up from 0 on mount ────────────────────────────────────
function TrendBar({ height, index = 0 }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    setGrown(false);
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setGrown(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [height]);

  return (
    <div
      style={{
        width: "100%",
        height: grown ? `${height}px` : "0px",
        background: `linear-gradient(180deg, ${T.gold}, #d97706)`,
        borderRadius: "4px 4px 0 0",
        transition: `height 0.7s cubic-bezier(0.16,1,0.3,1) ${index * 40}ms`,
      }}
    />
  );
}

export default function CustomerSatisfaction({ dealerId }) {
  const [satisfactionData, setSatisfactionData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchReviews = async () => {
      if (!dealerId) return;
      
      try {
        // Fetch all bookings for this dealer first
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("dealerId", "==", dealerId),
          where("status", "==", "completed")
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        const bookingIds = bookingsSnap.docs.map(doc => doc.id);
        
        if (bookingIds.length === 0) {
          setSatisfactionData(calculateCustomerSatisfaction([]));
          setLoading(false);
          return;
        }
        
        // Fetch reviews for these bookings
        // Note: Reviews might be stored differently based on your structure
        // This assumes reviews are in a subcollection or separate collection
        let allReviews = [];
        
        for (const bookingId of bookingIds.slice(0, 10)) { // Limit for performance
          const reviewsQuery = query(
            collection(db, "bookings", bookingId, "reviews")
          );
          const reviewsSnap = await getDocs(reviewsQuery);
          const reviews = reviewsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            bookingId,
          }));
          allReviews.push(...reviews);
        }
        
        setSatisfactionData(calculateCustomerSatisfaction(allReviews));
      } catch (error) {
        console.error("Error fetching reviews:", error);
        setSatisfactionData(calculateCustomerSatisfaction([]));
      } finally {
        setLoading(false);
      }
    };
    
    fetchReviews();
  }, [dealerId]);

  const animatedRating = useAnimatedValue(satisfactionData?.averageRating || 0, 1100);
  
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: T.textSec }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: "30px", height: "30px", margin: "0 auto", border: "2px solid rgba(251,191,36,.2)", borderTopColor: T.gold, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }
  
  if (!satisfactionData || satisfactionData.totalReviews === 0) {
    return (
      <div className="csat-root" style={{
        background: "linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",
        border: "1px solid rgba(255,255,255,.07)",
        borderRadius: "20px",
        padding: "40px",
        textAlign: "center",
      }}>
        <style>{`
          @media (max-width: 480px) {
            .csat-root { padding: 28px 20px !important; border-radius: 16px !important; }
          }
        `}</style>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <h3 style={{ color: "#fff", marginBottom: "5px" }}>No Reviews Yet</h3>
        <p style={{ color: T.textSec, fontSize: "13px" }}>Customer satisfaction data will appear here once reviews are submitted</p>
      </div>
    );
  }
  
  const getRatingColor = (rating) => {
    if (rating >= 4.5) return T.green;
    if (rating >= 3.5) return T.orange;
    return T.red;
  };

  const ratingColor = getRatingColor(satisfactionData.averageRating);
  const dashPct = (Math.min(Math.max(animatedRating, 0), 5) / 5) * 220;
  
  return (
    <div className="csat-root" style={{
      background: "linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",
      border: "1px solid rgba(255,255,255,.07)",
      borderRadius: "20px",
      padding: "24px",
    }}>
      <style>{`
        .csat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 20px;
        }
        @media (max-width: 900px) {
          .csat-root { padding: 20px !important; border-radius: 18px !important; }
        }
        @media (max-width: 560px) {
          .csat-root { padding: 16px !important; }
          .csat-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .csat-gauge-wrap { max-width: 180px !important; }
        }
        @media (max-width: 420px) {
          .csat-root { padding: 14px !important; border-radius: 16px !important; }
        }
      `}</style>

      <h3 style={{ margin: "0 0 20px", fontSize: "16px", fontWeight: "800", color: "#fff" }}>
        ⭐ Customer Satisfaction
      </h3>
      
      <div className="csat-grid">
        {/* Gauge */}
        <div style={{ textAlign: "center" }}>
          <div className="csat-gauge-wrap" style={{ width: "100%", maxWidth: "200px", margin: "0 auto" }}>
            <svg viewBox="0 0 160 100" style={{ width: "100%", height: "auto", display: "block" }}>
              <path
                d="M 20,75 A 70,70 0 0,1 140,75"
                fill="none"
                stroke="rgba(255,255,255,.1)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 20,75 A 70,70 0 0,1 140,75"
                fill="none"
                stroke={ratingColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dashPct} 220`}
              />
              <text x="80" y="55" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="800">
                {animatedRating.toFixed(1)}
              </text>
              <text x="80" y="70" textAnchor="middle" fill={T.textSec} fontSize="10">
                / 5 stars
              </text>
            </svg>
          </div>
          <div style={{ marginTop: "8px", fontSize: "11px", color: T.textSec }}>
            {satisfactionData.satisfactionRate}% satisfied (4-5 stars)
          </div>
        </div>
        
        {/* Rating Distribution */}
        <div>
          <p style={{ margin: "0 0 12px", fontSize: "12px", color: T.textSec }}>Rating Distribution</p>
          {[5, 4, 3, 2, 1].map(rating => {
            const count = satisfactionData.distribution[rating] || 0;
            const percentage = (count / satisfactionData.totalReviews) * 100;
            return (
              <div key={rating} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", color: T.gold, minWidth: "20px" }}>{rating}★</span>
                <DistBar pct={percentage} color={T.gold} />
                <span style={{ fontSize: "10px", color: T.textSec, minWidth: "30px" }}>{count}</span>
              </div>
            );
          })}
        </div>
        
        {/* Trend */}
        <div>
          <p style={{ margin: "0 0 12px", fontSize: "12px", color: T.textSec }}>Monthly Trend</p>
          <div style={{ height: "80px", display: "flex", alignItems: "flex-end", gap: "8px" }}>
            {satisfactionData.trend.slice(-6).map((item, idx) => {
              const height = (item.rating / 5) * 60;
              return (
                <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <TrendBar height={height} index={idx} />
                  <span style={{ fontSize: "8px", color: T.textSec, textAlign: "center" }}>
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "12px", textAlign: "center", fontSize: "10px", color: T.textSec }}>
            {satisfactionData.totalReviews} total reviews
          </div>
        </div>
      </div>
    </div>
  );
}