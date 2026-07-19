// src/components/dealer/verification/CustomerIdentityCheck.jsx
import { useState, useRef } from "react";
import { uploadCustomerID, generateVerificationCode, sendVerificationCode } from "../../../utils/verificationUtils";
import PhotoUpload from "../inspection/PhotoUpload";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  textSec: "rgba(255,255,255,0.4)",
};

export default function CustomerIdentityCheck({ booking, onVerified, onSkip }) {
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [idPhotos, setIdPhotos] = useState([]);
  const [idType, setIdType] = useState("license");
  const [idNumber, setIdNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeExpiry, setCodeExpiry] = useState(null);

  const handleSendCode = async () => {
    setLoading(true);
    const code = generateVerificationCode();
    setVerificationCode(code);
    setCodeExpiry(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    
    const sent = await sendVerificationCode(booking.userEmail, code, booking.userName);
    if (sent) {
      setCodeSent(true);
      alert(`Verification code sent to ${booking.userEmail}`);
    } else {
      alert("Failed to send verification code. Please try again.");
    }
    setLoading(false);
  };

  const handleVerifyCode = () => {
    if (enteredCode === verificationCode && codeExpiry > Date.now()) {
      setStep(2);
    } else if (codeExpiry <= Date.now()) {
      alert("Verification code has expired. Please request a new one.");
    } else {
      alert("Invalid verification code. Please try again.");
    }
  };

  const handleSubmitID = async () => {
    if (idPhotos.length === 0) {
      alert("Please upload ID document photo");
      return;
    }
    
    if (!idNumber) {
      alert("Please enter ID number");
      return;
    }
    
    setLoading(true);
    try {
      const uploadedPhotos = [];
      for (const photo of idPhotos) {
        const url = await uploadCustomerID(photo, booking.id, idType);
        uploadedPhotos.push(url);
      }
      
      onVerified({
        verified: true,
        method: "code_and_id",
        idType,
        idNumber,
        idPhotos: uploadedPhotos,
        verifiedAt: new Date().toISOString(),
        verifiedBy: "dealer",
      });
    } catch (error) {
      console.error("Error uploading ID:", error);
      alert("Failed to upload ID. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div style={{ padding: "20px" }}>
        <h3 style={{ color: T.cyan, marginBottom: "20px" }}>🔐 Customer Identity Verification</h3>
        
        <div style={{
          background: "rgba(255,255,255,.03)",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "20px"
        }}>
          <p style={{ margin: "0 0 10px", color: "#fff" }}>
            <strong>Customer:</strong> {booking.userName || booking.userEmail}
          </p>
          <p style={{ margin: "0", color: T.textSec, fontSize: "13px" }}>
            Verify customer identity before handing over the vehicle.
          </p>
        </div>
        
        {!codeSent ? (
          <button
            onClick={handleSendCode}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: `linear-gradient(135deg, ${T.cyan}, #0400ff)`,
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "600",
              fontSize: "14px",
              marginBottom: "12px"
            }}
          >
            {loading ? "Sending..." : "📧 Send Verification Code"}
          </button>
        ) : (
          <>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "5px", display: "block" }}>
                Enter 6-digit verification code
              </label>
              <input
                type="text"
                maxLength={6}
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value)}
                placeholder="000000"
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "18px",
                  textAlign: "center",
                  letterSpacing: "4px"
                }}
              />
              <div style={{ fontSize: "11px", color: T.textSec, marginTop: "5px" }}>
                Code expires in {Math.max(0, Math.ceil((codeExpiry - Date.now()) / 60000))} minutes
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleSendCode}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: "8px",
                  color: T.textSec,
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                Resend Code
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={enteredCode.length !== 6}
                style={{
                  flex: 2,
                  padding: "12px",
                  background: enteredCode.length === 6 ? `linear-gradient(135deg, ${T.green}, #16a34a)` : "rgba(255,255,255,.1)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                  cursor: enteredCode.length === 6 ? "pointer" : "not-allowed",
                  fontWeight: "600",
                  opacity: enteredCode.length === 6 ? 1 : 0.5
                }}
              >
                Verify Code →
              </button>
            </div>
          </>
        )}
        
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            onClick={onSkip}
            style={{
              background: "none",
              border: "none",
              color: T.textSec,
              cursor: "pointer",
              fontSize: "12px",
              textDecoration: "underline"
            }}
          >
            Skip verification (not recommended)
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ padding: "20px" }}>
      <h3 style={{ color: T.cyan, marginBottom: "20px" }}>📄 ID Document Verification</h3>
      
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "5px", display: "block" }}>
          ID Type *
        </label>
        <select
          value={idType}
          onChange={(e) => setIdType(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: "8px",
            color: "#fff"
          }}
        >
          <option value="license">Driver's License</option>
          <option value="passport">Passport</option>
          <option value="aadhar">Aadhar Card (India)</option>
          <option value="national_id">National ID Card</option>
        </select>
      </div>
      
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "5px", display: "block" }}>
          ID Number *
        </label>
        <input
          type="text"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          placeholder="Enter ID number"
          style={{
            width: "100%",
            padding: "12px",
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: "8px",
            color: "#fff"
          }}
        />
      </div>
      
      <PhotoUpload
        section="ID Document"
        photos={idPhotos}
        onPhotosChange={setIdPhotos}
        maxPhotos={2}
      />
      
      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button
          onClick={() => setStep(1)}
          style={{
            flex: 1,
            padding: "12px",
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: "8px",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          ← Back
        </button>
        <button
          onClick={handleSubmitID}
          disabled={loading || idPhotos.length === 0 || !idNumber}
          style={{
            flex: 2,
            padding: "12px",
            background: (loading || idPhotos.length === 0 || !idNumber) ? "rgba(255,255,255,.1)" : `linear-gradient(135deg, ${T.green}, #16a34a)`,
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            cursor: (loading || idPhotos.length === 0 || !idNumber) ? "not-allowed" : "pointer",
            fontWeight: "600"
          }}
        >
          {loading ? "Uploading..." : "Complete Verification →"}
        </button>
      </div>
    </div>
  );
}