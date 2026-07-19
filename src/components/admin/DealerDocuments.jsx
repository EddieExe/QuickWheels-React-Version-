// src/components/admin/DealerDocuments.jsx
import { useState, useEffect, useRef } from "react";
import {
  doc, getDoc, updateDoc, collection,
  addDoc, onSnapshot, Timestamp,
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from "firebase/storage";
import { db, storage } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

// ── Config ────────────────────────────────────────────────────────────────────

const REQUIRED_DOCS = [
  {
    id:       "gst_certificate",
    label:    "GST Certificate",
    icon: (color) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    required: true,
    desc:     "GST registration certificate issued by the government",
    accept:   "image/*,application/pdf",
  },
  {
    id:       "business_registration",
    label:    "Business Registration",
    icon: (color) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <circle cx="10" cy="13" r="2"/>
        <path d="m21 21-4.3-4.3"/>
      </svg>
    ),
    required: true,
    desc:     "Certificate of incorporation or business registration document",
    accept:   "image/*,application/pdf",
  },
  {
    id:       "owner_id",
    label:    "Owner ID Proof",
    icon: (color) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 3-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    required: true,
    desc:     "Official identification card or passport of the business owner",
    accept:   "image/*,application/pdf",
  },
  {
    id:       "insurance",
    label:    "Vehicle Insurance Policy",
    icon: (color) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    required: false,
    desc:     "Fleet or individual vehicle insurance documents",
    accept:   "image/*,application/pdf",
  },
  {
    id:       "bank_details",
    label:    "Bank Account Proof",
    icon: (color) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <circle cx="12" cy="12" r="2"/>
        <path d="M6 12h.01M18 12h.01"/>
      </svg>
    ),
    required: false,
    desc:     "Cancelled cheque or bank statement for payout setup",
    accept:   "image/*,application/pdf",
  },
];

const STATUS_STYLES = {
  verified:  { color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)",   label: "Verified"  },
  rejected:  { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",   label: "Rejected"  },
  pending:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)",  label: "Pending Verification"   },
  uploaded:  { color: "#f43f5e", bg: "rgba(244,63,94,0.08)",  border: "rgba(244,63,94,0.2)",   label: "Uploaded"  },
  missing:   { color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)", label: "Not Uploaded" },
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function DealerDocuments({ dealer, onClose }) {
  const { user } = useAuth();
  const [docs, setDocs]             = useState({});
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState({});
  const [progress, setProgress]     = useState({});
  const [actionDoc, setActionDoc]   = useState(null); 
  const [noteText, setNoteText]     = useState("");
  const [saving, setSaving]         = useState(false);
  const fileInputRefs               = useRef({});

  useEffect(() => {
    if (!dealer?.id) return;
    const unsub = onSnapshot(
      doc(db, "dealers", dealer.id),
      snap => {
        if (snap.exists()) {
          setDocs(snap.data().documents || {});
        }
        setLoading(false);
      },
      err => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, [dealer?.id]);

  async function handleUpload(docId, file) {
    if (!file) return;

    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) {
      alert(`File too large. Maximum size is ${maxMB}MB.`);
      return;
    }

    setUploading(p => ({ ...p, [docId]: true }));
    setProgress(p => ({ ...p, [docId]: 0 }));

    try {
      const ext      = file.name.split(".").pop();
      const path     = `dealers/${dealer.id}/documents/${docId}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      const task     = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          snap => setProgress(p => ({ ...p, [docId]: Math.round((snap.bytesTransferred / snap.totalBytes) * 100) })),
          reject,
          resolve
        );
      });

      const url = await getDownloadURL(storageRef);

      const docData = {
        url,
        storagePath: path,
        fileName:    file.name,
        fileType:    file.type,
        fileSize:    file.size,
        status:      "uploaded",
        uploadedAt:  Timestamp.now(),
        verifiedAt:  null,
        verifiedBy:  null,
        rejectedAt:  null,
        rejectedBy:  null,
        rejectionNote: "",
        adminNotes:  "",
      };

      await updateDoc(doc(db, "dealers", dealer.id), {
        [`documents.${docId}`]: docData,
        updatedAt: Timestamp.now(),
      });

      await addDoc(collection(db, "admin_audit_logs"), {
        action:      "document_uploaded",
        dealerId:    dealer.id,
        dealerName:  dealer.businessName,
        documentId:  docId,
        uploadedBy:  user?.email || "dealer",
        createdAt:   Timestamp.now(),
      });

    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(p => ({ ...p, [docId]: false }));
      setProgress(p => ({ ...p, [docId]: 0 }));
    }
  }

  async function handleVerify(docId) {
    setSaving(true);
    try {
      await updateDoc(doc(db, "dealers", dealer.id), {
        [`documents.${docId}.status`]:     "verified",
        [`documents.${docId}.verifiedAt`]: Timestamp.now(),
        [`documents.${docId}.verifiedBy`]: user?.email || "admin",
        [`documents.${docId}.rejectedAt`]: null,
        [`documents.${docId}.rejectionNote`]: "",
        updatedAt: Timestamp.now(),
      });

      const allVerified = REQUIRED_DOCS
        .filter(d => d.required)
        .every(d => {
          if (d.id === docId) return true;
          return docs[d.id]?.status === "verified";
        });

      if (allVerified) {
        await updateDoc(doc(db, "dealers", dealer.id), {
          documentsVerified: true,
          documentsVerifiedAt: Timestamp.now(),
        });
      }

      await addDoc(collection(db, "admin_audit_logs"), {
        action: "document_verified", dealerId: dealer.id,
        documentId: docId, verifiedBy: user?.email,
        createdAt: Timestamp.now(),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!actionDoc || !noteText.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "dealers", dealer.id), {
        [`documents.${actionDoc.docId}.status`]:        "rejected",
        [`documents.${actionDoc.docId}.rejectedAt`]:    Timestamp.now(),
        [`documents.${actionDoc.docId}.rejectedBy`]:    user?.email || "admin",
        [`documents.${actionDoc.docId}.rejectionNote`]: noteText,
        [`documents.${actionDoc.docId}.verifiedAt`]:    null,
        updatedAt: Timestamp.now(),
      });

      await addDoc(collection(db, "admin_audit_logs"), {
        action: "document_rejected", dealerId: dealer.id,
        documentId: actionDoc.docId, rejectedBy: user?.email,
        reason: noteText, createdAt: Timestamp.now(),
      });

      setActionDoc(null); setNoteText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const counts = REQUIRED_DOCS.reduce((acc, d) => {
    const status = docs[d.id]?.status || "missing";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const allRequiredVerified = REQUIRED_DOCS
    .filter(d => d.required)
    .every(d => docs[d.id]?.status === "verified");

  const inp = {
    width: "100%", boxSizing: "border-box",
    padding: "12px 16px", borderRadius: "12px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff", fontSize: "13px",
    fontFamily: "Quicksand,sans-serif", outline: "none",
    resize: "vertical",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "150px" }}>
        <div style={{ width: "22px", height: "22px", border: "2px solid rgba(244,63,94,0.15)", borderTopColor: "#f43f5e", borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Quicksand,sans-serif" }}>
      
      <style>{`
        .dm-doc-card { transition: border-color 0.2s ease, background-color 0.2s ease; }
        .dm-doc-card:hover { background: rgba(255,255,255,0.035) !important; }
        .dm-btn { transition: all 0.2s ease; cursor: pointer; display: inline-flex; alignItems: center; gap: 6px; }
        .dm-btn:hover { transform: translateY(-1px); opacity: 0.95; }
        .dm-btn:active { transform: translateY(0); }
        .dm-btn:disabled { transform: none !important; opacity: 0.5 !important; cursor: not-allowed; }
      `}</style>

      {/* ── Reject Modal ── */}
      {actionDoc && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "rgba(15, 11, 28, 0.75)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
        }} onClick={() => { setActionDoc(null); setNoteText(""); }}>
          <div style={{
            background: "#0f0b1c", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "20px", padding: "28px", maxWidth: "460px", width: "100%",
            boxShadow: "0 25px 60px -15px rgba(0,0,0,0.8)",
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 6px", color: "#ef4444", fontSize: "18px", fontWeight: "800", letterSpacing: "-0.4px" }}>
              Reject Secure Document
            </h3>
            <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.4)", fontSize: "12.5px", lineHeight: "1.5" }}>
              Specify the criteria discrepancies or visibility anomalies so the partner can re-verify and adjust.
            </p>
            <textarea
              rows={4}
              style={inp}
              placeholder="Provide clean instructions..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={handleReject}
                disabled={!noteText.trim() || saving}
                className="dm-btn"
                style={{
                  flex: 1, padding: "12px", borderRadius: "11px", border: "none",
                  background: "linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)", color: "#fff",
                  fontFamily: "inherit", fontWeight: "700", fontSize: "13px", justifyContent: "center"
                }}
              >{saving ? "Updating Log..." : "Confirm Rejection"}</button>
              <button
                onClick={() => { setActionDoc(null); setNoteText(""); }}
                className="dm-btn"
                style={{
                  padding: "12px 20px", borderRadius: "11px",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.5)", fontFamily: "inherit", fontWeight: "600", fontSize: "13px",
                }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Header Metrics Row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "14px", padding: "10px 16px" }}>
        <div>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "#f43f5e", letterSpacing: "1.5px", textTransform: "uppercase" }}>Vault Indexes</span>
          <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>File tracking log matrix</p>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {[
            [counts.verified || 0, "#10b981"],
            [counts.uploaded || 0, "#f43f5e"],
            [counts.rejected || 0, "#ef4444"],
            [counts.missing  || 0, "rgba(255,255,255,0.2)"],
          ].map(([count, color], idx) => (
            <span key={idx} style={{
              width: "24px", height: "24px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              color, display: "flex", alignItems: "center", justifyContent: "center"
            }}>{count}</span>
          ))}
        </div>
      </div>

      {/* ── Compliance State Banner ── */}
      {allRequiredVerified && (
        <div style={{
          padding: "12px 16px", marginBottom: "20px", borderRadius: "14px",
          background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
          <p style={{ margin: 0, color: "#10b981", fontWeight: "700", fontSize: "12.5px" }}>
            All required document structures match verification baselines. Compliance clear.
          </p>
        </div>
      )}

      {/* ── Document Stack Cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {REQUIRED_DOCS.map(docDef => {
          const docData   = docs[docDef.id];
          const status    = docData?.status || "missing";
          const style     = STATUS_STYLES[status] || STATUS_STYLES.missing;
          const isUploading = uploading[docDef.id];
          const uploadPct   = progress[docDef.id] || 0;
          const isPDF     = docData?.fileType === "application/pdf";

          return (
            <div key={docDef.id} className="dm-doc-card" style={{
              borderRadius: "16px", overflow: "hidden",
              background: "rgba(255,255,255,0.01)",
              border: `1px solid ${status === "missing" ? "rgba(255,255,255,0.05)" : style.border}`,
            }}>
              <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "18px" }}>

                {/* Left Dynamic Status Icon Module with color function applied */}
                <div style={{
                  width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0,
                  background: status === "missing" ? "rgba(255,255,255,0.02)" : style.bg, 
                  border: `1px solid ${status === "missing" ? "rgba(255,255,255,0.05)" : style.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {docDef.icon(status === "missing" ? "rgba(255,255,255,0.3)" : style.color)}
                </div>

                {/* Center Core Info Meta Node */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <p style={{ margin: 0, color: "#fff", fontWeight: "700", fontSize: "14px", letterSpacing: "-0.2px" }}>{docDef.label}</p>
                    
                    {docDef.required ? (
                      <span style={{ fontSize: "9px", color: "#f43f5e", background: "rgba(244,63,94,0.08)", padding: "1px 6px", borderRadius: "4px", fontWeight: "800", letterSpacing: "0.5px" }}>REQUIRED</span>
                    ) : (
                      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.02)", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>OPTIONAL</span>
                    )}

                    <span style={{
                      padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "700",
                      background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                      marginLeft: "auto"
                    }}>{style.label}</span>
                  </div>
                  
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "11.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docDef.desc}</p>
                  
                  {/* Inner dynamic context feedback trails */}
                  {docData?.fileName && (
                    <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.25)", fontSize: "10.5px", fontFamily: "monospace" }}>
                      {docData.fileName} · {(docData.fileSize / 1024).toFixed(0)} KB
                    </p>
                  )}
                  {docData?.rejectionNote && (
                    <p style={{ margin: "6px 0 0", color: "#ef4444", fontSize: "11px", background: "rgba(239,68,68,0.04)", padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.12)" }}>
                      <strong style={{ fontWeight: "700" }}>Discrepancy:</strong> {docData.rejectionNote}
                    </p>
                  )}
                  {docData?.verifiedBy && status === "verified" && (
                    <p style={{ margin: "5px 0 0", color: "rgba(16,185,129,0.7)", fontSize: "11px" }}>
                      Authorized by {docData.verifiedBy} on {docData.verifiedAt?.toDate?.()?.toLocaleDateString("en-IN") ?? "—"}
                    </p>
                  )}
                </div>

                {/* Right Action Mutation Control Pipeline */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0, paddingLeft: "10px" }}>
                  
                  {/* View Asset */}
                  {docData?.url && (
                    <a
                      href={docData.url}
                      target="_blank"
                      rel="noreferrer"
                      className="dm-btn"
                      style={{
                        padding: "7px 12px", borderRadius: "8px", textDecoration: "none",
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: "700",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      {isPDF ? "PDF" : "View"}
                    </a>
                  )}

                  {/* Accept Node */}
                  {(status === "uploaded" || status === "rejected") && (
                    <button
                      onClick={() => handleVerify(docDef.id)}
                      disabled={saving}
                      className="dm-btn"
                      style={{
                        padding: "7px 12px", borderRadius: "8px", border: "none",
                        background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", color: "#fff",
                        fontFamily: "inherit", fontWeight: "700", fontSize: "12px",
                      }}
                    >Verify</button>
                  )}

                  {/* Reject Mutation Trigger */}
                  {(status === "uploaded" || status === "verified") && (
                    <button
                      onClick={() => setActionDoc({ docId: docDef.id, type: "reject" })}
                      className="dm-btn"
                      style={{
                        padding: "7px 12px", borderRadius: "8px",
                        background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)",
                        color: "#ef4444", fontFamily: "inherit", fontWeight: "700", fontSize: "12px",
                      }}
                    >Reject</button>
                  )}

                  {/* Operational Upload Gateway */}
                  <div>
                    <input
                      type="file"
                      accept={docDef.accept}
                      style={{ display: "none" }}
                      ref={el => fileInputRefs.current[docDef.id] = el}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(docDef.id, file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => fileInputRefs.current[docDef.id]?.click()}
                      disabled={isUploading}
                      className="dm-btn"
                      style={{
                        padding: "7px 12px", borderRadius: "8px",
                        background: status === "missing" ? "linear-gradient(135deg, #9f1239 0%, #f43f5e 100%)" : "rgba(255,255,255,0.03)", 
                        border: status === "missing" ? "none" : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: status === "missing" ? "0 4px 12px rgba(244,63,94,0.15)" : "none",
                        color: status === "missing" ? "#fff" : "rgba(255,255,255,0.5)", 
                        fontFamily: "inherit", fontWeight: "700", fontSize: "12px",
                      }}
                    >
                      {isUploading ? `${uploadPct}%` : status === "missing" ? "Upload" : "Replace"}
                    </button>
                  </div>

                </div>
              </div>

              {/* Progress Track Injector */}
              {isUploading && (
                <div style={{ height: "2px", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{
                    height: "100%", width: `${uploadPct}%`,
                    background: "linear-gradient(90deg, #9f1239 0%, #f43f5e 100%)",
                    transition: "width 0.2s ease",
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Sandbox Rule Board Disclaimer ── */}
      <div style={{
        marginTop: "20px", padding: "12px 16px", borderRadius: "14px",
        background: "rgba(244,63,94,0.02)", border: "1px solid rgba(244,63,94,0.1)",
      }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "11px", lineHeight: "1.6" }}>
          💡 <span style={{ color: "#f43f5e", fontWeight: "700" }}>Storage Pipeline Verification:</span> Ensure absolute operational state clearance parameters matching configuration path vectors: 
          <code style={{ color: "#f43f5e", background: "rgba(244,63,94,0.06)", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", marginLeft: "4px", fontFamily: "monospace" }}>
            match /dealers/&#123;id&#125;/documents/&#123;file&#125;
          </code>
        </p>
      </div>
    </div>
  );
}