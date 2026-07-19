// src/components/TwoFactorVerify.jsx
import { useState } from "react";
import { verifyTOTP, verifyBackupCode } from "../utils/twoFactorService";

/**
 * Props:
 *  - secret: string (the stored TOTP secret)
 *  - email: string (user email, for backup code lookup)
 *  - onSuccess: () => void — called when verification passes
 *  - onCancel: () => void — called when user chooses to go back to sign in
 */
export default function TwoFactorVerify({ secret, email, onSuccess, onCancel }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");

  async function handleTOTPSubmit(e) {
    e.preventDefault();
    const clean = token.replace(/\s/g, "");
    if (clean.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const valid = verifyTOTP(secret, clean);
      if (valid) {
        onSuccess();
      } else {
        setError("Incorrect code. Codes refresh every 30 seconds — try again.");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBackupSubmit(e) {
    e.preventDefault();
    if (!backupCode.trim()) {
      setError("Enter a backup code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const valid = await verifyBackupCode(email, backupCode.trim());
      if (valid) {
        onSuccess();
      } else {
        setError("Invalid or already-used backup code.");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(ellipse at top, rgba(168,85,247,0.12) 0%, transparent 60%)",
      padding: "20px",
    }}>
      <div style={{
        width: "100%", maxWidth: "400px",
        background: "linear-gradient(135deg, rgba(12,12,22,0.97) 0%, rgba(20,20,40,0.97) 100%)",
        border: "1px solid rgba(168,85,247,0.25)",
        borderRadius: "24px",
        padding: "36px 32px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.1)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "18px",
            background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="26" 
              height="26" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#a855f7" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 style={{ color: "#fff", margin: "0 0 8px", fontSize: "22px", fontWeight: "800" }}>
            Two-Factor Authentication
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", margin: 0, lineHeight: "1.6" }}>
            {useBackup
              ? "Enter one of your saved backup codes."
              : "Enter the 6-digit code from your authenticator app to continue."}
          </p>
        </div>

        {/* TOTP form */}
        {!useBackup ? (
          <form onSubmit={handleTOTPSubmit}>
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
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "18px 16px", borderRadius: "14px",
                background: "rgba(168,85,247,0.08)",
                border: error ? "2px solid #ef4444" : "2px solid rgba(168,85,247,0.35)",
                color: "#fff", fontSize: "32px",
                fontFamily: "monospace", textAlign: "center",
                letterSpacing: "0.25em", outline: "none",
                transition: "border-color 0.2s",
              }}
              autoFocus
            />

            {/* 30-second progress indicator */}
            <CodeTimer />

            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: "10px", marginTop: "12px",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              }}>
                <p style={{ margin: 0, color: "#ef4444", fontSize: "12px", fontWeight: "600" }}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || token.replace(/\s/g, "").length < 6}
              style={{
                width: "100%", padding: "14px", borderRadius: "12px",
                marginTop: "16px", border: "none", cursor: loading ? "not-allowed" : "pointer",
                background: "linear-gradient(135deg, #9333ea, #a855f7)",
                color: "#fff", fontWeight: "800", fontSize: "15px",
                fontFamily: "inherit", letterSpacing: "0.04em",
                opacity: loading || token.replace(/\s/g, "").length < 6 ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {loading ? "Verifying…" : "Verify & Continue"}
            </button>
          </form>
        ) : (
          /* Backup code form */
          <form onSubmit={handleBackupSubmit}>
            <input
              type="text"
              placeholder="XXXX-XXXX"
              value={backupCode}
              onChange={(e) => {
                setError("");
                setBackupCode(e.target.value.toUpperCase());
              }}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "16px", borderRadius: "12px",
                background: "rgba(168,85,247,0.08)",
                border: error ? "2px solid #ef4444" : "2px solid rgba(168,85,247,0.35)",
                color: "#fff", fontSize: "20px",
                fontFamily: "monospace", textAlign: "center",
                letterSpacing: "0.12em", outline: "none",
              }}
              autoFocus
            />
            {error && (
              <p style={{ color: "#ef4444", fontSize: "12px", fontWeight: "600", marginTop: "8px" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "14px", borderRadius: "12px",
                marginTop: "16px", border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #9333ea, #a855f7)",
                color: "#fff", fontWeight: "800", fontSize: "15px",
                fontFamily: "inherit",
              }}
            >
              {loading ? "Verifying…" : "Use Backup Code"}
            </button>
          </form>
        )}

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", fontWeight: "600" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
        </div>

        {/* Toggle backup / authenticator */}
        <button
          onClick={() => { setUseBackup((p) => !p); setError(""); setToken(""); setBackupCode(""); }}
          style={{
            width: "100%", padding: "11px", borderRadius: "10px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.55)", cursor: "pointer", fontWeight: "600",
            fontSize: "13px", fontFamily: "inherit",
          }}
        >
          {useBackup ? "← Use Authenticator App" : "Use a Backup Code"}
        </button>

        {/* Cancel → back to sign in */}
        <button
          onClick={onCancel}
          style={{
            width: "100%", padding: "10px", marginTop: "8px", borderRadius: "10px",
            background: "transparent", border: "none",
            color: "rgba(255,255,255,0.3)", cursor: "pointer",
            fontSize: "12px", fontFamily: "inherit",
          }}
        >
          ← Back to Sign In
        </button>
      </div>
    </div>
  );
}

// ── 30-second timer bar ──
function CodeTimer() {
  const [pct, setPct] = useState(0);
  useState(() => {
    const tick = () => {
      const s = new Date().getSeconds();
      setPct(((s % 30) / 30) * 100);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  });

  return (
    <div style={{ marginTop: "10px" }}>
      <div style={{ height: "3px", borderRadius: "3px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%", borderRadius: "3px",
            background: pct > 80 ? "#ef4444" : "#a855f7",
            width: `${100 - pct}%`,
            transition: "width 0.5s linear, background 0.3s",
          }}
        />
      </div>
      <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.25)", fontSize: "11px", textAlign: "right" }}>
        Code refreshes every 30s
      </p>
    </div>
  );
}