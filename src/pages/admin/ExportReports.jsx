// src/pages/admin/ExportReports.jsx
import { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAuth } from "../../context/AuthContext";
import { PERMISSIONS } from "../../utils/adminUtils.jsx";
import PermissionGuard from "../../components/PermissionGuard";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  orange: "#f59e0b",
  purple: "#a855f7",
  darkPurple: "#7c3aed",
  red: "#ef4444",
  textSec: "rgba(255, 255, 255, 0.45)",
};

export default function ExportReports({ bookings = [], users = [], dealers = [], cars = [] }) {
  const { adminRole } = useAuth();
  const [exportType, setExportType] = useState("bookings");
  const [dateRange, setDateRange] = useState("all");
  const [status, setStatus] = useState("all");
  const [format, setFormat] = useState("csv");
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getFilteredData = () => {
    let data = [];

    switch (exportType) {
      case "bookings":
        data = [...bookings];
        break;
      case "users":
        data = [...users];
        break;
      case "dealers":
        data = [...dealers];
        break;
      case "cars":
        data = [...cars];
        break;
      case "revenue":
        data = [...bookings];
        break;
      default:
        data = [];
    }

    if (dateRange !== "all" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      data = data.filter((item) => {
        const itemDate = item.createdAt?.toDate
          ? item.createdAt.toDate()
          : new Date(item.createdAt);
        return itemDate >= start && itemDate <= end;
      });
    }

    if (exportType === "bookings" && status !== "all") {
      if (status === "cancelled_dealer") {
        data = data.filter((b) => b.status === "cancelled" && b.cancelledBy === "dealer");
      } else if (status === "cancelled_admin") {
        data = data.filter((b) => b.status === "cancelled" && b.cancelledBy === "admin");
      } else if (status === "cancelled_user") {
        data = data.filter((b) => b.status === "cancelled" && b.cancelledBy === "user");
      } else {
        data = data.filter((b) => b.status === status);
      }
    }

    return data;
  };

  const formatForExport = (data) => {
    switch (exportType) {
      case "bookings":
        return data.map((b) => ({
          "Booking ID": b.bookingId,
          "Car Model": b.carModel,
          "Customer Name": b.userName || "",
          "Customer Email": b.userEmail,
          "Pickup Location": b.pickup,
          "Dropoff Location": b.dropoff,
          "Pickup Date": b.pickupDate,
          "Dropoff Date": b.dropoffDate,
          "Duration (Days)": b.days,
          "Total Amount": b.total,
          Status: b.status,
          "Created At": b.createdAt?.toDate?.()?.toLocaleString("en-IN") || "",
          "Cancelled By": b.cancelledBy || "",
        }));

      case "users":
        return data.map((u) => ({
          Email: u.email,
          Name: u.displayName || u.name || "",
          Phone: u.phone || "",
          Role: u.isAdmin ? "Admin" : u.isDealer ? "Dealer" : "User",
          Status: u.isActive !== false ? "Active" : "Inactive",
          "Member Since": u.createdAt?.toDate?.()?.toLocaleString("en-IN") || "",
          "Last Login": u.lastLoginAt?.toDate?.()?.toLocaleString("en-IN") || "",
        }));

      case "dealers":
        return data.map((d) => ({
          "Business Name": d.businessName,
          "Owner Name": d.ownerName,
          Email: d.ownerEmail,
          Phone: d.phone,
          City: d.city,
          State: d.state,
          Country: d.country,
          Status: d.status,
          "Service Cities": d.serviceCities?.join(", ") || "",
          "Service Radius (km)": d.serviceRadius || 50,
          Joined: d.createdAt?.toDate?.()?.toLocaleString("en-IN") || "",
        }));

      case "cars":
        return data.map((c) => ({
          Model: c.model,
          Type: c.type,
          "Price/Day": c.price,
          Seats: c.seats,
          Transmission: c.transmission,
          Fuel: c.fuel,
          Location: c.location,
          Status: c.isAvailable ? "Available" : "Unavailable",
          "Number Plate": c.numberPlate || "",
        }));

      case "revenue": {
        const revenueByMonth = {};
        data.forEach((b) => {
          const date = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          const monthName = date.toLocaleString("default", {
            month: "long",
            year: "numeric",
          });

          if (!revenueByMonth[monthKey]) {
            revenueByMonth[monthKey] = { month: monthName, revenue: 0, bookings: 0 };
          }
          revenueByMonth[monthKey].revenue += b.total || 0;
          revenueByMonth[monthKey].bookings++;
        });

        return Object.values(revenueByMonth).map((r) => ({
          Month: r.month,
          Revenue: r.revenue,
          Bookings: r.bookings,
          "Avg per Booking": r.bookings > 0 ? r.revenue / r.bookings : 0,
        }));
      }
      default:
        return [];
    }
  };

  const exportAsCSV = (data, filename) => {
    const headers = Object.keys(data[0] || {});
    const csvRows = [headers.join(",")];

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header] || "";
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${filename}.csv`);
  };

  const exportAsExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exportType.toUpperCase());
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportAsPDF = (data, filename, title) => {
    import("jspdf")
      .then(({ default: jsPDF }) => {
        import("jspdf-autotable").then(({ default: autoTable }) => {
          const doc = new jsPDF({ orientation: "landscape" });

          doc.setFontSize(16);
          doc.setTextColor(24, 24, 27); 
          doc.text(title, 14, 18);

          doc.setFontSize(9);
          doc.setTextColor(113, 113, 122);
          doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 25);

          const headers = Object.keys(data[0] || {});
          const rows = data.map((row) => headers.map((h) => String(row[h] || "")));

          autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 32,
            theme: "striped",
            headStyles: {
              fillColor: [15, 23, 42],
              textColor: [255, 255, 255],
              fontStyle: "bold",
              fontSize: 9,
            },
            bodyStyles: { textColor: [63, 63, 70], fontSize: 8 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { top: 30, left: 14, right: 14 },
          });

          doc.save(`${filename}.pdf`);
        });
      })
      .catch((err) => {
        console.error("PDF export failed:", err);
        alert("PDF export failed. Please try CSV or Excel format.");
      });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const filteredData = getFilteredData();
      const formattedData = formatForExport(filteredData);

      if (formattedData.length === 0) {
        alert("No data found for the selected filters.");
        return;
      }

      const filename = `${exportType}_export_${new Date().toISOString().split("T")[0]}`;
      const title = `${exportType.toUpperCase()} DATA REPORT`;

      switch (format) {
        case "csv":
          exportAsCSV(formattedData, filename);
          break;
        case "excel":
          exportAsExcel(formattedData, filename);
          break;
        case "pdf":
          exportAsPDF(formattedData, filename, title);
          break;
        default:
          exportAsCSV(formattedData, filename);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setExporting(false);
    }
  };

  const getTotalRecords = () => formatForExport(getFilteredData()).length;

  return (
    <div className="export-inner" style={{
      color: "#f1f5f9",
      fontFamily: "'Quicksand', -apple-system, sans-serif",
      padding: "0 4px 20px 4px",
      animation: "premiumFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      <style>{`
        * { box-sizing: border-box; }

        @keyframes premiumFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes premiumSpin { to { transform: rotate(360deg); } }
        .premium-select { transition: border-color 0.2s, background 0.2s; appearance: none; }
        .premium-select:hover { border-color: rgba(168,85,247,0.3) !important; background: rgba(255,255,255,0.06) !important; }
        .premium-select:focus { border-color: ${T.purple} !important; box-shadow: 0 0 0 1px ${T.purple}33 !important; }
        .premium-select-wrap { position: relative; }
        .premium-select-wrap::after {
          content: '▼'; font-size: 8px; color: rgba(255,255,255,0.3);
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%); pointer-events: none;
        }
        .premium-date-input { transition: border-color 0.2s, background 0.2s; }
        .premium-date-input:hover { border-color: rgba(168,85,247,0.3) !important; }
        .premium-date-input:focus { border-color: ${T.purple} !important; box-shadow: 0 0 0 1px ${T.purple}33 !important; }
        .premium-btn-quick { transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
        .premium-btn-quick:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(168,85,247,0.15); filter: brightness(1.15); }
        
        /* Glass morphism main card */
        .export-main-card {
          background: rgba(255,255,255,0.02) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          border-radius: 16px !important;
          padding: 20px !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
          min-width: 0 !important;
        }
        .export-main-card:hover {
          border-color: rgba(168,85,247,0.15) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 0 20px rgba(168,85,247,0.02) !important;
        }
        
        .export-control-bar {
          background: rgba(255,255,255,0.02) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255,255,255,0.04) !important;
          border-radius: 12px !important;
          padding: 14px 18px !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .export-control-bar:hover {
          border-color: rgba(168,85,247,0.12) !important;
        }

        /* ══════════════════════════════════════════════
           FILTER ROWS — base (desktop) behaviour.
           These wrappers render as "display: contents" via
           inline style on desktop, so their children (Date
           Range / Status Filter, Start / End Date) flow as
           plain items of the outer auto-fit grid. The media
           queries below override that with !important to
           turn each wrapper into its own 2-column grid on
           mobile — and, importantly, KEEP it that way at
           every mobile width instead of collapsing back to
           a single stacked column on small phones.
        ══════════════════════════════════════════════ */

        /* Mobile responsive */
        @media (max-width: 768px) {
          .export-inner { padding: 0 2px 16px 2px !important; }
          .export-inner > div:first-child { 
            padding-bottom: 10px !important; margin-bottom: 12px !important;
          }
          .export-inner > div:first-child h2 { font-size: 17px !important; }
          .export-inner > div:first-child p { font-size: 10.5px !important; }

          .export-form-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .export-form-grid > div:first-child { grid-column: 1 / -1 !important; }

          /* Date Range + Status Filter: always side-by-side on mobile */
          .export-date-status-row { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr !important; 
            gap: 8px !important;
            grid-column: 1 / -1 !important;
          }
          .export-date-status-row > div:first-child { grid-column: 1 / 2 !important; }
          .export-date-status-row > div:last-child { grid-column: 2 / 3 !important; }
          /* If Status Filter isn't rendered (users/dealers/revenue), let
             the lone Date Range field take the full row instead of half. */
          .export-date-status-row > div:only-child { grid-column: 1 / -1 !important; }

          /* Start Date + End Date: always side-by-side on mobile */
          .export-custom-date-row {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            grid-column: 1 / -1 !important;
          }
          .export-custom-date-row > div:first-child { grid-column: 1 / 2 !important; }
          .export-custom-date-row > div:last-child { grid-column: 2 / 3 !important; }

          .export-form-grid label { font-size: 8.5px !important; margin-bottom: 5px !important; }
          .premium-select { padding: 9px 26px 9px 10px !important; font-size: 11.5px !important; }
          .premium-date-input { padding: 8px 10px !important; font-size: 11.5px !important; }
          .premium-select-wrap::after { right: 10px !important; }

          .export-main-card { padding: 14px !important; border-radius: 14px !important; }
          .export-format-buttons { flex-wrap: wrap !important; gap: 8px !important; }
          .export-format-buttons button { flex: 1 !important; min-width: 80px !important; padding: 8px 10px !important; font-size: 11px !important; }
          .export-control-bar { 
            flex-direction: row !important; 
            align-items: center !important; 
            justify-content: space-between !important;
            padding: 12px 14px !important;
            gap: 10px !important;
          }
          .export-control-bar > div:first-child { text-align: left !important; flex: 1 !important; }
          .export-control-bar > div:first-child span:first-child { font-size: 11px !important; }
          .export-control-bar > div:first-child span:last-child { font-size: 17px !important; }
          .export-control-bar button { font-size: 11px !important; padding: 8px 14px !important; }
          .export-quick-links { 
            display: grid !important; 
            grid-template-columns: 1fr 1fr !important; 
            gap: 6px !important;
          }
          .export-quick-links button { 
            width: 100% !important; 
            justify-content: center !important; 
            padding: 8px 10px !important; 
            font-size: 10.5px !important;
          }
        }

        @media (max-width: 480px) {
          .export-inner > div:first-child h2 { font-size: 15.5px !important; }
          .export-inner > div:first-child p { font-size: 9.5px !important; }
          .export-main-card { padding: 10px !important; }

          .export-form-grid { gap: 8px !important; }

          /* Keep the 2-column side-by-side layout even on the
             smallest phones — just shrink gaps/fonts further
             instead of stacking back to a single column. */
          .export-date-status-row { gap: 6px !important; }
          .export-custom-date-row { gap: 6px !important; }

          .export-form-grid label { font-size: 8px !important; margin-bottom: 4px !important; }
          .premium-select { padding: 8px 22px 8px 8px !important; font-size: 10.5px !important; }
          .premium-date-input { padding: 7px 8px !important; font-size: 10.5px !important; }
          .premium-select-wrap::after { font-size: 7px !important; right: 8px !important; }

          .export-control-bar { 
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
            padding: 10px 12px !important;
          }
          .export-control-bar > div:first-child { text-align: center !important; }
          .export-control-bar button { width: 100% !important; justify-content: center !important; }
          .export-format-buttons button { min-width: 60px !important; padding: 7px 8px !important; font-size: 10px !important; }
          .export-quick-links { grid-template-columns: 1fr 1fr !important; gap: 4px !important; }
          .export-quick-links button { font-size: 9.5px !important; padding: 6px 8px !important; }
        }
      `}</style>

      {/* HEADER */}
      <div style={{
        paddingBottom: "16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: "20px"
      }}>
        <h2 style={{ margin: "0 0 3px 0", fontSize: "20px", color: "#fff", fontWeight: "800", letterSpacing: "-0.5px" }}>
          Data Extraction Engine
        </h2>
        <p style={{ margin: 0, color: T.textSec, fontSize: "12px" }}>
          Compile architecture states, billing sequences, and custom datasets to offline analytics frameworks
        </p>
      </div>

      {/* MAIN CARD */}
      <div className="export-main-card">
        <div className="export-form-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}>
          {/* Dataset Target */}
          <div>
            <label style={{ fontSize: "9px", color: T.purple, marginBottom: "6px", display: "block", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: "700" }}>
              Collection Dataset
            </label>
            <div className="premium-select-wrap">
              <select
                className="premium-select"
                value={exportType}
                onChange={(e) => { setExportType(e.target.value); setStatus("all"); }}
                style={{
                  width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px",
                  color: "#fff", fontSize: "12px", outline: "none", cursor: "pointer", fontFamily: "Quicksand"
                }}
              >
                <option value="bookings">Bookings</option>
                <option value="users">Users</option>
                <option value="dealers">Dealers</option>
                <option value="cars">Cars</option>
                <option value="revenue">Revenue Analytics</option>
              </select>
            </div>
          </div>

          {/* Date Range & Status Filter - always side by side, even on mobile */}
          {exportType !== "cars" && (
            <div className="export-date-status-row" style={{ display: "contents" }}>
              <div>
                <label style={{ fontSize: "9px", color: T.purple, marginBottom: "6px", display: "block", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: "700" }}>
                  Date Range
                </label>
                <div className="premium-select-wrap">
                  <select
                    className="premium-select"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px",
                      color: "#fff", fontSize: "12px", outline: "none", cursor: "pointer", fontFamily: "Quicksand"
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
              </div>

              {/* Status Filter */}
              {exportType === "bookings" && (
                <div>
                  <label style={{ fontSize: "9px", color: T.purple, marginBottom: "6px", display: "block", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: "700" }}>
                    Status Filter
                  </label>
                  <div className="premium-select-wrap">
                    <select
                      className="premium-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.2)",
                        border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px",
                        color: "#fff", fontSize: "12px", outline: "none", cursor: "pointer", fontFamily: "Quicksand"
                      }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending_approval">Pending Approval</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Date Inputs - always side by side, even on mobile */}
          {dateRange === "custom" && exportType !== "cars" && (
            <div className="export-custom-date-row" style={{ display: "contents" }}>
              <div>
                <label style={{ fontSize: "9px", color: T.textSec, marginBottom: "6px", display: "block", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: "700" }}>
                  Start Date
                </label>
                <input
                  type="date"
                  className="premium-date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: "100%", padding: "9px 12px", background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px",
                    color: "#fff", fontSize: "12px", outline: "none"
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "9px", color: T.textSec, marginBottom: "6px", display: "block", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: "700" }}>
                  End Date
                </label>
                <input
                  type="date"
                  className="premium-date-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: "100%", padding: "9px 12px", background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px",
                    color: "#fff", fontSize: "12px", outline: "none"
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Format Selection */}
        <div style={{ marginTop: "16px" }}>
          <label style={{ fontSize: "9px", color: T.purple, marginBottom: "8px", display: "block", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: "700" }}>
            Output Format
          </label>
          <div className="export-format-buttons" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {[
              { id: "csv", label: "CSV", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
              { id: "excel", label: "Excel", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg> },
              { id: "pdf", label: "PDF", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
            ].map((f) => {
              const isActive = format === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  style={{
                    flex: 1, minWidth: "120px", padding: "10px 14px",
                    background: isActive ? `${T.purple}12` : "rgba(255,255,255,0.02)",
                    border: isActive ? `1px solid ${T.purple}` : "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "8px", color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                    cursor: "pointer", fontWeight: "700", fontSize: "12px",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)", fontFamily: "Quicksand"
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                    }
                  }}
                >
                  <span style={{ color: isActive ? T.purple : "rgba(255,255,255,0.4)" }}>
                    {f.icon}
                  </span>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Control Bar - Records and Export side by side */}
        <div className="export-control-bar" style={{
          marginTop: "18px",
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: "12px"
        }}>
          <div>
            <span style={{ color: T.textSec, fontSize: "11px" }}>Records:</span>
            <span style={{ color: T.purple, fontSize: "18px", fontWeight: "800", marginLeft: "8px", fontFamily: "monospace" }}>
              {getTotalRecords()}
            </span>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || getTotalRecords() === 0}
            className="btn"
          >
            {exporting ? (
              <>
                <div style={{
                  width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.2)",
                  borderTopColor: "#fff", borderRadius: "50%", animation: "premiumSpin 0.7s linear infinite"
                }} />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Export {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Export Links - 2 columns on mobile */}
      <div style={{ marginTop: "20px" }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "800", color: "#fff", letterSpacing: "-0.2px", display: "flex", alignItems: "center", gap: "6px" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.orange} strokeWidth="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Quick Export
        </h3>
        <div className="export-quick-links" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { type: "bookings", label: "Bookings", color: T.purple, bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.25)" },
            { type: "users", label: "Users", color: T.green, bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.25)" },
            { type: "dealers", label: "Dealers", color: T.orange, bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.25)" },
            { type: "revenue", label: "Revenue", color: T.purple, bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.25)" }
          ].map((btn) => (
            <button
              key={btn.type}
              className="premium-btn-quick"
              onClick={() => {
                setExportType(btn.type);
                setDateRange("all");
                setStatus("all");
                setFormat("excel");
                setTimeout(() => handleExport(), 80);
              }}
              style={{
                padding: "8px 16px", background: btn.bg, border: `1px solid ${btn.border}`,
                borderRadius: "8px", color: btn.color, cursor: "pointer",
                fontSize: "11px", fontWeight: "700", fontFamily: "Quicksand",
                display: "flex", alignItems: "center", gap: "5px",
                transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 4px 16px ${btn.color}15`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              {btn.label} (.xlsx)
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}