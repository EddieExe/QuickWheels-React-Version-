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
import ImageCarousel from "../components/dealer/ImageCarousel";
import "../styles/fleet.css";

/* ═══════════════════════════════════════════════════════════
   ICON LIBRARY — replaces raw emoji with themed, colorable SVGs.
   Every icon accepts `size` and `className`; stroke/fill use
   currentColor by default so parent text-color controls tint.
═══════════════════════════════════════════════════════════ */
const IconBase = ({ children, size = 14, className = "", viewBox = "0 0 24 24", style }) => (
  <svg
    width={size}
    height={size}
    viewBox={viewBox}
    className={`fl-icon ${className}`}
    style={style}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {children}
  </svg>
);

const IconCheckCircle = (p) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M8.5 12.3 11 14.8l4.7-5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

const IconCheck = (p) => (
  <IconBase {...p}>
    <path d="M5 12.5 9.5 17 19 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

const IconMapPin = (p) => (
  <IconBase {...p}>
    <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="2" />
  </IconBase>
);

const IconCalendar = (p) => (
  <IconBase {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconBase>
);

const IconCalendarDays = (p) => (
  <IconBase {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="8.5" cy="14" r="1.1" fill="currentColor" />
    <circle cx="12.5" cy="14" r="1.1" fill="currentColor" />
    <circle cx="16.5" cy="14" r="1.1" fill="currentColor" />
  </IconBase>
);

const IconBan = (p) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </IconBase>
);

const IconCar = (p) => (
  <IconBase {...p}>
    <path d="M4.5 16v-3.6a2 2 0 0 1 .35-1.13l1.7-2.53A2.5 2.5 0 0 1 8.63 7.7h6.74a2.5 2.5 0 0 1 2.08 1.04l1.7 2.53c.23.34.35.74.35 1.13V16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <rect x="2.7" y="13" width="18.6" height="5.5" rx="1.6" stroke="currentColor" strokeWidth="2" />
    <circle cx="7" cy="18.6" r="1.6" fill="currentColor" />
    <circle cx="17" cy="18.6" r="1.6" fill="currentColor" />
  </IconBase>
);

const IconAlertTriangle = (p) => (
  <IconBase {...p}>
    <path d="M12 4 21.5 20H2.5L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 10v4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17.3" r="1" fill="currentColor" />
  </IconBase>
);

const IconBuilding = (p) => (
  <IconBase {...p}>
    <rect x="4.5" y="3.5" width="11" height="17" rx="1.4" stroke="currentColor" strokeWidth="2" />
    <path d="M15.5 9.5h3.7a1.3 1.3 0 0 1 1.3 1.3V20.5h-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M8 7.5h1.2M11.8 7.5H13M8 11h1.2M11.8 11H13M8 14.5h1.2M11.8 14.5H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M8.5 20.5v-3a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5v3" stroke="currentColor" strokeWidth="1.8" />
  </IconBase>
);

const IconPhone = (p) => (
  <IconBase {...p}>
    <path d="M6.6 3.5h2.2c.5 0 .9.32 1.04.8l.9 3a1.1 1.1 0 0 1-.28 1.1L9 9.9a11.6 11.6 0 0 0 5.1 5.1l1.5-1.46c.3-.29.72-.4 1.1-.28l3 .9c.48.14.8.58.8 1.04v2.2c0 .66-.56 1.18-1.21 1.1C11.7 17.9 6.1 12.3 5.5 4.71 5.42 4.06 5.94 3.5 6.6 3.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </IconBase>
);

const IconStar = ({ filled = true, ...p }) => (
  <IconBase {...p}>
    <path
      d="M12 3.5l2.47 5.24 5.78.62-4.3 3.98 1.17 5.71L12 16.1l-5.12 2.95 1.17-5.71-4.3-3.98 5.78-.62L12 3.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      fill={filled ? "currentColor" : "none"}
    />
  </IconBase>
);

const IconClose = (p) => (
  <IconBase {...p}>
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </IconBase>
);

const IconRefresh = (p) => (
  <IconBase {...p}>
    <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 4v4.7h-4.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 12a8 8 0 0 1-13.66 5.66L4 15.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 20v-4.7h4.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

const IconHourglass = (p) => (
  <IconBase {...p}>
    <path d="M6 3.5h12M6 20.5h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M7 3.5v3.1c0 1.6.86 3.08 2.26 3.9L12 12l2.74 1.5A4.5 4.5 0 0 1 17 17.4v3.1M17 3.5v3.1c0 1.6-.86 3.08-2.26 3.9L12 12l-2.74 1.5A4.5 4.5 0 0 0 7 17.4v3.1" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </IconBase>
);

const IconTag = (p) => (
  <IconBase {...p}>
    <path d="M11.6 3.5H6A2.5 2.5 0 0 0 3.5 6v5.6c0 .66.26 1.3.73 1.77l7.9 7.9a2.5 2.5 0 0 0 3.54 0l5.6-5.6a2.5 2.5 0 0 0 0-3.54l-7.9-7.9a2.5 2.5 0 0 0-1.77-.73Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="8.2" cy="8.2" r="1.3" fill="currentColor" />
  </IconBase>
);

const IconBandage = (p) => (
  <IconBase {...p}>
    <rect x="3.5" y="9.2" width="17" height="5.6" rx="2.8" transform="rotate(-45 12 12)" stroke="currentColor" strokeWidth="2" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    <circle cx="15" cy="15" r="1.2" fill="currentColor" />
    <path d="M10.4 13.6l3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </IconBase>
);

const IconSatellite = (p) => (
  <IconBase {...p}>
    <rect x="8.3" y="8.3" width="7.4" height="7.4" rx="1.4" transform="rotate(45 12 12)" stroke="currentColor" strokeWidth="1.8" />
    <path d="M14.5 9.5l4.2-4.2M18 9l2.2-2.2M15 6l2.2-2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M4 20c0-4.4 3.6-8 8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1 3" />
  </IconBase>
);

const IconWrench = (p) => (
  <IconBase {...p}>
    <path d="M14.7 6.3a4 4 0 0 0-5.4 4.9L3.8 16.7a1.8 1.8 0 0 0 2.5 2.5l5.5-5.5a4 4 0 0 0 4.9-5.4l-2.4 2.4-2-.5-.5-2 2.4-2.4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </IconBase>
);

const IconClipboardCheck = (p) => (
  <IconBase {...p}>
    <rect x="5.5" y="4.5" width="13" height="16" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9 4.2h6a.7.7 0 0 1 .7.7v1.1a.7.7 0 0 1-.7.7H9a.7.7 0 0 1-.7-.7V4.9a.7.7 0 0 1 .7-.7Z" stroke="currentColor" strokeWidth="1.8" />
    <path d="M9 13l2 2 4-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

const IconPointer = (p) => (
  <IconBase {...p}>
    <path d="M9.5 13V6.2a1.3 1.3 0 1 1 2.6 0V11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M12.1 11V5a1.3 1.3 0 1 1 2.6 0v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M14.7 11V6.6a1.3 1.3 0 1 1 2.6 0V13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M9.5 12.6l-1.7-1.7a1.35 1.35 0 0 0-2 1.85l3.4 4.2c.8 1 2 1.55 3.25 1.55h1.9a4.6 4.6 0 0 0 4.6-4.6V10" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
  </IconBase>
);

const IconArrowLeft = (p) => (
  <IconBase {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

const IconChevronDown = (p) => (
  <IconBase {...p}>
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </IconBase>
);

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
  formatPrice,
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
            ? "2px solid rgba(192,132,252,0.5)"
            : "1px solid rgba(34,197,94,0.35)",
          color: "#22c55e",
          cursor: isDateChangeMode ? "pointer" : "default",
          fontWeight: "600",
        };
      case "newPickup":
        return {
          ...base,
          background: "linear-gradient(135deg,#6d28d9,#c084fc)",
          border: "2px solid #c084fc",
          color: "#fff",
          cursor: "default",
          fontWeight: "800",
          fontSize: "0.88rem",
          boxShadow: "0 0 16px rgba(192,132,252,0.4)",
          borderRadius: "8px 4px 4px 8px",
        };
      case "newDropoff":
        return {
          ...base,
          background: "linear-gradient(135deg,#c084fc,#6d28d9)",
          border: "2px solid #c084fc",
          color: "#fff",
          cursor: "default",
          fontWeight: "800",
          fontSize: "0.88rem",
          boxShadow: "0 0 16px rgba(192,132,252,0.4)",
          borderRadius: "4px 8px 8px 4px",
        };
      case "newRange":
        return {
          ...base,
          background: "rgba(192,132,252,0.18)",
          border: "1px solid rgba(192,132,252,0.4)",
          color: "#c084fc",
          cursor: "default",
          fontWeight: "700",
          borderRadius: "4px",
        };
      case "hoverRange":
        return {
          ...base,
          background: "rgba(192,132,252,0.12)",
          border: "1px dashed rgba(192,132,252,0.45)",
          color: "rgba(192,132,252,0.8)",
          cursor: "pointer",
          fontWeight: "500",
          borderRadius: "4px",
        };
      case "dropoffOption":
        return {
          ...base,
          background: "rgba(192,132,252,0.05)",
          border: "1px solid rgba(192,132,252,0.2)",
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
        : "Available",
      newPickup: "New pickup date",
      newDropoff: "New drop-off date",
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
      className="fl-avail-modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.9)",
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        className="fl-avail-modal-card"
        style={{
          background: "linear-gradient(135deg,#12122a 0%,#0a0a1a 100%)",
          border: "1px solid rgba(192,132,252,0.25)",
          borderRadius: "24px",
          maxWidth: "800px",
          width: "100%",
          overflow: "hidden",
          fontFamily: "Quicksand,sans-serif",
          boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fl-avail-body">
        {/* Header */}
        <div
          className="fl-avail-header-area"
          style={{
            padding: "20px 22px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background:
              "linear-gradient(135deg,rgba(109,40,217,0.06),rgba(192,132,252,0.03))",
            borderRadius: "24px 0 0 0",
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
              <h2 style={{ margin: 0, color: "#c084fc", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <IconCalendar size={18} /> {car.model}
              </h2>
              <p
                style={{
                  margin: "3px 0 0",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "0.78rem",
                }}
              >
                {formatPrice ? formatPrice(car.price) : `$${car.price}`}/day · {car.seats} seats · {car.transmission}
              </p>
              {userPickupLocation && (
                <p
                  style={{
                    margin: "3px 0 0",
                    color: "rgba(192,132,252,0.6)",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <IconMapPin size={12} /> {userPickupLocation}
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconClose size={13} />
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
                    : "rgba(192,132,252,0.06)",
                border: `1px solid ${selectionStep === "ready" ? "rgba(34,197,94,0.3)" : "rgba(192,132,252,0.2)"}`,
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
                                ? "#c084fc"
                                : "rgba(255,255,255,0.1)",
                            color:
                              done || current
                                ? "#000"
                                : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {done ? <IconCheck size={11} /> : stepNum}
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
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <IconPointer size={13} /> Tap an{" "}
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
                  <strong style={{ color: "#c084fc" }}>
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
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <IconCheckCircle size={13} /> {fmtDateShort(newPickupDate)} →{" "}
                    {fmtDateShort(newDropoffDate)} · {newDaysCount} day
                    {newDaysCount > 1 ? "s" : ""}
                  </p>
                  {newWindowBlocked && (
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "#ff4d4d",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <IconAlertTriangle size={12} /> Conflict detected in selected range
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
                style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {originalBlocked ? <IconBan size={13} /> : <IconCheckCircle size={13} />} {bookingWindow.pickupDate} →{" "}
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
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <IconAlertTriangle size={13} /> No trip dates set. Go to booking form first.
            </div>
          )}

          {/* Car photo */}
          <div
            style={{
              marginTop: "18px",
              width: "100%",
              height: "130px",
              borderRadius: "14px",
              overflow: "hidden",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <img
              src={(car.images && car.images[0]) || car.image}
              alt={car.model}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          {/* Quick specs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginTop: "14px",
            }}
          >
            {[
              { icon: "/Images/people.png", text: `${car.seats} Seats` },
              { icon: "/Images/travel-luggage.png", text: car.bags },
              { icon: "/Images/transmission.png", text: car.transmission },
              { icon: "/Images/fuel.png", text: car.range },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "7px 10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <img src={s.icon} alt="" style={{ width: "15px", height: "15px", opacity: 0.85 }} />
                {s.text}
              </div>
            ))}
          </div>

          {/* Trip cost breakdown */}
          {(() => {
            const startD = isDateChangeMode ? newPickupDate : lockedPickupDate;
            const endD = isDateChangeMode ? newDropoffDate : lockedDropoffDate;
            if (!startD || !endD) return null;
            const days = Math.max(1, Math.ceil((endD - startD) / 86400000));
            const total = days * (car.price || 0);
            return (
              <div
                style={{
                  marginTop: "14px",
                  padding: "12px 14px",
                  background: "rgba(147,51,234,0.06)",
                  border: "1px solid rgba(192,132,252,0.2)",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.6)",
                    marginBottom: "6px",
                  }}
                >
                  <span>
                    {days} day{days > 1 ? "s" : ""} × {formatPrice ? formatPrice(car.price) : `$${car.price}`}/day
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>
                    Estimated total
                  </span>
                  <span style={{ fontSize: "20px", fontWeight: "800", color: "#c084fc" }}>
                    {formatPrice ? formatPrice(total) : `$${total} USD`}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Calendar body */}
        <div className="fl-avail-calendar-area" style={{ padding: "18px 22px" }}>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px",
                color: "rgba(255,255,255,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <IconHourglass size={16} className="fl-spin-slow" /> Loading...
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
                        bg: "linear-gradient(135deg,#6d28d9,#c084fc)",
                        bd: "2px solid #c084fc",
                        l: "Pickup",
                      },
                      {
                        bg: "linear-gradient(135deg,#c084fc,#6d28d9)",
                        bd: "2px solid #c084fc",
                        l: "Dropoff",
                      },
                      {
                        bg: "rgba(192,132,252,0.18)",
                        bd: "1px solid rgba(192,132,252,0.4)",
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
                      color: "#c084fc",
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
                    background: "rgba(192,132,252,0.08)",
                    border: "1px solid rgba(192,132,252,0.2)",
                    borderRadius: "8px",
                    textAlign: "center",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {fmtDateShort(newPickupDate)} → {fmtDateShort(hoverDate)} ·{" "}
                  <strong style={{ color: "#c084fc" }}>
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
                      "linear-gradient(135deg,rgba(109,40,217,0.06),rgba(192,132,252,0.04))",
                    border: "1px solid rgba(192,132,252,0.2)",
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
                      background: "linear-gradient(30deg,#6d28d9,#c084fc)",
                      border: "none",
                      borderRadius: "10px",
                      color: "#fff",
                      padding: "10px 24px",
                      cursor: "pointer",
                      fontWeight: "700",
                      fontFamily: "Quicksand,sans-serif",
                      fontSize: "13px",
                      boxShadow: "0 4px 20px rgba(192,132,252,0.3)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "7px",
                    }}
                  >
                    <IconCalendar size={14} /> Choose Different Dates
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <IconCheckCircle size={12} /> Car is free for your dates. Click "Book This Car" below.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="fl-avail-footer-area"
          style={{
            padding: "12px 22px 16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            justifyContent: "flex-end",
            marginTop: "auto",
          }}
        >
          {isDateChangeMode ? (
            <>
              <button onClick={cancelDateChange} style={footerBtnSec}>
                <IconArrowLeft size={13} /> Back
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
                  <IconRefresh size={13} /> Reset
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
                      : "linear-gradient(30deg,#6d28d9,#c084fc)",
                    border: "none",
                    borderRadius: "10px",
                    color: newWindowBlocked ? "rgba(255,255,255,0.25)" : "#fff",
                    cursor: newWindowBlocked ? "not-allowed" : "pointer",
                    fontFamily: "Quicksand,sans-serif",
                    fontWeight: "700",
                    boxShadow: newWindowBlocked
                      ? "none"
                      : "0 4px 16px rgba(192,132,252,0.25)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                  }}
                >
                  {newWindowBlocked ? (
                    <>
                      <IconBan size={13} /> Dates Conflicting
                    </>
                  ) : (
                    <>
                      <IconCheckCircle size={13} /> Proceed · {newDaysCount} Day{newDaysCount > 1 ? "s" : ""}
                    </>
                  )}
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
                    background: "linear-gradient(30deg,#6d28d9,#c084fc)",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    cursor: "pointer",
                    fontFamily: "Quicksand,sans-serif",
                    fontWeight: "700",
                    boxShadow: "0 4px 16px rgba(192,132,252,0.25)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                  }}
                >
                  <IconCheckCircle size={13} /> Book This Car
                </button>
              )}
              {!hasBookingWindow && (
                <button
                  onClick={onClose}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(30deg,#6d28d9,#c084fc)",
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
    </div>
  );
}

const monthBtnStyle = {
  background: "rgba(192,132,252,0.06)",
  border: "1px solid rgba(192,132,252,0.2)",
  borderRadius: "8px",
  padding: "6px 14px",
  cursor: "pointer",
  color: "#c084fc",
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
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
};

/* ═══════════════════════════════════════════════════════════
   VALIDATION MODAL
═══════════════════════════════════════════════════════════ */
function ValidationModal({ onClose, onGoToBooking }) {
  return (
    <div className="fl-modal-overlay" onClick={onClose}>
      <div className="fl-modal-card warn" onClick={(e) => e.stopPropagation()}>
        <div className="fl-modal-icon" style={{ display: "flex", justifyContent: "center", color: "#f59e0b" }}>
          <IconCar size={44} />
        </div>
        <h2 className="fl-modal-title warn">Complete Booking Details First</h2>
        <p className="fl-modal-text">
          Please fill in your pickup location, drop-off location and travel
          dates before selecting a vehicle.
        </p>
        <div className="fl-modal-actions">
          <button onClick={onGoToBooking} className="fl-modal-btn-primary">
            Fill Booking Form
          </button>
          <button onClick={onClose} className="fl-modal-btn-secondary">
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
function DealerShowroomCard({ dealer, carCount, onEnter, onViewDetails, ratingInfo }) {
  return (
    <div className="fl-dealer-card" onClick={onEnter}>
      <div className="fl-dealer-glow" />
      <div className="fl-dealer-header" style={{ alignItems: "center" }}>
        <div className="fl-dealer-avatar" style={{ overflow: "hidden" }}>
          {dealer.logo ? (
            <img
              src={dealer.logo}
              alt={dealer.businessName || "Dealer"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            dealer.businessName?.[0]?.toUpperCase() || "D"
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fl-dealer-name-row">
            <h3 className="fl-dealer-name">{dealer.businessName}</h3>
            <span className="fl-dealer-verified fl-icon-row">
              <IconCheckCircle size={11} /> Verified
            </span>
          </div>
          <p className="fl-dealer-address fl-icon-row">
            <IconMapPin size={11} /> {dealer.businessAddress || dealer.city}
            {dealer.state ? `, ${dealer.state}` : ""}
          </p>
          {dealer.phone && (
            <p className="fl-dealer-phone fl-icon-row">
              <IconPhone size={11} /> {dealer.phone}
            </p>
          )}
          <div className="fl-dealer-meta">
            <span className="fl-dealer-count fl-icon-row">
              <IconCar size={13} /> {carCount} cars available
            </span>
            {ratingInfo && ratingInfo.count > 0 && (
              <span className="fl-dealer-rating fl-icon-row">
                <IconStar size={12} /> {ratingInfo.avg.toFixed(1)} ({ratingInfo.count})
              </span>
            )}
          </div>
          {dealer.description && (
            <p className="fl-dealer-desc">"{dealer.description}"</p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.();
          }}
          className="fl-inline-action-btn"
          style={{ fontWeight: "600", flexShrink: 0, marginLeft: "auto" }}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DEALER DETAILS MODAL
═══════════════════════════════════════════════════════════ */
function DealerDetailsModal({ dealer, carCount, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const snap = await getDocs(
          query(collection(db, "reviews"), where("dealerId", "==", dealer.id)),
        );
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          // Sort newest-first client-side rather than via orderBy, so this
          // doesn't need a composite Firestore index to work.
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return bTime - aTime;
          });
        if (!cancelled) setReviews(list);
      } catch (err) {
        console.error("Failed to load dealer reviews:", err);
        if (!cancelled) setError("Couldn't load reviews right now. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dealer.id]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
    : null;

  return (
    <div className="fl-modal-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg, #17102b, #0d0a1a)",
          border: "1px solid rgba(168,85,247,0.25)",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "560px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.55)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, position: "relative" }}>
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              color: "rgba(255,255,255,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconClose size={14} />
          </button>

          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "16px",
                overflow: "hidden",
                flexShrink: 0,
                background: dealer.logo ? "transparent" : "linear-gradient(135deg,#4f46e5,#6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                fontWeight: "800",
                color: "#fff",
              }}
            >
              {dealer.logo ? (
                <img src={dealer.logo} alt={dealer.businessName || "Dealer"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                dealer.businessName?.[0]?.toUpperCase() || "D"
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h2 style={{ color: "#fff", margin: 0, fontSize: "19px" }}>{dealer.businessName}</h2>
                <span className="fl-dealer-verified fl-icon-row">
                  <IconCheckCircle size={11} /> Verified
                </span>
              </div>
              {avgRating !== null ? (
                <div style={{ margin: "4px 0 0", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", gap: "1px" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <IconStar key={n} size={13} filled={n <= Math.round(avgRating)} />
                    ))}
                  </span>
                  <span style={{ color: "#fbbf24", fontSize: "13px" }}>
                    {avgRating.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  </span>
                </div>
              ) : (
                !loading && (
                  <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                    No reviews yet
                  </p>
                )
              )}
            </div>
          </div>

          {dealer.description && (
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", margin: "14px 0 0", fontStyle: "italic" }}>
              "{dealer.description}"
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "14px" }}>
            <span className="fl-dealer-address fl-icon-row" style={{ fontSize: "13px" }}>
              <IconMapPin size={13} /> {dealer.businessAddress || dealer.city}
              {dealer.state ? `, ${dealer.state}` : ""}{dealer.country ? `, ${dealer.country}` : ""}
            </span>
            {dealer.phone && (
              <span className="fl-dealer-phone fl-icon-row" style={{ fontSize: "13px" }}>
                <IconPhone size={13} /> {dealer.phone}
              </span>
            )}
            <span className="fl-dealer-count fl-icon-row" style={{ fontSize: "13px" }}>
              <IconCar size={13} /> {carCount} cars available
            </span>
          </div>

          {dealer.gstNumber && (
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", margin: "10px 0 0", display: "flex", alignItems: "center", gap: "5px" }}>
              <IconClipboardCheck size={11} /> GST: {dealer.gstNumber}
            </p>
          )}
        </div>

        {/* Reviews list */}
        <div style={{ padding: "18px 24px 24px", overflowY: "auto", flex: 1 }}>
          <h3 style={{ color: "#fff", fontSize: "14px", margin: "0 0 14px" }}>
            Customer Reviews
          </h3>

          {loading && (
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
              Loading reviews…
            </p>
          )}

          {!loading && error && (
            <p style={{ color: "#ef4444", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
              {error}
            </p>
          )}

          {!loading && !error && reviews.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>
              This dealer doesn't have any reviews yet. Be the first to book and
              share your experience!
            </p>
          )}

          {!loading && !error && reviews.map((r) => (
            <div
              key={r.id}
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                padding: "14px 0",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                <div>
                  <p style={{ color: "#fff", fontSize: "13px", fontWeight: "600", margin: 0 }}>
                    {r.userName || "Verified Customer"}
                  </p>
                  {r.carModel && (
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", margin: "2px 0 0" }}>
                      Rented: {r.carModel}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <IconStar key={n} size={12} filled={n <= (r.rating || 0)} />
                  ))}
                </div>
              </div>
              {r.comment && (
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", margin: "8px 0 0", lineHeight: 1.5 }}>
                  {r.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


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
  const carImages = car.images?.length ? car.images : car.image ? [car.image] : [];
  return (
    <div
      className="fleet_card"
      style={{
        opacity: isUnavailable && !isCurrentlyBooked ? 0.72 : 1,
        position: "relative",
        border: isCurrentlyBooked
          ? "2px solid rgba(192,132,252,0.5)"
          : undefined,
        boxShadow: isCurrentlyBooked
          ? "0 0 24px rgba(192,132,252,0.15)"
          : undefined,
      }}
    >
      {isCurrentlyBooked && (
        <div className="fl-badge-selected fl-icon-row">
          <IconCheckCircle size={12} /> Your Selection
        </div>
      )}
      {dealerName && !isCurrentlyBooked && (
        <div className="fl-badge-dealer-tag fl-icon-row">
          <IconBuilding size={11} /> {dealerName}
        </div>
      )}
      {isUnavailable && !userOverlapDetails && !isCurrentlyBooked && (
        <div className="fl-badge-unavailable fl-icon-row">
          <IconBan size={12} /> Unavailable Here
        </div>
      )}
      <div className="fleet_card_image_wrap">
        <ImageCarousel
          images={carImages}
          alt={car.model}
          height="150px"
          dotColor="#a855f7"
          arrows
          loop
        />
      </div>
      <h3 className="fleet_card_model">{car.model}</h3>
      <div className="fleet_card_info">
        <div className="fl-card-top">
          {/* Phase 2: Safety Rating Stars */}
          <div className="fl-safety-row">
            {[1, 2, 3, 4, 5].map((star) => (
              <IconStar
                key={star}
                size={13}
                filled={star <= (car.safetyRating || 0)}
                className={`fl-safety-star ${star <= (car.safetyRating || 0) ? "filled" : ""}`}
                style={{
                  color: star <= (car.safetyRating || 0) ? "#fbbf24" : "rgba(255,255,255,0.2)",
                  filter: star <= (car.safetyRating || 0) ? "drop-shadow(0 0 3px rgba(251,191,36,0.5))" : "none",
                }}
              />
            ))}
            <span className="fl-safety-count">
              {(car.safetyRating || 0) > 0
                ? `${car.safetyRating}/5`
                : "No ratings yet"}
            </span>
          </div>

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

          {/* Phase 2: Number Plate */}
          {car.numberPlate && (
            <div className="fl-plate-chip fl-icon-row">
              <IconTag size={11} /> {car.numberPlate}
            </div>
          )}

          {/* Phase 2: Additional Info Badges */}
          <div className="fl-feature-row">
            {car.emergencyKit && (
              <span className="fl-feature-badge kit fl-icon-row">
                <IconBandage size={10} /> Emergency Kit
              </span>
            )}
            {car.gpsAvailable && (
              <span className="fl-feature-badge gps fl-icon-row">
                <IconSatellite size={10} /> GPS
              </span>
            )}
            {car.lastServiceDate && (
              <span className="fl-feature-badge service fl-icon-row">
                <IconWrench size={10} /> Serviced:{" "}
                {new Date(car.lastServiceDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
            {car.pucCertificate && (
              <span className="fl-feature-badge puc fl-icon-row">
                <IconCheckCircle size={10} /> PUC:{" "}
                {new Date(car.pucCertificate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        <div className="fl-card-bottom">
          <p className="fleet_card_cost">
            {formatPrice(car.price)}{" "}
            <span style={{ fontSize: "12px" }}>/ day</span>
          </p>
          <div className="fl-card-actions">
            <button
              className="fleet_book_btn btn fl-btn-availability fl-icon-row"
              onClick={() => onViewAvailability(car)}
            >
              <IconCalendar size={13} /> View Availability
            </button>
            {isCurrentlyBooked ? (
              <button
                className="fleet_book_btn btn fl-btn-continue"
                onClick={() => onSelect(car)}
              >
                Continue with This Car
              </button>
            ) : isUnavailable ? (
              <div className="fl-card-action-item" style={{ textAlign: "center" }}>
                <button
                  className={`fleet_book_btn btn fl-btn-disabled ${userOverlapDetails ? "conflict" : "unavailable"} fl-icon-row`}
                  disabled
                  style={{ justifyContent: "center", width: "100%" }}
                >
                  {userOverlapDetails ? (
                    <>
                      <IconAlertTriangle size={12} /> Trip Conflict
                    </>
                  ) : (
                    <>
                      <IconBan size={12} /> Unavailable Here
                    </>
                  )}
                </button>
                {unavailableUntil && !userOverlapDetails && (
                  <p className="fl-unavailable-note">
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
  const [detailsDealer, setDetailsDealer] = useState(null);
  const [dealerRatings, setDealerRatings] = useState({}); // dealerId → { avg, count }
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

  // Live-computed dealer ratings — dealer.rating on the doc itself is never
  // actually kept in sync (it's only ever initialized to 0 at dealer
  // creation), so the ★ badge would never show without this. Batches into
  // one query per up-to-30 dealers currently in view rather than one query
  // per dealer card.
  useEffect(() => {
    const ids = matchingDealers.map((d) => d.id).slice(0, 30);
    if (ids.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "reviews"), where("dealerId", "in", ids)),
        );
        const grouped = {};
        snap.docs.forEach((d) => {
          const r = d.data();
          if (!r.dealerId) return;
          (grouped[r.dealerId] ||= []).push(r.rating || 0);
        });
        const result = {};
        Object.entries(grouped).forEach(([dealerId, ratings]) => {
          result[dealerId] = {
            avg: ratings.reduce((s, r) => s + r, 0) / ratings.length,
            count: ratings.length,
          };
        });
        if (!cancelled) setDealerRatings(result);
      } catch (err) {
        console.error("Failed to load dealer ratings:", err);
      }
    })();

    return () => { cancelled = true; };
  }, [matchingDealers]);

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
    // Demo/placeholder inventory (src/data/cars.js) — not tied to any real
    // dealer, so it can never carry a valid dealerId and was slipping
    // through to Payment.jsx as an unbookable "ghost" booking. Hidden for
    // now; flip back to `return [...cars];` if you want to reuse this list
    // later (e.g. for a "QuickWheels-owned fleet" concept), but give it a
    // real backing dealer/admin-fulfillment path before re-enabling.
    return [];
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
      {/* Ambient starfield + glow, matching profile/booking pages */}
      <div className="fl_stars" aria-hidden="true">
        <div className="fl_star_layer fl_star_layer_a"></div>
        <div className="fl_star_layer fl_star_layer_b"></div>
        <div className="fl_star_layer fl_star_layer_c"></div>
      </div>
      <div className="fl_ambient_a" aria-hidden="true"></div>
      <div className="fl_ambient_b" aria-hidden="true"></div>

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
          formatPrice={formatPrice}
        />
      )}

      {detailsDealer && (
        <DealerDetailsModal
          dealer={detailsDealer}
          carCount={getDealerCarCount(detailsDealer.id)}
          onClose={() => setDetailsDealer(null)}
        />
      )}

      {/* Title */}
      <h2 className="fleet_title fl-icon-row block">
        {selectedDealer ? (
          <>
            <IconBuilding size={22} /> {selectedDealer.businessName}
          </>
        ) : (
          "Select Your Ride!"
        )}
      </h2>

      {/* Sticky top row: booking summary (left) + dealer info card (right),
          pinned to the top of the viewport while scrolling */}
      <div className="fl-top-row">
        {bookingSummary && (
          <div className="fl-summary-bar">
            <div className="fl-summary-header">
              <span className="label fl-icon-row">
                <IconCheckCircle size={13} /> Booking Details
              </span>
              <button
                onClick={() => navigate("/booking")}
                className="fl-summary-edit-btn"
              >
                Edit
              </button>
            </div>
            <div className="fl-summary-details">
              <span className="detail fl-icon-row">
                <IconMapPin size={12} /> {bookingSummary.pickup} → {bookingSummary.dropoff}
              </span>
              <span className="detail fl-icon-row">
                <IconCalendar size={12} /> {bookingSummary.pickupDate} → {bookingSummary.dropoffDate}
              </span>
              <span className="detail fl-icon-row">
                <IconCalendarDays size={12} /> {bookingSummary.days} days · {bookingSummary.tripType}
              </span>
            </div>
          </div>
        )}

        {selectedDealer && (
          <div className="fl-dealer-info-bar">
            <div className="fl-dealer-avatar" style={{ width: 44, height: 44, fontSize: 18, overflow: "hidden" }}>
              {selectedDealer.logo ? (
                <img
                  src={selectedDealer.logo}
                  alt={selectedDealer.businessName || "Dealer"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                selectedDealer.businessName?.[0]?.toUpperCase()
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="fl-dealer-name" style={{ marginBottom: 2 }}>
                {selectedDealer.businessName}
              </p>
              <p className="fl-dealer-address fl-icon-row" style={{ margin: 0 }}>
                <IconMapPin size={11} /> {selectedDealer.city}
                {selectedDealer.state ? `, ${selectedDealer.state}` : ""} ·{" "}
                {selectedDealerCars.length} cars
                {selectedDealer.phone && (
                  <>
                    {" "}· <IconPhone size={11} /> {selectedDealer.phone}
                  </>
                )}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
              {dealerRatings[selectedDealer.id]?.count > 0 && (
                <span className="fl-dealer-rating fl-icon-row">
                  <IconStar size={13} /> {dealerRatings[selectedDealer.id].avg.toFixed(1)} ({dealerRatings[selectedDealer.id].count})
                </span>
              )}
              <button
                type="button"
                onClick={() => setDetailsDealer(selectedDealer)}
                className="fl-inline-action-btn"
                style={{ fontWeight: "600" }}
              >
                View Details
              </button>
            </div>
          </div>
        )}

        {/* {selectedDealer && (
          <button
            className="fl-back-to-fleet-btn fl-icon-row"
            onClick={() => {
              setSelectedDealer(null);
              setActiveCategory("All");
            }}
          >
            <IconArrowLeft size={13} /> Back to Fleet
          </button>
        )} */}
      </div>

      {/* Loading states */}
      {availabilityLoading && (
        <div
          style={{
            textAlign: "center",
            padding: "12px",
            color: "rgba(255,255,255,0.4)",
            fontSize: "0.85rem",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
          }}
        >
          <IconHourglass size={13} className="fl-spin-slow" /> Checking availability at {bookingSummary?.pickup}...
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
          }}
        >
          <IconHourglass size={13} className="fl-spin-slow" /> Loading partner fleet...
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          <IconBan size={13} />
          {Object.keys(unavailableCarIds).length} car
          {Object.keys(unavailableCarIds).length > 1 ? "s" : ""} booked at{" "}
          <strong>{bookingSummary?.pickup}</strong>
          <span
            className="fl-icon-row"
            style={{
              color: "rgba(255,255,255,0.3)",
              marginLeft: "6px",
              fontSize: "12px",
            }}
          >
            (open <IconCalendar size={11} /> to pick alternate dates)
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
            <IconAlertTriangle size={18} style={{ color: "#ffa500" }} />
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
                className="fl-icon-row"
                style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}
              >
                <IconCar size={14} /> {userOverlappingBookings.details?.carModel}
              </span>
              <span
                style={{
                  background: "rgba(192,132,252,0.1)",
                  border: "1px solid rgba(192,132,252,0.25)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  color: "#c084fc",
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
                  Icon: IconMapPin,
                  color: "#22c55e",
                  label: "Pickup",
                  value: userOverlappingBookings.details?.pickup,
                },
                {
                  Icon: IconMapPin,
                  color: "#ff4d4d",
                  label: "Dropoff",
                  value: userOverlappingBookings.details?.dropoff,
                },
                {
                  Icon: IconCalendar,
                  color: "#c084fc",
                  label: "Travel Dates",
                  value: `${new Date(userOverlappingBookings.details?.pickupDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} → ${new Date(userOverlappingBookings.details?.dropoffDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
                },
                {
                  Icon: IconCalendarDays,
                  color: "#ffa500",
                  label: "Duration",
                  value: `${userOverlappingBookings.details?.days} day${userOverlappingBookings.details?.days > 1 ? "s" : ""} · ${userOverlappingBookings.details?.tripType}`,
                },
              ].map(({ Icon, color, label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                  }}
                >
                  <span style={{ color, flexShrink: 0, display: "flex", marginTop: "1px" }}>
                    <Icon size={14} />
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
          <div className="fl-showroom-header">
            <h3 className="fl-showroom-title fl-icon-row">
              <IconBuilding size={15} /> Partner Showrooms
            </h3>
            <div className="fl-showroom-meta">
              {bookingSummary?.pickup && (
                <span className="fl-showroom-location">
                  near {bookingSummary.pickup}
                </span>
              )}
              <span className="fl-showroom-badge">
                {matchingDealers.length} available
              </span>
            </div>
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
                ratingInfo={dealerRatings[dealer.id]}
                onEnter={() => {
                  setSelectedDealer(dealer);
                  setActiveCategory("All");
                }}
                onViewDetails={() => setDetailsDealer(dealer)}
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
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px", color: "#ffa500" }}>
              <IconMapPin size={44} />
            </div>
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
              className="fl-icon-row"
              style={{
                padding: "8px 20px",
                background: "rgba(192,132,252,0.1)",
                border: "1px solid rgba(192,132,252,0.3)",
                borderRadius: "10px",
                color: "#c084fc",
                cursor: "pointer",
                fontFamily: "Quicksand,sans-serif",
                fontWeight: "600",
                margin: "0 auto",
                justifyContent: "center",
              }}
            >
              <IconClipboardCheck size={13} /> Change Pickup Location
            </button>
          </div>
        )}

      {/* ── DEALER SHOWROOM INFO BAR (was here; moved into the sticky
           .fl-top-row above so it sits beside Booking Details and stays
           pinned while scrolling, instead of scrolling away separately) ── */}

      {/* ── CATEGORY FILTER + SORT — combined row, sort on the right ── */}
      {(selectedDealer || baseList.length > 0) && (
        <div className="fl-filter-row">
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
        </div>
      )}

      {/* ── EMPTY STATE: genuinely nothing to show — no dealers exist in
           the system at all (not "no dealers near you", that's the block
           below already). This only fires when neither the Partner
           Showrooms grid nor the "No Partner Showrooms in X" block above
           is rendering, so it never stacks under/duplicates them. ── */}
      {!selectedDealer &&
        matchingDealers.length === 0 &&
        filtered.length === 0 &&
        !dealerCarsLoading &&
        !bookingSummary?.pickup && (
          <div className="fl-empty-state">
            <div className="fl-empty-icon" style={{ display: "flex", justifyContent: "center", color: "rgba(255,255,255,0.3)" }}>
              <IconCar size={44} />
            </div>
            <p className="fl-empty-text">
              Enter a pickup location above to see cars available to book.
            </p>
          </div>
        )}

      {/* ── EMPTY STATE inside dealer showroom ── */}
      {selectedDealer && filtered.length === 0 && (
        <div className="fl-empty-state">
          <div className="fl-empty-icon" style={{ display: "flex", justifyContent: "center", color: "rgba(255,255,255,0.3)" }}>
            <IconCar size={44} />
          </div>
          <p className="fl-empty-text">
            {activeCategory === "All"
              ? "This showroom has no cars available right now"
              : `No ${activeCategory} cars in this showroom`}
          </p>
          {activeCategory !== "All" && (
            <button
              onClick={() => setActiveCategory("All")}
              className="fl-inline-action-btn"
              style={{
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
        {filtered.map((car, carIdx) => {
          const isUserOverlapping = userOverlappingBookings.allCars === true;
          const isUnavailable = !!unavailableCarIds[car.id];
          const isCurrentlyBooked = car.id === currentlyBookedCarId;
          return (
            <CarCard
              key={car.id ? `${car.id}-${carIdx}` : carIdx}
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