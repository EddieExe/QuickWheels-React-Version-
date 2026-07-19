import { useState, useEffect, useRef } from 'react';
import { getGoogleMapsKey } from '../utils/apiConfig';

export default function MapTest() {
  const mapRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [map, setMap] = useState(null);

  useEffect(() => {
    const API_KEY = getGoogleMapsKey();
    
    if (!API_KEY) {
      setStatus('no-key');
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google) {
      initMap();
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => {
      setStatus('loaded');
      initMap();
    };
    script.onerror = () => {
      setStatus('error');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
    };
  }, []);

  function initMap() {
    if (!mapRef.current) return;
    
    const googleMap = new window.google.maps.Map(mapRef.current, {
      center: { lat: 19.0760, lng: 72.8777 }, // Mumbai
      zoom: 12,
      styles: [
        {
          "elementType": "geometry",
          "stylers": [{ "color": "#242f3e" }]
        },
        {
          "elementType": "labels.text.stroke",
          "stylers": [{ "color": "#242f3e" }]
        },
        {
          "elementType": "labels.text.fill",
          "stylers": [{ "color": "#746855" }]
        },
        {
          "featureType": "road",
          "elementType": "geometry",
          "stylers": [{ "color": "#38414e" }]
        },
        {
          "featureType": "water",
          "elementType": "geometry",
          "stylers": [{ "color": "#17263c" }]
        }
      ],
    });

    // Add a marker
    new window.google.maps.Marker({
      position: { lat: 19.0760, lng: 72.8777 },
      map: googleMap,
      title: 'Mumbai',
    });

    setMap(googleMap);
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a1a', 
      padding: '20px',
      fontFamily: 'Quicksand, sans-serif',
      color: '#fff'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#4ce3f7' }}>🗺️ Google Maps API Test</h1>
        
        {status === 'loading' && (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center',
            color: 'rgba(255,255,255,0.5)' 
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              border: '2px solid rgba(76,227,247,0.2)',
              borderTopColor: '#4ce3f7',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px'
            }} />
            Loading Google Maps...
          </div>
        )}

        {status === 'no-key' && (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center',
            color: '#ef4444',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '12px'
          }}>
            ❌ No API key found. Add VITE_GOOGLE_MAPS_API_KEY to your .env file.
          </div>
        )}

        {status === 'error' && (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center',
            color: '#f59e0b',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '12px'
          }}>
            ⚠️ Failed to load Google Maps. Check your API key and restrictions.
          </div>
        )}

        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: '400px',
            borderRadius: '16px',
            border: '1px solid rgba(76,227,247,0.2)',
            marginTop: '20px',
          }}
        />

        {status === 'loaded' && (
          <div style={{ 
            marginTop: '12px',
            padding: '12px 16px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: '10px',
            color: '#22c55e',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            ✅ Google Maps API Key is working!
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}