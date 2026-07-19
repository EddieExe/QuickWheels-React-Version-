// src/components/dealer/vehicleStatus/MaintenanceScheduler.jsx
import { useState } from "react";
import { scheduleMaintenance } from "../../../utils/vehicleStatusUtils";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  textSec: "rgba(255,255,255,0.4)",
};

export default function MaintenanceScheduler({ car, dealerId, onScheduled, onClose }) {
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    type: "routine",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  
  const maintenanceTypes = [
    { id: "routine", label: "Routine Service", icon: "🔧" },
    { id: "repair", label: "Repair", icon: "🛠️" },
    { id: "inspection", label: "Inspection", icon: "🔍" },
    { id: "recall", label: "Recall Fix", icon: "⚠️" },
    { id: "accident", label: "Accident Repair", icon: "💥" },
  ];
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      alert("Please select both start and end dates");
      return;
    }
    
    setLoading(true);
    const result = await scheduleMaintenance(car.id, dealerId, {
      ...formData,
      carModel: car.model,
    });
    
    if (result.success) {
      onScheduled?.(result);
    } else {
      alert("Failed to schedule maintenance: " + result.error);
    }
    setLoading(false);
  };
  
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.85)",
        backdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0c0c16",
          borderRadius: "20px",
          maxWidth: "500px",
          width: "100%",
          padding: "24px",
          border: `1px solid ${T.cyan}33`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: T.cyan, fontSize: "18px", fontWeight: "800" }}>
            🔧 Schedule Maintenance
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.textSec, fontSize: "24px", cursor: "pointer" }}>×</button>
        </div>
        
        <div style={{ marginBottom: "20px", padding: "12px", background: "rgba(255,255,255,.03)", borderRadius: "12px" }}>
          <p style={{ margin: 0, color: "#fff", fontWeight: "600" }}>{car.model}</p>
          <p style={{ margin: "4px 0 0", color: T.textSec, fontSize: "12px" }}>{car.numberPlate}</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "6px", display: "block" }}>
              Maintenance Type *
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {maintenanceTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.id })}
                  style={{
                    padding: "6px 12px",
                    background: formData.type === type.id ? `${T.cyan}20` : "rgba(255,255,255,.05)",
                    border: `1px solid ${formData.type === type.id ? T.cyan : "rgba(255,255,255,.1)"}`,
                    borderRadius: "20px",
                    color: formData.type === type.id ? T.cyan : T.textSec,
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "6px", display: "block" }}>
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: "8px",
                color: "#fff",
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "6px", display: "block" }}>
              Expected Completion *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate || new Date().toISOString().split('T')[0]}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: "8px",
                color: "#fff",
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "6px", display: "block" }}>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Describe the maintenance work needed..."
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: "8px",
                color: "#fff",
                resize: "vertical",
              }}
            />
          </div>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "10px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                padding: "10px",
                background: loading ? "rgba(255,255,255,.1)" : `linear-gradient(135deg, ${T.cyan}, #0400ff)`,
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "600",
              }}
            >
              {loading ? "Scheduling..." : "Schedule Maintenance →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}