// src/components/SignIn.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import validateEmail from "../utils/emailValidator";
import { signInWithGoogle, signInWithMicrosoft } from "../utils/socialAuth";
import SocialAuthButtons from "../components/SocialAuthButtons";
import TwoFactorVerify from "../components/TwoFactorVerify";
import { get2FAStatus } from "../utils/twoFactorService";
import ColorSpots from "../components/ColorSpots";
import "../styles/home.css";
import "../styles/signinup.css";

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

function SignIn() {
  const [formData, setFormData]         = useState({ email: "", password: "" });
  const [error, setError]               = useState("");
  const [message, setMessage]           = useState("");
  const [loading, setLoading]           = useState(false);
  const [resetSent, setResetSent]       = useState(false);
  const [resetEmail, setResetEmail]     = useState("");
  const [showReset, setShowReset]       = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);

  // ── 2FA gate state ──
  // Holds { secret, email, firebaseUser } when 2FA verification is needed
  const [pending2FA, setPending2FA]     = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const status = localStorage.getItem("signupSuccess");
    if (status) {
      setMessage("Account created successfully! Welcome to QuickWheels. 🎉");
      localStorage.removeItem("signupSuccess");
    }
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
        if (!error.includes("verify your email")) setUnverifiedUser(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  // ── Redirect based on role (called only after 2FA passes) ──
  async function handleUserRedirection(user) {
    try {
      const docRef  = doc(db, "users", user.email);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isAdmin === true) {
          navigate("/admin");
        } else if (data.isDealer === true) {
          if (data.dealerStatus === "pending")   navigate("/dealer-pending");
          else if (data.dealerStatus === "suspended") navigate("/dealer-suspended");
          else navigate("/dealer");
        } else {
          navigate("/");
        }
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
      navigate("/");
    }
  }

  // ── Check 2FA then redirect or show verify screen ──
  async function proceedAfterAuth(firebaseUser) {
    const { enabled, secret } = await get2FAStatus(firebaseUser.email);

    if (enabled && secret) {
      // Park the Firebase user and show the 2FA screen
      // We stay signed in to Firebase — the redirect is just blocked until verified
      setPending2FA({ secret, email: firebaseUser.email, firebaseUser });
    } else {
      await handleUserRedirection(firebaseUser);
    }
  }

  // ── Email/Password Sign In ──
  async function handleSubmit(e) {
    e.preventDefault();

    const { email, password } = formData;

    if (!email || !password) { setError("Please fill all fields"); return; }

    const emailError = validateEmail(email);
    if (emailError) { setError(emailError); return; }

    setLoading(true);
    setError("");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      if (!result.user.emailVerified) {
        await auth.signOut();
        setUnverifiedUser(result.user);
        setError("Please verify your email before signing in. Check your inbox.");
        setLoading(false);
        return;
      }

      await proceedAfterAuth(result.user);
    } catch (err) {
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

  // ── Forgot Password ──
  async function handleForgotPassword(e) {
    e.preventDefault();
    const emailError = validateEmail(resetEmail);
    if (emailError) { setError(emailError); return; }
    setLoading(true);
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

  // ── Resend Verification Email ──
  async function handleResendVerification() {
    try {
      if (unverifiedUser) {
        await sendEmailVerification(unverifiedUser);
        setMessage("Verification email resent! Check your inbox.");
        setUnverifiedUser(null);
        setError("");
      }
    } catch {
      setError("Failed to resend. Try again later.");
    }
  }

  // ── Google Sign In ──
  async function handleGoogleSignIn() {
    setLoading(true);
    setError("");
    try {
      const { user } = await signInWithGoogle();
      if (!user.emailVerified) {
        await auth.signOut();
        setError("Please verify your email before signing in. Check your inbox.");
        setLoading(false);
        return;
      }
      await proceedAfterAuth(user);
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  // ── Microsoft Sign In ──
  async function handleMicrosoftSignIn() {
    setLoading(true);
    setError("");
    try {
      const { user } = await signInWithMicrosoft();
      if (!user.emailVerified) {
        await auth.signOut();
        setError("Please verify your email before signing in. Check your inbox.");
        setLoading(false);
        return;
      }
      await proceedAfterAuth(user);
    } catch (err) {
      console.error("Microsoft sign-in error:", err);
      setError("Microsoft sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  // ── 2FA verify screen ──
  // Shown instead of the normal sign-in form when 2FA is required
  if (pending2FA) {
    return (
      <TwoFactorVerify
        secret={pending2FA.secret}
        email={pending2FA.email}
        onSuccess={() => handleUserRedirection(pending2FA.firebaseUser)}
        onCancel={async () => {
          // Sign out of Firebase and return to the sign-in form
          await auth.signOut();
          setPending2FA(null);
          setLoading(false);
        }}
      />
    );
  }

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

      {/* ── SIGN IN VIEW ── */}
      <div className={`auth_view ${showReset ? "auth_view_hidden" : "auth_view_visible"}`}>
        <form onSubmit={handleSubmit}>
          <div className="auth_badge_wrap">
            <span className="auth_badge">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l1.6 4.9L18.5 8l-4.9 1.6L12 14.5l-1.6-4.9L5.5 8l4.9-1.1L12 2zM19 14l.9 2.7L22.5 17.5l-2.6.8L19 21l-.9-2.7-2.6-.8 2.6-.8L19 14zM5 14.5l.75 2.25L8 17.5l-2.25.75L5 20.5l-.75-2.25L2 17.5l2.25-.75L5 14.5z" />
              </svg>
              Welcome Back
            </span>
          </div>
          <h2 className="qw_shine_heading" style={{fontSize:"26px"}}>Sign in to your account</h2>

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

          <div className="form_group">
            <input
              type="email"
              id="signin-email"
              name="email"
              placeholder=" "
              value={formData.email}
              onChange={handleChange}
              required
            />
            <label htmlFor="signin-email">Enter your Email</label>
          </div>

          <div className="form_group">
            <input
              type="password"
              id="signin-password"
              name="password"
              placeholder=" "
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="off"
            />
            <label htmlFor="signin-password">Enter your Password</label>
          </div>

          <button
            type="submit"
            className="book_btn qw_fancy_btn signin_btn"
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
              {loading ? "Signing in..." : "Sign In"}
            </span>
          </button>

          <SocialAuthButtons
            onGoogle={handleGoogleSignIn}
            onMicrosoft={handleMicrosoftSignIn}
            loading={loading}
          />

          <p style={{ marginTop: "12px" }}>
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>

          {!showReset && (
            <p style={{ textAlign: "center", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => { setShowReset(true); setError(""); }}
                className="auth_text_btn"
              >
                Forgot Password?
              </button>
            </p>
          )}
        </form>
      </div>

      {/* ── FORGOT PASSWORD VIEW ── */}
      <div className={`auth_view ${showReset ? "auth_view_visible" : "auth_view_hidden"}`}>
        {resetSent ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📧</div>
            <h2 className="qw_shine_heading" style={{ marginBottom: "12px" }}>Check your inbox!</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "24px", lineHeight: "1.6" }}>
              We've sent a password reset link to
              <br />
              <strong style={{ color: "var(--qw-cyan)" }}>{resetEmail}</strong>
            </p>
            <button
              type="button"
              onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(""); }}
              className="signin_btn btn"
              style={{ width: "100%" }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <div className="auth_badge_wrap">
              <span className="auth_badge">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l1.6 4.9L18.5 8l-4.9 1.6L12 14.5l-1.6-4.9L5.5 8l4.9-1.1L12 2zM19 14l.9 2.7L22.5 17.5l-2.6.8L19 21l-.9-2.7-2.6-.8 2.6-.8L19 14zM5 14.5l.75 2.25L8 17.5l-2.25.75L5 20.5l-.75-2.25L2 17.5l2.25-.75L5 14.5z" />
                </svg>
                Password Reset
              </span>
            </div>
            <h2 className="qw_shine_heading">Reset Password</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "24px", fontSize: "0.9rem", lineHeight: "1.6" }}>
              Enter your email and we'll send you a link to reset your password.
            </p>
            <div className="form_group">
              <input
                type="email"
                id="reset-email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                autoComplete="off"
              />
              <label htmlFor="reset-email">Enter your Email Address</label>
            </div>
            {error && (
              <div className="auth_message error">
                <span>{error}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" className="signin_btn btn" disabled={loading} style={{ flex: 1 }}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <button
                type="button"
                onClick={() => { setShowReset(false); setError(""); }}
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