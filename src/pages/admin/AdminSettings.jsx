// src/pages/admin/AdminSettings.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getAllAdminUsers,
  setAdminUser,
  ADMIN_ROLES,
  ROLE_NAMES,
  ROLE_COLORS,
  logAdminAction,
} from "../../utils/adminUtils.jsx";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  purple: "#a855f7",
  textSec: "rgba(255, 255, 255, 0.45)",
};

export default function AdminSettings() {
  const { user, adminRole, refreshAdminRole } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: ADMIN_ROLES.MANAGER,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    if (adminRole === ADMIN_ROLES.SUPER_ADMIN) {
      loadAdmins();
    }
  }, [adminRole]);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const adminList = await getAllAdminUsers();
      setAdmins(adminList || []);
    } catch (err) {
      console.error("Error retrieving operator directories:", err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type = "success") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4000);
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      showMessage("Email parameter is structurally required", "error");
      return;
    }

    if (admins.some(a => a.id?.toLowerCase() === formData.email.toLowerCase())) {
      showMessage(`Identity authorization for ${formData.email} already exists`, "error");
      return;
    }

    setSaving(true);
    const result = await setAdminUser({
      email: formData.email,
      role: formData.role,
      isActive: true,
      createdBy: user.email,
      createdAt: new Date(),
    });

    if (result.success) {
      await logAdminAction(
        user.uid,
        user.email,
        "admin_created",
        { targetEmail: formData.email, role: formData.role },
        formData.email,
        "admin"
      );
      showMessage(`Admin identity ${formData.email} initiated successfully`);
      setShowAddForm(false);
      setFormData({ email: "", role: ADMIN_ROLES.MANAGER, isActive: true });
      loadAdmins();
    } else {
      showMessage(`Failed to provision target node: ${result.error}`, "error");
    }
    setSaving(false);
  };

  const handleUpdateRole = async (adminEmail, newRole) => {
    const admin = admins.find(a => a.id === adminEmail);
    if (!admin) return;

    setSaving(true);
    const result = await setAdminUser({
      ...admin,
      role: newRole,
      updatedBy: user.email,
      updatedAt: new Date(),
    });

    if (result.success) {
      await logAdminAction(
        user.uid,
        user.email,
        "admin_role_changed",
        { targetEmail: adminEmail, oldRole: admin.role, newRole },
        adminEmail,
        "admin"
      );
      showMessage(`Privilege array map modified for ${adminEmail}`);
      loadAdmins();
      if (adminEmail === user.email) {
        await refreshAdminRole();
      }
    } else {
      showMessage(`Failed to update signature profile: ${result.error}`, "error");
    }
    setSaving(false);
  };

  const handleToggleActive = async (adminEmail, currentStatus) => {
    const admin = admins.find(a => a.id === adminEmail);
    if (!admin) return;

    if (adminEmail === user.email) {
      showMessage("Self-deactivation violates root safety locks", "error");
      return;
    }

    setSaving(true);
    const result = await setAdminUser({
      ...admin,
      isActive: !currentStatus,
      updatedBy: user.email,
      updatedAt: new Date(),
    });

    if (result.success) {
      await logAdminAction(
        user.uid,
        user.email,
        currentStatus ? "admin_deactivated" : "admin_activated",
        { targetEmail: adminEmail },
        adminEmail,
        "admin"
      );
      showMessage(`Identity state altered to ${currentStatus ? "INACTIVE" : "ACTIVE"}`);
      loadAdmins();
    } else {
      showMessage(`State change request rejected: ${result.error}`, "error");
    }
    setSaving(false);
  };

  const getRoleBadge = (role) => {
    const colors = ROLE_COLORS[role] || { bg: "rgba(255,255,255,0.03)", color: "#fff", border: "rgba(255,255,255,0.08)" };
    return (
      <span style={{
        padding: "3px 10px",
        borderRadius: "6px",
        fontSize: "10px",
        fontWeight: "800",
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        letterSpacing: "0.5px",
        textTransform: "uppercase"
      }}>
        {ROLE_NAMES[role] || role}
      </span>
    );
  };

  if (adminRole !== ADMIN_ROLES.SUPER_ADMIN) {
    return (
      <div style={{
        textAlign: "center",
        padding: "60px 40px",
        background: "rgba(255,255,255,0.01)",
        border: "1px dashed rgba(255,255,255,0.08)",
        borderRadius: "16px",
      }}>
        <div style={{ 
          fontSize: "40px", marginBottom: "16px",
          display: "flex", justifyContent: "center"
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M12 8v4"/>
            <path d="M12 16h.01"/>
          </svg>
        </div>
        <h3 style={{ color: "#fff", margin: "0 0 10px 0", fontSize: "18px", fontWeight: "800", letterSpacing: "-0.3px" }}>Security Access Intercept</h3>
        <p style={{ color: T.textSec, fontSize: "13px", margin: 0, lineHeight: "1.6" }}>
          Your authorization signature is insufficient. Root settings management maps are locked exclusively to Super Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="settings-inner" style={{ 
      color: "#f1f5f9",
      fontFamily: "'Quicksand', -apple-system, sans-serif",
      padding: "0 4px 20px 4px",
      animation: "premiumFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
    }}>
      <style>{`
        @keyframes premiumFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes premiumSpin {
          to { transform: rotate(360deg); }
        }
        .premium-input::placeholder { color: rgba(255, 255, 255, 0.2); }
        .premium-input:focus { border-color: ${T.cyan} !important; background: rgba(255,255,255,0.04) !important; box-shadow: 0 0 0 1px ${T.cyan}33 !important; }
        .premium-row { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .premium-row:hover { background: rgba(255, 255, 255, 0.035) !important; border-color: rgba(255, 255, 255, 0.12) !important; transform: translateY(-1px); box-shadow: 0 12px 30px rgba(0,0,0,0.2); }
        .premium-select-box { transition: border-color 0.2s, background 0.2s; }
        .premium-select-box:hover:not(:disabled) { border-color: rgba(255,255,255,0.2) !important; background: rgba(255,255,255,0.06) !important; }
        .premium-select-container { position: relative; }
        .premium-select-container::after {
          content: '▼';
          font-size: 8px;
          color: rgba(255, 255, 255, 0.3);
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
      `}</style>

      {/* DASHBOARD HEADER */}
      <div style={{ 
        paddingBottom: "16px", 
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div>
          <h2 style={{ margin: "0 0 3px 0", fontSize: "20px", color: "#fff", fontWeight: "800", letterSpacing: "-0.5px" }}>
            Identity & Access Maps
          </h2>
          <p style={{ margin: 0, color: T.textSec, fontSize: "12px" }}>
            Provision systemic administrator endpoints and scale credential parameters
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn"
        >
          {showAddForm ? "Close Panel" : "+ Initialize Admin"}
        </button>
      </div>

      {/* DYNAMIC SYSTEM FEEDBACK */}
      {message && (
        <div style={{
          padding: "10px 16px",
          marginBottom: "16px",
          background: messageType === "success" ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
          border: `1px solid ${messageType === "success" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
          borderRadius: "12px",
          color: messageType === "success" ? "#a3e635" : "#fca5a5",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          animation: "premiumFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <span style={{ display: "flex", alignItems: "center" }}>
            {messageType === "success" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
          </span>
          <span style={{ fontWeight: "600" }}>{message}</span>
        </div>
      )}

      {/* CONFIGURATION BLOCKS/PANELS */}
      {showAddForm && (
        <div style={{
          background: "rgba(255,255,255,0.01)",
          borderRadius: "14px",
          padding: "18px",
          marginBottom: "20px",
          border: `1px solid ${T.cyan}25`,
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          animation: "premiumFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#fff", fontSize: "14px", fontWeight: "800", letterSpacing: "-0.2px" }}>
            Initialize Administrative Access Token
          </h3>
          <form onSubmit={handleAddAdmin}>
            <div className="settings-form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "18px" }}>
              <div>
                <label style={{ fontSize: "9px", color: T.textSec, marginBottom: "6px", display: "block", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: "700" }}>
                  Target Identity Vector *
                </label>
                <input
                  className="premium-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="operator@system.domain"
                  required
                  style={{
                    width: "100%", padding: "10px 12px",
                    background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "8px", color: "#fff", fontSize: "12px", outline: "none",
                    transition: "all 0.2s"
                  }}
                />
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "4px", marginBottom: 0 }}>
                  String signature must identify an active record in core collections.
                </p>
              </div>
              <div>
                <label style={{ fontSize: "9px", color: T.textSec, marginBottom: "6px", display: "block", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: "700" }}>
                  Systemic Strategy Assignment
                </label>
                <div className="premium-select-container">
                  <select
                    className="premium-select-box"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: "100%", padding: "10px 12px", background: "#0b0b0c",
                      border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px",
                      color: "#fff", fontSize: "12px", outline: "none", cursor: "pointer", appearance: "none", fontFamily: "Quicksand"
                    }}
                  >
                    <option value={ADMIN_ROLES.MANAGER}>Manager</option>
                    <option value={ADMIN_ROLES.ANALYST}>Analyst</option>
                    <option value={ADMIN_ROLES.SUPPORT}>Support</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: "8px 16px", background: "transparent",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
                  color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "12px", fontWeight: "600",
                  transition: "all 0.2s", fontFamily: "Quicksand"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
              >
                Cancel Pipeline
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "8px 20px",
                  background: saving ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${T.green}, #15803d)`,
                  border: "none", borderRadius: "8px", color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer", fontWeight: "700", fontSize: "12px",
                  boxShadow: saving ? "none" : `0 4px 14px ${T.green}22`, fontFamily: "Quicksand"
                }}
              >
                {saving ? "Writing Block..." : "Commit Authorization Array"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CORE IDENTITY REPOSITORY DIRECTORY */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: "70px", background: "rgba(255,255,255,0.01)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.03)" }} />
          ))}
        </div>
      ) : admins.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 40px",
          background: "rgba(255,255,255,0.005)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "16px"
        }}>
          <p style={{ color: T.textSec, fontSize: "13px", margin: 0 }}>No administrative data nodes verified inside current runtime context.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {admins.map(admin => {
            const isCurrentUser = admin.id === user.email;
            const colors = ROLE_COLORS[admin.role] || { border: "rgba(255,255,255,0.06)", color: "#fff" };
            
            return (
              <div
                key={admin.id}
                className="premium-row settings-admin-card"
                style={{
                  background: "rgba(255,255,255,0.01)",
                  borderRadius: "14px",
                  padding: "14px 20px",
                  border: `1px solid ${admin.isActive ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)"}`,
                  opacity: admin.isActive ? 1 : 0.45,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px"
                }}
              >
                <div style={{ flex: 1, minWidth: "240px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "8px",
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ce3f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                    <span style={{ fontWeight: "700", color: "#fff", fontSize: "14px", fontFamily: "monospace", letterSpacing: "-0.2px" }}>
                      {admin.id}
                    </span>
                    {getRoleBadge(admin.role)}
                    
                    {!admin.isActive && (
                      <span style={{
                        padding: "1px 8px", borderRadius: "4px", fontSize: "8px", fontWeight: "800",
                        background: "rgba(239,68,68,0.1)", color: T.red, border: `1px solid ${T.red}22`, letterSpacing: "0.5px"
                      }}>
                        SUSPENDED
                      </span>
                    )}
                    {isCurrentUser && (
                      <span style={{
                        padding: "1px 8px", borderRadius: "4px", fontSize: "8px", fontWeight: "800",
                        background: "rgba(76,227,247,0.1)", color: T.cyan, border: `1px solid ${T.cyan}22`, letterSpacing: "0.5px"
                      }}>
                        MY_SESSION
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "6px" }}>
                    <p style={{ margin: 0, color: "rgba(255,255,255,0.25)", fontSize: "10px" }}>
                      Active Node Check: <span style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>{admin.lastLoginAt?.toDate?.()?.toLocaleString("en-IN") || "None Recorded"}</span>
                      {admin.lastLoginIP && <> &bull; IP: <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{admin.lastLoginIP}</span></>}
                    </p>
                  </div>
                  <p style={{ margin: "2px 0 0 0", color: "rgba(255,255,255,0.18)", fontSize: "10px" }}>
                    Pipeline Genesis: {admin.createdAt?.toDate?.()?.toLocaleDateString("en-IN") || "—"} {admin.createdBy && `via channel [${admin.createdBy}]`}
                  </p>
                </div>
                
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {!isCurrentUser && (
                    <div className="premium-select-container">
                      <select
                        className="premium-select-box"
                        value={admin.role}
                        onChange={(e) => handleUpdateRole(admin.id, e.target.value)}
                        disabled={saving}
                        style={{
                          padding: "6px 28px 6px 10px", background: "#0b0b0c",
                          border: `1px solid rgba(255,255,255,0.08)`, borderRadius: "6px",
                          color: colors.color || "#fff", fontSize: "11px", fontWeight: "700",
                          cursor: saving ? "not-allowed" : "pointer", appearance: "none",
                          fontFamily: "Quicksand"
                        }}
                      >
                        <option value={ADMIN_ROLES.SUPER_ADMIN}>Super Admin</option>
                        <option value={ADMIN_ROLES.MANAGER}>Manager</option>
                        <option value={ADMIN_ROLES.ANALYST}>Analyst</option>
                        <option value={ADMIN_ROLES.SUPPORT}>Support</option>
                      </select>
                    </div>
                  )}
                  
                  {!isCurrentUser && (
                    <button
                      onClick={() => handleToggleActive(admin.id, admin.isActive)}
                      disabled={saving}
                      style={{
                        padding: "6px 12px",
                        background: "transparent",
                        border: `1px solid ${admin.isActive ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
                        borderRadius: "6px", color: admin.isActive ? "#fca5a5" : "#a3e635",
                        cursor: saving ? "not-allowed" : "pointer", fontSize: "11px", fontWeight: "700",
                        transition: "all 0.2s", fontFamily: "Quicksand"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = admin.isActive ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {admin.isActive ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}