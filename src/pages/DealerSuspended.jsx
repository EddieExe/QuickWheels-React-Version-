// src/pages/DealerSuspended.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

function DealerSuspended() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [suspensionInfo, setSuspensionInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSuspensionInfo() {
      if (!user) return;
      
      try {
        // Get dealer info from users collection
        const userRef = doc(db, "users", user.email);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          
          // Get dealer details from dealers collection
          if (userData.dealerId) {
            const dealerRef = doc(db, "dealers", userData.dealerId);
            const dealerSnap = await getDoc(dealerRef);
            
            if (dealerSnap.exists()) {
              const dealerData = dealerSnap.data();
              setSuspensionInfo({
                suspendedAt: dealerData.suspendedAt?.toDate?.() || new Date(),
                reason: dealerData.adminActionReason || "Violation of terms of service",
                suspendedBy: dealerData.suspendedBy || "Admin",
              });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching suspension info:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSuspensionInfo();
  }, [user]);

  const handleSignOut = async () => {
    await logout();
    navigate("/");
  };

  const handleContactSupport = () => {
    window.location.href = "mailto:support@quickwheels.com?subject=Dealer Account Suspension Appeal";
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#0a0a1a,#0d0d20)",
        fontFamily: "Quicksand,sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            border: "2px solid rgba(76,227,247,0.1)",
            borderTopColor: "#4ce3f7",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 20px",
          }} />
          <p style={{ color: "rgba(255,255,255,0.5)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg,#0a0a1a,#0d0d20)",
      fontFamily: "Quicksand,sans-serif",
      padding: "20px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated background elements */}
      <div style={{
        position: "absolute",
        top: "-20%",
        right: "-10%",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(239,68,68,0.08), transparent 70%)",
        animation: "pulse 4s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        bottom: "-20%",
        left: "-10%",
        width: "350px",
        height: "350px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(76,227,247,0.04), transparent 70%)",
        animation: "pulse 5s ease-in-out infinite reverse",
      }} />

      <div style={{
        maxWidth: "550px",
        width: "100%",
        textAlign: "center",
        background: "linear-gradient(135deg,rgba(20,20,40,0.95),rgba(10,10,30,0.95))",
        border: "1px solid rgba(239,68,68,0.3)",
        borderRadius: "28px",
        padding: "40px",
        boxShadow: "0 30px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,68,68,0.1)",
        backdropFilter: "blur(20px)",
        position: "relative",
        zIndex: 1,
        animation: "slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Suspended icon with animation */}
        <div style={{
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))",
          border: "2px solid rgba(239,68,68,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "50px",
          margin: "0 auto 24px",
          animation: "pulse 2s ease-in-out infinite",
          boxShadow: "0 0 40px rgba(239,68,68,0.2)",
        }}>
          🚫
        </div>

        <h1>Account Suspended</h1>

        <p style={{
          color: "rgba(255,255,255,0.6)",
          lineHeight: "1.7",
          marginBottom: "24px",
          fontSize: "15px",
        }}>
          Your dealer account has been <strong style={{ color: "#ef4444" }}>temporarily suspended</strong>.
          You cannot access the dealer dashboard or manage bookings at this time.
        </p>

        {/* Suspension details card */}
        <div style={{
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "16px",
          padding: "20px",
          textAlign: "left",
          marginBottom: "28px",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid rgba(239,68,68,0.15)",
          }}>
            <span style={{ fontSize: "18px" }}>⚠️</span>
            <span style={{ color: "#ef4444", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Suspension Details
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>Suspended on</span>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: "600" }}>
                {suspensionInfo?.suspendedAt?.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) || "—"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>Suspended by</span>
              <span style={{ color: "#4ce3f7", fontSize: "13px", fontWeight: "700" }}>
                {suspensionInfo?.suspendedBy || "Admin"}
              </span>
            </div>
            {suspensionInfo?.reason && (
              <div style={{ marginTop: "8px", paddingTop: "12px", borderTop: "1px solid rgba(239,68,68,0.1)" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", display: "block", marginBottom: "6px" }}>Reason</span>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: "1.6", fontStyle: "italic" }}>
                  "{suspensionInfo?.reason}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Appeal instructions */}
        <div style={{
          background: "rgba(76,227,247,0.04)",
          border: "1px solid rgba(76,227,247,0.12)",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "28px",
        }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "12px", lineHeight: "1.6" }}>
            📧 To appeal this decision or request a review, please contact our support team with your dealer ID and business details.
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleContactSupport}
            style={{
              background: "linear-gradient(30deg,#0400ff,#4ce3f7)",
              border: "none",
              borderRadius: "12px",
              color: "#fff",
              padding: "12px 28px",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: "Quicksand,sans-serif",
              fontSize: "14px",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 25px rgba(4,0,255,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            📧 Contact Support
          </button>
          <button
            onClick={handleSignOut}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "12px",
              color: "#fff",
              padding: "12px 28px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Quicksand,sans-serif",
              fontSize: "14px",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Disclaimer */}
        <p style={{
          marginTop: "28px",
          color: "rgba(255,255,255,0.5)",
          fontSize: "12px",
          textAlign: "center",
        }}>
          QuickWheels reserves the right to suspend accounts that violate our terms of service.
        </p>
      </div>

      {/* Add keyframes animation */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default DealerSuspended;