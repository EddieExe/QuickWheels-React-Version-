import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { db } from "../firebase";
import cars from "../data/cars";
import "../styles/fleet.css";

const categories = [
  "All",
  "Sedan",
  "SUV",
  "Convertible",
  "Luxury",
  "Pickup",
  "Van",
  "Hatchback",
  "Electric",
  "Sports",
];

const sortOptions = [
  { value: "default", label: "Default" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "seats", label: "Most Seats" },
];

const CAR_TYPES = [
  "Sedan",
  "SUV",
  "Convertible",
  "Luxury",
  "Pickup",
  "Van",
  "Hatchback",
  "Electric",
  "Sports",
];

function normalizeLocation(loc = "") {
  return loc.toLowerCase().replace(/\s+/g, "").trim();
}

function datesOverlap(existingPickup, existingDropoff, newPickup, newDropoff) {
  return (
    new Date(newPickup) < new Date(existingDropoff) &&
    new Date(newDropoff) > new Date(existingPickup)
  );
}

function fmtDate(d) {
  if (!d) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateShort(d) {
  if (!d) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/* ═══════════════════════════════════════════════════════════
   AVAILABILITY CALENDAR MODAL
═══════════════════════════════════════════════════════════ */
function AvailabilityCalendarModal({
  car,
  onClose,
  onSelect,
  userTripDates,
  bookingWindow,
  userPickupLocation,
  onUpdateBookingDates,
}) {
  const initialMonth = bookingWindow?.pickupDate
    ? new Date(bookingWindow.pickupDate + "T00:00:00")
    : new Date();

  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [blockedDateMap, setBlockedDateMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [isDateChangeMode, setIsDateChangeMode] = useState(false);
  const [newPickupDate, setNewPickupDate] = useState(null);
  const [newDropoffDate, setNewDropoffDate] = useState(null);
  const [selectionStep, setSelectionStep] = useState("idle");
  const [hoverDate, setHoverDate] = useState(null);

  const MAX_RENTAL_DAYS = 30;

  const lockedPickupDate = bookingWindow?.pickupDate
    ? new Date(bookingWindow.pickupDate + "T00:00:00")
    : null;
  const lockedDropoffDate = bookingWindow?.dropoffDate
    ? new Date(bookingWindow.dropoffDate + "T00:00:00")
    : null;

  useEffect(() => {
    fetchBlockedDates();
  }, [car, userPickupLocation]);

  async function fetchBlockedDates() {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "bookings"),
          where("carId", "==", car.id),
          where("status", "in", ["confirmed", "on_hold", "pending_approval"]),
        ),
      );
      const blocked = {};
      snap.docs.forEach((doc) => {
        const b = doc.data();
        if (!b.pickupDate || !b.dropoffDate) return;
        const bLoc = normalizeLocation(b.pickupLocation || b.pickup || "");
        const rLoc = normalizeLocation(userPickupLocation || "");
        if (rLoc && bLoc && bLoc !== rLoc) return;
        const start = new Date(b.pickupDate + "T00:00:00");
        const end = new Date(b.dropoffDate + "T00:00:00");
        let cur = new Date(start);
        while (cur <= end) {
          blocked[cur.toDateString()] = true;
          cur.setDate(cur.getDate() + 1);
        }
      });
      setBlockedDateMap(blocked);
    } catch (err) {
      console.error("Error fetching blocked dates:", err);
    }
    setLoading(false);
  }

  function isOriginalWindowBlocked() {
    if (!lockedPickupDate || !lockedDropoffDate) return false;
    let cur = new Date(lockedPickupDate);
    while (cur <= lockedDropoffDate) {
      if (blockedDateMap[cur.toDateString()]) return true;
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  }

  function isNewWindowBlocked() {
    if (!newPickupDate || !newDropoffDate) return false;
    let cur = new Date(newPickupDate);
    while (cur <= newDropoffDate) {
      if (blockedDateMap[cur.toDateString()]) return true;
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  }

  function isValidDropoff(date) {
    if (!newPickupDate) return false;
    if (date <= newPickupDate) return false;
    let cur = new Date(newPickupDate);
    while (cur <= date) {
      if (blockedDateMap[cur.toDateString()]) return false;
      cur.setDate(cur.getDate() + 1);
    }
    const daysDiff = Math.ceil((date - newPickupDate) / 86400000);
    return daysDiff <= MAX_RENTAL_DAYS;
  }

  function isInHoverRange(date) {
    if (!newPickupDate || !hoverDate || selectionStep !== "picking_dropoff")
      return false;
    if (hoverDate <= newPickupDate) return false;
    return date > newPickupDate && date <= hoverDate;
  }

  function isInNewRange(date) {
    if (!newPickupDate || !newDropoffDate) return false;
    return date >= newPickupDate && date <= newDropoffDate;
  }

  function getMonthDays() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = new Date(year, month, 1).getDay();
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = date.toDateString();
      const isPast = date < today;
      const isBookedByOther = !!blockedDateMap[dateStr];
      const isToday = dateStr === today.toDateString();

      let isInOriginalWindow = false;
      if (lockedPickupDate && lockedDropoffDate) {
        isInOriginalWindow =
          date >= lockedPickupDate && date <= lockedDropoffDate;
      }

      let isInUserTrip = false;
      if (userTripDates?.pickupDate && userTripDates?.dropoffDate) {
        const up = new Date(userTripDates.pickupDate + "T00:00:00");
        const ud = new Date(userTripDates.dropoffDate + "T00:00:00");
        isInUserTrip = date >= up && date <= ud;
      }

      const isNewPickup = newPickupDate?.toDateString() === dateStr;
      const isNewDropoff = newDropoffDate?.toDateString() === dateStr;
      const inNewRange = isInNewRange(date);
      const inHoverRange = isInHoverRange(date);

      let visualType = "normal";
      let isBlocked = false;

      if (isDateChangeMode) {
        if (isPast) {
          visualType = "past";
          isBlocked = true;
        } else if (isInUserTrip) {
          visualType = "userTrip";
          isBlocked = true;
        } else if (
          selectionStep === "picking_pickup" ||
          selectionStep === "idle"
        ) {
          if (isBookedByOther) {
            visualType = "booked";
            isBlocked = true;
          } else if (isNewPickup) {
            visualType = "newPickup";
            isBlocked = false;
          } else {
            visualType = "available";
            isBlocked = false;
          }
        } else if (selectionStep === "picking_dropoff") {
          if (isNewPickup) {
            visualType = "newPickup";
            isBlocked = true;
          } else if (isBookedByOther) {
            visualType = "booked";
            isBlocked = true;
          } else if (date <= newPickupDate) {
            visualType = "outside";
            isBlocked = true;
          } else if (!isValidDropoff(date)) {
            visualType = "outside";
            isBlocked = true;
          } else if (inHoverRange) {
            visualType = "hoverRange";
            isBlocked = false;
          } else {
            visualType = "dropoffOption";
            isBlocked = false;
          }
        } else if (selectionStep === "ready") {
          if (isNewPickup) visualType = "newPickup";
          else if (isNewDropoff) visualType = "newDropoff";
          else if (inNewRange) visualType = "newRange";
          else if (isBookedByOther) visualType = "booked";
          else visualType = "outside";
          isBlocked = true;
        }
      } else {
        if (isPast) {
          visualType = "past";
        } else if (isBookedByOther && isInOriginalWindow) {
          visualType = "booked";
        } else if (isInUserTrip) {
          visualType = "userTrip";
        } else if (!lockedPickupDate) {
          visualType = isBookedByOther ? "booked" : "normal";
        } else if (isInOriginalWindow) {
          visualType = "available";
        } else {
          visualType = "outside";
        }
        isBlocked = true;
      }

      days.push({
        date,
        day: i,
        isBlocked,
        isPast,
        isBookedByOther,
        isInUserTrip,
        isToday,
        isInOriginalWindow,
        inNewRange,
        isNewPickup,
        isNewDropoff,
        inHoverRange,
        visualType,
      });
    }
    return days;
  }

  function getCellStyle(day) {
    if (!day)
      return {
        background: "transparent",
        border: "none",
        opacity: 0,
        cursor: "default",
      };
    const base = { transition: "all 0.2s ease", position: "relative" };
    switch (day.visualType) {
      case "booked":
        return {
          ...base,
          background: "rgba(255,77,77,0.2)",
          border: "1px solid rgba(255,77,77,0.5)",
          color: "#ff4d4d",
          cursor: "not-allowed",
        };
      case "userTrip":
        return {
          ...base,
          background: "rgba(255,165,0,0.2)",
          border: "1px solid rgba(255,165,0,0.5)",
          color: "#ffa500",
          cursor: "not-allowed",
        };
      case "past":
        return {
          ...base,
          background: "rgba(80,80,80,0.12)",
          border: "1px solid rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.18)",
          cursor: "not-allowed",
        };
      case "outside":
        return {
          ...base,
          background: "rgba(40,40,60,0.3)",
          border: "1px solid rgba(255,255,255,0.05)",
          color: "rgba(255,255,255,0.15)",
          cursor: "not-allowed",
        };
      case "available":
        return {
          ...base,
          background: "rgba(34,197,94,0.1)",
          border: day.isToday
            ? "2px solid rgba(76,227,247,0.5)"
            : "1px solid rgba(34,197,94,0.35)",
          color: "#22c55e",
          cursor: isDateChangeMode ? "pointer" : "default",
          fontWeight: "600",
        };
      case "newPickup":
        return {
          ...base,
          background: "linear-gradient(135deg,#0400ff,#4ce3f7)",
          border: "2px solid #4ce3f7",
          color: "#fff",
          cursor: "default",
          fontWeight: "800",
          fontSize: "0.88rem",
          boxShadow: "0 0 16px rgba(76,227,247,0.4)",
          borderRadius: "8px 4px 4px 8px",
        };
      case "newDropoff":
        return {
          ...base,
          background: "linear-gradient(135deg,#4ce3f7,#0400ff)",
          border: "2px solid #4ce3f7",
          color: "#fff",
          cursor: "default",
          fontWeight: "800",
          fontSize: "0.88rem",
          boxShadow: "0 0 16px rgba(76,227,247,0.4)",
          borderRadius: "4px 8px 8px 4px",
        };
      case "newRange":
        return {
          ...base,
          background: "rgba(76,227,247,0.18)",
          border: "1px solid rgba(76,227,247,0.4)",
          color: "#4ce3f7",
          cursor: "default",
          fontWeight: "700",
          borderRadius: "4px",
        };
      case "hoverRange":
        return {
          ...base,
          background: "rgba(76,227,247,0.12)",
          border: "1px dashed rgba(76,227,247,0.45)",
          color: "rgba(76,227,247,0.8)",
          cursor: "pointer",
          fontWeight: "500",
          borderRadius: "4px",
        };
      case "dropoffOption":
        return {
          ...base,
          background: "rgba(76,227,247,0.05)",
          border: "1px solid rgba(76,227,247,0.2)",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
        };
      default:
        return {
          ...base,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.2)",
          cursor: "not-allowed",
        };
    }
  }

  function getCellTooltip(day) {
    if (!day) return "";
    const t = {
      booked: `Booked at ${userPickupLocation}`,
      userTrip: "Your existing trip",
      past: "Past date",
      outside: selectionStep === "picking_dropoff" ? "Can't drop off here" : "",
      available: isDateChangeMode
        ? "Click to select as pickup"
        : "Available ✅",
      newPickup: "📍 New pickup date",
      newDropoff: "📍 New drop-off date",
      newRange: "Your new booking range",
      hoverRange: "Will be included in your booking",
      dropoffOption: "Click to set as drop-off",
    };
    return t[day.visualType] || "";
  }

  function changeMonth(delta) {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1),
    );
  }

  function handleDateClick(dayObj) {
    if (!dayObj || dayObj.isBlocked || !isDateChangeMode) return;
    if (selectionStep === "picking_pickup" || selectionStep === "idle") {
      setNewPickupDate(dayObj.date);
      setNewDropoffDate(null);
      setHoverDate(null);
      setSelectionStep("picking_dropoff");
    } else if (selectionStep === "picking_dropoff") {
      if (dayObj.date <= newPickupDate) return;
      setNewDropoffDate(dayObj.date);
      setHoverDate(null);
      setSelectionStep("ready");
    }
  }

  function handleCellHover(dayObj) {
    if (!dayObj || !isDateChangeMode || selectionStep !== "picking_dropoff")
      return;
    if (dayObj.date <= newPickupDate || dayObj.isBlocked) {
      setHoverDate(null);
      return;
    }
    if (isValidDropoff(dayObj.date)) setHoverDate(dayObj.date);
    else setHoverDate(null);
  }

  function enterDateChangeMode() {
    setIsDateChangeMode(true);
    setNewPickupDate(null);
    setNewDropoffDate(null);
    setHoverDate(null);
    setSelectionStep("picking_pickup");
  }

  function cancelDateChange() {
    setIsDateChangeMode(false);
    setNewPickupDate(null);
    setNewDropoffDate(null);
    setHoverDate(null);
    setSelectionStep("idle");
  }

  function confirmNewDates() {
    if (!newPickupDate || !newDropoffDate) return;
    const pickupStr = newPickupDate.toISOString().split("T")[0];
    const dropoffStr = newDropoffDate.toISOString().split("T")[0];
    const daysDiff = Math.ceil((newDropoffDate - newPickupDate) / 86400000);
    const raw = localStorage.getItem("bookingData");
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.pickupDate = pickupStr;
      parsed.dropoffDate = dropoffStr;
      parsed.days = daysDiff;
      localStorage.setItem("bookingData", JSON.stringify(parsed));
    }
    onUpdateBookingDates(pickupStr, dropoffStr, daysDiff);
    setIsDateChangeMode(false);
    setSelectionStep("idle");
  }

  const originalBlocked = !loading && isOriginalWindowBlocked();
  const newWindowBlocked = !loading && isNewWindowBlocked();
  const hasBookingWindow = !!lockedPickupDate && !!lockedDropoffDate;
  const newDaysCount =
    newPickupDate && newDropoffDate
      ? Math.ceil((newDropoffDate - newPickupDate) / 86400000)
      : 0;

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.9)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#12122a 0%,#0a0a1a 100%)",
          border: "1px solid rgba(76,227,247,0.25)",
          borderRadius: "24px",
          maxWidth: "580px",
          width: "100%",
          maxHeight: "95vh",
          overflowY: "auto",
          fontFamily: "Quicksand,sans-serif",
          boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 22px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background:
              "linear-gradient(135deg,rgba(4,0,255,0.06),rgba(76,227,247,0.03))",
            borderRadius: "24px 24px 0 0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h2 style={{ margin: 0, color: "#4ce3f7", fontSize: "1.25rem" }}>
                📅 {car.model}
              </h2>
              <p
                style={{
                  margin: "3px 0 0",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "0.78rem",
                }}
              >
                {car.price} USD/day · {car.seats} seats · {car.transmission}
              </p>
              {userPickupLocation && (
                <p
                  style={{
                    margin: "3px 0 0",
                    color: "rgba(76,227,247,0.6)",
                    fontSize: "0.75rem",
                  }}
                >
                  📍 {userPickupLocation}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                cursor: "pointer",
                color: "#fff",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {isDateChangeMode && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px 14px",
                background:
                  selectionStep === "ready"
                    ? "rgba(34,197,94,0.08)"
                    : "rgba(76,227,247,0.06)",
                border: `1px solid ${selectionStep === "ready" ? "rgba(34,197,94,0.3)" : "rgba(76,227,247,0.2)"}`,
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                {["Pickup Date", "Drop-off Date", "Confirm"].map(
                  (step, idx) => {
                    const stepNum = idx + 1;
                    const current =
                      (stepNum === 1 &&
                        (selectionStep === "picking_pickup" ||
                          selectionStep === "idle")) ||
                      (stepNum === 2 && selectionStep === "picking_dropoff") ||
                      (stepNum === 3 && selectionStep === "ready");
                    const done =
                      (stepNum === 1 &&
                        selectionStep !== "picking_pickup" &&
                        selectionStep !== "idle") ||
                      (stepNum === 2 && selectionStep === "ready");
                    return (
                      <div
                        key={step}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <div
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: "800",
                            background: done
                              ? "#22c55e"
                              : current
                                ? "#4ce3f7"
                                : "rgba(255,255,255,0.1)",
                            color:
                              done || current
                                ? "#000"
                                : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {done ? "✓" : stepNum}
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: current ? "700" : "400",
                            color: current ? "#fff" : "rgba(255,255,255,0.35)",
                          }}
                        >
                          {step}
                        </span>
                        {idx < 2 && (
                          <span
                            style={{
                              color: "rgba(255,255,255,0.15)",
                              margin: "0 2px",
                            }}
                          >
                            ›
                          </span>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
              {selectionStep === "picking_pickup" && (
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "12px",
                  }}
                >
                  👆 Tap an{" "}
                  <strong style={{ color: "#22c55e" }}>
                    available (green)
                  </strong>{" "}
                  date as your new pickup
                </p>
              )}
              {selectionStep === "picking_dropoff" && (
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "12px",
                  }}
                >
                  Pickup:{" "}
                  <strong style={{ color: "#4ce3f7" }}>
                    {fmtDate(newPickupDate)}
                  </strong>{" "}
                  — now hover & tap to set drop-off
                </p>
              )}
              {selectionStep === "ready" && (
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#22c55e",
                      fontWeight: "700",
                      fontSize: "13px",
                    }}
                  >
                    ✅ {fmtDateShort(newPickupDate)} →{" "}
                    {fmtDateShort(newDropoffDate)} · {newDaysCount} day
                    {newDaysCount > 1 ? "s" : ""}
                  </p>
                  {newWindowBlocked && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "#ff4d4d",
                        fontSize: "11px",
                      }}
                    >
                      ⚠️ Conflict detected in selected range
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {!isDateChangeMode && hasBookingWindow && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                background: originalBlocked
                  ? "rgba(255,77,77,0.08)"
                  : "rgba(34,197,94,0.08)",
                border: `1px solid ${originalBlocked ? "rgba(255,77,77,0.3)" : "rgba(34,197,94,0.3)"}`,
                borderRadius: "10px",
                fontSize: "12px",
              }}
            >
              <span
                style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}
              >
                {originalBlocked ? "🚫" : "✅"} {bookingWindow.pickupDate} →{" "}
                {bookingWindow.dropoffDate}
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.45)",
                  marginLeft: "8px",
                  fontSize: "11px",
                }}
              >
                {originalBlocked
                  ? "Car booked on these dates. Pick alternate dates below."
                  : "Car is free for your entire trip!"}
              </span>
            </div>
          )}
          {!hasBookingWindow && !isDateChangeMode && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                background: "rgba(255,165,0,0.06)",
                border: "1px solid rgba(255,165,0,0.2)",
                borderRadius: "10px",
                fontSize: "12px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              ℹ️ No trip dates set. Go to booking form first.
            </div>
          )}
        </div>

        {/* Calendar body */}
        <div style={{ padding: "18px 22px" }}>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              ⏳ Loading...
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <button onClick={() => changeMonth(-1)} style={monthBtnStyle}>
                  ‹ Prev
                </button>
                <h3
                  style={{
                    margin: 0,
                    color: "#fff",
                    fontSize: "1.05rem",
                    fontWeight: "700",
                  }}
                >
                  {monthNames[currentMonth.getMonth()]}{" "}
                  {currentMonth.getFullYear()}
                </h3>
                <button onClick={() => changeMonth(1)} style={monthBtnStyle}>
                  Next ›
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "8px",
                  marginBottom: "14px",
                  padding: "8px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "8px",
                  fontSize: "10px",
                }}
              >
                {(isDateChangeMode
                  ? [
                      {
                        bg: "rgba(34,197,94,0.15)",
                        bd: "1px solid #22c55e",
                        l: "Available",
                      },
                      {
                        bg: "rgba(255,77,77,0.15)",
                        bd: "1px solid #ff4d4d",
                        l: "Booked",
                      },
                      {
                        bg: "linear-gradient(135deg,#0400ff,#4ce3f7)",
                        bd: "2px solid #4ce3f7",
                        l: "Pickup",
                      },
                      {
                        bg: "linear-gradient(135deg,#4ce3f7,#0400ff)",
                        bd: "2px solid #4ce3f7",
                        l: "Dropoff",
                      },
                      {
                        bg: "rgba(76,227,247,0.18)",
                        bd: "1px solid rgba(76,227,247,0.4)",
                        l: "Selected Range",
                      },
                    ]
                  : [
                      {
                        bg: "rgba(34,197,94,0.15)",
                        bd: "1px solid #22c55e",
                        l: "Free",
                      },
                      {
                        bg: "rgba(255,77,77,0.15)",
                        bd: "1px solid #ff4d4d",
                        l: "Booked",
                      },
                      {
                        bg: "rgba(40,40,60,0.3)",
                        bd: "1px solid rgba(255,255,255,0.06)",
                        l: "Outside",
                      },
                    ]
                ).map(({ bg, bd, l }) => (
                  <div
                    key={l}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        background: bg,
                        border: bd,
                        borderRadius: "3px",
                      }}
                    />
                    <span style={{ color: "rgba(255,255,255,0.55)" }}>{l}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7,1fr)",
                  gap: "3px",
                  marginBottom: "3px",
                }}
              >
                {weekDays.map((d) => (
                  <div
                    key={d}
                    style={{
                      textAlign: "center",
                      padding: "5px 0",
                      color: "#4ce3f7",
                      fontWeight: "700",
                      fontSize: "0.72rem",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7,1fr)",
                  gap: "3px",
                }}
              >
                {getMonthDays().map((day, idx) => {
                  const cs = getCellStyle(day);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleDateClick(day)}
                      onMouseEnter={() => handleCellHover(day)}
                      onMouseLeave={() => {
                        if (selectionStep === "picking_dropoff")
                          setHoverDate(null);
                      }}
                      title={getCellTooltip(day)}
                      style={{
                        aspectRatio: "1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        userSelect: "none",
                        ...cs,
                      }}
                    >
                      {day?.day || ""}
                    </div>
                  );
                })}
              </div>

              {selectionStep === "picking_dropoff" && hoverDate && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "8px 14px",
                    background: "rgba(76,227,247,0.08)",
                    border: "1px solid rgba(76,227,247,0.2)",
                    borderRadius: "8px",
                    textAlign: "center",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {fmtDateShort(newPickupDate)} → {fmtDateShort(hoverDate)} ·{" "}
                  <strong style={{ color: "#4ce3f7" }}>
                    {Math.ceil((hoverDate - newPickupDate) / 86400000)} day
                    {Math.ceil((hoverDate - newPickupDate) / 86400000) > 1
                      ? "s"
                      : ""}
                  </strong>
                </div>
              )}

              {!isDateChangeMode && originalBlocked && hasBookingWindow && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "14px",
                    background:
                      "linear-gradient(135deg,rgba(4,0,255,0.06),rgba(76,227,247,0.04))",
                    border: "1px solid rgba(76,227,247,0.2)",
                    borderRadius: "14px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 10px",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: "13px",
                    }}
                  >
                    Still want this car? Choose alternative dates:
                  </p>
                  <button
                    onClick={enterDateChangeMode}
                    style={{
                      background: "linear-gradient(30deg,#0400ff,#4ce3f7)",
                      border: "none",
                      borderRadius: "10px",
                      color: "#fff",
                      padding: "10px 24px",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontFamily: "Quicksand,sans-serif",
                      fontSize: "13px",
                      boxShadow: "0 4px 20px rgba(76,227,247,0.3)",
                    }}
                  >
                    📅 Choose Different Dates
                  </button>
                </div>
              )}

              {!isDateChangeMode && !originalBlocked && hasBookingWindow && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "10px",
                    background: "rgba(34,197,94,0.06)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: "10px",
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.5)",
                    textAlign: "center",
                  }}
                >
                  ✅ Car is free for your dates. Click "Book This Car" below.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 22px 16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          {isDateChangeMode ? (
            <>
              <button onClick={cancelDateChange} style={footerBtnSec}>
                ← Back
              </button>
              {(selectionStep === "picking_dropoff" ||
                selectionStep === "ready") && (
                <button
                  onClick={() => {
                    setNewPickupDate(null);
                    setNewDropoffDate(null);
                    setHoverDate(null);
                    setSelectionStep("picking_pickup");
                  }}
                  style={footerBtnSec}
                >
                  ↻ Reset
                </button>
              )}
              {selectionStep === "ready" && (
                <button
                  onClick={confirmNewDates}
                  disabled={newWindowBlocked}
                  style={{
                    padding: "10px 20px",
                    background: newWindowBlocked
                      ? "rgba(255,255,255,0.06)"
                      : "linear-gradient(30deg,#0400ff,#4ce3f7)",
                    border: "none",
                    borderRadius: "10px",
                    color: newWindowBlocked ? "rgba(255,255,255,0.25)" : "#fff",
                    cursor: newWindowBlocked ? "not-allowed" : "pointer",
                    fontFamily: "Quicksand,sans-serif",
                    fontWeight: "700",
                    boxShadow: newWindowBlocked
                      ? "none"
                      : "0 4px 16px rgba(76,227,247,0.25)",
                  }}
                >
                  {newWindowBlocked
                    ? "🚫 Dates Conflicting"
                    : `✅ Proceed · ${newDaysCount} Day${newDaysCount > 1 ? "s" : ""}`}
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={onClose} style={footerBtnSec}>
                Close
              </button>
              {hasBookingWindow && !loading && !originalBlocked && (
                <button
                  onClick={() => onSelect(car)}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(30deg,#0400ff,#4ce3f7)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    cursor: "pointer",
                    fontFamily: "Quicksand,sans-serif",
                    fontWeight: "700",
                    boxShadow: "0 4px 16px rgba(76,227,247,0.25)",
                  }}
                >
                  ✅ Book This Car
                </button>
              )}
              {!hasBookingWindow && (
                <button
                  onClick={onClose}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(30deg,#0400ff,#4ce3f7)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    cursor: "pointer",
                    fontFamily: "Quicksand,sans-serif",
                    fontWeight: "700",
                  }}
                >
                  Set Trip Dates First
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const monthBtnStyle = {
  background: "rgba(76,227,247,0.06)",
  border: "1px solid rgba(76,227,247,0.2)",
  borderRadius: "8px",
  padding: "6px 14px",
  cursor: "pointer",
  color: "#4ce3f7",
  fontFamily: "Quicksand,sans-serif",
  fontWeight: "600",
  fontSize: "0.82rem",
};
const footerBtnSec = {
  padding: "10px 18px",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "10px",
  color: "#fff",
  cursor: "pointer",
  fontFamily: "Quicksand,sans-serif",
  fontWeight: "600",
};

/* ═══════════════════════════════════════════════════════════
   VALIDATION MODAL
═══════════════════════════════════════════════════════════ */
function ValidationModal({ onClose, onGoToBooking }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(255,77,77,0.4)",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "420px",
          width: "90%",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚗</div>
        <h2 style={{ color: "#fff", marginBottom: "12px" }}>
          Complete Booking Details First
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            marginBottom: "24px",
            lineHeight: "1.6",
          }}
        >
          Please fill in your pickup location, drop-off location and travel
          dates before selecting a vehicle.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={onGoToBooking}
            style={{
              background: "linear-gradient(30deg,#0400ff,#4ce3f7)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              padding: "12px 24px",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: "Quicksand,sans-serif",
            }}
          >
            Fill Booking Form
          </button>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "10px",
              color: "#fff",
              padding: "12px 24px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Quicksand,sans-serif",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DEALER SHOWROOM CARD
═══════════════════════════════════════════════════════════ */
function DealerShowroomCard({ dealer, carCount, onEnter }) {
  return (
    <div
      onClick={onEnter}
      style={{
        background:
          "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(76,227,247,0.04))",
        border: "1px solid rgba(76,227,247,0.2)",
        borderRadius: "20px",
        padding: "22px",
        cursor: "pointer",
        transition: "all 0.25s",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Quicksand,sans-serif",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 16px 48px rgba(76,227,247,0.12)";
        e.currentTarget.style.borderColor = "rgba(76,227,247,0.45)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "rgba(76,227,247,0.2)";
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(76,227,247,0.08),transparent)",
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            flexShrink: 0,
            background: "linear-gradient(135deg,#0400ff,#4ce3f7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            color: "#fff",
            fontWeight: "900",
            boxShadow: "0 4px 16px rgba(4,0,255,0.25)",
          }}
        >
          {dealer.businessName?.[0]?.toUpperCase() || "D"}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "5px",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#f1f5f9",
                fontWeight: "800",
                fontSize: "15px",
              }}
            >
              {dealer.businessName}
            </h3>
            <span
              style={{
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: "20px",
                padding: "2px 8px",
                color: "#22c55e",
                fontSize: "10px",
                fontWeight: "700",
              }}
            >
              ✅ Verified
            </span>
          </div>
          <p
            style={{
              margin: "0 0 3px",
              color: "rgba(241,245,249,0.45)",
              fontSize: "12px",
            }}
          >
            📍 {dealer.businessAddress || dealer.city}
            {dealer.state ? `, ${dealer.state}` : ""}
          </p>
          {dealer.phone && (
            <p
              style={{
                margin: "0 0 10px",
                color: "rgba(241,245,249,0.35)",
                fontSize: "12px",
              }}
            >
              📞 {dealer.phone}
            </p>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                background: "rgba(76,227,247,0.1)",
                border: "1px solid rgba(76,227,247,0.22)",
                borderRadius: "20px",
                padding: "3px 12px",
                color: "#4ce3f7",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              🚗 {carCount} cars available
            </span>
            {dealer.rating > 0 && (
              <span
                style={{
                  color: "#fbbf24",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                ⭐ {dealer.rating.toFixed(1)}
              </span>
            )}
          </div>
          {dealer.description && (
            <p
              style={{
                margin: "8px 0 0",
                color: "rgba(241,245,249,0.3)",
                fontSize: "12px",
                lineHeight: "1.5",
                fontStyle: "italic",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              "{dealer.description}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAR CARD
═══════════════════════════════════════════════════════════ */
function CarCard({
  car,
  onSelect,
  onViewAvailability,
  isUnavailable,
  unavailableUntil,
  userOverlapDetails,
  formatPrice,
  isCurrentlyBooked,
  dealerName,
}) {
  return (
    <div
      className="fleet_card"
      style={{
        opacity: isUnavailable && !isCurrentlyBooked ? 0.72 : 1,
        position: "relative",
        border: isCurrentlyBooked
          ? "2px solid rgba(76,227,247,0.5)"
          : undefined,
        boxShadow: isCurrentlyBooked
          ? "0 0 24px rgba(76,227,247,0.15)"
          : undefined,
      }}
    >
      {isCurrentlyBooked && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "linear-gradient(135deg,#0400ff,#4ce3f7)",
            color: "#fff",
            padding: "4px 14px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "700",
            zIndex: 2,
            boxShadow: "0 4px 12px rgba(76,227,247,0.3)",
          }}
        >
          ✅ Your Selection
        </div>
      )}
      {dealerName && !isCurrentlyBooked && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            color: "#4ce3f7",
            padding: "2px 8px",
            borderRadius: "16px",
            fontSize: "10px",
            fontWeight: "600",
            zIndex: 2,
            border: "1px solid rgba(76,227,247,0.3)",
          }}
        >
          🏢 {dealerName}
        </div>
      )}
      {isUnavailable && !userOverlapDetails && !isCurrentlyBooked && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "rgba(255,77,77,0.92)",
            color: "#fff",
            padding: "4px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "700",
            zIndex: 2,
          }}
        >
          🚫 Unavailable Here
        </div>
      )}
      <img className="fleet_card_image" src={car.image} alt={car.model} />
      <div className="fleet_card_info">
        {/* Phase 2: Safety Rating Stars */}
        {
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginBottom: "8px",
              padding: "4px 8px",
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
              borderRadius: "8px",
              width: "fit-content",
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                style={{
                  fontSize: "14px",
                  color:
                    star <= (car.safetyRating || 0)
                      ? "#fbbf24"
                      : "rgba(255,255,255,0.2)",
                  filter:
                    star <= (car.safetyRating || 0)
                      ? "drop-shadow(0 0 3px rgba(251,191,36,0.5))"
                      : "none",
                }}
              >
                ★
              </span>
            ))}
            <span
              style={{
                marginLeft: "4px",
                color: "rgba(255,255,255,0.5)",
                fontSize: "11px",
                fontWeight: "700",
              }}
            >
              {(car.safetyRating || 0) > 0
                ? `${car.safetyRating}/5`
                : "No ratings yet"}
            </span>
          </div>
        }

        <h3 className="fleet_card_model">{car.model}</h3>

        {/* Phase 2: Number Plate */}
        {car.numberPlate && (
          <div
            style={{
              padding: "3px 8px",
              marginBottom: "6px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "6px",
              fontSize: "11px",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "monospace",
              fontWeight: "600",
              letterSpacing: "0.5px",
            }}
          >
            🚘 {car.numberPlate}
          </div>
        )}

        <div className="fleet_card_specs">
          {[
            {
              icon: "/Images/people.png",
              alt: "Seats",
              text: `${car.seats} Seats`,
            },
            { icon: "/Images/travel-luggage.png", alt: "Bags", text: car.bags },
            {
              icon: "/Images/transmission.png",
              alt: "Transmission",
              text: car.transmission,
            },
            { icon: "/Images/fuel.png", alt: "Range", text: car.range },
          ].map(({ icon, alt, text }) => (
            <div key={alt} className="fleet_spec_item">
              <img className="fleet_spec_icon" src={icon} alt={alt} />
              <span className="fleet_spec_text">{text}</span>
            </div>
          ))}
        </div>

        {/* Phase 2: Additional Info Badges */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            marginBottom: "8px",
            marginTop: "4px",
          }}
        >
          {car.emergencyKit && (
            <span
              style={{
                padding: "2px 8px",
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: "12px",
                fontSize: "10px",
                fontWeight: "600",
                color: "#22c55e",
              }}
            >
              🩹 Emergency Kit
            </span>
          )}
          {car.gpsAvailable && (
            <span
              style={{
                padding: "2px 8px",
                background: "rgba(76,227,247,0.1)",
                border: "1px solid rgba(76,227,247,0.25)",
                borderRadius: "12px",
                fontSize: "10px",
                fontWeight: "600",
                color: "#4ce3f7",
              }}
            >
              🛰️ GPS
            </span>
          )}
          {car.lastServiceDate && (
            <span
              style={{
                padding: "2px 8px",
                background: "rgba(168,85,247,0.1)",
                border: "1px solid rgba(168,85,247,0.25)",
                borderRadius: "12px",
                fontSize: "10px",
                fontWeight: "600",
                color: "#a855f7",
              }}
            >
              🔧 Serviced:{" "}
              {new Date(car.lastServiceDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
          {car.pucCertificate && (
            <span
              style={{
                padding: "2px 8px",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "12px",
                fontSize: "10px",
                fontWeight: "600",
                color: "#22c55e",
              }}
            >
              ✅ PUC:{" "}
              {new Date(car.pucCertificate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        <p className="fleet_card_cost">
          {formatPrice(car.price)}{" "}
          <span style={{ fontSize: "12px" }}>/ day</span>
        </p>
        <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
          <button
            className="fleet_book_btn btn"
            onClick={() => onViewAvailability(car)}
            style={{
              background: "rgba(76,227,247,0.1)",
              border: "1px solid rgba(76,227,247,0.3)",
            }}
          >
            📅 View Availability
          </button>
          {isCurrentlyBooked ? (
            <button
              className="fleet_book_btn btn"
              onClick={() => onSelect(car)}
              style={{
                background: "linear-gradient(30deg,#0400ff,#4ce3f7)",
                border: "none",
                color: "#fff",
                fontWeight: "700",
                boxShadow: "0 4px 16px rgba(76,227,247,0.25)",
              }}
            >
              Continue with This Car
            </button>
          ) : isUnavailable ? (
            <div style={{ textAlign: "center" }}>
              <button
                className="fleet_book_btn btn"
                disabled
                style={{
                  opacity: 0.5,
                  cursor: "not-allowed",
                  background: userOverlapDetails
                    ? "rgba(255,165,0,0.2)"
                    : "rgba(255,77,77,0.2)",
                  border: userOverlapDetails
                    ? "1px solid rgba(255,165,0,0.4)"
                    : "1px solid rgba(255,77,77,0.4)",
                  color: userOverlapDetails ? "#ffa500" : "#ff4d4d",
                }}
              >
                {userOverlapDetails
                  ? "⚠️ Trip Conflict"
                  : "🚫 Unavailable Here"}
              </button>
              {unavailableUntil && !userOverlapDetails && (
                <p
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.3)",
                    marginTop: "6px",
                  }}
                >
                  Available from{" "}
                  {new Date(unavailableUntil).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          ) : (
            <button
              className="fleet_book_btn btn"
              onClick={() => onSelect(car)}
            >
              Book Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLEET PAGE
═══════════════════════════════════════════════════════════ */
function Fleet() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [showModal, setShowModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedCarForCalendar, setSelectedCarForCalendar] = useState(null);
  const [bookingSummary, setBookingSummary] = useState(null);
  const [unavailableCarIds, setUnavailableCarIds] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [userOverlappingBookings, setUserOverlappingBookings] = useState({});
  const [currentlyBookedCarId, setCurrentlyBookedCarId] = useState(null);
  const [dealerCars, setDealerCars] = useState([]);
  const [dealerCarsLoading, setDealerCarsLoading] = useState(true);
  const [dealersMap, setDealersMap] = useState({});
  const [selectedDealer, setSelectedDealer] = useState(null);

  // ── Load booking data & currently selected car ─────────────
  useEffect(() => {
    const raw = localStorage.getItem("bookingData");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(parsed.pickupDate) < today) {
          localStorage.removeItem("bookingData");
          setBookingSummary(null);
        } else {
          setBookingSummary(parsed);
        }
      } catch {
        localStorage.removeItem("bookingData");
      }
    }
    const selectedCar = localStorage.getItem("selectedCar");
    if (selectedCar) {
      try {
        setCurrentlyBookedCarId(JSON.parse(selectedCar).id);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // ── User existing booking conflicts ────────────────────────
  useEffect(() => {
    if (!user || !bookingSummary?.pickupDate) return;
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "bookings"),
            where("userId", "==", user.uid),
            where("status", "in", ["confirmed", "on_hold", "pending_approval"]),
          ),
        );
        const np = new Date(bookingSummary.pickupDate + "T00:00:00");
        const nd = new Date(bookingSummary.dropoffDate + "T00:00:00");
        const overlapping = {};
        snap.forEach((doc) => {
          const b = doc.data();
          if (!b.pickupDate || !b.dropoffDate) return;
          const ep = new Date(b.pickupDate + "T00:00:00");
          const ed = new Date(b.dropoffDate + "T00:00:00");
          if (np < ed && nd > ep) {
            overlapping.allCars = true;
            overlapping.details = {
              pickupDate: b.pickupDate,
              dropoffDate: b.dropoffDate,
              carModel: b.carModel,
              pickup: b.pickup || b.pickupLocation || "Unknown",
              dropoff: b.dropoff || "Unknown",
              days: b.days || Math.ceil((ed - ep) / 86400000),
              tripType: b.tripType || "—",
              bookingId: b.bookingId || "—",
              status: b.status || "confirmed",
            };
          }
        });
        setUserOverlappingBookings(overlapping);
      } catch (err) {
        console.error("Error:", err);
      }
    })();
  }, [user, bookingSummary?.pickupDate, bookingSummary?.dropoffDate]);

  // ── Fetch approved dealers and their cars ───────────────────
  useEffect(() => {
    async function fetchDealersAndCars() {
      setDealerCarsLoading(true);
      try {
        const dealersSnap = await getDocs(
          query(collection(db, "dealers"), where("status", "==", "approved")),
        );
        const dealers = {};
        const allDealerCars = [];
        for (const dealerDoc of dealersSnap.docs) {
          const dealer = { id: dealerDoc.id, ...dealerDoc.data() };
          dealers[dealer.id] = dealer;
          const carsSnap = await getDocs(
            collection(db, "dealers", dealer.id, "cars"),
          );
          carsSnap.docs.forEach((carDoc) => {
            const car = {
              id: carDoc.id,
              ...carDoc.data(),
              dealerId: dealer.id,
            };
            console.log(`🚗 Car: ${car.model}`, {
              safetyRating: car.safetyRating,
              numberPlate: car.numberPlate,
              emergencyKit: car.emergencyKit,
              gpsAvailable: car.gpsAvailable,
              allData: car,
            });
            if (car.isAvailable !== false) allDealerCars.push(car);
          });
        }
        setDealersMap(dealers);
        setDealerCars(allDealerCars);
      } catch (err) {
        console.error("Error fetching dealer cars:", err);
      } finally {
        setDealerCarsLoading(false);
      }
    }
    fetchDealersAndCars();
  }, []);

  // ── Fetch car availability ──────────────────────────────────
  useEffect(() => {
    if (!bookingSummary?.pickupDate || !bookingSummary?.dropoffDate) return;
    fetchAvailability(
      bookingSummary.pickupDate,
      bookingSummary.dropoffDate,
      bookingSummary.pickup,
    );
  }, [bookingSummary]);

  async function fetchAvailability(pickupDate, dropoffDate, pickupLocation) {
    setAvailabilityLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "bookings"),
          where("status", "in", ["confirmed", "on_hold", "pending_approval"]),
        ),
      );
      const uLoc = normalizeLocation(pickupLocation || "");
      const unavailable = {};
      snap.docs.forEach((d) => {
        const b = d.data();
        if (!b.carId || !b.pickupDate || !b.dropoffDate) return;
        const bLoc = normalizeLocation(b.pickupLocation || b.pickup || "");
        if (uLoc && bLoc && bLoc !== uLoc) return;
        if (
          datesOverlap(b.pickupDate, b.dropoffDate, pickupDate, dropoffDate)
        ) {
          const existing = unavailable[b.carId];
          if (!existing || new Date(b.dropoffDate) > new Date(existing))
            unavailable[b.carId] = b.dropoffDate;
        }
      });
      setUnavailableCarIds(unavailable);
    } catch (err) {
      console.error("Availability failed:", err);
    }
    setAvailabilityLoading(false);
  }

  function isBookingComplete() {
    const raw = localStorage.getItem("bookingData");
    if (!raw) return false;
    try {
      const { pickup, dropoff, pickupDate, dropoffDate } = JSON.parse(raw);
      if (!pickup || !dropoff || !pickupDate || !dropoffDate) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(pickupDate) < today) return false;
      if (new Date(dropoffDate) <= new Date(pickupDate)) return false;
      return true;
    } catch {
      return false;
    }
  }

  function handleSelectCar(car) {
    if (!isBookingComplete()) {
      setShowModal(true);
      return;
    }
    localStorage.setItem("selectedCar", JSON.stringify(car));
    setCurrentlyBookedCarId(car.id);
    setShowCalendarModal(false);
    setSelectedCarForCalendar(null);
    navigate("/addons");
  }

  function handleViewAvailability(car) {
    setSelectedCarForCalendar(car);
    setShowCalendarModal(true);
  }

  function handleGoToBooking() {
    setShowModal(false);
    navigate("/booking");
  }

  function handleUpdateBookingDates(newPickup, newDropoff, newDays) {
    const raw = localStorage.getItem("bookingData");
    if (raw) setBookingSummary({ ...JSON.parse(raw) });
    setShowCalendarModal(false);
    if (selectedCarForCalendar) {
      localStorage.setItem(
        "selectedCar",
        JSON.stringify(selectedCarForCalendar),
      );
      setCurrentlyBookedCarId(selectedCarForCalendar.id);
      setSelectedCarForCalendar(null);
      navigate("/addons");
    }
  }

  // ── Dealers matching pickup location ───────────────────────
  const matchingDealers = useMemo(() => {
    const allDealers = Object.values(dealersMap);
    if (!bookingSummary?.pickup) return allDealers;
    const userLoc = normalizeLocation(bookingSummary.pickup);
    const userWords = bookingSummary.pickup
      .toLowerCase()
      .split(/[\s,]+/)
      .filter((w) => w.length > 2);
    return allDealers.filter((dealer) => {
      const dealerCity = normalizeLocation(dealer.city || "");
      const dealerState = normalizeLocation(dealer.state || "");
      return (
        dealerCity === userLoc ||
        dealerCity.includes(userLoc) ||
        userLoc.includes(dealerCity) ||
        dealerState === userLoc ||
        userWords.some((w) => dealerCity.includes(w) || dealerState.includes(w))
      );
    });
  }, [dealersMap, bookingSummary?.pickup]);

  // ── Cars for selected dealer showroom ──────────────────────
  const selectedDealerCars = useMemo(() => {
    if (!selectedDealer) return [];
    return dealerCars
      .filter((c) => c.dealerId === selectedDealer.id)
      .map((c) => ({
        ...c, // Spread ALL fields including Phase 2 fields
        type:
          CAR_TYPES.find(
            (t) => t.toLowerCase() === (c.type || "").toLowerCase(),
          ) || "SUV",
        seats: Number(c.seats) || 5,
        bags: c.bags || "2 bags",
        transmission: c.transmission || "Automatic",
        range: c.range || "—",
        price: Number(c.price) || 0,
        isDealerCar: true,
      }));
  }, [selectedDealer, dealerCars]);

  function getDealerCarCount(dealerId) {
    return dealerCars.filter((c) => c.dealerId === dealerId).length;
  }

  // ── Build base car list ─────────────────────────────────────
  // Inside dealer showroom → dealer cars only
  // Pickup location set → no QuickWheels cars (use dealer showrooms)
  // No pickup location → show QuickWheels cars
  const baseList = useMemo(() => {
    if (selectedDealer) return selectedDealerCars;
    if (bookingSummary?.pickup && bookingSummary.pickup.trim() !== "")
      return [];
    return [...cars];
  }, [selectedDealer, selectedDealerCars, bookingSummary?.pickup]);

  // ── Apply category filter + sort ───────────────────────────
  let filtered =
    activeCategory === "All"
      ? [...baseList]
      : baseList.filter((c) => c.type === activeCategory);
  if (sortBy === "price_low") filtered.sort((a, b) => a.price - b.price);
  else if (sortBy === "price_high") filtered.sort((a, b) => b.price - a.price);
  else if (sortBy === "seats") filtered.sort((a, b) => b.seats - a.seats);

  // Pin currently booked car to top
  if (currentlyBookedCarId) {
    const bookedIdx = filtered.findIndex((c) => c.id === currentlyBookedCarId);
    if (bookedIdx > 0) {
      const [bookedCar] = filtered.splice(bookedIdx, 1);
      filtered.unshift(bookedCar);
    }
  }

  /* ── RENDER ── */
  return (
    <section className="fleet_section">
      {/* Modals */}
      {showModal && (
        <ValidationModal
          onClose={() => setShowModal(false)}
          onGoToBooking={handleGoToBooking}
        />
      )}

      {showCalendarModal && selectedCarForCalendar && (
        <AvailabilityCalendarModal
          car={selectedCarForCalendar}
          onClose={() => {
            setShowCalendarModal(false);
            setSelectedCarForCalendar(null);
          }}
          onSelect={handleSelectCar}
          userTripDates={userOverlappingBookings.details || null}
          bookingWindow={
            bookingSummary?.pickupDate
              ? {
                  pickupDate: bookingSummary.pickupDate,
                  dropoffDate: bookingSummary.dropoffDate,
                }
              : null
          }
          userPickupLocation={bookingSummary?.pickup || ""}
          onUpdateBookingDates={handleUpdateBookingDates}
        />
      )}

      {/* Title */}
      <h2 className="fleet_title">
        {selectedDealer
          ? `🏢 ${selectedDealer.businessName}`
          : "Select Your Ride!"}
      </h2>

      {/* Back button inside dealer showroom */}
      {selectedDealer && (
        <button
          onClick={() => {
            setSelectedDealer(null);
            setActiveCategory("All");
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            marginBottom: "20px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            color: "#f1f5f9",
            cursor: "pointer",
            fontFamily: "Quicksand,sans-serif",
            fontWeight: "600",
            fontSize: "13px",
          }}
        >
          ← Back to Fleet
        </button>
      )}

      {/* Currently selected car notice */}
      {currentlyBookedCarId && bookingSummary && (
        <div
          style={{
            background:
              "linear-gradient(135deg,rgba(4,0,255,0.08),rgba(76,227,247,0.05))",
            border: "1px solid rgba(76,227,247,0.35)",
            borderRadius: "12px",
            padding: "12px 20px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{ color: "#4ce3f7", fontWeight: "700", fontSize: "14px" }}
          >
            ✅ You have a car selected
          </span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
            Scroll down or it's pinned at the top
          </span>
        </div>
      )}

      {/* Booking summary banner */}
      {bookingSummary && (
        <div
          style={{
            background: "rgba(76,227,247,0.08)",
            border: "1px solid rgba(76,227,247,0.3)",
            borderRadius: "12px",
            padding: "12px 24px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#4ce3f7", fontWeight: "700" }}>
            ✓ Booking Details
          </span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
            📍 {bookingSummary.pickup} → {bookingSummary.dropoff}
          </span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
            📅 {bookingSummary.pickupDate} → {bookingSummary.dropoffDate}
          </span>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
            🗓️ {bookingSummary.days} days · {bookingSummary.tripType}
          </span>
          <button
            onClick={() => navigate("/booking")}
            style={{
              background: "transparent",
              border: "1px solid rgba(76,227,247,0.4)",
              borderRadius: "8px",
              color: "#4ce3f7",
              padding: "4px 14px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontFamily: "Quicksand,sans-serif",
              fontWeight: "600",
            }}
          >
            Edit
          </button>
        </div>
      )}

      {/* Loading states */}
      {availabilityLoading && (
        <div
          style={{
            textAlign: "center",
            padding: "12px",
            color: "rgba(255,255,255,0.4)",
            fontSize: "0.85rem",
            marginBottom: "16px",
          }}
        >
          ⏳ Checking availability at {bookingSummary?.pickup}...
        </div>
      )}
      {dealerCarsLoading && (
        <div
          style={{
            textAlign: "center",
            padding: "12px",
            color: "rgba(255,255,255,0.4)",
            fontSize: "0.85rem",
            marginBottom: "16px",
          }}
        >
          ⏳ Loading partner fleet...
        </div>
      )}

      {/* Unavailable count banner */}
      {!availabilityLoading && Object.keys(unavailableCarIds).length > 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "10px 20px",
            background: "rgba(255,77,77,0.06)",
            border: "1px solid rgba(255,77,77,0.2)",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "13px",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          🚫 {Object.keys(unavailableCarIds).length} car
          {Object.keys(unavailableCarIds).length > 1 ? "s" : ""} booked at{" "}
          <strong>{bookingSummary?.pickup}</strong>
          <span
            style={{
              color: "rgba(255,255,255,0.3)",
              marginLeft: "6px",
              fontSize: "12px",
            }}
          >
            (open 📅 to pick alternate dates)
          </span>
        </div>
      )}

      {/* User overlap warning */}
      {userOverlappingBookings.allCars && (
        <div
          style={{
            padding: "16px 20px",
            background: "rgba(255,165,0,0.06)",
            border: "1px solid rgba(255,165,0,0.3)",
            borderRadius: "14px",
            marginBottom: "50px",
            fontFamily: "Quicksand,sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <span
              style={{ color: "#ffa500", fontWeight: "700", fontSize: "14px" }}
            >
              You Already Have an Active Trip
            </span>
            <span
              style={{
                marginLeft: "auto",
                background:
                  userOverlappingBookings.details?.status === "confirmed"
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(255,165,0,0.15)",
                border: `1px solid ${userOverlappingBookings.details?.status === "confirmed" ? "rgba(34,197,94,0.4)" : "rgba(255,165,0,0.4)"}`,
                borderRadius: "20px",
                padding: "2px 10px",
                fontSize: "11px",
                fontWeight: "700",
                color:
                  userOverlappingBookings.details?.status === "confirmed"
                    ? "#22c55e"
                    : "#ffa500",
                textTransform: "capitalize",
              }}
            >
              {userOverlappingBookings.details?.status?.replace("_", " ")}
            </span>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              padding: "14px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              <span
                style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}
              >
                🚗 {userOverlappingBookings.details?.carModel}
              </span>
              <span
                style={{
                  background: "rgba(76,227,247,0.1)",
                  border: "1px solid rgba(76,227,247,0.25)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  color: "#4ce3f7",
                  fontWeight: "600",
                }}
              >
                {userOverlappingBookings.details?.bookingId}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "10px",
              }}
            >
              {[
                {
                  icon: "📍",
                  color: "#22c55e",
                  label: "Pickup",
                  value: userOverlappingBookings.details?.pickup,
                },
                {
                  icon: "📍",
                  color: "#ff4d4d",
                  label: "Dropoff",
                  value: userOverlappingBookings.details?.dropoff,
                },
                {
                  icon: "📅",
                  color: "#4ce3f7",
                  label: "Travel Dates",
                  value: `${new Date(userOverlappingBookings.details?.pickupDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} → ${new Date(userOverlappingBookings.details?.dropoffDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
                },
                {
                  icon: "🗓️",
                  color: "#ffa500",
                  label: "Duration",
                  value: `${userOverlappingBookings.details?.days} day${userOverlappingBookings.details?.days > 1 ? "s" : ""} · ${userOverlappingBookings.details?.tripType}`,
                },
              ].map(({ icon, color, label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                  }}
                >
                  <span style={{ color, fontSize: "14px", flexShrink: 0 }}>
                    {icon}
                  </span>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: "rgba(255,255,255,0.4)",
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontWeight: "600",
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        color: "rgba(255,255,255,0.85)",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.4)",
                fontSize: "12px",
                lineHeight: "1.5",
                flex: 1,
              }}
            >
              You cannot have two trips at the same time. Cancel this booking or
              choose non-overlapping dates.
            </p>
            <button
              onClick={() =>
                navigate("/profile", { state: { tab: "bookings" } })
              }
              style={{
                background: "rgba(255,165,0,0.1)",
                border: "1px solid rgba(255,165,0,0.3)",
                borderRadius: "8px",
                padding: "6px 14px",
                color: "#ffa500",
                cursor: "pointer",
                fontFamily: "Quicksand,sans-serif",
                fontWeight: "600",
                fontSize: "12px",
                flexShrink: 0,
              }}
            >
              Manage Bookings
            </button>
          </div>
        </div>
      )}

      {/* ── DEALER SHOWROOMS (only when NOT inside a dealer) ── */}
      {!selectedDealer && matchingDealers.length > 0 && !dealerCarsLoading && (
        <div style={{ marginBottom: "40px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#4ce3f7",
                fontSize: "15px",
                fontWeight: "700",
              }}
            >
              🏢 Partner Showrooms
              {bookingSummary?.pickup && (
                <span
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "12px",
                    fontWeight: "400",
                    marginLeft: "8px",
                  }}
                >
                  near {bookingSummary.pickup}
                </span>
              )}
            </h3>
            <span
              style={{
                background: "rgba(76,227,247,0.1)",
                border: "1px solid rgba(76,227,247,0.22)",
                borderRadius: "20px",
                padding: "2px 10px",
                color: "#4ce3f7",
                fontSize: "11px",
                fontWeight: "700",
              }}
            >
              {matchingDealers.length} available
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
              gap: "16px",
            }}
          >
            {matchingDealers.map((dealer) => (
              <DealerShowroomCard
                key={dealer.id}
                dealer={dealer}
                carCount={getDealerCarCount(dealer.id)}
                onEnter={() => {
                  setSelectedDealer(dealer);
                  setActiveCategory("All");
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── NO DEALERS IN PICKUP CITY ── */}
      {!selectedDealer &&
        bookingSummary?.pickup &&
        matchingDealers.length === 0 &&
        !dealerCarsLoading && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "rgba(255,165,0,0.05)",
              border: "1px solid rgba(255,165,0,0.15)",
              borderRadius: "16px",
              marginBottom: "30px",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📍</div>
            <h3
              style={{ color: "#ffa500", margin: "0 0 8px", fontSize: "18px" }}
            >
              No Partner Showrooms in {bookingSummary.pickup}
            </h3>
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              We don't have any dealer partners in your selected pickup location
              yet.
            </p>
            <button
              onClick={() => navigate("/booking")}
              style={{
                padding: "8px 20px",
                background: "rgba(76,227,247,0.1)",
                border: "1px solid rgba(76,227,247,0.3)",
                borderRadius: "10px",
                color: "#4ce3f7",
                cursor: "pointer",
                fontFamily: "Quicksand,sans-serif",
                fontWeight: "600",
              }}
            >
              📝 Change Pickup Location
            </button>
          </div>
        )}

      {/* ── DEALER SHOWROOM INFO BAR ── */}
      {selectedDealer && (
        <div
          style={{
            background: "rgba(76,227,247,0.05)",
            border: "1px solid rgba(76,227,247,0.18)",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              flexShrink: 0,
              background: "linear-gradient(135deg,#0400ff,#4ce3f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#fff",
              fontWeight: "900",
            }}
          >
            {selectedDealer.businessName?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: "0 0 2px",
                color: "#f1f5f9",
                fontWeight: "700",
                fontSize: "14px",
              }}
            >
              {selectedDealer.businessName}
            </p>
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.45)",
                fontSize: "12px",
              }}
            >
              📍 {selectedDealer.city}
              {selectedDealer.state ? `, ${selectedDealer.state}` : ""} ·{" "}
              {selectedDealerCars.length} cars
              {selectedDealer.phone && ` · 📞 ${selectedDealer.phone}`}
            </p>
          </div>
          {selectedDealer.rating > 0 && (
            <span
              style={{ color: "#fbbf24", fontSize: "14px", fontWeight: "700" }}
            >
              ⭐ {selectedDealer.rating.toFixed(1)}
            </span>
          )}
        </div>
      )}

      {/* ── CATEGORY FILTER + SORT — only when cars exist or inside dealer ── */}
      {(selectedDealer || baseList.length > 0) && (
        <>
          <div className="fleet_categories">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`fleet_category_btn ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="fleet_sort_wrapper">
            <label
              style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}
            >
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="fleet_sort_select"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* ── EMPTY STATE inside dealer showroom ── */}
      {selectedDealer && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.08)",
            borderRadius: "20px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🚗</div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "15px" }}>
            {activeCategory === "All"
              ? "This showroom has no cars available right now"
              : `No ${activeCategory} cars in this showroom`}
          </p>
          {activeCategory !== "All" && (
            <button
              onClick={() => setActiveCategory("All")}
              style={{
                marginTop: "12px",
                padding: "8px 20px",
                background: "rgba(76,227,247,0.1)",
                border: "1px solid rgba(76,227,247,0.3)",
                borderRadius: "10px",
                color: "#4ce3f7",
                cursor: "pointer",
                fontFamily: "Quicksand,sans-serif",
                fontWeight: "600",
              }}
            >
              Show all cars
            </button>
          )}
        </div>
      )}

      {/* ── CAR GRID ── */}
      <div className="fleet_cards_wrapper">
        {filtered.map((car) => {
          const isUserOverlapping = userOverlappingBookings.allCars === true;
          const isUnavailable = !!unavailableCarIds[car.id];
          const isCurrentlyBooked = car.id === currentlyBookedCarId;
          return (
            <CarCard
              key={car.id}
              car={car}
              onSelect={handleSelectCar}
              onViewAvailability={handleViewAvailability}
              isUnavailable={
                (isUnavailable || isUserOverlapping) && !isCurrentlyBooked
              }
              unavailableUntil={unavailableCarIds[car.id] || null}
              userOverlapDetails={
                isUserOverlapping && !isCurrentlyBooked
                  ? userOverlappingBookings.details
                  : null
              }
              formatPrice={formatPrice}
              isCurrentlyBooked={isCurrentlyBooked}
              dealerName={
                car.isDealerCar && dealersMap[car.dealerId]
                  ? dealersMap[car.dealerId].businessName
                  : null
              }
            />
          );
        })}
      </div>
    </section>
  );
}

export default Fleet;
