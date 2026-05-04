import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/booking.css";

const locations = [
  "Amsterdam, Netherlands",
  "Bangkok, Thailand",
  "Barcelona, Spain",
  "Berlin, Germany",
  "Boston, MA, USA",
  "Buenos Aires, Argentina",
  "Chicago, IL, USA",
  "Dubai, UAE",
  "Hong Kong, China",
  "Istanbul, Turkey",
  "Las Vegas, NV, USA",
  "London, UK",
  "Los Angeles, CA, USA",
  "Madrid, Spain",
  "Mexico City, Mexico",
  "Miami, FL, USA",
  "New York, NY, USA",
  "Paris, France",
  "Rome, Italy",
  "San Francisco, CA, USA",
  "Sao Paulo, Brazil",
  "Seattle, WA, USA",
  "Singapore, Singapore",
  "Sydney, Australia",
  "Tokyo, Japan",
  "Toronto, Canada",
  "Venice, Italy",
  "Vienna, Austria",
  "Washington, D.C., USA",
  "Zurich, Switzerland",
];

function Booking() {
  const { user } = useAuth();
  const [selectedCar, setSelectedCar] = useState(null);
  const [formData, setFormData] = useState({
    pickup: "",
    dropoff: "",
    tripType: "round-trip",
    pickupDate: "",
    dropoffDate: "",
  });
  const [openDropdown, setOpenDropdown] = useState(null); // 'pickup' | 'dropoff' | null
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // Refs for dropdowns
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsidePickup =
        pickupRef.current && !pickupRef.current.contains(event.target);
      const clickedOutsideDropoff =
        dropoffRef.current && !dropoffRef.current.contains(event.target);

      // only close if clicked outside BOTH
      if (clickedOutsidePickup && clickedOutsideDropoff) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/signin");
    }
  }, [user, navigate]);

  useEffect(() => {
    const car = localStorage.getItem("selectedCar");
    if (car) setSelectedCar(JSON.parse(car));

    const saved = localStorage.getItem("bookingData");
    if (saved) {
      const parsed = JSON.parse(saved);
      setFormData(parsed);
    }
  }, []);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 1);
  const maxDateStr = maxDate.toISOString().split("T")[0];
  const currentYear = today.getFullYear();

  function handleReset() {
    setFormData({
      pickup: "",
      dropoff: "",
      tripType: "round-trip",
      pickupDate: "",
      dropoffDate: "",
    });
    setErrors({});
    localStorage.removeItem("bookingData");
    setSelectedCar(null);
    localStorage.removeItem("selectedCar");
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  }

  function handleLocationSelect(type, location) {
    setFormData({ ...formData, [type]: location });
    if (errors[type]) {
      setErrors({ ...errors, [type]: "" });
    }
    setOpenDropdown(null);
  }

  function isValidLocation(value) {
    return locations.includes(value);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const { pickup, dropoff, pickupDate, dropoffDate } = formData;
    const newErrors = {};

    if (!isValidLocation(pickup)) {
      newErrors.pickup = "Please select a valid location from the list.";
    }
    if (!isValidLocation(dropoff)) {
      newErrors.dropoff = "Please select a valid location from the list.";
    }

    const pickup_ = new Date(pickupDate);
    const dropoff_ = new Date(dropoffDate);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    if (!pickupDate) {
      newErrors.pickupDate = "Please select a pickup date.";
    } else if (pickup_ < todayMidnight) {
      newErrors.pickupDate = "Pickup date cannot be in the past.";
    } else if (pickup_.getFullYear() !== currentYear) {
      newErrors.pickupDate = `Booking must be within ${currentYear}.`;
    }

    if (!dropoffDate) {
      newErrors.dropoffDate = "Please select a drop-off date.";
    } else if (dropoff_ <= pickup_) {
      newErrors.dropoffDate = "Drop-off must be at least 1 day after pickup.";
    } else if (dropoff_ > maxDate) {
      newErrors.dropoffDate = "Maximum rental period is 1 month.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const days = Math.ceil((dropoff_ - pickup_) / (1000 * 60 * 60 * 24));
    localStorage.setItem("bookingData", JSON.stringify({ ...formData, days }));
    navigate("/fleet");
  }

  return (
    <main>
      <section className="booking_section">
        <div className="booking_wrapper">
          <div className="booking_left">
            <p>
              Fill out the form below to reserve your vehicle.{" "}
              <strong>Quick Wheels</strong> offers a variety of vehicles to suit
              your needs.
            </p>
            <img src="/Images/Book Your Ride Now!.gif" alt="Car animation" />
          </div>

          <div className="input_field">
            <form onSubmit={handleSubmit}>
              <h1>Book Your Ride Now!</h1>

              {selectedCar && (
                <div className="selected_car_preview">
                  <p>
                    Selected Car: <strong>{selectedCar.model}</strong>
                  </p>
                  <p>
                    Price: <strong>{selectedCar.price} USD/Day</strong>
                  </p>
                </div>
              )}

              <fieldset className="pickdrop">
                {/* Pickup Dropdown */}
                <div className="custom_select_container" ref={pickupRef}>
                  <div
                    className={`location_select ${openDropdown === "pickup" ? "active" : ""}`}
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === "pickup" ? null : "pickup",
                      )
                    }
                  >
                    <span>{formData.pickup || "Select Pickup Location"}</span>
                    <span className="arrow_icon">▼</span>
                  </div>
                  {openDropdown === "pickup" && (
                    <div className="custom_location_list">
                      {locations.map((loc) => (
                        <div
                          key={loc}
                          className="location_option"
                          onClick={() => handleLocationSelect("pickup", loc)}
                        >
                          {loc}
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.pickup && (
                    <p className="field_error">{errors.pickup}</p>
                  )}
                </div>

                {/* Dropoff Dropdown */}
                <div className="custom_select_container" ref={dropoffRef}>
                  <div
                    className={`location_select ${openDropdown === "dropoff" ? "active" : ""}`}
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === "dropoff" ? null : "dropoff",
                      )
                    }
                  >
                    <span>
                      {formData.dropoff || "Select Drop-off Location"}
                    </span>
                    <span className="arrow_icon">▼</span>
                  </div>
                  {openDropdown === "dropoff" && (
                    <div className="custom_location_list">
                      {locations.map((loc) => (
                        <div
                          key={loc}
                          className="location_option"
                          onClick={() => handleLocationSelect("dropoff", loc)}
                        >
                          {loc}
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.dropoff && (
                    <p className="field_error">{errors.dropoff}</p>
                  )}
                </div>

                <div className="trip_type_header">Trip Type</div>
                <div className="input-group trip-type">
                  <label>
                    <input
                      type="radio"
                      name="tripType"
                      value="round-trip"
                      checked={formData.tripType === "round-trip"}
                      onChange={handleChange}
                    />
                    Round Trip
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="tripType"
                      value="one-way"
                      checked={formData.tripType === "one-way"}
                      onChange={handleChange}
                    />
                    One Way
                  </label>
                </div>
              </fieldset>

              <fieldset className="pickup-dropoff-dates">
                <div>
                  <label>Pick-Up Date</label>
                  <input
                    type="date"
                    name="pickupDate"
                    value={formData.pickupDate}
                    onChange={handleChange}
                    min={todayStr}
                    max={maxDateStr}
                    required
                  />
                  {errors.pickupDate && (
                    <p className="field_error">{errors.pickupDate}</p>
                  )}
                </div>
                <div>
                  <label>Drop-Off Date</label>
                  <input
                    type="date"
                    name="dropoffDate"
                    value={formData.dropoffDate}
                    onChange={handleChange}
                    min={formData.pickupDate || todayStr}
                    max={maxDateStr}
                    required
                  />
                  {errors.dropoffDate && (
                    <p className="field_error">{errors.dropoffDate}</p>
                  )}
                </div>
              </fieldset>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleReset}
                    className="secondary_btn"
                  >
                    Reset
                  </button>
                  <button type="submit" className="form_btn btn">
                    Confirm
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Booking;