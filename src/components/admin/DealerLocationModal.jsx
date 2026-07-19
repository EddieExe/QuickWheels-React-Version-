// src/components/admin/DealerLocationModal.jsx
import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

// Consistent Theme Colors
const T = {
  rose: "#f43f5e",
  roseGrad: "linear-gradient(135deg, #9f1239 0%, #f43f5e 100%)",
  bgMain: "#0f0b1c",
  bgSub: "rgba(255,255,255,0.01)",
  border: "rgba(255,255,255,0.08)",
  borderSub: "rgba(255,255,255,0.05)",
  textSec: "rgba(255,255,255,0.4)",
};

const AVAILABLE_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune",
  "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore",
  "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad",
  "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan",
  "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai",
  "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior",
  "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh",
];

const AVAILABLE_STATES = [
  "Maharashtra", "Delhi", "Karnataka", "Telangana", "Tamil Nadu", "West Bengal",
  "Gujarat", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh", "Bihar", "Punjab",
  "Haryana", "Kerala", "Odisha", "Assam", "Jharkhand", "Chhattisgarh", "Goa",
];

export default function DealerLocationModal({ dealer, onClose, onUpdate }) {
  const [selectedCities, setSelectedCities] = useState([]);
  const [selectedStates, setSelectedStates] = useState([]);
  const [serviceRadius, setServiceRadius] = useState(50);
  const [loading, setLoading] = useState(false);
  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");

  useEffect(() => {
    if (dealer) {
      setSelectedCities(dealer.serviceCities || []);
      setSelectedStates(dealer.serviceStates || []);
      setServiceRadius(dealer.serviceRadius || 50);
    }
  }, [dealer]);

  const handleAddCity = (city) => {
    if (!selectedCities.includes(city)) setSelectedCities([...selectedCities, city]);
    setSearchCity("");
  };
  const handleRemoveCity = (city) => setSelectedCities(selectedCities.filter(c => c !== city));

  const handleAddState = (state) => {
    if (!selectedStates.includes(state)) setSelectedStates([...selectedStates, state]);
    setSearchState("");
  };
  const handleRemoveState = (state) => setSelectedStates(selectedStates.filter(s => s !== state));

  const handleSave = async () => {
    setLoading(true);
    try {
      const dealerRef = doc(db, "dealers", dealer.id);
      await updateDoc(dealerRef, {
        serviceCities: selectedCities,
        serviceStates: selectedStates,
        serviceRadius: serviceRadius,
        updatedAt: new Date(),
      });
      onUpdate({ serviceCities: selectedCities, serviceStates: selectedStates, serviceRadius: serviceRadius });
      onClose();
    } catch (error) {
      console.error("Error updating dealer locations:", error);
      alert("Failed to update locations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCities = AVAILABLE_CITIES.filter(city =>
    city.toLowerCase().includes(searchCity.toLowerCase()) && !selectedCities.includes(city)
  ).slice(0, 10);

  const filteredStates = AVAILABLE_STATES.filter(state =>
    state.toLowerCase().includes(searchState.toLowerCase()) && !selectedStates.includes(state)
  ).slice(0, 10);

  return (
    <div className="dlm-overlay" onClick={onClose}>
      <style>{`
        @keyframes dlmFadeInModal { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }

        .dlm-overlay {
          position: fixed; inset: 0; background: rgba(15, 11, 28, 0.65); z-index: 9999;
          display: flex; align-items: center; justify-content: center; padding: 30px;
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        }

        .dlm-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .dlm-scroll::-webkit-scrollbar-track { background: transparent; }
        .dlm-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .dlm-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

        /* Wrapper is a fixed-height flex column split into three regions:
           header (pinned) / body (the only thing that scrolls) / footer (pinned).
           min-height: 0 on every nested flex item is what makes that actually
           hold — without it .dlm-body can't shrink and the whole card grows
           past its box instead of scrolling internally. */
        .dlm-wrapper {
          background: ${T.bgMain}; border: 1px solid ${T.border}; border-radius: 24px;
          max-width: 680px; width: 100%; max-height: 85vh; min-height: 0;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 25px 60px -15px rgba(0,0,0,0.7);
          animation: dlmFadeInModal 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
          font-family: 'Quicksand', -apple-system, sans-serif; color: #f8fafc;
        }

        .dlm-header {
          padding: 24px 28px 18px; border-bottom: 1px solid ${T.borderSub};
          display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;
          flex-shrink: 0;
        }
        .dlm-header h2 { margin: 0 0 2px; font-size: 22px; color: #fff; font-weight: 800; letter-spacing: -0.5px; }
        .dlm-header p { margin: 0; color: ${T.textSec}; font-size: 13px; }
        .dlm-header p span { color: #fff; font-weight: 600; }
        .dlm-close {
          background: rgba(255,255,255,0.03); border: 1px solid ${T.border}; border-radius: 12px;
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          color: ${T.textSec}; cursor: pointer; transition: all 0.2s; flex-shrink: 0;
        }
        .dlm-close:hover { color: #fff; background: rgba(255,255,255,0.08); }

        .dlm-body { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 28px 4px; display: flex; flex-direction: column; gap: 20px; }

        .dlm-module { background: ${T.bgSub}; border: 1px solid ${T.borderSub}; border-radius: 18px; padding: 20px; }
        .dlm-label { display: block; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: ${T.rose}; margin-bottom: 12px; text-transform: uppercase; }
        .dlm-hint { margin: 8px 0 0; font-size: 11.5px; color: ${T.textSec}; line-height: 1.5; }

        .dlm-range-row { display: flex; align-items: center; gap: 20px; }
        .dlm-range { -webkit-appearance: none; width: 100%; height: 4px; border-radius: 2px; outline: none; flex: 1; }
        .dlm-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #f43f5e; cursor: pointer; transition: transform 0.1s; box-shadow: 0 2px 6px rgba(0,0,0,0.4); }
        .dlm-range::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .dlm-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #f43f5e; cursor: pointer; border: none; }
        .dlm-range-value {
          background: rgba(244,63,94,0.12); border: 1px solid rgba(244,63,94,0.2); padding: 6px 14px;
          border-radius: 8px; color: ${T.rose}; font-weight: 700; font-size: 13px; min-width: 65px; text-align: center; flex-shrink: 0;
        }

        .dlm-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .dlm-tag {
          padding: 4px 10px; background: rgba(244,63,94,0.08); border: 1px solid rgba(244,63,94,0.15);
          border-radius: 6px; font-size: 12px; color: #fff; display: inline-flex; align-items: center; gap: 6px; font-weight: 600;
        }
        .dlm-tag button { background: none; border: none; color: ${T.rose}; cursor: pointer; font-size: 14px; padding: 0; display: flex; align-items: center; }

        .dlm-input-wrap { position: relative; }
        .dlm-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid ${T.borderSub};
          border-radius: 12px;
          color: #fff;
          font-size: 12px;
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }

        .dlm-input::placeholder {
          font-size: 13px;
          color: rgba(255,255,255,0.45);
        }

        .dlm-input:focus {
          border-color: rgba(244,63,94,0.5);
        }
        .dlm-suggest {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #130f24; border: 1px solid ${T.border};
          border-radius: 12px; max-height: 160px; overflow-y: auto; z-index: 10; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .dlm-suggest-item { padding: 10px 16px; cursor: pointer; color: rgba(255,255,255,0.7); font-size: 13px; border-bottom: 1px solid ${T.borderSub}; transition: all 0.2s; }
        .dlm-suggest-item:last-child { border-bottom: none; }
        .dlm-suggest-item:hover { background: rgba(244,63,94,0.1); color: ${T.rose}; }

        .dlm-summary { background: rgba(244,63,94,0.03); border: 1px solid rgba(244,63,94,0.1); border-radius: 14px; padding: 14px 18px; flex-shrink: 0; }
        .dlm-summary p:first-child { margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 1px; color: ${T.rose}; text-transform: uppercase; }
        .dlm-summary p:last-child { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.75); font-weight: 600; }

        .dlm-footer {
          flex-shrink: 0; display: flex; gap: 12px; justify-content: flex-end;
          padding: 16px 28px 22px; border-top: 1px solid ${T.borderSub}; background: ${T.bgMain};
        }
        .dlm-action-btn { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); font-family: inherit; }
        .dlm-action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); opacity: 0.95; }
        .dlm-action-btn:active { transform: translateY(0); opacity: 1; }
        .dlm-btn-cancel {
          padding: 13px 24px; background: rgba(255,255,255,0.03); border: 1px solid ${T.border}; border-radius: 12px;
          color: rgba(255,255,255,0.7); cursor: pointer; font-weight: 700; font-size: 13px;
        }
        .dlm-btn-save {
          padding: 13px 32px; border: none; border-radius: 12px; color: #fff; font-weight: 700; font-size: 13px;
          display: flex; align-items: center; gap: 8px; justify-content: center;
        }

        /* ═══ TABLET (≤ 1023px) ═══ */
        @media (max-width: 1023px) {
          .dlm-overlay { padding: 16px; }
          .dlm-wrapper { max-height: 90vh; }
        }

        /* ═══ MOBILE (≤ 700px): full-screen, stacked footer ═══ */
        @media (max-width: 700px) {
          .dlm-overlay {
            padding: 0;
            align-items: stretch;
          }

          .dlm-wrapper {
            max-width: 100%;
            width: 100%;
            height: 100dvh;
            max-height: 100dvh;
            border-radius: 0;
            border: none;
          }

          .dlm-header {
            padding: 16px 16px 14px;
          }

          .dlm-header h2 {
            font-size: 18px;
          }

          .dlm-header p {
            font-size: 12px;
          }

          .dlm-body {
            padding: 16px 16px 4px;
            gap: 14px;
          }

          .dlm-module {
            padding: 14px;
            border-radius: 14px;
          }

          .dlm-label {
            font-size: 10px;
            margin-bottom: 10px;
          }

          .dlm-range-row {
            gap: 14px;
          }

          .dlm-range-value {
            font-size: 12px;
            padding: 5px 10px;
            min-width: 56px;
          }

          .dlm-tag {
            font-size: 11px;
            padding: 3px 8px;
          }

          .dlm-input {
            padding: 11px 14px;
            font-size: 12px;
          }

          .dlm-input::placeholder {
            font-size: 12px;
          }

          .dlm-suggest {
            max-height: 140px;
          }

          .dlm-summary {
            padding: 12px 14px;
          }

          .dlm-footer {
            padding: 12px 16px 16px;
            flex-direction: column-reverse;
          }

          .dlm-btn-cancel,
          .dlm-btn-save {
            width: 100%;
            padding: 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dlm-wrapper { animation: none !important; }
          .dlm-action-btn { transition: none !important; }
        }
      `}</style>

      <div className="dlm-wrapper" onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className="dlm-header">
          <div>
            <h2>Assign Service Areas</h2>
            <p>Configure logistical boundaries for <span>{dealer?.businessName}</span></p>
          </div>
          <button className="dlm-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="dlm-body dlm-scroll">

          {/* Service Radius */}
          <div className="dlm-module">
            <label className="dlm-label">Radius Reach Quantum</label>
            <div className="dlm-range-row">
              <input
                type="range" min="10" max="200" step="10" value={serviceRadius}
                onChange={(e) => setServiceRadius(parseInt(e.target.value))}
                className="dlm-range"
                style={{ background: `linear-gradient(90deg, ${T.rose} 0%, ${T.rose} ${(serviceRadius / 200) * 100}%, rgba(255,255,255,0.06) ${(serviceRadius / 200) * 100}%)` }}
              />
              <span className="dlm-range-value">{serviceRadius} km</span>
            </div>
            <p className="dlm-hint">Maximum distance vector authorized from designated core logistics hubs.</p>
          </div>

          {/* States */}
          <div className="dlm-module">
            <label className="dlm-label">Operational States</label>
            {selectedStates.length > 0 && (
              <div className="dlm-tags">
                {selectedStates.map(state => (
                  <span key={state} className="dlm-tag">
                    {state}
                    <button onClick={() => handleRemoveState(state)}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="dlm-input-wrap">
              <input
                type="text" className="dlm-input" value={searchState}
                onChange={(e) => setSearchState(e.target.value)}
                placeholder="Search state node matrix..."
              />
              {searchState && filteredStates.length > 0 && (
                <div className="dlm-suggest dlm-scroll">
                  {filteredStates.map(state => (
                    <div key={state} className="dlm-suggest-item" onClick={() => handleAddState(state)}>{state}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cities */}
          <div className="dlm-module">
            <label className="dlm-label">Operational Cities</label>
            {selectedCities.length > 0 && (
              <div className="dlm-tags">
                {selectedCities.map(city => (
                  <span key={city} className="dlm-tag">
                    {city}
                    <button onClick={() => handleRemoveCity(city)}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="dlm-input-wrap">
              <input
                type="text" className="dlm-input" value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="Search city grid parameters..."
              />
              {searchCity && filteredCities.length > 0 && (
                <div className="dlm-suggest dlm-scroll">
                  {filteredCities.map(city => (
                    <div key={city} className="dlm-suggest-item" onClick={() => handleAddCity(city)}>{city}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="dlm-summary">
            <p>Reconciled Coverage Data</p>
            <p>{selectedStates.length} State{selectedStates.length !== 1 && "s"} • {selectedCities.length} Cit{selectedCities.length === 1 ? "y" : "ies"} Grid locked @ {serviceRadius} km Matrix</p>
          </div>

        </div>

        {/* FOOTER */}
        <div className="dlm-footer">
          <button onClick={onClose} className="dlm-action-btn dlm-btn-cancel">Cancel Parameters</button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="dlm-action-btn dlm-btn-save"
            style={{ background: loading ? "rgba(255,255,255,0.08)" : T.roseGrad, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Writing Ledger..." : "Commit Map Node Changes →"}
          </button>
        </div>

      </div>
    </div>
  );
}