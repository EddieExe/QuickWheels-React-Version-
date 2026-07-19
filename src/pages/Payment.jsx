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
        <div style={{ fontSize: "52px", marginBottom: "16px" }}>⚠️</div>
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
          <p style={{ color: "#ffa500", margin: "0 0 8px", fontWeight: "700" }}>
            🚗 Your Existing Booking:
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
        <div style={{ fontSize: "52px", marginBottom: "16px" }}>🚫</div>
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
  background: "linear-gradient(30deg,#0400ff,#4ce3f7)",
  border: "none",
  borderRadius: "10px",
  color: "#fff",
  padding: "11px 22px",
  fontWeight: "700",
  cursor: "pointer",
  fontFamily: "Quicksand,sans-serif",
  fontSize: "14px",
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
};
const receiptBadge = {
  padding: "3px 8px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: "600",
  color: "rgba(255,255,255,0.7)",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background: "linear-gradient(135deg,#0a0a1a,#0d0d20)",
        fontFamily: "Quicksand,sans-serif",
      }}
    >
      <div style={{ maxWidth: "620px", width: "100%" }}>
        {/* ── Success badge ── */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg,rgba(34,197,94,0.2),rgba(76,227,247,0.1))",
              border: "2px solid rgba(34,197,94,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              margin: "0 auto 16px",
            }}
          >
            ✅
          </div>
          <h1
            style={{ color: "#22c55e", margin: "0 0 8px", fontSize: "1.8rem" }}
          >
            Booking Request Sent!
          </h1>
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
        <div
          style={{
            background: "linear-gradient(135deg,#1a1a2e,#12122a)",
            border: "1px solid rgba(76,227,247,0.2)",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          {/* Receipt header */}
          <div
            style={{
              background:
                "linear-gradient(135deg,rgba(4,0,255,0.15),rgba(76,227,247,0.08))",
              padding: "20px 28px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#4ce3f7",
                  fontWeight: "700",
                  fontSize: "1rem",
                }}
              >
                🧾 Booking Receipt
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
            <div
              style={{
                background: "rgba(76,227,247,0.1)",
                border: "1px solid rgba(76,227,247,0.3)",
                borderRadius: "8px",
                padding: "6px 14px",
                color: "#4ce3f7",
                fontWeight: "700",
                fontSize: "13px",
              }}
            >
              {bookingId}
            </div>
          </div>

          <div style={{ padding: "24px 28px" }}>
            {/* ── Customer info ── */}
            <Section title="👤 Customer Details">
              <Row label="Name" value={userName} />
              <Row label="Email" value={userEmail} />
            </Section>

            {/* ── Vehicle ── */}
            {/* ── Vehicle ── */}
            <Section title="🚗 Vehicle">
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
                    <span style={receiptBadge}>
                      🚘 {booking.carNumberPlate}
                    </span>
                  )}
                  {booking.carSafetyRating > 0 && (
                    <span
                      style={{
                        ...receiptBadge,
                        color: "#fbbf24",
                        background: "rgba(251,191,36,0.1)",
                        borderColor: "rgba(251,191,36,0.2)",
                      }}
                    >
                      ⭐ {booking.carSafetyRating}/5
                    </span>
                  )}
                  {booking.carEmergencyKit && (
                    <span
                      style={{
                        ...receiptBadge,
                        color: "#22c55e",
                        background: "rgba(34,197,94,0.1)",
                        borderColor: "rgba(34,197,94,0.2)",
                      }}
                    >
                      🩹 Kit
                    </span>
                  )}
                  {booking.carGpsAvailable && (
                    <span
                      style={{
                        ...receiptBadge,
                        color: "#4ce3f7",
                        background: "rgba(76,227,247,0.1)",
                        borderColor: "rgba(76,227,247,0.2)",
                      }}
                    >
                      🛰️ GPS
                    </span>
                  )}
                </div>
              )}
            </Section>

            {/* ── Trip details ── */}
            <Section title="📍 Trip Details">
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
              <Section title="➕ Add-ons">
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
            <Section title="💰 Price Breakdown">
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
                    color: "#4ce3f7",
                    fontWeight: "700",
                    fontSize: "1.1rem",
                  }}
                >
                  {formatPrice(total)}
                </span>
              </div>
            </Section>

            {/* ── Payment note ── */}
            <div
              style={{
                background: "rgba(255,165,0,0.08)",
                border: "1px solid rgba(255,165,0,0.25)",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "24px",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  color: "#ffa500",
                  fontWeight: "700",
                  fontSize: "13px",
                }}
              >
                💳 Payment Information
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

            {/* ── Status timeline ── */}
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "16px 18px",
                marginBottom: "24px",
              }}
            >
              <p
                style={{
                  margin: "0 0 12px",
                  color: "#4ce3f7",
                  fontWeight: "700",
                  fontSize: "13px",
                }}
              >
                📋 Booking Status
              </p>
              {[
                { icon: "✅", label: "Booking Request Sent", active: true },
                { icon: "⏳", label: "Awaiting Dealer Approval", active: true },
                {
                  icon: "📧",
                  label: "Confirmation Email on Approval",
                  active: false,
                },
                { icon: "🚗", label: "Pick Up Your Car", active: false },
              ].map(({ icon, label, active }, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{icon}</span>
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
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={onViewBookings}
                style={{ ...btnPrimary, flex: 1 }}
              >
                📋 View My Bookings
              </button>
              <button onClick={onHome} style={{ ...btnSecondary, flex: 1 }}>
                🏠 Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Small receipt helpers
// ─────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <p
        style={{
          margin: "0 0 10px",
          color: "#4ce3f7",
          fontWeight: "700",
          fontSize: "13px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </p>
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          padding: "12px 16px",
        }}
      >
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
  const { currency, symbol, formatPrice } = useCurrency();
  const [selectedCar, setSelectedCar] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [overlapDetails, setOverlapDetails] = useState(null);
  const [completedBooking, setCompletedBooking] = useState(null); // receipt data
  const [dealerInfo, setDealerInfo] = useState(null); // ← ADD THIS
  const [formData, setFormData] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    phone: "",
  });
  // Mock payment method state
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const navigate = useNavigate();

  const addonsList = [
    { id: 1, name: "Child Safety Seats", price: 10, icon: "🪑" },
    { id: 2, name: "Wi-Fi Hotspot", price: 8, icon: "📶" },
    { id: 3, name: "Roadside Assistance", price: 15, icon: "🛠️" },
    { id: 4, name: "Insurance Package", price: 20, icon: "🛡️" },
  ];

  const paymentMethods = [
    {
      id: "cash",
      label: "Cash at Pickup",
      icon: "💵",
      note: "Pay in cash when you pick up the car",
    },
    {
      id: "card",
      label: "Card at Pickup",
      icon: "💳",
      note: "Credit or debit card accepted at branch",
    },
    {
      id: "upi",
      label: "UPI at Pickup",
      icon: "📱",
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

      // ── 2. Create booking ─────────────────────────────────
      const bookingId = "QW-" + Date.now();
      const approvalDeadline = new Date(Date.now() + 60 * 60 * 1000); // 60 min
      const now = new Date();

      const newBooking = {
        bookingId,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        carId: selectedCar.id,
        carModel: selectedCar.model,
        carImage: selectedCar.image || "",
        dealerId: selectedCar.dealerId || null,
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
        <h1 style={{ margin: "30px" }}>Review & Confirm Booking</h1>
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
              <h2>👤 Driver's Information</h2>
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
                        <p className="warning_text">
                          ⚠️ Please add your phone number in your profile first
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
              <h2>💳 Payment Method</h2>
              <div className="blueline" />
            </div>
            <div style={{ padding: "30px" }}>
              <p
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "13px",
                  margin: "0 0 18px",
                  lineHeight: "1.5",
                }}
              >
                All payments are collected{" "}
                <strong style={{ color: "#4ce3f7" }}>
                  at the pickup branch
                </strong>
                . Choose your preferred payment method below.
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {paymentMethods.map((pm) => {
                  const isActive = paymentMethod === pm.id;
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
                          ? "rgba(76,227,247,0.08)"
                          : "rgba(255,255,255,0.03)",
                        border: isActive
                          ? "1.5px solid rgba(76,227,247,0.5)"
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
                          border: `2px solid ${isActive ? "#4ce3f7" : "rgba(255,255,255,0.25)"}`,
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
                              background: "#4ce3f7",
                            }}
                          />
                        )}
                      </div>
                      <span style={{ fontSize: "20px" }}>{pm.icon}</span>
                      <div>
                        <p
                          style={{
                            margin: 0,
                            color: isActive ? "#4ce3f7" : "#fff",
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
                <span style={{ fontSize: "16px" }}>🔒</span>
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
                  background: "rgba(76,227,247,0.05)",
                  border: "1px solid rgba(76,227,247,0.15)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    color: "#4ce3f7",
                    fontWeight: "700",
                    fontSize: "13px",
                  }}
                >
                  ℹ️ What happens next?
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
            <h2>📋 Booking Summary</h2>
            <div className="blueline" />
          </div>

          <div className="booking_content">
            {/* Vehicle */}
            <div className="payment_booking_section">
              <h3>🚗 Vehicle</h3>
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
            </div>

            {/* Phase 2: Vehicle Features & Safety */}
            {(selectedCar?.safetyRating > 0 ||
              selectedCar?.emergencyKit ||
              selectedCar?.gpsAvailable ||
              selectedCar?.numberPlate) && (
              <div className="payment_booking_section">
                <h3>🛡️ Vehicle Features</h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "12px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "10px",
                  }}
                >
                  {/* Safety Rating */}
                  {selectedCar?.safetyRating > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "12px",
                          minWidth: "80px",
                        }}
                      >
                        Safety Rating
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            style={{
                              fontSize: "14px",
                              color:
                                star <= selectedCar.safetyRating
                                  ? "#fbbf24"
                                  : "rgba(255,255,255,0.2)",
                            }}
                          >
                            ★
                          </span>
                        ))}
                        <span
                          style={{
                            marginLeft: "4px",
                            color: "#fbbf24",
                            fontSize: "12px",
                            fontWeight: "700",
                          }}
                        >
                          {selectedCar.safetyRating}/5
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Number Plate */}
                  {selectedCar?.numberPlate && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "12px",
                          minWidth: "80px",
                        }}
                      >
                        Number Plate
                      </span>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: "12px",
                          fontFamily: "monospace",
                          fontWeight: "600",
                          background: "rgba(255,255,255,0.05)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        🚘 {selectedCar.numberPlate}
                      </span>
                    </div>
                  )}

                  {/* Emergency Kit */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: "12px",
                        minWidth: "80px",
                      }}
                    >
                      Emergency Kit
                    </span>
                    <span
                      style={{
                        color: selectedCar?.emergencyKit
                          ? "#22c55e"
                          : "rgba(255,255,255,0.4)",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {selectedCar?.emergencyKit
                        ? "🩹 Available"
                        : "❌ Not Available"}
                    </span>
                  </div>

                  {/* GPS */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: "12px",
                        minWidth: "80px",
                      }}
                    >
                      GPS Tracking
                    </span>
                    <span
                      style={{
                        color: selectedCar?.gpsAvailable
                          ? "#4ce3f7"
                          : "rgba(255,255,255,0.4)",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {selectedCar?.gpsAvailable
                        ? "🛰️ Available"
                        : "❌ Not Available"}
                    </span>
                  </div>

                  {/* Last Service Date */}
                  {selectedCar?.lastServiceDate && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "12px",
                          minWidth: "80px",
                        }}
                      >
                        Last Serviced
                      </span>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        🔧{" "}
                        {new Date(
                          selectedCar.lastServiceDate,
                        ).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}

                  {/* PUC Certificate */}
                  {selectedCar?.pucCertificate && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "12px",
                          minWidth: "80px",
                        }}
                      >
                        PUC Valid Until
                      </span>
                      <span
                        style={{
                          color: "#22c55e",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        ✅{" "}
                        {new Date(
                          selectedCar.pucCertificate,
                        ).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trip Details — NOW INCLUDES DATES */}
            <div className="payment_booking_section">
              <h3>📍 Trip Details</h3>
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

            {/* Add-ons */}
            <div className="payment_booking_section">
              <h3>➕ Add-ons</h3>
              <div className="payment_addons_grid">
                {addonsList.map((addon) => {
                  const isSelected = selectedAddons.some(
                    (a) => a.id === addon.id,
                  );
                  return (
                    <div
                      key={addon.id}
                      className={`payment_addon_card ${isSelected ? "is_selected" : ""}`}
                      onClick={() => toggleAddon(addon)}
                    >
                      <div className="payment_addon_info">
                        <p className="payment_addon_name">
                          <span style={{ marginRight: "6px" }}>
                            {addon.icon}
                          </span>
                          {isSelected && (
                            <span className="payment_check_icon">✓ </span>
                          )}
                          {addon.name}
                        </p>
                        <p className="payment_addon_price">
                          +{formatPrice(addon.price * days)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price breakdown */}
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
              {/* Tax note */}
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
                `✅ Confirm Booking · ${formatPrice(finalTotalUSD)}`
              )}
            </button>

            {!formData.phone && (
              <p
                style={{
                  textAlign: "center",
                  marginTop: "8px",
                  color: "#ff4d4d",
                  fontSize: "12px",
                }}
              >
                ⚠️ Add your phone number in{" "}
                <span
                  style={{
                    color: "#4ce3f7",
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
