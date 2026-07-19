import { useState, useEffect, useRef, useCallback } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  TrafficLayer,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { getUserLocation } from "../utils/locationService";
import { API_KEYS } from "../utils/apiConfig";
import GoogleMapWrapper from "./GoogleMapWrapper";

const mapContainerStyle = {
  width: "100%",
  height: "350px",
  borderRadius: "14px",
};

const defaultCenter = { lat: 19.076, lng: 72.8777 };

// Fallback coords used ONLY when geocoding fails
const FALLBACK = {
  pickup: { lat: 19.076, lng: 72.8777 }, // Mumbai
  dropoff: { lat: 18.5204, lng: 73.8567 }, // Pune
};

// Marker icon config - created ONCE outside render
const CAR_MARKER_ICON = {
  url:
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="#4ce3f7" opacity="0.2"/>
      <circle cx="20" cy="20" r="8" fill="#4ce3f7" stroke="#fff" stroke-width="2"/>
      <circle cx="20" cy="20" r="3" fill="#0400ff"/>
    </svg>`,
    ),
  scaledSize: { width: 40, height: 40 },
  anchor: { x: 20, y: 20 },
};

export default function RouteMap({ pickup, dropoff, progress = 0 }) {
  const [userLocation, setUserLocation] = useState(null);
  const [carPosition, setCarPosition] = useState(null);
  const [directionsResult, setDirectionsResult] = useState(null);
  const [showTraffic, setShowTraffic] = useState(true);
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [routeInfo, setRouteInfo] = useState({
    totalDistance: "-- km",
    eta: "--",
    remainingDistance: "-- km",
    currentLocation: "Getting location...",
    progressPercent: 0,
  });

  const trackingRef = useRef(null);
  const mapRef = useRef(null);
  const destinationRef = useRef(FALLBACK.dropoff); // Store resolved destination for live tracking

  // ── Geocode address to coordinates ──
  async function geocodeAddress(address) {
    if (!address || !window.google?.maps) return null;
    return new Promise((resolve) => {
      new google.maps.Geocoder().geocode({ address }, (results, status) => {
        if (status === "OK" && results[0]) {
          resolve({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
            formatted: results[0].formatted_address,
          });
        } else {
          console.warn("Geocoding failed for:", address);
          resolve(null);
        }
      });
    });
  }

  // ── Step 1: Get user GPS location ──
  useEffect(() => {
    (async () => {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
        setCarPosition(location);
      } catch (error) {
        console.error("Location error:", error);
      }
    })();

    return () => {
      if (trackingRef.current)
        navigator.geolocation?.clearWatch(trackingRef.current);
    };
  }, []);

  // ── Step 2: Map ready → geocode & fetch route ──
  useEffect(() => {
    if (mapReady && pickup && dropoff) {
      fetchRoute();
    }
  }, [mapReady, pickup, dropoff]);

  async function fetchRoute() {
    if (!window.google?.maps) return;

    const pickupCoords = await geocodeAddress(pickup);
    const dropoffCoords = await geocodeAddress(dropoff);

    const origin = pickupCoords || FALLBACK.pickup;
    const destination = dropoffCoords || FALLBACK.dropoff;

    destinationRef.current = destination; // Store for live tracking
    console.log(
      "📍 Route:",
      origin.formatted || origin,
      "→",
      destination.formatted || destination,
    );

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: "bestguess",
        },
      },
      (result, status) => {
        if (status === "OK") {
          setDirectionsResult(result);
          const leg = result.routes[0].legs[0];
          setRouteInfo({
            totalDistance: leg.distance.text,
            eta: leg.duration_in_traffic?.text || leg.duration.text,
            remainingDistance: leg.distance.text,
            currentLocation: leg.start_address || pickup || "Pickup",
            progressPercent: 0,
          });
        } else {
          console.error("Directions failed:", status);
        }
      },
    );
  }

  // ── Map callbacks ──
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
    setMapReady(false);
  }, []);

  // ── Live GPS tracking ──
  function toggleLiveTracking() {
    if (isTracking) {
      navigator.geolocation?.clearWatch(trackingRef.current);
      trackingRef.current = null;
      setIsTracking(false);
      return;
    }

    if (!navigator.geolocation) return;
    setIsTracking(true);

    trackingRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCarPosition(newPos);

        if (directionsResult && window.google?.maps?.geometry) {
          const dest = destinationRef.current;
          const totalDist = directionsResult.routes[0].legs[0].distance.value;
          const remaining =
            google.maps.geometry.spherical.computeDistanceBetween(
              new google.maps.LatLng(newPos.lat, newPos.lng),
              new google.maps.LatLng(dest.lat, dest.lng),
            );
          const pct = Math.round((1 - remaining / totalDist) * 100);

          setRouteInfo((prev) => ({
            ...prev,
            remainingDistance: `${Math.round(remaining / 100) / 10} km`,
            currentLocation: `📍 ${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)}`,
            progressPercent: Math.max(0, Math.min(100, pct)),
          }));
        }
      },
      (error) => console.warn("GPS error:", error.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }

  return (
    <div className="dashboard-card trip-dashboard-full">
      <div className="dashboard-card-header" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0px 16px" }}>
        <span className="icon">🗺️</span>
        <h3>Live Route Map</h3>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setShowTraffic(!showTraffic)}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              border: `1px solid ${showTraffic ? "rgba(76,227,247,0.3)" : "rgba(255,255,255,0.1)"}`,
              background: showTraffic
                ? "rgba(76,227,247,0.1)"
                : "rgba(255,255,255,0.03)",
              color: showTraffic ? "#4ce3f7" : "rgba(255,255,255,0.4)",
              fontSize: "10px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Quicksand, sans-serif",
            }}
          >
            🚦 Traffic
          </button>
          <button
            onClick={toggleLiveTracking}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              border: `1px solid ${isTracking ? "rgba(34,197,94,0.3)" : "rgba(76,227,247,0.2)"}`,
              background: isTracking
                ? "rgba(34,197,94,0.1)"
                : "rgba(76,227,247,0.06)",
              color: isTracking ? "#22c55e" : "#4ce3f7",
              fontSize: "10px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Quicksand, sans-serif",
            }}
          >
            {isTracking ? "🟢 Live" : "📍 Track"}
          </button>
        </div>
      </div>

      <div className="tdb-route-pill">
        <span className="tdb-pin tdb-pin-a">A</span>
        <span className="tdb-route-city">{pickup?.split(",")[0] || "Pickup"}</span>
        <span className="tdb-route-arr">→</span>
        <span className="tdb-route-city">{dropoff?.split(",")[0] || "Dropoff"}</span>
        <span className="tdb-pin tdb-pin-b">B</span>
      </div>

      <div className="route-map-container">
        {API_KEYS?.GOOGLE_MAPS ? (
          <GoogleMapWrapper>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={carPosition || userLocation || defaultCenter}
              zoom={10}
              onLoad={onMapLoad}
              onUnmount={onMapUnmount}
              options={{
                styles: [
                  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                  {
                    elementType: "labels.text.stroke",
                    stylers: [{ color: "#242f3e" }],
                  },
                  {
                    elementType: "labels.text.fill",
                    stylers: [{ color: "#746855" }],
                  },
                  {
                    featureType: "road",
                    elementType: "geometry",
                    stylers: [{ color: "#38414e" }],
                  },
                  {
                    featureType: "road",
                    elementType: "geometry.stroke",
                    stylers: [{ color: "#212a37" }],
                  },
                  {
                    featureType: "water",
                    elementType: "geometry",
                    stylers: [{ color: "#17263c" }],
                  },
                ],
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              }}
            >
              {showTraffic && <TrafficLayer />}
              {directionsResult && (
                <DirectionsRenderer
                  directions={directionsResult}
                  options={{
                    polylineOptions: {
                      strokeColor: "#4ce3f7",
                      strokeWeight: 5,
                      strokeOpacity: 0.8,
                    },
                    suppressMarkers: false,
                  }}
                />
              )}
              {carPosition && (
                <Marker
                  position={carPosition}
                  icon={CAR_MARKER_ICON}
                  onClick={() => setShowInfoWindow(true)}
                >
                  {showInfoWindow && (
                    <InfoWindow onCloseClick={() => setShowInfoWindow(false)}>
                      <div
                        style={{
                          color: "#000",
                          fontSize: "12px",
                          fontFamily: "Quicksand, sans-serif",
                          padding: "4px",
                        }}
                      >
                        <strong>🚗 Your Location</strong>
                        <br />
                        {routeInfo.currentLocation}
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              )}
            </GoogleMap>
          </GoogleMapWrapper>
        ) : (
          <div className="route-map-placeholder">
            <div className="map-icon">🗺️</div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
              📍 {pickup || "Pickup"} → 📍 {dropoff || "Dropoff"}
            </p>
          </div>
        )}
      </div>

      <div className="route-info-overlay">
        {["Distance", "ETA", "Remaining", "Progress"].map((label) => (
          <div className="route-info-item" key={label}>
            <div className="label">{label}</div>
            <div className="value">
              {label === "Distance" && routeInfo.totalDistance}
              {label === "ETA" && routeInfo.eta}
              {label === "Remaining" && routeInfo.remainingDistance}
              {label === "Progress" && `${routeInfo.progressPercent}%`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
