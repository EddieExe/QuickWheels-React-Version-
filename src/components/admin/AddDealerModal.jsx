// src/components/admin/AddDealerModal.jsx
import { useState } from "react";
import { collection, addDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../../firebase";
import { sendWelcomeEmail } from "../../utils/emailService";
import { PAYMENT_CONFIG } from "../../config/paymentConfig";

const INITIAL_FORM = {
  // Account
  ownerName:       "",
  email:           "",
  password:        "",
  // Business
  businessName:    "",
  businessAddress: "",
  city:            "",
  state:           "",
  country:         "India",
  phone:           "",
  gstNumber:       "",
  description:     "",
  // Commission
  commissionRate:  (PAYMENT_CONFIG.DEFAULT_COMMISSION_RATE * 100).toString(),
};

export default function AddDealerModal({ onClose, onSuccess }) {
  const [form, setForm]       = useState(INITIAL_FORM);
  const [step, setStep]       = useState(1); // 1=account, 2=business, 3=settings
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  function set(field, value) {
    setForm(p => ({ ...p, [field]: value }));
    setError("");
  }

  // ── Validation per step ──────────────────────────────────────────────────
  function validateStep(s) {
    if (s === 1) {
      if (!form.ownerName.trim())  return "Owner name is required.";
      if (!form.email.trim())      return "Email is required.";
      if (!/\S+@\S+\.\S+/.test(form.email)) return "Enter a valid email.";
      if (form.password.length < 8) return "Password must be at least 8 characters.";
    }
    if (s === 2) {
      if (!form.businessName.trim())    return "Business name is required.";
      if (!form.businessAddress.trim()) return "Address is required.";
      if (!form.city.trim())            return "City is required.";
      if (!form.state.trim())           return "State is required.";
      if (!form.phone.trim())           return "Phone is required.";
    }
    if (s === 3) {
      const rate = parseFloat(form.commissionRate);
      if (isNaN(rate) || rate < PAYMENT_CONFIG.MIN_COMMISSION_RATE * 100
                      || rate > PAYMENT_CONFIG.MAX_COMMISSION_RATE * 100) {
        return `Commission must be between ${PAYMENT_CONFIG.MIN_COMMISSION_RATE*100}% and ${PAYMENT_CONFIG.MAX_COMMISSION_RATE*100}%.`;
      }
    }
    return null;
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setStep(s => s + 1);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const err = validateStep(3);
    if (err) { setError(err); return; }

    setLoading(true);
    setError("");

    try {
      // 1. Create Firebase Auth account
      const result = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(result.user, { displayName: form.ownerName });

      // 2. Create dealer doc (status = approved immediately — admin-added)
      const commissionRate = parseFloat(form.commissionRate) / 100;
      const dealerRef = await addDoc(collection(db, "dealers"), {
        ownerName:       form.ownerName,
        ownerEmail:      form.email,
        businessName:    form.businessName,
        businessAddress: form.businessAddress,
        city:            form.city,
        state:           form.state,
        country:         form.country,
        phone:           form.phone,
        gstNumber:       form.gstNumber || "",
        description:     form.description || "",
        commissionRate,
        status:          "approved",
        isActive:        true,
        rating:          0,
        totalBookings:   0,
        totalRevenue:    0,
        logo:            "",
        coverPhoto:      "",
        addedByAdmin:    true,
        approvedAt:      new Date(),
        createdAt:       new Date(),
      });

      // 3. Create users doc
      const userRef = doc(db, "users", form.email);
      const existing = await getDoc(userRef);
      if (!existing.exists()) {
        await setDoc(userRef, {
          email:        form.email,
          displayName:  form.ownerName,
          isAdmin:      false,
          isDealer:     true,
          dealerId:     dealerRef.id,
          dealerStatus: "approved",
          role:         "dealer",
          provider:     "email",
          addedByAdmin: true,
          createdAt:    new Date(),
        });
      }

      // 4. Welcome email
      try {
        await sendWelcomeEmail(form.ownerName, form.email);
      } catch {
        // Non-fatal — dealer is created regardless
      }

      onSuccess?.({
        id:           dealerRef.id,
        businessName: form.businessName,
        ownerEmail:   form.email,
      });
      onClose();

    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else {
        setError(err.message || "Failed to create dealer. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Shared input style ────────────────────────────────────────────────────
  const inp = {
    width: "100%", boxSizing: "border-box",
    padding: "11px 14px", borderRadius: "10px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", fontSize: "13px",
    fontFamily: "Quicksand,sans-serif", outline: "none",
  };

  const label = {
    display: "block", marginBottom: "5px",
    color: "rgba(255,255,255,0.5)", fontSize: "11px",
    fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase",
  };

  const row = { display: "flex", gap: "12px" };
  const grp = (flex = 1) => ({ display: "flex", flexDirection: "column", gap: "4px", flex });

  const STEPS = ["Account", "Business", "Settings"];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 4000,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: "560px",
          background: "linear-gradient(135deg,#0e0e1f,#13132a)",
          border: "1px solid rgba(76,227,247,0.2)",
          borderRadius: "24px", overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          fontFamily: "Quicksand,sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "24px 28px 0",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h2 style={{ margin: 0, color: "#fff", fontSize: "18px", fontWeight: "800" }}>
                🏢 Add New Dealer
              </h2>
              <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                Admin-created dealers are approved immediately
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "rgba(255,255,255,0.06)", border: "none",
                color: "#fff", cursor: "pointer", fontSize: "16px",
              }}
            >✕</button>
          </div>

          {/* Step indicators */}
          <div style={{ display: "flex", gap: "0", marginBottom: "0" }}>
            {STEPS.map((s, i) => {
              const idx     = i + 1;
              const isDone  = step > idx;
              const isActive = step === idx;
              return (
                <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", position: "relative" }}>
                  {/* connector line */}
                  {i < STEPS.length - 1 && (
                    <div style={{
                      position: "absolute", top: "14px", left: "50%", width: "100%", height: "2px",
                      background: isDone ? "#4ce3f7" : "rgba(255,255,255,0.08)", zIndex: 0,
                    }} />
                  )}
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%", zIndex: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: "800",
                    background: isDone ? "#4ce3f7" : isActive ? "rgba(76,227,247,0.2)" : "rgba(255,255,255,0.06)",
                    border: isActive ? "2px solid #4ce3f7" : isDone ? "2px solid #4ce3f7" : "1px solid rgba(255,255,255,0.1)",
                    color: isDone ? "#000" : isActive ? "#4ce3f7" : "rgba(255,255,255,0.3)",
                  }}>
                    {isDone ? "✓" : idx}
                  </div>
                  <span style={{
                    marginTop: "6px", fontSize: "10px", fontWeight: "700",
                    color: isActive ? "#4ce3f7" : isDone ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
                    paddingBottom: "12px",
                  }}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "60vh", overflowY: "auto" }}>

          {/* ── Step 1: Account ── */}
          {step === 1 && (
            <>
              <div style={grp()}>
                <label style={label}>Owner Full Name</label>
                <input style={inp} placeholder="e.g. John Doe" value={form.ownerName}
                  onChange={e => set("ownerName", e.target.value)} />
              </div>
              <div style={grp()}>
                <label style={label}>Email Address</label>
                <input style={inp} type="email" placeholder="dealer@example.com" value={form.email}
                  onChange={e => set("email", e.target.value)} />
              </div>
              <div style={grp()}>
                <label style={label}>Temporary Password</label>
                <input style={inp} type="password" placeholder="Min. 8 characters" value={form.password}
                  onChange={e => set("password", e.target.value)} />
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                  Dealer should change this after first login.
                </p>
              </div>
            </>
          )}

          {/* ── Step 2: Business ── */}
          {step === 2 && (
            <>
              <div style={grp()}>
                <label style={label}>Business / Showroom Name</label>
                <input style={inp} placeholder="e.g. ABC Car Rentals" value={form.businessName}
                  onChange={e => set("businessName", e.target.value)} />
              </div>
              <div style={grp()}>
                <label style={label}>Street Address</label>
                <input style={inp} placeholder="123 Main Street" value={form.businessAddress}
                  onChange={e => set("businessAddress", e.target.value)} />
              </div>
              <div style={row}>
                <div style={grp()}>
                  <label style={label}>City</label>
                  <input style={inp} placeholder="Pune" value={form.city}
                    onChange={e => set("city", e.target.value)} />
                </div>
                <div style={grp()}>
                  <label style={label}>State</label>
                  <input style={inp} placeholder="Maharashtra" value={form.state}
                    onChange={e => set("state", e.target.value)} />
                </div>
              </div>
              <div style={row}>
                <div style={grp()}>
                  <label style={label}>Country</label>
                  <input style={inp} placeholder="India" value={form.country}
                    onChange={e => set("country", e.target.value)} />
                </div>
                <div style={grp()}>
                  <label style={label}>Phone</label>
                  <input style={inp} type="tel" placeholder="+91 98765 43210" value={form.phone}
                    onChange={e => set("phone", e.target.value)} />
                </div>
              </div>
              <div style={grp()}>
                <label style={label}>GST Number <span style={{ color:"rgba(255,255,255,0.25)" }}>(optional)</span></label>
                <input style={inp} placeholder="22AAAAA0000A1Z5" value={form.gstNumber}
                  onChange={e => set("gstNumber", e.target.value)} />
              </div>
              <div style={grp()}>
                <label style={label}>Business Description <span style={{ color:"rgba(255,255,255,0.25)" }}>(optional)</span></label>
                <textarea
                  style={{ ...inp, resize: "vertical", minHeight: "72px" }}
                  placeholder="Brief description of the business..."
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── Step 3: Settings ── */}
          {step === 3 && (
            <>
              <div style={{
                padding: "16px", borderRadius: "12px",
                background: "rgba(76,227,247,0.04)",
                border: "1px solid rgba(76,227,247,0.12)",
                marginBottom: "4px",
              }}>
                <p style={{ margin: "0 0 4px", color: "#4ce3f7", fontWeight: "700", fontSize: "13px" }}>
                  📋 Review — {form.businessName}
                </p>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "12px", lineHeight: "1.7" }}>
                  👤 {form.ownerName} · ✉️ {form.email}<br />
                  📍 {form.city}, {form.state}, {form.country}<br />
                  📞 {form.phone}
                </p>
              </div>

              <div style={grp()}>
                <label style={label}>Platform Commission Rate (%)</label>
                <div style={{ position: "relative" }}>
                  <input
                    style={{ ...inp, paddingRight: "32px" }}
                    type="number"
                    min={PAYMENT_CONFIG.MIN_COMMISSION_RATE * 100}
                    max={PAYMENT_CONFIG.MAX_COMMISSION_RATE * 100}
                    step="0.5"
                    value={form.commissionRate}
                    onChange={e => set("commissionRate", e.target.value)}
                  />
                  <span style={{
                    position: "absolute", right: "12px", top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(255,255,255,0.3)", fontSize: "13px",
                  }}>%</span>
                </div>
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                  Default is {PAYMENT_CONFIG.DEFAULT_COMMISSION_RATE * 100}%. Range: {PAYMENT_CONFIG.MIN_COMMISSION_RATE*100}%–{PAYMENT_CONFIG.MAX_COMMISSION_RATE*100}%.
                  QuickWheels keeps this % of each booking.
                </p>
              </div>

              {/* Breakdown preview */}
              {form.commissionRate && !isNaN(parseFloat(form.commissionRate)) && (
                <div style={{
                  padding: "14px", borderRadius: "10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  <p style={{ margin: "0 0 10px", color: "rgba(255,255,255,0.4)", fontSize: "11px",
                    fontWeight: "700", letterSpacing: "0.06em" }}>EXAMPLE: ₹5,000 BOOKING</p>
                  {(() => {
                    const rate     = parseFloat(form.commissionRate) / 100;
                    const fee      = 5000 * rate;
                    const dealer   = 5000 - fee;
                    const tax      = fee * 0.18;
                    const net      = fee - tax;
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {[
                          ["Dealer Earns",       `₹${dealer.toFixed(0)}`, "#22c55e"],
                          ["Platform Fee",       `₹${fee.toFixed(0)}`,    "#4ce3f7"],
                          ["GST on Fee (18%)",   `₹${tax.toFixed(0)}`,    "#f59e0b"],
                          ["Net Platform Rev",   `₹${net.toFixed(0)}`,    "#a855f7"],
                        ].map(([l, v, c]) => (
                          <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>{l}</span>
                            <span style={{ color: c, fontWeight: "700", fontSize: "13px" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: "8px",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#ef4444", fontSize: "12px", fontWeight: "600",
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 28px 24px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", gap: "10px",
        }}>
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                padding: "12px 20px", borderRadius: "10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)", cursor: "pointer",
                fontFamily: "Quicksand,sans-serif", fontWeight: "600", fontSize: "13px",
              }}
            >← Back</button>
          )}

          <button
            onClick={step < 3 ? nextStep : handleSubmit}
            disabled={loading}
            style={{
              flex: 1, padding: "12px", borderRadius: "10px", border: "none",
              background: loading ? "rgba(76,227,247,0.2)" : "linear-gradient(135deg,#0400ff,#4ce3f7)",
              color: "#fff", cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "Quicksand,sans-serif", fontWeight: "800", fontSize: "14px",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creating…" : step < 3 ? "Next →" : "✅ Create Dealer Account"}
          </button>
        </div>
      </div>
    </div>
  );
}