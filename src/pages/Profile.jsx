import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile, updatePassword, deleteUser } from "firebase/auth";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import "../styles/profile.css";
import "../styles/header.css";

function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("personal");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bookingHistory, setBookingHistory] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchBookings() {
      try {
        const q = query(
          collection(db, "bookings"),
          where("userId", "==", user.uid),
        );
        const snapshot = await getDocs(q);
        const bookings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // sort by date — newest first
        bookings.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
        setBookingHistory(bookings);
      } catch (err) {
        console.error("Error fetching bookings:", err);
      }
    }
    if (user) fetchBookings();
  }, [user]);

  // Add auto-dismiss for messages
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage("");
        setError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  const [personalData, setPersonalData] = useState({
    displayName: user?.displayName || "",
    phone: localStorage.getItem(`phone_${user?.uid}`) || "",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  async function handleUpdateProfile(e) {
    e.preventDefault();
    try {
      await updateProfile(user, { displayName: personalData.displayName });
      localStorage.setItem(`phone_${user.uid}`, personalData.phone);
      setMessage("Profile updated successfully!");
      setError("");
    } catch (err) {
      setError("Failed to update profile.");
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const { newPassword, confirmPassword } = passwordData;
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    try {
      await updatePassword(user, newPassword);
      setMessage("Password changed successfully!");
      setError("");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (err) {
      setError("Please sign in again before changing password.");
    }
  }

  function handleDeleteClick() {
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirmed() {
    try {
      localStorage.removeItem(`phone_${user.uid}`);
      localStorage.removeItem("bookingHistory");
      await deleteUser(user);
      await logout();
      navigate("/");
    } catch (err) {
      setShowDeleteConfirm(false);
      setError("Please sign out and sign in again before deleting account.");
    }
  }

  const tabs = [
    { id: "personal", label: "Personal Details" },
    { id: "password", label: "Change Password" },
    { id: "bookings", label: "Booking History" },
    { id: "danger", label: "Account" },
  ];

  return (
    <div className="profile_page_wrapper">
      <div className="profile_page_container">
        <button onClick={() => navigate(-1)} className="back_btn_animate">
          <div className="back_btn_inner">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back</span>
          </div>
        </button>

        <h1 className="profile_title">
          <strong>My Profile</strong>
        </h1>
        <p
          className="user_email"
          style={{ marginBottom: "30px", paddingLeft: "5px" }}
        >
          {user?.email}
        </p>

        <div className="tabs_container">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`glass_nav_btn ${activeTab === tab.id ? "active" : ""}`}
              style={{ flex: 1, height: "45px" }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feedback Messages with Smooth Transitions */}
        {(message || error) && (
          <div
            className={`feedback_message ${message ? "success" : "error"} show`}
          >
            {message || error}
          </div>
        )}

        <div className="glass_card">
          <div className="glass_card_inner">
            {activeTab === "personal" && (
              <form onSubmit={handleUpdateProfile}>
                <div className="form_group">
                  <label className="form_label">Full Name</label>
                  <input
                    className="form_input"
                    type="text"
                    value={personalData.displayName}
                    onChange={(e) =>
                      setPersonalData({
                        ...personalData,
                        displayName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form_row">
                  <div className="form_group">
                    <label className="form_label">Email (Read Only)</label>
                    <input
                      className="form_input"
                      type="email"
                      value={user?.email}
                      disabled
                    />
                  </div>

                  <div className="form_group">
                    <label className="form_label">Phone Number</label>
                    <input
                      className="form_input"
                      type="tel"
                      value={personalData.phone}
                      onChange={(e) =>
                        setPersonalData({
                          ...personalData,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn active"
                >
                  Save Changes
                </button>
              </form>
            )}

            {activeTab === "password" && (
              <form
                onSubmit={handleChangePassword}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div className="form_group">
                  <label className="form_label">New Password</label>
                  <input
                    className="form_input"
                    type="password"
                    placeholder="••••••••"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form_group">
                  <label className="form_label">Confirm New Password</label>
                  <input
                    className="form_input"
                    type="password"
                    placeholder="••••••••"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
                <button
                  type="submit"
                  className="btn active"
                >
                  Change Password
                </button>
              </form>
            )}

            {activeTab === "bookings" && (
              <div
                className="booking_list"
                style={{
                  maxHeight: "350px",
                  overflowY: "auto",
                }}
              >
                {bookingHistory.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px" }}>
                    <p style={{ fontSize: "40px", marginBottom: "10px" }}>🚗</p>
                    <p style={{ color: "rgba(255,255,255,0.5)" }}>
                      No bookings found.
                    </p>
                    <button
                      onClick={() => navigate("/booking")}
                      className="btn active"
                      style={{ width: "200px", marginTop: "20px" }}
                    >
                      Book Now
                    </button>
                  </div>
                ) : (
                  bookingHistory.map((booking, index) => (
                    <div key={index} className="booking_item">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "10px",
                        }}
                      >
                        <strong
                          style={{ color: "#4ce3f7", fontSize: "1.15rem" }}
                        >
                          {booking.carModel}
                        </strong>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "rgba(255,255,255,0.5)",
                          }}
                        >
                          ID: {booking.bookingId}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "15px",
                          color: "rgba(255,255,255,0.8)",
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <span style={{ color: "#2e8eff" }}>●</span>{" "}
                          {booking.pickup}
                          <span style={{ margin: "0 5px", opacity: 0.5 }}>
                            →
                          </span>
                          <span style={{ color: "#4ce3f7" }}>●</span>{" "}
                          {booking.dropoff}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "15px",
                          color: "#fff",
                          background: "rgba(255,255,255,0.15)",
                          padding: "8px 12px",
                          borderRadius: "8px",
                        }}
                      >
                        <span style={{ opacity: 0.7 }}>
                          {booking.date} • {booking.days} days
                        </span>
                        <span style={{ fontWeight: "700", color: "#fff" }}>
                          ${booking.total} USD
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "danger" && (
              <div className="danger_card">
                <h3 style={{ color: "#ff4d4d", marginTop: 0 }}>
                  ⚠️ Danger Zone
                </h3>
                <p
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "15px",
                    marginBottom: "20px",
                    lineHeight: "1.5",
                  }}
                >
                  Once you delete your account, there is no going back. All your
                  booking history and personal data will be permanently removed.
                </p>

                {/* styled confirmation — shows after clicking delete */}
                {showDeleteConfirm && (
                  <div
                    className="error-message"
                    style={{
                      flexDirection: "column",
                      gap: "12px",
                      padding: "20px",
                      marginBottom: "16px",
                    }}
                  >
                    <span>Are you absolutely sure? This cannot be undone.</span>
                    <div
                      style={{ display: "flex", gap: "12px", marginTop: "8px" }}
                    >
                      <button
                        onClick={handleDeleteConfirmed}
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        style={{
                          background: "transparent",
                          color: "#ff4d4d",
                          border: "1px solid #ff4d4d",
                          padding: "8px 20px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* your original button — unchanged */}
                <button onClick={handleDeleteClick} className="delete_btn">
                  <span>Delete Account</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="svg_icon"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
