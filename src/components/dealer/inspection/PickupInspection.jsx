// src/components/dealer/inspection/PickupInspection.jsx
import { useState, useEffect } from "react";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import PhotoUpload from "./PhotoUpload";
import { uploadInspectionPhotos, getCurrentLocation, formatInspectionData } from "../../../utils/inspectionUtils";

const T = {
  cyan: "#9333ea",
  green: "#22c55e",
  red: "#ef4444",
  textSec: "rgba(255,255,255,0.4)",
};

export default function PickupInspection({ booking, onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [formData, setFormData] = useState({
    // Vehicle Photos
    photos: {
      front: [],
      back: [],
      left: [],
      right: [],
      interior: [],
      dashboard: [],
    },
    // Exterior
    exterior: {
      scratches: "none",
      dents: "none",
      paintCondition: "excellent",
      notes: "",
    },
    // Interior
    interior: {
      seats: "excellent",
      ac: "working",
      entertainment: "working",
      cleanliness: "clean",
      notes: "",
    },
    // Mechanical
    mechanical: {
      engineSound: "normal",
      brakes: "good",
      lights: "all_working",
      tyres: "good",
      notes: "",
    },
    fuelLevel: "",
    odometer: "",
    documents: {
      rc: true,
      insurance: true,
      puc: true,
      notes: "",
    },
    inspectorName: "",
    inspectorSignature: "",
  });

  const steps = [
    { title: "Vehicle Photos", icon: "📸", field: "photos" },
    { title: "Exterior Check", icon: "🚗", field: "exterior" },
    { title: "Interior Check", icon: "💺", field: "interior" },
    { title: "Mechanical", icon: "🔧", field: "mechanical" },
    { title: "Fuel & Odometer", icon: "⛽", field: "fuelOdometer" },
    { title: "Documents", icon: "📄", field: "documents" },
    { title: "Review & Submit", icon: "✅", field: "review" },
  ];

  // Get geolocation on mount
  useEffect(() => {
    getCurrentLocation()
      .then(loc => setLocation(loc))
      .catch(err => console.error("Geolocation error:", err));
  }, []);

  const handlePhotoChange = (section, photos) => {
    setFormData(prev => ({
      ...prev,
      photos: { ...prev.photos, [section]: photos }
    }));
  };

  const handleExteriorChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      exterior: { ...prev.exterior, [field]: value }
    }));
  };

  const handleInteriorChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      interior: { ...prev.interior, [field]: value }
    }));
  };

  const handleMechanicalChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      mechanical: { ...prev.mechanical, [field]: value }
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Upload all photos to Firebase Storage
      const uploadedPhotos = {};
      for (const [section, photos] of Object.entries(formData.photos)) {
        if (photos.length > 0) {
          const urls = await uploadInspectionPhotos(
            photos,
            booking.id,
            `pickup/${section}`
          );
          uploadedPhotos[section] = urls;
        } else {
          uploadedPhotos[section] = [];
        }
      }

      // Prepare inspection data
      const inspectionData = formatInspectionData({
        type: "pickup",
        bookingId: booking.id,
        dealerId: booking.dealerId,
        vehicleId: booking.vehicleId || booking.carModel,
        photos: uploadedPhotos,
        exterior: formData.exterior,
        interior: formData.interior,
        mechanical: formData.mechanical,
        fuelLevel: parseFloat(formData.fuelLevel),
        odometer: parseInt(formData.odometer),
        documents: formData.documents,
        inspector: {
          name: formData.inspectorName,
          timestamp: new Date().toISOString(),
          location: location,
        },
        status: "completed",
      });

      // Save to Firestore
      const inspectionRef = doc(db, "bookings", booking.id, "inspections", "pickup");
      await setDoc(inspectionRef, inspectionData);

      // Update booking status
      await updateDoc(doc(db, "bookings", booking.id), {
        pickupInspected: true,
        pickupInspectionDate: new Date().toISOString(),
        pickupOdometer: inspectionData.odometer,
        pickupFuel: inspectionData.fuelLevel,
        status: "active", // Change status to active after pickup inspection
      });

      onComplete(inspectionData);
    } catch (error) {
      console.error("Error saving inspection:", error);
      alert("Failed to save inspection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Vehicle Photos
        return (
          <div>
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>Vehicle Photos</h3>
            <p style={{ color: T.textSec, marginBottom: "20px", fontSize: "13px" }}>
              Take clear photos from all angles. These will be used for comparison during return inspection.
            </p>
            <div style={{ maxHeight: "60vh", overflowY: "auto", padding: "10px" }}>
              {[
                { key: "front", label: "Front View", icon: "🚗" },
                { key: "back", label: "Back View", icon: "🔙" },
                { key: "left", label: "Left Side", icon: "⬅️" },
                { key: "right", label: "Right Side", icon: "➡️" },
                { key: "interior", label: "Interior", icon: "💺" },
                { key: "dashboard", label: "Dashboard", icon: "📊" },
              ].map(section => (
                <div key={section.key} style={{ marginBottom: "25px" }}>
                  <PhotoUpload
                    section={section.label}
                    photos={formData.photos[section.key]}
                    onPhotosChange={(photos) => handlePhotoChange(section.key, photos)}
                    maxPhotos={5}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 1: // Exterior Check
        return (
          <div>
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>Exterior Condition</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Scratches
                </label>
                <select
                  value={formData.exterior.scratches}
                  onChange={(e) => handleExteriorChange("scratches", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: "8px",
                    color: "#fff"
                  }}
                >
                  <option value="none">None</option>
                  <option value="minor">Minor (few light scratches)</option>
                  <option value="moderate">Moderate (visible scratches)</option>
                  <option value="major">Major (deep scratches)</option>
                </select>
              </div>
              
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Dents
                </label>
                <select
                  value={formData.exterior.dents}
                  onChange={(e) => handleExteriorChange("dents", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: "8px",
                    color: "#fff"
                  }}
                >
                  <option value="none">None</option>
                  <option value="minor">Minor (small dents)</option>
                  <option value="moderate">Moderate (noticeable dents)</option>
                  <option value="major">Major (large dents)</option>
                </select>
              </div>
              
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Paint Condition
                </label>
                <select
                  value={formData.exterior.paintCondition}
                  onChange={(e) => handleExteriorChange("paintCondition", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: "8px",
                    color: "#fff"
                  }}
                >
                  <option value="excellent">Excellent (like new)</option>
                  <option value="good">Good (normal wear)</option>
                  <option value="fair">Fair (visible marks)</option>
                  <option value="poor">Poor (needs repaint)</option>
                </select>
              </div>
              
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Additional Notes
                </label>
                <textarea
                  value={formData.exterior.notes}
                  onChange={(e) => handleExteriorChange("notes", e.target.value)}
                  rows={3}
                  placeholder="Describe any existing damage or concerns..."
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
            </div>
          </div>
        );

      case 2: // Interior Check
        return (
          <div>
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>Interior Condition</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {[
                { key: "seats", label: "Seats", options: ["excellent", "good", "worn", "damaged"] },
                { key: "ac", label: "Air Conditioning", options: ["working", "weak", "not_working"] },
                { key: "entertainment", label: "Entertainment System", options: ["working", "partial", "not_working"] },
                { key: "cleanliness", label: "Cleanliness", options: ["clean", "moderate", "dirty"] },
              ].map(item => (
                <div key={item.key}>
                  <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                    {item.label}
                  </label>
                  <select
                    value={formData.interior[item.key]}
                    onChange={(e) => handleInteriorChange(item.key, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "rgba(255,255,255,.05)",
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: "8px",
                      color: "#fff"
                    }}
                  >
                    {item.options.map(opt => (
                      <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1).replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Additional Notes
                </label>
                <textarea
                  value={formData.interior.notes}
                  onChange={(e) => handleInteriorChange("notes", e.target.value)}
                  rows={3}
                  placeholder="Describe any interior issues..."
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
            </div>
          </div>
        );

      case 3: // Mechanical
        return (
          <div>
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>Mechanical Check</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {[
                { key: "engineSound", label: "Engine Sound", options: ["normal", "slight_noise", "unusual", "rough"] },
                { key: "brakes", label: "Brakes", options: ["good", "worn", "needs_service", "urgent"] },
                { key: "lights", label: "Lights", options: ["all_working", "minor_issues", "major_issues"] },
                { key: "tyres", label: "Tyres", options: ["good", "worn", "needs_replacement"] },
              ].map(item => (
                <div key={item.key}>
                  <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                    {item.label}
                  </label>
                  <select
                    value={formData.mechanical[item.key]}
                    onChange={(e) => handleMechanicalChange(item.key, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "rgba(255,255,255,.05)",
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: "8px",
                      color: "#fff"
                    }}
                  >
                    {item.options.map(opt => (
                      <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1).replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Additional Notes
                </label>
                <textarea
                  value={formData.mechanical.notes}
                  onChange={(e) => handleMechanicalChange("notes", e.target.value)}
                  rows={3}
                  placeholder="Describe any mechanical concerns..."
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
            </div>
          </div>
        );

      case 4: // Fuel & Odometer
        return (
          <div>
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>Fuel & Odometer Reading</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Fuel Level (%) *
                </label>
                <input
                  type="number"
                  value={formData.fuelLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, fuelLevel: e.target.value }))}
                  placeholder="Enter fuel percentage (0-100)"
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
                <div style={{ fontSize: "11px", color: T.textSec, marginTop: "4px" }}>
                  ⛽ Fuel level reading from dashboard
                </div>
              </div>
              
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Odometer Reading (km) *
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
                <div style={{ fontSize: "11px", color: T.textSec, marginTop: "4px" }}>
                  📊 Take a photo of the odometer for reference
                </div>
              </div>
            </div>
          </div>
        );

      case 5: // Documents
        return (
          <div>
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>Document Verification</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {[
                { key: "rc", label: "Registration Certificate (RC)" },
                { key: "insurance", label: "Insurance Certificate" },
                { key: "puc", label: "PUC Certificate" },
              ].map(doc => (
                <label key={doc.key} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  background: "rgba(255,255,255,.03)",
                  borderRadius: "10px",
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={formData.documents[doc.key]}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      documents: { ...prev.documents, [doc.key]: e.target.checked }
                    }))}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <span style={{ color: "#fff" }}>{doc.label}</span>
                </label>
              ))}
              
              <div>
                <label style={{ color: T.cyan, fontSize: "12px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  Document Notes
                </label>
                <textarea
                  value={formData.documents.notes}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    documents: { ...prev.documents, notes: e.target.value }
                  }))}
                  rows={2}
                  placeholder="Any missing documents or notes..."
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
            </div>
          </div>
        );

      case 6: // Review & Submit
        return (
          <div>
            <h3 style={{ color: "#fff", marginBottom: "20px" }}>Review & Submit</h3>
            <div style={{
              background: "rgba(255,255,255,.03)",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px"
            }}>
              <h4 style={{ color: T.cyan, marginBottom: "15px" }}>Inspection Summary</h4>
              
              <div style={{ marginBottom: "15px" }}>
                <strong style={{ color: "#fff" }}>Photos:</strong>
                <p style={{ color: T.textSec, fontSize: "13px" }}>
                  {Object.values(formData.photos).flat().length} photos captured
                </p>
              </div>
              
              <div style={{ marginBottom: "15px" }}>
                <strong style={{ color: "#fff" }}>Exterior:</strong>
                <p style={{ color: T.textSec, fontSize: "13px" }}>
                  Scratches: {formData.exterior.scratches}<br />
                  Dents: {formData.exterior.dents}<br />
                  Paint: {formData.exterior.paintCondition}
                </p>
              </div>
              
              <div style={{ marginBottom: "15px" }}>
                <strong style={{ color: "#fff" }}>Fuel & Odometer:</strong>
                <p style={{ color: T.textSec, fontSize: "13px" }}>
                  Fuel: {formData.fuelLevel}%<br />
                  Odometer: {formData.odometer} km
                </p>
              </div>
              
              {location && (
                <div style={{ marginBottom: "15px" }}>
                  <strong style={{ color: "#fff" }}>Location:</strong>
                  <p style={{ color: T.textSec, fontSize: "12px" }}>
                    📍 Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}<br />
                    🕐 {new Date(location.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
              
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
    if (currentStep === 0) {
      const totalPhotos = Object.values(formData.photos).flat().length;
      return totalPhotos >= 4; // At least 4 photos required
    }
    if (currentStep === 4) {
      return formData.fuelLevel && formData.odometer;
    }
    if (currentStep === 6) {
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
              🚗 Pickup Inspection
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
              {loading ? "Submitting..." : "Complete Inspection →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}