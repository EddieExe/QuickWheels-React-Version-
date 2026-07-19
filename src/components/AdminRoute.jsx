// src/components/AdminRoute.jsx
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

function AdminRoute({ children }) {
  const { user, isAdmin, adminRole, loading } = useAuth();

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#0a0a14", flexDirection: "column", gap: "16px"
    }}>
      <div style={{
        width: "40px", height: "40px", border: "3px solid rgba(76,227,247,0.2)",
        borderTop: "3px solid #4ce3f7", borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "Quicksand, sans-serif", fontSize: "13px" }}>
        Verifying access...
      </p>
    </div>
  );

  // Not logged in or not an admin → redirect home
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  // Admin but no role assigned yet → still let them in (AuthContext defaults to super_admin for legacy)
  // This prevents locking out existing admins before AdminSettings is set up
  return children;
}

export default AdminRoute;