// src/components/dealer/vehicleStatus/CleaningChecklist.jsx
import { useState } from "react";
import { addCleaningTask, completeCleaningTask } from "../../../utils/vehicleStatusUtils";

const T = {
  cyan: "#4ce3f7",
  green: "#22c55e",
  textSec: "rgba(255,255,255,0.4)",
};

const CLEANING_ITEMS = [
  { id: "exterior_wash", label: "Exterior Wash", icon: "🚗" },
  { id: "interior_vacuum", label: "Interior Vacuum", icon: "🧹" },
  { id: "windows", label: "Windows Cleaned", icon: "🪟" },
  { id: "dashboard", label: "Dashboard Wiped", icon: "📊" },
  { id: "seats", label: "Seats Cleaned", icon: "💺" },
  { id: "floor_mats", label: "Floor Mats Shaken", icon: "🔲" },
  { id: "trunk", label: "Trunk Cleaned", icon: "📦" },
  { id: "air_freshener", label: "Air Freshener", icon: "🌸" },
  { id: "disinfection", label: "Disinfection", icon: "🧴" },
  { id: "tires", label: "Tires Dressed", icon: "⚫" },
];

export default function CleaningChecklist({ car, dealerId, onComplete, onClose }) {
  const [checklist, setChecklist] = useState({});
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);
  const [taskId, setTaskId] = useState(null);
  
  const toggleItem = (itemId) => {
    setChecklist(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };
  
  const handleCreateTask = async () => {
    if (!assignedTo) {
      alert("Please assign a staff member");
      return;
    }
    
    setLoading(true);
    const result = await addCleaningTask(car.id, dealerId, {
      carModel: car.model,
      checklist,
      assignedTo,
      notes,
    });
    
    if (result.success) {
      setTaskCreated(true);
      setTaskId(result.taskId);
    } else {
      alert("Failed to create cleaning task: " + result.error);
    }
    setLoading(false);
  };
  
  const handleCompleteTask = async () => {
    setLoading(true);
    const result = await completeCleaningTask(taskId, dealerId, car.id);
    
    if (result.success) {
      onComplete?.();
    } else {
      alert("Failed to complete cleaning task: " + result.error);
    }
    setLoading(false);
  };
  
  const completedCount = Object.values(checklist).filter(v => v === true).length;
  const totalItems = CLEANING_ITEMS.length;
  
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
          maxWidth: "550px",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "24px",
          border: `1px solid ${T.cyan}33`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: T.cyan, fontSize: "18px", fontWeight: "800" }}>
            🧹 Cleaning Checklist
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.textSec, fontSize: "24px", cursor: "pointer" }}>×</button>
        </div>
        
        <div style={{ marginBottom: "20px", padding: "12px", background: "rgba(255,255,255,.03)", borderRadius: "12px" }}>
          <p style={{ margin: 0, color: "#fff", fontWeight: "600" }}>{car.model}</p>
          <p style={{ margin: "4px 0 0", color: T.textSec, fontSize: "12px" }}>{car.numberPlate}</p>
        </div>
        
        {!taskCreated ? (
          <>
            {/* Checklist Items */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "10px", display: "block" }}>
                Cleaning Checklist
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                {CLEANING_ITEMS.map(item => (
                  <label
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px",
                      background: checklist[item.id] ? "rgba(34,197,94,.1)" : "rgba(255,255,255,.03)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: `1px solid ${checklist[item.id] ? "rgba(34,197,94,.3)" : "rgba(255,255,255,.05)"}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checklist[item.id] || false}
                      onChange={() => toggleItem(item.id)}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "13px", color: "#fff" }}>{item.icon} {item.label}</span>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: "8px", fontSize: "11px", color: T.textSec }}>
                Progress: {completedCount}/{totalItems} completed
              </div>
            </div>
            
            {/* Assign Staff */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "6px", display: "block" }}>
                Assigned To *
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Staff name"
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
            
            {/* Notes */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "6px", display: "block" }}>
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional notes..."
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
            
            <button
              onClick={handleCreateTask}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: loading ? "rgba(255,255,255,.1)" : `linear-gradient(135deg, ${T.cyan}, #0400ff)`,
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "600",
              }}
            >
              {loading ? "Creating Task..." : "Create Cleaning Task →"}
            </button>
          </>
        ) : (
          <>
            <div style={{
              textAlign: "center",
              padding: "20px",
              background: "rgba(34,197,94,.1)",
              borderRadius: "12px",
              marginBottom: "20px",
            }}>
              <div style={{ fontSize: "48px", marginBottom: "10px" }}>✅</div>
              <h4 style={{ color: T.green, marginBottom: "5px" }}>Cleaning Task Created!</h4>
              <p style={{ color: T.textSec, fontSize: "12px" }}>
                Vehicle status changed to "Cleaning"
              </p>
            </div>
            
            <button
              onClick={handleCompleteTask}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: loading ? "rgba(255,255,255,.1)" : T.green,
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "600",
              }}
            >
              {loading ? "Completing..." : "Mark as Clean & Make Available →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}