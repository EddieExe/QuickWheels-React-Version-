/**
 * API Configuration
 * Central place for all API keys
 */

export const API_KEYS = {
  GOOGLE_MAPS: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  OPENWEATHER: import.meta.env.VITE_OPENWEATHER_API_KEY || '',
  TOLLGURU: import.meta.env.VITE_TOLLGURU_API_KEY || '',
};

export function isGoogleMapsConfigured() {
  return !!API_KEYS.GOOGLE_MAPS;
}

export function isOpenWeatherConfigured() {
  return !!API_KEYS.OPENWEATHER;
}

export function getGoogleMapsKey() {
  return API_KEYS.GOOGLE_MAPS;
}

export function getOpenWeatherKey() {
  return API_KEYS.OPENWEATHER;
}