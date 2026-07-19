// src/components/dealer/verification/HandoverConfirmation.jsx
import { useState, useRef, useEffect } from "react";
import { saveDigitalSignature } from "../../../utils/verificationUtils";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  textSec: "rgba(255,255,255,0.4)",
};

export default function HandoverConfirmation({ booking, onConfirm, onBack }) {
  const [signatureType, setSignatureType] = useState("dealer");
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatures, setSignatures] = useState({ dealer: null, customer: null });
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = 200;
      const ctx = canvas.getContext("2d");
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctxRef.current = ctx;
    }
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    ctxRef.current.beginPath();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    setSignatures(prev => ({ ...prev, [signatureType]: null }));
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    const signatureUrl = await saveDigitalSignature(canvas, booking.id, signatureType);
    setSignatures(prev => ({ ...prev, [signatureType]: signatureUrl }));
    alert(`${signatureType === "dealer" ? "Dealer" : "Customer"} signature saved!`);
  };

  const handleConfirm = async () => {
    if (!signatures.dealer) {
      alert("Please add dealer signature");
      return;
    }
    if (!signatures.customer) {
      alert("Please add customer signature");
      return;
    }
    if (!agreed) {
      alert("Please agree to the handover terms");
      return;
    }
    
    setLoading(true);
    try {
      onConfirm({
        signatures,
        handoverTime: new Date().toISOString(),
        agreedTerms: agreed,
      });
    } catch (error) {
      console.error("Error saving handover:", error);
      alert("Failed to complete handover");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h3 style={{ color: T.cyan, marginBottom: "20px" }}>✍️ Vehicle Handover Confirmation</h3>
      
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <button
            onClick={() => setSignatureType("dealer")}
            style={{
              flex: 1,
              padding: "10px",
              background: signatureType === "dealer" ? `${T.cyan}20` : "rgba(255,255,255,.05)",
              border: signatureType === "dealer" ? `1px solid ${T.cyan}` : "1px solid rgba(255,255,255,.1)",
              borderRadius: "8px",
              color: signatureType === "dealer" ? T.cyan : T.textSec,
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            🖊️ Dealer Signature
            {signatures.dealer && <span style={{ marginLeft: "5px" }}>✓</span>}
          </button>
          <button
            onClick={() => setSignatureType("customer")}
            style={{
              flex: 1,
              padding: "10px",
              background: signatureType === "customer" ? `${T.cyan}20` : "rgba(255,255,255,.05)",
              border: signatureType === "customer" ? `1px solid ${T.cyan}` : "1px solid rgba(255,255,255,.1)",
              borderRadius: "8px",
              color: signatureType === "customer" ? T.cyan : T.textSec,
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            👤 Customer Signature
            {signatures.customer && <span style={{ marginLeft: "5px" }}>✓</span>}
          </button>
        </div>
        
        <div style={{
          border: "2px dashed rgba(255,255,255,.2)",
          borderRadius: "10px",
          padding: "10px",
          background: "rgba(255,255,255,.02)"
        }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{
              width: "100%",
              height: "200px",
              background: "#fff",
              borderRadius: "8px",
              cursor: "crosshair"
            }}
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              onClick={clearSignature}
              style={{
                padding: "6px 12px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: "6px",
                color: T.textSec,
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Clear
            </button>
            <button
              onClick={saveSignature}
              style={{
                padding: "6px 12px",
                background: `linear-gradient(135deg, ${T.cyan}, #0400ff)`,
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Save Signature
            </button>
          </div>
        </div>
      </div>
      
      <div style={{
        background: "rgba(255,255,255,.03)",
        borderRadius: "10px",
        padding: "16px",
        marginBottom: "20px"
      }}>
        <h4 style={{ color: "#fff", marginBottom: "10px", fontSize: "14px" }}>Handover Checklist</h4>
        <div style={{ fontSize: "13px", color: T.textSec, lineHeight: "1.8" }}>
          <div>✓ Vehicle inspected and photos taken</div>
          <div>✓ Customer identity verified</div>
          <div>✓ Documents handed over (RC, Insurance, PUC)</div>
          <div>✓ Fuel level recorded: {booking.pickupFuel || "—"}%</div>
          <div>✓ Odometer reading: {booking.pickupOdometer || "—"} km</div>
          <div>✓ Emergency contact shared</div>
          <div>✓ Return location and time confirmed</div>
        </div>
      </div>
      
      <label style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "20px",
        cursor: "pointer"
      }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ width: "20px", height: "20px", cursor: "pointer" }}
        />
        <span style={{ fontSize: "13px", color: T.textSec }}>
          I confirm that the vehicle has been handed over in the condition described above,
          and the customer has agreed to the rental terms and conditions.
        </span>
      </label>
      
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={onBack}
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
          onClick={handleConfirm}
          disabled={loading || !signatures.dealer || !signatures.customer || !agreed}
          style={{
            flex: 2,
            padding: "12px",
            background: (loading || !signatures.dealer || !signatures.customer || !agreed) ? "rgba(255,255,255,.1)" : `linear-gradient(135deg, ${T.green}, #16a34a)`,
            border: "none",
            borderRadius: "8px",
            color: "#fff",
            cursor: (loading || !signatures.dealer || !signatures.customer || !agreed) ? "not-allowed" : "pointer",
            fontWeight: "600"
          }}
        >
          {loading ? "Processing..." : "Confirm Handover & Activate Trip →"}
        </button>
      </div>
    </div>
  );
}