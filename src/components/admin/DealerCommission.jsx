// src/components/admin/DealerCommission.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { doc, updateDoc, Timestamp, collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useDateRange } from "../../context/DateRangeContext";
import { PAYMENT_CONFIG } from "../../config/paymentConfig";
import {
  getDealerUnsettledCommissions,
  getDealerPayouts,
  createPayoutRecord,
} from "../../utils/paymentLedger";

function fmt(n, prefix = "₹") {
  if (n >= 100000) return `${prefix}${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${Math.round(n || 0).toLocaleString("en-IN")}`;
}

function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Dollar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Bank: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="20" height="14" rx="1"/>
      <line x1="6" y1="8" x2="6" y2="18"/>
      <line x1="10" y1="8" x2="10" y2="18"/>
      <line x1="14" y1="8" x2="14" y2="18"/>
      <line x1="18" y1="8" x2="18" y2="18"/>
      <polyline points="2 8 12 3 22 8"/>
    </svg>
  ),
  Smartphone: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="2"/>
      <line x1="11" y1="18" x2="13" y2="18"/>
    </svg>
  ),
  Banknote: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <circle cx="12" cy="12" r="3"/>
      <line x1="6" y1="9" x2="6" y2="9.01"/>
      <line x1="18" y1="15" x2="18" y2="15.01"/>
    </svg>
  ),
  Receipt: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h16v20l-3-2-2 2-3-2-3 2-2-2-3 2z"/>
      <line x1="8" y1="7" x2="16" y2="7"/>
      <line x1="8" y1="11" x2="16" y2="11"/>
      <line x1="8" y1="15" x2="13" y2="15"/>
    </svg>
  ),
  Handshake: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 11L12 6L7 11"/>
      <path d="M12 6v12"/>
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
      <path d="M8 14l3 3 5-5"/>
    </svg>
  ),
  Chart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Location: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Chevron: ({ expanded }) => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)" }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Building: () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="12" y2="14"/>
      <line x1="16" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="18" x2="16" y2="18"/>
    </svg>
  ),
  Edit: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Check: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Close: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  ChartBar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1"/>
      <rect x="10" y="7" width="4" height="14" rx="1"/>
      <rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  ),
  Payout: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  ),
  Bulb: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6"/><path d="M10 22h4"/>
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>
    </svg>
  ),
  Warning: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Sparkle: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0l1.9 7.1L21 9l-7.1 1.9L12 18l-1.9-7.1L3 9l7.1-1.9z"/>
    </svg>
  ),
};

const PAYOUT_METHODS = [
  { id: "bank_transfer", label: "Bank Transfer", Icon: Icons.Bank },
  { id: "upi",           label: "UPI",           Icon: Icons.Smartphone },
  { id: "cash",          label: "Cash",          Icon: Icons.Banknote },
  { id: "cheque",        label: "Cheque",        Icon: Icons.Receipt },
];

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 900, active = true) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  const start = useRef(null);

  useEffect(() => {
    if (!active) return;
    start.current = null;
    const step = (ts) => {
      if (!start.current) start.current = ts;
      const progress = Math.min(1, (ts - start.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, active]);

  return value;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DealerCommission({ dealers = [], bookings = [], onClose }) {
  const { user } = useAuth();
  const { filterByRange } = useDateRange();

  const [search, setSearch]               = useState("");
  const [editingRate, setEditingRate]      = useState(null);
  const [rateInput, setRateInput]          = useState("");
  const [savingRate, setSavingRate]        = useState(false);
  const [expanded, setExpanded]            = useState(null);
  const [unsettled, setUnsettled]          = useState({});
  const [payoutHistory, setPayoutHistory]  = useState({});
  const [loadingDealer, setLoadingDealer]  = useState(null);
  const [payoutModal, setPayoutModal]      = useState(null);
  const [payoutForm, setPayoutForm]        = useState({ method: "bank_transfer", referenceNumber: "", notes: "" });
  const [processingPayout, setProcessingPayout] = useState(false);
  const [mounted, setMounted]              = useState(false);
  const [activeFilter, setActiveFilter]    = useState("all");
  const [filtersOpen, setFiltersOpen]      = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  const approvedDealers = useMemo(
    () => dealers.filter(d => d.status === "approved"),
    [dealers]
  );

  // ── Calculate per-dealer revenue summary from bookings ────────────────────
  const dealerStats = useMemo(() => {
    const rangeBookings = filterByRange(bookings, "createdAt").filter(b =>
      !["cancelled", "rejected"].includes(b.status)
    );

    return approvedDealers.map(dealer => {
      const rate = dealer.commissionRate ?? PAYMENT_CONFIG.DEFAULT_COMMISSION_RATE;
      const dealerBookings = rangeBookings.filter(b => b.dealerId === dealer.id);

      const gross = dealerBookings.reduce((s, b) => s + (b.total || 0), 0);
      const platformFee = gross * rate;
      const dealerEarning = gross - platformFee;

      return {
        dealer, rate,
        bookingCount: dealerBookings.length,
        gross, platformFee, dealerEarning,
      };
    });
  }, [approvedDealers, bookings, filterByRange]);

  const filtered = useMemo(() => {
    let list = dealerStats;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(d => d.dealer.businessName?.toLowerCase().includes(s));
    }
    if (activeFilter === "pending") {
      list = list.filter(d => (unsettled[d.dealer.id]?.reduce((s,c) => s+(c.dealerEarning||0),0) || 0) > 0);
    } else if (activeFilter === "settled") {
      list = list.filter(d => !((unsettled[d.dealer.id]?.reduce((s,c) => s+(c.dealerEarning||0),0) || 0) > 0));
    }
    return list;
  }, [dealerStats, search, activeFilter, unsettled]);

  // ── Platform summary ──────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    totalGross:        dealerStats.reduce((s, d) => s + d.gross, 0),
    totalPlatformFee:  dealerStats.reduce((s, d) => s + d.platformFee, 0),
    totalDealerEarning: dealerStats.reduce((s, d) => s + d.dealerEarning, 0),
    avgRate: dealerStats.length
      ? dealerStats.reduce((s, d) => s + d.rate, 0) / dealerStats.length
      : PAYMENT_CONFIG.DEFAULT_COMMISSION_RATE,
  }), [dealerStats]);

  const animGross    = useCountUp(summary.totalGross, 1000, mounted);
  const animFee       = useCountUp(summary.totalPlatformFee, 1000, mounted);
  const animEarnings  = useCountUp(summary.totalDealerEarning, 1000, mounted);
  const animRate      = useCountUp(summary.avgRate * 100, 900, mounted);

  // ── Load unsettled commissions + payout history for a dealer ──────────────
  async function loadDealerFinancials(dealerId) {
    setLoadingDealer(dealerId);
    try {
      const [commissions, payouts] = await Promise.all([
        getDealerUnsettledCommissions(dealerId),
        getDealerPayouts(dealerId),
      ]);
      setUnsettled(p => ({ ...p, [dealerId]: commissions }));
      setPayoutHistory(p => ({ ...p, [dealerId]: payouts }));
    } catch (err) {
      console.error("Failed to load dealer financials:", err);
    } finally {
      setLoadingDealer(null);
    }
  }

  function toggleExpand(dealerId) {
    if (expanded === dealerId) {
      setExpanded(null);
      return;
    }
    setExpanded(dealerId);
    if (!unsettled[dealerId]) loadDealerFinancials(dealerId);
  }

  // ── Save commission rate ──────────────────────────────────────────────────
  async function saveRate(dealer) {
    const pct = parseFloat(rateInput);
    if (isNaN(pct) || pct < PAYMENT_CONFIG.MIN_COMMISSION_RATE * 100 || pct > PAYMENT_CONFIG.MAX_COMMISSION_RATE * 100) {
      alert(`Rate must be between ${PAYMENT_CONFIG.MIN_COMMISSION_RATE * 100}% and ${PAYMENT_CONFIG.MAX_COMMISSION_RATE * 100}%`);
      return;
    }
    setSavingRate(true);
    try {
      await updateDoc(doc(db, "dealers", dealer.id), {
        commissionRate: pct / 100,
        commissionUpdatedAt: Timestamp.now(),
        commissionUpdatedBy: user?.email || "admin",
      });

      await addDoc(collection(db, "admin_audit_logs"), {
        action: "commission_rate_updated",
        dealerId: dealer.id,
        dealerName: dealer.businessName,
        oldRate: dealer.commissionRate ?? PAYMENT_CONFIG.DEFAULT_COMMISSION_RATE,
        newRate: pct / 100,
        updatedBy: user?.email,
        createdAt: Timestamp.now(),
      });

      setEditingRate(null);
      setRateInput("");
    } catch (err) {
      console.error(err);
      alert("Failed to update commission rate.");
    } finally {
      setSavingRate(false);
    }
  }

  // ── Process payout ────────────────────────────────────────────────────────
  async function handleCreatePayout() {
    if (!payoutModal) return;
    const commissions = unsettled[payoutModal.dealer.id] || [];
    if (commissions.length === 0) return;

    const totalAmount = commissions.reduce((s, c) => s + (c.dealerEarning || 0), 0);

    setProcessingPayout(true);
    try {
      await createPayoutRecord({
        dealerId:    payoutModal.dealer.id,
        dealerEmail: payoutModal.dealer.ownerEmail,
        dealerName:  payoutModal.dealer.businessName,
        amount:      totalAmount,
        commissionIds: commissions.map(c => c.id),
        method:      payoutForm.method,
        referenceNumber: payoutForm.referenceNumber,
        notes:       payoutForm.notes,
        periodStart: commissions.length
          ? new Date(Math.min(...commissions.map(c => toDate(c.createdAt)?.getTime() || Date.now())))
          : new Date(),
        periodEnd:   new Date(),
        processedBy: user?.email || "admin",
      });

      await loadDealerFinancials(payoutModal.dealer.id);
      setPayoutModal(null);
      setPayoutForm({ method: "bank_transfer", referenceNumber: "", notes: "" });
    } catch (err) {
      console.error(err);
      alert("Failed to process payout.");
    } finally {
      setProcessingPayout(false);
    }
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      fontFamily: "'Quicksand', -apple-system, sans-serif",
      color: "#f8fafc",
      background: "#070f0b",
      borderRadius: "20px",
      overflow: "hidden",
      position: "relative",
    }}>

      <style>{`
        @keyframes dcFadeInUp {
          from { opacity: 0; transform: translateY(14px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dcFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dcDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(28px, -22px) scale(1.08); }
        }
        @keyframes dcDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-22px, 24px) scale(1.05); }
        }
        @keyframes dcShimmerSweep {
          0%   { transform: translateX(-120%) skewX(-15deg); }
          100% { transform: translateX(220%) skewX(-15deg); }
        }
        @keyframes dcPulseGlow {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes dcPulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(245,158,11,0.35); }
          70%  { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
          100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        }
        @keyframes dcSparkleSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes dcModalIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dcOverlayIn { from { opacity: 0; } to { opacity: 1; } }

        .dc-bg-glow-a, .dc-bg-glow-b {
          position: absolute; border-radius: 50%; pointer-events: none; z-index: 0;
          filter: blur(60px);
        }
        .dc-bg-glow-a {
          width: 420px; height: 420px; top: -140px; left: -100px;
          background: radial-gradient(circle, rgba(34,197,94,0.14) 0%, transparent 70%);
          animation: dcDrift1 16s ease-in-out infinite;
        }
        .dc-bg-glow-b {
          width: 380px; height: 380px; bottom: -160px; right: -80px;
          background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%);
          animation: dcDrift2 18s ease-in-out infinite;
        }

        .dc-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .dc-scroll::-webkit-scrollbar-track { background: transparent; }
        .dc-scroll::-webkit-scrollbar-thumb { background: rgba(34,197,94,0.18); border-radius: 10px; }
        .dc-scroll::-webkit-scrollbar-thumb:hover { background: rgba(34,197,94,0.35); }

        .dc-card {
          position: relative;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(14px) !important;
          -webkit-backdrop-filter: blur(14px) !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
          animation: dcFadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
          overflow: hidden;
        }
        .dc-card::before {
          content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.05) 48%, transparent 66%);
          transform: translateX(-120%) skewX(-15deg);
        }
        .dc-card:hover::before { animation: dcShimmerSweep 1.1s ease; }
        .dc-card:hover {
          transform: translateY(-3px);
          border-color: rgba(74,222,128,0.28) !important;
          box-shadow: 0 14px 32px rgba(0,0,0,0.3), 0 0 28px rgba(34,197,94,0.09) !important;
        }
        .dc-card > * { position: relative; z-index: 1; }

        .dc-pending-dot { animation: dcPulseRing 2s infinite; border-radius: 50%; }

        .dc-filter-btn {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          border-left: 3px solid transparent !important;
          border-radius: 10px !important;
        }
        .dc-filter-btn:hover { background: rgba(34,197,94,0.1) !important; color: #4ade80 !important; border-left-color: #22c55e !important; transform: translateX(3px); }
        .dc-filter-btn:hover svg { transform: scale(1.15); }
        .dc-filter-btn svg { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .dc-filter-btn.active { background: rgba(34,197,94,0.16) !important; color: #4ade80 !important; border-left-color: #22c55e !important; box-shadow: inset 0 0 16px rgba(34,197,94,0.08); }

        .dc-input { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .dc-input:focus { border-color: rgba(34,197,94,0.45) !important; background: rgba(255,255,255,0.06) !important; box-shadow: 0 0 0 4px rgba(34,197,94,0.1); }

        .dc-expanded-panel { animation: dcFadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .dc-fade-viewport { animation: dcFadeIn 0.35s ease forwards; }

        .dc-rate-input { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .dc-rate-input:focus { border-color: rgba(74,222,128,0.5) !important; box-shadow: 0 0 0 3px rgba(74,222,128,0.12); }
        .dc-rate-trigger { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); border-radius: 8px; padding: 2px 6px; }
        .dc-rate-trigger:hover { background: rgba(74,222,128,0.08); }
        .dc-rate-trigger:hover svg { opacity: 1 !important; transform: scale(1.15); }

        .dc-summary-card {
          background: rgba(255,255,255,0.025) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255,255,255,0.07) !important;
          border-radius: 14px !important;
          padding: 12px 8px !important;
          text-align: center !important;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
          position: relative; overflow: hidden;
        }
        .dc-summary-card::before {
          content: ""; position: absolute; inset: 0; z-index: 0;
          background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%);
          transform: translateX(-130%) skewX(-15deg);
        }
        .dc-summary-card:hover::before { animation: dcShimmerSweep 1s ease; }
        .dc-summary-card:hover {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(34,197,94,0.25) !important;
          transform: translateY(-3px) scale(1.02) !important;
          box-shadow: 0 12px 28px rgba(0,0,0,0.25), 0 0 24px rgba(34,197,94,0.1) !important;
        }
        .dc-summary-card > * { position: relative; z-index: 1; }

        .dc-sidebar-header {
          background: linear-gradient(135deg, rgba(6,95,70,0.95) 0%, rgba(21,128,61,0.9) 55%, rgba(7,15,11,0.95) 100%) !important;
          position: relative; overflow: hidden;
        }
        .dc-sidebar-header::before {
          content: ""; position: absolute; inset: 0; opacity: 0.5;
          background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.14), transparent 55%);
          animation: dcPulseGlow 4s ease-in-out infinite;
        }
        .dc-sidebar-header:hover { box-shadow: 0 10px 28px rgba(34,197,94,0.32) !important; }
        .dc-sidebar-header > * { position: relative; z-index: 1; }
        .dc-live-dot { animation: dcPulseGlow 1.6s ease-in-out infinite; }

        .dc-method-btn { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .dc-method-btn:hover { transform: translateY(-2px); }

        .dc-payout-btn { position: relative; overflow: hidden; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .dc-payout-btn::after {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
          transform: translateX(-140%) skewX(-15deg);
        }
        .dc-payout-btn:hover::after { animation: dcShimmerSweep 0.9s ease; }
        .dc-payout-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(34,197,94,0.3); }
        .dc-payout-btn:active { transform: translateY(0) scale(0.97); }

        .dc-close-btn { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .dc-close-btn:hover { transform: scale(1.08) rotate(90deg); }

        .dc-badge-sparkle { display: inline-flex; animation: dcSparkleSpin 3s linear infinite; }

        .dc-payout-history-row { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .dc-payout-history-row:hover { background: rgba(255,255,255,0.04) !important; transform: translateX(3px); border-color: rgba(34,197,94,0.18) !important; }

        .dc-modal-overlay { animation: dcOverlayIn 0.25s ease forwards; }
        .dc-modal-box { animation: dcModalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* ─── MOBILE RESPONSIVE ─── */
        .dc-filter-toggle { display: none !important; }

        /* ─── MOBILE RESPONSIVE ─── */
.dc-filter-toggle { display: none !important; }

@media (max-width: 700px) {
  .dc-filter-toggle { display: flex !important; }
  
  /* Fix: Make container scrollable */
  .dc-root {
    overflow-y: auto !important;
    height: auto !important;
    min-height: 100vh !important;
  }
  
  .dc-sidebar {
    flex: 0 0 auto !important;
    flex-direction: column !important;
    border-right: none !important;
    border-bottom: 1px solid rgba(255,255,255,0.07) !important;
    padding: 12px 14px !important;
    overflow: visible !important;
    gap: 6px !important;
    width: 100% !important;
    max-height: none !important;
  }
  
  .dc-sidebar-header { padding: 12px 14px !important; }
  .dc-sidebar-header .dc-sh-logo { width: 36px; height: 36px; }
  .dc-sidebar-header .dc-sh-title { font-size: 13px; }

  .dc-filter-toggle {
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    padding: 10px 14px !important;
    background: rgba(255,255,255,0.03) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 12px !important;
    color: rgba(255,255,255,0.6) !important;
    cursor: pointer !important;
    font-family: 'Quicksand', sans-serif !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    letter-spacing: 1px !important;
  }
  .dc-filter-toggle svg { transition: transform 0.3s cubic-bezier(0.4,0,0.2,1); }
  .dc-filter-toggle.open svg { transform: rotate(180deg); }

  /* Search and Summary are always visible */
  .dc-search-wrap {
    display: block !important;
    margin-top: 4px !important;
  }
  .dc-summary-board {
    display: block !important;
    margin-top: 4px !important;
  }

  /* ─── FIX: Scrollable section - NO flex:1, let content size naturally ─── */
  .dc-sidebar-scrollable {
    overflow-y: visible !important;
    flex: 0 0 auto !important;
    padding-top: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 6px !important;
  }

  .dc-main {
    flex-direction: column !important;
    overflow-y: visible !important;
    height: auto !important;
    min-height: auto !important;
  }

  .dc-content { 
    padding: 12px !important; 
    flex: 1 1 auto !important;
    width: 100% !important;
    min-height: 300px !important;
    display: block !important;
    overflow: visible !important;
  }
  
  .dc-content-head { 
    padding-bottom: 10px !important; 
    margin-bottom: 12px !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 4px !important;
  }
  .dc-content-head h2 { font-size: 15px !important; }
  .dc-content-head p { font-size: 11px !important; }
  .dc-total-pill { font-size: 9px !important; padding: 2px 10px !important; }

  .dc-summary-grid { 
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important; 
    gap: 6px !important; 
    margin-bottom: 12px !important;
  }
  .dc-summary-card { 
    padding: 8px 4px !important; 
    border-radius: 10px !important;
  }
  .dc-summary-card .dc-summary-icon { font-size: 11px !important; margin-bottom: 2px !important; }
  .dc-summary-card .dc-summary-value { font-size: 13px !important; }
  .dc-summary-card .dc-summary-label { font-size: 6px !important; letter-spacing: 0.3px !important; }

  .dc-fade-viewport {
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    width: 100% !important;
  }
  
  .dc-scroll {
    overflow-y: visible !important;
    max-height: none !important;
    flex: 1 1 auto !important;
  }

  .dc-card-head { 
    padding: 12px 14px !important; 
    gap: 10px !important; 
    flex-wrap: wrap !important; 
  }
  .dc-card-name { font-size: 12px !important; }
  
  .dc-quick-kpis { 
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important; 
    gap: 4px !important;
    flex: 1 1 100% !important;
    justify-content: stretch !important;
    padding-right: 0 !important;
    order: 3 !important;
    width: 100% !important;
  }
  .dc-quick-kpi { 
    text-align: center !important;
    padding: 2px 0 !important;
  }
  .dc-quick-kpi.gross { text-align: center !important; min-width: auto !important; }
  .dc-quick-kpi-val { font-size: 11px !important; }
  .dc-quick-kpi-label { font-size: 6px !important; letter-spacing: 0.3px !important; }
  .dc-chevron { order: 2; }

  .dc-rate-display { 
    order: 1 !important;
    min-width: 70px !important;
  }
  .dc-rate-display .dc-rate-value { font-size: 12px !important; }
  .dc-rate-display .dc-rate-label { font-size: 7px !important; }

  .dc-expanded-panel { padding: 0 14px 14px !important; }
  .dc-module-grid { grid-template-columns: 1fr !important; gap: 8px !important; padding-top: 12px !important; }

  .dc-actions-bar { justify-content: stretch !important; }
  .dc-payout-btn { width: 100% !important; justify-content: center !important; padding: 10px 14px !important; }
  
  /* ─── FIX: Header - title and badge side by side ─── */
  .dc-header-wrap {
    flex-direction: row !important;
    align-items: center !important;
    gap: 12px !important;
  }
  
  .dc-header-wrap .dc-header-title {
    font-size: 15px !important;
    margin: 0 !important;
  }

  .dc-header-wrap .dc-header-text {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 8px !important;
    flex-wrap: wrap !important;
  }
  
  .dc-header-wrap .dc-header-badge {
    font-size: 9px !important;
    padding: 2px 8px !important;
    margin-top: 0 !important;
    display: inline-block !important;
  }

  /* ─── FIX: Sticky sidebar header ─── */
  .dc-sidebar-sticky {
    position: sticky !important;
    top: 0 !important;
    z-index: 20 !important;
    background: #070f0b !important;
    padding: 0 0 6px 0 !important;
    margin: 0 !important;
  }
  
  .dc-sidebar-sticky .dc-sidebar-header {
    margin-bottom: 6px !important;
  }
}

@media (max-width: 480px) {
  .dc-summary-grid { 
    grid-template-columns: repeat(4, 1fr) !important; 
    gap: 4px !important; 
  }
  .dc-summary-card { 
    padding: 6px 2px !important; 
    border-radius: 8px !important;
  }
  .dc-summary-card .dc-summary-icon { font-size: 9px !important; margin-bottom: 1px !important; }
  .dc-summary-card .dc-summary-value { font-size: 11px !important; }
  .dc-summary-card .dc-summary-label { font-size: 5px !important; letter-spacing: 0.2px !important; }

  .dc-quick-kpis { 
    grid-template-columns: repeat(3, 1fr) !important; 
    gap: 2px !important;
  }
  .dc-quick-kpi-val { font-size: 9px !important; }
  .dc-quick-kpi-label { font-size: 5px !important; letter-spacing: 0.2px !important; }

  .dc-rate-display .dc-rate-value { font-size: 10px !important; }
}
  
        @media (prefers-reduced-motion: reduce) {
          .dc-card, .dc-summary-card, .dc-sidebar-header::before, .dc-bg-glow-a, .dc-bg-glow-b,
          .dc-live-dot, .dc-badge-sparkle, .dc-pending-dot, .dc-modal-box, .dc-modal-overlay { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="dc-bg-glow-a" />
      <div className="dc-bg-glow-b" />

      {/* ── Payout modal ── */}
      {payoutModal && (
        <PayoutModal
          dealer={payoutModal.dealer}
          commissions={unsettled[payoutModal.dealer.id] || []}
          form={payoutForm}
          setForm={setPayoutForm}
          onConfirm={handleCreatePayout}
          onClose={() => setPayoutModal(null)}
          processing={processingPayout}
        />
      )}

      {/* ── Modal Header ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
        background: "rgba(255,255,255,0.008)",
        backdropFilter: "blur(6px)",
        position: "relative",
        zIndex: 1,
      }}>
        <div className="dc-header-wrap" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "rgba(34,197,94,0.14)",
            border: "1px solid rgba(34,197,94,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(34,197,94,0.15)",
            flexShrink: 0,
          }}>
            <Icons.ChartBar />
          </div>
          <div className="dc-header-text" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h2 className="dc-header-title" style={{ margin: 0, color: "#fff", fontSize: "18px", fontWeight: "800", letterSpacing: "-0.3px" }}>
              Dealer Commission & Payouts
            </h2>
            <span className="dc-header-badge" style={{
              fontSize: "10px",
              fontWeight: "700",
              color: "#86efac",
              background: "rgba(34,197,94,0.1)",
              padding: "2px 10px",
              borderRadius: "6px",
              letterSpacing: "0.5px",
              border: "1px solid rgba(34,197,94,0.16)",
              display: "inline-block",
            }}>
              {approvedDealers.length} DEALERS
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="dc-close-btn"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(34,197,94,0.16)";
            e.currentTarget.style.color = "#bbf7d0";
            e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          }}
        >
          <Icons.Close />
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className="dc-main" style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}>

        {/* ── LEFT SIDEBAR ── */}
        <div className="dc-sidebar dc-scroll" style={{
          flex: "0 0 28%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          overflowY: "auto",
          padding: "20px",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(10,14,12,0.35)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}>

          {/* ─── STICKY SECTION (green box + filter toggle) ─── */}
          <div className="dc-sidebar-sticky" style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "inherit",
            paddingBottom: "10px",
          }}>
            {/* Main Commission KPI Shell */}
            <div className="dc-sidebar-header" style={{
              padding: "18px 16px", borderRadius: "18px", color: "#fff",
              boxShadow: "0 8px 24px rgba(34,197,94,0.28), inset 0 1px 1px rgba(255,255,255,0.16)",
              transition: "box-shadow 0.4s ease",
              flexShrink: 0
            }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "center", marginBottom: "14px" }}>
                <div className="dc-sh-logo" style={{
                  width: "44px", height: "44px", borderRadius: "12px", overflow: "hidden", flexShrink: 0,
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "700"
                }}>
                  ₹
                </div>
                <div style={{ overflow: "hidden" }}>
                  <p className="dc-sh-title" style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "15px", letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Commission Ledger</p>
                  <p style={{ margin: 0, fontSize: "11px", fontWeight: "500", opacity: 0.78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{approvedDealers.length} Active Dealers</p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "6px", fontSize: "10px", fontWeight: "700",
                  background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px"
                }}>
                  <span className="dc-live-dot" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#fff" }} />
                  Active
                </span>
                <span style={{ fontSize: "14px", opacity: 0.9, fontWeight: "700" }}>
                  {fmt(summary.totalGross)}
                </span>
              </div>
            </div>

            {/* Mobile toggle - only for filters - stays sticky with green box */}
            <button 
              className={`dc-filter-toggle ${filtersOpen ? "open" : ""}`} 
              onClick={() => setFiltersOpen(p => !p)}
              style={{
                marginTop: "8px",
              }}
            >
              <span>COMMISSION FILTERS</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>

          {/* ─── SCROLLABLE SECTION (filters, search, summary) ─── */}
          <div className="dc-sidebar-scrollable" style={{
            overflowY: "visible",
            flex: "0 0 auto",
            paddingTop: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}>
            {/* Collapsible - ONLY filters - conditionally rendered */}
            {filtersOpen && (
              <div>
                <div className="dc-eyebrow" style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "2px", color: "rgba(255,255,255,0.32)", paddingLeft: "6px", marginBottom: "6px" }}>
                  COMMISSION FILTERS
                </div>

                {/* Filter Controls */}
                <div style={{
                  background: "rgba(255,255,255,0.015)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "16px",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginBottom: "8px",
                }}>
                  {[
                    { id: "all", label: "All Dealers", icon: <Icons.Dollar /> },
                    { id: "pending", label: "Pending Payouts", icon: <Icons.Clock /> },
                    { id: "settled", label: "Settled", icon: <Icons.CheckCircle /> },
                  ].map(({ id, label, icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveFilter(id)}
                      className={`dc-filter-btn ${activeFilter === id ? 'active' : ''}`}
                      style={{
                        padding: "10px 14px", borderRadius: "10px", border: "none",
                        background: activeFilter === id ? "rgba(34,197,94,0.15)" : "transparent",
                        color: activeFilter === id ? "#4ade80" : "rgba(255,255,255,0.45)",
                        cursor: "pointer", fontFamily: "inherit", fontSize: "12px", fontWeight: "600",
                        display: "flex", alignItems: "center", gap: "12px", textAlign: "left",
                        width: "100%"
                      }}
                    >
                      <span style={{ opacity: activeFilter === id ? 0.95 : 0.45, display: "flex", alignItems: "center" }}>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search - ALWAYS VISIBLE */}
            <div className="dc-search-wrap" style={{ position: "relative", marginTop: filtersOpen ? "0" : "4px" }}>
              <input
                value={search}
                className="dc-input"
                onChange={e => setSearch(e.target.value)}
                placeholder="Search dealers..."
                style={{
                  width: "100%", padding: "10px 14px 10px 38px", borderRadius: "12px",
                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#fff", fontFamily: "inherit", fontSize: "12.5px", outline: "none",
                }}
              />
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", opacity: 0.45, color: "#4ade80" }}>
                <Icons.Search />
              </span>
            </div>

            {/* Commission Summary - ALWAYS VISIBLE */}
            <div className="dc-summary-board" style={{
              background: "rgba(34,197,94,0.05)",
              border: "1px solid rgba(34,197,94,0.14)",
              borderRadius: "16px",
              padding: "14px 16px",
              backdropFilter: "blur(6px)",
              transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              marginTop: "8px",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(34,197,94,0.28)";
              e.currentTarget.style.background = "rgba(34,197,94,0.08)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(34,197,94,0.14)";
              e.currentTarget.style.background = "rgba(34,197,94,0.05)";
            }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <Icons.Handshake />
                <p style={{ margin: 0, fontSize: "9px", fontWeight: "700", letterSpacing: "1.5px", color: "#4ade80" }}>COMMISSION SUMMARY</p>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.42)", lineHeight: "1.5" }}>
                Avg Rate: {(summary.avgRate * 100).toFixed(1)}% • Total Fees: {fmt(summary.totalPlatformFee)}
              </p>
            </div>
          </div>

          <div style={{ flex: 1 }} />
        </div>

        {/* ── RIGHT CONTENT ── */}
        <div className="dc-content" style={{
          flex: "0 0 72%",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          padding: "20px",
          background: "rgba(255,255,255,0.006)"
        }}>

          {/* Header Action Row */}
          <div className="dc-content-head" style={{
            paddingBottom: "14px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0
          }}>
            <div>
              <h2 style={{ margin: "0 0 2px", fontSize: "18px", color: "#fff", fontWeight: "800", letterSpacing: "-0.3px" }}>
                Dealer Commission Ledger
              </h2>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.42)", fontSize: "12px" }}>
                {filtered.length} dealers • Total earnings: {fmt(summary.totalDealerEarning)}
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span className="dc-total-pill" style={{
                fontSize: "10px", color: "#4ade80",
                fontWeight: "700", letterSpacing: "1px",
                background: "rgba(34,197,94,0.08)", padding: "4px 12px", borderRadius: "8px",
                border: "1px solid rgba(34,197,94,0.12)"
              }}>
                {approvedDealers.length} TOTAL
              </span>
            </div>
          </div>

          {/* Summary Stats Cards */}
          <div className="dc-summary-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "10px",
            marginBottom: "16px",
            flexShrink: 0
          }}>
            {[
              { icon: <Icons.Dollar />, label: "GROSS REVENUE", value: fmt(animGross), color: "#38bdf8" },
              { icon: <Icons.Bank />, label: "PLATFORM FEE", value: fmt(animFee), color: "#c084fc" },
              { icon: <Icons.Handshake />, label: "DEALER EARNINGS", value: fmt(animEarnings), color: "#4ade80" },
              { icon: <Icons.Chart />, label: "AVG RATE", value: `${animRate.toFixed(1)}%`, color: "#fbbf24" },
            ].map(({ icon, label, value, color }, i) => (
              <div key={label} className="dc-summary-card" style={{ 
                animation: `dcFadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both ${i * 0.06}s`
              }}>
                <div className="dc-summary-icon" style={{ color, display: "flex", justifyContent: "center", marginBottom: "3px", fontSize: "14px" }}>
                  {icon}
                </div>
                <p className="dc-summary-value" style={{ margin: 0, color, fontSize: "1rem", fontWeight: "800", letterSpacing: "-0.3px" }}>{value}</p>
                <p className="dc-summary-label" style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.32)", fontSize: "8px", fontWeight: "700", letterSpacing: "0.8px" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Core Viewport Engine */}
          <div className="dc-scroll" style={{ flex: 1, overflowY: "auto", paddingBottom: "10px" }}>

            {/* Empty Matrix State */}
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed rgba(255,255,255,0.09)", borderRadius: "24px", background: "rgba(255,255,255,0.006)" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                  <Icons.Building />
                </div>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13.5px", fontWeight: "500" }}>
                  {search ? "No dealers match your search." : "No approved dealers yet."}
                </p>
              </div>
            )}

            {/* Dealer Commission Ledger */}
            <div className="dc-fade-viewport" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filtered.map(({ dealer, rate, bookingCount, gross, platformFee, dealerEarning }, idx) => {
                const isExpanded = expanded === dealer.id;
                const isEditing  = editingRate === dealer.id;
                const isLoading  = loadingDealer === dealer.id;
                const dealerCommissions = unsettled[dealer.id] || [];
                const dealerPayouts     = payoutHistory[dealer.id] || [];
                const totalOwed   = dealerCommissions.reduce((s, c) => s + (c.dealerEarning || 0), 0);

                return (
                  <div key={dealer.id} className="dc-card" style={{
                    borderRadius: "16px",
                    background: isExpanded ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.025)",
                    border: isExpanded ? "1px solid rgba(74,222,128,0.22)" : "1px solid rgba(255,255,255,0.07)",
                    borderLeft: `4px solid ${totalOwed > 0 ? "#f59e0b" : "#22c55e"}`,
                    boxShadow: isExpanded ? "0 14px 34px rgba(0,0,0,0.32)" : undefined,
                    animationDelay: `${Math.min(idx, 8) * 0.05}s`,
                  }}>
                    {/* Card Header Row Summary */}
                    <div
                      className="dc-card-head"
                      style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", flexWrap: "wrap" }}
                      onClick={() => toggleExpand(dealer.id)}
                    >
                      <div style={{ flex: 1, minWidth: "140px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
                          <p className="dc-card-name" style={{ margin: 0, color: "#fff", fontWeight: "800", fontSize: "13px", letterSpacing: "-0.3px" }}>{dealer.businessName}</p>
                          {totalOwed > 0 && (
                            <span style={{
                              padding: "1px 7px", borderRadius: "5px", fontSize: "8px", fontWeight: "800", letterSpacing: "0.5px", textTransform: "uppercase",
                              background: "rgba(245,158,11,0.14)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.28)",
                              display: "inline-flex", alignItems: "center", gap: "4px"
                            }}>
                              <span className="dc-pending-dot" style={{ width: "5px", height: "5px", background: "#f59e0b", display: "inline-block", borderRadius: "50%" }} />
                              Pending
                            </span>
                          )}
                          {totalOwed === 0 && dealerCommissions && Object.prototype.hasOwnProperty.call(unsettled, dealer.id) && (
                            <span style={{
                              padding: "1px 7px", borderRadius: "5px", fontSize: "8px", fontWeight: "800", letterSpacing: "0.5px", textTransform: "uppercase",
                              background: "rgba(34,197,94,0.14)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.28)",
                              display: "inline-flex", alignItems: "center", gap: "4px"
                            }}>
                              <span className="dc-badge-sparkle"><Icons.Sparkle /></span>
                              Settled
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Icons.Location />
                          {dealer.city}, {dealer.state} • <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: "600" }}>{bookingCount}</span> bookings
                        </p>
                      </div>

                      {/* Commission rate */}
                      <div className="dc-rate-display" style={{ textAlign: "center", minWidth: "90px", flexShrink: 0 }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <input
                              type="number"
                              autoFocus
                              value={rateInput}
                              onChange={e => setRateInput(e.target.value)}
                              className="dc-rate-input"
                              style={{
                                width: "55px", padding: "4px 6px", borderRadius: "6px",
                                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(74,222,128,0.25)",
                                color: "#fff", textAlign: "center", fontSize: "12px",
                                fontFamily: "inherit", outline: "none"
                              }}
                              min={PAYMENT_CONFIG.MIN_COMMISSION_RATE * 100}
                              max={PAYMENT_CONFIG.MAX_COMMISSION_RATE * 100}
                              step="0.5"
                            />
                            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>%</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); saveRate(dealer); }}
                              disabled={savingRate}
                              style={{
                                background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                                borderRadius: "5px", color: "#4ade80", cursor: "pointer",
                                padding: "3px 6px", fontSize: "10px", display: "flex", alignItems: "center",
                                transition: "all 0.2s ease"
                              }}
                            >
                              <Icons.Check />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingRate(null); setRateInput(""); }}
                              style={{
                                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                                borderRadius: "5px", color: "#ef4444", cursor: "pointer",
                                padding: "3px 6px", fontSize: "10px", display: "flex", alignItems: "center"
                              }}
                            >
                              <Icons.Close />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={(e) => { e.stopPropagation(); setEditingRate(dealer.id); setRateInput((rate*100).toString()); }}
                            className="dc-rate-trigger"
                            title="Click to edit"
                          >
                            <p className="dc-rate-value" style={{ margin: 0, color: "#c084fc", fontWeight: "800", fontSize: "14px" }}>{(rate*100).toFixed(1)}%</p>
                            <p className="dc-rate-label" style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "8px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
                              COMMISSION <Icons.Edit style={{ opacity: 0.6, transition: "all 0.2s ease" }} />
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Quick KPIs */}
                      <div className="dc-quick-kpis" style={{ display: "flex", gap: "14px", flexShrink: 0 }}>
                        <div className="dc-quick-kpi" style={{ textAlign: "center" }}>
                          <p className="dc-quick-kpi-val" style={{ margin: 0, color: "#38bdf8", fontWeight: "800", fontSize: "12px" }}>{fmt(gross)}</p>
                          <p className="dc-quick-kpi-label" style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "7px", fontWeight: "700", letterSpacing: "0.5px" }}>GROSS</p>
                        </div>
                        <div className="dc-quick-kpi" style={{ textAlign: "center" }}>
                          <p className="dc-quick-kpi-val" style={{ margin: 0, color: "#c084fc", fontWeight: "800", fontSize: "12px" }}>{fmt(platformFee)}</p>
                          <p className="dc-quick-kpi-label" style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "7px", fontWeight: "700", letterSpacing: "0.5px" }}>PLATFORM</p>
                        </div>
                        <div className="dc-quick-kpi gross" style={{ textAlign: "right", minWidth: "55px" }}>
                          <p className="dc-quick-kpi-val" style={{ margin: 0, color: "#4ade80", fontWeight: "800", fontSize: "13px" }}>{fmt(dealerEarning)}</p>
                          <p className="dc-quick-kpi-label" style={{ margin: 0, color: "rgba(255,255,255,0.3)", fontSize: "7px", fontWeight: "700", letterSpacing: "0.5px" }}>EARNINGS</p>
                        </div>
                      </div>

                      <span className="dc-chevron" style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", marginLeft: "auto" }}>
                        <Icons.Chevron expanded={isExpanded} />
                      </span>
                    </div>

                    {/* Deep Ledger Panel Viewport */}
                    {isExpanded && (
                      <div className="dc-expanded-panel" style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        {isLoading ? (
                          <p style={{ color: "rgba(255,255,255,0.4)", padding: "20px 0", textAlign: "center", fontSize: "12px" }}>Loading financial data…</p>
                        ) : (
                          <div style={{ paddingTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>

                            {/* Pending payout */}
                            <div style={{
                              padding: "14px 16px", borderRadius: "12px",
                              background: totalOwed > 0 ? "rgba(245,158,11,0.07)" : "rgba(34,197,94,0.07)",
                              border: `1px solid ${totalOwed > 0 ? "rgba(245,158,11,0.22)" : "rgba(34,197,94,0.22)"}`,
                              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px",
                            }}>
                              <div>
                                <p style={{ margin: "0 0 3px", color: totalOwed > 0 ? "#fbbf24" : "#4ade80", fontWeight: "800", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                                  {totalOwed > 0 ? <Icons.Clock /> : <Icons.CheckCircle />}
                                  {totalOwed > 0 ? `${fmt(totalOwed)} pending payout` : "All settled"}
                                </p>
                                <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>
                                  {dealerCommissions.length} unsettled commission{dealerCommissions.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                              {totalOwed > 0 && (
                                <button
                                  onClick={() => setPayoutModal({ dealer })}
                                  className="dc-payout-btn"
                                  style={{
                                    padding: "7px 14px", borderRadius: "8px", border: "1px solid transparent",
                                    background: "linear-gradient(135deg,#065f46,#22c55e)",
                                    color: "#fff", fontWeight: "700", fontSize: "11px", cursor: "pointer",
                                    fontFamily: "Quicksand, sans-serif", display: "flex", alignItems: "center", gap: "5px"
                                  }}
                                >
                                  <Icons.Payout />
                                  Record Payout
                                </button>
                              )}
                            </div>

                            {/* Payout history */}
                            <div>
                              <p style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.5)", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                Payout History ({dealerPayouts.length})
                              </p>
                              {dealerPayouts.length === 0 ? (
                                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>No payouts recorded yet.</p>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                                  {dealerPayouts.map(p => {
                                    const methodMeta = PAYOUT_METHODS.find(m => m.id === p.method);
                                    const MethodIcon = methodMeta?.Icon;
                                    return (
                                      <div key={p.id} className="dc-payout-history-row" style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        padding: "8px 12px", borderRadius: "8px",
                                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                                      }}>
                                        <div>
                                          <p style={{ margin: 0, color: "#fff", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <span style={{ color: "#4ade80", display: "flex" }}>{MethodIcon && <MethodIcon />}</span>
                                            {methodMeta?.label || p.method}
                                            {p.referenceNumber && <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: "400" }}>· {p.referenceNumber}</span>}
                                          </p>
                                          <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.35)", fontSize: "10px" }}>
                                            {toDate(p.paidAt)?.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) ?? "—"}
                                            {p.notes && ` · ${p.notes}`}
                                          </p>
                                        </div>
                                        <p style={{ margin: 0, color: "#4ade80", fontWeight: "800", fontSize: "13px" }}>{fmt(p.amount)}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Info Footer ── */}
      <div style={{
        padding: "12px 24px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.008)",
        backdropFilter: "blur(6px)",
        flexShrink: 0,
        position: "relative",
        zIndex: 1,
      }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.42)", fontSize: "10px", lineHeight: "1.5", display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{ color: "#4ade80", display: "flex", flexShrink: 0 }}><Icons.Bulb /></span>
          Commission rates apply to all future bookings. Click any rate to edit it (range: {PAYMENT_CONFIG.MIN_COMMISSION_RATE*100}%–{PAYMENT_CONFIG.MAX_COMMISSION_RATE*100}%).
          Pending payouts reflect commission records from the payment ledger.
        </p>
      </div>
    </div>
  );
}

// ── Payout Modal ───────────────────────────────────────────────────────────────

function PayoutModal({ dealer, commissions, form, setForm, onConfirm, onClose, processing }) {
  const totalAmount = commissions.reduce((s, c) => s + (c.dealerEarning || 0), 0);

  const inp = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px", borderRadius: "10px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", fontSize: "13px",
    fontFamily: "Quicksand, sans-serif", outline: "none",
    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
  };
  const label = {
    display: "block", marginBottom: "5px",
    color: "rgba(255,255,255,0.5)", fontSize: "10px",
    fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase",
  };

  return (
    <div
      className="dc-modal-overlay"
      style={{
        position: "fixed", inset: 0, zIndex: 5000,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="dc-modal-box"
        style={{
          width: "100%", maxWidth: "440px",
          background: "rgba(7,15,11,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: "20px", padding: "24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 40px rgba(34,197,94,0.06)",
          fontFamily: "Quicksand, sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <h3 style={{ margin: 0, color: "#fff", fontSize: "17px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#4ade80", display: "flex" }}><Icons.Payout /></span>
            Record Payout
          </h3>
          <button
            onClick={onClose}
            className="dc-close-btn"
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "50%", width: "28px", height: "28px", color: "rgba(255,255,255,0.4)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            <Icons.Close />
          </button>
        </div>
        <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.42)", fontSize: "12px" }}>
          {dealer.businessName} · {commissions.length} commission{commissions.length !== 1 ? "s" : ""}
        </p>

        <div style={{
          padding: "14px", borderRadius: "12px", marginBottom: "16px",
          background: "rgba(34,197,94,0.09)", border: "1px solid rgba(34,197,94,0.28)",
          textAlign: "center", position: "relative", overflow: "hidden",
        }}>
          <p style={{ margin: "0 0 2px", color: "rgba(255,255,255,0.42)", fontSize: "10px", fontWeight: "700", letterSpacing: "0.06em" }}>PAYOUT AMOUNT</p>
          <p style={{ margin: 0, color: "#4ade80", fontSize: "26px", fontWeight: "800", textShadow: "0 0 24px rgba(74,222,128,0.35)" }}>{fmt(totalAmount)}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={label}>Payment Method</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {PAYOUT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setForm(p => ({ ...p, method: m.id }))}
                  className="dc-method-btn"
                  style={{
                    flex: "1 1 45%", padding: "8px 10px", borderRadius: "8px", cursor: "pointer",
                    fontFamily: "Quicksand, sans-serif", fontWeight: "700", fontSize: "11px",
                    background: form.method === m.id ? "rgba(34,197,94,0.16)" : "rgba(255,255,255,0.04)",
                    border: form.method === m.id ? "1px solid rgba(34,197,94,0.45)" : "1px solid rgba(255,255,255,0.08)",
                    color: form.method === m.id ? "#4ade80" : "rgba(255,255,255,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    boxShadow: form.method === m.id ? "0 4px 14px rgba(34,197,94,0.2)" : "none",
                  }}
                ><m.Icon /> {m.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={label}>Reference Number <span style={{ color: "rgba(255,255,255,0.28)" }}>(UTR / transaction ID)</span></label>
            <input
              style={inp}
              placeholder="e.g. UTR123456789"
              value={form.referenceNumber}
              onChange={e => setForm(p => ({ ...p, referenceNumber: e.target.value }))}
              onFocus={e => { e.target.style.borderColor = "rgba(74,222,128,0.45)"; e.target.style.boxShadow = "0 0 0 3px rgba(74,222,128,0.1)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          <div>
            <label style={label}>Notes <span style={{ color: "rgba(255,255,255,0.28)" }}>(optional)</span></label>
            <textarea
              rows={2}
              style={{ ...inp, resize: "vertical" }}
              placeholder="Any additional notes..."
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              onFocus={e => { e.target.style.borderColor = "rgba(74,222,128,0.45)"; e.target.style.boxShadow = "0 0 0 3px rgba(74,222,128,0.1)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
        </div>

        <div style={{
          marginTop: "14px", padding: "10px 12px", borderRadius: "8px",
          background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)",
          display: "flex", gap: "8px", alignItems: "flex-start",
        }}>
          <span style={{ color: "#fbbf24", flexShrink: 0, marginTop: "1px" }}><Icons.Warning /></span>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.48)", fontSize: "10px", lineHeight: "1.4" }}>
            Records that <strong style={{ color: "#fbbf24" }}>{fmt(totalAmount)}</strong> was paid to {dealer.businessName}.
            Complete the actual transfer separately before confirming.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
          <button
            onClick={onConfirm}
            disabled={processing}
            className="dc-payout-btn"
            style={{
              flex: 1, padding: "10px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg,#065f46,#22c55e)",
              color: "#fff", cursor: processing ? "not-allowed" : "pointer",
              fontFamily: "Quicksand, sans-serif", fontWeight: "800", fontSize: "13px",
              opacity: processing ? 0.7 : 1,
            }}
          >
            {processing ? "Processing…" : `Confirm Payout`}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px", borderRadius: "10px",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.6)", cursor: "pointer",
              fontFamily: "Quicksand, sans-serif", fontWeight: "600", fontSize: "12px",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}