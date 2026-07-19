// src/components/TwoFactorSetup.jsx
import { useState, useEffect } from "react";
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
  enable2FA,
  generateBackupCodes,
  saveBackupCodes,
  disable2FA,
} from "../utils/twoFactorService";

export default function TwoFactorSetup({ user, currentlyEnabled, onStatusChange }) {
  const [phase, setPhase] = useState("idle"); // idle | setup | verify | backup | manage
  const [secret, setSecret] = useState("");
  const [qrDataURL, setQRDataURL] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [copied, setCopied] = useState(false);
  const [disableToken, setDisableToken] = useState("");
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // Start 2FA setup
  async function startSetup() {
    setLoading(true);
    setError("");
    try {
      const newSecret = generateTOTPSecret();
      const { qrDataURL: qr } = await generateQRCode(user.email, newSecret);
      setSecret(newSecret);
      setQRDataURL(qr);
      setPhase("setup");
    } catch (err) {
      setError("Failed to generate QR code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // Verify TOTP token then enable
  async function handleVerify(e) {
    e.preventDefault();
    if (token.replace(/\s/g, "").length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const valid = verifyTOTP(secret, token);
      if (!valid) {
        setError("Incorrect code. Make sure your phone clock is synced.");
        setLoading(false);
        return;
      }
      await enable2FA(user.email, secret);
      const codes = generateBackupCodes();
      await saveBackupCodes(user.email, codes);
      setBackupCodes(codes);
      setPhase("backup");
      onStatusChange && onStatusChange(true);
    } catch (err) {
      setError("Failed to enable 2FA. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Disable 2FA
  async function handleDisable(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await disable2FA(user.email);
      setShowDisableConfirm(false);
      setDisableToken("");
      setPhase("idle");
      onStatusChange && onStatusChange(false);
    } catch (err) {
      setError("Failed to disable 2FA. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Idle state (not enabled) ──
  if (!currentlyEnabled && phase === "idle") {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
          <div style={iconBubble("#a855f7")}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#a855f7" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ display: "block" }}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, color: "#fff", fontSize: "16px", fontWeight: "800" }}>
              Two-Factor Authentication
            </h3>
            <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
              Not enabled — your account has standard protection only
            </p>
          </div>
          <span style={badge("rgba(239,68,68,0.15)", "#ef4444", "rgba(239,68,68,0.3)")}>
            OFF
          </span>
        </div>

        <p style={descText}>
          Add a second layer of security. After signing in with your password, you'll
          be prompted for a 6-digit code from an authenticator app
          (Google Authenticator, Authy, etc).
        </p>

        <button className="btn" onClick={startSetup} disabled={loading} style={{ marginTop: "18px", width: "100%" }}>
          {loading ? "Preparing…" : "Enable Two-Factor Auth"}
        </button>
      </div>
    );
  }

  // ── Setup: show QR code ──
  if (phase === "setup") {
    return (
      <div style={containerStyle}>
        <h3 style={stepTitle}>Step 1 — Scan QR Code</h3>
        <p style={descText}>
          Open your authenticator app and scan the QR code below, or enter the
          secret key manually.
        </p>

        {qrDataURL && (
          <div style={{ textAlign: "center", margin: "20px 0" }}>
            <div style={{
              display: "inline-block", padding: "12px",
              background: "#fff", borderRadius: "12px",
              boxShadow: "0 0 0 4px rgba(168,85,247,0.25)",
            }}>
              <img src={qrDataURL} alt="QR Code" style={{ display: "block", width: 160, height: 160 }} />
            </div>
          </div>
        )}

        <div style={{
          padding: "12px 16px", borderRadius: "10px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          marginBottom: "20px",
        }}>
          <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: "700", letterSpacing: "0.06em" }}>
            MANUAL ENTRY KEY
          </p>
          <p style={{ margin: 0, color: "#fff", fontFamily: "monospace", fontSize: "14px", letterSpacing: "0.08em", wordBreak: "break-all" }}>
            {secret}
          </p>
        </div>

        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "1fr 1fr" }}>
          <button 
            style={{
              padding: "10px 24px",
              fontFamily: "Quicksand, sans-serif",
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              transition: "all 0.3s ease",
              position: "relative",
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(10px)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.3), 0 8px 24px rgba(0,0,0,0.15)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "rgba(255,255,255,0.8)";
            }}
            onClick={() => setPhase("idle")}
          >
            Cancel
          </button>
          <button
          className="btn"
          onClick={() => setPhase("verify")}
          >
            I've scanned it, Next
          </button>
        </div>
      </div>
    );
  }

  // ── Verify: enter TOTP token ──
  if (phase === "verify") {
    return (
      <div style={containerStyle}>
        <h3 style={stepTitle}>Step 2 — Verify Code</h3>
        <p style={descText}>
          Enter the 6-digit code currently shown in your authenticator app to
          confirm setup.
        </p>

        <form onSubmit={handleVerify} style={{ marginTop: "16px" }}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={7}
            placeholder="000 000"
            value={token}
            onChange={(e) => {
              setError("");
              setToken(e.target.value.replace(/[^\d\s]/g, ""));
            }}
            style={codeInput}
            autoFocus
          />
          {error && <p style={errorText}>{error}</p>}
          
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button 
              onClick={() => setPhase("setup")}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px 24px",
                fontFamily: "Quicksand, sans-serif",
                fontSize: "13px",
                fontWeight: "600",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(10px)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)",
                whiteSpace: "nowrap"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.3), 0 8px 24px rgba(0,0,0,0.15)";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "rgba(255,255,255,0.8)";
              }}
            >
              Back
            </button>
            <button 
              className="btn" 
              type="submit" 
              disabled={loading} 
              style={{ 
                flex: 1,
                minWidth: 0,
                fontFamily: "Quicksand, sans-serif",
                fontSize: "13px",
                fontWeight: "600"
              }}
            >
              {loading ? "Verifying…" : "Verify & Enable 2FA"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Backup codes ──
  if (phase === "backup") {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <span style={{ fontSize: "36px" }}>✅</span>
          <h3 style={{ ...stepTitle, margin: "10px 0 4px" }}>2FA Enabled!</h3>
          <p style={descText}>Save your backup codes — you can use them if you lose access to your authenticator.</p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "8px", margin: "16px 0",
        }}>
          {backupCodes.map((code) => (
            <div key={code} style={{
              padding: "8px 12px", borderRadius: "8px", textAlign: "center",
              background: "rgba(168,85,247,0.08)",
              border: "1px solid rgba(168,85,247,0.2)",
              fontFamily: "monospace", fontSize: "13px",
              color: "#d8b4fe", fontWeight: "700", letterSpacing: "0.08em",
            }}>
              {code}
            </div>
          ))}
        </div>

        <div style={{
          padding: "12px", borderRadius: "10px", marginBottom: "16px",
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
        }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontSize: "12px", lineHeight: "1.6" }}>
            ⚠️ Each backup code can only be used once. Store them somewhere safe — these won't be shown again.
          </p>
        </div>

        <button onClick={copyBackupCodes} style={primaryBtn(copied ? "#22c55e" : "#a855f7")}>
          {copied ? "✓ Copied!" : "Copy All Codes"}
        </button>
        <button onClick={() => setPhase("idle")} style={{ ...ghostBtn, marginTop: "8px" }}>
          Done
        </button>
      </div>
    );
  }

  // ── Enabled state (manage) ──
  if (currentlyEnabled && phase === "idle") {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
          <div style={iconBubble("#a855f7")}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#a855f7" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ display: "block" }}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, color: "#fff", fontSize: "16px", fontWeight: "800" }}>
              Two-Factor Authentication
            </h3>
            <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
              Active — your account has enhanced security
            </p>
          </div>
          <span style={badge("rgba(168,85,247,0.15)", "#a855f7", "rgba(168,85,247,0.3)")}>
            ON
          </span>
        </div>

        {!showDisableConfirm ? (
          <button
            onClick={() => setShowDisableConfirm(true)}
            style={dangerBtn}
          >
            Disable 2FA
          </button>
        ) : (
          <form onSubmit={handleDisable}>
            <p style={descText}>
              To confirm, enter a current 6-digit code from your authenticator app.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={7}
              placeholder="000 000"
              value={disableToken}
              onChange={(e) => setDisableToken(e.target.value.replace(/[^\d\s]/g, ""))}
              style={codeInput}
              autoFocus
            />
            {error && <p style={errorText}>{error}</p>}
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button type="submit" disabled={loading} style={{ ...dangerBtn, flex: 1 }}>
                {loading ? "Disabling…" : "Confirm Disable"}
              </button>
              <button type="button" onClick={() => { setShowDisableConfirm(false); setError(""); }} style={ghostBtn}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return null;
}

// ── Shared style helpers ──
const containerStyle = {
  padding: "20px",
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "16px",
};

const stepTitle = {
  color: "#fff", fontSize: "16px", fontWeight: "800", margin: "0 0 8px",
};

const descText = {
  color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: "1.6", margin: "0 0 4px",
};

const errorText = {
  color: "#ef4444", fontSize: "12px", marginTop: "8px", fontWeight: "600",
};

const codeInput = {
  width: "100%", boxSizing: "border-box",
  padding: "14px 16px", borderRadius: "12px",
  background: "rgba(168,85,247,0.08)", border: "2px solid rgba(168,85,247,0.35)",
  color: "#fff", fontSize: "24px", fontFamily: "monospace",
  textAlign: "center", letterSpacing: "0.18em", outline: "none",
};

function primaryBtn(color) {
  return {
    width: "100%", padding: "12px", borderRadius: "10px", marginTop: "4px",
    border: "none", cursor: "pointer", fontWeight: "700", fontSize: "14px",
    fontFamily: "inherit", letterSpacing: "0.03em", transition: "opacity 0.2s",
    background: `linear-gradient(135deg, ${color}cc, ${color})`,
    color: "#fff",
  };
}

const dangerBtn = {
  width: "100%", padding: "12px", borderRadius: "10px", marginTop: "4px",
  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)",
  color: "#ef4444", cursor: "pointer", fontWeight: "700", fontSize: "14px",
  fontFamily: "inherit", letterSpacing: "0.03em",
};

const ghostBtn = {
  width: "100%", padding: "10px", marginTop: "8px", borderRadius: "10px",
  background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
  color: "rgba(255,255,255,0.45)", cursor: "pointer", fontWeight: "600",
  fontSize: "13px", fontFamily: "inherit",
};

function iconBubble(color) {
  return {
    width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "20px", background: `${color}22`, border: `1px solid ${color}44`,
  };
}

function badge(bg, color, border) {
  return {
    marginLeft: "auto", padding: "3px 10px", borderRadius: "20px",
    fontSize: "10px", fontWeight: "800", letterSpacing: "0.1em",
    background: bg, color, border: `1px solid ${border}`,
  };
}