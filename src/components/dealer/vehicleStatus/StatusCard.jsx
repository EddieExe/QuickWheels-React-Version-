// src/components/dealer/vehicleStatus/StatusCard.jsx
import { useState } from "react";
import { VEHICLE_STATUS, getSuggestedTransitions, updateVehicleStatus } from "../../../utils/vehicleStatusUtils";

const T = {
  cyan: "#4ce3f7",
  textSec: "rgba(255,255,255,0.4)",
};

export default function StatusCard({ car, dealerId, onStatusChange }) {
  const [showMenu, setShowMenu] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Fix: Use lowercase keys, and provide a fallback
  const currentStatus = VEHICLE_STATUS[car.status] || VEHICLE_STATUS.available;
  const suggestedTransitions = getSuggestedTransitions(car.status);
  
  const handleStatusChange = async (newStatusId) => {
    setUpdating(true);
    const result = await updateVehicleStatus(car.id, dealerId, newStatusId, {
      reason: `Manual update from ${car.status} to ${newStatusId}`,
    });
    
    if (result.success) {
      onStatusChange?.(car.id, newStatusId);
    }
    setUpdating(false);
    setShowMenu(false);
  };
  
  const getStatusOptions = () => {
    return Object.values(VEHICLE_STATUS).map(status => ({
      ...status,
      isSuggested: suggestedTransitions.includes(status.id),
    }));
  };
  
  return (
    <div
      style={{
        background: "linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",
        border: `1px solid ${currentStatus.borderColor}`,
        borderRadius: "16px",
        padding: "16px",
        transition: "all .3s ease",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Car Image */}
      <div
        style={{
          height: "140px",
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "12px",
          position: "relative",
        }}
      >
        <img
          src={car.image || "/Images/placeholder-car.png"}
          alt={car.model}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: currentStatus.bgColor,
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700",
            color: currentStatus.color,
            backdropFilter: "blur(4px)",
          }}
        >
          {currentStatus.icon} {currentStatus.label}
        </div>
      </div>
      
      {/* Car Info */}
      <div style={{ marginBottom: "12px" }}>
        <h4 style={{ margin: "0 0 4px", color: "#fff", fontSize: "15px", fontWeight: "700" }}>
          {car.model}
        </h4>
        <p style={{ margin: 0, color: T.textSec, fontSize: "11px" }}>
          {car.numberPlate || "No plate"} • {car.type}
        </p>
        <p style={{ margin: "4px 0 0", color: T.cyan, fontSize: "12px", fontWeight: "600" }}>
          ${car.price}/day
        </p>
      </div>
      
      {/* Status Menu Button */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={updating}
          style={{
            width: "100%",
            padding: "8px",
            background: currentStatus.bgColor,
            border: `1px solid ${currentStatus.borderColor}`,
            borderRadius: "8px",
            color: currentStatus.color,
            cursor: updating ? "not-allowed" : "pointer",
            fontSize: "12px",
            fontFamily:"Quicksand",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "all .2s",
          }}
        >
          {updating ? "⏳ Updating..." : `${currentStatus.icon} Change Status`}
        </button>
        
        {showMenu && !updating && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              right: 0,
              marginBottom: "8px",
              background: "#1a1a2e",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: "12px",
              padding: "8px",
              zIndex: 100,
              boxShadow: "0 10px 25px rgba(0,0,0,.3)",
            }}
          >
            {getStatusOptions().map(status => (
              <button
                key={status.id}
                onClick={() => handleStatusChange(status.id)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: status.id === car.status ? status.bgColor : "transparent",
                  border: `1px solid ${status.id === car.status ? status.borderColor : "transparent"}`,
                  borderRadius: "8px",
                  color: status.color,
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: status.isSuggested ? "700" : "500",
                  textAlign: "left",
                  marginBottom: "4px",
                  transition: "all .2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${status.bgColor}`;
                }}
                onMouseLeave={(e) => {
                  if (status.id !== car.status) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {status.icon} {status.label}
                {status.isSuggested && (
                  <span style={{ marginLeft: "6px", fontSize: "9px", color: T.cyan }}>Suggested</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Last Update */}
      {car.lastStatusUpdate && (
        <p style={{ margin: "8px 0 0", color: T.textSec, fontSize: "9px", textAlign: "center" }}>
          Updated: {new Date(car.lastStatusUpdate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}