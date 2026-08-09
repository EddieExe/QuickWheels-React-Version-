import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  VEHICLE_STATUS,
  bulkUpdateVehicleStatus,
  getCarStatus,
  updateVehicleStatus,
  getSuggestedTransitions,
} from "../../../utils/vehicleStatusUtils";

// ─── Status SVG Icons ─────────────────────────────────────
const STATUS_ICONS = {
  available: (color) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  reserved: (color) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  pickup_awaited: (color) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  on_trip: (color) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
      <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
    </svg>
  ),
  return_pending: (color) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
      <path d="M22 13A10 10 0 0 1 3.4 9.1M2 11a10 10 0 0 1 18.6 3.9"/>
    </svg>
  ),
  cleaning: (color) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h18"/>
    </svg>
  ),
  under_maintenance: (color) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  unavailable: (color) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    </svg>
  ),
};

// ─── Status Change Modal (portal-style, fixed position) ───
function StatusModal({ car, dealerId, onStatusChange, onClose, anchorRect }) {
  const [updating, setUpdating] = useState(null);
  const modalRef = useRef(null);
  const currentStatus = VEHICLE_STATUS[car.status] || VEHICLE_STATUS.available;
  const suggested = getSuggestedTransitions(car.status);

  const style = useMemo(() => {
    if (!anchorRect) return {};
    const MODAL_H = 380;
    const MODAL_W = Math.min(280, window.innerWidth - 16);
    const spaceBelow = window.innerHeight - anchorRect.bottom - 12;
    const top = spaceBelow >= MODAL_H
      ? anchorRect.bottom + 8
      : Math.max(8, anchorRect.top - MODAL_H - 8);
    let left = anchorRect.left;
    if (left + MODAL_W > window.innerWidth - 16) left = window.innerWidth - MODAL_W - 16;
    if (left < 8) left = 8;
    return { top, left, width: Math.min(Math.max(anchorRect.width, MODAL_W), window.innerWidth - 16) };
  }, [anchorRect]);

  useEffect(() => {
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleChange = async (newStatusId) => {
    setUpdating(newStatusId);
    const result = await updateVehicleStatus(car.id, dealerId, newStatusId, {
      reason: `Manual update to ${newStatusId}`,
    });
    if (result.success) onStatusChange?.(car.id, newStatusId);
    setUpdating(null);
    onClose();
  };

  const allStatuses = Object.values(VEHICLE_STATUS);
  const suggestedItems = allStatuses.filter(s => suggested.includes(s.id));
  const otherItems = allStatuses.filter(s => !suggested.includes(s.id) && s.id !== car.status);

  return (
    <div
      ref={modalRef}
      style={{
        position: "fixed",
        ...style,
        zIndex: 9999,
        background: "#0e0e1c",
        border: `1px solid ${currentStatus.color}40`,
        borderRadius: "16px",
        boxShadow: `0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px ${currentStatus.color}20`,
        animation: "vsb-modalIn 0.18s cubic-bezier(0.16,1,0.3,1)",
        fontFamily: "Quicksand,sans-serif",
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "12px 14px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(255,255,255,0.02)",
      }}>
        <div>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: "700", color: "#fff" }}>{car.model}</p>
          <p style={{ margin: "1px 0 0", fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>
            {car.numberPlate || "No plate"} · Change status
          </p>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "5px",
          padding: "3px 8px", borderRadius: "20px",
          background: currentStatus.bgColor, border: `1px solid ${currentStatus.borderColor}`,
        }}>
          {(STATUS_ICONS[car.status] || STATUS_ICONS.available)(currentStatus.color)}
          <span style={{ fontSize: "10px", fontWeight: "700", color: currentStatus.color }}>{currentStatus.label}</span>
        </div>
      </div>

      <div style={{ maxHeight: "320px", overflowY: "auto", padding: "8px" }}
        className="vsb-modal-scroll">

        {suggestedItems.length > 0 && (
          <>
            <p style={{ margin: "4px 6px 6px", fontSize: "9px", fontWeight: "700", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px" }}>
              ⚡ Suggested
            </p>
            {suggestedItems.map((s) => {
              const SIcon = STATUS_ICONS[s.id];
              const isLoading = updating === s.id;
              return (
                <button key={s.id}
                  onClick={() => !updating && handleChange(s.id)}
                  disabled={!!updating}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: "10px",
                    background: s.bgColor, border: `1px solid ${s.borderColor}`,
                    cursor: updating ? "wait" : "pointer",
                    display: "flex", alignItems: "center", gap: "8px",
                    marginBottom: "5px", transition: "all 0.15s ease",
                    opacity: updating && !isLoading ? 0.5 : 1,
                    fontFamily: "Quicksand,sans-serif",
                  }}
                  onMouseEnter={(e) => { if (!updating) e.currentTarget.style.filter = "brightness(1.25)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)"; }}
                >
                  {isLoading ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2.5" style={{ animation: "vsb-spin 0.8s linear infinite", flexShrink: 0 }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                  ) : SIcon && SIcon(s.color)}
                  <span style={{ fontSize: "12px", fontWeight: "700", color: s.color, flex: 1, textAlign: "left" }}>{s.label}</span>
                  {!isLoading && <span style={{ fontSize: "9px", color: "#06b6d4", fontWeight: "700", background: "rgba(6,182,212,0.12)", padding: "2px 6px", borderRadius: "4px" }}>NEXT</span>}
                </button>
              );
            })}
            {otherItems.length > 0 && (
              <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "8px 4px" }} />
            )}
          </>
        )}

        {otherItems.length > 0 && (
          <>
            <p style={{ margin: "4px 6px 6px", fontSize: "9px", fontWeight: "700", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "1px" }}>
              All Statuses
            </p>
            {otherItems.map((s) => {
              const SIcon = STATUS_ICONS[s.id];
              const isLoading = updating === s.id;
              return (
                <button key={s.id}
                  onClick={() => !updating && handleChange(s.id)}
                  disabled={!!updating}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: "10px",
                    background: "transparent", border: "1px solid transparent",
                    cursor: updating ? "wait" : "pointer",
                    display: "flex", alignItems: "center", gap: "8px",
                    marginBottom: "3px", transition: "all 0.15s ease",
                    opacity: updating && !isLoading ? 0.5 : 1,
                    fontFamily: "Quicksand,sans-serif",
                  }}
                  onMouseEnter={(e) => { if (!updating) { e.currentTarget.style.background = s.bgColor; e.currentTarget.style.borderColor = s.borderColor; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
                >
                  {isLoading ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2.5" style={{ animation: "vsb-spin 0.8s linear infinite", flexShrink: 0 }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                  ) : SIcon && SIcon(s.color)}
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "rgba(255,255,255,0.65)", flex: 1, textAlign: "left" }}>{s.label}</span>
                  <span style={{ fontSize: "9px", color: s.color, opacity: 0.7 }}>{s.description || ""}</span>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Status Card ──────────────────────────────────────────
function PremiumStatusCard({ car, dealerId, onStatusChange, isSelected, onSelect, supportsHover }) {
  const [expanded, setExpanded] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const hoverTimer = useRef(null);
  const leaveTimer = useRef(null);
  const cardRef = useRef(null);
  const btnRef = useRef(null);

  const currentStatus = VEHICLE_STATUS[car.status] || VEHICLE_STATUS.available;
  const StatusIcon = STATUS_ICONS[car.status] || STATUS_ICONS.available;

  const carImages = car.images?.length ? car.images : car.image ? [car.image] : [];
  const displayImage = carImages[0] || "/Images/placeholder-car.png";

  const openModal = useCallback((e) => {
    e?.stopPropagation();
    if (btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
    setStatusModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setStatusModalOpen(false);
    setAnchorRect(null);
  }, []);

  // Desktop: hover-to-expand
  const handleMouseEnter = () => {
    if (!supportsHover) return;
    clearTimeout(leaveTimer.current);
    hoverTimer.current = setTimeout(() => setExpanded(true), 120);
  };
  const handleMouseLeave = () => {
    if (!supportsHover) return;
    clearTimeout(hoverTimer.current);
    leaveTimer.current = setTimeout(() => {
      if (!statusModalOpen) setExpanded(false);
    }, 200);
  };

  // Mobile/touch: tap-to-expand
  const handleTapToggle = (e) => {
    if (supportsHover) return;
    e.stopPropagation();
    setExpanded((p) => !p);
  };

  // Click outside to collapse (mobile only)
  useEffect(() => {
    if (!supportsHover && expanded) {
      const handleClickOutside = (e) => {
        if (cardRef.current && !cardRef.current.contains(e.target)) {
          setExpanded(false);
        }
      };
      
      // Use both mouse and touch events
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [supportsHover, expanded]);

  useEffect(() => {
    if (statusModalOpen) setExpanded(true);
  }, [statusModalOpen]);

  useEffect(() => () => {
    clearTimeout(hoverTimer.current);
    clearTimeout(leaveTimer.current);
  }, []);

  return (
    <>
      <div
        ref={cardRef}
        className="premium-status-card"
        style={{
          position: "relative",
          borderRadius: "16px",
          border: `1px solid ${isSelected ? currentStatus.color + "60" : expanded ? currentStatus.color + "40" : "rgba(255,255,255,0.07)"}`,
          background: isSelected
            ? currentStatus.bgColor
            : expanded
              ? `linear-gradient(145deg, ${currentStatus.color}08, rgba(255,255,255,0.02))`
              : "linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))",
          transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
          transform: expanded && supportsHover ? "translateY(-2px)" : "translateY(0)",
          boxShadow: expanded && supportsHover ? `0 8px 28px rgba(0,0,0,0.3), 0 0 0 1px ${currentStatus.color}20` : "none",
          overflow: "visible",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Selection checkbox */}
        <div
          onClick={(e) => { e.stopPropagation(); onSelect(car.id); }}
          className="status-select-checkbox"
          style={{
            position: "absolute", top: "10px", left: "10px", zIndex: 10,
            width: "18px", height: "18px", borderRadius: "5px",
            background: isSelected ? currentStatus.color : "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            border: `1.5px solid ${isSelected ? currentStatus.color : "rgba(255,255,255,0.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s ease",
            opacity: expanded || isSelected || !supportsHover ? 1 : 0,
            cursor: "pointer",
          }}
        >
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>

        {/* ── Compact always-visible row — tap target on mobile ── */}
        <div
          className="status-card-compact"
          onClick={handleTapToggle}
          style={{
            display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
            cursor: supportsHover ? "default" : "pointer",
          }}
        >
          <div style={{ width: "52px", height: "40px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.04)" }}>
            <img src={displayImage} alt={car.model} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="car_model_name" style={{ margin: 0, color: "#fff", fontSize: "13px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {car.model}
            </p>
            <p className="car_number_plate" style={{ margin: "1px 0 0", color: "rgba(255,255,255,0.35)", fontSize: "10px" }}>
              {car.numberPlate || "No plate"} · {car.type || "—"}
            </p>
          </div>
          <div className="status-badge" style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "4px 9px", borderRadius: "20px", flexShrink: 0,
            background: currentStatus.bgColor, border: `1px solid ${currentStatus.borderColor}`,
          }}>
            {StatusIcon(currentStatus.color)}
            <span style={{ fontSize: "10px", fontWeight: "700", color: currentStatus.color, whiteSpace: "nowrap" }}>
              {currentStatus.label}
            </span>
          </div>
          {/* Hint arrow — hover hint on desktop, tap hint on mobile */}
          <div className="status-hint-arrow" style={{
            color: expanded ? currentStatus.color : "rgba(255,255,255,0.2)", flexShrink: 0,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "all 0.25s ease",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {/* ── Expanded panel ── */}
        <div className="status-expanded-panel" style={{
          maxHeight: expanded ? "360px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.32s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <div style={{
            borderTop: `1px solid ${currentStatus.color}20`,
            padding: "14px",
            display: "flex", flexDirection: "column", gap: "12px",
          }}>
            <div className="status-expanded-top" style={{ display: "flex", gap: "12px" }}>
              <div className="status-expanded-image" style={{ width: "110px", height: "72px", borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                <img src={displayImage} alt={car.model} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                {[
                  ["Price", `$${car.price}/day`],
                  ["Fuel", car.fuel || "—"],
                  ["Trans.", car.transmission || "—"],
                  ["Seats", car.seats ? `${car.seats}` : "—"],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px" }}>{label}</span>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "10px", fontWeight: "600" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {car.statusReason && (
              <div style={{
                padding: "6px 10px", borderRadius: "8px",
                background: currentStatus.bgColor, border: `1px solid ${currentStatus.borderColor}`,
              }}>
                <p style={{ margin: 0, fontSize: "10px", color: currentStatus.color, fontWeight: "600" }}>
                  Note: <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: "400" }}>{car.statusReason}</span>
                </p>
              </div>
            )}

            {car.lastStatusUpdate && (
              <p style={{ margin: 0, color: "rgba(255,255,255,0.2)", fontSize: "9px", textAlign: "right" }}>
                Updated: {new Date(car.lastStatusUpdate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            )}

            <button
              ref={btnRef}
              onClick={openModal}
              className="change-status-btn"
              style={{
                width: "100%", padding: "9px 14px",
                background: statusModalOpen ? currentStatus.bgColor : `linear-gradient(135deg, ${currentStatus.color}18, ${currentStatus.color}08)`,
                border: `1px solid ${statusModalOpen ? currentStatus.color + "80" : currentStatus.borderColor}`,
                borderRadius: "10px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "all 0.2s ease", fontFamily: "Quicksand,sans-serif",
                boxShadow: statusModalOpen ? `0 0 0 3px ${currentStatus.color}15` : "none",
              }}
              onMouseEnter={(e) => { if (!statusModalOpen) e.currentTarget.style.filter = "brightness(1.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)"; }}
            >
              {StatusIcon(currentStatus.color)}
              <span style={{ fontSize: "11px", fontWeight: "700", color: currentStatus.color }}>
                {statusModalOpen ? "Selecting…" : "Change Status"}
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={currentStatus.color} strokeWidth="2.5"
                style={{ transform: statusModalOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", marginLeft: "auto" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {statusModalOpen && (
        <StatusModal
          car={car}
          dealerId={dealerId}
          onStatusChange={onStatusChange}
          onClose={closeModal}
          anchorRect={anchorRect}
        />
      )}
    </>
  );
}

// ─── Main Board ───────────────────────────────────────────
export default function VehicleStatusBoard({
  cars,
  dealerId,
  onStatusChange,
  filterStatus,
  setFilterStatus,
  searchTerm,
  setSearchTerm,
}) {
  const [selectedCars, setSelectedCars] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkTarget, setBulkTarget] = useState("");
  const [supportsHover, setSupportsHover] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setSupportsHover(mq.matches);
    const handler = (e) => setSupportsHover(e.matches);
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler);
    };
  }, []);

  const carsWithStatus = useMemo(() =>
    cars.map((car) => ({ ...car, status: getCarStatus(car) })), [cars]);

  const filtered = useMemo(() => {
    let list = carsWithStatus;
    if (filterStatus) list = list.filter((c) => c.status === filterStatus);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((c) =>
        c.model?.toLowerCase().includes(s) ||
        c.numberPlate?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [carsWithStatus, filterStatus, searchTerm]);

  const handleSelect = (id) => {
    const next = new Set(selectedCars);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedCars(next);
  };

  const handleBulk = async () => {
    if (!bulkTarget || selectedCars.size === 0) return;
    setBulkUpdating(true);
    const res = await bulkUpdateVehicleStatus(
      Array.from(selectedCars), dealerId, bulkTarget, { reason: "Bulk update" }
    );
    if (res.success) { setSelectedCars(new Set()); setBulkTarget(""); onStatusChange?.(); }
    setBulkUpdating(false);
  };

  return (
    <>
      <style>{`
        @keyframes vsb-spin { to { transform: rotate(360deg); } }
        @keyframes vsb-fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes vsb-modalIn { from { opacity:0; transform:scale(0.96) translateY(-6px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .vsb-modal-scroll::-webkit-scrollbar { width: 4px; }
        .vsb-modal-scroll::-webkit-scrollbar-track { background: transparent; }
        .vsb-modal-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        .vsb-modal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }

        /* ─── Mobile Responsive Styles ─── */
        @media (max-width: 768px) {
          .vsb-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .premium-status-card {
            border-radius: 14px !important;
          }
          .status-card-compact {
            padding: 10px 12px 10px 38px !important;
            gap: 10px !important;
          }
          .status-card-compact > div:first-child {
            width: 44px !important;
            height: 34px !important;
          }                    
          .status-badge {
            padding: 3px 7px !important;
          }
          .status-badge span {
            font-size: 9px !important;
          }
          .status-badge svg {
            width: 12px !important;
            height: 12px !important;
          }
          .status-select-checkbox {
            width: 20px !important;
            height: 20px !important;
            top: 8px !important;
            left: 8px !important;
          }
          .status-expanded-panel > div {
            padding: 12px !important;
            gap: 10px !important;
          }
          .status-expanded-top {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .status-expanded-image {
            width: 100% !important;
            height: 180px !important;
          }
          .change-status-btn {
            padding: 12px 14px !important;
            font-size: 13px !important;
          }
          .change-status-btn span {
            font-size: 12px !important;
          }
          .vsb-bulk-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .vsb-bulk-bar > div:first-child {
            justify-content: center !important;
          }
          .vsb-bulk-bar > div:last-child {
            margin-left: 0 !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
          }
          .vsb-select-row {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .vsb-results-count {
            font-size: 10px !important;
          }
        }

        @media (max-width: 479px) {
          .section-header-row {
            margin: 0px !important;
          }
          .vs-container {
            padding: 0px !important;
          }
          .vehicle_status_board {
            padding: 14px !important;
          }
          .status-card-compact {
            padding: 10px 10px 10px 38px !important;
            gap: 10px !important;
          }
          .status-card-compact > div:first-child {
            width: 38px !important;
            height: 30px !important;
            border-radius: 8px !important;
          }
          .car_model_name {
            font-size: 12px !important;
          }
          .car_number_plate {
            font-size: 10px !important;
            margin-top: 3px !important;
          }
          .status-badge {
            padding: 5px !important;
          }
          .status-badge span {
            font-size: 8px !important;
          }
          .status-badge svg {
            width: 10px !important;
            height: 10px !important;
          }
          .status-expanded-panel > div {
            padding: 10px !important;
          }
          .status-expanded-image {
            height: 160px !important;
          }
          .change-status-btn {
            padding: 10px 12px !important;
            font-size: 12px !important;
          }
          .change-status-btn span {
            font-size: 11px !important;
          }
          .vsb-bulk-bar {
            padding: 10px 12px !important;
          }
          .vsb-bulk-bar select {
            font-size: 11px !important;
            padding: 6px 24px 6px 8px !important;
          }
          .vsb-bulk-bar button {
            font-size: 11px !important;
            padding: 6px 12px !important;
          }
        }
      `}</style>

      <div className="vehicle_container" style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: "Quicksand,sans-serif" }}>

        <div className="vsb-results-count" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: "600" }}>
            {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""}{filterStatus || searchTerm ? " found" : " total"}
            {filterStatus && (
              <span style={{ marginLeft: "8px", color: VEHICLE_STATUS[filterStatus]?.color, fontWeight: "700" }}>
                · {VEHICLE_STATUS[filterStatus]?.label}
              </span>
            )}
            {!supportsHover && filtered.length > 0 && (
              <span style={{ marginLeft: "8px", color: "rgba(255,255,255,0.25)" }}>· Tap a card for details</span>
            )}
          </p>
          {(filterStatus || searchTerm) && (
            <button
              onClick={() => { setFilterStatus(null); setSearchTerm(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#06b6d4", fontSize: "10px", fontWeight: "700", fontFamily: "Quicksand,sans-serif", letterSpacing: "0.5px" }}
            >
              CLEAR ALL
            </button>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="vsb-select-row" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setSelectedCars(selectedCars.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)))}
              style={{
                padding: "5px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)",
                cursor: "pointer", fontFamily: "Quicksand,sans-serif", fontSize: "11px", fontWeight: "600",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              {selectedCars.size === filtered.length ? "Deselect All" : "Select All"}
            </button>
            {selectedCars.size > 0 && (
              <span style={{ fontSize: "11px", color: "#06b6d4", fontWeight: "600" }}>
                {selectedCars.size} selected
              </span>
            )}
          </div>
        )}

        {selectedCars.size > 0 && (
          <div className="vsb-bulk-bar" style={{
            display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap",
            padding: "12px 16px", borderRadius: "12px",
            background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.2)",
            animation: "vsb-fadeIn 0.2s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "6px", background: "#06b6d4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#000", fontSize: "11px", fontWeight: "800" }}>{selectedCars.size}</span>
              </div>
              <span style={{ color: "#fff", fontSize: "13px", fontWeight: "600" }}>
                vehicle{selectedCars.size !== 1 ? "s" : ""} selected
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "auto" }}>
              <div style={{ position: "relative" }}>
                <select
                  value={bulkTarget}
                  onChange={(e) => setBulkTarget(e.target.value)}
                  style={{
                    padding: "7px 28px 7px 10px", appearance: "none",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px", color: bulkTarget ? "#fff" : "rgba(255,255,255,0.4)",
                    fontFamily: "Quicksand,sans-serif", fontSize: "12px", cursor: "pointer",
                  }}
                >
                  <option value="">Set status to…</option>
                  {Object.values(VEHICLE_STATUS).map((s) => (
                    <option key={s.id} value={s.id} style={{ background: "#0e0e1c" }}>{s.label}</option>
                  ))}
                </select>
                <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", pointerEvents: "none", fontSize: "9px" }}>▾</span>
              </div>
              <button
                onClick={handleBulk}
                disabled={!bulkTarget || bulkUpdating}
                style={{
                  padding: "7px 16px", borderRadius: "8px",
                  background: bulkTarget ? "linear-gradient(135deg,#0e7490,#06b6d4)" : "rgba(255,255,255,0.05)",
                  border: "none", color: "#fff", cursor: bulkTarget ? "pointer" : "not-allowed",
                  fontFamily: "Quicksand,sans-serif", fontSize: "12px", fontWeight: "700",
                  opacity: bulkUpdating ? 0.6 : 1, transition: "all 0.2s ease",
                  boxShadow: bulkTarget ? "0 4px 16px rgba(6,182,212,0.25)" : "none",
                }}
                onMouseEnter={(e) => { if (bulkTarget) e.currentTarget.style.boxShadow = "0 6px 22px rgba(6,182,212,0.4)"; }}
                onMouseLeave={(e) => { if (bulkTarget) e.currentTarget.style.boxShadow = "0 4px 16px rgba(6,182,212,0.25)"; }}
              >
                {bulkUpdating ? "Updating…" : "Apply"}
              </button>
              <button
                onClick={() => setSelectedCars(new Set())}
                style={{
                  padding: "7px 12px", borderRadius: "8px",
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "#ef4444", cursor: "pointer",
                  fontFamily: "Quicksand,sans-serif", fontSize: "12px", fontWeight: "700",
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: "16px" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "14px", display: "block", margin: "0 auto 14px" }}>
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
            </svg>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px", margin: 0 }}>
              {searchTerm ? `No vehicles match "${searchTerm}"` : "No vehicles in this category"}
            </p>
          </div>
        ) : (
          <div className="vsb-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
            {filtered.map((car) => (
              <PremiumStatusCard
                key={car.id}
                car={car}
                dealerId={dealerId}
                onStatusChange={onStatusChange}
                isSelected={selectedCars.has(car.id)}
                onSelect={handleSelect}
                supportsHover={supportsHover}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}