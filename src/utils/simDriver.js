/**
 * Simulation Driver
 *
 * Demo mode needs a moving car without a real trip. Rather than inventing a
 * progress number, this walks the *actual* route polyline and emits the same
 * { lat, lng, heading, speed } shape as navigator.geolocation.watchPosition.
 *
 * Downstream code cannot tell a simulated fix from a real one, so whatever is
 * verified in demo mode is the same code path a real trip runs.
 */

import { pointAtDistance } from './routeGeometry';

export const SIM_SPEED_PRESETS = [
  { label: '1×', multiplier: 1 },
  { label: '10×', multiplier: 10 },
  { label: '60×', multiplier: 60 },
];

const TICK_MS = 1000;

/**
 * @param routePath  result of buildRoutePath()
 * @param options.speedKmph     road speed being simulated
 * @param options.multiplier    time compression, so a 3h trip is watchable
 * @param options.startMeters   resume point along the route
 * @param onFix                 called with each simulated fix
 * @returns {{ stop: () => void, getTravelled: () => number }}
 */
export function startSimDriver(routePath, options, onFix) {
  const { speedKmph = 60, multiplier = 1, startMeters = 0 } = options ?? {};

  let travelled = startMeters;
  const metersPerTick = (speedKmph / 3.6) * (TICK_MS / 1000) * multiplier;

  const emit = () => {
    const point = pointAtDistance(routePath, travelled);
    onFix({
      lat: point.lat,
      lng: point.lng,
      heading: point.heading,
      speed: speedKmph / 3.6,
      accuracy: 5,
      timestamp: Date.now(),
      isMock: true,
    });
  };

  emit();

  const timer = setInterval(() => {
    travelled = Math.min(travelled + metersPerTick, routePath.totalMeters);
    emit();
    if (travelled >= routePath.totalMeters) clearInterval(timer);
  }, TICK_MS);

  return {
    stop: () => clearInterval(timer),
    getTravelled: () => travelled,
  };
}
