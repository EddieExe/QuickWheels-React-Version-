import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import cars from "../data/cars";
import "../styles/fleet.css";

const categories = [
  "All",
  "Sedan",
  "Convertible",
  "SUV",
  "Luxury",
  "Pickup",
  "Van",
];

const sortOptions = [
  { value: "default", label: "Default" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "seats", label: "Most Seats" },
];

function ValidationModal({ onClose, onGoToBooking }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
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
              background: "linear-gradient(30deg, #0400ff, #4ce3f7)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              padding: "12px 24px",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: "Quicksand, sans-serif",
              fontSize: "0.95rem",
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
              fontFamily: "Quicksand, sans-serif",
              fontSize: "0.95rem",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CarCard({ car, onSelect }) {
  return (
    <div className="fleet_card">
      <img className="fleet_card_image" src={car.image} alt={car.model} />
      <div className="fleet_card_info">
        <h3 className="fleet_card_model">{car.model}</h3>
        <div className="fleet_card_specs">
          <div className="fleet_spec_item">
            <img
              className="fleet_spec_icon"
              src="/Images/people.png"
              alt="Seats"
            />
            <span className="fleet_spec_text">{car.seats} Seats</span>
          </div>
          <div className="fleet_spec_item">
            <img
              className="fleet_spec_icon"
              src="/Images/travel-luggage.png"
              alt="Bags"
            />
            <span className="fleet_spec_text">{car.bags}</span>
          </div>
          <div className="fleet_spec_item">
            <img
              className="fleet_spec_icon"
              src="/Images/transmission.png"
              alt="Transmission"
            />
            <span className="fleet_spec_text">{car.transmission}</span>
          </div>
          <div className="fleet_spec_item">
            <img
              className="fleet_spec_icon"
              src="/Images/fuel.png"
              alt="Range"
            />
            <span className="fleet_spec_text">{car.range}</span>
          </div>
        </div>
        <p className="fleet_card_cost">${car.price} USD/Day</p>
        <button className="fleet_book_btn btn" onClick={() => onSelect(car)}>
          Book Now
        </button>
      </div>
    </div>
  );
}

function Fleet() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [showModal, setShowModal] = useState(false);
  const [bookingSummary, setBookingSummary] = useState(null);
  const navigate = useNavigate();

  // clear expired booking data on mount
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
  }, []);

  function isBookingComplete() {
    const bookingData = localStorage.getItem("bookingData");
    if (!bookingData) return false;

    try {
      const { pickup, dropoff, pickupDate, dropoffDate } =
        JSON.parse(bookingData);

      // all fields must exist
      if (!pickup || !dropoff || !pickupDate || !dropoffDate) return false;

      // dates must not be expired
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pickup_ = new Date(pickupDate);
      const dropoff_ = new Date(dropoffDate);

      if (pickup_ < today) return false;
      if (dropoff_ <= pickup_) return false;

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
    navigate("/addons");
  }

  function handleGoToBooking() {
    setShowModal(false);
    navigate("/booking");
  }

  // filter
  let filtered =
    activeCategory === "All"
      ? [...cars]
      : cars.filter((car) => car.type === activeCategory);

  // sort
  if (sortBy === "price_low") filtered.sort((a, b) => a.price - b.price);
  else if (sortBy === "price_high") filtered.sort((a, b) => b.price - a.price);
  else if (sortBy === "seats") filtered.sort((a, b) => b.seats - a.seats);

  return (
    <section className="fleet_section">
      {showModal && (
        <ValidationModal
          onClose={() => setShowModal(false)}
          onGoToBooking={handleGoToBooking}
        />
      )}

      <h2 className="fleet_title">Select Your Ride!</h2>

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
              fontFamily: "Quicksand, sans-serif",
              fontWeight: "600",
            }}
          >
            Edit
          </button>
        </div>
      )}

      {/* Category filter */}
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

      {/* Sort */}
      <div className="fleet_sort_wrapper">
        <label style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
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

      <div className="fleet_cards_wrapper">
        {filtered.map((car) => (
          <CarCard key={car.id} car={car} onSelect={handleSelectCar} />
        ))}
      </div>
    </section>
  );
}

export default Fleet;
