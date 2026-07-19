// src/components/dealer/inspection/ReturnInspection.jsx
import { useState, useEffect } from "react";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import PhotoUpload from "./PhotoUpload";
import DamageReport from "./DamageReport";
import { 
  uploadInspectionPhotos, 
  getCurrentLocation, 
  formatInspectionData,
  calculateMileageCharge,
  calculateFuelCharge,
  calculateLateFee
} from "../../../utils/inspectionUtils";

const T = {
  cyan: "#9333ea",
  green: "#22c55e",
  red: "#ef4444",
  textSec: "rgba(255,255,255,0.4)",
};

export default function ReturnInspection({ booking, pickupInspection, onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [damages, setDamages] = useState([]);
  const [formData, setFormData] = useState({
    newDamagePhotos: [],
    fuelLevel: "",
    odometer: "",
    cleaningCondition: "clean",
    documentsReturned: {
      rc: true,
      insurance: true,
    },
    notes: "",
    inspectorName: "",
  });
  
  const [calculations, setCalculations] = useState({
    mileage: { charge: 0, extraKms: 0 },
    fuel: { charge: 0, difference: 0 },
    late: { charge: 0, daysLate: 0, hoursLate: 0 },
    totalExtraCharges: 0,
  });

  const steps = [
    { title: "New Damage", icon: "🔍", field: "damage" },
    { title: "Fuel & Odometer", icon: "⛽", field: "fuelOdometer" },
    { title: "Charges Summary", icon: "💰", field: "charges" },
    { title: "Review & Complete", icon: "✅", field: "review" },
  ];

  // Get geolocation on mount
  useEffect(() => {
    getCurrentLocation()
      .then(loc => setLocation(loc))
      .catch(err => console.error("Geolocation error:", err));
  }, []);

  // Recalculate charges when form data changes
  useEffect(() => {
    if (pickupInspection && formData.fuelLevel && formData.odometer) {
      const days = Math.ceil(
        (new Date(booking.dropoffDate) - new Date(booking.pickupDate)) / (1000 * 60 * 60 * 24)
      );
      
      const mileage = calculateMileageCharge(
        pickupInspection.odometer,
        parseInt(formData.odometer),
        days
      );
      
      const fuel = calculateFuelCharge(
        pickupInspection.fuelLevel,
        parseFloat(formData.fuelLevel)
      );
      
      const late = calculateLateFee(
        booking.dropoffDate,
        new Date().toISOString().split('T')[0],
        booking.dailyRate || 50
      );
      
      const damageTotal = damages.reduce((sum, d) => sum + (d.penalty || 0), 0);
      const cleaningFee = formData.cleaningCondition === "clean" ? 0 : 50;
      
      setCalculations({
        mileage: { charge: mileage.charge, extraKms: mileage.extraKms, totalKms: mileage.totalKms },
        fuel: { charge: fuel.charge, difference: fuel.difference },
        late: { charge: late.charge, daysLate: late.daysLate, hoursLate: late.hoursLate },
        damageTotal,
        cleaningFee,
        totalExtraCharges: mileage.charge + fuel.charge + late.charge + damageTotal + cleaningFee,
      });
    }
  }, [formData.fuelLevel, formData.odometer, damages, pickupInspection, booking]);

  const handleDamageAdd = (damage) => {
    setDamages([...damages, { ...damage, id: Date.now(), timestamp: new Date().toISOString() }]);
  };

  const handleDamageRemove = (damageId) => {
    setDamages(damages.filter(d => d.id !== damageId));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Upload new damage photos
      const uploadedDamagePhotos = [];
      if (formData.newDamagePhotos.length > 0) {
        const urls = await uploadInspectionPhotos(
          formData.newDamagePhotos,
          booking.id,
          `return/damages`
        );
        uploadedDamagePhotos.push(...urls);
      }
      
      // Attach photo URLs to damages
      const damagesWithPhotos = damages.map((damage, index) => ({
        ...damage,
        photos: uploadedDamagePhotos.slice(index * 3, (index + 1) * 3),
      }));
      
      // Prepare inspection data
      const inspectionData = formatInspectionData({
        type: "return",
        bookingId: booking.id,
        dealerId: booking.dealerId,
        vehicleId: booking.vehicleId || booking.carModel,
        pickupInspectionRef: `bookings/${booking.id}/inspections/pickup`,
        damages: damagesWithPhotos,
        fuelLevel: parseFloat(formData.fuelLevel),
        odometer: parseInt(formData.odometer),
        cleaningCondition: formData.cleaningCondition,
        cleaningFee: calculations.cleaningFee,
        documentsReturned: formData.documentsReturned,
        extraCharges: {
          mileage: calculations.mileage,
          fuel: calculations.fuel,
          lateReturn: calculations.late,
          total: calculations.totalExtraCharges,
        },
        inspector: {
          name: formData.inspectorName,
          timestamp: new Date().toISOString(),
          location: location,
        },
        notes: formData.notes,
        status: "completed",
      });
      
      // Save to Firestore
      const inspectionRef = doc(db, "bookings", booking.id, "inspections", "return");
      await setDoc(inspectionRef, inspectionData);
      
      // Update booking with extra charges
      await updateDoc(doc(db, "bookings", booking.id), {
        returnInspected: true,
        returnInspectionDate: new Date().toISOString(),
        returnOdometer: inspectionData.odometer,
        returnFuel: inspectionData.fuelLevel,
        extraCharges: calculations.totalExtraCharges,
        extraChargesBreakdown: {
          mileage: calculations.mileage.charge,
          fuel: calculations.fuel.charge,
          damages: calculations.damageTotal,
          cleaning: calculations.cleaningFee,
          lateReturn: calculations.late.charge,
        },
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      
      onComplete(inspectionData);
    } catch (error) {
      console.error("Error saving return inspection:", error);
      alert("Failed to save inspection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // New Damage
        return (
          <div>
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>New Damage Report</h3>
            
            {/* Pickup vs Current comparison */}
            {pickupInspection && (
              <div style={{
                background: "rgba(255,255,255,.03)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px"
              }}>
                <h4 style={{ color: T.cyan, marginBottom: "12px" }}>Comparison with Pickup</h4>
                <div style={{ fontSize: "13px", color: T.textSec }}>
                  <div>Pickup Odometer: {pickupInspection.odometer} km</div>
                  <div>Pickup Fuel: {pickupInspection.fuelLevel}%</div>
                  <div>Pickup Exterior: {pickupInspection.exterior?.scratches} scratches, {pickupInspection.exterior?.dents} dents</div>
                </div>
              </div>
            )}
            
            <DamageReport 
              onAddDamage={handleDamageAdd}
              existingDamages={damages}
            />
            
            <div style={{ marginTop: "20px" }}>
              <PhotoUpload
                section="New Damage Evidence"
                photos={formData.newDamagePhotos}
                onPhotosChange={(photos) => setFormData(prev => ({ ...prev, newDamagePhotos: photos }))}
                maxPhotos={20}
              />
            </div>
          </div>
        );
        
      case 1: // Fuel & Odometer
        return (
          <div>
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>Final Readings</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Current Fuel Level (%) *
                </label>
                <input
                  type="number"
                  value={formData.fuelLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, fuelLevel: e.target.value }))}
                  placeholder="Enter fuel percentage"
                  min="0"
                  max="100"
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: "8px",
                    color: "#fff"
                  }}
                />
                {pickupInspection && pickupInspection.fuelLevel && (
                  <div style={{ fontSize: "11px", color: T.textSec, marginTop: "4px" }}>
                    Pickup fuel: {pickupInspection.fuelLevel}% · 
                    Difference: {(pickupInspection.fuelLevel - formData.fuelLevel).toFixed(1)}%
                    {pickupInspection.fuelLevel - formData.fuelLevel > 5 && (
                      <span style={{ color: T.orange, marginLeft: "5px" }}>⚠️ Fuel will be charged</span>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Current Odometer (km) *
                </label>
                <input
                  type="number"
                  value={formData.odometer}
                  onChange={(e) => setFormData(prev => ({ ...prev, odometer: e.target.value }))}
                  placeholder="Enter current mileage"
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: "8px",
                    color: "#fff"
                  }}
                />
                {pickupInspection && pickupInspection.odometer && (
                  <div style={{ fontSize: "11px", color: T.textSec, marginTop: "4px" }}>
                    Pickup odometer: {pickupInspection.odometer} km · 
                    Distance driven: {formData.odometer - pickupInspection.odometer} km
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Cleaning Condition
                </label>
                <select
                  value={formData.cleaningCondition}
                  onChange={(e) => setFormData(prev => ({ ...prev, cleaningCondition: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: "8px",
                    color: "#fff"
                  }}
                >
                  <option value="clean">Clean (No fee)</option>
                  <option value="moderate">Moderate Dirt ($25 fee)</option>
                  <option value="dirty">Dirty ($50 fee)</option>
                  <option value="excessive">Excessively Dirty ($100 fee)</option>
                </select>
              </div>
            </div>
          </div>
        );
        
      case 2: // Charges Summary
        return (
          <div>
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>Extra Charges Summary</h3>
            <div style={{
              background: "rgba(255,255,255,.05)",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px"
            }}>
              <div style={{ marginBottom: "15px", paddingBottom: "15px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span>Mileage Overcharge</span>
                  <span style={{ color: calculations.mileage.charge > 0 ? T.orange : T.green }}>
                    ${calculations.mileage.charge.toFixed(2)}
                  </span>
                </div>
                {calculations.mileage.extraKms > 0 && (
                  <div style={{ fontSize: "11px", color: T.textSec }}>
                    {calculations.mileage.extraKms} extra km @ $0.50/km
                  </div>
                )}
              </div>
              
              <div style={{ marginBottom: "15px", paddingBottom: "15px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span>Fuel Refill</span>
                  <span style={{ color: calculations.fuel.charge > 0 ? T.orange : T.green }}>
                    ${calculations.fuel.charge.toFixed(2)}
                  </span>
                </div>
                {calculations.fuel.difference > 0 && (
                  <div style={{ fontSize: "11px", color: T.textSec }}>
                    {calculations.fuel.difference}% fuel missing
                  </div>
                )}
              </div>
              
              {calculations.late.charge > 0 && (
                <div style={{ marginBottom: "15px", paddingBottom: "15px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span>Late Return Fee</span>
                    <span style={{ color: T.red }}>${calculations.late.charge.toFixed(2)}</span>
                  </div>
                  {calculations.late.daysLate > 0 ? (
                    <div style={{ fontSize: "11px", color: T.textSec }}>
                      {calculations.late.daysLate} day(s) late
                    </div>
                  ) : calculations.late.hoursLate > 0 && (
                    <div style={{ fontSize: "11px", color: T.textSec }}>
                      {calculations.late.hoursLate} hour(s) late
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ marginBottom: "15px", paddingBottom: "15px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span>Damages ({damages.length} item{damages.length !== 1 ? "s" : ""})</span>
                  <span style={{ color: T.red }}>${calculations.damageTotal.toFixed(2)}</span>
                </div>
                {damages.map(d => (
                  <div key={d.id} style={{ fontSize: "11px", color: T.textSec, marginTop: "4px" }}>
                    • {d.severity}: {d.description} (${d.penalty})
                  </div>
                ))}
              </div>
              
              <div style={{ marginBottom: "15px", paddingBottom: "15px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Cleaning Fee</span>
                  <span style={{ color: calculations.cleaningFee > 0 ? T.orange : T.green }}>
                    ${calculations.cleaningFee.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div style={{ marginTop: "15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: "800" }}>
                  <span style={{ color: T.cyan }}>Total Extra Charges</span>
                  <span style={{ color: T.orange }}>${calculations.totalExtraCharges.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 3: // Review & Complete
        return (
          <div>
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>Review & Complete Return</h3>
            <div style={{
              background: "rgba(255,255,255,.03)",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px"
            }}>
              <div style={{ marginBottom: "15px" }}>
                <strong style={{ color: "#fff" }}>Final Readings:</strong>
                <p style={{ color: T.textSec, fontSize: "13px" }}>
                  Fuel: {formData.fuelLevel}%<br />
                  Odometer: {formData.odometer} km
                </p>
              </div>
              
              <div style={{ marginBottom: "15px" }}>
                <strong style={{ color: "#fff" }}>Damages Found:</strong>
                <p style={{ color: T.textSec, fontSize: "13px" }}>
                  {damages.length} damage report{damages.length !== 1 ? "s" : ""}
                </p>
              </div>
              
              <div style={{ marginBottom: "15px" }}>
                <strong style={{ color: "#fff" }}>Documents Returned:</strong>
                <div style={{ marginTop: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                    <input
                      type="checkbox"
                      checked={formData.documentsReturned.rc}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        documentsReturned: { ...prev.documentsReturned, rc: e.target.checked }
                      }))}
                    />
                    Registration Certificate
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      checked={formData.documentsReturned.insurance}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        documentsReturned: { ...prev.documentsReturned, insurance: e.target.checked }
                      }))}
                    />
                    Insurance Certificate
                  </label>
                </div>
              </div>
              
              <div style={{ marginBottom: "15px" }}>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any additional notes about the return..."
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
              
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Inspector Name *
                </label>
                <input
                  type="text"
                  value={formData.inspectorName}
                  onChange={(e) => setFormData(prev => ({ ...prev, inspectorName: e.target.value }))}
                  placeholder="Enter your name"
                  required
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
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const isStepValid = () => {
    if (currentStep === 0) return true; // Damage reporting is optional
    if (currentStep === 1) {
      return formData.fuelLevel && formData.odometer;
    }
    if (currentStep === 3) {
      return formData.inspectorName.trim();
    }
    return true;
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,.95)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      overflowY: "auto"
    }}>
      <div style={{
        maxWidth: "800px",
        width: "100%",
        background: "#0c0c16",
        borderRadius: "24px",
        border: `1px solid ${T.cyan}33`,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,.1)",
          background: "rgba(0,0,0,.3)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h2 style={{ color: T.cyan, margin: 0 }}>
              🔄 Return Inspection
            </h2>
            <button
              onClick={onCancel}
              style={{
                background: "none",
                border: "none",
                color: T.textSec,
                fontSize: "24px",
                cursor: "pointer"
              }}
            >
              ×
            </button>
          </div>
          
          {/* Progress steps */}
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {steps.map((step, index) => (
              <button
                key={step.field}
                onClick={() => setCurrentStep(index)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  background: currentStep === index ? T.cyan + "20" : "rgba(255,255,255,.05)",
                  border: currentStep === index ? `1px solid ${T.cyan}` : "1px solid rgba(255,255,255,.1)",
                  color: currentStep === index ? T.cyan : T.textSec,
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                {step.icon} {step.title}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {renderStep()}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid rgba(255,255,255,.1)",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px"
        }}>
          <button
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onCancel()}
            style={{
              padding: "10px 24px",
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: "10px",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            {currentStep > 0 ? "← Back" : "Cancel"}
          </button>
          
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!isStepValid()}
              style={{
                padding: "10px 24px",
                background: isStepValid() ? `linear-gradient(135deg, #4338ca, ${T.cyan})` : "rgba(255,255,255,.1)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                cursor: isStepValid() ? "pointer" : "not-allowed",
                fontWeight: "600",
                opacity: isStepValid() ? 1 : 0.5
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !isStepValid()}
              style={{
                padding: "10px 24px",
                background: `linear-gradient(135deg, ${T.green}, #16a34a)`,
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: "600",
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Processing..." : "Complete & Generate Invoice →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}