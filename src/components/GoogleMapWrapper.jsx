import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../utils/googleMapsLoader';

/**
 * GoogleMapWrapper
 * Loads the Google Maps JS SDK once and gates children behind it.
 * All map components must be rendered inside this wrapper.
 */
export default function GoogleMapWrapper({ children }) {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  if (loadError) {
    console.error('Google Maps load error:', loadError);
    return (
      <div style={{
        padding: '20px', textAlign: 'center',
        color: '#ef4444', fontSize: '13px', lineHeight: '1.5',
      }}>
        ❌ Failed to load Google Maps.
        <br />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
          Check your API key and domain restrictions in Google Cloud Console.
        </span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{
        padding: '30px', textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          border: '2px solid rgba(76,227,247,0.2)', borderTopColor: '#4ce3f7',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 10px',
        }} />
        <span style={{ fontSize: '12px' }}>Loading map...</span>
      </div>
    );
  }

  // Guard against null/undefined children
  if (!children) return null;

  return children;
}