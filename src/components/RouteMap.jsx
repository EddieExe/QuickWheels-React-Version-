import { useState, useEffect, useRef, useCallback } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  TrafficLayer,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { API_KEYS } from "../utils/apiConfig";
import GoogleMapWrapper from "./GoogleMapWrapper";
import { useTripNavigation } from "../context/TripNavigationContext";
import { lerpPoint } from "../utils/routeGeometry";

/**
 * RouteMap — presentational.
 * The route, the position feed and every number below the map come from
 * TripNavigationContext.
 */

const mapContainerStyle = {
  width: "100%",
  height: "350px",
  borderRadius: "14px",
};

const defaultCenter = { lat: 19.076, lng: 72.8777 };

// Built once — a fresh object per render remounts the marker.
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

const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

export default function RouteMap({ pickup, dropoff }) {
  const {
    route,
    position,
    isTracking,
    toggleTracking,
    isSimulated,
    totalDistanceText,
    etaText,
    remainingText,
    progressPercent,
  } = useTripNavigation();

  const [showTraffic, setShowTraffic] = useState(true);
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [followCar, setFollowCar] = useState(true);
  const mapRef = useRef(null);

  const markerPosition = useSmoothedPosition(position);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Follow the car by panning, not by driving the `center` prop — a
  // controlled centre snaps back on every fix and fights the user's panning.
  useEffect(() => {
    if (!followCar || !markerPosition || !mapRef.current) return;
    mapRef.current.panTo(markerPosition);
  }, [followCar, markerPosition]);

  // Frame the whole route once it arrives, before any fix exists.
  useEffect(() => {
    if (!route?.rawResult || !mapRef.current || !window.google?.maps) return;
    const bounds = route.rawResult.routes[0].bounds;
    if (bounds) mapRef.current.fitBounds(bounds, 40);
  }, [route]);

  return (
    <div className="dashboard-card trip-dashboard-full">
      <div
        className="dashboard-card-header"
        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0px 16px" }}
      >
        <span className="icon">🗺️</span>
        <h3>Live Route Map</h3>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          <MapPill
            active={showTraffic}
            activeColor="#4ce3f7"
            onClick={() => setShowTraffic((v) => !v)}
          >
            🚦 Traffic
          </MapPill>
          <MapPill
            active={followCar}
            activeColor="#4ce3f7"
            onClick={() => setFollowCar((v) => !v)}
          >
            {followCar ? "🎯 Following" : "🎯 Follow"}
          </MapPill>
          <MapPill
            active={isTracking}
            activeColor="#22c55e"
            onClick={toggleTracking}
          >
            {isTracking ? (isSimulated ? "🟢 Simulating" : "🟢 Live") : "📍 Track"}
          </MapPill>
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
              center={defaultCenter}
              zoom={10}
              onLoad={onMapLoad}
              onUnmount={onMapUnmount}
              onDragStart={() => setFollowCar(false)}
              options={{
                styles: MAP_STYLES,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              }}
            >
              {showTraffic && <TrafficLayer />}
              {route?.rawResult && (
                <DirectionsRenderer
                  directions={route.rawResult}
                  options={{
                    polylineOptions: {
                      strokeColor: "#4ce3f7",
                      strokeWeight: 5,
                      strokeOpacity: 0.8,
                    },
                    suppressMarkers: false,
                    preserveViewport: true,
                  }}
                />
              )}
              {markerPosition && (
                <Marker
                  position={markerPosition}
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
                        {markerPosition.lat.toFixed(4)}, {markerPosition.lng.toFixed(4)}
                        <br />
                        {remainingText} to go
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
        {[
          ["Distance", totalDistanceText],
          ["ETA", etaText],
          ["Remaining", remainingText],
          ["Progress", `${Math.round(progressPercent)}%`],
        ].map(([label, value]) => (
          <div className="route-info-item" key={label}>
            <div className="label">{label}</div>
            <div className="value">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MapPill({ active, activeColor, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        borderRadius: "6px",
        border: `1px solid ${active ? `${activeColor}4d` : "rgba(255,255,255,0.1)"}`,
        background: active ? `${activeColor}1a` : "rgba(255,255,255,0.03)",
        color: active ? activeColor : "rgba(255,255,255,0.4)",
        fontSize: "10px",
        fontWeight: "600",
        cursor: "pointer",
        fontFamily: "Quicksand, sans-serif",
      }}
    >
      {children}
    </button>
  );
}

/**
 * Fixes arrive about once a second; drawing them raw makes the car teleport.
 * Tween between the previous and latest fix so it glides instead.
 */
const TWEEN_MS = 900;

function useSmoothedPosition(target) {
  const [tweened, setTweened] = useState(null);
  const fromRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!target) {
      fromRef.current = null;
      return undefined;
    }

    // First fix of a run: nothing to tween from, render it as-is.
    const from = fromRef.current;
    if (!from) {
      fromRef.current = target;
      return undefined;
    }

    const startedAt = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - startedAt) / TWEEN_MS);
      setTweened(lerpPoint(from, target, t));
      if (t < 1) frameRef.current = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    frameRef.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  if (!target) return null;
  // Until the first frame of a tween lands, `tweened` still holds the previous
  // fix, which keeps the marker continuous rather than snapping ahead.
  return tweened ?? target;
}
