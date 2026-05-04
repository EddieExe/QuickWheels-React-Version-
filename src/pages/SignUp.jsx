import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "../firebase";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { sendWelcomeEmail } from "../utils/emailService";
import validateEmail from "../utils/emailValidator";
import "../styles/signinup.css";

function SignUp() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [emailHint, setEmailHint] = useState("");

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
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
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(result.user, { displayName: username });
      await setDoc(doc(db, "users", email), {
        email: email,
        displayName: username,
        isAdmin: false,
        createdAt: new Date(),
      });
      await sendEmailVerification(result.user);
      await sendWelcomeEmail(username, email);
      // ✅ save success message then go to signin
      localStorage.setItem("signupSuccess", "welcome");
      navigate("/signin");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email already registered. Please sign in.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters");
      } else {
        setError("Something went wrong. Try again.");
      }
    }
  }

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit}>
        <h2>Create an account</h2>
        {error && (
          <div className="error-message">
            <span>{error}</span>
          </div>
        )}
        <label>Username</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Enter your username"
          required
        />

        <label>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={(e) => {
            handleChange(e);
            // only show hint after user has typed enough
            if (e.target.value.length > 5) {
              const err = validateEmail(e.target.value);
              setEmailHint(err || "");
            } else {
              setEmailHint(""); // clear hint while typing
            }
          }}
          placeholder="Enter your email"
          required
        />
        {emailHint && (
          <p
            style={{
              color: "#ff4d4d",
              fontSize: "12px",
              marginTop: "-8px",
              marginBottom: "8px",
            }}
          >
            {emailHint}
          </p>
        )}

        <label>Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password (min. 6 characters)"
          required
        />
        <button className="signup_btn signin_btn btn">Sign Up</button>
        <p>
          Already have an account? <Link to="/signin">Sign In</Link>
        </p>
      </form>
    </div>
  );
}

export default SignUp;
