import { API_KEYS } from './apiConfig';

// Must be a stable reference — a fresh array on every render makes
// @react-google-maps/api believe the options changed and reload the script.
const LIBRARIES = ['places', 'geometry'];

/**
 * Shared loader options. Every caller of useJsApiLoader / useLoadScript must
 * pass this exact object so the SDK is requested once for the whole app.
 */
export const GOOGLE_MAPS_LOADER_OPTIONS = {
  id: 'quickwheels-google-maps',
  googleMapsApiKey: API_KEYS.GOOGLE_MAPS || '',
  libraries: LIBRARIES,
};
