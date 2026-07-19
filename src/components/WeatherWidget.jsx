/**
 * WeatherWidget.jsx — Production Grade
 *
 * Fixes:
 * - Auto-refresh every 10 minutes (weather data stays current during active trip)
 * - Alert coords use data.lat/data.lng only when actually present — no hardcoded
 *   Mumbai fallback for non-Mumbai cities
 * - Temperature range bar guards against tempMax === tempMin (division by zero)
 * - Cleanup of interval on unmount / location change
 * - Retry button on error state
 * - Stale data indicator if last fetch was >15 minutes ago
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWeatherData, fetchWeatherAlerts } from '../utils/weatherService';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const STALE_THRESHOLD_MS  = 15 * 60 * 1000; // show "stale" badge after 15 min

export default function WeatherWidget({ location = 'Mumbai' }) {
  const [weather, setWeather]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [alerts, setAlerts]       = useState([]);
  const [lastFetched, setLastFetched] = useState(null);
  const [isStale, setIsStale]     = useState(false);

  const intervalRef   = useRef(null);
  const staleTimerRef = useRef(null);

  // ── Fetch weather ──────────────────────────────────────────
  const loadWeather = useCallback(async () => {
    setError(null);

    try {
      const data = await fetchWeatherData(location);
      setWeather(data);
      setLastFetched(Date.now());
      setIsStale(false);

      // Fetch alerts only when real API data is returned AND coords are present
      if (data?.isReal && data?.lat && data?.lng) {
        try {
          const weatherAlerts = await fetchWeatherAlerts(data.lat, data.lng);
          setAlerts(weatherAlerts || []);
        } catch {
          setAlerts([]); // Alerts failing shouldn't break the whole widget
        }
      }
    } catch (err) {
      console.error('[WeatherWidget]', err);
      setError('Failed to load weather data.');
    }

    setLoading(false);
  }, [location]);

  // ── Setup on mount / location change ──────────────────────
  useEffect(() => {
    setLoading(true);
    setWeather(null);
    setAlerts([]);
    setIsStale(false);

    loadWeather();

    // Auto-refresh every 10 minutes
    intervalRef.current = setInterval(loadWeather, REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(staleTimerRef.current);
    };
  }, [loadWeather]);

  // ── Mark data as stale 15 min after last fetch ────────────
  useEffect(() => {
    clearTimeout(staleTimerRef.current);
    if (!lastFetched) return;

    const msUntilStale = STALE_THRESHOLD_MS - (Date.now() - lastFetched);
    if (msUntilStale > 0) {
      staleTimerRef.current = setTimeout(() => setIsStale(true), msUntilStale);
    }

    return () => clearTimeout(staleTimerRef.current);
  }, [lastFetched]);

  // ── Temperature range bar position (0–100%) ───────────────
  function getTempPosition(temp, tempMin, tempMax) {
    if (tempMax === tempMin) return 50; // Guard: same min/max → centre the dot
    const raw = ((temp - tempMin) / (tempMax - tempMin)) * 100;
    return Math.max(0, Math.min(100, raw)); // Clamp 0–100
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <span className="icon">🌤️</span>
          <h3>Weather</h3>
        </div>
        <div style={{
          display: 'grid', alignItems: 'center', justifyContent: 'center',
          padding: '24px', gap: '10px',
        }}>
          <style>{`@keyframes ww-spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%',
            border: '2px solid rgba(76,227,247,0.2)',
            borderTopColor: '#4ce3f7',
            animation: 'ww-spin 0.8s linear infinite',
          }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'Quicksand, sans-serif' }}>
            Loading weather…
          </span>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (error || !weather) {
    return (
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <span className="icon">🌤️</span>
          <h3>Weather</h3>
        </div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '12px', fontFamily: 'Quicksand, sans-serif' }}>
            {error || 'Weather data unavailable'}
          </p>
          <button
            onClick={() => { setLoading(true); loadWeather(); }}
            style={{
              padding: '7px 16px', borderRadius: '8px',
              border: '1px solid rgba(76,227,247,0.2)',
              background: 'rgba(76,227,247,0.06)',
              color: '#4ce3f7', fontSize: '12px', fontWeight: '600',
              cursor: 'pointer', fontFamily: 'Quicksand, sans-serif',
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  const tempPos = getTempPosition(weather.temp, weather.tempMin, weather.tempMax);

  return (
    <div className="dashboard-card">
      {/* Header */}
      <div className="dashboard-card-header">
        <span className="icon">🌤️</span>
        <h3>Weather — {weather.cityName || location}</h3>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px', alignItems: 'center' }}>
          {isStale && (
            <span style={{
              fontSize: '9px', padding: '2px 7px',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '8px', color: '#f59e0b',
              fontFamily: 'Quicksand, sans-serif',
            }}>
              Stale
            </span>
          )}
          {!weather.isReal && (
            <span style={{
              fontSize: '9px', padding: '2px 7px',
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: '8px', color: '#a855f7',
              fontFamily: 'Quicksand, sans-serif',
            }}>
              Demo
            </span>
          )}
          {/* Manual refresh button */}
          <button
            onClick={() => loadWeather()}
            title="Refresh weather"
            style={{
              width: '24px', height: '24px', borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'transparent', color: 'rgba(255,255,255,0.3)',
              cursor: 'pointer', fontSize: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Main weather row */}
      <div className="weather-widget" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
        <div className="weather-icon" style={{ fontSize: '48px', lineHeight: 1 }}>
          {weather.icon}
        </div>
        <div>
          <div className="weather-temp" style={{ fontSize: '36px', fontWeight: '800', color: '#fff', lineHeight: 1, fontFamily: 'Quicksand, sans-serif' }}>
            {weather.temp}°C
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontFamily: 'Quicksand, sans-serif', textTransform: 'capitalize' }}>
            {weather.description}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'Quicksand, sans-serif' }}>
            Feels like {weather.feelsLike}°C
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
        {[
          { icon: '💧', label: 'Humidity',    value: `${weather.humidity}%` },
          { icon: '💨', label: 'Wind',        value: `${weather.windSpeed} ${weather.windDirection || ''}`.trim() },
          { icon: '👁️', label: 'Visibility',  value: weather.visibility },
          { icon: '☁️', label: 'Cloud cover', value: weather.cloudiness },
          { icon: '🌅', label: 'Sunrise',     value: weather.sunrise },
          { icon: '🌇', label: 'Sunset',      value: weather.sunset },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: '600', fontFamily: 'Quicksand, sans-serif' }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: '12px', color: '#fff', fontWeight: '600', marginTop: '2px', fontFamily: 'Quicksand, sans-serif' }}>
              {value || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Temperature range bar */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '30px', fontFamily: 'Quicksand, sans-serif' }}>
          <span>↓ {weather.tempMin}°C</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Today's range</span>
          <span>↑ {weather.tempMax}°C</span>
        </div>
        <div style={{
          height: '5px', borderRadius: '3px',
          background: 'linear-gradient(90deg, #3b82f6, #f59e0b, #ef4444)',
          position: 'relative',
        }}>
          {/* Current temp indicator dot */}
          <div style={{
            position: 'absolute',
            left: `${tempPos}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '11px',
            height: '11px',
            borderRadius: '50%',
            background: '#fff',
            border: '2px solid #4ce3f7',
            boxShadow: '0 0 6px rgba(76,227,247,0.5)',
          }} />
        </div>
      </div>

      {/* Weather alerts */}
      {alerts.length > 0 && (
        <div style={{ marginTop: '4px' }}>
          {alerts.map((alert, i) => (
            <div key={i} style={{
              padding: '9px 12px',
              background: 'rgba(245,158,11,0.07)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#f59e0b',
              marginBottom: '5px',
              fontFamily: 'Quicksand, sans-serif',
              lineHeight: 1.4,
            }}>
              ⚠️ {alert.event || alert.message || 'Weather alert active'}
              {alert.description && (
                <p style={{ margin: '4px 0 0', color: 'rgba(245,158,11,0.7)', fontSize: '10px' }}>
                  {alert.description.slice(0, 120)}{alert.description.length > 120 ? '…' : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Last updated footer */}
      {lastFetched && (
        <div style={{
          marginTop: '8px',
          textAlign: 'right',
          fontSize: '9px',
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'Quicksand, sans-serif',
        }}>
          Updated {new Date(lastFetched).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}