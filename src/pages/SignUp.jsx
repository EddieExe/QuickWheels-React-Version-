// SignUp.jsx
import { useState, useEffect, useCallback } from "react"; // ← ADD useCallback
import { useNavigate, Link } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, collection, addDoc, getDoc } from "firebase/firestore";
import { sendWelcomeEmail } from "../utils/emailService";
import validateEmail from "../utils/emailValidator";
import { signInWithGoogle, signInWithMicrosoft } from "../utils/socialAuth";
import SocialAuthButtons from "../components/SocialAuthButtons";
import ColorSpots from "../components/ColorSpots";
import "../styles/home.css";
import "../styles/signinup.css";

// ── MOVED Field component OUTSIDE (Fixes the typing issue) ──
const Field = ({ label, name, type = "text", placeholder, required = true, value, onChange }) => (
  <div className="form_group">
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder=" "
      autoComplete="off"
    />
    <label htmlFor={name}>{label}</label>
  </div>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1" />
  </svg>
);

function AccountTypeSelector({ selected, onSelect }) {
  const types = [
    {
      id: "user",
      icon: <UserIcon />,
      title: "Personal Account",
      desc: "Rent cars for personal use",
    },
    {
      id: "dealer",
      icon: <BuildingIcon />,
      title: "Dealer Account",
      desc: "List your cars and manage bookings",
    },
  ];

  return (
    <div className="account_type_wrap">
      <p className="account_type_label">
        Select account type
      </p>
      <div className="account_type_grid">
        {types.map((type) => (
          <div
            key={type.id}
            onClick={() => onSelect(type.id)}
            className={`account_type_card${selected === type.id ? " account_type_card_active" : ""}`}
          >
            <div className="account_type_icon">
              {type.icon}
            </div>
            <p className="account_type_title">{type.title}</p>
            <p className="account_type_desc">{type.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FancyButtonFx() {
  return (
    <>
      <span className="qw_fancy_btn_fold"></span>
      <div className="qw_fancy_btn_points">
        {Array.from({ length: 10 }).map((_, i) => (
          <i key={i} className="qw_fancy_btn_point"></i>
        ))}
      </div>
    </>
  );
}

function SignUp() {
  const [accountType, setAccountType] = useState("user");
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username:  "",
    email:     "",
    password:  "",
    businessName:    "",
    businessAddress: "",
    city:            "",
    state:           "",
    country:         "",
    phone:           "",
    gstNumber:       "",
    description:     "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailHint, setEmailHint] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ── FIXED: Use useCallback to prevent unnecessary re-renders ──
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // ── Helper: Create user document in Firestore ──
  async function createUserDocument(email, displayName, role, additionalData = {}) {
    const userRef = doc(db, "users", email);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        email,
        displayName,
        isAdmin: false,
        isDealer: role === "dealer",
        role: role,
        createdAt: new Date(),
        provider: "email",
        ...additionalData,
      });
    }
  }

  // ── Regular user signup ──
  async function handleUserSignup() {
    const { username, email, password } = formData;

    if (!username || !email || !password) {
      setError("Please fill all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) { 
      setError(emailError); 
      return; 
    }

    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: username });
      
      await createUserDocument(email, username, "user");
      
      await sendEmailVerification(result.user);
      await sendWelcomeEmail(username, email);
      
      localStorage.setItem("signupSuccess", "welcome");
      navigate("/signin");
    } catch (err) {
      setLoading(false);
      if (err.code === "auth/email-already-in-use") {
        setError("Email already registered. Please sign in.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters");
      } else {
        setError("Something went wrong. Try again.");
        console.error(err);
      }
    }
  }

  // ── Dealer signup ──
  async function handleDealerSignup() {
    const {
      username, email, password,
      businessName, businessAddress,
      city, state, country, phone, gstNumber, description,
    } = formData;

    if (!username || !email || !password) {
      setError("Please fill account credentials");
      return;
    }
    if (!businessName || !businessAddress || !city || !state || !country || !phone) {
      setError("Please fill all business details");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) { 
      setError(emailError); 
      return; 
    }

    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: username });

      const dealerRef = await addDoc(collection(db, "dealers"), {
        ownerName:       username,
        ownerEmail:      email,
        businessName,
        businessAddress,
        city, state, country, phone,
        gstNumber:       gstNumber || "",
        description:     description || "",
        status:          "pending",
        rating:          0,
        totalBookings:   0,
        totalRevenue:    0,
        createdAt:       new Date(),
        logo:            "",
        coverPhoto:      "",
        isActive:        false,
      });

      await createUserDocument(email, username, "dealer", {
        dealerId: dealerRef.id,
        dealerStatus: "pending",
      });

      await sendEmailVerification(result.user);

      localStorage.setItem("dealerSignupSuccess", "true");
      navigate("/dealer-pending");
    } catch (err) {
      setLoading(false);
      if (err.code === "auth/email-already-in-use") {
        setError("Email already registered. Please sign in.");
      } else {
        setError("Something went wrong. Try again.");
        console.error(err);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (accountType === "user") {
      await handleUserSignup();
    } else {
      await handleDealerSignup();
    }
  }

  // ── Google Sign Up ──
  async function handleGoogleSignUp() {
    setLoading(true);
    setError("");
    
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, "users", user.email));
      
      if (!userDoc.exists()) {
        await createUserDocument(user.email, user.displayName || user.email.split('@')[0], "user");
        await sendWelcomeEmail(user.displayName || user.email.split('@')[0], user.email);
        localStorage.setItem("signupSuccess", "welcome");
      }
      
      navigate("/");
    } catch (err) {
      console.error("Google sign-up error:", err);
      setError("Google sign-up failed. Please try again.");
      setLoading(false);
    }
  }

  // ── Microsoft Sign Up ──
  async function handleMicrosoftSignUp() {
    setLoading(true);
    setError("");
    
    try {
      const result = await signInWithMicrosoft();
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, "users", user.email));
      
      if (!userDoc.exists()) {
        await createUserDocument(user.email, user.displayName || user.email.split('@')[0], "user");
        await sendWelcomeEmail(user.displayName || user.email.split('@')[0], user.email);
        localStorage.setItem("signupSuccess", "welcome");
      }
      
      navigate("/");
    } catch (err) {
      console.error("Microsoft sign-up error:", err);
      setError("Microsoft sign-up failed. Please try again.");
      setLoading(false);
    }
  }

  // ── Email change handler with validation ──
  const handleEmailChange = useCallback((e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, email: value }));
    if (value.length > 5) {
      setEmailHint(validateEmail(value) || "");
    } else {
      setEmailHint("");
    }
  }, []);

  return (
    <div className="auth-container">
      <div className="stars-container">
        <div id="stars"></div>
        <div id="stars2"></div>
        <div id="stars3"></div>
      </div>
      <div className="auth_ambient_a" aria-hidden="true"></div>
      <div className="auth_ambient_b" aria-hidden="true"></div>
      <ColorSpots density="sparse" />

      <form onSubmit={handleSubmit}>
        <div className="auth_badge_wrap">
          <span className="auth_badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l1.6 4.9L18.5 8l-4.9 1.6L12 14.5l-1.6-4.9L5.5 8l4.9-1.1L12 2zM19 14l.9 2.7L22.5 17.5l-2.6.8L19 21l-.9-2.7-2.6-.8 2.6-.8L19 14zM5 14.5l.75 2.25L8 17.5l-2.25.75L5 20.5l-.75-2.25L2 17.5l2.25-.75L5 14.5z" />
            </svg>
            Join Us
          </span>
        </div>
        <h2 className="qw_shine_heading" style={{fontSize:"26px"}}>Create an account</h2>

        {error && (
          <div className="error-message">
            <span>{error}</span>
          </div>
        )}

        <div className="auth_form_layout">
          <div className="auth_left_col">
            <AccountTypeSelector
              selected={accountType}
              onSelect={(type) => { 
                setAccountType(type); 
                setStep(1);
                setError("");
              }}
            />
          </div>

          <div className="auth_right_col">

        {/* ── USER FIELDS ── */}
        {accountType === "user" && (
          <>
            <Field 
              label="Username" 
              name="username" 
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
            />
            <div>
              <div className="form_group">
                <input
                  type="email"
                  id="signup-email"
                  name="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  placeholder=" "
                  required
                  autoComplete="off"
                />
                <label htmlFor="signup-email">Enter your Email</label>
                {emailHint && (
                  <p style={{ color: "#ff4d4d", fontSize: "12px", margin: "4px 0 0" }}>
                    {emailHint}
                  </p>
                )}
              </div>
              {emailHint && (
                <p style={{ color: "#ff4d4d", fontSize: "12px", margin: "4px 0 0" }}>
                  {emailHint}
                </p>
              )}
            </div>
            <Field 
              label="Password" 
              name="password" 
              type="password"
              placeholder="Min. 6 characters"
              value={formData.password}
              onChange={handleChange}
            />
          </>
        )}

        {/* ── DEALER FIELDS ── */}
        {accountType === "dealer" && (
          <>
            <div style={{
              display: "flex", gap: "6px", marginBottom: "20px",
              justifyContent: "center",
            }}>
              {["Account", "Business", "Details"].map((s, i) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: "700",
                    background: step > i + 1
                      ? "#22c55e"
                      : step === i + 1
                        ? "rgba(147,51,234,0.2)"
                        : "rgba(255,255,255,0.06)",
                    border: step === i + 1
                      ? "2px solid var(--qw-cyan)"
                      : step > i + 1
                        ? "2px solid #22c55e"
                        : "1px solid rgba(255,255,255,0.1)",
                    color: step >= i + 1 ? "#fff" : "rgba(255,255,255,0.3)",
                  }}>
                    {step > i + 1 ? "✓" : i + 1}
                  </div>
                  <span style={{
                    fontSize: "11px",
                    color: step === i + 1 ? "var(--qw-cyan)" : "rgba(255,255,255,0.3)",
                    fontWeight: step === i + 1 ? "700" : "400",
                  }}>{s}</span>
                  {i < 2 && (
                    <div style={{
                      width: "20px", height: "1px",
                      background: step > i + 1
                        ? "rgba(34,197,94,0.5)"
                        : "rgba(255,255,255,0.1)",
                    }} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Account Credentials */}
            {step === 1 && (
              <>
                <p style={{
                  color: "rgba(255,255,255,0.45)", fontSize: "12px",
                  textAlign: "center", marginBottom: "16px",
                }}>
                  These are your login credentials
                </p>
                <Field 
                  label="Full Name" 
                  name="username" 
                  placeholder="Your full name"
                  value={formData.username}
                  onChange={handleChange}
                />
                <div style={{ marginBottom: "14px" }}>
                  <div className="form_group">
                    <input
                      type="email"
                      id="dealer-email"
                      name="email"
                      value={formData.email}
                      onChange={handleEmailChange}
                      placeholder=" "
                      required
                      autoComplete="off"
                    />
                    <label htmlFor="dealer-email">Business Email</label>
                  </div>
                  {emailHint && (
                    <p style={{ color: "#ff4d4d", fontSize: "12px", margin: "-6px 0 10px" }}>
                      {emailHint}
                    </p>
                  )}
                  {emailHint && (
                    <p style={{ color: "#ff4d4d", fontSize: "12px", margin: "4px 0 0" }}>
                      {emailHint}
                    </p>
                  )}
                </div>
                <Field 
                  label="Password" 
                  name="password" 
                  type="password"
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => {
                    const { username, email, password } = formData;
                    if (!username || !email || !password) {
                      setError("Please fill all fields");
                      return;
                    }
                    if (password.length < 6) {
                      setError("Password must be at least 6 characters");
                      return;
                    }
                    const emailError = validateEmail(email);
                    if (emailError) { 
                      setError(emailError); 
                      return; 
                    }
                    setError("");
                    setStep(2);
                  }}
                  className="signup_btn signin_btn btn"
                  style={{ width: "100%" }}
                >
                  Next: Business Details
                </button>
              </>
            )}

            {/* Step 2: Business Details */}
            {step === 2 && (
              <>
                <p style={{
                  color: "rgba(255,255,255,0.45)", fontSize: "12px",
                  textAlign: "center", marginBottom: "16px",
                }}>
                  Tell us about your showroom
                </p>
                <Field 
                  label="Business / Showroom Name" 
                  name="businessName"
                  placeholder="e.g. ABC Car Rentals"
                  value={formData.businessName}
                  onChange={handleChange}
                />
                <Field 
                  label="Street Address" 
                  name="businessAddress"
                  placeholder="123 Main Street"
                  value={formData.businessAddress}
                  onChange={handleChange}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <Field 
                    label="City"  
                    name="city"  
                    placeholder="Pune"
                    value={formData.city}
                    onChange={handleChange}
                  />
                  <Field 
                    label="State" 
                    name="state" 
                    placeholder="Maharashtra"
                    value={formData.state}
                    onChange={handleChange}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <Field 
                    label="Country" 
                    name="country" 
                    placeholder="India"
                    value={formData.country}
                    onChange={handleChange}
                  />
                  <Field 
                    label="Contact Phone" 
                    name="phone" 
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={() => setStep(1)}
                    className="secondary_btn" style={{ flex: 0.5 }}>
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const { businessName, businessAddress, city, state, country, phone } = formData;
                      if (!businessName || !businessAddress || !city || !state || !country || !phone) {
                        setError("Please fill all business details");
                        return;
                      }
                      setError("");
                      setStep(3);
                    }}
                    className="signup_btn signin_btn btn"
                    style={{ flex: 1 }}
                  >
                    More Details →
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Optional Details + Submit */}
            {step === 3 && (
              <>
                <p style={{
                  color: "rgba(255,255,255,0.45)", fontSize: "12px",
                  textAlign: "center", marginBottom: "16px",
                }}>
                  Optional but recommended
                </p>
                <Field 
                  label="GST Number (optional)" 
                  name="gstNumber"
                  placeholder="22AAAAA0000A1Z5" 
                  required={false}
                  value={formData.gstNumber}
                  onChange={handleChange}
                />
                <div style={{ marginBottom: "14px" }}>
                  <div className="form_group">
                    <textarea
                      name="description"
                      id="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder=" "
                    />
                    <label htmlFor="description">Business Description (optional)</label>
                  </div>
                </div>

                <div style={{
                  padding: "12px 14px",
                  background: "rgba(147,51,234,0.08)",
                  border: "1px solid rgba(147,51,234,0.25)",
                  borderRadius: "10px", marginBottom: "16px",
                  fontSize: "12px", color: "rgba(255,255,255,0.55)",
                  lineHeight: "1.6",
                }}>
                  ⏳ <strong style={{ color: "var(--qw-cyan)" }}>Verification Required:</strong>
                  {" "}Your dealer account will be reviewed by our team within
                  24–48 hours before going live.
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={() => setStep(2)}
                    className="secondary_btn" style={{ flex: 0.5 }}>
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="signup_btn signin_btn btn"
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    {loading ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Submit for regular user */}
        {accountType === "user" && (
          <button
            type="submit"
            className="book_btn qw_fancy_btn signup_btn"
            disabled={loading}
          >
            <FancyButtonFx />
            <span className="qw_fancy_btn_inner">
              <svg
                className="qw_fancy_btn_icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              >
                <polyline points="13.18 1.37 13.18 9.64 21.45 9.64 10.82 22.63 10.82 14.36 2.55 14.36 13.18 1.37"></polyline>
              </svg>
              {loading ? "Creating account..." : "Sign Up"}
            </span>
          </button>
        )}

        {/* Social auth — only for user accounts */}
        {accountType === "user" && (
          <SocialAuthButtons
            onGoogle={handleGoogleSignUp}
            onMicrosoft={handleMicrosoftSignUp}
            loading={loading}
          />
        )}

        <p style={{ marginTop: "20px", textAlign: "center" }}>
          Already have an account? <Link to="/signin">Sign In</Link>
        </p>

          </div>
        </div>
      </form>
    </div>
  );
}

export default SignUp;