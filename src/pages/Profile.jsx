import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  updateProfile,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { db } from "../firebase";
import jsPDF from "jspdf";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import "../styles/profile.css";
import { useLocation } from "react-router-dom";
import validateEmail from "../utils/emailValidator";

function downloadReceipt(booking) {
  const doc = new jsPDF();

  // Header
  doc.setFillColor(4, 0, 255);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("QuickWheels", 20, 18);
  doc.setFontSize(10);
  doc.text("Car Rental Receipt", 150, 18);

  // Booking ID
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Booking ID: ${booking.bookingId}`, 20, 45);
  doc.text(`Date: ${booking.date}`, 20, 55);

  // Divider
  doc.setDrawColor(4, 0, 255);
  doc.line(20, 62, 190, 62);

  // Details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Vehicle:", 20, 75);
  doc.setFont("helvetica", "bold");
  doc.text(booking.carModel, 80, 75);

  doc.setFont("helvetica", "normal");
  doc.text("Pickup Location:", 20, 88);
  doc.setFont("helvetica", "bold");
  doc.text(booking.pickup, 80, 88);

  doc.setFont("helvetica", "normal");
  doc.text("Drop-off Location:", 20, 101);
  doc.setFont("helvetica", "bold");
  doc.text(booking.dropoff, 80, 101);

  doc.setFont("helvetica", "normal");
  doc.text("Duration:", 20, 114);
  doc.setFont("helvetica", "bold");
  doc.text(`${booking.days} days`, 80, 114);

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 125, 190, 125);

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Total Amount:", 20, 140);
  doc.setTextColor(4, 0, 255);
  doc.text(`$${booking.total} USD`, 80, 140);

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for choosing QuickWheels!", 20, 270);
  doc.text("For support: support@quickwheels.com", 20, 278);

  doc.save(`QuickWheels-Receipt-${booking.bookingId}.pdf`);
}

function Profile() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("personal");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [bookingHistory, setBookingHistory] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // password visibility states
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, []);

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
        bookings.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
        setBookingHistory(bookings);
      } catch (err) {
        console.error("Error fetching bookings:", err);
      }
    }
    if (user) fetchBookings();
  }, [user]);

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
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // ── Name validation ──────────────────────────────
  function validateName(name) {
    // only letters, spaces, apostrophes, hyphens
    const validChars = /^[a-zA-Z\s'\-]+$/;
    if (!validChars.test(name)) {
      return "Name can only contain letters, apostrophes and hyphens.";
    }
    const words = name.trim().split(/\s+/);
    if (words.length > 3) {
      return "Name can have a maximum of 3 words.";
    }
    const spaces = (name.match(/ /g) || []).length;
    if (spaces > 2) {
      return "Name can have a maximum of 2 spaces.";
    }
    return null;
  }

  // ── Password strength validation ─────────────────
  function validatePassword(password) {
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password))
      return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password))
      return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(password))
      return "Password must contain at least one number.";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
      return "Password must contain at least one special character.";
    return null;
  }

  // ── Password strength indicator ──────────────────
  function getPasswordStrength(password) {
    if (!password) return { label: "", color: "", width: "0%" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

    if (score <= 2) return { label: "Weak", color: "#ff4d4d", width: "33%" };
    if (score <= 3) return { label: "Fair", color: "#ffa500", width: "60%" };
    if (score === 4) return { label: "Good", color: "#4ce3f7", width: "80%" };
    return { label: "Strong", color: "#22c55e", width: "100%" };
  }

  const strength = getPasswordStrength(passwordData.newPassword);

  async function handleUpdateProfile(e) {
    e.preventDefault();
    const nameError = validateName(personalData.displayName);
    if (nameError) {
      setError(nameError);
      return;
    }
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
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password cannot be same as current password.");
      return;
    }
    const pwError = validatePassword(newPassword);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      // re-authenticate before changing password — Firebase requirement
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setMessage("Password changed successfully!");
      setError("");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Current password is incorrect.");
      } else {
        setError("Failed to change password. Please try again.");
      }
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

  // eye icon SVG helper
  function EyeIcon({ show }) {
    return show ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
        />
      </svg>
    ) : (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    );
  }

  const tabs = [
    { id: "personal", label: "Personal Details" },
    { id: "password", label: "Change Password" },
    { id: "bookings", label: "Booking History" },
    { id: "contact", label: "Contact Us" },
    ...(isAdmin ? [{ id: "admin", label: "Admin" }] : []),
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
              onClick={() => {
                setActiveTab(tab.id);
                setMessage("");
                setError("");
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(message || error) && (
          <div
            className={`feedback_message ${message ? "success" : "error"} show`}
          >
            {message || error}
          </div>
        )}

        <div className="glass_card">
          <div className="glass_card_inner">
            {/* ── PERSONAL DETAILS ── */}
            {activeTab === "personal" && (
              <form onSubmit={handleUpdateProfile}>
                <div className="form_group">
                  <label className="form_label">Full Name</label>
                  <input
                    className="form_input"
                    type="text"
                    placeholder="Your full name"
                    value={personalData.displayName}
                    onChange={(e) =>
                      setPersonalData({
                        ...personalData,
                        displayName: e.target.value,
                      })
                    }
                  />
                  <p className="form_hint">
                    Max 3 words. Letters, apostrophes and hyphens only.
                  </p>
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
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit number"
                      value={personalData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        setPersonalData({ ...personalData, phone: value });
                      }}
                    />
                  </div>
                </div>

                <button type="submit" className="save_btn btn active">
                  Save Changes
                </button>
              </form>
            )}

            {/* ── CHANGE PASSWORD ── */}
            {activeTab === "password" && (
              <form
                onSubmit={handleChangePassword}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {/* Current password */}
                <div className="form_group">
                  <label className="form_label">Current Password</label>
                  <div className="input_wrapper">
                    <input
                      className="form_input"
                      type={showCurrent ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="eye_btn"
                      onClick={() => setShowCurrent(!showCurrent)}
                    >
                      <EyeIcon show={showCurrent} />
                    </button>
                  </div>
                </div>

                <div className="form_row">
                  {/* New password */}
                  <div className="form_group">
                    <label className="form_label">New Password</label>
                    <div className="input_wrapper">
                      <input
                        className="form_input"
                        type={showNew ? "text" : "password"}
                        placeholder="••••••••"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPassword: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        className="eye_btn"
                        onClick={() => setShowNew(!showNew)}
                      >
                        <EyeIcon show={showNew} />
                      </button>
                    </div>

                    {/* strength bar stays under new password */}
                    {passwordData.newPassword && (
                      <div style={{ marginTop: "8px" }}>
                        <div
                          style={{
                            height: "4px",
                            borderRadius: "4px",
                            background: "rgba(255,255,255,0.1)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: strength.width,
                              background: strength.color,
                              borderRadius: "4px",
                              transition: "all 0.3s ease",
                            }}
                          />
                        </div>
                        <p
                          style={{
                            fontSize: "12px",
                            marginTop: "4px",
                            color: strength.color,
                            fontWeight: "600",
                          }}
                        >
                          {strength.label}
                        </p>
                      </div>
                    )}
                    <p className="form_hint">
                      Min 8 · uppercase · lowercase · number · special char
                    </p>
                  </div>

                  {/* Confirm password */}
                  <div className="form_group">
                    <label className="form_label">Confirm New Password</label>
                    <div className="input_wrapper">
                      <input
                        className="form_input"
                        type={showConfirm ? "text" : "password"}
                        placeholder="••••••••"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirmPassword: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        className="eye_btn"
                        onClick={() => setShowConfirm(!showConfirm)}
                      >
                        <EyeIcon show={showConfirm} />
                      </button>
                    </div>

                    {/* match indicator stays under confirm */}
                    {passwordData.confirmPassword && (
                      <p
                        style={{
                          fontSize: "12px",
                          marginTop: "6px",
                          fontWeight: "600",
                          color:
                            passwordData.newPassword ===
                            passwordData.confirmPassword
                              ? "#22c55e"
                              : "#ff4d4d",
                        }}
                      >
                        {passwordData.newPassword ===
                        passwordData.confirmPassword
                          ? "✓ Passwords match"
                          : "✗ Passwords do not match"}
                      </p>
                    )}
                  </div>
                </div>

                <button type="submit" className="change_btn btn active">
                  Change Password
                </button>
              </form>
            )}

            {/* ── BOOKING HISTORY ── */}
            {activeTab === "bookings" && (
              <div
                className="booking_list"
                style={{ maxHeight: "350px", overflowY: "auto" }}
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
                        <span style={{ color: "#2e8eff" }}>●</span>{" "}
                        {booking.pickup}
                        <span style={{ margin: "0 5px", opacity: 0.5 }}>
                          {" "}
                          →{" "}
                        </span>
                        <span style={{ color: "#4ce3f7" }}>●</span>{" "}
                        {booking.dropoff}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "15px",
                          background: "rgba(255,255,255,0.06)",
                          padding: "8px 12px",
                          borderRadius: "8px",
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: "15px",
                          }}
                        >
                          {booking.date} • {booking.days} days
                        </span>
                        <span style={{ fontWeight: "700", color: "#4ce3f7" }}>
                          ${booking.total} USD
                        </span>
                      </div>
                      <button
                        onClick={() => downloadReceipt(booking)}
                        className="Documents-btn"
                      >
                        <span className="folderContainer">
                          <svg
                            className="fileBack"
                            width="146"
                            height="113"
                            viewBox="0 0 146 113"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M0 4C0 1.79086 1.79086 0 4 0H50.3802C51.8285 0 53.2056 0.627965 54.1553 1.72142L64.3303 13.4371C65.2799 14.5306 66.657 15.1585 68.1053 15.1585H141.509C143.718 15.1585 145.509 16.9494 145.509 19.1585V109C145.509 111.209 143.718 113 141.509 113H3.99999C1.79085 113 0 111.209 0 109V4Z"
                              fill="url(#paint0_linear_117_4)"
                            ></path>
                            <defs>
                              <linearGradient
                                id="paint0_linear_117_4"
                                x1="0"
                                y1="0"
                                x2="72.93"
                                y2="95.4804"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="#8F88C2"></stop>
                                <stop offset="1" stopColor="#5C52A2"></stop>
                              </linearGradient>
                            </defs>
                          </svg>
                          <svg
                            className="filePage"
                            width="88"
                            height="99"
                            viewBox="0 0 88 99"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect
                              width="88"
                              height="99"
                              fill="url(#paint0_linear_117_6)"
                            ></rect>
                            <defs>
                              <linearGradient
                                id="paint0_linear_117_6"
                                x1="0"
                                y1="0"
                                x2="81"
                                y2="160.5"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="white"></stop>
                                <stop offset="1" stopColor="#686868"></stop>
                              </linearGradient>
                            </defs>
                          </svg>
                          <svg
                            className="fileFront"
                            width="160"
                            height="79"
                            viewBox="0 0 160 79"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M0.29306 12.2478C0.133905 9.38186 2.41499 6.97059 5.28537 6.97059H30.419H58.1902C59.5751 6.97059 60.9288 6.55982 62.0802 5.79025L68.977 1.18034C70.1283 0.410771 71.482 0 72.8669 0H77H155.462C157.87 0 159.733 2.1129 159.43 4.50232L150.443 75.5023C150.19 77.5013 148.489 79 146.474 79H7.78403C5.66106 79 3.9079 77.3415 3.79019 75.2218L0.29306 12.2478Z"
                              fill="url(#paint0_linear_117_5)"
                            ></path>
                            <defs>
                              <linearGradient
                                id="paint0_linear_117_5"
                                x1="38.7619"
                                y1="8.71323"
                                x2="66.9106"
                                y2="82.8317"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="#C3BBFF"></stop>
                                <stop offset="1" stopColor="#51469A"></stop>
                              </linearGradient>
                            </defs>
                          </svg>
                        </span>
                        <p
                          className="download_text"
                          style={{ color: "#4ce3f7" }}
                        >
                          Download Receipt
                        </p>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── ADMIN DASHBOARD ── */}
            {activeTab === "admin" && (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <div style={{ marginBottom: "30px" }}>
                  <span style={{ fontSize: "48px" }}>👑</span>
                  <h2 style={{ color: "#4ce3f7", marginTop: "10px" }}>
                    Admin Portal
                  </h2>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      marginBottom: "30px",
                    }}
                  >
                    Manage bookings, users, and view analytics
                  </p>
                </div>
                <button
                  onClick={() => navigate("/admin")}
                  className="btn active"
                  style={{
                    padding: "14px 32px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    background: "linear-gradient(30deg, #0400ff, #4ce3f7)",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    color: "white",
                  }}
                >
                  🚀 Go to Admin Dashboard
                </button>
              </div>
            )}

            {/* ── CONTACT US ── */}
            {activeTab === "contact" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <p
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "15px",
                    marginBottom: "30px",
                    lineHeight: "1.6",
                  }}
                >
                  Have a question or need support? Send us a message and we'll
                  get back to you shortly.
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formEl = e.target;

                    // ✅ send as JSON instead of FormData
                    const payload = {
                      name: user?.displayName || "QuickWheels User",
                      email: user?.email || "",
                      subject: formEl.subject.value,
                      message: formEl.message.value,
                    };

                    const emailError = validateEmail(user?.email || "");
                    if (emailError) {
                      setError(emailError);
                      return;
                    }

                    try {
                      const response = await fetch(
                        "https://formspree.io/f/mrbpgvzd",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                          },
                          body: JSON.stringify(payload),
                        },
                      );

                      const result = await response.json();

                      if (response.ok) {
                        setMessage("Message sent! We'll get back to you soon.");
                        formEl.reset();
                      } else {
                        console.error("Formspree error:", result);
                        setError("Failed to send message. Please try again.");
                      }
                    } catch (err) {
                      console.error("Network error:", err);
                      setError("Something went wrong. Please try again.");
                    }
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {/* ── Side-by-Side Wrapper ── */}
                  <div
                    style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}
                  >
                    <div
                      className="form_group"
                      style={{ flex: 1, minWidth: "200px" }}
                    >
                      <label className="form_label">Your Name</label>
                      <input
                        className="form_input"
                        type="text"
                        value={user?.displayName || ""}
                        readOnly
                        style={{
                          opacity: 0.6,
                          cursor: "not-allowed",
                          width: "100%",
                        }}
                      />
                    </div>

                    <div
                      className="form_group"
                      style={{ flex: 1, minWidth: "200px" }}
                    >
                      <label className="form_label">Email Address</label>
                      <input
                        className="form_input"
                        type="email"
                        value={user?.email || ""}
                        readOnly
                        style={{
                          opacity: 0.6,
                          cursor: "not-allowed",
                          width: "100%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="form_group">
                    <label className="form_label">Subject</label>
                    <input
                      className="form_input"
                      type="text"
                      name="subject"
                      placeholder="What is this about?"
                      required
                    />
                  </div>

                  <div className="form_group">
                    <label className="form_label">Message</label>
                    <textarea
                      name="message"
                      placeholder="Describe your issue or question..."
                      required
                      rows={4}
                      style={{
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: "15px",
                        width: "100%",
                        padding: "12px 16px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        color: "#fff",
                        outline: "none",
                        resize: "vertical",
                        boxSizing: "border-box",
                        transition: "all 0.3s ease",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#2e8eff";
                        e.target.style.boxShadow =
                          "0 0 0 3px rgba(46,142,255,0.1)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "rgba(255,255,255,0.1)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* ── Centered Button ── */}
                  <button
                    type="submit"
                    className="btn active"
                    style={{
                      alignSelf: "center",
                      padding: "13px 40px",
                      marginBottom: "15px",
                    }}
                  >
                    Send Message
                  </button>
                </form>

                <div
                  style={{
                    padding: "16px",
                    background: "rgba(76,227,247,0.05)",
                    border: "1px solid rgba(76,227,247,0.15)",
                    borderRadius: "12px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.85rem",
                      margin: 0,
                    }}
                  >
                    📧 support@quickwheels.com &nbsp;·&nbsp; We typically
                    respond within 24 hours.
                  </p>
                </div>
              </div>
            )}

            {/* ── DANGER ZONE ── */}
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
                    lineHeight: "1.6",
                  }}
                >
                  Once you delete your account, there is no going back. All your
                  booking history and personal data will be permanently removed.
                </p>

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
                      <button onClick={handleDeleteConfirmed}>
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

                {!showDeleteConfirm && (
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
