// src/components/dealer/assistance/ServiceProviderManager.jsx
import { useState, useEffect } from "react";
import { db } from "../../../firebase";
import {
  collection, addDoc, updateDoc, getDocs,
  doc, serverTimestamp, query, orderBy,
} from "firebase/firestore";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  red: "#ef4444",
  textSec: "rgba(255,255,255,0.4)",
};

const PROVIDER_TYPES = {
  IN_HOUSE: "in_house",
  TOWING_PARTNER: "towing_partner",
  THIRD_PARTY: "third_party",
};

const EMPTY_FORM = {
  name: "",
  phone: "",
  type: PROVIDER_TYPES.THIRD_PARTY,
  categories: [],
  address: "",
  contactPerson: "",
  isActive: true,
};

const CATEGORY_OPTIONS = [
  "tire_shop", "roadside_assistance", "auto_electrician", "fuel_service",
  "locksmith", "mechanic", "garage", "towing_company", "wrecker",
];

async function fetchProviders(dealerId) {
  try {
    const ref = collection(db, "dealers", dealerId, "serviceProviders");
    const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

async function saveProvider(dealerId, formData, editingId = null) {
  try {
    const ref = collection(db, "dealers", dealerId, "serviceProviders");
    if (editingId) {
      await updateDoc(doc(ref, editingId), { ...formData, updatedAt: serverTimestamp() });
    } else {
      await addDoc(ref, { ...formData, rating: 0, createdAt: serverTimestamp() });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export default function ServiceProviderManager({ dealerId }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => { loadProviders(); }, [dealerId]);

  async function loadProviders() {
    setLoading(true);
    setProviders(await fetchProviders(dealerId));
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(provider) {
    setEditingId(provider.id);
    setFormData({
      name: provider.name || "",
      phone: provider.phone || "",
      type: provider.type || PROVIDER_TYPES.THIRD_PARTY,
      categories: provider.categories || [],
      address: provider.address || "",
      contactPerson: provider.contactPerson || "",
      isActive: provider.isActive ?? true,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  function toggleCategory(cat) {
    setFormData(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert("Please fill in name and phone");
      return;
    }
    setSaving(true);
    const result = await saveProvider(dealerId, formData, editingId);
    setSaving(false);
    if (result.success) {
      closeForm();
      loadProviders();
    } else {
      alert("Failed to save provider: " + result.error);
    }
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "10px",
    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
    borderRadius: "8px", color: "#fff", fontSize: "13px",
    outline: "none", fontFamily: "Quicksand, sans-serif",
  };

  const labelStyle = {
    fontSize: "11px", color: T.textSec, marginBottom: "5px", display: "block", fontWeight: "600",
  };

  return (
    <div style={{ fontFamily: "Quicksand, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div className="sp_heading">
          {/* Header with inline SVG instead of building emoji */}
          <h2 style={{ 
            margin: "0 0 5px", 
            fontSize: "22px", 
            fontWeight: "800", 
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <svg 
              width="22" 
              height="22" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#ef4444" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ transform: "translateY(-1px)" }}
            >
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <line x1="9" y1="22" x2="9" y2="16" />
              <line x1="15" y1="22" x2="15" y2="16" />
              <line x1="9" y1="16" x2="15" y2="16" />
              <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01" />
            </svg>
            Service Providers
          </h2>
          <p style={{ margin: 0, color: T.textSec, fontSize: "13px" }}>
            Manage in-house and partner service providers
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{
            padding: "10px 20px",
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            border: "none", borderRadius: "10px",
            color: "#fff", cursor: "pointer", fontWeight: "700", fontSize: "13px", fontFamily: "Quicksand"
          }}
        >
          + Add Provider
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="edit_form" style={{
          background: "rgba(255,255,255,.03)", borderRadius: "16px",
          padding: "20px", marginBottom: "20px", border: "1px solid rgba(239,68,68,.2)",
        }}>
          <h3 style={{ margin: "0 0 16px", color: "#ef4444", fontSize: "16px" }}>
            {editingId ? "Edit Provider" : "Add New Provider"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label style={labelStyle}>Provider Name *</label>
                <input
                  style={inputStyle}
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. City Towing Co."
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Phone Number *</label>
                <input
                  style={inputStyle}
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Provider Type</label>
                <select
                  style={inputStyle}
                  value={formData.type}
                  onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}
                >
                  <option value={PROVIDER_TYPES.IN_HOUSE}>In-House</option>
                  <option value={PROVIDER_TYPES.TOWING_PARTNER}>Towing Partner</option>
                  <option value={PROVIDER_TYPES.THIRD_PARTY}>Third Party</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Contact Person</label>
                <input
                  style={inputStyle}
                  value={formData.contactPerson}
                  onChange={e => setFormData(f => ({ ...f, contactPerson: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Address</label>
                <input
                  style={inputStyle}
                  value={formData.address}
                  onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                  placeholder="Provider's address"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Service Categories</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {CATEGORY_OPTIONS.map(cat => (
                    <label key={cat} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        style={{ accentColor: "#ef4444" }}
                      />
                      <span style={{ fontSize: "11px", color: T.textSec }}>
                        {cat.replace(/_/g, " ")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {editingId && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e => setFormData(f => ({ ...f, isActive: e.target.checked }))}
                      style={{ accentColor: "#ef4444", width: "16px", height: "16px" }}
                    />
                    <span style={{ fontSize: "13px", color: T.textSec }}>Active (visible for assignment)</span>
                  </label>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={closeForm}
                style={{
                  flex: 1, padding: "10px",
                  background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: "8px", color: "#fff", cursor: "pointer", fontFamily: "Quicksand"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 2, padding: "10px",
                  background: saving ? "rgba(255,255,255,.1)" : "linear-gradient(135deg, #ef4444, #b91c1c)",
                  border: "none", borderRadius: "8px",
                  color: saving ? "rgba(255,255,255,.4)" : "#fff",
                  cursor: saving ? "not-allowed" : "pointer", fontWeight: "700", fontFamily: "Quicksand"
                }}
              >
                {saving ? "Saving..." : editingId ? "Update Provider" : "Add Provider"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading && !showForm ? (
        <div style={{ textAlign: "center", padding: "40px", color: T.textSec }}>
          <div style={{
            width: "30px", height: "30px", margin: "0 auto 10px",
            border: "2px solid rgba(239,68,68,.2)", borderTopColor: "#ef4444",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : providers.length === 0 ? (
        <div style={{
          background: "rgba(255,255,255,.02)", borderRadius: "16px",
          padding: "60px", textAlign: "center", border: "1px dashed rgba(255,255,255,.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <line x1="9" y1="22" x2="9" y2="16" />
              <line x1="15" y1="22" x2="15" y2="16" />
              <line x1="9" y1="16" x2="15" y2="16" />
              <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01" />
            </svg>
          </div>
          <p style={{ color: T.textSec, marginBottom: "12px" }}>No service providers added yet</p>
          <button
            onClick={openAdd}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              border: "none", borderRadius: "10px",
              color: "#fff", cursor: "pointer", fontWeight: "700",
            }}
          >
            Add Your First Provider
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {providers.map(provider => (
            <div
              key={provider.id}
              style={{
                background: "rgba(255,255,255,.02)", borderRadius: "14px", padding: "16px",
                border: `1px solid ${provider.isActive ? "rgba(34,197,94,.2)" : "rgba(239,68,68,.2)"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                    <h4 style={{ margin: 0, color: "#fff", fontSize: "15px" }}>{provider.name}</h4>
                    <span style={{
                      padding: "2px 8px", borderRadius: "12px",
                      background: provider.isActive ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)",
                      color: provider.isActive ? T.green : T.red,
                      fontSize: "9px", fontWeight: "800", textTransform: "uppercase",
                    }}>
                      {provider.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: T.textSec, fontSize: "12px" }}>📞 {provider.phone}</p>
                  <p style={{ margin: "3px 0 0", color: T.textSec, fontSize: "11px" }}>
                    {provider.type?.replace(/_/g, " ")}
                    {provider.contactPerson ? ` · ${provider.contactPerson}` : ""}
                    {` · ⭐ ${provider.rating ?? 0}`}
                  </p>
                  {provider.categories?.length > 0 && (
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
                      {provider.categories.map(c => (
                        <span key={c} style={{
                          padding: "2px 6px", borderRadius: "4px",
                          background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.55)",
                          fontSize: "9px", fontWeight: "600",
                        }}>
                          {c.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openEdit(provider)}
                  style={{
                    padding: "6px 14px",
                    background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)",
                    borderRadius: "6px", color: "#ef4444", cursor: "pointer", fontSize: "11px", fontWeight: "600", fontFamily: "Quicksand"
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}