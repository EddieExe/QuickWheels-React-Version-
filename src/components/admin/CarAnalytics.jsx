// src/components/admin/CarAnalytics.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { useDateRange } from "../../context/DateRangeContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysBetween(a, b) {
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
}

function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

function fmt(n, prefix = "₹") {
  if (n >= 100000) return `${prefix}${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${prefix}${(n / 1000).toFixed(1)}K`;
  return `${prefix}${n.toFixed(0)}`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CarAnalytics({ bookings = [], dealers = [], externalSearch, externalSortBy }) {
  const { startDate, endDate, filterByRange } = useDateRange();

  const [allCars, setAllCars]         = useState([]);
  const [loadingCars, setLoadingCars] = useState(true);
  const [expandedCar, setExpandedCar] = useState(null);
  const [search, setSearch]   = useState(externalSearch   ?? "");
  const [sortBy, setSortBy]   = useState(externalSortBy   ?? "revenue");

  // Holds the actual DOM node for each car's detail panel so we can measure
  // its natural (content) height and animate max-height smoothly instead of
  // snapping open/closed.
  const detailRefs = useRef({});

  useEffect(() => { setSearch(externalSearch ?? ""); },   [externalSearch]);
  useEffect(() => { setSortBy(externalSortBy ?? "revenue"); }, [externalSortBy]);

  // ── Load all cars from all dealers ────────────────────────────────────────
  useEffect(() => {
    async function loadCars() {
      setLoadingCars(true);
      try {
        const approvedDealers = dealers.filter(d => d.status === "approved");
        const carPromises = approvedDealers.map(dealer =>
          getDocs(collection(db, "dealers", dealer.id, "cars")).then(snap =>
            snap.docs.map(d => ({
              id:          d.id,
              dealerId:    dealer.id,
              dealerName:  dealer.businessName,
              dealerCity:  dealer.city,
              ...d.data(),
            }))
          )
        );
        const nested = await Promise.all(carPromises);
        setAllCars(nested.flat());
      } catch (err) {
        console.error("Error loading cars:", err);
      } finally {
        setLoadingCars(false);
      }
    }
    if (dealers.length > 0) loadCars();
  }, [dealers]);

  // ── Filter bookings by date range ─────────────────────────────────────────
  const rangeBookings = useMemo(
    () => filterByRange(bookings, "createdAt"),
    [bookings, startDate, endDate]
  );

  // ── Calculate metrics per car ─────────────────────────────────────────────
  const carMetrics = useMemo(() => {
    const rangeDays = Math.max(1, daysBetween(startDate, endDate));

    return allCars.map(car => {
      const carBookings = rangeBookings.filter(b =>
        b.carModel?.toLowerCase().trim() === car.model?.toLowerCase().trim() &&
        b.dealerId === car.dealerId
      );

      const activeBookings    = carBookings.filter(b =>
        !["cancelled", "rejected", "no_show"].includes(b.status)
      );
      const completedBookings = carBookings.filter(b =>
        b.status === "completed" || b.status === "confirmed"
      );
      const cancelledBookings = carBookings.filter(b =>
        b.status === "cancelled" || b.status === "rejected"
      );
      const noShows           = carBookings.filter(b => b.status === "no_show");

      const bookedDays = activeBookings.reduce((s, b) => s + (b.days || 0), 0);
      const utilization = Math.min(100, Math.round((bookedDays / rangeDays) * 100));

      const grossRevenue  = activeBookings.reduce((s, b) => s + (b.total || 0), 0);
      const revenuePerDay = bookedDays > 0 ? grossRevenue / bookedDays : 0;
      const revenuePerAvailableDay = grossRevenue / rangeDays;

      const byMonth = {};
      activeBookings.forEach(b => {
        const d = toDate(b.createdAt);
        if (!d) return;
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        byMonth[key] = (byMonth[key] || 0) + (b.total || 0);
      });
      const monthEntries = Object.entries(byMonth).sort((a,b) => b[1] - a[1]);
      const bestMonth    = monthEntries[0]?.[0] ?? null;
      const worstMonth   = monthEntries[monthEntries.length - 1]?.[0] ?? null;

      const idleDays = Math.max(0, rangeDays - bookedDays);
      const avgBookingValue = activeBookings.length > 0 ? grossRevenue / activeBookings.length : 0;

      return {
        ...car,
        totalBookings:       carBookings.length,
        activeBookings:      activeBookings.length,
        completedBookings:   completedBookings.length,
        cancelledBookings:   cancelledBookings.length,
        noShows:             noShows.length,
        bookedDays,
        idleDays,
        rangeDays,
        utilization,
        grossRevenue,
        revenuePerDay,
        revenuePerAvailableDay,
        avgBookingValue,
        bestMonth,
        worstMonth,
        dailyRate:           car.price || 0,
        potentialRevenue:    (car.price || 0) * rangeDays,
        lostRevenue:         (car.price || 0) * idleDays,
      };
    });
  }, [allCars, rangeBookings, startDate, endDate]);

  // ── Sort + search ─────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = [...carMetrics];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        c.model?.toLowerCase().includes(s) ||
        c.dealerName?.toLowerCase().includes(s)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "revenue")     return b.grossRevenue - a.grossRevenue;
      if (sortBy === "utilization") return b.utilization - a.utilization;
      if (sortBy === "bookings")    return b.activeBookings - a.activeBookings;
      if (sortBy === "idle")        return b.idleDays - a.idleDays;
      return 0;
    });
    return list;
  }, [carMetrics, sortBy, search]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    totalCars:      allCars.length,
    avgUtilization: allCars.length
      ? Math.round(carMetrics.reduce((s,c) => s + c.utilization, 0) / allCars.length)
      : 0,
    totalRevenue:   carMetrics.reduce((s,c) => s + c.grossRevenue, 0),
    totalLost:      carMetrics.reduce((s,c) => s + c.lostRevenue, 0),
    highPerformers: carMetrics.filter(c => c.utilization >= 70).length,
    underutilized:  carMetrics.filter(c => c.utilization < 30 && c.dailyRate > 0).length,
  }), [carMetrics, allCars]);

  if (loadingCars) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:"12px", padding:"8px 0" }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height:"80px", borderRadius:"14px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="car-analytics-container" style={{ fontFamily:"Quicksand,sans-serif" }}>

      {/* ── Summary cards ── */}
      <div className="fleet-stat-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:"12px", marginBottom:"24px" }}>
        {[
          { 
            label: "Total Cars", 
            value: summary.totalCars, 
            color: "#4ce3f7", 
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg> 
          },
          { 
            label: "Avg Utilization", 
            value: `${summary.avgUtilization}%`, 
            color: summary.avgUtilization >= 60 ? "#22c55e" : summary.avgUtilization >= 30 ? "#f59e0b" : "#ef4444", 
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> 
          },
          { 
            label: "Fleet Revenue", 
            value: fmt(summary.totalRevenue), 
            color: "#22c55e", 
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> 
          },
          { 
            label: "Lost (Idle)", 
            value: fmt(summary.totalLost), 
            color: "#ef4444", 
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg> 
          },
          { 
            label: "High Performers", 
            value: summary.highPerformers, 
            color: "#a855f7", 
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> 
          },
          { 
            label: "Underutilized", 
            value: summary.underutilized, 
            color: "#f59e0b", 
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> 
          },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{
            background:"linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
            border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"16px",
            textAlign:"center", display: "flex", flexDirection: "column", alignItems: "center"
          }}>
            <div style={{ color, marginBottom:"6px", display: "flex", alignItems:"center", justifyContent:"center" }}>{icon}</div>
            <p style={{ margin:0, color, fontSize:"1.3rem", fontWeight:"800" }}>{value}</p>
            <p style={{ margin:"4px 0 0", color:"rgba(255,255,255,0.4)", fontSize:"11px" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Underutilized alert ── */}
      {summary.underutilized > 0 && (
        <div className="fleet-alert" style={{
          padding:"10px 16px", marginBottom:"18px",
          background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.25)",
          borderRadius:"12px", display:"flex", alignItems:"center", gap:"10px",
        }}>
          <span style={{ color: "#f59e0b", display: "flex", alignItems: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </span>
          <p style={{ margin:0, color:"#f59e0b", fontSize:"13px", fontWeight:"700" }}>
            {summary.underutilized} car{summary.underutilized > 1 ? "s are" : " is"} underutilized
            (&lt;30% utilization). Consider a price reduction or promotion.
          </p>
        </div>
      )}

      {/* ── Car list ── */}
      {displayed.length === 0 ? (
        <div style={{
          textAlign:"center", padding:"80px",
          border:"1px dashed rgba(255,255,255,0.08)", borderRadius:"20px",
        }}>
          <div style={{ color: "rgba(255,255,255,0.25)", marginBottom: "12px", display: "flex", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </div>
          <p style={{ color:"rgba(255,255,255,0.35)", margin: 0, fontSize: "14px" }}>
            {search ? "No cars match your search." : "No car data available for this period."}
          </p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {displayed.map((car, idx) => {
            const key         = car.id + car.dealerId;
            const isExpanded  = expandedCar === key;
            const utilColor   = car.utilization >= 70 ? "#22c55e"
                              : car.utilization >= 40 ? "#f59e0b" : "#ef4444";

            return (
              <div
                key={key}
                className={`car-card${isExpanded ? " expanded" : ""}`}
                style={{
                  background:"rgba(255,255,255,0.025)",
                  border:"1px solid rgba(255,255,255,0.07)",
                  borderLeft:`3px solid ${utilColor}`,
                  borderRadius:"14px", overflow:"hidden",
                  transition:"all 0.2s",
                }}
              >
                {/* ── Row: summary ── */}
                <div
                  className="car-card-row"
                  onClick={() => setExpandedCar(isExpanded ? null : key)}
                >
                  {/* Rank */}
                  <div className="car-rank" style={{
                    width:"32px", height:"32px", borderRadius:"10px", flexShrink:0,
                    background:`${utilColor}18`, border:`1px solid ${utilColor}33`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"13px", fontWeight:"800", color:utilColor,
                  }}>
                    {idx + 1}
                  </div>

                  {/* Car image thumbnail */}
                  {car.image && (
                    <img
                      src={car.image}
                      alt={car.model}
                      className="car-thumbnail"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}

                  {/* Name + dealer */}
                  <div className="car-info">
                    <p className="car-model">
                      {car.model || "Unknown Model"}
                    </p>
                    <p className="car-dealer">
                      <span className="car-dealer-chip">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="16"></line><line x1="15" y1="22" x2="15" y2="16"></line></svg>
                        {car.dealerName}
                      </span>
                      <span className="car-dealer-sep">·</span>
                      <span className="car-dealer-chip">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        {car.dealerCity}
                      </span>
                    </p>
                  </div>

                  {/* Expand chevron (top row, always visible) */}
                  <span className="car-expand">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>

                  {/* Metrics row: utilization + revenue.
                      display:contents on desktop keeps these as direct
                      siblings of the row above (same visual layout as before);
                      on mobile it becomes its own full-width row. */}
                  <div className="car-metrics-row">
                    {/* Utilization bar */}
                    <div className="car-utilization">
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
                        <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)", fontWeight:"700", letterSpacing:"0.05em" }}>
                          UTILIZATION
                        </span>
                        <span style={{ fontSize:"12px", color:utilColor, fontWeight:"800" }}>
                          {car.utilization}%
                        </span>
                      </div>
                      <div style={{ height:"5px", borderRadius:"4px", background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                        <div style={{
                          height:"100%", borderRadius:"4px",
                          width:`${car.utilization}%`,
                          background:utilColor,
                          boxShadow:`0 0 8px ${utilColor}66`,
                          transition:"width 0.6s ease",
                        }} />
                      </div>
                    </div>

                    {/* Revenue */}
                    <div className="car-revenue">
                      <p style={{ margin:0, color:"#22c55e", fontWeight:"800", fontSize:"16px" }}>
                        {fmt(car.grossRevenue)}
                      </p>
                      <p style={{ margin:"2px 0 0", color:"rgba(255,255,255,0.3)", fontSize:"10px", fontWeight:"700" }}>
                        {car.activeBookings} bookings
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Expanded detail (always rendered, animated via max-height) ── */}
                <div
                  ref={(el) => { if (el) detailRefs.current[key] = el; }}
                  className="car-details"
                  style={{
                    maxHeight: isExpanded ? `${detailRefs.current[key]?.scrollHeight ?? 2000}px` : "0px",
                    opacity: isExpanded ? 1 : 0,
                  }}
                  aria-hidden={!isExpanded}
                >
                  <div className="car-details-inner">
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"10px", paddingTop:"16px" }}>

                      {/* Booking breakdown */}
                      <MetricBox title="Booking Breakdown" color="#4ce3f7">
                        <Row label="Total Bookings"   value={car.totalBookings} />
                        <Row label="Active / Confirmed" value={car.activeBookings} color="#22c55e" />
                        <Row label="Completed"        value={car.completedBookings} color="#4ce3f7" />
                        <Row label="Cancelled"        value={car.cancelledBookings} color="#ef4444" />
                        <Row label="No-Shows"         value={car.noShows} color="#f59e0b" />
                      </MetricBox>

                      {/* Time breakdown */}
                      <MetricBox title="Time Breakdown" color="#a855f7">
                        <Row label="Period (days)"  value={car.rangeDays} />
                        <Row label="Booked Days"    value={car.bookedDays} color="#22c55e" />
                        <Row label="Idle Days"      value={car.idleDays}  color="#ef4444" />
                        <Row label="Utilization"    value={`${car.utilization}%`} color={utilColor} />
                      </MetricBox>

                      {/* Revenue breakdown */}
                      <MetricBox title="Revenue Breakdown" color="#22c55e">
                        <Row label="Gross Revenue"         value={fmt(car.grossRevenue)} color="#22c55e" />
                        <Row label="Revenue / Booked Day"  value={fmt(car.revenuePerDay)} />
                        <Row label="Revenue / Available Day" value={fmt(car.revenuePerAvailableDay)} />
                        <Row label="Avg per Booking"       value={fmt(car.avgBookingValue)} />
                        <Row label="Daily Rate (listed)"   value={fmt(car.dailyRate)} />
                      </MetricBox>

                      {/* Opportunity cost */}
                      <MetricBox title="Opportunity Cost" color="#ef4444">
                        <Row label="Potential Revenue"  value={fmt(car.potentialRevenue)} />
                        <Row label="Actual Revenue"     value={fmt(car.grossRevenue)} color="#22c55e" />
                        <Row label="Lost (idle days)"   value={fmt(car.lostRevenue)}   color="#ef4444" />
                        <Row label="Best Month"  value={car.bestMonth  ?? "—"} color="#22c55e" />
                        <Row label="Worst Month" value={car.worstMonth ?? "—"} color="#ef4444" />
                      </MetricBox>
                    </div>

                    {/* Recommendation */}
                    <div style={{ marginTop:"14px" }}>
                      <Recommendation car={car} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricBox({ title, color, children }) {
  return (
    <div style={{
      padding:"14px", borderRadius:"12px",
      background:"rgba(255,255,255,0.02)",
      border:"1px solid rgba(255,255,255,0.06)",
    }}>
      <p style={{ margin:"0 0 10px", color, fontSize:"11px", fontWeight:"800", letterSpacing:"0.06em", textTransform:"uppercase" }}>
        {title}
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, color = "rgba(255,255,255,0.75)" }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <span style={{ color:"rgba(255,255,255,0.4)", fontSize:"12px" }}>{label}</span>
      <span style={{ color, fontSize:"13px", fontWeight:"700" }}>{value}</span>
    </div>
  );
}

function Recommendation({ car }) {
  let msg = null;
  let color = "#4ce3f7";
  let icon = null;

  if (car.utilization >= 80) {
    msg = `${car.model} is performing excellently at ${car.utilization}% utilization. Consider adding a similar vehicle to meet demand.`;
    color = "#22c55e";
    icon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.14 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>;
  } else if (car.utilization >= 50) {
    msg = `${car.model} has healthy utilization. A 5–10% promotional discount on slow weekdays could push it above 70%.`;
    color = "#4ce3f7";
    icon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
  } else if (car.utilization >= 20) {
    msg = `${car.model} is underperforming at ${car.utilization}%. Consider reducing the listed daily rate by 10–15% or running a promotional campaign.`;
    color = "#f59e0b";
    icon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
  } else if (car.totalBookings === 0) {
    msg = `${car.model} has no bookings in this period. Verify availability is set to active and the price is competitive.`;
    color = "#ef4444";
    icon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>;
  } else {
    msg = `${car.model} has low utilization (${car.utilization}%). Estimated lost revenue: ₹${car.lostRevenue.toFixed(0)} for idle days.`;
    color = "#ef4444";
    icon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
  }

  if (!msg) return null;

  return (
    <div style={{
      padding:"10px 14px", borderRadius:"10px",
      background:`${color}0f`, border:`1px solid ${color}25`,
      display:"flex", gap:"10px", alignItems:"flex-start",
    }}>
      <span style={{ color, display: "flex", alignItems: "center", mt: "2px", flexShrink:0 }}>{icon || <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>}</span>
      <p style={{ margin:0, color:"rgba(255,255,255,0.6)", fontSize:"12px", lineHeight:"1.6" }}>
        <span style={{ color, fontWeight:"700" }}>Insight: </span>{msg}
      </p>
    </div>
  );
}