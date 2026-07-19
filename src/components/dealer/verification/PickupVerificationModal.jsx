// src/components/dealer/verification/PickupVerificationModal.jsx
import { useState } from "react";
import CustomerIdentityCheck from "./CustomerIdentityCheck";
import HandoverConfirmation from "./HandoverConfirmation";
import { updateBookingStatus, sendVerificationCode } from "../../../utils/verificationUtils";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  textSec: "rgba(255,255,255,0.4)",
};

export default function PickupVerificationModal({ booking, inspectionData, onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [identityData, setIdentityData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleIdentityVerified = (data) => {
    setIdentityVerified(true);
    setIdentityData(data);
    setStep(2);
  };

  const handleHandoverConfirm = async (handoverData) => {
    setLoading(true);
    try {
      // Update booking with verification data
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "active",
        pickupVerified: true,
        pickupVerification: {
          identity: identityData,
          handover: handoverData,
          inspection: inspectionData,
          verifiedAt: new Date().toISOString(),
          verifiedBy: "dealer",
        },
        activeFrom: new Date().toISOString(),
        timeline: {
          ...booking.timeline,
          verified: new Date().toISOString(),
          active: new Date().toISOString(),
        },
      });
      
      // Send confirmation to customer
      await sendVerificationCode(
        booking.userEmail,
        `TRIP-${booking.bookingId?.slice(-6)}`,
        booking.userName
      );
      
      onComplete({
        success: true,
        status: "active",
        handoverData,
        identityData,
      });
    } catch (error) {
      console.error("Error completing pickup verification:", error);
      alert("Failed to complete verification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: "Identity Verification", icon: "🔐" },
    { id: 2, title: "Handover Confirmation", icon: "✍️" },
  ];

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,.95)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      overflowY: "auto"
    }}>
      <div style={{
        maxWidth: "700px",
        width: "100%",
        background: "#0c0c16",
        borderRadius: "24px",
        border: `1px solid ${T.cyan}33`,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,.1)",
          background: "rgba(0,0,0,.3)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h2 style={{ color: T.cyan, margin: 0 }}>
              🚗 Pickup Verification
            </h2>
            <button
              onClick={onCancel}
              style={{
                background: "none",
                border: "none",
                color: T.textSec,
                fontSize: "24px",
                cursor: "pointer"
              }}
            >
              ×
            </button>
          </div>
          
          {/* Progress steps */}
          <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
            {steps.map(s => (
              <div
                key={s.id}
                style={{
                  flex: 1,
                  padding: "8px",
                  textAlign: "center",
                  background: step >= s.id ? `${T.cyan}20` : "rgba(255,255,255,.05)",
                  borderRadius: "8px",
                  border: step === s.id ? `1px solid ${T.cyan}` : "1px solid rgba(255,255,255,.05)",
                  color: step >= s.id ? T.cyan : T.textSec,
                  fontSize: "12px",
                  fontWeight: "600"
                }}
              >
                {s.icon} {s.title}
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {step === 1 && (
            <CustomerIdentityCheck
              booking={booking}
              onVerified={handleIdentityVerified}
              onSkip={() => {
                setIdentityVerified(true);
                setStep(2);
              }}
            />
          )}
          
          {step === 2 && (
            <HandoverConfirmation
              booking={{ ...booking, ...inspectionData }}
              onConfirm={handleHandoverConfirm}
              onBack={() => setStep(1)}
            />
          )}
        </div>
        
        {/* Footer */}
        {loading && (
          <div style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,.1)",
            textAlign: "center",
            color: T.cyan
          }}>
            Processing verification...
          </div>
        )}
      </div>
    </div>
  );
}