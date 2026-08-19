// src/components/LiveNavigation.jsx

import { useState, useEffect, useRef } from "react";
import { getUserLocation } from "../utils/locationService";
import TollAlerts from "./TollAlerts"; // Add this import

/**
 * Live Navigation Component
 * Uses Google Maps DirectionsService (no CORS)
 * All locations come from booking props - NO hardcoded defaults
 */
export default function LiveNavigation({
  pickupAddress = "",
  dropoffAddress = "",
}) {
  const [userLocation, setUserLocation] = useState(null);
  const [directionsData, setDirectionsData] = useState(null);
  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("navigation");
  const [isTracking, setIsTracking] = useState(false);
  const [loadingDirections, setLoadingDirections] = useState(true);
  const [routeOrigin, setRouteOrigin] = useState({
    lat: 0,
    lng: 0,
    name: "Loading...",
  });
  const [routeDest, setRouteDest] = useState({
    lat: 0,
    lng: 0,
    name: "Loading...",
  });
  const watchRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let attempts = 0;
    const maxAttempts = 30; // 15 seconds total

    function tryInit() {
      if (!mounted) return;

      if (
        window.google &&
        window.google.maps &&
        window.google.maps.DirectionsService
      ) {
        console.log("✅ LiveNavigation: Google Maps ready, initializing...");
        initNavigation();
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(tryInit, 500);
      } else {
        console.warn(
          "⚠️ Google Maps not available after " + maxAttempts + " attempts",
        );
        handleDirectionsFallback(
          { lat: 0, lng: 0, name: pickupAddress?.split(",")[0] || "Pickup" },
          { lat: 0, lng: 0, name: dropoffAddress?.split(",")[0] || "Dropoff" },
        );
        setLoadingDirections(false);
      }
    }

    // Start checking immediately
    tryInit();

    return () => {
      mounted = false;
      if (watchRef.current) clearInterval(watchRef.current);
    };
  }, [pickupAddress, dropoffAddress]);

  // Geocode an address string to coordinates
  async function geocodeAddress(address) {
    if (!address || !window.google || !window.google.maps) return null;

    return new Promise((resolve) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results[0]) {
          resolve({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
            name: results[0].formatted_address,
          });
        } else {
          console.warn("Geocoding failed for:", address, status);
          resolve(null);
        }
      });
    });
  }

  async function initNavigation() {
    setLoadingDirections(true);

    try {
      // Get user's GPS location (for nearby places, not route)
      let location = null;
      try {
        location = await getUserLocation();
        setUserLocation(location);
      } catch (e) {
        console.warn("GPS not available");
      }

      // Geocode pickup and dropoff addresses from booking
      let originCoords = {
        lat: 0,
        lng: 0,
        name: pickupAddress?.split(",")[0] || "Pickup",
      };
      let destCoords = {
        lat: 0,
        lng: 0,
        name: dropoffAddress?.split(",")[0] || "Dropoff",
      };

      if (pickupAddress) {
        const geocoded = await geocodeAddress(pickupAddress);
        if (geocoded) {
          originCoords = geocoded;
          console.log("📍 Pickup geocoded:", originCoords);
        } else {
          console.warn("Could not geocode pickup, using name only");
        }
      }

      if (dropoffAddress) {
        const geocoded = await geocodeAddress(dropoffAddress);
        if (geocoded) {
          destCoords = geocoded;
          console.log("📍 Dropoff geocoded:", destCoords);
        } else {
          console.warn("Could not geocode dropoff, using name only");
        }
      }

      setRouteOrigin(originCoords);
      setRouteDest(destCoords);

      // If we have valid coordinates, fetch directions
      if (
        originCoords.lat !== 0 &&
        destCoords.lat !== 0 &&
        window.google &&
        window.google.maps
      ) {
        const service = new google.maps.DirectionsService();

        service.route(
          {
            origin: new google.maps.LatLng(originCoords.lat, originCoords.lng),
            destination: new google.maps.LatLng(destCoords.lat, destCoords.lng),
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
              departureTime: new Date(),
              trafficModel: "bestguess",
            },
          },
          (result, status) => {
            if (status === "OK") {
              console.log(
                "✅ LiveNavigation: Directions fetched successfully!",
              );
              const route = result.routes[0];
              const leg = route.legs[0];

              const normalDuration = leg.duration.value;
              const trafficDuration =
                leg.duration_in_traffic?.value || normalDuration;
              const delaySeconds = trafficDuration - normalDuration;
              const delayPercent =
                normalDuration > 0
                  ? Math.round((delaySeconds / normalDuration) * 100)
                  : 0;

              // Traffic condition
              let trafficData = {
                label: "Light",
                color: "#22c55e",
                delay: 0,
                icon: "🟢",
              };
              if (delayPercent > 50)
                trafficData = {
                  label: "Very Heavy",
                  color: "#ef4444",
                  delay: delayPercent,
                  icon: "🔴",
                };
              else if (delayPercent > 25)
                trafficData = {
                  label: "Heavy",
                  color: "#f97316",
                  delay: delayPercent,
                  icon: "🟠",
                };
              else if (delayPercent > 10)
                trafficData = {
                  label: "Moderate",
                  color: "#f59e0b",
                  delay: delayPercent,
                  icon: "🟡",
                };

              setTraffic(trafficData);

              // Turn-by-turn steps
              const steps = leg.steps.map((step, index) => ({
                instruction: stripHtml(step.html_instructions),
                distance: step.distance.text,
                duration: step.duration.text,
                icon: getStepIcon(step.maneuver),
                index: index + 1,
              }));

              const parsedData = {
                distance: {
                  km: Math.round(leg.distance.value / 100) / 10,
                  meters: leg.distance.value,
                  text: leg.distance.text,
                },
                duration: {
                  normal: formatDuration(normalDuration),
                  traffic: formatDuration(trafficDuration),
                  normalSeconds: normalDuration,
                  trafficSeconds: trafficDuration,
                },
                eta: {
                  arrivalTime: new Date(
                    Date.now() + trafficDuration * 1000,
                  ).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  display: formatDuration(trafficDuration),
                },
                traffic: trafficData,
                steps,
                isReal: true,
              };

              setDirectionsData(parsedData);
              setDistance({
                km: parsedData.distance.km,
                miles: Math.round(parsedData.distance.km * 0.62 * 10) / 10,
                meters: parsedData.distance.meters,
              });
              setEta({
                display: parsedData.duration.traffic,
                arrivalTime: parsedData.eta.arrivalTime,
                totalMinutes: Math.round(trafficDuration / 60),
                hours: Math.floor(trafficDuration / 3600),
                minutes: Math.round((trafficDuration % 3600) / 60),
              });
            } else {
              console.error("Directions request failed:", status);
              handleDirectionsFallback(originCoords, destCoords);
            }
          },
        );
      } else {
        console.warn(
          "Cannot fetch directions - missing coordinates or Google Maps",
        );
        handleDirectionsFallback(originCoords, destCoords);
      }
    } catch (error) {
      console.error("Navigation init error:", error);
      handleDirectionsFallback(
        { lat: 0, lng: 0, name: pickupAddress || "Pickup" },
        { lat: 0, lng: 0, name: dropoffAddress || "Dropoff" },
      );
    }

    setLoadingDirections(false);
  }

  // Fallback when directions API fails
  function handleDirectionsFallback(origin, dest) {
    // Calculate straight-line distance as fallback
    if (origin.lat !== 0 && dest.lat !== 0) {
      const R = 6371;
      const dLat = ((dest.lat - origin.lat) * Math.PI) / 180;
      const dLng = ((dest.lng - origin.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((origin.lat * Math.PI) / 180) *
          Math.cos((dest.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const distKm =
        Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) /
        10;
      const estMinutes = Math.round((distKm / 60) * 60);

      setDistance({
        km: distKm,
        miles: Math.round(distKm * 0.62 * 10) / 10,
        meters: distKm * 1000,
      });
      setEta({
        display:
          estMinutes >= 60
            ? `${Math.floor(estMinutes / 60)}h ${estMinutes % 60}m`
            : `${estMinutes} min`,
        arrivalTime: new Date(
          Date.now() + estMinutes * 60000,
        ).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        totalMinutes: estMinutes,
      });
    } else {
      setDistance({ km: 0, miles: 0, meters: 0 });
      setEta({ display: "--", arrivalTime: "--", totalMinutes: 0 });
    }

    setTraffic({
      label: "Unavailable",
      color: "#94a3b8",
      delay: 0,
      icon: "⚪",
    });
    setDirectionsData({
      distance: { km: 0, meters: 0, text: "--" },
      duration: {
        normal: "--",
        traffic: "--",
        normalSeconds: 0,
        trafficSeconds: 0,
      },
      eta: { arrivalTime: "--", display: "--" },
      traffic: { label: "Unavailable", color: "#94a3b8", delay: 0, icon: "⚪" },
      steps: [],
      isReal: false,
    });
  }

  function startLiveTracking() {
    if (isTracking) {
      if (watchRef.current) clearInterval(watchRef.current);
      setIsTracking(false);
      return;
    }

    setIsTracking(true);
    watchRef.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = Math.min(prev + Math.random() * 1.5, 99);

        if (directionsData?.duration?.trafficSeconds) {
          const remainingSeconds = Math.round(
            directionsData.duration.trafficSeconds * (1 - newProgress / 100),
          );
          setEta((prevEta) => ({
            ...prevEta,
            display: formatDuration(remainingSeconds),
            arrivalTime: new Date(
              Date.now() + remainingSeconds * 1000,
            ).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            totalMinutes: Math.round(remainingSeconds / 60),
          }));
        }

        return newProgress;
      });
    }, 3000);
  }

  function refreshDirections() {
    setLoadingDirections(true);
    setProgress(0);
    initNavigation();
  }

  // Only navigation tab — fuel/service/tolls are standalone cards in TripDashboard
  const tabs = [{ id: "navigation", icon: "🧭", label: "Live Navigation" }];

  return (
    <div>
      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "14px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          padding: "4px",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "8px 6px",
              borderRadius: "10px",
              border: "none",
              background:
                activeTab === tab.id ? "rgba(76,227,247,0.12)" : "transparent",
              color: activeTab === tab.id ? "#4ce3f7" : "rgba(255,255,255,0.4)",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Quicksand, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              transition: "all 0.2s",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Navigation Tab Content */}
      {activeTab === "navigation" && (
        <div>
          {/* Demo badge */}
          {directionsData && !directionsData.isReal && (
            <div
              style={{
                textAlign: "center",
                fontSize: "10px",
                color: "#f59e0b",
                marginBottom: "8px",
                padding: "4px",
                background: "rgba(245,158,11,0.08)",
                borderRadius: "6px",
              }}
            >
              ⚡ Estimated data - Live directions unavailable
            </div>
          )}

          {/* Distance, ETA, Arrival cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            {[
              {
                label: "Distance",
                value: directionsData
                  ? directionsData.distance.text
                  : distance
                    ? `${distance.km} km`
                    : "--",
                icon: "📏",
              },
              { label: "ETA", value: eta ? eta.display : "--", icon: "🕐" },
              {
                label: "Arrival",
                value: eta ? eta.arrivalTime : "--",
                icon: "🏁",
              },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                style={{
                  padding: "10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    fontWeight: "600",
                  }}
                >
                  {icon} {label}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#4ce3f7",
                    fontWeight: "700",
                    marginTop: "3px",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Traffic */}
          {traffic && (
            <div
              style={{
                padding: "10px 15px",
                background: `${traffic.color}15`,
                border: `1px solid ${traffic.color}30`,
                borderRadius: "10px",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "16px" }}>{traffic.icon}</span>
              <span
                style={{
                  color: traffic.color,
                  fontWeight: "700",
                  fontSize: "13px",
                }}
              >
                {traffic.label} Traffic
              </span>
              {traffic.delay > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "11px",
                  }}
                >
                  +{traffic.delay}% delay
                </span>
              )}
            </div>
          )}

          {/* Controls */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <button
              onClick={startLiveTracking}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "10px",
                border: `1px solid ${isTracking ? "rgba(34,197,94,0.4)" : "rgba(76,227,247,0.3)"}`,
                background: isTracking
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(76,227,247,0.06)",
                color: isTracking ? "#22c55e" : "#4ce3f7",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
                fontFamily: "Quicksand, sans-serif",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isTracking ? (
                <>
                  <span
                    className="pulse-dot"
                    style={{
                      background: "#22c55e",
                      width: "8px",
                      height: "8px",
                    }}
                  />
                  Live Tracking
                </>
              ) : (
                "📍 Start Tracking"
              )}
            </button>
            <button
              onClick={refreshDirections}
              disabled={loadingDirections}
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.6)",
                fontWeight: "600",
                fontSize: "12px",
                cursor: loadingDirections ? "not-allowed" : "pointer",
                fontFamily: "Quicksand, sans-serif",
                opacity: loadingDirections ? 0.5 : 1,
              }}
            >
              {loadingDirections ? "⏳" : "🔄"}
            </button>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: "14px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "10px",
                color: "rgba(255,255,255,0.35)",
                marginBottom: "4px",
              }}
            >
              <span>{routeOrigin.name || "Pickup"}</span>
              <span>{Math.round(progress)}%</span>
              <span>{routeDest.name || "Dropoff"}</span>
            </div>
            <div
              style={{
                height: "6px",
                borderRadius: "3px",
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #0400ff, #4ce3f7)",
                  borderRadius: "3px",
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>

          {/* Toll Alerts Component - FIXED: Pass pickup/dropoff as strings */}
          {pickupAddress && dropoffAddress && (
            <div style={{ marginBottom: "14px" }}>
              <TollAlerts pickup={pickupAddress} dropoff={dropoffAddress} />
            </div>
          )}

          {/* Turn-by-Turn Directions */}
          {directionsData && directionsData.steps?.length > 0 && (
            <div style={{ maxHeight: "180px", overflowY: "auto" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: "600",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}
              >
                📋 Turn-by-Turn ({directionsData.steps.length} steps)
              </div>
              {directionsData.steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    padding: "6px 0",
                    borderBottom:
                      i < directionsData.steps.length - 1
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: "18px",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  >
                    {step.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.8)",
                        fontSize: "11px",
                        lineHeight: "1.4",
                      }}
                    >
                      {step.instruction}
                    </div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: "10px",
                        marginTop: "2px",
                      }}
                    >
                      {step.distance} · {step.duration}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading State */}
          {loadingDirections && (
            <div
              style={{
                textAlign: "center",
                padding: "30px",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: "2px solid rgba(76,227,247,0.2)",
                  borderTopColor: "#4ce3f7",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 10px",
                }}
              />
              Loading directions...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper Functions ──
function stripHtml(html) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function getStepIcon(maneuver) {
  const icons = {
    "turn-slight-left": "↖️",
    "turn-sharp-left": "⬅️",
    "turn-left": "⬅️",
    "turn-slight-right": "↗️",
    "turn-sharp-right": "➡️",
    "turn-right": "➡️",
    straight: "⬆️",
    "keep-left": "↖️",
    "keep-right": "↗️",
    merge: "↗️",
    "roundabout-left": "↩️",
    "roundabout-right": "↪️",
    "uturn-left": "↩️",
    "uturn-right": "↪️",
    ferry: "⛴️",
    "ferry-train": "🚂",
  };
  return icons[maneuver] || "➡️";
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "--";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} min`;
}