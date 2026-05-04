import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "../firebase";
import validateEmail from "../utils/emailValidator";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import "../styles/signinup.css";

function SignIn() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false); // Added loading state
  const [resetSent, setResetSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const navigate = useNavigate();

  // Show signup success message from localStorage
  useEffect(() => {
    const status = localStorage.getItem("signupSuccess");
    if (status) {
      setMessage("Account created successfully! Welcome to QuickWheels. 🎉");
      localStorage.removeItem("signupSuccess");
    }
  }, []);

  // Auto-dismiss error and clear unverified state
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
        // Only clear unverifiedUser if it's not a verification error
        if (!error.includes("verify your email")) {
          setUnverifiedUser(null);
        }
      }, 5000); // Increased to 5s to give users time to read the resend button
      return () => clearTimeout(timer);
    }
  }, [error]);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { email, password } = formData;

    if (!email || !password) {
      setError("Please fill all fields");
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      if (!result.user.emailVerified) {
        await auth.signOut();
        setUnverifiedUser(result.user);
        setError(
          "Please verify your email before signing in. Check your inbox.",
        );
        setLoading(false);
        return;
      }

      // ✅ check admin — inside try, using result
      const docRef = doc(db, "users", result.user.email);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().isAdmin === true) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Sign-in error:", err.code);
      setLoading(false);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Something went wrong. Try again.");
      }
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    const emailError = validateEmail(resetEmail);
    if (emailError) {
      setError(emailError);
      return;
    }
    setLoading(true);
    if (!resetEmail) {
      setError("Please enter your email address.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
      setError("");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleResendVerification = async () => {
    try {
      if (unverifiedUser) {
        await sendEmailVerification(unverifiedUser);
        setMessage("Verification email resent! Check your inbox.");
        setUnverifiedUser(null);
        setError("");
      }
    } catch (err) {
      setError("Failed to resend. Try again later.");
    }
  };

  return (
    <div className="auth-container">
      {/* ── SIGN IN VIEW ── */}
      <div
        className={`auth_view ${showReset ? "auth_view_hidden" : "auth_view_visible"}`}
      >
        <form onSubmit={handleSubmit}>
          <h2>Sign in to your account</h2>

          {message && <div className="auth_message success">{message}</div>}
          {error && (
            <div className="auth_message error">
              <span>{error}</span>
            </div>
          )}

          {unverifiedUser && (
            <p style={{ textAlign: "center", marginTop: "8px" }}>
              <button
                type="button"
                onClick={handleResendVerification}
                className="auth_text_btn"
              >
                Resend verification email
              </button>
            </p>
          )}

          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />

          <label>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />

          <button type="submit" className="signin_btn btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p>
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>

          <p style={{ textAlign: "center", marginTop: "4px" }}>
            <button
              type="button"
              onClick={() => {
                setShowReset(true);
                setError("");
              }}
              className="auth_text_btn"
            >
              Forgot Password?
            </button>
          </p>
        </form>
      </div>

      {/* ── FORGOT PASSWORD VIEW ── */}
      <div
        className={`auth_view ${showReset ? "auth_view_visible" : "auth_view_hidden"}`}
      >
        {resetSent ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📧</div>
            <h2 style={{ color: "#fff", marginBottom: "12px" }}>
              Check your inbox!
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                marginBottom: "24px",
                lineHeight: "1.6",
              }}
            >
              We've sent a password reset link to <br />
              <strong style={{ color: "#4ce3f7" }}>{resetEmail}</strong>
            </p>
            <button
              type="button"
              onClick={() => {
                setShowReset(false);
                setResetSent(false);
                setResetEmail("");
              }}
              className="signin_btn btn"
              style={{ width: "100%" }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <h2>Reset Password</h2>
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                marginBottom: "24px",
                fontSize: "0.9rem",
                lineHeight: "1.6",
              }}
            >
              Enter your email and we'll send you a link to reset your password.
            </p>

            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />

            {error && (
              <div className="auth_message error">
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: "flex" }}>
              <button
                type="submit"
                className="signin_btn btn"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReset(false);
                  setError("");
                }}
                className="secondary_btn"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SignIn;
