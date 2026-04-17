import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendBookingReceipt } from "../utils/emailService";
import { useAuth } from "../context/AuthContext";
import "../styles/payment.css";

function Payment() {
  const { user } = useAuth();
  const [selectedCar, setSelectedCar] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [formData, setFormData] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    phone: localStorage.getItem(`phone_${user?.uid}`) || "",
  });
  const [orderPlaced, setOrderPlaced] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const car = localStorage.getItem("selectedCar");
    const booking = localStorage.getItem("bookingData");
    const addons = localStorage.getItem("selectedAddons");

    if (car) setSelectedCar(JSON.parse(car));
    if (booking) setBookingData(JSON.parse(booking));
    if (addons) setSelectedAddons(JSON.parse(addons));
  }, []);

  const carTotal =
    selectedCar && bookingData ? selectedCar.price * bookingData.days : 0;

  const addonsTotal = selectedAddons.reduce(
    (total, addon) => total + addon.price * (bookingData?.days || 1),
    0,
  );

  const finalTotal = carTotal + addonsTotal;

  async function handleConfirm(e) {
    e.preventDefault();

    const { name, email, phone } = formData;
    if (!name || !email || !phone) {
      alert("Please fill all driver details");
      return;
    }
    if (!selectedCar || !bookingData) {
      alert("Booking data missing. Please start again.");
      return;
    }

    const bookingId = "QW-" + Date.now();

    const newBooking = {
      bookingId,
      carModel: selectedCar.model,
      pickup: bookingData.pickup,
      dropoff: bookingData.dropoff,
      days: bookingData.days,
      total: finalTotal,
      date: new Date().toLocaleDateString(),
    };

    const existing = JSON.parse(localStorage.getItem("bookingHistory") || "[]");
    localStorage.setItem(
      "bookingHistory",
      JSON.stringify([newBooking, ...existing]),
    );

    try {
      await sendBookingReceipt({
        name,
        email,
        carModel: selectedCar.model,
        pickup: bookingData.pickup,
        dropoff: bookingData.dropoff,
        days: bookingData.days,
        tripType: bookingData.tripType,
        addons: selectedAddons,
        carTotal,
        addonsTotal,
        total: finalTotal,
        bookingId,
      });
    } catch (error) {
      console.error("Receipt email error:", error);
    }

    localStorage.removeItem("selectedCar");
    localStorage.removeItem("bookingData");
    localStorage.removeItem("selectedAddons");
    setOrderPlaced(true);
  }

  if (orderPlaced) {
    return (
      <div className="payment_container">
        <div className="modal-content">
          <h1>🎉 Booking Confirmed!</h1>
          <p>
            Thank you, <strong>{formData.name}</strong>!
          </p>
          <p>
            A confirmation has been sent to <strong>{formData.email}</strong>
          </p>
          <button className="order_btn btn" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="payment_container">
      {/* Title at the top center */}
      <div className="payment_title">
        <h1>Payment Gateway</h1>
      </div>

      {/* Two column grid below the title */}
      <div className="payment_grid">
        {/* Left Side - Driver Information */}
        <div className="driver_info_card">
          <div className="card_header">
            <h2>Driver's Information</h2>
            <div className="blueline"></div>
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

            <div className="info_row">
              <label>Email Address</label>
              <div className="info_value">
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="disabled_input"
                />
              </div>
            </div>

            <div className="info_row">
              <label>Phone Number</label>
              <div className="info_value">
                <input
                  type="tel"
                  value={formData.phone}
                  disabled
                  className="disabled_input"
                />
                {!formData.phone && (
                  <p className="warning_text">
                    ⚠️ Please add your phone number in your profile first
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Booking Summary */}
        <div className="booking_summary_card">
          <div className="card_header">
            <h2>Your Booking</h2>
            <div className="blueline"></div>
          </div>

          <div className="booking_content">
            {/* Car Section */}
            <div className="payment_booking_section">
              <h3>Vehicle Details</h3>
              <div className="payment_car_info">
                <img
                  src={selectedCar?.image}
                  alt={selectedCar?.model}
                  className="summary_car_image"
                />
                <div className="car_details_text">
                  <p className="car_model_name">{selectedCar?.model}</p>
                  <p className="car_price">
                    {selectedCar?.price} USD <span>/ day</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="payment_booking_section">
              <h3>Trip Details</h3>
              <div className="trip_info">
                <div className="trip_row">
                  <span>Pickup:</span>
                  <strong>{bookingData?.pickup}</strong>
                </div>
                <div className="trip_row">
                  <span>Dropoff:</span>
                  <strong>{bookingData?.dropoff}</strong>
                </div>
                <div className="trip_row">
                  <span>Duration:</span>
                  <strong>{bookingData?.days} days</strong>
                </div>
              </div>
            </div>

            {/* Add-ons */}
            {selectedAddons.length > 0 && (
              <div className="payment_booking_section">
                <h3>Add-ons</h3>
                <div className="addons_list">
                  {selectedAddons.map((addon) => (
                    <div className="addon_row" key={addon.id}>
                      <span>{addon.name}</span>
                      <strong>
                        +{addon.price * (bookingData?.days || 1)} USD
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price Summary */}
            <div className="price_summary">
              <div className="price_row">
                <span>Car Rental ({bookingData?.days} days)</span>
                <span>{carTotal} USD</span>
              </div>
              {selectedAddons.length > 0 && (
                <div className="price_row">
                  <span>Add-ons Total</span>
                  <span>{addonsTotal} USD</span>
                </div>
              )}
              <div className="price_row total">
                <span>Total Amount</span>
                <strong>{finalTotal} USD</strong>
              </div>
            </div>

            {/* Confirm Button */}
            <button className="confirm_btn btn" onClick={handleConfirm}>
              Confirm Your Order →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Payment;
