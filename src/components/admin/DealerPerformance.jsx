// src/components/admin/DealerPerformance.jsx
import { useState, useMemo, useEffect, useRef } from "react";
import jsPDF from "jspdf";

function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

function fmt(n, prefix = "₹") {
  if (n >= 100000) return `${prefix}${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${Math.round(n || 0)}`;
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function scoreColor(score) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#a855f7";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Attention";
  return "Critical";
}

// ── Compute full scorecard for one dealer ────────────────────────────────────
function computeScorecard(dealer, bookings, reviews) {
  const dealerBookings = bookings.filter(b => b.dealerId === dealer.id);

  const total      = dealerBookings.length;
  const confirmed  = dealerBookings.filter(b => ["confirmed","completed","upcoming_trip","ongoing_trip","pickup_awaited","return_pending"].includes(b.status)).length;
  const cancelled  = dealerBookings.filter(b => b.status === "cancelled").length;
  const cancelledByDealer = dealerBookings.filter(b => b.status === "cancelled" && b.cancelledBy === "dealer").length;
  const rejected   = dealerBookings.filter(b => b.status === "rejected").length;
  const noShows    = dealerBookings.filter(b => b.status === "no_show").length;
  const completed  = dealerBookings.filter(b => b.status === "completed").length;

  const acceptanceRate    = total > 0 ? ((confirmed + completed) / total) * 100 : 0;
  const cancellationRate  = total > 0 ? (cancelledByDealer / total) * 100 : 0;
  const noShowRate        = total > 0 ? (noShows / total) * 100 : 0;

  const responseTimes = dealerBookings
    .filter(b => b.approvedAt && b.createdAt)
    .map(b => (toDate(b.approvedAt) - toDate(b.createdAt)) / 3600000);
  const avgResponseHours = responseTimes.length > 0
    ? responseTimes.reduce((s,r) => s+r, 0) / responseTimes.length
    : null;

  const revenue = dealerBookings.reduce((s, b) => s + (b.total || 0), 0);
  const avgBookingValue = total > 0 ? revenue / total : 0;

  const now = new Date();
  const monthlyRevenue = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyRevenue[monthKey(d)] = 0;
  }
  dealerBookings.forEach(b => {
    const d = toDate(b.createdAt);
    if (!d) return;
    const key = monthKey(d);
    if (key in monthlyRevenue) monthlyRevenue[key] += (b.total || 0);
  });
  const revenueTrend = Object.entries(monthlyRevenue).map(([key, val]) => ({
    month: monthLabel(key), value: val,
  }));

  const dealerReviews = reviews.filter(r =>
    dealerBookings.some(b => b.bookingId === r.bookingId)
  );
  const avgRating = dealerReviews.length > 0
    ? dealerReviews.reduce((s,r) => s + (r.rating || 0), 0) / dealerReviews.length
    : null;

  const acceptanceScore   = acceptanceRate;
  const cancellationScore = Math.max(0, 100 - cancellationRate * 5);
  const noShowScore       = Math.max(0, 100 - noShowRate * 5);
  const ratingScore       = avgRating !== null ? (avgRating / 5) * 100 : 70;
  const volumeScore       = Math.min(100, (total / 20) * 100);

  const compositeScore = total === 0 ? 0 : Math.round(
    acceptanceScore   * 0.35 +
    cancellationScore * 0.25 +
    noShowScore       * 0.15 +
    ratingScore       * 0.15 +
    volumeScore       * 0.10
  );

  return {
    dealer,
    total, confirmed, cancelled, cancelledByDealer, rejected, noShows, completed,
    acceptanceRate, cancellationRate, noShowRate,
    avgResponseHours, revenue, avgBookingValue,
    revenueTrend, avgRating, reviewCount: dealerReviews.length,
    compositeScore,
  };
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportScorecardPDF(sc) {
  const doc = new jsPDF();

  doc.setFillColor(15, 11, 28);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("QuickWheels", 14, 12);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Dealer Performance Matrix Ledger", 14, 19);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(sc.dealer.businessName, 210 - 14, 12, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString("en-IN"), 210 - 14, 19, { align: "right" });

  doc.setTextColor(0, 0, 0);
  let y = 40;

  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, 182, 26, "F");
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  const [r,g,b] = hexToRgb(scoreColor(sc.compositeScore));
  doc.setTextColor(r,g,b);
  doc.text(`${sc.compositeScore}`, 24, y + 18);
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text("/ 100", 50, y + 18);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(scoreLabel(sc.compositeScore), 24, y + 24);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Owner: ${sc.dealer.ownerName || "—"}`, 90, y + 8);
  doc.text(`Email: ${sc.dealer.ownerEmail || "—"}`, 90, y + 14);
  doc.text(`Location: ${sc.dealer.city || ""}, ${sc.dealer.state || ""}`, 90, y + 20);

  y += 36;

  const rows = [
    ["Total Bookings",      sc.total],
    ["Acceptance Rate",     `${sc.acceptanceRate.toFixed(1)}%`],
    ["Cancellation Rate (by dealer)", `${sc.cancellationRate.toFixed(1)}%`],
    ["No-Show Rate",        `${sc.noShowRate.toFixed(1)}%`],
    ["Avg Response Time",   sc.avgResponseHours !== null ? `${sc.avgResponseHours.toFixed(1)} hrs` : "—"],
    ["Total Revenue",       `₹${sc.revenue.toLocaleString("en-IN")}`],
    ["Avg Booking Value",   `₹${sc.avgBookingValue.toFixed(0)}`],
    ["Average Rating",      sc.avgRating !== null ? `${sc.avgRating.toFixed(1)} / 5 (${sc.reviewCount} reviews)` : "No reviews yet"],
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 11, 28);
  doc.text("METRIC NODE PARAMETER", 18, y+5);
  doc.text("VALUE", 140, y+5);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  rows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(14, y, 182, 7, "F");
    }
    doc.text(String(row[0]), 18, y+5);
    doc.text(String(row[1]), 140, y+5);
    y += 7;
  });

  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 11, 28);
  doc.text("Revenue Trend (Last 6 Months)", 14, y);
  y += 8;

  const maxRev = Math.max(...sc.revenueTrend.map(t => t.value), 1);
  const barW = 25;
  sc.revenueTrend.forEach((t, i) => {
    const barH = Math.max(2, (t.value / maxRev) * 30);
    const x = 14 + i * (barW + 4);
    doc.setFillColor(168, 85, 247);
    doc.rect(x, y + 30 - barH, barW, barH, "F");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(t.month, x + barW/2, y + 36, { align: "center" });
    doc.setFontSize(6);
    doc.text(`₹${Math.round(t.value/1000)}K`, x + barW/2, y + 30 - barH - 2, { align: "center" });
  });

  y += 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 11, 28);
  doc.text("System Insights & Recommendations", 14, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const recs = getRecommendations(sc);
  recs.forEach(rec => {
    const lines = doc.splitTextToSize(`• ${rec}`, 180);
    doc.text(lines, 14, y);
    y += lines.length * 5;
  });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated ${new Date().toLocaleString("en-IN")}  ·  QuickWheels Ledger Protocol`, 105, 290, { align: "center" });

  doc.save(`QuickWheels-Performance-${sc.dealer.businessName.replace(/\s+/g,"-")}.pdf`);
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n>>16)&255, (n>>8)&255, n&255];
}

function getRecommendations(sc) {
  const recs = [];
  if (sc.acceptanceRate < 70 && sc.total > 0) recs.push("Acceptance rate is below 70%. Encourage faster response to incoming booking loops.");
  if (sc.cancellationRate > 10) recs.push(`Dealer-initiated cancellation rate is ${sc.cancellationRate.toFixed(1)}%, surpassing the optimal 10% threshold. Review local resource allocations.`);
  if (sc.noShowRate > 8) recs.push("No-show rate is elevated. Consider implementation of dynamic booking re-verifications.");
  if (sc.avgResponseHours !== null && sc.avgResponseHours > 4) recs.push(`Average loop resolution latency is ${sc.avgResponseHours.toFixed(1)} hours. Quick responses stabilize grid conversion.`);
  if (sc.avgRating !== null && sc.avgRating < 3.5) recs.push(`Average quality rating of ${sc.avgRating.toFixed(1)}/5 logs systemic performance complaints. Inspect recent pipeline issues.`);
  if (sc.total < 5) recs.push("Low transaction velocity. Inject visibility vouchers or recommend asset diversification.");
  if (recs.length === 0) recs.push("This node operates at peak optimization boundaries across all vectors. Continue regular flow state.");
  return recs;
}

// ── Count-up hook for premium number reveals ─────────────────────────────────
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, active]);

  return value;
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Chart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Trophy: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6 6 0 0 1 6 6v1H6V8a6 6 0 0 1 6-6z"/>
    </svg>
  ),
  Alert: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Dollar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Location: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Bolt: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
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
  Pdf: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Score: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Revenue: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Bookings: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Rating: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Close: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChartBar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1"/>
      <rect x="10" y="7" width="4" height="14" rx="1"/>
      <rect x="17" y="3" width="4" height="18" rx="1"/>
    </svg>
  ),
  Sparkle: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0l1.9 7.1L21 9l-7.1 1.9L12 18l-1.9-7.1L3 9l7.1-1.9z"/>
    </svg>
  ),
};

// ── Sub-components ────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const color = scoreColor(score);
  const circumference = 2 * Math.PI * 32;
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 80);
    return () => clearTimeout(t);
  }, []);

  const offset = circumference - ((drawn ? score : 0) / 100) * circumference;

  return (
    <div className="dp-ring-wrap">
      <div className="dp-ring-glow" style={{ background: `radial-gradient(circle, ${color}55 0%, transparent 70%)` }} />
      <svg width="76" height="76" viewBox="0 0 76 76" style={{ transform: "rotate(-90deg)", position: "relative", zIndex: 1 }}>
        <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        <circle cx="38" cy="38" r="32" fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease" }}
          className="dp-ring-stroke" />
      </svg>
      <div className="dp-ring-label">
        <span className="dp-ring-score" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function MetricRow({ label, value, color = "rgba(255,255,255,0.75)" }) {
  return (
    <div className="dp-metric-row">
      <span className="dp-metric-label">{label}</span>
      <span className="dp-metric-value" style={{ color }}>{value}</span>
    </div>
  );
}

function MiniBarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="dp-barchart">
      {data.map((d, i) => (
        <div key={d.month} className="dp-bar-col">
          <div className="dp-bar-track">
            <span className="dp-bar-tip">{fmt(d.value)}</span>
            <div
              className="dp-bar-fill"
              style={{
                "--bar-h": `${Math.max(8, (d.value / max) * 100)}%`,
                "--bar-delay": `${i * 0.06}s`,
              }}
            />
          </div>
          <span className="dp-bar-month">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DealerPerformance({ dealers = [], bookings = [], reviews = [], onClose }) {
  const [sortBy, setSortBy]       = useState("score");
  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState(null);
  const [mounted, setMounted]     = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  const approvedDealers = useMemo(
    () => dealers.filter(d => d.status === "approved"),
    [dealers]
  );

  const scorecards = useMemo(
    () => approvedDealers.map(d => computeScorecard(d, bookings, reviews)),
    [approvedDealers, bookings, reviews]
  );

  const displayed = useMemo(() => {
    let list = [...scorecards];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(sc => sc.dealer.businessName?.toLowerCase().includes(s));
    }
    list.sort((a, b) => {
      if (sortBy === "score")    return b.compositeScore - a.compositeScore;
      if (sortBy === "revenue")  return b.revenue - a.revenue;
      if (sortBy === "bookings") return b.total - a.total;
      if (sortBy === "rating")   return (b.avgRating ?? 0) - (a.avgRating ?? 0);
      return 0;
    });
    return list;
  }, [scorecards, sortBy, search]);

  const summary = useMemo(() => ({
    avgScore:    scorecards.length ? Math.round(scorecards.reduce((s,sc) => s+sc.compositeScore, 0) / scorecards.length) : 0,
    excellent:   scorecards.filter(sc => sc.compositeScore >= 80).length,
    critical:    scorecards.filter(sc => sc.compositeScore < 40 && sc.total > 0).length,
    totalRevenue: scorecards.reduce((s,sc) => s+sc.revenue, 0),
  }), [scorecards]);

  const animAvgScore  = Math.round(useCountUp(summary.avgScore, 900, mounted));
  const animExcellent = Math.round(useCountUp(summary.excellent, 900, mounted));
  const animCritical  = Math.round(useCountUp(summary.critical, 900, mounted));
  const animRevenue   = useCountUp(summary.totalRevenue, 1100, mounted);

  const sortLabel = { score: "Composite Score", revenue: "Gross Revenue", bookings: "Booking Volume", rating: "Rating" }[sortBy];

  return (
    <div className="dp-root">

      <style>{`
        @keyframes dpFadeInUp {
          from { opacity: 0; transform: translateY(14px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dpFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dpDrift1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(30px, -24px) scale(1.08); }
        }
        @keyframes dpDrift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-24px, 26px) scale(1.05); }
        }
        @keyframes dpShimmerSweep {
          0%   { transform: translateX(-120%) skewX(-15deg); }
          100% { transform: translateX(220%) skewX(-15deg); }
        }
        @keyframes dpPulseGlow {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes dpSparkleSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ═══ ROOT: fixed-height flex column so header/content never fight
           for space — same three-region discipline as the two modals ═══ */
        .dp-root {
          display: flex; flex-direction: column; height: 100%; min-height: 0;
          font-family: 'Quicksand', -apple-system, sans-serif; color: #f8fafc;
          background: #0a0716; border-radius: 20px; overflow: hidden; position: relative;
        }

        .dp-bg-glow-a, .dp-bg-glow-b {
          position: absolute; border-radius: 50%; pointer-events: none; z-index: 0;
          filter: blur(60px);
        }
        .dp-bg-glow-a {
          width: 420px; height: 420px; top: -140px; left: -100px;
          background: radial-gradient(circle, rgba(168,85,247,0.16) 0%, transparent 70%);
          animation: dpDrift1 16s ease-in-out infinite;
        }
        .dp-bg-glow-b {
          width: 380px; height: 380px; bottom: -160px; right: -80px;
          background: radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%);
          animation: dpDrift2 18s ease-in-out infinite;
        }

        .dp-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .dp-scroll::-webkit-scrollbar-track { background: transparent; }
        .dp-scroll::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.18); border-radius: 10px; }
        .dp-scroll::-webkit-scrollbar-thumb:hover { background: rgba(168,85,247,0.35); }

        /* ── Top bar ── */
        .dp-topbar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0; background: rgba(255,255,255,0.008); backdrop-filter: blur(6px);
          position: relative; z-index: 1; gap: 12px;
        }
        .dp-topbar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .dp-topbar-icon {
          width: 32px; height: 32px; border-radius: 8px; background: rgba(168,85,247,0.14);
          border: 1px solid rgba(168,85,247,0.2); display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 16px rgba(168,85,247,0.15); flex-shrink: 0;
        }
        .dp-topbar h2 { margin: 0; color: #fff; font-size: 18px; font-weight: 800; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dp-topbar-badge {
          font-size: 10px; font-weight: 700; color: #d8b4fe; background: rgba(168,85,247,0.1);
          padding: 2px 10px; border-radius: 6px; letter-spacing: 0.5px; border: 1px solid rgba(168,85,247,0.16);
          white-space: nowrap; flex-shrink: 0;
        }
        .dp-close-btn {
          width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07); color: rgba(255,255,255,0.5); cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dp-close-btn:hover { background: rgba(168,85,247,0.16); color: #e9d5ff; border-color: rgba(168,85,247,0.25); transform: scale(1.08) rotate(90deg); }

        /* ── Main split ── */
        .dp-main { display: flex; flex: 1; min-height: 0; overflow: hidden; position: relative; z-index: 1; }

        .dp-sidebar {
          flex: 0 0 30%; display: flex; flex-direction: column; gap: 16px;
          overflow-y: auto; padding: 20px; border-right: 1px solid rgba(255,255,255,0.07);
          background: rgba(10, 8, 20, 0.35) !important;
          backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important;
        }
        .dp-sidebar-header {
          padding: 18px 16px; border-radius: 18px; color: #fff;
          box-shadow: 0 8px 24px rgba(124,58,237,0.3), inset 0 1px 1px rgba(255,255,255,0.16);
          background: linear-gradient(135deg, rgba(124,58,237,0.9) 0%, rgba(88,28,135,0.9) 55%, rgba(15,11,28,0.95) 100%) !important;
          backdrop-filter: blur(14px) !important; -webkit-backdrop-filter: blur(14px) !important;
          position: relative; overflow: hidden; flex-shrink: 0; transition: box-shadow 0.4s ease;
        }
        .dp-sidebar-header::before {
          content: ""; position: absolute; inset: 0; opacity: 0.5;
          background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.14), transparent 55%);
          animation: dpPulseGlow 4s ease-in-out infinite;
        }
        .dp-sidebar-header:hover { box-shadow: 0 10px 28px rgba(124,58,237,0.35) !important; }
        .dp-sidebar-header > * { position: relative; z-index: 1; }
        .dp-sh-top { display: flex; gap: 14px; align-items: center; margin-bottom: 14px; }
        .dp-sh-logo {
          width: 44px; height: 44px; border-radius: 12px; overflow: hidden; flex-shrink: 0;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700;
        }
        .dp-sh-title { margin: 0 0 2px; font-weight: 800; font-size: 15px; letter-spacing: -0.3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dp-sh-sub { margin: 0; font-size: 11px; font-weight: 500; opacity: 0.78; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dp-sh-foot { display: flex; justify-content: space-between; align-items: center; }
        .dp-live-pill {
          display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 6px;
          font-size: 10px; font-weight: 700; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.22);
          color: #fff; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .dp-live-dot { width: 5px; height: 5px; border-radius: 50%; background: #fff; animation: dpPulseGlow 1.6s ease-in-out infinite; }
        .dp-sh-revenue { font-size: 14px; opacity: 0.9; font-weight: 700; }

        .dp-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: rgba(255,255,255,0.32); padding-left: 6px; flex-shrink: 0; }

        .dp-filters {
          background: rgba(255,255,255,0.015); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 6px; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;
        }
        .dp-filter-btn {
          padding: 10px 14px; border-radius: 10px; border: none; border-left: 3px solid transparent;
          background: transparent; color: rgba(255,255,255,0.45); cursor: pointer; font-family: inherit;
          font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 12px; text-align: left;
          width: 100%; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dp-filter-btn:hover { background: rgba(168,85,247,0.1); color: #d8b4fe; border-left-color: #a855f7; transform: translateX(3px); }
        .dp-filter-btn:hover svg { transform: scale(1.15); }
        .dp-filter-btn svg { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .dp-filter-btn.active { background: rgba(168,85,247,0.15); color: #d8b4fe; border-left-color: #a855f7; box-shadow: inset 0 0 16px rgba(168,85,247,0.08); }
        .dp-filter-btn .dp-filter-icon { opacity: 0.45; display: flex; align-items: center; }
        .dp-filter-btn.active .dp-filter-icon { opacity: 0.95; }

        .dp-search-wrap { position: relative; flex-shrink: 0; }
        .dp-input {
          width: 100%; padding: 10px 14px 10px 38px; border-radius: 12px; color: #fff; font-family: inherit;
          font-size: 12.5px; outline: none; box-sizing: border-box;
          background: rgba(255,255,255,0.025) !important; backdrop-filter: blur(6px) !important;
          border: 1px solid rgba(255,255,255,0.08) !important; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dp-input:focus { border-color: rgba(168,85,247,0.45) !important; background: rgba(255,255,255,0.06) !important; box-shadow: 0 0 0 4px rgba(168,85,247,0.1) !important; }
        .dp-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); opacity: 0.45; color: #d8b4fe; display: flex; }

        .dp-status-board {
          background: rgba(168,85,247,0.05); border: 1px solid rgba(168,85,247,0.14); border-radius: 16px;
          padding: 14px 16px; flex-shrink: 0; backdrop-filter: blur(6px); transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dp-status-board:hover { border-color: rgba(168,85,247,0.28); background: rgba(168,85,247,0.08); }
        .dp-status-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; color: #c084fc; }
        .dp-status-head p { margin: 0; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; }
        .dp-status-board p.dp-status-body { margin: 0; font-size: 11px; color: rgba(255,255,255,0.42); line-height: 1.5; }

        /* ── Filter toggle button (mobile only) ── */
        .dp-filter-toggle { display: none; }

        /* ── Right content ── */
        .dp-content { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; padding: 20px; background: rgba(255,255,255,0.006); }

        .dp-content-head {
          padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.07); margin-bottom: 16px;
          display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-shrink: 0;
        }
        .dp-content-head h2 { margin: 0 0 2px; font-size: 18px; color: #fff; font-weight: 800; letter-spacing: -0.3px; }
        .dp-content-head p { margin: 0; color: rgba(255,255,255,0.42); font-size: 12px; }
        .dp-total-pill {
          font-size: 10px; color: #c084fc; font-weight: 700; letter-spacing: 1px;
          background: rgba(168,85,247,0.08); padding: 4px 12px; border-radius: 8px;
          border: 1px solid rgba(168,85,247,0.12); white-space: nowrap; flex-shrink: 0;
        }

        .dp-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; flex-shrink: 0; }
        .dp-summary-card {
          background: rgba(255,255,255,0.025) !important; backdrop-filter: blur(10px) !important; -webkit-backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255,255,255,0.07) !important; border-radius: 14px !important; padding: 12px 8px !important;
          text-align: center !important; transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15) !important; position: relative; overflow: hidden;
        }
        .dp-summary-card::before {
          content: ""; position: absolute; inset: 0; z-index: 0;
          background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%);
          transform: translateX(-130%) skewX(-15deg);
        }
        .dp-summary-card:hover::before { animation: dpShimmerSweep 1s ease; }
        .dp-summary-card:hover {
          background: rgba(255,255,255,0.05) !important; border-color: rgba(168,85,247,0.25) !important;
          transform: translateY(-3px) scale(1.02) !important; box-shadow: 0 12px 28px rgba(0,0,0,0.22), 0 0 24px rgba(168,85,247,0.1) !important;
        }
        .dp-summary-card > * { position: relative; z-index: 1; }
        .dp-summary-icon { display: flex; justify-content: center; margin-bottom: 3px; font-size: 14px; }
        .dp-summary-value { margin: 0; font-size: 1rem; font-weight: 800; letter-spacing: -0.3px; }
        .dp-summary-label { margin: 2px 0 0; color: rgba(255,255,255,0.32); font-size: 8px; font-weight: 700; letter-spacing: 0.8px; }

        .dp-viewport { flex: 1; min-height: 0; overflow-y: auto; padding-bottom: 10px; }

        .dp-empty { text-align: center; padding: 60px 20px; border: 1px dashed rgba(255,255,255,0.09); border-radius: 24px; background: rgba(255,255,255,0.006); }
        .dp-empty-icon { display: flex; justify-content: center; margin-bottom: 12px; }
        .dp-empty p { color: rgba(255,255,255,0.35); font-size: 13.5px; font-weight: 500; }

        .dp-list { display: flex; flex-direction: column; gap: 12px; }

        .dp-card {
          position: relative; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          background: rgba(255,255,255,0.025) !important; backdrop-filter: blur(14px) !important; -webkit-backdrop-filter: blur(14px) !important;
          border: 1px solid rgba(255,255,255,0.07) !important; box-shadow: 0 2px 10px rgba(0,0,0,0.18) !important;
          animation: dpFadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; overflow: hidden; border-radius: 16px;
        }
        .dp-card::before {
          content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.05) 48%, transparent 66%);
          transform: translateX(-120%) skewX(-15deg);
        }
        .dp-card:hover::before { animation: dpShimmerSweep 1.1s ease; }
        .dp-card:hover {
          transform: translateY(-3px); background: rgba(255,255,255,0.045) !important;
          border-color: rgba(168,85,247,0.28) !important; box-shadow: 0 14px 32px rgba(0,0,0,0.28), 0 0 28px rgba(168,85,247,0.08) !important;
        }
        .dp-card > * { position: relative; z-index: 1; }

        .dp-card-head { padding: 14px 18px; display: flex; align-items: center; gap: 14px; cursor: pointer; flex-wrap: wrap; }

        .dp-ring-wrap { position: relative; width: 76px; height: 76px; flex-shrink: 0; }
        .dp-ring-glow { position: absolute; inset: -10px; border-radius: 50%; opacity: 0.5; transition: opacity 0.4s ease, transform 0.4s ease; z-index: 0; }
        .dp-card:hover .dp-ring-glow { opacity: 1; transform: scale(1.15); }
        .dp-card:hover .dp-ring-stroke { filter: drop-shadow(0 0 6px currentColor); }
        .dp-card:hover .dp-ring-score { text-shadow: 0 0 14px currentColor; }
        .dp-ring-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; z-index: 2; }
        .dp-ring-score { font-size: 18px; font-weight: 800; transition: text-shadow 0.4s ease; }

        .dp-card-body { flex: 1; min-width: 140px; }
        .dp-card-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px; }
        .dp-card-name { margin: 0; color: #fff; font-weight: 800; font-size: 13px; letter-spacing: -0.3px; }
        .dp-status-chip {
          padding: 1px 7px; border-radius: 5px; font-size: 8px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;
          display: inline-flex; align-items: center; gap: 3px;
        }
        .dp-card-loc { margin: 0; color: rgba(255,255,255,0.4); font-size: 10px; display: flex; align-items: center; gap: 4px; }
        .dp-card-loc strong { color: rgba(255,255,255,0.6); font-weight: 600; }

        .dp-quick-kpis { display: flex; gap: 16px; flex-shrink: 0; padding-right: 4px; }
        .dp-quick-kpi { text-align: center; }
        .dp-quick-kpi.gross { text-align: right; min-width: 55px; }
        .dp-quick-kpi-val { margin: 0; font-weight: 800; font-size: 12px; }
        .dp-quick-kpi-label { margin: 2px 0 0; color: rgba(255,255,255,0.3); font-size: 7px; font-weight: 700; letter-spacing: 0.5px; }

        .dp-chevron { color: rgba(255,255,255,0.25); font-size: 10px; margin-left: auto; }

        .dp-expanded-panel { animation: dpFadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; padding: 0 18px 18px; border-top: 1px solid rgba(255,255,255,0.06); }
        .dp-fade-viewport { animation: dpFadeIn 0.35s ease forwards; }

        .dp-module-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; padding-top: 16px; margin-bottom: 14px; }
        .dp-module-card {
          padding: 12px !important; border-radius: 12px !important; background: rgba(255,255,255,0.015) !important;
          backdrop-filter: blur(6px) !important; -webkit-backdrop-filter: blur(6px) !important; border: 1px solid rgba(255,255,255,0.05) !important;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .dp-module-card:hover { border-color: rgba(168,85,247,0.2) !important; background: rgba(255,255,255,0.03) !important; transform: translateY(-2px) !important; box-shadow: 0 8px 20px rgba(0,0,0,0.2) !important; }
        .dp-module-title { margin: 0 0 6px; color: #c084fc; font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .dp-module-rows { display: flex; flex-direction: column; gap: 2px; }

        .dp-metric-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 2px; transition: transform 0.25s ease, background 0.25s ease; border-radius: 6px; }
        .dp-metric-row:hover { transform: translateX(3px); background: rgba(255,255,255,0.03); }
        .dp-metric-label { color: rgba(255,255,255,0.4); font-size: 12px; font-weight: 500; }
        .dp-metric-value { font-size: 12.5px; font-weight: 700; }

        .dp-barchart { display: flex; gap: 6px; align-items: flex-end; height: 64px; margin-top: 12px; }
        .dp-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .dp-bar-track { width: 100%; height: 44px; display: flex; align-items: flex-end; position: relative; }
        .dp-bar-fill {
          width: 100%; height: var(--bar-h); border-radius: 5px 5px 2px 2px;
          background: linear-gradient(180deg, #c084fc 0%, #a855f7 45%, rgba(168,85,247,0.15) 100%);
          transform: scaleY(0.1); transform-origin: bottom;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) var(--bar-delay), filter 0.3s ease;
        }
        .dp-module-card:hover .dp-bar-fill, .dp-card:hover .dp-bar-fill { transform: scaleY(1); box-shadow: 0 -4px 14px rgba(168,85,247,0.25); }
        .dp-bar-col:hover .dp-bar-fill { filter: brightness(1.25); }
        .dp-bar-tip {
          position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%) translateY(4px);
          font-size: 8.5px; font-weight: 800; color: #e9d5ff; background: rgba(30,10,50,0.9);
          padding: 2px 6px; border-radius: 5px; border: 1px solid rgba(168,85,247,0.3);
          white-space: nowrap; opacity: 0; pointer-events: none; z-index: 3; transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .dp-bar-col:hover .dp-bar-tip { opacity: 1; transform: translateX(-50%) translateY(0); }
        .dp-bar-month { color: rgba(255,255,255,0.35); font-size: 9px; font-weight: 700; }

        .dp-recs { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
        .dp-rec-row {
          padding: 7px 11px; border-radius: 8px; background: rgba(168,85,247,0.035); border: 1px solid rgba(168,85,247,0.09);
          display: flex; gap: 8px; align-items: flex-start; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dp-rec-row:hover { border-color: rgba(168,85,247,0.25); background: rgba(168,85,247,0.07); transform: translateX(3px); }
        .dp-rec-icon { font-size: 11px; color: #c084fc; flex-shrink: 0; margin-top: 1px; }
        .dp-rec-text { margin: 0; color: rgba(255,255,255,0.55); font-size: 10px; line-height: 1.4; }

        .dp-actions-bar { display: flex; justify-content: flex-end; }
        .dp-pdf-btn {
          padding: 7px 14px; border-radius: 8px; border: 1px solid rgba(168,85,247,0.25); background: rgba(168,85,247,0.08);
          color: #e9d5ff; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 10px;
          display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden;
        }
        .dp-pdf-btn::after {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
          transform: translateX(-140%) skewX(-15deg);
        }
        .dp-pdf-btn:hover::after { animation: dpShimmerSweep 0.9s ease; }
        .dp-pdf-btn:hover { background: linear-gradient(135deg, #a855f7, #7c3aed) !important; color: #fff !important; transform: translateY(-2px) !important; box-shadow: 0 8px 22px rgba(168,85,247,0.35) !important; border-color: transparent !important; }
        .dp-pdf-btn:active { transform: translateY(0) scale(0.97) !important; }

        .dp-badge-sparkle { display: inline-flex; animation: dpSparkleSpin 3s linear infinite; }

        /* ═══ TABLET (≤ 1023px) ═══ */
        @media (max-width: 1023px) {
          .dp-sidebar { flex: 0 0 34%; padding: 16px; gap: 12px; }
          .dp-content { padding: 16px; }
          .dp-summary-grid { gap: 8px; }
        }

        /* ═══ MOBILE (≤ 700px): sidebar → horizontal collapsible top strip ═══ */
@media (max-width: 700px) {
  .dp-topbar { padding: 12px 16px; }
  .dp-topbar h2 { font-size: 15px; }
  .dp-topbar-badge { display: none; }

  .dp-main { flex-direction: column; overflow-y: auto; }

  .dp-sidebar {
    flex: 0 0 auto; flex-direction: column; border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.07); padding: 12px 14px; overflow: visible; gap: 10px;
  }
  .dp-sidebar-header { padding: 12px 14px; }
  .dp-sh-logo { width: 36px; height: 36px; }
  .dp-sh-title { font-size: 13px; }
  .dp-eyebrow { display: none; }

  /* Collapse filters/search/status into a toggle */
  .dp-filter-toggle {
    display: flex; align-items: center; justify-content: space-between; width: 100%;
    padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px; color: rgba(255,255,255,0.6); cursor: pointer; font-family: inherit;
    font-size: 12px; font-weight: 700; letter-spacing: 1px;
  }
  .dp-filter-toggle svg { transition: transform 0.3s cubic-bezier(0.4,0,0.2,1); }
  .dp-filter-toggle.open svg { transform: rotate(180deg); }

  .dp-collapsible {
    overflow: hidden; transition: max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease;
    max-height: 0; opacity: 0; display: flex; flex-direction: column; gap: 10px;
  }
  .dp-collapsible.open { max-height: 600px; opacity: 1; margin-top: 10px; }

  .dp-content { padding: 12px; }
  .dp-content-head { 
    padding-bottom: 10px; margin-bottom: 12px; 
    flex-direction: column !important; 
    align-items: flex-start !important; 
    gap: 4px !important;
  }
  .dp-content-head h2 { font-size: 15px; }
  .dp-content-head p { font-size: 11px; }
  .dp-total-pill { font-size: 9px !important; padding: 2px 10px !important; }

  /* ─── STATS CARDS: SINGLE ROW SIDE BY SIDE ─── */
  .dp-summary-grid { 
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important; 
    gap: 6px !important; 
    margin-bottom: 12px !important;
  }
  .dp-summary-card { 
    padding: 8px 4px !important; 
    border-radius: 10px !important;
  }
  .dp-summary-icon { font-size: 11px !important; margin-bottom: 2px !important; }
  .dp-summary-value { font-size: 13px !important; }
  .dp-summary-label { font-size: 6px !important; letter-spacing: 0.3px !important; }

  .dp-card-head { padding: 12px 14px; gap: 10px; flex-wrap: wrap; }
  .dp-ring-wrap { width: 58px; height: 58px; }
  .dp-ring-wrap svg { width: 58px; height: 58px; }
  .dp-ring-score { font-size: 14px; }
  .dp-card-name { font-size: 12px; }
  .dp-quick-kpis { 
    display: grid !important;
    grid-template-columns: repeat(4, 1fr) !important; 
    gap: 4px !important;
    flex: 1 1 100% !important;
    justify-content: stretch !important;
    padding-right: 0 !important;
    order: 3 !important;
    width: 100% !important;
  }
  .dp-quick-kpi { 
    text-align: center !important;
    padding: 2px 0 !important;
  }
  .dp-quick-kpi.gross { text-align: center !important; min-width: auto !important; }
  .dp-quick-kpi-val { font-size: 11px !important; }
  .dp-quick-kpi-label { font-size: 6px !important; letter-spacing: 0.3px !important; }
  .dp-chevron { order: 2; }

  .dp-module-grid { grid-template-columns: 1fr; gap: 8px; padding-top: 12px; }
  .dp-expanded-panel { padding: 0 14px 14px; }

  .dp-actions-bar { justify-content: stretch; }
  .dp-pdf-btn { width: 100%; justify-content: center; padding: 10px 14px; }
}

@media (max-width: 480px) {
  .dp-summary-grid { 
    grid-template-columns: repeat(4, 1fr) !important; 
    gap: 4px !important; 
  }
  .dp-summary-card { 
    padding: 6px 2px !important; 
    border-radius: 8px !important;
  }
  .dp-summary-icon { font-size: 9px !important; margin-bottom: 1px !important; }
  .dp-summary-value { font-size: 11px !important; }
  .dp-summary-label { font-size: 5px !important; letter-spacing: 0.2px !important; }

  .dp-quick-kpis { 
    grid-template-columns: repeat(4, 1fr) !important; 
    gap: 2px !important;
  }
  .dp-quick-kpi-val { font-size: 9px !important; }
  .dp-quick-kpi-label { font-size: 5px !important; letter-spacing: 0.2px !important; }
}

        @media (max-width: 380px) {
          .dp-summary-grid { grid-template-columns: 1fr 1fr; }
          .dp-quick-kpis { flex-wrap: wrap; }
        }

        @media (prefers-reduced-motion: reduce) {
          .dp-card, .dp-bar-fill, .dp-ring-stroke, .dp-summary-card, .dp-sidebar-header::before,
          .dp-bg-glow-a, .dp-bg-glow-b, .dp-live-dot, .dp-badge-sparkle { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="dp-bg-glow-a" />
      <div className="dp-bg-glow-b" />

      {/* ── TOP BAR ── */}
      <div className="dp-topbar">
        <div className="dp-topbar-left">
          <div className="dp-topbar-icon"><Icons.ChartBar /></div>
          <h2>Dealer Performance Reports</h2>
          <span className="dp-topbar-badge">{scorecards.length} NODES</span>
        </div>
        <button onClick={onClose} className="dp-close-btn"><Icons.Close /></button>
      </div>

      {/* ── MAIN SPLIT ── */}
      <div className="dp-main">

        {/* ── SIDEBAR / MOBILE TOP STRIP ── */}
        <div className="dp-sidebar dp-scroll">

          <div className="dp-sidebar-header">
            <div className="dp-sh-top">
              <div className="dp-sh-logo">Q</div>
              <div style={{ overflow: "hidden" }}>
                <p className="dp-sh-title">Performance Matrix</p>
                <p className="dp-sh-sub">{scorecards.length} Active Nodes</p>
              </div>
            </div>
            <div className="dp-sh-foot">
              <span className="dp-live-pill"><span className="dp-live-dot" />Live Grid</span>
              <span className="dp-sh-revenue">{fmt(summary.totalRevenue)}</span>
            </div>
          </div>

          {/* Mobile-only toggle for filters/search/status */}
          <button className={`dp-filter-toggle ${filtersOpen ? "open" : ""}`} onClick={() => setFiltersOpen(p => !p)}>
            <span>FILTERS & SEARCH</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          <div className={`dp-collapsible ${filtersOpen ? "open" : ""}`}>
            <div className="dp-eyebrow" style={{ display: "block" }}>PERFORMANCE FILTERS</div>

            <div className="dp-filters">
              {[
                { id: "score", label: "Score Nodes", icon: <Icons.Score /> },
                { id: "revenue", label: "Gross Ledgers", icon: <Icons.Revenue /> },
                { id: "bookings", label: "Loop Volumes", icon: <Icons.Bookings /> },
                { id: "rating", label: "Rating Index", icon: <Icons.Rating /> },
              ].map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setSortBy(id)}
                  className={`dp-filter-btn ${sortBy === id ? "active" : ""}`}
                >
                  <span className="dp-filter-icon">{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            <div className="dp-search-wrap">
              <input
                value={search}
                className="dp-input"
                onChange={e => setSearch(e.target.value)}
                placeholder="Search corporate registry..."
              />
              <span className="dp-search-icon"><Icons.Search /></span>
            </div>
          </div>
              <div className="dp-status-board">
              <div className="dp-status-head">
                <Icons.Alert />
                <p>SYSTEM STATUS</p>
              </div>
              <p className="dp-status-body">
                {scorecards.length} active nodes • {summary.excellent} excellent • {summary.critical} critical
              </p>
            </div>
        </div>

        {/* ── RIGHT CONTENT ── */}
        <div className="dp-content">

          <div className="dp-content-head">
            <div>
              <h2>Dealer Scorecards Ledger</h2>
              <p>{displayed.length} nodes • Sorted by {sortLabel}</p>
            </div>
            <span className="dp-total-pill">{scorecards.length} TOTAL</span>
          </div>

          <div className="dp-summary-grid">
            {[
              { icon: <Icons.Chart />, label: "AVG SCORE", value: animAvgScore, color: scoreColor(summary.avgScore) },
              { icon: <Icons.Trophy />, label: "EXCELLENT", value: animExcellent, color: "#10b981" },
              { icon: <Icons.Alert />, label: "CRITICAL", value: animCritical, color: "#ef4444" },
              { icon: <Icons.Dollar />, label: "TOTAL GROSS", value: fmt(animRevenue), color: "#a855f7" },
            ].map(({ icon, label, value, color }, i) => (
              <div key={label} className="dp-summary-card" style={{ animation: `dpFadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both ${i * 0.06}s` }}>
                <div className="dp-summary-icon" style={{ color }}>{icon}</div>
                <p className="dp-summary-value" style={{ color }}>{value}</p>
                <p className="dp-summary-label">{label}</p>
              </div>
            ))}
          </div>

          <div className="dp-viewport dp-scroll">

            {displayed.length === 0 && (
              <div className="dp-empty">
                <div className="dp-empty-icon"><Icons.Building /></div>
                <p>{search ? "No server nodes map to search parameter query." : "No active dealer profiles logged into grid."}</p>
              </div>
            )}

            <div className="dp-fade-viewport dp-list">
              {displayed.map((sc, idx) => {
                const isExpanded = expanded === sc.dealer.id;
                const color = scoreColor(sc.compositeScore);

                return (
                  <div key={sc.dealer.id} className="dp-card" style={{ borderLeft: `4px solid ${color}`, animationDelay: `${Math.min(idx, 8) * 0.05}s` }}>

                    <div className="dp-card-head" onClick={() => setExpanded(isExpanded ? null : sc.dealer.id)}>
                      <ScoreRing score={sc.compositeScore} />

                      <div className="dp-card-body">
                        <div className="dp-card-title-row">
                          <p className="dp-card-name">{sc.dealer.businessName}</p>
                          <span className="dp-status-chip" style={{ background: `${color}16`, color, border: `1px solid ${color}30` }}>
                            {sc.compositeScore >= 80 && <span className="dp-badge-sparkle"><Icons.Sparkle /></span>}
                            {scoreLabel(sc.compositeScore)}
                          </span>
                        </div>
                        <p className="dp-card-loc">
                          <Icons.Location />
                          {sc.dealer.city}, {sc.dealer.state} • <strong>{sc.total}</strong> loops
                        </p>
                      </div>

                      <div className="dp-quick-kpis">
                        <div className="dp-quick-kpi">
                          <p className="dp-quick-kpi-val" style={{ color: "#10b981" }}>{sc.acceptanceRate.toFixed(0)}%</p>
                          <p className="dp-quick-kpi-label">ACCEPT</p>
                        </div>
                        <div className="dp-quick-kpi">
                          <p className="dp-quick-kpi-val" style={{ color: sc.cancellationRate > 10 ? "#ef4444" : "#fff" }}>{sc.cancellationRate.toFixed(0)}%</p>
                          <p className="dp-quick-kpi-label">CANCEL</p>
                        </div>
                        <div className="dp-quick-kpi">
                          <p className="dp-quick-kpi-val" style={{ color: "#fbbf24" }}>{sc.avgRating !== null ? `${sc.avgRating.toFixed(1)}★` : "—"}</p>
                          <p className="dp-quick-kpi-label">RATING</p>
                        </div>
                        <div className="dp-quick-kpi gross">
                          <p className="dp-quick-kpi-val" style={{ color: "#c084fc" }}>{fmt(sc.revenue)}</p>
                          <p className="dp-quick-kpi-label">GROSS</p>
                        </div>
                      </div>

                      <span className="dp-chevron"><Icons.Chevron expanded={isExpanded} /></span>
                    </div>

                    {isExpanded && (
                      <div className="dp-expanded-panel">
                        <div className="dp-module-grid">

                          <div className="dp-module-card">
                            <p className="dp-module-title">Structural Volumes</p>
                            <div className="dp-module-rows">
                              <MetricRow label="Total Loops" value={sc.total} />
                              <MetricRow label="Completed" value={sc.completed} color="#10b981" />
                              <MetricRow label="Revoked" value={sc.cancelledByDealer} color="#ef4444" />
                              <MetricRow label="Rejected" value={sc.rejected} color="#ef4444" />
                              <MetricRow label="No-Shows" value={sc.noShows} color="#f59e0b" />
                            </div>
                          </div>

                          <div className="dp-module-card">
                            <p className="dp-module-title">Quality Vectors</p>
                            <div className="dp-module-rows">
                              <MetricRow label="Acceptance" value={`${sc.acceptanceRate.toFixed(1)}%`} color={sc.acceptanceRate >= 70 ? "#10b981" : "#f59e0b"} />
                              <MetricRow label="Cancellation" value={`${sc.cancellationRate.toFixed(1)}%`} color={sc.cancellationRate > 10 ? "#ef4444" : "#10b981"} />
                              <MetricRow label="No-Show" value={`${sc.noShowRate.toFixed(1)}%`} color={sc.noShowRate > 8 ? "#ef4444" : "#10b981"} />
                              <MetricRow label="Latency" value={sc.avgResponseHours !== null ? `${sc.avgResponseHours.toFixed(1)}h` : "—"} />
                              <MetricRow label="Rating" value={sc.avgRating !== null ? `${sc.avgRating.toFixed(1)}/5 (${sc.reviewCount})` : "No logs"} color="#fbbf24" />
                            </div>
                          </div>

                          <div className="dp-module-card">
                            <p className="dp-module-title" style={{ marginBottom: "4px" }}>Fiscal Ledgers</p>
                            <div className="dp-module-rows" style={{ marginBottom: "4px" }}>
                              <MetricRow label="Cumulative" value={fmt(sc.revenue)} color="#10b981" />
                              <MetricRow label="Avg Yield" value={fmt(sc.avgBookingValue)} />
                            </div>
                            <MiniBarChart data={sc.revenueTrend} />
                          </div>

                        </div>

                        <div className="dp-recs">
                          {getRecommendations(sc).map((rec, i) => (
                            <div key={i} className="dp-rec-row">
                              <span className="dp-rec-icon"><Icons.Bolt /></span>
                              <p className="dp-rec-text">{rec}</p>
                            </div>
                          ))}
                        </div>

                        <div className="dp-actions-bar">
                          <button
                            onClick={(e) => { e.stopPropagation(); exportScorecardPDF(sc); }}
                            className="dp-pdf-btn"
                          >
                            <Icons.Pdf />
                            Export PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}