import { useState, useEffect, useRef, useCallback } from 'react';
import { API_KEYS } from '../utils/apiConfig';

const PLACES_API = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.location', 'places.rating', 'places.userRatingCount',
  'places.currentOpeningHours', 'places.types', 'places.photos',
  'places.nationalPhoneNumber', 'places.regularOpeningHours',
  'places.priceLevel', 'places.businessStatus',
].join(',');

// ─── API helpers ────────────────────────────────────────────────────────────

async function searchPlaces(query, lat, lng, apiKey, radius = 8000) {
  const res = await fetch(PLACES_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius } },
      maxResultCount: 10,
      languageCode: 'en',
    }),
  });
  if (!res.ok) throw new Error(`Places API ${res.status}: ${await res.text()}`);
  return res.json();
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

function estimateFuelPrices(address = '') {
  const a = address.toLowerCase();
  if (a.includes('goa'))                                    return { petrol: 102.5, diesel: 90.1 };
  if (a.includes('delhi'))                                  return { petrol: 96.7,  diesel: 89.6 };
  if (a.includes('karnataka') || a.includes('bangalore'))  return { petrol: 101.9, diesel: 87.9 };
  if (a.includes('tamil')    || a.includes('chennai'))     return { petrol: 102.6, diesel: 94.3 };
  if (a.includes('hyderabad')|| a.includes('telangana'))   return { petrol: 109.6, diesel: 97.2 };
  if (a.includes('kolkata')  || a.includes('bengal'))      return { petrol: 106.0, diesel: 92.8 };
  if (a.includes('rajasthan')|| a.includes('jaipur'))      return { petrol: 108.5, diesel: 93.7 };
  if (a.includes('gujarat')  || a.includes('ahmedabad'))   return { petrol: 96.6,  diesel: 92.4 };
  if (a.includes('punjab')   || a.includes('chandigarh'))  return { petrol: 99.5,  diesel: 86.7 };
  if (a.includes('maharashtra') || a.includes('mumbai') || a.includes('pune') || a.includes('nashik'))
                                                            return { petrol: 104.2, diesel: 90.3 };
  return { petrol: 104.5, diesel: 89.7 };
}

function extractAmenities(types = []) {
  const map = {
    restaurant: '🍽️ Food', cafe: '☕ Café', car_wash: '🚿 Car Wash',
    convenience_store: '🏪 Store', atm: '🏧 ATM', electric_vehicle_charging_station: '⚡ EV Charging',
  };
  return types.filter(t => map[t]).map(t => map[t]).slice(0, 4);
}

function inferBrand(name = '') {
  const n = name.toLowerCase();
  if (n.includes('hp') || n.includes('hindustan petroleum')) return { label: 'HP', color: '#0047AB' };
  if (n.includes('indian oil') || n.includes('iocl'))        return { label: 'IOC', color: '#F97316' };
  if (n.includes('bpcl') || n.includes('bharat'))            return { label: 'BPCL', color: '#1D4ED8' };
  if (n.includes('shell'))                                    return { label: 'Shell', color: '#EAB308' };
  if (n.includes('essar') || n.includes('nayara'))           return { label: 'Nayara', color: '#7C3AED' };
  if (n.includes('reliance'))                                 return { label: 'RIL', color: '#16A34A' };
  return null;
}

async function geocodeREST(address, apiKey) {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
  );
  const data = await res.json();
  if (!data.results?.length) throw new Error('Geocode failed');
  return data.results[0].geometry.location;
}

async function getUserGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('No geolocation')); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      err => reject(err),
      { timeout: 8000, maximumAge: 30000 }
    );
  });
}

// Build a Google Maps directions URL that uses the user's current GPS location as origin
function buildDirectionsUrl(destLat, destLng, destPlaceId, userLat, userLng) {
  if (userLat && userLng) {
    // origin=lat,lng ensures Maps opens navigation FROM the user's actual current position
    return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}&destination_place_id=${destPlaceId}&travelmode=driving`;
  }
  // Fallback: let Maps auto-detect origin
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&destination_place_id=${destPlaceId}&travelmode=driving`;
}

function formatStation(place, searchLat, searchLng, userLat, userLng, apiKey) {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const dist = parseFloat(haversine(searchLat, searchLng, lat, lng));
  const photoName = place.photos?.[0]?.name;
  const name = place.displayName?.text || 'Fuel Station';
  return {
    id:            place.id,
    name,
    address:       place.formattedAddress || '',
    rating:        place.rating || 0,
    totalRatings:  place.userRatingCount || 0,
    open:          place.currentOpeningHours?.openNow ?? null,
    openingHours:  place.regularOpeningHours?.weekdayDescriptions || [],
    phone:         place.nationalPhoneNumber || null,
    businessStatus: place.businessStatus || 'OPERATIONAL',
    lat, lng, dist,
    brand:         inferBrand(name),
    prices:        estimateFuelPrices(place.formattedAddress || ''),
    amenities:     extractAmenities(place.types || []),
    photoUrl:      photoName
      ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${apiKey}`
      : null,
    // ✅ FIX: pass user's GPS coords so the route starts from their real location
    directionsUrl: buildDirectionsUrl(lat, lng, place.id, userLat, userLng),
    mapsUrl:       `https://www.google.com/maps/place/?q=place_id:${place.id}`,
  };
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function FuelStationsList({ pickup, dropoff, onSelectStation }) {
  const [stations,    setStations]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [filter,      setFilter]      = useState('all');
  const [sourceLabel, setSourceLabel] = useState('');
  const [userCoords,  setUserCoords]  = useState(null);   // store GPS for route URLs
  const [expanded,    setExpanded]    = useState(null);   // expanded card id
  const containerRef = useRef(null);

  useEffect(() => { load(); }, [pickup, dropoff]);

  // ✅ FIX: Click-outside collapses expanded card
  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpanded(null);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  async function load() {
    setLoading(true); setError(null); setStations([]); setExpanded(null);
    const apiKey = API_KEYS.GOOGLE_MAPS;
    if (!apiKey) { setError('API key not configured.'); setLoading(false); return; }

    try {
      let searchLat, searchLng, uLat, uLng;
      try {
        const gps = await getUserGPS();
        searchLat = gps.lat; searchLng = gps.lng;
        uLat = gps.lat;      uLng = gps.lng;
        setUserCoords({ lat: gps.lat, lng: gps.lng });
        setSourceLabel('near your location');
      } catch {
        if (pickup) {
          const loc = await geocodeREST(pickup, apiKey);
          searchLat = loc.lat; searchLng = loc.lng;
          setSourceLabel(`near ${pickup.split(',')[0]}`);
        } else {
          setError('Enable location access to find nearby fuel stations.');
          setLoading(false); return;
        }
      }

      const queries = [
        'petrol pump fuel station',
        'HP Indian Oil BPCL Shell petrol pump',
        'CNG station gas station',
      ];

      const all = [];
      await Promise.allSettled(queries.map(async q => {
        const data = await searchPlaces(q, searchLat, searchLng, apiKey, 10000);
        if (data.places?.length) all.push(...data.places);
      }));

      const seen = new Set();
      const unique = all.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id); return true;
      });

      if (!unique.length) { setError('No fuel stations found nearby.'); setLoading(false); return; }

      const formatted = unique
        .map(p => formatStation(p, searchLat, searchLng, uLat, uLng, apiKey))
        .filter(s => s.businessStatus !== 'CLOSED_PERMANENTLY')
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 12);

      setStations(formatted);
    } catch (err) {
      console.error('[FuelStations]', err);
      setError(`Failed to load: ${err.message}`);
    }
    setLoading(false);
  }

  const filtered = [...stations]
    .filter(s => filter === 'open' ? s.open === true : true)
    .sort((a, b) => filter === 'cheapest' ? a.prices.petrol - b.prices.petrol : a.dist - b.dist);

  if (loading) return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <Spinner />
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '10px', fontFamily: 'Quicksand,sans-serif' }}>
        Locating fuel stations…
      </p>
    </div>
  );

  if (error) return (
    <div style={{ padding: '16px', textAlign: 'center' }}>
      <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px', fontFamily: 'Quicksand,sans-serif' }}>⚠️ {error}</p>
      <button onClick={load} style={retryBtn}>🔄 Retry</button>
    </div>
  );

  if (!stations.length) return (
    <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
      No fuel stations found.
    </div>
  );

  return (
    <div ref={containerRef}>
      {/* Source label + GPS indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: 0, fontFamily: 'Quicksand,sans-serif' }}>
          📍 {sourceLabel} · {stations.length} stations found
        </p>
        {userCoords && (
          <span style={{ fontSize: '10px', color: '#22c55e', fontFamily: 'Quicksand,sans-serif' }}>
            ✅ GPS active — routes start from you
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { key: 'all',      label: `All (${stations.length})` },
          { key: 'open',     label: '🟢 Open Now' },
          { key: 'cheapest', label: '💰 Cheapest' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '4px 12px', borderRadius: '20px', cursor: 'pointer',
            border: filter === key ? '1px solid rgba(76,227,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
            background: filter === key ? 'rgba(76,227,247,0.12)' : 'rgba(255,255,255,0.03)',
            color: filter === key ? '#4ce3f7' : 'rgba(255,255,255,0.5)',
            fontSize: '11px', fontWeight: '600', fontFamily: 'Quicksand,sans-serif',
            transition: 'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {/* Station list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', maxHeight: '400px', overflowY: 'auto', padding: '4px' }}>
        {filtered.map(station => {
          const isExp = expanded === station.id;
          return (
            <div
              key={station.id}
              onClick={() => setExpanded(isExp ? null : station.id)}
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                background: isExp ? 'rgba(76,227,247,0.05)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isExp ? 'rgba(76,227,247,0.25)' : 'rgba(255,255,255,0.07)'}`,
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            >
              {/* Photo */}
              {station.photoUrl && (
                <div style={{ height: '70px', overflow: 'hidden' }}>
                  <img src={station.photoUrl} alt={station.name}
                    onError={e => e.target.parentElement.style.display = 'none'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <div style={{ padding: '10px 12px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', color: '#fff', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px', fontFamily: 'Quicksand,sans-serif' }}>
                        ⛽ {station.name}
                      </span>
                      {station.brand && (
                        <span style={{ padding: '1px 6px', borderRadius: '4px', background: station.brand.color + '22', border: `1px solid ${station.brand.color}44`, color: station.brand.color, fontSize: '9px', fontWeight: '800', fontFamily: 'Quicksand,sans-serif', flexShrink: 0 }}>
                          {station.brand.label}
                        </span>
                      )}
                      {station.open !== null && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: station.open ? '#22c55e' : '#ef4444' }} />
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Quicksand,sans-serif' }}>
                      📌 {station.address}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '1px', fontFamily: 'Quicksand,sans-serif' }}>
                      📍 {station.dist} km away{station.rating > 0 ? ` · ★ ${station.rating.toFixed(1)} (${station.totalRatings})` : ''}
                    </div>
                  </div>

                  {/* ✅ FIX: Route button now opens Maps navigation FROM user's current GPS location */}
                  <a
                    href={station.directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    title={userCoords ? 'Navigate from your current location' : 'Open in Google Maps'}
                    style={{ marginLeft: '8px', padding: '7px 11px', borderRadius: '8px', flexShrink: 0, background: 'linear-gradient(120deg,#0400ff,#4ce3f7)', color: '#fff', fontSize: '10px', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: 'Quicksand,sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🧭 Route
                  </a>
                </div>

                {/* Fuel prices */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <PriceTag label="Petrol" value={`₹${station.prices.petrol}/L`} />
                  <PriceTag label="Diesel" value={`₹${station.prices.diesel}/L`} />
                  <PriceTag label="Open" value={station.open === true ? '✅ Yes' : station.open === false ? '❌ No' : '—'} color={station.open ? '#22c55e' : station.open === false ? '#ef4444' : undefined} />
                </div>

                {/* Amenities */}
                {station.amenities.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {station.amenities.map(a => (
                      <span key={a} style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Quicksand,sans-serif' }}>{a}</span>
                    ))}
                  </div>
                )}

                {/* ── Expanded panel ────────────────────────────────── */}
                {isExp && (
                  <div
                    style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    onClick={e => e.stopPropagation()}   // prevent collapse when interacting inside
                  >
                    {/* Opening hours */}
                    {station.openingHours.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px', fontFamily: 'Quicksand,sans-serif', fontWeight: '700' }}>🕐 Hours this week</p>
                        {station.openingHours.map((h, i) => (
                          <p key={i} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '2px 0', fontFamily: 'Quicksand,sans-serif' }}>{h}</p>
                        ))}
                      </div>
                    )}

                    {/* Phone */}
                    {station.phone && (
                      <div style={{ marginBottom: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Quicksand,sans-serif' }}>
                        📞 {station.phone}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {/* ✅ FIX: Route button inside expanded panel also uses GPS-based URL */}
                      <a href={station.directionsUrl} target="_blank" rel="noopener noreferrer"
                        style={actionBtn('#4ce3f7')}>🧭 Navigate Here</a>
                      {station.phone && (
                        <a href={`tel:${station.phone}`} style={actionBtn('#22c55e')}>📞 Call</a>
                      )}
                      <a href={station.mapsUrl} target="_blank" rel="noopener noreferrer"
                        style={actionBtn('rgba(255,255,255,0.4)')}>🗺️ View on Maps</a>
                    </div>

                    {!userCoords && (
                      <p style={{ fontSize: '10px', color: 'rgba(255,200,0,0.6)', marginTop: '8px', fontFamily: 'Quicksand,sans-serif' }}>
                        💡 Allow location access for turn-by-turn navigation from your position.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PriceTag({ label, value, color }) {
  return (
    <div style={{ fontSize: '11px', fontFamily: 'Quicksand,sans-serif' }}>
      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}: </span>
      <span style={{ color: color || '#4ce3f7', fontWeight: '700' }}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes fs-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(76,227,247,0.2)', borderTopColor: '#4ce3f7', animation: 'fs-spin 0.8s linear infinite', margin: '0 auto' }} />
    </>
  );
}

const retryBtn = {
  padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(76,227,247,0.25)',
  background: 'rgba(76,227,247,0.07)', color: '#4ce3f7', fontSize: '12px',
  fontWeight: '600', cursor: 'pointer', fontFamily: 'Quicksand,sans-serif',
};

const actionBtn = color => ({
  display: 'inline-block', padding: '7px 14px',
  background: `${color}18`, border: `1px solid ${color}35`,
  borderRadius: '8px', color, fontSize: '11px', fontWeight: '700',
  textDecoration: 'none', fontFamily: 'Quicksand,sans-serif', cursor: 'pointer',
});