// src/components/dealer/inspection/DamageReport.jsx
import { useState } from "react";

const T = {
  cyan: "#9333ea",
  red: "#ef4444",
  orange: "#f59e0b",
  textSec: "rgba(255,255,255,0.4)",
};

const DAMAGE_TYPES = [
  "Scratch", "Dent", "Crack", "Broken", "Missing Part", "Paint Scratch", 
  "Bumper Damage", "Side Mirror", "Windshield", "Headlight", "Taillight",
  "Interior Tear", "Seat Damage", "Stain", "Other"
];

const SEVERITY_LEVELS = [
  { value: "minor", label: "Minor", penalty: 30, description: "Small scratch, negligible", color: "#fbbf24" },
  { value: "moderate", label: "Moderate", penalty: 100, description: "Visible dent, paint damage", color: "#f59e0b" },
  { value: "major", label: "Major", penalty: 350, description: "Broken parts, structural", color: "#ef4444" },
  { value: "severe", label: "Severe", penalty: 1000, description: "Accident damage", color: "#dc2626" },
];

export default function DamageReport({ onAddDamage, existingDamages = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [newDamage, setNewDamage] = useState({
    type: "",
    severity: "minor",
    location: "",
    description: "",
    penalty: 30,
  });

  const handleSeverityChange = (severity) => {
    const severityData = SEVERITY_LEVELS.find(s => s.value === severity);
    setNewDamage({
      ...newDamage,
      severity,
      penalty: severityData?.penalty || 30,
    });
  };

  const handleSubmit = () => {
    if (!newDamage.type || !newDamage.location) {
      alert("Please fill in damage type and location");
      return;
    }
    
    onAddDamage(newDamage);
    setNewDamage({
      type: "",
      severity: "minor",
      location: "",
      description: "",
      penalty: 30,
    });
    setShowForm(false);
  };

  return (
    <div>
      {/* Existing damages list */}
      {existingDamages.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ color: T.cyan, marginBottom: "12px", fontSize: "14px" }}>
            Reported Damages ({existingDamages.length})
          </h4>
          {existingDamages.map((damage, index) => {
            const severityData = SEVERITY_LEVELS.find(s => s.value === damage.severity);
            return (
              <div key={damage.id || index} style={{
                background: "rgba(255,255,255,.03)",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "10px",
                borderLeft: `3px solid ${severityData?.color || T.orange}`
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <strong style={{ color: "#fff" }}>{damage.type}</strong>
                  <span style={{ color: severityData?.color, fontWeight: "700" }}>
                    ${damage.penalty}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: T.textSec }}>
                  Location: {damage.location}
                </div>
                {damage.description && (
                  <div style={{ fontSize: "11px", color: T.textSec, marginTop: "4px" }}>
                    {damage.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Add damage button */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: "100%",
            padding: "12px",
            background: "rgba(255,255,255,.03)",
            border: "2px dashed rgba(255,255,255,.1)",
            borderRadius: "10px",
            color: T.cyan,
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
            transition: "all .2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.cyan;
            e.currentTarget.style.background = `${T.cyan}10`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,.1)";
            e.currentTarget.style.background = "rgba(255,255,255,.03)";
          }}
        >
          + Add Damage Report
        </button>
      ) : (
        <div style={{
          background: "rgba(255,255,255,.05)",
          borderRadius: "12px",
          padding: "16px",
          border: `1px solid ${T.cyan}33`
        }}>
          <h4 style={{ color: T.cyan, marginBottom: "15px", fontSize: "14px" }}>
            New Damage Report
          </h4>
          
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "5px", display: "block" }}>
              Damage Type *
            </label>
            <select
              value={newDamage.type}
              onChange={(e) => setNewDamage({ ...newDamage, type: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: "8px",
                color: "#fff"
              }}
            >
              <option value="">Select damage type</option>
              {DAMAGE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "5px", display: "block" }}>
              Severity *
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {SEVERITY_LEVELS.map(level => (
                <button
                  key={level.value}
                  onClick={() => handleSeverityChange(level.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    background: newDamage.severity === level.value ? `${level.color}20` : "rgba(255,255,255,.05)",
                    border: newDamage.severity === level.value ? `1px solid ${level.color}` : "1px solid rgba(255,255,255,.1)",
                    color: newDamage.severity === level.value ? level.color : T.textSec,
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}
                >
                  {level.label}
                  <span style={{ fontSize: "10px", marginLeft: "4px" }}>(${level.penalty})</span>
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "5px", display: "block" }}>
              Location on Vehicle *
            </label>
            <input
              type="text"
              value={newDamage.location}
              onChange={(e) => setNewDamage({ ...newDamage, location: e.target.value })}
              placeholder="e.g., Front bumper, Driver side door, Rear left"
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: "8px",
                color: "#fff"
              }}
            />
          </div>
          
          <div style={{ marginBottom: "15px" }}>
            <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "5px", display: "block" }}>
              Description (Optional)
            </label>
            <textarea
              value={newDamage.description}
              onChange={(e) => setNewDamage({ ...newDamage, description: e.target.value })}
              rows={2}
              placeholder="Describe the damage in detail..."
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: "8px",
                color: "#fff",
                resize: "vertical"
              }}
            />
          </div>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleSubmit}
              style={{
                flex: 1,
                padding: "10px",
                background: `linear-gradient(135deg, #4338ca, ${T.cyan})`,
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              Add Damage
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: "8px",
                color: T.textSec,
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}