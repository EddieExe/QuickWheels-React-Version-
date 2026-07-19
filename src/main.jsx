// main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { DateRangeProvider } from "./context/DateRangeContext";
import { AuthProvider } from "./context/AuthContext";
import App from "./App.jsx";
import "./global.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DateRangeProvider>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </GoogleOAuthProvider>
    </DateRangeProvider>
  </StrictMode>,
);
