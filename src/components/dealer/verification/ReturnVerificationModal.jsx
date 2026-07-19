// src/components/dealer/verification/ReturnVerificationModal.jsx
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { calculateDepositRelease, generateInvoiceHTML, sendInvoiceEmail, updateBookingStatus } from "../../../utils/verificationUtils";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  textSec: "rgba(255,255,255,0.4)",
};

export default function ReturnVerificationModal({ booking, returnInspection, onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [customerApproved, setCustomerApproved] = useState(false);
  const [invoiceSent, setInvoiceSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [depositReleased, setDepositReleased] = useState(false);

  const extraCharges = returnInspection?.extraCharges || {
    mileage: 0,
    fuel: 0,
    damages: 0,
    cleaning: 0,
    lateReturn: 0,
    total: 0,
  };
  
  const depositAmount = booking.securityDeposit || 200;
  const depositRelease = calculateDepositRelease(depositAmount, extraCharges.total);

  const handleCustomerApproval = () => {
    setCustomerApproved(true);
    setStep(2);
  };

  const handleSendInvoice = async () => {
    setLoading(true);
    try {
      const invoiceHTML = generateInvoiceHTML(booking, returnInspection, extraCharges);
      const sent = await sendInvoiceEmail(booking, extraCharges, invoiceHTML);
      
      if (sent) {
        setInvoiceSent(true);
        alert("Invoice sent to customer email");
        setStep(3);
      } else {
        alert("Failed to send invoice. Please try again.");
      }
    } catch (error) {
      console.error("Error sending invoice:", error);
      alert("Failed to send invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseDeposit = async () => {
    setLoading(true);
    try {
      // Update booking status
      await updateBookingStatus(booking.id, "completed", {
        completedAt: new Date().toISOString(),
        extraCharges,
        depositReleased: depositRelease.releaseAmount,
        depositDeducted: depositRelease.deductedAmount,
        returnInspectionRef: `bookings/${booking.id}/inspections/return`,
        finalAmount: (booking.total || 0) + extraCharges.total,
      });
      
      setDepositReleased(true);
      
      onComplete({
        success: true,
        status: "completed",
        extraCharges,
        depositRelease,
      });
    } catch (error) {
      console.error("Error completing return:", error);
      alert("Failed to complete return process");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: "Customer Approval", icon: "👍" },
    { id: 2, title: "Invoice Generation", icon: "📄" },
    { id: 3, title: "Deposit Release", icon: "💰" },
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
              🔄 Return Verification
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
            <div>
              <h3 style={{ color: T.cyan, marginBottom: "20px" }}>💰 Extra Charges Summary</h3>
              
              <div style={{
                background: "rgba(255,255,255,.05)",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px"
              }}>
                <div style={{ marginBottom: "15px", paddingBottom: "15px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span>Base Rental</span>
                    <span>${(booking.total || 0).toLocaleString()}</span>
                  </div>
                </div>
                
                {extraCharges.mileage > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Extra Mileage</span>
                      <span style={{ color: T.orange }}>${extraCharges.mileage.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                
                {extraCharges.fuel > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Fuel Refill</span>
                      <span style={{ color: T.orange }}>${extraCharges.fuel.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                
                {extraCharges.damages > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Damage Penalty</span>
                      <span style={{ color: T.red }}>${extraCharges.damages.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                
                {extraCharges.cleaning > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Cleaning Fee</span>
                      <span style={{ color: T.orange }}>${extraCharges.cleaning.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                
                {extraCharges.lateReturn > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Late Return</span>
                      <span style={{ color: T.red }}>${extraCharges.lateReturn.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                
                <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "2px solid rgba(255,255,255,.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "800" }}>
                    <span style={{ color: T.cyan }}>Total Amount</span>
                    <span style={{ color: T.green }}>${((booking.total || 0) + extraCharges.total).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div style={{
                background: "rgba(255,255,255,.03)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "20px"
              }}>
                <h4 style={{ color: "#fff", marginBottom: "10px", fontSize: "14px" }}>Security Deposit</h4>
                <div style={{ fontSize: "13px", color: T.textSec }}>
                  <div>Deposit Collected: ${depositAmount.toLocaleString()}</div>
                  <div>Deductions: ${depositRelease.deductedAmount.toLocaleString()}</div>
                  <div style={{ marginTop: "8px", color: T.green, fontWeight: "600" }}>
                    To be Released: ${depositRelease.releaseAmount.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={onCancel}
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
                  Cancel
                </button>
                <button
                  onClick={handleCustomerApproval}
                  style={{
                    flex: 2,
                    padding: "12px",
                    background: `linear-gradient(135deg, ${T.green}, #16a34a)`,
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  Get Customer Approval →
                </button>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>📄</div>
              <h3 style={{ color: "#fff", marginBottom: "10px" }}>Generate Final Invoice</h3>
              <p style={{ color: T.textSec, marginBottom: "30px" }}>
                An invoice with all charges will be sent to {booking.userEmail}
              </p>
              
              <button
                onClick={handleSendInvoice}
                disabled={loading || invoiceSent}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: loading || invoiceSent ? "rgba(255,255,255,.1)" : `linear-gradient(135deg, ${T.cyan}, #0400ff)`,
                  border: "none",
                  borderRadius: "10px",
                  color: "#fff",
                  cursor: loading || invoiceSent ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                {loading ? "Sending..." : invoiceSent ? "✓ Invoice Sent" : "Send Invoice to Customer"}
              </button>
              
              {invoiceSent && (
                <button
                  onClick={() => setStep(3)}
                  style={{
                    marginTop: "15px",
                    padding: "10px",
                    background: "none",
                    border: "none",
                    color: T.cyan,
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          )}
          
          {step === 3 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>💰</div>
              <h3 style={{ color: "#fff", marginBottom: "10px" }}>Release Security Deposit</h3>
              <p style={{ color: T.textSec, marginBottom: "20px" }}>
                Amount to release: <strong style={{ color: T.green, fontSize: "24px" }}>${depositRelease.releaseAmount.toLocaleString()}</strong>
              </p>
              
              <div style={{
                background: "rgba(255,255,255,.03)",
                borderRadius: "10px",
                padding: "15px",
                marginBottom: "20px",
                textAlign: "left"
              }}>
                <p style={{ margin: "0 0 10px", color: T.textSec, fontSize: "13px" }}>
                  <strong>Deductions:</strong>
                </p>
                <ul style={{ margin: 0, color: T.textSec, fontSize: "12px" }}>
                  <li>Extra Charges: ${extraCharges.total.toLocaleString()}</li>
                </ul>
              </div>
              
              <button
                onClick={handleReleaseDeposit}
                disabled={loading || depositReleased}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: loading || depositReleased ? "rgba(255,255,255,.1)" : `linear-gradient(135deg, ${T.green}, #16a34a)`,
                  border: "none",
                  borderRadius: "10px",
                  color: "#fff",
                  cursor: loading || depositReleased ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                {loading ? "Processing..." : depositReleased ? "✓ Completed" : "Confirm Deposit Release"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}