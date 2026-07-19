/**
 * AttractionsNearby.jsx — Production Grade
 *
 * Architecture:
 * - Google Places data fetched via allorigins.win CORS proxy (avoids browser CORS block)
 * - Two-pass fetch: Nearby Search → Place Details (for opening hours, website, editorial summary)
 * - Rich contextual content (speciality, food, why visit, best time) generated via Claude API
 *   per city — cached in sessionStorage so it only runs once per city per session
 * - Category tabs: All / Nature / Culture / Food / Adventure
 * - Each card: photo, rating, open/closed, distance, route button, AI-generated description
 * - Retry on error, skeleton loading per card
 * - Falls back gracefully if Places API quota hit
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { API_KEYS } from "../utils/apiConfig";

// ── Placeholder images by type ─────────────────────────────
const TYPE_IMAGES = {
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
  park: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600",
  museum: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600",
  hindu_temple:
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600",
  church: "https://images.unsplash.com/photo-1481026469463-66327c86e544?w=600",
  mosque: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600",
  amusement_park:
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600",
  shopping_mall:
    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600",
  restaurant:
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600",
  natural_feature:
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600",
  zoo: "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=600",
  tourist_attraction:
    "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600",
  default: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=600",
};

function placeholderFor(types = []) {
  for (const t of types) {
    if (TYPE_IMAGES[t]) return TYPE_IMAGES[t];
  }
  return TYPE_IMAGES.default;
}

// ── Haversine distance ─────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

// ── Category config ────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All", icon: "🗺️" },
  { id: "nature", label: "Nature", icon: "🌿" },
  { id: "culture", label: "Culture", icon: "🏛️" },
  { id: "food", label: "Food", icon: "🍽️" },
  { id: "adventure", label: "Adventure", icon: "⛰️" },
];

// ── Expanded category map covering Places API (New) types ─────
const TYPE_CATEGORY = {
  // Nature
  beach: "nature",
  park: "nature",
  natural_feature: "nature",
  campground: "nature",
  rv_park: "nature",
  botanical_garden: "nature",
  national_park: "nature",
  state_park: "nature",
  waterfall: "nature",
  lake: "nature",
  river: "nature",
  garden: "nature",
  // Culture
  museum: "culture",
  art_gallery: "culture",
  hindu_temple: "culture",
  church: "culture",
  mosque: "culture",
  synagogue: "culture",
  tourist_attraction: "culture",
  landmark: "culture",
  monument: "culture",
  historical_landmark: "culture",
  heritage_building: "culture",
  cultural_center: "culture",
  library: "culture",
  place_of_worship: "culture",
  // Food
  restaurant: "food",
  cafe: "food",
  bakery: "food",
  bar: "food",
  food: "food",
  meal_takeaway: "food",
  shopping_mall: "food",
  market: "food",
  food_court: "food",
  sweet_shop: "food",
  // Adventure
  amusement_park: "adventure",
  zoo: "adventure",
  aquarium: "adventure",
  stadium: "adventure",
  bowling_alley: "adventure",
  water_park: "adventure",
  hiking_area: "adventure",
  ski_resort: "adventure",
  sports_complex: "adventure",
};

function categoryOf(types = []) {
  for (const t of types) {
    if (TYPE_CATEGORY[t]) return TYPE_CATEGORY[t];
  }
  return "culture";
}

// ── sessionStorage cache ───────────────────────────────────
const CACHE_PREFIX = "qw_attractions_";

function cacheGet(city) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + city.toLowerCase());
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    // Cache valid for 1 hour
    if (Date.now() - ts < 3600000) return data;
    sessionStorage.removeItem(CACHE_PREFIX + city.toLowerCase());
  } catch (_) {}
  return null;
}

function cacheSet(city, data) {
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + city.toLowerCase(),
      JSON.stringify({ data, ts: Date.now() }),
    );
  } catch (_) {}
}

// ── Places API (New) — Text Search endpoint ───────────────────
async function placesNewSearch(query, lat, lng, apiKey) {
  const url = `/maps-api/v1/places:searchText`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.types",
        "places.photos",
        "places.currentOpeningHours",
        "places.priceLevel",
        "places.primaryType",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 25000.0,
        },
      },
      maxResultCount: 20,
      languageCode: "en",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Places API (New) error ${res.status}: ${err}`);
  }
  return res.json();
}

// ── Photo URL helper (Places API New) ─────────────────────────
function getPhotoUrl(photos, apiKey) {
  if (!photos?.length) return null;
  const ref = photos[0].name; // e.g. "places/ChIJ.../photos/AXCi..."
  return `/maps-api/v1/${ref}/media?maxWidthPx=600&key=${apiKey}`;
}

// ── Claude API: generate rich context for the city's attractions ──
async function generateAttractionContext(cityName, attractionNames) {
  const cacheKey = `qw_atx_ctx_${cityName.toLowerCase()}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  try {
    const prompt = `You are a travel expert for India. For the city "${cityName}", provide rich travel context for these attractions: ${attractionNames.join(", ")}.

Return ONLY a valid JSON object (no markdown, no backticks) in this exact shape:
{
  "cityHighlight": "One compelling sentence about why ${cityName} is worth visiting",
  "bestTime": "Best months to visit ${cityName}",
  "mustTryFood": ["dish1", "dish2", "dish3"],
  "attractions": {
    "ATTRACTION_NAME": {
      "speciality": "What makes it unique in one sentence",
      "tip": "One practical visitor tip",
      "category": "nature|culture|food|adventure"
    }
  }
}

Use the exact attraction names as keys. Keep every string under 100 characters.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data?.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    sessionStorage.setItem(cacheKey, JSON.stringify(parsed));
    return parsed;
  } catch (err) {
    console.warn("[AttractionsNearby] Claude context fetch failed:", err);
    return {};
  }
}

// ── Main component ─────────────────────────────────────────
export default function AttractionsNearby({ pickup, dropoff, location }) {
  const [attractions, setAttractions] = useState([]);
  const [aiContext, setAiContext] = useState(null);
  const [cityName, setCityName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingContext, setLoadingContext] = useState(false);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const targetLocation = dropoff || location || pickup;

  // ── Fetch from Places API ────────────────────────────────
  const fetchAttractions = useCallback(async (address) => {
    setLoading(true);
    setError(null);
    setAttractions([]);
    setAiContext(null);

    const city = address.split(",")[0].trim();
    setCityName(city);

    // Check cache first
    const cached = cacheGet(city);
    if (cached) {
      setAttractions(cached.attractions);
      setAiContext(cached.aiContext);
      setLoading(false);
      return;
    }

    const API_KEY = API_KEYS?.GOOGLE_MAPS;
    if (!API_KEY) {
      setError("Google Maps API key not configured.");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Geocode via REST (still works fine)
      const geocodeRes = await fetch(
        `/maps-geocode/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`,
      );
      const geocodeData = await geocodeRes.json();
      console.log("[Geocode] status:", geocodeData.status);

      if (!geocodeData.results?.length) {
        setError(`Could not geocode "${address}". Check API key.`);
        setLoading(false);
        return;
      }

      const { lat, lng } = geocodeData.results[0].geometry.location;
      const resolvedCity =
        geocodeData.results[0].address_components?.[0]?.long_name || city;
      setCityName(resolvedCity);

      // Step 2: Search multiple categories via Places API (New) Text Search
      // Step 2: More queries, more results across all categories
      const searchQueries = [
        `famous tourist attractions and landmarks in ${resolvedCity}`,
        `temples monuments historical places in ${resolvedCity}`,
        `best restaurants street food local cuisine in ${resolvedCity}`,
        `parks gardens nature spots in ${resolvedCity}`,
        `shopping malls markets bazaars in ${resolvedCity}`,
        `adventure sports activities fun places in ${resolvedCity}`,
      ];

      const allResults = [];

      await Promise.allSettled(
        searchQueries.map(async (q) => {
          try {
            const data = await placesNewSearch(q, lat, lng, API_KEY);
            console.log(
              `[Places New] query="${q}" count=${data.places?.length ?? 0}`,
            );
            if (data.places?.length) {
              allResults.push(...data.places);
            }
          } catch (e) {
            console.warn(`[Places New] failed for query="${q}":`, e.message);
          }
        }),
      );

      // Deduplicate by place id
      const seen = new Set();
      const unique = allResults.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      if (unique.length === 0) {
        setError(
          'No attractions found. Make sure "Places API (New)" is enabled in Google Cloud Console.',
        );
        setLoading(false);
        return;
      }

      // Sort by rating × log(reviews)
      unique.sort((a, b) => {
        const scoreA =
          (a.rating || 0) * Math.log10(Math.max(1, a.userRatingCount || 0));
        const scoreB =
          (b.rating || 0) * Math.log10(Math.max(1, b.userRatingCount || 0));
        return scoreB - scoreA;
      });

      // Step 3: Build attraction objects (top 9)
      const formatted = unique.slice(0, 18).map((place) => {
        const types = place.types || [];
        const photoUrl =
          getPhotoUrl(place.photos, API_KEY) || placeholderFor(types);

        const distKm = haversine(
          lat,
          lng,
          place.location.latitude,
          place.location.longitude,
        );

        return {
          id: place.id,
          name: place.displayName?.text || "Unknown",
          image: photoUrl,
          distance: `${distKm} km`,
          distanceNum: parseFloat(distKm),
          rating: place.rating || 0,
          totalRatings: place.userRatingCount || 0,
          types,
          category: categoryOf(types),
          address: place.formattedAddress || "",
          openNow: place.currentOpeningHours?.openNow,
          mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
          // ✅ Fixed: opens Google Maps with actual driving directions (not just destination pin)
          directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.displayName?.text || "")}&destination_place_id=${place.id}&travelmode=driving`,
          lat: place.location.latitude,
          lng: place.location.longitude,
          priceLevel: place.priceLevel,
        };
      });

      setAttractions(formatted);

      // Step 4: AI context in background
      setLoadingContext(true);
      const names = formatted.map((a) => a.name);
      const ctx = await generateAttractionContext(resolvedCity, names);
      setAiContext(ctx);
      setLoadingContext(false);

      cacheSet(city, { attractions: formatted, aiContext: ctx });
    } catch (err) {
      console.error("[AttractionsNearby]", err);
      setError("Failed to load attractions: " + err.message);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (targetLocation) fetchAttractions(targetLocation);
  }, [targetLocation, fetchAttractions]);

  // ── Filtered list ────────────────────────────────────────
  const filtered =
    activeCategory === "all"
      ? attractions
      : attractions.filter((a) => a.category === activeCategory);

  // ── Loading skeleton ─────────────────────────────────────
  if (loading) {
    return (
      <div className="dashboard-card trip-dashboard-full">
        <CardHeader
          cityName={cityName || targetLocation}
          count={null}
          loading
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "12px",
            padding: "4px 0",
          }}
        >
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="dashboard-card trip-dashboard-full">
        <CardHeader cityName={cityName || targetLocation} count={null} />
        <div style={{ textAlign: "center", padding: "32px 20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🗺️</div>
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "13px",
              marginBottom: "14px",
              fontFamily: "Quicksand, sans-serif",
            }}
          >
            {error}
          </p>
          <button
            onClick={() => fetchAttractions(targetLocation)}
            style={btnStyle}
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-card trip-dashboard-full">
      {/* Header */}
      <CardHeader
        cityName={cityName || targetLocation}
        count={filtered.length}
      />

      {/* City highlight from AI */}
      {aiContext?.cityHighlight && (
        <div
          style={{
            padding: "10px 14px",
            background:
              "linear-gradient(135deg, rgba(76,227,247,0.06), rgba(76,227,247,0.02))",
            border: "1px solid rgba(76,227,247,0.12)",
            borderRadius: "10px",
            marginBottom: "14px",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: "18px", flexShrink: 0 }}>✨</span>
          <div>
            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "12px",
                margin: 0,
                lineHeight: 1.5,
                fontFamily: "Quicksand, sans-serif",
              }}
            >
              {aiContext.cityHighlight}
            </p>
            {aiContext.mustTryFood?.length > 0 && (
              <p
                style={{
                  color: "#4ce3f7",
                  fontSize: "11px",
                  margin: "5px 0 0",
                  fontFamily: "Quicksand, sans-serif",
                }}
              >
                🍽️ Must try: {aiContext.mustTryFood.join(" · ")}
              </p>
            )}
            {aiContext.bestTime && (
              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "10px",
                  margin: "3px 0 0",
                  fontFamily: "Quicksand, sans-serif",
                }}
              >
                📅 Best time: {aiContext.bestTime}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "14px",
          flexWrap: "wrap",
        }}
      >
        {CATEGORIES.map((cat) => {
          const count =
            cat.id === "all"
              ? attractions.length
              : attractions.filter((a) => a.category === cat.id).length;
          if (cat.id !== "all" && count === 0) return null;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                padding: "5px 12px",
                borderRadius: "20px",
                border: `1px solid ${activeCategory === cat.id ? "rgba(76,227,247,0.4)" : "rgba(255,255,255,0.08)"}`,
                background:
                  activeCategory === cat.id
                    ? "rgba(76,227,247,0.12)"
                    : "transparent",
                color:
                  activeCategory === cat.id
                    ? "#4ce3f7"
                    : "rgba(255,255,255,0.4)",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "Quicksand, sans-serif",
                transition: "all 0.15s",
              }}
            >
              {cat.icon} {cat.label}
              <span style={{ marginLeft: "4px", opacity: 0.6 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px",
            color: "rgba(255,255,255,0.3)",
            fontSize: "13px",
            fontFamily: "Quicksand, sans-serif",
          }}
        >
          No {activeCategory} attractions found nearby.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: "12px",
          }}
        >
          {filtered.map((attr) => {
            const ctx = aiContext?.attractions?.[attr.name];
            const isExpanded = expandedId === attr.id;

            return (
              <AttractionCard
                key={attr.id}
                attr={attr}
                ctx={ctx}
                loadingContext={loadingContext}
                isExpanded={isExpanded}
                onToggleExpand={() =>
                  setExpandedId(isExpanded ? null : attr.id)
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AttractionCard ────────────────────────────────────────
function AttractionCard({
  attr,
  ctx,
  loadingContext,
  isExpanded,
  onToggleExpand,
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      style={{
        borderRadius: "14px",
        border: `1px solid ${isExpanded ? "rgba(76,227,247,0.2)" : "rgba(255,255,255,0.06)"}`,
        background: isExpanded
          ? "rgba(76,227,247,0.03)"
          : "rgba(255,255,255,0.02)",
        overflow: "hidden",
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      {/* Image */}
      <div
        style={{ position: "relative", height: "150px", overflow: "hidden" }}
      >
        <img
          src={imgError ? TYPE_IMAGES.default : attr.image}
          alt={attr.name}
          onError={() => setImgError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.4s",
          }}
        />

        {/* Overlay badges */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            display: "flex",
            gap: "5px",
          }}
        >
          <span
            style={{
              padding: "3px 8px",
              borderRadius: "8px",
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: "600",
              fontFamily: "Quicksand, sans-serif",
              textTransform: "capitalize",
            }}
          >
            {attr.category}
          </span>
        </div>

        {/* Open/closed */}
        {attr.openNow !== undefined && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              padding: "3px 8px",
              borderRadius: "8px",
              background: attr.openNow
                ? "rgba(34,197,94,0.85)"
                : "rgba(239,68,68,0.85)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: "700",
              fontFamily: "Quicksand, sans-serif",
            }}
          >
            {attr.openNow ? "● Open" : "● Closed"}
          </div>
        )}

        {/* Distance */}
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "8px",
            padding: "3px 8px",
            borderRadius: "8px",
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            color: "#fff",
            fontSize: "10px",
            fontFamily: "Quicksand, sans-serif",
          }}
        >
          📍 {attr.distance}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "12px" }}>
        <div
          style={{
            color: "#fff",
            fontSize: "13px",
            fontWeight: "700",
            marginBottom: "4px",
            lineHeight: 1.3,
            fontFamily: "Quicksand, sans-serif",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {attr.name}
        </div>

        {/* Rating */}
        {attr.rating > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginBottom: "6px",
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                style={{
                  fontSize: "10px",
                  color:
                    star <= Math.round(attr.rating)
                      ? "#fbbf24"
                      : "rgba(255,255,255,0.15)",
                }}
              >
                ★
              </span>
            ))}
            <span
              style={{
                color: "#fbbf24",
                fontSize: "11px",
                fontWeight: "700",
                fontFamily: "Quicksand, sans-serif",
              }}
            >
              {attr.rating.toFixed(1)}
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: "10px",
                fontFamily: "Quicksand, sans-serif",
              }}
            >
              ({attr.totalRatings?.toLocaleString("en-IN")})
            </span>
          </div>
        )}

        {/* AI speciality */}
        {loadingContext && !ctx && (
          <div
            style={{
              height: "28px",
              borderRadius: "4px",
              background: "rgba(255,255,255,0.04)",
              animation: "pulse 1.5s ease-in-out infinite",
              marginBottom: "8px",
            }}
          />
        )}

        {ctx?.speciality && (
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "11px",
              margin: "0 0 8px",
              lineHeight: 1.45,
              fontFamily: "Quicksand, sans-serif",
              display: "-webkit-box",
              WebkitLineClamp: isExpanded ? "none" : 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {ctx.speciality}
          </p>
        )}

        {/* Expanded: tip */}
        {isExpanded && ctx?.tip && (
          <div
            style={{
              padding: "8px 10px",
              background: "rgba(76,227,247,0.06)",
              border: "1px solid rgba(76,227,247,0.12)",
              borderRadius: "8px",
              marginBottom: "8px",
            }}
          >
            <p
              style={{
                color: "#4ce3f7",
                fontSize: "10px",
                margin: 0,
                fontFamily: "Quicksand, sans-serif",
                lineHeight: 1.5,
              }}
            >
              💡 {ctx.tip}
            </p>
          </div>
        )}

        {/* Address */}
        {attr.address && (
          <p
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: "10px",
              margin: "0 0 8px",
              fontFamily: "Quicksand, sans-serif",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            📌 {attr.address}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
          <a
            href={attr.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(120deg, #0400ff, #4ce3f7)",
              color: "#fff",
              fontSize: "11px",
              fontWeight: "700",
              textAlign: "center",
              textDecoration: "none",
              fontFamily: "Quicksand, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            🧭 Route
          </a>

          <a
            href={attr.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "7px 10px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.5)",
              fontSize: "11px",
              textDecoration: "none",
              fontFamily: "Quicksand, sans-serif",
              display: "flex",
              alignItems: "center",
            }}
          >
            🗺️
          </a>

          {ctx && (
            <button
              onClick={onToggleExpand}
              style={{
                padding: "7px 10px",
                borderRadius: "8px",
                border: "1px solid rgba(76,227,247,0.15)",
                background: isExpanded
                  ? "rgba(76,227,247,0.1)"
                  : "rgba(255,255,255,0.03)",
                color: isExpanded ? "#4ce3f7" : "rgba(255,255,255,0.4)",
                fontSize: "11px",
                cursor: "pointer",
                fontFamily: "Quicksand, sans-serif",
              }}
            >
              {isExpanded ? "▲" : "▼"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────
function CardHeader({ cityName, count, loading }) {
  return (
    <div className="dashboard-card-header" style={{ marginBottom: "14px" }}>
      <span className="icon">🏛️</span>
      <h3>{cityName ? `Explore ${cityName}` : "Nearby Attractions"}</h3>
      {loading && (
        <>
          <style>{`@keyframes an-spin { to { transform: rotate(360deg); } }`}</style>
          <div
            style={{
              marginLeft: "8px",
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              border: "2px solid rgba(76,227,247,0.2)",
              borderTopColor: "#4ce3f7",
              animation: "an-spin 0.7s linear infinite",
              flexShrink: 0,
            }}
          />
        </>
      )}
      {count !== null && !loading && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: "10px",
            color: "rgba(255,255,255,0.35)",
            fontFamily: "Quicksand, sans-serif",
          }}
        >
          {count} places
        </span>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <>
      <style>{`@keyframes sk-pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }`}</style>
      <div
        style={{
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.05)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "150px",
            background: "rgba(255,255,255,0.04)",
            animation: "sk-pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              height: "14px",
              borderRadius: "4px",
              background: "rgba(255,255,255,0.06)",
              animation: "sk-pulse 1.5s ease-in-out infinite",
              width: "75%",
            }}
          />
          <div
            style={{
              height: "10px",
              borderRadius: "4px",
              background: "rgba(255,255,255,0.04)",
              animation: "sk-pulse 1.5s ease-in-out infinite",
              width: "50%",
            }}
          />
          <div
            style={{
              height: "28px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.04)",
              animation: "sk-pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </>
  );
}

const btnStyle = {
  padding: "8px 20px",
  borderRadius: "8px",
  border: "1px solid rgba(76,227,247,0.2)",
  background: "rgba(76,227,247,0.06)",
  color: "#4ce3f7",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "Quicksand, sans-serif",
};
