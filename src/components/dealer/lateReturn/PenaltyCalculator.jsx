// src/components/dealer/lateReturn/PenaltyCalculator.jsx
import { useState } from "react";
import { calculateLatePenalty, calculateExtensionCharge } from "../../../utils/lateReturnUtils";

const T = {
  cyan: "#9333ea",
  green: "#22c55e",
  orange: "#f59e0b",
  red: "#ef4444",
  textSec: "rgba(255,255,255,0.4)",
};

export default function PenaltyCalculator({ dailyRate = 50, onApply }) {
  const [delayHours, setDelayHours] = useState(0);
  const [calculatedPenalty, setCalculatedPenalty] = useState(null);
  const [extensionDays, setExtensionDays] = useState(1);
  const [isLateExtension, setIsLateExtension] = useState(false);
  const [extensionCharge, setExtensionCharge] = useState(null);
  
  const handleCalculatePenalty = () => {
    const penalty = calculateLatePenalty(delayHours, dailyRate);
    setCalculatedPenalty(penalty);
  };
  
  const handleCalculateExtension = () => {
    const charge = calculateExtensionCharge(dailyRate, extensionDays, isLateExtension);
    setExtensionCharge(charge);
  };
  
  const handleApplyPenalty = () => {
    if (calculatedPenalty && onApply) {
      onApply({
        type: "penalty",
        ...calculatedPenalty,
        dailyRate,
      });
    }
  };
  
  const handleApplyExtension = () => {
    if (extensionCharge && onApply) {
      onApply({
        type: "extension",
        ...extensionCharge,
        dailyRate,
      });
    }
  };
  
  const getTierColor = (tier) => {
    switch (tier) {
      case "warning": return T.orange;
      case "moderate": return "#f97316";
      case "serious": return T.red;
      case "severe": return "#7f1d1d";
      case "critical": return "#450a0a";
      default: return T.textSec;
    }
  };
  
  return (
    <div style={{
      background: "linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))",
      border: "1px solid rgba(255,255,255,.07)",
      borderRadius: "20px",
      padding: "24px",
    }}>
      <h3 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: "800", color: "#fff" }}>
        💰 Penalty & Extension Calculator
      </h3>
      
      {/* Late Penalty Calculator */}
      <div style={{
        background: "rgba(255,255,255,.02)",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "24px",
      }}>
        <h4 style={{ margin: "0 0 15px", fontSize: "14px", color: T.cyan, fontWeight: "700" }}>
          Late Return Penalty
        </h4>
        
        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "5px", display: "block" }}>
            Daily Rate: <strong style={{ color: T.cyan }}>${dailyRate}</strong>/day
          </label>
        </div>
        
        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "5px", display: "block" }}>
            Delay Duration (hours)
          </label>
          <input
            type="number"
            step="0.5"
            value={delayHours}
            onChange={(e) => setDelayHours(parseFloat(e.target.value))}
            placeholder="Enter delay in hours"
            style={{
              width: "100%",
              padding: "12px",
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: "10px",
              color: "#fff",
            }}
          />
        </div>
        
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            onClick={handleCalculatePenalty}
            style={{
              flex: 1,
              padding: "10px",
              background: `linear-gradient(135deg, #4338ca, ${T.cyan})`,
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Calculate Penalty
          </button>
          {calculatedPenalty && (
            <button
              onClick={handleApplyPenalty}
              style={{
                padding: "10px 20px",
                background: `linear-gradient(135deg, ${T.green}, #16a34a)`,
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Apply
            </button>
          )}
        </div>
        
        {calculatedPenalty && (
          <div style={{
            background: "rgba(147,51,234,.08)",
            borderRadius: "12px",
            padding: "15px",
            border: "1px solid rgba(147,51,234,.2)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <div>
                <p style={{ fontSize: "10px", color: T.textSec }}>Penalty Amount</p>
                <p style={{ fontSize: "20px", fontWeight: "800", color: T.orange }}>${calculatedPenalty.penalty}</p>
              </div>
              <div>
                <p style={{ fontSize: "10px", color: T.textSec }}>Percentage</p>
                <p style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>{calculatedPenalty.percentage}%</p>
              </div>
            </div>
            <div>
              <p style={{ fontSize: "10px", color: T.textSec }}>Tier</p>
              <p style={{ fontSize: "13px", fontWeight: "600", color: getTierColor(calculatedPenalty.tier) }}>
                {calculatedPenalty.tier.toUpperCase()}
              </p>
            </div>
            <p style={{ fontSize: "11px", color: T.textSec, marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
              💡 {calculatedPenalty.recommendation}
            </p>
          </div>
        )}
      </div>
      
      {/* Extension Calculator */}
      <div style={{
        background: "rgba(255,255,255,.02)",
        borderRadius: "16px",
        padding: "20px",
      }}>
        <h4 style={{ margin: "0 0 15px", fontSize: "14px", color: T.cyan, fontWeight: "700" }}>
          Trip Extension
        </h4>
        
        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "5px", display: "block" }}>
            Extension Days
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={extensionDays}
            onChange={(e) => setExtensionDays(parseInt(e.target.value))}
            style={{
              width: "100%",
              padding: "12px",
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: "10px",
              color: "#fff",
            }}
          />
        </div>
        
        <div style={{ marginBottom: "15px" }}>
          <label style={{ fontSize: "12px", color: T.textSec, marginBottom: "5px", display: "block" }}>
            Is this a late extension?
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
              <input 
                type="radio" 
                name="isLate" 
                value="true" 
                onChange={() => setIsLateExtension(true)} 
              /> 
              Yes (50% surcharge)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
              <input 
                type="radio" 
                name="isLate" 
                value="false" 
                onChange={() => setIsLateExtension(false)} 
                defaultChecked 
              /> 
              No (regular rate)
            </label>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleCalculateExtension}
            style={{
              flex: 1,
              padding: "10px",
              background: `linear-gradient(135deg, #4338ca, ${T.cyan})`,
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Calculate Extension
          </button>
          {extensionCharge && (
            <button
              onClick={handleApplyExtension}
              style={{
                padding: "10px 20px",
                background: `linear-gradient(135deg, ${T.green}, #16a34a)`,
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Apply
            </button>
          )}
        </div>
        
        {extensionCharge && (
          <div style={{
            marginTop: "15px",
            background: "rgba(34,197,94,.08)",
            borderRadius: "12px",
            padding: "15px",
            border: "1px solid rgba(34,197,94,.2)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <p style={{ fontSize: "10px", color: T.textSec }}>Daily Rate</p>
                <p style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>${extensionCharge.dailyCharge}</p>
                {extensionCharge.isPremium && (
                  <span style={{ fontSize: "10px", color: T.orange }}>(Premium Rate +50%)</span>
                )}
              </div>
              <div>
                <p style={{ fontSize: "10px", color: T.textSec }}>Base Cost</p>
                <p style={{ fontSize: "14px", color: "#fff" }}>${extensionCharge.baseCost}</p>
              </div>
            </div>
            {extensionCharge.penaltyFee > 0 && (
              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", color: T.textSec }}>Late Fee (50%)</span>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: T.orange }}>+${extensionCharge.penaltyFee}</span>
                </div>
              </div>
            )}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "2px solid rgba(255,255,255,.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: T.cyan }}>Total Extension Charge</span>
                <span style={{ fontSize: "18px", fontWeight: "800", color: T.green }}>${extensionCharge.totalCost}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}