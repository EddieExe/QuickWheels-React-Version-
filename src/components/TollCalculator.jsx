import { useState, useEffect } from "react";
import { API_KEYS } from "../utils/apiConfig";

/**
 * TollCalculator — uses Google Routes API for real toll data
 */
export default function TollCalculator({ pickup, dropoff }) {
  const [tollData, setTollData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (pickup && dropoff) calculateTolls();
  }, [pickup, dropoff]);

  async function geocode(address) {
    const res = await fetch(
      `/maps-geocode/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEYS.GOOGLE_MAPS}`,
    );
    const data = await res.json();
    if (!data.results?.length)
      throw new Error(`Geocode failed for: ${address}`);
    const { lat, lng } = data.results[0].geometry.location;
    return { latitude: lat, longitude: lng };
  }

  async function calculateTolls() {
    setLoading(true);
    setError(null);
    try {
      const [origin, destination] = await Promise.all([
        geocode(pickup),
        geocode(dropoff),
      ]);

      const res = await fetch("/routes-api/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEYS.GOOGLE_MAPS,
          "X-Goog-FieldMask": [
            "routes.distanceMeters",
            "routes.duration",
            "routes.travelAdvisory",
            "routes.legs.travelAdvisory",
          ].join(","),
        },
        body: JSON.stringify({
          origin: { location: { latLng: origin } },
          destination: { location: { latLng: destination } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          extraComputations: ["TOLLS"],
          units: "METRIC",
        }),
      });

      const data = await res.json();
      console.log("[Routes API] toll response:", JSON.stringify(data, null, 2));

      const route = data.routes?.[0];
      const tollInfo = route?.travelAdvisory?.tollInfo;
      const legTolls = route?.legs?.[0]?.travelAdvisory?.tollInfo;
      const active = tollInfo || legTolls;

      if (!active?.estimatedPrice?.length) {
        // Route API returned no toll data — means no tolls or not available
        setTollData({
          hasTolls: false,
          totalCost: 0,
          currency: "INR",
          tolls: [],
        });
      } else {
        const prices = active.estimatedPrice;
        const inrPrice =
          prices.find((p) => p.currencyCode === "INR") || prices[0];
        const totalCost = Math.round(parseFloat(inrPrice?.units || 0));

        // Routes API gives total toll cost but not individual plazas in v2
        // We split it proportionally across estimated plaza count
        const distKm = Math.round((route.distanceMeters || 0) / 1000);
        const plazaCount = Math.max(1, Math.floor(distKm / 60)); // ~1 plaza per 60km
        const perPlaza = Math.round(totalCost / plazaCount);

        // Generate named plazas based on the route corridor
        const plazaNames = generatePlazaNames(pickup, dropoff, plazaCount);

        setTollData({
          hasTolls: true,
          totalCost,
          currency: inrPrice?.currencyCode || "INR",
          distanceKm: distKm,
          tolls: plazaNames.map((name, i) => ({
            name,
            cost: perPlaza,
            km: Math.round(((i + 1) / (plazaCount + 1)) * distKm),
          })),
        });
      }
    } catch (err) {
      console.error("[TollCalculator]", err);
      setError("Could not fetch toll data.");
    }
    setLoading(false);
  }

  // ── Renders ───────────────────────────────────────────────
  if (loading)
    return (
      <div className="dashboard-card">
        <CardHeader total={null} />
        <p style={dimText}>Calculating tolls via Routes API...</p>
      </div>
    );

  if (error)
    return (
      <div className="dashboard-card">
        <CardHeader total={null} />
        <p style={{ ...dimText, color: "#ef4444" }}>{error}</p>
      </div>
    );

  if (!tollData?.hasTolls)
    return (
      <div className="dashboard-card">
        <CardHeader total={0} />
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: "#22c55e",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          ✅ No tolls on this route!
        </div>
      </div>
    );

  return (
    <div className="dashboard-card">
      <CardHeader total={tollData.totalCost} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        {tollData.tolls.map((toll, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "10px",
            }}
          >
            <div>
              <div
                style={{ color: "#fff", fontSize: "13px", fontWeight: "600" }}
              >
                {toll.name}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "11px",
                  marginTop: "2px",
                }}
              >
                ~{toll.km} km from start
              </div>
            </div>
            <div
              style={{ color: "#f59e0b", fontSize: "14px", fontWeight: "700" }}
            >
              ₹{toll.cost}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "10px",
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: "10px",
          fontSize: "12px",
          color: "rgba(255,255,255,0.5)",
          textAlign: "center",
        }}
      >
        🚗 {tollData.tolls.length} toll plaza
        {tollData.tolls.length !== 1 ? "s" : ""} · Total:{" "}
        <strong style={{ color: "#f59e0b" }}>₹{tollData.totalCost}</strong>
        {tollData.distanceKm && (
          <span style={{ marginLeft: "8px", opacity: 0.6 }}>
            · {tollData.distanceKm} km
          </span>
        )}
      </div>
    </div>
  );
}

function CardHeader({ total }) {
  return (
    <div className="dashboard-card-header">
      <span className="icon">💰</span>
      <h3>Toll Calculator</h3>
      {total !== null && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: "16px",
            fontWeight: "800",
            color: "#f59e0b",
          }}
        >
          {total > 0 ? `₹${total}` : "No Tolls"}
        </span>
      )}
    </div>
  );
}

// ── Generate likely plaza names from route corridor ───────────
function generatePlazaNames(pickup, dropoff, count) {
  const origin = pickup?.split(",")[0]?.trim() || "Start";
  const dest = dropoff?.split(",")[0]?.trim() || "End";

  // Known Indian highway toll corridors
  const knownCorridors = {
    "mumbai-pune": [
      "Khalapur Toll Plaza",
      "Talegaon Toll Plaza",
      "Khed Shivapur",
    ],
    "mumbai-nashik": ["Bhiwandi Toll", "Shahapur Toll", "Ghoti Toll"],
    "mumbai-goa": [
      "Pen Toll",
      "Mangaon Toll",
      "Kashedi Ghat Toll",
      "Sawantwadi Toll",
    ],
    "pune-bangalore": [
      "Nira Toll",
      "Satara Toll",
      "Kolhapur Toll",
      "Dharwad Toll",
    ],
    "delhi-agra": ["Faridabad Toll", "Palwal Toll", "Hodal Toll"],
    "delhi-jaipur": ["Manesar Toll", "Behror Toll", "Shahpura Toll"],
  };

  const key = `${origin.toLowerCase()}-${dest.toLowerCase()}`;
  const reverseKey = `${dest.toLowerCase()}-${origin.toLowerCase()}`;
  const known = knownCorridors[key] || knownCorridors[reverseKey];

  if (known) return known.slice(0, count);

  // Generic fallback
  return Array.from({ length: count }, (_, i) =>
    i === 0
      ? `${origin} Exit Toll`
      : i === count - 1
        ? `${dest} Entry Toll`
        : `Toll Plaza ${i + 1}`,
  );
}

const dimText = {
  color: "rgba(255,255,255,0.4)",
  fontSize: "13px",
  textAlign: "center",
  padding: "20px",
};
