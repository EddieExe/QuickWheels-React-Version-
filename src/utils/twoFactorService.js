// src/utils/twoFactorService.js
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const APP_NAME = "QuickWheels";

// ── Generate a new TOTP secret for a user ──
export function generateTOTPSecret() {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });
  return totp.secret.base32; // store this in Firestore
}

// ── Build a TOTP URI + QR code data URL ──
export async function generateQRCode(email, secret) {
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: email,
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });
  const uri = totp.toString();
  const qrDataURL = await QRCode.toDataURL(uri, { width: 200, margin: 1 });
  return { uri, qrDataURL };
}

// ── Verify a 6-digit token against a secret ──
// Returns true if valid (allows ±1 period window for clock skew)
export function verifyTOTP(secret, token) {
  try {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });
    const delta = totp.validate({ token: token.replace(/\s/g, ""), window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

// ── Fetch 2FA status for a user from Firestore ──
export async function get2FAStatus(email) {
  try {
    const snap = await getDoc(doc(db, "users", email));
    if (!snap.exists()) return { enabled: false, secret: null };
    const data = snap.data();
    return {
      enabled: data.twoFactorEnabled === true,
      secret: data.twoFactorSecret || null,
    };
  } catch {
    return { enabled: false, secret: null };
  }
}

// ── Enable 2FA: save verified secret to Firestore ──
export async function enable2FA(email, secret) {
  await updateDoc(doc(db, "users", email), {
    twoFactorEnabled: true,
    twoFactorSecret: secret,
    twoFactorEnabledAt: new Date(),
  });
}

// ── Disable 2FA ──
export async function disable2FA(email) {
  await updateDoc(doc(db, "users", email), {
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorDisabledAt: new Date(),
  });
}

// ── Generate 8 one-time backup codes ──
export function generateBackupCodes() {
  return Array.from({ length: 8 }, () =>
    Math.random().toString(36).substring(2, 6).toUpperCase() +
    "-" +
    Math.random().toString(36).substring(2, 6).toUpperCase()
  );
}

// ── Save hashed backup codes to Firestore ──
export async function saveBackupCodes(email, codes) {
  // Store as plain text for simplicity; in production use server-side hashing
  await updateDoc(doc(db, "users", email), {
    twoFactorBackupCodes: codes,
  });
}

// ── Verify and consume a backup code ──
export async function verifyBackupCode(email, inputCode) {
  const snap = await getDoc(doc(db, "users", email));
  if (!snap.exists()) return false;
  const codes = snap.data().twoFactorBackupCodes || [];
  const normalised = inputCode.trim().toUpperCase();
  const idx = codes.indexOf(normalised);
  if (idx === -1) return false;
  // Consume the code (one-time use)
  const updated = codes.filter((_, i) => i !== idx);
  await updateDoc(doc(db, "users", email), { twoFactorBackupCodes: updated });
  return true;
}