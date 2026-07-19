/**
 * Weather Service
 * Real weather data from OpenWeather API with mock fallback
 */

import { API_KEYS } from './apiConfig';

// ── Weather Emoji Mapping ──────────────────────────────────
function getWeatherEmoji(weatherId) {
  if (weatherId >= 200 && weatherId < 300) return '⛈️'; // Thunderstorm
  if (weatherId >= 300 && weatherId < 400) return '🌧️'; // Drizzle
  if (weatherId >= 500 && weatherId < 511) return '🌧️'; // Rain
  if (weatherId === 511) return '🌨️'; // Freezing rain
  if (weatherId >= 520 && weatherId < 600) return '🌦️'; // Shower rain
  if (weatherId >= 600 && weatherId < 700) return '❄️'; // Snow
  if (weatherId === 701) return '🌫️'; // Mist
  if (weatherId === 711) return '💨'; // Smoke
  if (weatherId === 721) return '🌫️'; // Haze
  if (weatherId >= 741 && weatherId < 800) return '🌫️'; // Fog
  if (weatherId === 800) return '☀️'; // Clear sky
  if (weatherId === 801) return '🌤️'; // Few clouds
  if (weatherId === 802) return '⛅'; // Scattered clouds
  if (weatherId >= 803) return '☁️'; // Broken/overcast clouds
  return '🌤️'; // Default
}

// ── Wind Direction ─────────────────────────────────────────
function getWindDirection(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// ── Fetch Real Weather Data ─────────────────────────────────
export async function fetchWeatherData(cityName) {
  const API_KEY = API_KEYS.OPENWEATHER;

  // If no API key configured, use mock data
  if (!API_KEY) {
    console.warn('⚠️ OpenWeather API key not configured, using mock data');
    return getMockWeather(cityName);
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      tempMin: Math.round(data.main.temp_min),
      tempMax: Math.round(data.main.temp_max),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon: getWeatherEmoji(data.weather[0].id),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: `${(data.wind.speed * 3.6).toFixed(1)} km/h`,
      windDirection: getWindDirection(data.wind.deg || 0),
      visibility: data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : 'N/A',
      cloudiness: `${data.clouds.all}%`,
      sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      isReal: true,
      alerts: [],
    };
  } catch (error) {
    console.error('Weather API failed, using mock data:', error.message);
    return getMockWeather(cityName);
  }
}

// ── Fetch Weather by Coordinates ────────────────────────────
export async function fetchWeatherByCoords(lat, lng) {
  const API_KEY = API_KEYS.OPENWEATHER;

  if (!API_KEY) {
    return getMockWeather('Current Location');
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${API_KEY}&units=metric`
    );

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      tempMin: Math.round(data.main.temp_min),
      tempMax: Math.round(data.main.temp_max),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon: getWeatherEmoji(data.weather[0].id),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: `${(data.wind.speed * 3.6).toFixed(1)} km/h`,
      windDirection: getWindDirection(data.wind.deg || 0),
      visibility: data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : 'N/A',
      cloudiness: `${data.clouds.all}%`,
      sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      cityName: data.name,
      isReal: true,
      alerts: [],
    };
  } catch (error) {
    console.error('Weather by coords failed:', error.message);
    return getMockWeather('Current Location');
  }
}

// ── Fetch Weather Alerts ────────────────────────────────────
export async function fetchWeatherAlerts(lat, lng) {
  const API_KEY = API_KEYS.OPENWEATHER;

  if (!API_KEY) return [];

  try {
    // OpenWeather OneCall API for alerts (requires paid plan)
    // For free tier, we'll return empty array
    // const response = await fetch(
    //   `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&appid=${API_KEY}`
    // );
    // const data = await response.json();
    // return data.alerts || [];
    return [];
  } catch (error) {
    return [];
  }
}

// ── Mock Weather (Fallback) ─────────────────────────────────
function getMockWeather(cityName) {
  const conditions = [
    { condition: 'Clear Sky', icon: '☀️', temp: 32, humidity: 55, wind: '12 km/h' },
    { condition: 'Partly Cloudy', icon: '⛅', temp: 30, humidity: 60, wind: '15 km/h' },
    { condition: 'Light Rain', icon: '🌦️', temp: 27, humidity: 75, wind: '10 km/h' },
    { condition: 'Cloudy', icon: '☁️', temp: 28, humidity: 65, wind: '8 km/h' },
  ];
  
  const random = conditions[Math.floor(Math.random() * conditions.length)];
  
  return {
    temp: random.temp,
    feelsLike: random.temp - 2,
    tempMin: random.temp - 3,
    tempMax: random.temp + 2,
    condition: random.condition,
    description: random.condition.toLowerCase(),
    icon: random.icon,
    humidity: random.humidity,
    pressure: 1013,
    windSpeed: random.wind,
    windDirection: 'SW',
    visibility: '8 km',
    cloudiness: '40%',
    sunrise: '06:15 AM',
    sunset: '06:45 PM',
    isReal: false,
    alerts: [],
    cityName: cityName,
  };
}