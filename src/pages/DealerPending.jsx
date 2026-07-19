import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";

function DealerPending() {
  const { user, isDealer, dealerData, logout, refreshDealerData } = useAuth();
  const navigate = useNavigate();

  // ✅ Watch dealerData.status (live from Firestore snapshot)
  useEffect(() => {
    if (dealerData?.status === "approved") {
      navigate("/dealer", { replace: true });
    }
  }, [dealerData?.status, navigate]);

  useEffect(() => {
    if (!isDealer && user) {
      navigate("/", { replace: true });
    }
  }, [isDealer, user, navigate]);

  // Derive display state from dealerData directly
  const isSuspended = dealerData?.status === "suspended";
  const isRejected = dealerData?.status === "rejected";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#0a0a1a,#0d0d20)",
        fontFamily: "Quicksand,sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          width: "100%",
          textAlign: "center",
          background: "linear-gradient(135deg,#1a1a2e,#12122a)",
          border: `1px solid ${isSuspended ? "rgba(255,77,77,0.3)" : isRejected ? "rgba(255,77,77,0.3)" : "rgba(255,165,0,0.3)"}`,
          borderRadius: "24px",
          padding: "48px 36px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background:
              isSuspended || isRejected
                ? "rgba(255,77,77,0.1)"
                : "rgba(255,165,0,0.1)",
            border: `2px solid ${
              isSuspended || isRejected
                ? "rgba(255,77,77,0.4)"
                : "rgba(255,165,0,0.4)"
            }`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            margin: "0 auto 24px",
          }}
        >
          {isSuspended ? "🚫" : isRejected ? "❌" : "⏳"}
        </div>

        {/* Title */}
        <h1
          style={{
            color: isSuspended || isRejected ? "#ff4d4d" : "#ffa500",
            margin: "0 0 12px",
            fontSize: "1.6rem",
          }}
        >
          {isSuspended
            ? "Account Suspended"
            : isRejected
              ? "Application Rejected"
              : "Application Under Review"}
        </h1>

        {/* Message */}
        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            lineHeight: "1.7",
            marginBottom: "24px",
          }}
        >
          {isSuspended ? (
            "Your dealer account has been suspended. Please contact support for more information."
          ) : isRejected ? (
            "Unfortunately, your dealer application was not approved. Please contact support if you believe this is an error."
          ) : (
            <>
              Thank you for applying to become a{" "}
              <strong style={{ color: "#4ce3f7" }}>QuickWheels Dealer</strong>!
              Our team is reviewing your application.
            </>
          )}
        </p>

        {/* Timeline - only show for pending */}
        {!isSuspended && !isRejected && (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px",
              padding: "16px 20px",
              textAlign: "left",
              marginBottom: "24px",
            }}
          >
            {[
              { icon: "✅", label: "Application submitted", done: true },
              {
                icon: "🔍",
                label: "Under review by QuickWheels",
                done: false,
                active: true,
              },
              { icon: "📧", label: "Approval email sent to you", done: false },
              { icon: "🚀", label: "Dashboard access unlocked", done: false },
            ].map(({ icon, label, done, active }, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 0",
                  borderBottom:
                    i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                <span style={{ fontSize: "16px" }}>{icon}</span>
                <span
                  style={{
                    fontSize: "13px",
                    color: done
                      ? "#22c55e"
                      : active
                        ? "#fff"
                        : "rgba(255,255,255,0.3)",
                    fontWeight: done || active ? "600" : "400",
                  }}
                >
                  {label}
                </span>
                {active && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "rgba(255,165,0,0.15)",
                      border: "1px solid rgba(255,165,0,0.3)",
                      borderRadius: "20px",
                      padding: "2px 8px",
                      fontSize: "10px",
                      color: "#ffa500",
                      fontWeight: "700",
                    }}
                  >
                    In Progress
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Dealer info */}
        {dealerData && (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "24px",
              textAlign: "left",
            }}
          >
            <p
              style={{
                margin: "0 0 6px",
                color: "rgba(255,255,255,0.35)",
                fontSize: "11px",
                textTransform: "uppercase",
              }}
            >
              Your Application
            </p>
            <p
              style={{
                margin: "0 0 4px",
                color: "#fff",
                fontWeight: "700",
                fontSize: "14px",
              }}
            >
              {dealerData.businessName}
            </p>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.4)",
                fontSize: "12px",
              }}
            >
              {dealerData.city}, {dealerData.state} · {dealerData.ownerEmail}
            </p>
          </div>
        )}

        {!isSuspended && !isRejected && (
          <p
            style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: "12px",
              marginBottom: "24px",
            }}
          >
            Expected review time:{" "}
            <strong style={{ color: "rgba(255,255,255,0.5)" }}>
              24–48 hours
            </strong>
            . This page auto-updates when approved — no need to refresh!
          </p>
        )}

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Only show Check Status for pending */}
          {!isSuspended && !isRejected && (
            <button
              onClick={refreshDealerData}
              style={{
                background: "linear-gradient(30deg,#0400ff,#4ce3f7)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                padding: "11px 22px",
                fontWeight: "700",
                cursor: "pointer",
                fontFamily: "Quicksand,sans-serif",
                fontSize: "14px",
              }}
            >
              🔄 Check Status
            </button>
          )}
          <button
            onClick={logout}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "10px",
              color: "#fff",
              padding: "11px 22px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Quicksand,sans-serif",
              fontSize: "14px",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default DealerPending;
