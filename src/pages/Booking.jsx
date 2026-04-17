import { useState, useEffect } from "react";
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
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      alert("Please sign in to book a car");
      navigate("/signin");
    }
  }, [user]);

  useEffect(() => {
    const car = localStorage.getItem("selectedCar");
    if (car) setSelectedCar(JSON.parse(car));
  }, []);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const { pickup, dropoff, pickupDate, dropoffDate } = formData;

    if (!pickup || !dropoff || !pickupDate || !dropoffDate) {
      alert("Please fill all fields");
      return;
    }

    // ✅ date validation lives HERE inside handleSubmit
    const pickup_ = new Date(pickupDate);
    const dropoff_ = new Date(dropoffDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (pickup_ < today) {
      alert("Pickup date cannot be in the past");
      return;
    }
    if (dropoff_ <= pickup_) {
      alert("Drop-off date must be at least 1 day after pickup date");
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
          {/* LEFT SIDE (GIF) */}
          <div className="booking_left">
            <p>
              Fill out the form below to reserve your vehicle. Whether it's for
              a business trip, vacation, or daily commute,{" "}
              <strong>Quick Wheels</strong> offers a variety of vehicles to suit
              your needs.
            </p>
            <img src="../Images/Book Your Ride Now!.gif" alt="Car animation" />
          </div>

          {/* RIGHT SIDE (FORM) */}
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
                <div className="input-group pickup">
                  <input
                    type="text"
                    name="pickup"
                    value={formData.pickup}
                    onChange={handleChange}
                    placeholder="Select Pickup Location"
                    list="locations"
                    required
                  />
                </div>
                <div className="input-group dropoff">
                  <input
                    type="text"
                    name="dropoff"
                    value={formData.dropoff}
                    onChange={handleChange}
                    placeholder="Select Drop-off Location"
                    list="locations"
                    required
                  />
                </div>
                <datalist id="locations">
                  {locations.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
                <div className="trip_type_header">Trip Type</div>{" "}
                {/* New Label outside */}
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
                <label>Pick-Up Date</label>
                <input
                  type="date"
                  name="pickupDate"
                  value={formData.pickupDate}
                  onChange={handleChange}
                  required
                />

                <label>Drop-Off Date</label>
                <input
                  type="date"
                  name="dropoffDate"
                  value={formData.dropoffDate}
                  onChange={handleChange}
                  required
                />
              </fieldset>

              <button type="submit" className="form_btn btn">
                Confirm
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Booking;
