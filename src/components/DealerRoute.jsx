// src/components/DealerRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function DealerRoute({ children }) {
  const { user, isDealer, dealerStatus, loading } = useAuth();

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a1a",
          color: "#fff",
          fontFamily: "Quicksand,sans-serif",
        }}
      >
        Loading...
      </div>
    );

  if (!user) return <Navigate to="/signin" />;
  if (!isDealer) return <Navigate to="/" />;
  
  // Redirect to pending page if not approved
  if (dealerStatus === "pending") return <Navigate to="/dealer-pending" />;
  
  // Redirect to suspended page if suspended
  if (dealerStatus === "suspended") return <Navigate to="/dealer-suspended" />;
  
  // Only approved dealers can access
  if (dealerStatus !== "approved") return <Navigate to="/" />;

  return children;
}

export default DealerRoute;