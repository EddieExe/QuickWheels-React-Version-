import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  addDoc,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { sendBookingReceipt } from "../utils/emailService";
import { useCurrency } from "../context/CurrencyContext";
import "../styles/payment.css";

// ─────────────────────────────────────────────────────────────
// SVG Icons
// ─────────────────────────────────────────────────────────────
const Icons = {
  User: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
      <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
    </svg>
  ),
  Payment: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  Cash: ({ size = 20, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke={color} width={size} height={size}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
  </svg>
),
Card: ({ size = 20, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke={color} width={size} height={size}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
  </svg>
),
Upi: ({ size = 20, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke={color} width={size} height={size}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
),
  Car: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  Location: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  ),
  Lock: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  Check: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  Warning: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  Prohibited: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  Clock: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  Email: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  ),
  Shield: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  Wifi: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856a8.25 8.25 0 0 1 13.788 0M1.924 8.674a11.25 11.25 0 0 1 20.152 0" />
    </svg>
  ),
  Tools: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.048.58.025 1.193-.14 1.743" />
    </svg>
  ),
  FirstAid: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-7.5 7.5h12a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 16.5 4.5h-12a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  ),
  Gps: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v3" />
    </svg>
  ),
  Home: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  Clipboard: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  ),
  Receipt: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  Star: ({ size = 16, color = "currentColor", filled = false }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  ),
  CarPlate: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M9 3.75V6m0-2.25h6M9 6h6M9 6v6m0 0-3 3m3-3 3 3" />
    </svg>
  ),
  Wrench: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.048.58.025 1.193-.14 1.743" />
    </svg>
  ),
  Money: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  Phone: ({ size = 20, color = "currentColor" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// Overlap Modal
// ─────────────────────────────────────────────────────────────
function OverlapBookingModal({ details, onClose, onGoToProfile }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#1a1a2e,#0f0f1a)",
          border: "1px solid rgba(255,77,77,0.4)",
          borderRadius: "20px",
          padding: "36px 32px",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
          fontFamily: "Quicksand,sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: "16px", color: "#ff4d4d" }}>
          <Icons.Warning size={52} color="#ff4d4d" />
        </div>
        <h2
          style={{ color: "#ff4d4d", margin: "0 0 12px", fontSize: "1.3rem" }}
        >
          Overlapping Trip Detected
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.7)",
            lineHeight: "1.6",
            marginBottom: "16px",
          }}
        >
          You already have an active booking during your selected dates.
        </p>
        <div
          style={{
            background: "rgba(255,77,77,0.1)",
            padding: "16px",
            borderRadius: "12px",
            marginBottom: "24px",
            textAlign: "left",
          }}
        >
          <p style={{ color: "#ffa500", margin: "0 0 8px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icons.Car size={16} color="#ffa500" />
            Your Existing Booking:
          </p>
          {[
            ["Car", details?.carModel],
            ["Route", `${details?.pickup} → ${details?.dropoff}`],
            ["Dates", `${details?.pickupDate} → ${details?.dropoffDate}`],
          ].map(([label, val]) => (
            <p
              key={label}
              style={{
                color: "rgba(255,255,255,0.8)",
                margin: "4px 0",
                fontSize: "14px",
              }}
            >
              <strong>{label}:</strong> {val}
            </p>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button onClick={onGoToProfile} style={btnPrimary}>
            View My Bookings
          </button>
          <button onClick={onClose} style={btnSecondary}>
            Choose Different Dates
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Duplicate Modal
// ─────────────────────────────────────────────────────────────
function DuplicateBookingModal({ onClose, onGoToProfile }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.88)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#1a1a2e,#0f0f1a)",
          border: "1px solid rgba(255,77,77,0.4)",
          borderRadius: "20px",
          padding: "36px 32px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          fontFamily: "Quicksand,sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: "16px", color: "#ff4d4d" }}>
          <Icons.Prohibited size={52} color="#ff4d4d" />
        </div>
        <h2
          style={{ color: "#ff4d4d", margin: "0 0 12px", fontSize: "1.3rem" }}
        >
          Duplicate Booking Detected
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            lineHeight: "1.7",
            marginBottom: "8px",
            fontSize: "14px",
          }}
        >
          You already have an{" "}
          <strong style={{ color: "#ffa500" }}>active booking</strong> for this
          car on the selected dates.
        </p>
        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            lineHeight: "1.6",
            marginBottom: "28px",
            fontSize: "13px",
          }}
        >
          Please choose different dates, select a different vehicle, or cancel
          your existing booking first.
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button onClick={onGoToProfile} style={btnPrimary}>
            View My Bookings
          </button>
          <button onClick={onClose} style={btnSecondary}>
            Choose Different Dates
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared button styles
// ─────────────────────────────────────────────────────────────
const btnPrimary = {
  background: "linear-gradient(30deg,#6d28d9,#c084fc)",
  border: "none",
  borderRadius: "10px",
  color: "#fff",
  padding: "11px 22px",
  fontWeight: "700",
  cursor: "pointer",
  fontFamily: "Quicksand,sans-serif",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};
const btnSecondary = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "10px",
  color: "#fff",
  padding: "11px 22px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "Quicksand,sans-serif",
  fontSize: "14px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};
const receiptBadge = {
  padding: "3px 8px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: "600",
  color: "rgba(255,255,255,0.7)",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
};

// ─────────────────────────────────────────────────────────────
// Booking Receipt (success screen)
// ─────────────────────────────────────────────────────────────
function BookingReceipt({ booking, formatPrice, onViewBookings, onHome }) {
  const {
    bookingId,
    carModel,
    carImage,
    pickup,
    dropoff,
    pickupDate,
    dropoffDate,
    days,
    tripType,
    addons,
    carTotal,
    addonsTotal,
    total,
    userName,
    userEmail,
    createdAt,
  } = booking;

  const dateStr = createdAt
    ? new Date(createdAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString();

  return (
    <section className="payment_container">
      <div className="pay_stars" aria-hidden="true">
        <div className="pay_star_layer pay_star_layer_a"></div>
        <div className="pay_star_layer pay_star_layer_b"></div>
        <div className="pay_star_layer pay_star_layer_c"></div>
      </div>

      <div className="receipt_wrap">
        {/* ── Success badge ── */}
        <div className="receipt_success_badge" style={{ textAlign: "center", marginBottom: "32px" }}>
          {/* <div
            className="receipt_success_icon"
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg,rgba(34,197,94,0.2),rgba(168,85,247,0.1))",
              border: "2px solid rgba(34,197,94,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#22c55e",
            }}
          >
            <Icons.Check size={40} color="#22c55e" />
          </div> */}
          <h1 className="qw_shine_heading" style ={{ margin: "0 0 10px" }}>Booking Request Sent!</h1>
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "14px",
              margin: 0,
            }}
          >
            Your booking is{" "}
            <strong style={{ color: "#ffa500" }}>
              pending dealer approval
            </strong>
            . You'll be notified within 60 minutes.
          </p>
        </div>

        {/* ── Receipt card ── */}
        <div className="receipt_card">
          {/* Receipt header */}
          <div className="receipt_header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icons.Receipt size={20} color="#c084fc" />
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#c084fc",
                    fontWeight: "700",
                    fontSize: "1rem",
                  }}
                >
                  Booking Receipt
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "12px",
                  }}
                >
                  {dateStr}
                </p>
              </div>
            </div>
            <div className="receipt_id_badge">{bookingId}</div>
          </div>

          <div className="receipt_body receipt_body_grid">
            {/* ══ LEFT COLUMN (sticky) ══ */}
            <div className="receipt_left_col">
              {/* ── Customer info ── */}
              <Section title="Customer Details" icon={<Icons.User size={16} color="#c084fc" />}>
                <Row label="Name" value={userName} />
                <Row label="Email" value={userEmail} />
              </Section>

              {/* ── Vehicle ── */}
              <Section title="Vehicle" icon={<Icons.Car size={16} color="#c084fc" />}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "8px",
                  }}
                >
                  {carImage && (
                    <img
                      src={carImage}
                      alt={carModel}
                      style={{
                        width: "90px",
                        height: "56px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  )}
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: "1rem",
                      }}
                    >
                      {carModel}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: "12px",
                      }}
                    >
                      {days} day{days > 1 ? "s" : ""} · {tripType}
                    </p>
                  </div>
                </div>

                {/* Phase 2: Car features in receipt */}
                {booking.carNumberPlate && (
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                      marginTop: "8px",
                      padding: "8px 0",
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {booking.carNumberPlate && (
                      <span className="receipt_badge" style={receiptBadge}>
                        <Icons.CarPlate size={14} color="rgba(255,255,255,0.7)" />
                        {booking.carNumberPlate}
                      </span>
                    )}
                    {booking.carSafetyRating > 0 && (
                      <span
                        className="receipt_badge"
                        style={{
                          ...receiptBadge,
                          color: "#fbbf24",
                          background: "rgba(251,191,36,0.1)",
                          borderColor: "rgba(251,191,36,0.2)",
                        }}
                      >
                        <Icons.Star size={14} color="#fbbf24" filled={true} />
                        {booking.carSafetyRating}/5
                      </span>
                    )}
                    {booking.carEmergencyKit && (
                      <span
                        className="receipt_badge"
                        style={{
                          ...receiptBadge,
                          color: "#22c55e",
                          background: "rgba(34,197,94,0.1)",
                          borderColor: "rgba(34,197,94,0.2)",
                        }}
                      >
                        <Icons.FirstAid size={14} color="#22c55e" />
                        Kit
                      </span>
                    )}
                    {booking.carGpsAvailable && (
                      <span
                        className="receipt_badge"
                        style={{
                          ...receiptBadge,
                          color: "#c084fc",
                          background: "rgba(168,85,247,0.1)",
                          borderColor: "rgba(168,85,247,0.2)",
                        }}
                      >
                        <Icons.Gps size={14} color="#c084fc" />
                        GPS
                      </span>
                    )}
                  </div>
                )}
              </Section>

              {/* ── Status timeline ── */}
              <div className="receipt_status_box">
                <p
                  style={{
                    margin: "0 0 12px",
                    color: "#c084fc",
                    fontWeight: "700",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Icons.Clipboard size={16} color="#c084fc" />
                  Booking Status
                </p>
                {[
                  { icon: <Icons.Check size={16} color="#22c55e" />, label: "Booking Request Sent", active: true },
                  { icon: <Icons.Clock size={16} color="#fbbf24" />, label: "Awaiting Dealer Approval", active: true },
                  { icon: <Icons.Email size={16} color="rgba(255,255,255,0.3)" />, label: "Confirmation Email on Approval", active: false },
                  { icon: <Icons.Car size={16} color="rgba(255,255,255,0.3)" />, label: "Pick Up Your Car", active: false },
                ].map(({ icon, label, active }, i) => (
                  <div key={i} className="receipt_status_row">
                    <span style={{ fontSize: "16px", color: active ? "currentColor" : "rgba(255,255,255,0.3)" }}>{icon}</span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: active
                          ? "rgba(255,255,255,0.85)"
                          : "rgba(255,255,255,0.3)",
                        fontWeight: active ? "600" : "400",
                      }}
                    >
                      {label}
                    </span>
                    {active && (
                      <span
                        style={{
                          marginLeft: "auto",
                          background: "rgba(34,197,94,0.15)",
                          border: "1px solid rgba(34,197,94,0.3)",
                          borderRadius: "20px",
                          padding: "2px 10px",
                          fontSize: "11px",
                          color: "#22c55e",
                          fontWeight: "700",
                        }}
                      >
                        Done
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Actions ── */}
              <div className="receipt_actions">
                <button
                  onClick={onViewBookings}
                  className="receipt_btn receipt_btn_primary"
                >
                  <Icons.Clipboard size={18} color="#fff" />
                  View My Bookings
                </button>
                <button onClick={onHome} className="receipt_btn receipt_btn_secondary">
                  <Icons.Home size={18} color="#fff" />
                  Back to Home
                </button>
              </div>
            </div>

            {/* ══ RIGHT COLUMN ══ */}
            <div className="receipt_right_col">
              {/* ── Trip details ── */}
              <Section title="Trip Details" icon={<Icons.Location size={16} color="#c084fc" />}>
                <Row label="Pickup Location" value={pickup} />
                <Row label="Dropoff Location" value={dropoff} />
                <Row label="Pickup Date" value={formatDateDisplay(pickupDate)} />
                <Row
                  label="Dropoff Date"
                  value={formatDateDisplay(dropoffDate)}
                />
                <Row
                  label="Duration"
                  value={`${days} day${days > 1 ? "s" : ""}`}
                />
                <Row label="Trip Type" value={tripType} />
              </Section>

              {/* ── Add-ons ── */}
              {addons && addons.length > 0 && (
                <Section title="Add-ons" icon={<Icons.Tools size={16} color="#c084fc" />}>
                  {addons.map((a) => (
                    <Row
                      key={a.id}
                      label={a.name}
                      value={`+${formatPrice(a.price * days)}`}
                    />
                  ))}
                </Section>
              )}

              {/* ── Price breakdown ── */}
              <Section title="Price Breakdown" icon={<Icons.Money size={16} color="#c084fc" />}>
                <Row
                  label={`Car Rental (${days} days)`}
                  value={formatPrice(carTotal)}
                />
                {addonsTotal > 0 && (
                  <Row label="Add-ons" value={formatPrice(addonsTotal)} />
                )}
                <div
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    marginTop: "10px",
                    paddingTop: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{ color: "#fff", fontWeight: "700", fontSize: "1rem" }}
                  >
                    Total
                  </span>
                  <span
                    style={{
                      color: "#c084fc",
                      fontWeight: "700",
                      fontSize: "1.1rem",
                    }}
                  >
                    {formatPrice(total)}
                  </span>
                </div>
              </Section>

              {/* ── Payment note ── */}
              <div className="receipt_note_box">
                <p
                  style={{
                    margin: "0 0 6px",
                    color: "#ffa500",
                    fontWeight: "700",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Icons.Payment size={16} color="#ffa500" />
                  Payment Information
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  Payment of{" "}
                  <strong style={{ color: "#fff" }}>{formatPrice(total)}</strong>{" "}
                  is due at pickup. We accept <strong>Cash, Card, and UPI</strong>{" "}
                  at the branch. No online payment required at this stage.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Small receipt helpers
// ─────────────────────────────────────────────────────────────
function Section({ title, children, icon }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <p
        style={{
          margin: "0 0 10px",
          color: "#c084fc",
          fontWeight: "700",
          fontSize: "13px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {icon}
        {title}
      </p>
      <div className="receipt_section_box">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "12px",
        padding: "5px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: "13px",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: "13px",
          fontWeight: "600",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────
// Payment Page
// ─────────────────────────────────────────────────────────────
function Payment() {
  const { user } = useAuth();
  const { currency, symbol, formatPrice, convertPrice, rates } = useCurrency();
  const [selectedCar, setSelectedCar] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [overlapDetails, setOverlapDetails] = useState(null);
  const [completedBooking, setCompletedBooking] = useState(null);
  const [dealerInfo, setDealerInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    phone: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const navigate = useNavigate();

  const addonsList = [
    { id: 1, name: "Child Safety Seats", price: 10, icon: <Icons.Shield size={16} color="currentColor" /> },
    { id: 2, name: "Wi-Fi Hotspot", price: 8, icon: <Icons.Wifi size={16} color="currentColor" /> },
    { id: 3, name: "Roadside Assistance", price: 15, icon: <Icons.Tools size={16} color="currentColor" /> },
    { id: 4, name: "Insurance Package", price: 20, icon: <Icons.Shield size={16} color="currentColor" /> },
  ];

  const paymentMethods = [
    {
      id: "cash",
      label: "Cash at Pickup",
      getIcon: (color) => <Icons.Cash size={20} color={color} />,
      note: "Pay in cash when you pick up the car",
    },
    {
      id: "card",
      label: "Card at Pickup",
      getIcon: (color) => <Icons.Card size={20} color={color} />,
      note: "Credit or debit card accepted at branch",
    },
    {
      id: "upi",
      label: "UPI at Pickup",
      getIcon: (color) => <Icons.Upi size={20} color={color} />,
      note: "Pay via UPI / QR code at the counter",
    },
  ];

  // Load user phone
  useEffect(() => {
    if (user?.uid) {
      const savedPhone = localStorage.getItem(`phone_${user.uid}`);
      setFormData({
        name: user.displayName || "",
        email: user.email || "",
        phone: savedPhone || "",
      });
    }
  }, [user]);

  // Load data from localStorage
  useEffect(() => {
    const car = localStorage.getItem("selectedCar");
    const booking = localStorage.getItem("bookingData");
    const addons = localStorage.getItem("selectedAddons");
    if (car) setSelectedCar(JSON.parse(car));
    if (booking) setBookingData(JSON.parse(booking));
    if (addons) setSelectedAddons(JSON.parse(addons));
  }, []);

  // ── Load dealer info if car is from dealer ──
  useEffect(() => {
    async function loadDealerInfo() {
      if (!selectedCar?.dealerId) {
        setDealerInfo(null);
        return;
      }

      try {
        const dealerRef = doc(db, "dealers", selectedCar.dealerId);
        const dealerSnap = await getDoc(dealerRef);
        if (dealerSnap.exists()) {
          setDealerInfo({ id: dealerSnap.id, ...dealerSnap.data() });
        }
      } catch (err) {
        console.error("Failed to load dealer info:", err);
      }
    }

    loadDealerInfo();
  }, [selectedCar]);

  function toggleAddon(addon) {
    const exists = selectedAddons.find((a) => a.id === addon.id);
    const updated = exists
      ? selectedAddons.filter((a) => a.id !== addon.id)
      : [...selectedAddons, addon];
    setSelectedAddons(updated);
    localStorage.setItem("selectedAddons", JSON.stringify(updated));
  }

  // Totals
  const days = bookingData?.days || 1;
  const carTotalUSD = selectedCar ? selectedCar.price * days : 0;
  const addonsTotalUSD = selectedAddons.reduce((s, a) => s + a.price * days, 0);
  const finalTotalUSD = carTotalUSD + addonsTotalUSD;

  // ── Confirm booking ────────────────────────────────────────
  async function handleConfirm(e) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.phone) {
      alert("Please add your phone number in your profile first.");
      return;
    }
    if (!selectedCar || !bookingData) {
      alert("Booking data missing. Please start again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // ── 1. Conflict checks ────────────────────────────────
      const snap = await getDocs(
        query(
          collection(db, "bookings"),
          where("userId", "==", user.uid),
          where("status", "in", ["confirmed", "on_hold", "pending_approval"]),
        ),
      );

      const newPickup = new Date(bookingData.pickupDate);
      const newDropoff = new Date(bookingData.dropoffDate);
      let hasDuplicate = false;
      let hasOverlap = false;
      let overlapInfo = null;

      snap.forEach((doc) => {
        const b = doc.data();
        if (!b.pickupDate || !b.dropoffDate) return;
        const ep = new Date(b.pickupDate);
        const ed = new Date(b.dropoffDate);
        if (newPickup < ed && newDropoff > ep) {
          if (b.carId === selectedCar.id) {
            hasDuplicate = true;
          } else {
            hasOverlap = true;
            overlapInfo = {
              carModel: b.carModel,
              pickup: b.pickup,
              dropoff: b.dropoff,
              pickupDate: b.pickupDate,
              dropoffDate: b.dropoffDate,
            };
          }
        }
      });

      if (hasDuplicate) {
        setShowDuplicateModal(true);
        setIsSubmitting(false);
        return;
      }
      if (hasOverlap) {
        setShowOverlapModal(true);
        setOverlapDetails(overlapInfo);
        setIsSubmitting(false);
        return;
      }

      // A car should always carry the dealerId of the subcollection it
      // lives under (dealers/{dealerId}/cars/{carId}) — if it's missing
      // here, something upstream (car listing/fetch) failed to attach it.
      // Block the booking instead of silently creating one no dealer can
      // ever see or act on.
      if (!selectedCar.dealerId) {
        alert(
          "This car listing is missing dealer information and can't be booked right now. Please go back to Fleet and try selecting the car again, or contact support if this keeps happening.",
        );
        setIsSubmitting(false);
        return;
      }

      // ── 2. Create booking ─────────────────────────────────
      const bookingId = "QW-" + Date.now();
      const approvalDeadline = new Date(Date.now() + 60 * 60 * 1000);
      const now = new Date();

      const newBooking = {
        bookingId,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        carId: selectedCar.id,
        carModel: selectedCar.model,
        carImage: selectedCar.image || "",
        dealerId: selectedCar.dealerId,
        dealerName: dealerInfo?.businessName || null,
        pickup: bookingData.pickup,
        dropoff: bookingData.dropoff,
        pickupDate: bookingData.pickupDate,
        dropoffDate: bookingData.dropoffDate,
        days,
        tripType: bookingData.tripType || "One Way",
        total: finalTotalUSD,
        carTotal: carTotalUSD,
        addonsTotal: addonsTotalUSD,
        // Locked in at booking time: what the customer actually saw/agreed
        // to pay, in their currency, plus the exact rate used to get there.
        // `total` above stays the canonical USD ledger amount forever —
        // these are for honest display later (dealer payout view, receipts,
        // emails), so they don't silently drift if exchange rates move
        // between now and whenever someone looks at this booking again.
        totalDisplayed: Math.round(convertPrice(finalTotalUSD) * 100) / 100,
        exchangeRateAtBooking: rates?.[currency]?.rate || 1,
        addons: selectedAddons,
        paymentMethod,
        paymentStatus: "pay_at_pickup",
        status: "pending_approval",
        approvalDeadline,
        currency,
        currencySymbol: symbol,
        date: now.toLocaleDateString(),
        createdAt: now,
        pickupLocation: bookingData.pickup,

        // Phase 2: Enhanced Car Details
        carNumberPlate: selectedCar.numberPlate || "",
        carSafetyRating: selectedCar.safetyRating || 0,
        carEmergencyKit: selectedCar.emergencyKit || false,
        carGpsAvailable: selectedCar.gpsAvailable || false,
        carInsuranceInfo: selectedCar.insuranceInfo || "",
        carRcBook: selectedCar.rcBook || "",
        carPucCertificate: selectedCar.pucCertificate || "",
        carLastServiceDate: selectedCar.lastServiceDate || "",
        carTransmission: selectedCar.transmission || "",
        carFuel: selectedCar.fuel || "",
        carSeats: selectedCar.seats || 5,
        carBags: selectedCar.bags || "",
        carType: selectedCar.type || "",
      };

      await addDoc(collection(db, "bookings"), newBooking);

      // ── 3. Send email ─────────────────────────────────────
      try {
        await sendBookingReceipt({
          name: user.displayName,
          email: user.email,
          carModel: selectedCar.model,
          pickup: bookingData.pickup,
          dropoff: bookingData.dropoff,
          pickupDate: bookingData.pickupDate,
          dropoffDate: bookingData.dropoffDate,
          days,
          tripType: bookingData.tripType || "One Way",
          addons: selectedAddons,
          carTotal: carTotalUSD,
          addonsTotal: addonsTotalUSD,
          total: finalTotalUSD,
          bookingId,
          paymentMethod,
          currency,
          currencySymbol: symbol,
        });
      } catch (emailErr) {
        console.error("Email failed (non-blocking):", emailErr);
      }

      // ── 4. Cleanup & show receipt ─────────────────────────
      localStorage.removeItem("selectedCar");
      localStorage.removeItem("bookingData");
      localStorage.removeItem("selectedAddons");

      setCompletedBooking({
        ...newBooking,
        carImage: selectedCar.image,
        createdAt: now,
      });
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to complete booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Receipt screen ─────────────────────────────────────────
  if (completedBooking) {
    return (
      <BookingReceipt
        booking={completedBooking}
        formatPrice={formatPrice}
        onViewBookings={() =>
          navigate("/profile", { state: { tab: "bookings" } })
        }
        onHome={() => navigate("/")}
      />
    );
  }

  // ── Main payment page ──────────────────────────────────────
  return (
    <section className="payment_container">
      <div className="pay_stars" aria-hidden="true">
        <div className="pay_star_layer pay_star_layer_a"></div>
        <div className="pay_star_layer pay_star_layer_b"></div>
        <div className="pay_star_layer pay_star_layer_c"></div>
      </div>

      {showDuplicateModal && (
        <DuplicateBookingModal
          onClose={() => {
            setShowDuplicateModal(false);
            navigate("/booking");
          }}
          onGoToProfile={() => {
            setShowDuplicateModal(false);
            navigate("/profile", { state: { tab: "bookings" } });
          }}
        />
      )}
      {showOverlapModal && (
        <OverlapBookingModal
          details={overlapDetails}
          onClose={() => {
            setShowOverlapModal(false);
            navigate("/booking");
          }}
          onGoToProfile={() => {
            setShowOverlapModal(false);
            navigate("/profile", { state: { tab: "bookings" } });
          }}
        />
      )}

      <div className="payment_title">
        <h1>Review & Confirm Booking</h1>
        <p
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: "16px",
            margin: "4px 0 0",
          }}
        >
          Review your details carefully before confirming
        </p>
      </div>

      <div className="payment_grid">
        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Driver Information */}
          <div className="driver_info_card">
            <div className="card_header">
              <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Icons.User size={22} color="#c084fc" />
                Driver's Information
              </h2>
              <div className="blueline" />
            </div>
            <div className="driver_form">
              <div className="info_row">
                <label>Full Name</label>
                <div className="info_value">
                  <input
                    type="text"
                    value={formData.name}
                    disabled
                    className="disabled_input"
                  />
                </div>
              </div>

              <div className="two_column_grid">
                {[
                  {
                    label: "Email Address",
                    value: formData.email,
                    type: "email",
                  },
                  { label: "Phone Number", value: formData.phone, type: "tel" },
                ].map(({ label, value, type }) => (
                  <div className="info_row" key={label}>
                    <label>{label}</label>
                    <div className="info_value">
                      <input
                        type={type}
                        value={value}
                        disabled
                        className="disabled_input"
                      />
                      {label === "Phone Number" && !value && (
                        <p className="warning_text" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Icons.Warning size={12} color="#ffa500" /> Please add your phone number in your profile first
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="driver_info_card">
            <div className="card_header">
              <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Icons.Payment size={22} color="#c084fc" />
                Payment Method
              </h2>
              <div className="blueline" />
            </div>
            <div className="payment_method_content" style={{ padding: "25px" }}>
              <p
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "13px",
                  margin: "0 0 18px",
                  lineHeight: "1.5",
                }}
              >
                All payments are collected{" "}
                <strong style={{ color: "#c084fc" }}>
                  at the pickup branch
                </strong>
                . Choose your preferred payment method below.
              </p>
              <div
                className="payment_method_list"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {paymentMethods.map((pm) => {
                  const isActive = paymentMethod === pm.id;
                  const iconColor = isActive ? "#c084fc" : "#fff";
                  
                  return (
                    <div
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        padding: "14px 16px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        background: isActive
                          ? "rgba(168,85,247,0.08)"
                          : "rgba(255,255,255,0.03)",
                        border: isActive
                          ? "1.5px solid rgba(168,85,247,0.5)"
                          : "1px solid rgba(255,255,255,0.08)",
                        transition: "all 0.2s",
                      }}
                    >
                      {/* Radio */}
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          border: `2px solid ${isActive ? "#c084fc" : "rgba(255,255,255,0.25)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {isActive && (
                          <div
                            style={{
                              width: "9px",
                              height: "9px",
                              borderRadius: "50%",
                              background: "#c084fc",
                            }}
                          />
                        )}
                      </div>
                      
                      <span style={{ display: "flex", alignItems: "center" }}>
                        {pm.getIcon(iconColor)}
                      </span>
                      
                      <div>
                        <p
                          style={{
                            margin: 0,
                            color: isActive ? "#c084fc" : "#fff",
                            fontWeight: "700",
                            fontSize: "14px",
                          }}
                        >
                          {pm.label}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            color: "rgba(255,255,255,0.4)",
                            fontSize: "12px",
                          }}
                        >
                          {pm.note}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Security note */}
              <div
                style={{
                  marginTop: "16px",
                  padding: "10px 14px",
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <Icons.Lock size={16} color="#22c55e" />
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "12px",
                    lineHeight: "1.5",
                  }}
                >
                  No payment is required now. You'll pay{" "}
                  <strong style={{ color: "#22c55e" }}>
                    {formatPrice(finalTotalUSD)}
                  </strong>{" "}
                  via{" "}
                  <strong>
                    {paymentMethods.find((p) => p.id === paymentMethod)?.label}
                  </strong>{" "}
                  when you pick up the vehicle.
                </p>
              </div>

              {/* What happens next */}
              <div
                style={{
                  marginTop: "20px",
                  background: "rgba(168,85,247,0.05)",
                  border: "1px solid rgba(168,85,247,0.15)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    color: "#c084fc",
                    fontWeight: "700",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Icons.Clipboard size={16} color="#c084fc" />
                  What happens next?
                </p>
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: "18px",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "12px",
                    lineHeight: "1.8",
                  }}
                >
                  <li>Your request goes to the dealer for approval</li>
                  <li>
                    Dealer has{" "}
                    <strong style={{ color: "#ffa500" }}>60 minutes</strong> to
                    respond
                  </li>
                  <li>
                    If no response →{" "}
                    <strong style={{ color: "#22c55e" }}>auto-confirmed</strong>
                  </li>
                  <li>
                    You'll receive a <strong>confirmation email</strong>
                  </li>
                  <li>
                    Pay <strong>{formatPrice(finalTotalUSD)}</strong> at pickup
                    via{" "}
                    {paymentMethods.find((p) => p.id === paymentMethod)?.label}
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
<div className="booking_summary_card">
  <div className="card_header">
    <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <Icons.Clipboard size={22} color="#c084fc" />
      Booking Summary
    </h2>
    <div className="blueline" />
  </div>

  <div className="booking_content">
    {/* ── 1. TRIP DETAILS (FIRST) ── */}
    <div className="payment_booking_section">
      <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Icons.Location size={16} color="#c084fc" />
        Trip Details
      </h3>
      <div className="trip_info">
        {[
          ["Pickup Location", bookingData?.pickup],
          ["Dropoff Location", bookingData?.dropoff],
          ["Pickup Date", formatDateDisplay(bookingData?.pickupDate)],
          ["Dropoff Date", formatDateDisplay(bookingData?.dropoffDate)],
          ["Duration", `${days} day${days > 1 ? "s" : ""}`],
          ["Trip Type", bookingData?.tripType],
        ].map(([label, val]) => (
          <div className="trip_row" key={label}>
            <span>{label}:</span>
            <strong>{val || "—"}</strong>
          </div>
        ))}
      </div>
    </div>

    {/* ── 2. VEHICLE + ADD-ONS SIDE BY SIDE ── */}
    <div className="payment_vehicle_addons_row">
      {/* Vehicle Column */}
      <div className="payment_vehicle_column">
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icons.Car size={16} color="#c084fc" />
          Vehicle
        </h3>
        <div className="payment_car_info">
          <img
            src={selectedCar?.image}
            alt={selectedCar?.model}
            className="summary_car_image"
          />
          <div className="car_details_text">
            <p className="car_model_name">{selectedCar?.model}</p>
            <p className="car_price">
              {formatPrice(selectedCar?.price)} <span>/ day</span>
            </p>
          </div>
        </div>

        {/* Vehicle Features (Phase 2) */}
        {(selectedCar?.safetyRating > 0 ||
          selectedCar?.emergencyKit ||
          selectedCar?.gpsAvailable ||
          selectedCar?.numberPlate) && (
          <div className="vehicle_features_compact">
            {selectedCar?.safetyRating > 0 && (
              <div className="feature_item">
                <span className="feature_label">Safety</span>
                <div className="feature_stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Icons.Star
                      key={star}
                      size={12}
                      color={star <= selectedCar.safetyRating ? "#fbbf24" : "rgba(255,255,255,0.2)"}
                      filled={star <= selectedCar.safetyRating}
                    />
                  ))}
                  <span className="feature_value">{selectedCar.safetyRating}/5</span>
                </div>
              </div>
            )}
            {selectedCar?.numberPlate && (
              <div className="feature_item">
                <span className="feature_label">Plate</span>
                <span className="feature_value">
                  <Icons.CarPlate size={12} color="rgba(255,255,255,0.6)" />
                  {selectedCar.numberPlate}
                </span>
              </div>
            )}
            {selectedCar?.emergencyKit && (
              <div className="feature_item">
                <span className="feature_label">Kit</span>
                <span className="feature_value" style={{ color: "#22c55e" }}>
                  <Icons.FirstAid size={12} color="#22c55e" />
                  Available
                </span>
              </div>
            )}
            {selectedCar?.gpsAvailable && (
              <div className="feature_item">
                <span className="feature_label">GPS</span>
                <span className="feature_value" style={{ color: "#c084fc" }}>
                  <Icons.Gps size={12} color="#c084fc" />
                  Available
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add-ons Column */}
      <div className="payment_addons_column">
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icons.Tools size={16} color="#c084fc" />
          Add-ons
        </h3>
        {/* <p style={{
          margin: "0px 0px 10px",
          color: "rgba(255,255,255,0.5)",
          fontSize: "12px",

        }}>Select any addon you'd like to include</p> */}
        <div className="payment_addons_vertical">
          {addonsList.map((addon) => {
            const isSelected = selectedAddons.some(
              (a) => a.id === addon.id,
            );
            return (
              <div
                key={addon.id}
                className={`payment_addon_vertical_item ${isSelected ? "is_selected" : ""}`}
                onClick={() => toggleAddon(addon)}
              >
                <div className="payment_addon_vertical_info">
                  <div className="payment_addon_left">
                    <span className="payment_addon_icon" style={{ color: isSelected ? "#c084fc" : "rgba(255,255,255,0.4)" }}>
                      {addon.icon}
                    </span>
                    <p className="payment_addon_vertical_name">
                      {isSelected && (
                        <span className="payment_check_icon">
                          <Icons.Check size={12} color="#c084fc" />
                        </span>
                      )}
                      {addon.name}
                    </p>
                  </div>
                  <p className="payment_addon_vertical_price">
                    +{formatPrice(addon.price * days)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* ── 3. PRICE BREAKDOWN ── */}
    <div className="price_summary">
      <div className="price_row">
        <span>
          Car Rental ({days} day{days > 1 ? "s" : ""})
        </span>
        <span>{formatPrice(carTotalUSD)}</span>
      </div>
      {selectedAddons.length > 0 && (
        <div className="price_row">
          <span>Add-ons Total</span>
          <span>{formatPrice(addonsTotalUSD)}</span>
        </div>
      )}
      <div
        className="price_row"
        style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}
      >
        <span>Taxes & Fees</span>
        <span>Included</span>
      </div>
      <div className="price_row total">
        <span>Total (Pay at Pickup)</span>
        <strong>{formatPrice(finalTotalUSD)}</strong>
      </div>
    </div>

    {/* Confirm button */}
    <button
      className={`confirm_btn btn ${isSubmitting ? "loading" : ""}`}
      onClick={handleConfirm}
      disabled={isSubmitting || !formData.phone}
      style={{
        opacity: !formData.phone ? 0.5 : 1,
        cursor: !formData.phone ? "not-allowed" : "pointer",
      }}
    >
      {isSubmitting ? (
        <>
          <span className="spinner" />
          Processing...
        </>
      ) : (
        <>
          <Icons.Check size={18} color="#fff" />
          Confirm Booking · {formatPrice(finalTotalUSD)}
        </>
      )}
    </button>

    {!formData.phone && (
      <p
        style={{
          textAlign: "center",
          marginTop: "8px",
          color: "#ff4d4d",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "5px",
          flexWrap: "wrap",
        }}
      >
        <Icons.Warning size={12} color="#ff4d4d" /> Add your phone number in{" "}
        <span
          style={{
            color: "#c084fc",
            cursor: "pointer",
            textDecoration: "underline",
          }}
          onClick={() => navigate("/profile")}
        >
          your profile
        </span>{" "}
        to proceed
      </p>
    )}
  </div>
</div>
      </div>
    </section>
  );
}

export default Payment;