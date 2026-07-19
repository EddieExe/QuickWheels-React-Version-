// src/pages/admin/EmailTemplateEditor.jsx
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  orange: "#f59e0b",
  purple: "#a855f7",
  darkPurple: "#7c3aed",
  blue: "#3b82f6",
  textSec: "rgba(255,255,255,0.4)",
};

const TEMPLATE_TYPES = [
  { id: "booking_confirmed", label: "Booking Confirmed", color: T.green },
  { id: "pickup_reminder", label: "Pickup Reminder", color: T.purple },
  { id: "return_reminder", label: "Return Reminder", color: T.blue },
  { id: "late_return", label: "Late Return Alert", color: T.orange },
  { id: "no_show_penalty", label: "No-Show Penalty", color: T.red },
  { id: "pickup_2h_reminder", label: "2-Hour Reminder", color: T.darkPurple },
];

const DEFAULT_TEMPLATES = {
  booking_confirmed: `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 32px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.05);">
      <h2 style="color: #22c55e; margin-top: 0; font-size: 24px; letter-spacing: -0.5px;">✓ Booking Confirmed</h2>
      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">Dear {{userName}},</p>
      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">Your premium reservation for the <strong>{{carModel}}</strong> is locked in and ready.</p>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin: 24px 0;">
        <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.5); font-size: 13px;"><strong>Hub Pickup:</strong> {{pickupDate}} @ {{pickup}}</p>
        <p style="margin: 0 0 10px 0; color: rgba(255,255,255,0.5); font-size: 13px;"><strong>Hub Dropoff:</strong> {{dropoffDate}} @ {{dropoff}}</p>
        <p style="margin: 0; color: #4ce3f7; font-size: 14px; font-weight: bold;">Total Gross Rate: {{total}}</p>
      </div>
      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin-bottom: 0;">Thank you for staging with QuickWheels Operational Hubs.</p>
    </div>
  `,
  pickup_reminder: `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 32px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.05);">
      <h2 style="color: #a855f7; margin-top: 0; font-size: 24px; letter-spacing: -0.5px;">⚡ Ready For Pickup</h2>
      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">Dear {{userName}},</p>
      <p style="color: rgba(255,255,255,0.7); line-height: 1.6;">Your allocated asset <strong>{{carModel}}</strong> has passed diagnostic testing and is prepared for key handoff.</p>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.6);"><strong>Target Allocation Date:</strong> {{pickupDate}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.6);"><strong>Location Hub:</strong> {{pickup}}</p>
      </div>
    </div>
  `,
};

export default function EmailTemplateEditor() {
  const [selectedType, setSelectedType] = useState("booking_confirmed");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [editorTab, setEditorTab] = useState("code");

  useEffect(() => {
    loadTemplate();
  }, [selectedType]);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadTemplate = async () => {
    try {
      const docRef = doc(db, "email_templates", selectedType);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSubject(data.subject || "");
        setHtmlContent(data.html || DEFAULT_TEMPLATES[selectedType] || "");
      } else {
        setSubject(getDefaultSubject(selectedType));
        setHtmlContent(DEFAULT_TEMPLATES[selectedType] || "");
      }
    } catch (error) {
      console.error("Error loading template:", error);
      showNotification("Failed to load cloud template configuration", "error");
    }
  };

  const getDefaultSubject = (type) => {
    const subjects = {
      booking_confirmed: "✓ Confirmed: Your reservation configuration for {{carModel}}",
      pickup_reminder: "⚡ Dispatch Notice: Your {{carModel}} is prepped for deployment",
      return_reminder: "⏰ Cycle Update: Return allocation sequence for {{carModel}}",
      late_return: "⚠️ Operational Alert: Return window exceeded for asset {{carModel}}",
      no_show_penalty: "🛑 Breach Exception: No-Show baseline enforcement applied",
      pickup_2h_reminder: "⌛ T-Minus 2 Hours: Fleet pickup schedule for {{carModel}}",
    };
    return subjects[type] || "Telemetry Notification Update";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "email_templates", selectedType), {
        subject,
        html: htmlContent,
        updatedAt: new Date(),
      });
      showNotification("Template parameters successfully deployed down-link", "success");
    } catch (error) {
      showNotification("Fault detected during payload compilation: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const renderTemplateSvg = (id, color) => {
    switch (id) {
      case "booking_confirmed":
        return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
      case "pickup_reminder":
        return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;
      case "return_reminder":
        return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
      case "late_return":
        return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
      case "no_show_penalty":
        return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
      case "pickup_2h_reminder":
        return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
      default:
        return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
    }
  };

  return (
    <div 
      style={{ 
        display: "flex", 
        flexDirection: "column",
        height: "100%",
        color: "#f8fafc",
        fontFamily: "'Quicksand', -apple-system, sans-serif"
      }}
    >
      <style>{`
        @keyframes toastIn {
          from { transform: translateY(-20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes contentFade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .premium-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .premium-scroll::-webkit-scrollbar-track { background: transparent; }
        .premium-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.06); border-radius: 10px; }
        .premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.12); }
        
        .side-nav-btn { 
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); 
          position: relative; 
        }
        .side-nav-btn:hover { 
          color: #fff !important; 
          background: rgba(255,255,255,0.04) !important; 
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .template-editor-container {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .template-editor-container > div:first-child {
            width: 100% !important;
            flex-shrink: 0 !important;
          }
          .template-editor-container > div:last-child {
            width: 100% !important;
          }
          .template-editor-container > div:last-child > div {
            padding: 16px !important;
          }
          .template-nav-buttons {
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 4px !important;
          }
          .template-nav-buttons button {
            flex: 1 !important;
            min-width: calc(50% - 4px) !important;
            padding: 8px 10px !important;
            font-size: 11px !important;
          }
          .template-nav-buttons button svg {
            width: 14px !important;
            height: 14px !important;
          }
          .template-editor-header h2 {
            font-size: 18px !important;
          }
          .template-editor-header p {
            font-size: 11px !important;
          }
          .template-editor-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
            margin-bottom: 16px !important;
          }
          .template-subject-input {
            font-size: 13px !important;
            padding: 10px 12px !important;
          }
          .template-variable-badges {
            gap: 4px !important;
          }
          .template-variable-badges span {
            font-size: 9px !important;
            padding: 2px 6px !important;
          }
          .template-editor-tabs {
            gap: 4px !important;
          }
          .template-editor-tabs button {
            font-size: 10px !important;
            padding: 3px 10px !important;
          }
          .template-textarea {
            font-size: 11px !important;
            padding: 12px !important;
            min-height: 200px !important;
          }
          .template-preview {
            height: 250px !important;
            padding: 12px !important;
          }
          .template-action-footer {
            flex-direction: column !important;
            gap: 8px !important;
            padding-top: 14px !important;
          }
          .template-action-footer button {
            width: 100% !important;
            justify-content: center !important;
            padding: 10px !important;
            font-size: 12px !important;
          }
        }

        @media (max-width: 480px) {
          .template-nav-buttons button {
            min-width: calc(50% - 2px) !important;
            font-size: 10px !important;
            padding: 6px 8px !important;
          }
          .template-nav-buttons button svg {
            width: 12px !important;
            height: 12px !important;
          }
          .template-editor-header h2 {
            font-size: 16px !important;
          }
          .template-editor-header p {
            font-size: 10px !important;
          }
          .template-subject-input {
            font-size: 12px !important;
            padding: 8px 10px !important;
          }
          .template-textarea {
            font-size: 10px !important;
            padding: 10px !important;
            min-height: 160px !important;
          }
          .template-preview {
            height: 200px !important;
            padding: 10px !important;
          }
          .template-action-footer button {
            font-size: 11px !important;
            padding: 8px !important;
          }
        }
      `}</style>

      {/* Global Status Toast */}
      {notification && (
        <div
          style={{
            position: "fixed", top: "24px", right: "32px", padding: "14px 24px", borderRadius: "14px",
            background: notification.type === "error" ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "linear-gradient(135deg, #10b981, #059669)",
            color: "#fff", fontSize: "13px", fontWeight: "700", zIndex: 1100,
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", gap: "10px",
            animation: "toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          {notification.message}
        </div>
      )}


      {/* TWO-COLUMN LAYOUT */}
      <div className="template-editor-container" style={{ display: "flex", gap: "24px", flex: 1, minHeight: 0, overflow: "hidden" }}>
        
        {/* LEFT COLUMN - Template Index (22%) */}
        <div style={{ width: "22%", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div 
            style={{ 
              background: "rgba(255,255,255,0.01)", 
              border: "1px solid rgba(255,255,255,0.04)", 
              borderRadius: "16px", 
              padding: "14px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "4px"
            }}
          >
            <div style={{ padding: "0 12px 8px 12px", fontSize: "10px", fontWeight: "800", color: T.textSec, letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Notification Models
            </div>
            
            <div className="template-nav-buttons" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {TEMPLATE_TYPES.map((template) => {
                const isSelected = selectedType === template.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedType(template.id)}
                    className="side-nav-btn"
                    style={{
                      display: "flex", 
                      alignItems: "center", 
                      gap: "10px", 
                      padding: "8px 12px", 
                      borderRadius: "10px",
                      fontFamily: "inherit", 
                      fontSize: "12px", 
                      fontWeight: "600", 
                      cursor: "pointer", 
                      border: "none", 
                      width: "100%", 
                      textAlign: "left",
                      background: isSelected ? `rgba(168,85,247,0.08)` : "transparent",
                      color: isSelected ? T.purple : "rgba(255,255,255,0.45)",
                      borderLeft: isSelected ? `3px solid ${T.purple}` : "3px solid transparent",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.borderLeftColor = T.purple;
                        e.currentTarget.style.transform = "translateX(2px)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderLeftColor = "transparent";
                        e.currentTarget.style.transform = "translateX(0)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                      }
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      flexShrink: 0,
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      background: isSelected ? `rgba(168,85,247,0.12)` : "rgba(255,255,255,0.03)",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = `rgba(168,85,247,0.12)`;
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      }
                    }}
                    >
                      {renderTemplateSvg(template.id, template.color)}
                    </div>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "11.5px" }}>
                      {template.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Editor Workspace (78%) */}
        <div 
          className="premium-scroll" 
          style={{ 
            width: "78%", 
            overflowY: "auto", 
            paddingBottom: "20px", 
            paddingRight: "2px",
            animation: "contentFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
          }}
        >
          <div 
            style={{ 
              background: "rgba(255,255,255,0.01)", 
              border: "1px solid rgba(255,255,255,0.04)", 
              borderRadius: "16px", 
              padding: "20px"
            }}
          >
            {/* SUBJECT FIELD */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ color: T.purple, fontSize: "10px", fontWeight: "800", marginBottom: "6px", display: "block", letterSpacing: "1px", textTransform: "uppercase" }}>
                Email Subject Header Line
              </label>
              <input 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                className="template-subject-input"
                style={{ 
                  width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.15)", 
                  border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", 
                  color: "#fff", fontFamily: "inherit", fontSize: "13px", fontWeight: "600",
                  outline: "none", boxSizing: "border-box",
                  transition: "all 0.25s ease",
                }}
                onFocus={e => { e.target.style.borderColor = T.purple; e.target.style.boxShadow = `0 0 0 4px ${T.purple}10`; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.05)"; e.target.style.boxShadow = "none"; }}
                placeholder="Declare baseline email communication subject string..." 
              />
              
              {/* VARIABLE BADGES */}
              <div className="template-variable-badges" style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginRight: "2px", fontWeight: "700" }}>INJECTABLE:</span>
                {["userName", "carModel", "pickupDate", "dropoffDate", "pickup", "dropoff", "total"].map((variable) => (
                  <span 
                    key={variable} 
                    onClick={() => {
                      setSubject(prev => prev + ` {{${variable}}}`);
                      showNotification(`Injected {{${variable}}} to subject path`, "info");
                    }}
                    style={{ 
                      fontSize: "9px", fontFamily: "monospace", background: "rgba(255,255,255,0.02)", 
                      color: "rgba(168,85,247,0.6)", padding: "2px 7px", borderRadius: "5px", 
                      border: "1px solid rgba(255,255,255,0.03)", cursor: "pointer", 
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={(e) => { 
                      e.currentTarget.style.borderColor = T.purple; 
                      e.currentTarget.style.color = "#c084fc"; 
                      e.currentTarget.style.background = `rgba(168,85,247,0.08)`;
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.03)"; 
                      e.currentTarget.style.color = "rgba(168,85,247,0.6)"; 
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {"{{"}{variable}{"}}"}
                  </span>
                ))}
              </div>
            </div>

            {/* HTML EDITOR */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ color: T.purple, fontSize: "10px", fontWeight: "800", display: "block", letterSpacing: "1px", textTransform: "uppercase" }}>
                  HTML Markup Engine Matrix
                </label>
                
                <div className="template-editor-tabs" style={{ display: "flex", background: "rgba(0,0,0,0.2)", padding: "2px", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <button 
                    onClick={() => setEditorTab("code")}
                    style={{
                      padding: "3px 10px", fontSize: "10px", fontWeight: "700", borderRadius: "5px", cursor: "pointer", border: "none", fontFamily: "inherit",
                      background: editorTab === "code" ? `rgba(168,85,247,0.15)` : "transparent",
                      color: editorTab === "code" ? T.purple : "rgba(255,255,255,0.3)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={e => {
                      if (editorTab !== "code") {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (editorTab !== "code") {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "rgba(255,255,255,0.3)";
                      }
                    }}
                  >
                    Code
                  </button>
                  <button 
                    onClick={() => setEditorTab("preview")}
                    style={{
                      padding: "3px 10px", fontSize: "10px", fontWeight: "700", borderRadius: "5px", cursor: "pointer", border: "none", fontFamily: "inherit",
                      background: editorTab === "preview" ? `rgba(168,85,247,0.15)` : "transparent",
                      color: editorTab === "preview" ? T.purple : "rgba(255,255,255,0.3)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={e => {
                      if (editorTab !== "preview") {
                        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (editorTab !== "preview") {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "rgba(255,255,255,0.3)";
                      }
                    }}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {editorTab === "code" ? (
                <textarea 
                  value={htmlContent} 
                  onChange={(e) => setHtmlContent(e.target.value)} 
                  rows={12} 
                  className="template-textarea"
                  style={{ 
                    width: "100%", padding: "14px", background: "rgba(0,0,0,0.15)", 
                    border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", 
                    color: "#a4b1cd", fontFamily: "'Fira Code', monospace", fontSize: "11.5px", 
                    lineHeight: "1.6", resize: "vertical", outline: "none", boxSizing: "border-box",
                    minHeight: "240px",
                    transition: "all 0.25s ease",
                  }}
                  onFocus={e => { e.target.style.borderColor = T.purple; e.target.style.boxShadow = `0 0 0 4px ${T.purple}10`; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.05)"; e.target.style.boxShadow = "none"; }}
                />
              ) : (
                <div 
                  className="template-preview"
                  style={{
                    width: "100%", height: "280px", background: "#090d16",
                    border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px",
                    padding: "14px", overflowY: "auto", boxSizing: "border-box",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${T.purple}30`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}
                >
                  <div 
                    dangerouslySetInnerHTML={{ 
                      html: htmlContent
                        .replace(/{{userName}}/g, "Abhay Shriramjwar")
                        .replace(/{{carModel}}/g, "Tesla Model S Plaid")
                        .replace(/{{pickupDate}}/g, "2026-06-20")
                        .replace(/{{dropoffDate}}/g, "2026-06-25")
                        .replace(/{{pickup}}/g, "Pune Premium Hub Alpha")
                        .replace(/{{dropoff}}/g, "Pune Premium Hub Alpha")
                        .replace(/{{total}}/g, "₹45,500.00")
                    }} 
                  />
                </div>
              )}
            </div>

            {/* ACTION FOOTER */}
            <div className="template-action-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "16px" }}>
              <button 
                onClick={() => {
                  const outWin = window.open();
                  outWin.document.write(htmlContent);
                  outWin.document.close();
                }} 
                style={{ 
                  padding: "9px 18px", background: "rgba(255,255,255,0.02)", 
                  border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", 
                  color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "12px",
                  fontWeight: "700", fontFamily: "inherit", transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)"; 
                  e.currentTarget.style.borderColor = `${T.purple}30`;
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)"; 
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                }}
              >
                Launch Isolation Window
              </button>
              
              <button 
                className="btn"
              >
                {saving ? "Compiling..." : "Deploy Production"}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}