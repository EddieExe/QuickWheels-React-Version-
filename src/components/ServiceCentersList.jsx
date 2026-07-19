import { useState, useEffect, useRef } from 'react';
import { API_KEYS } from '../utils/apiConfig';

const PLACES_API = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.location', 'places.rating', 'places.userRatingCount',
  'places.currentOpeningHours', 'places.regularOpeningHours',
  'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
  'places.websiteUri', 'places.primaryType', 'places.types',
  'places.photos', 'places.businessStatus',
].join(',');

// ─── API helpers ────────────────────────────────────────────────────────────

async function searchPlaces(query, lat, lng, apiKey, radius = 15000) {
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

function inferServices(primaryType, types = []) {
  const map = {
    car_repair:          'Car Repair',
    car_wash:            'Car Wash',
    car_dealer:          'Car Dealer',
    auto_parts_store:    'Parts Store',
    gas_station:         'Fuel Available',
    tire_shop:           'Tyre Service',
    oil_change_service:  'Oil Change',
    auto_body_shop:      'Body Work',
    auto_glass_repair:   'Glass Repair',
    auto_body_shop:      'Body Work',
    electric_vehicle_charging_station: '⚡ EV Charging',
  };
  const s = new Set();
  if (primaryType && map[primaryType]) s.add(map[primaryType]);
  types.forEach(t => { if (map[t]) s.add(map[t]); });
  return s.size ? [...s] : ['General Service', 'Repairs', 'Diagnostics'];
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

// ✅ FIX: Build directions URL that routes FROM user's actual GPS position
function buildDirectionsUrl(destLat, destLng, destPlaceId, userLat, userLng) {
  if (userLat && userLng) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}&destination_place_id=${destPlaceId}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&destination_place_id=${destPlaceId}&travelmode=driving`;
}

function formatCenter(place, searchLat, searchLng, userLat, userLng, apiKey) {
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const dist = parseFloat(haversine(searchLat, searchLng, lat, lng));
  const photoName = place.photos?.[0]?.name;
  return {
    id:             place.id,
    name:           place.displayName?.text || 'Service Center',
    address:        place.formattedAddress || '',
    rating:         place.rating || 0,
    totalRatings:   place.userRatingCount || 0,
    open:           place.currentOpeningHours?.openNow ?? null,
    openingHours:   place.regularOpeningHours?.weekdayDescriptions || [],
    phone:          place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    website:        place.websiteUri || null,
    businessStatus: place.businessStatus || 'OPERATIONAL',
    lat, lng, dist,
    services:       inferServices(place.primaryType, place.types || []),
    photoUrl:       photoName
      ? `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&key=${apiKey}`
      : null,
    // ✅ FIX: GPS-aware directions URL
    directionsUrl:  buildDirectionsUrl(lat, lng, place.id, userLat, userLng),
    mapsUrl:        `https://www.google.com/maps/place/?q=place_id:${place.id}`,
  };
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ServiceCentersList({ pickup, dropoff, onSelectCenter }) {
  const [centers,     setCenters]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [filter,      setFilter]      = useState('all');
  const [expanded,    setExpanded]    = useState(null);  // id of expanded card
  const [sourceLabel, setSourceLabel] = useState('');
  const [userCoords,  setUserCoords]  = useState(null);
  const containerRef = useRef(null);

  useEffect(() => { load(); }, [pickup, dropoff]);

  // ✅ FIX: Click outside collapses any open card
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
    setLoading(true); setError(null); setCenters([]); setExpanded(null);
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
          setError('Enable location access to find nearby service centers.');
          setLoading(false); return;
        }
      }

      const queries = [
        'car repair service centre garage',
        'automobile workshop car service',
        'multi brand car service centre',
        'authorised car service dealer',
      ];

      const all = [];
      await Promise.allSettled(queries.map(async q => {
        const data = await searchPlaces(q, searchLat, searchLng, apiKey, 15000);
        if (data.places?.length) all.push(...data.places);
      }));

      const seen = new Set();
      const unique = all.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id); return true;
      });

      if (!unique.length) { setError('No service centers found nearby.'); setLoading(false); return; }

      const formatted = unique
        .map(p => formatCenter(p, searchLat, searchLng, uLat, uLng, apiKey))
        .filter(c => c.businessStatus !== 'CLOSED_PERMANENTLY')
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 10);

      setCenters(formatted);
    } catch (err) {
      console.error('[ServiceCenters]', err);
      setError(`Failed to load: ${err.message}`);
    }
    setLoading(false);
  }

  const filtered = [...centers]
    .filter(c => filter === 'open' ? c.open === true : true)
    .sort((a, b) => filter === 'rating' ? b.rating - a.rating : a.dist - b.dist);

  if (loading) return (
    <div style={{ padding: '24px', textAlign: 'center' }}>
      <Spinner />
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '10px', fontFamily: 'Quicksand,sans-serif' }}>
        Locating service centers…
      </p>
    </div>
  );

  if (error) return (
    <div style={{ padding: '16px', textAlign: 'center' }}>
      <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px', fontFamily: 'Quicksand,sans-serif' }}>⚠️ {error}</p>
      <button onClick={load} style={retryBtn}>🔄 Retry</button>
    </div>
  );

  if (!centers.length) return (
    <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
      No service centers found.
    </div>
  );

  return (
    <div ref={containerRef}>
      {/* Source label + GPS indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: 0, fontFamily: 'Quicksand,sans-serif' }}>
          📍 {sourceLabel} · {centers.length} centers found
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
          { key: 'all',    label: `All (${centers.length})` },
          { key: 'open',   label: '🟢 Open Now' },
          { key: 'rating', label: '⭐ Top Rated' },
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

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', maxHeight: '400px', overflowY: 'auto', padding: '4px' }}>
        {filtered.map(center => {
          const isExp = expanded === center.id;
          return (
            <div
              key={center.id}
              onClick={() => setExpanded(isExp ? null : center.id)}
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
              {center.photoUrl && (
                <div style={{ height: '80px', overflow: 'hidden' }}>
                  <img src={center.photoUrl} alt={center.name}
                    onError={e => e.target.parentElement.style.display = 'none'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              <div style={{ padding: '12px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Quicksand,sans-serif' }}>
                      🔧 {center.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Quicksand,sans-serif' }}>
                      📌 {center.address}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '1px', fontFamily: 'Quicksand,sans-serif' }}>
                      📍 {center.dist} km away
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {center.rating > 0 && (
                      <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '700', fontFamily: 'Quicksand,sans-serif' }}>
                        ★ {center.rating.toFixed(1)}
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: '400', fontSize: '10px' }}> ({center.totalRatings})</span>
                      </div>
                    )}
                    {center.open !== null && (
                      <div style={{ fontSize: '10px', color: center.open ? '#22c55e' : '#ef4444', fontWeight: '600', marginTop: '2px', fontFamily: 'Quicksand,sans-serif' }}>
                        {center.open ? '● Open' : '● Closed'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Service tags */}
                {center.services.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {center.services.slice(0, 4).map(s => (
                      <span key={s} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', padding: '2px 7px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', fontFamily: 'Quicksand,sans-serif' }}>{s}</span>
                    ))}
                  </div>
                )}

                {/* ── Expanded panel ────────────────────────────────── */}
                {isExp && (
                  <div
                    style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
                    onClick={e => e.stopPropagation()}  // prevent collapse when clicking inside
                  >
                    {/* Opening hours */}
                    {center.openingHours.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px', fontFamily: 'Quicksand,sans-serif', fontWeight: '700' }}>🕐 Opening Hours</p>
                        {center.openingHours.map((h, i) => (
                          <p key={i} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '2px 0', fontFamily: 'Quicksand,sans-serif' }}>{h}</p>
                        ))}
                      </div>
                    )}

                    {/* Phone */}
                    {center.phone && (
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', fontFamily: 'Quicksand,sans-serif' }}>
                        📞 {center.phone}
                      </div>
                    )}

                    {/* Website */}
                    {center.website && (
                      <div style={{ fontSize: '11px', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        🌐 <a href={center.website} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#4ce3f7', textDecoration: 'none', fontFamily: 'Quicksand,sans-serif' }}>
                          {center.website.replace(/^https?:\/\//, '').split('/')[0]}
                        </a>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {/* ✅ FIX: Route button uses GPS-aware directions URL */}
                      <a href={center.directionsUrl} target="_blank" rel="noopener noreferrer"
                        title={userCoords ? 'Navigate from your current location' : 'Open in Google Maps'}
                        style={actionBtn('#4ce3f7')}>🧭 Route</a>
                      {center.phone && (
                        <a href={`tel:${center.phone}`} style={actionBtn('#22c55e')}>📞 Call</a>
                      )}
                      <a href={center.mapsUrl} target="_blank" rel="noopener noreferrer"
                        style={actionBtn('rgba(255,255,255,0.4)')}>🗺️ Maps</a>
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

function Spinner() {
  return (
    <>
      <style>{`@keyframes sc-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(76,227,247,0.2)', borderTopColor: '#4ce3f7', animation: 'sc-spin 0.8s linear infinite', margin: '0 auto' }} />
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