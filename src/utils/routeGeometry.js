/**
 * Route Geometry
 *
 * Pure helpers (no React, no Google SDK calls) for turning a DirectionsResult
 * plus a single {lat, lng} fix into road-based navigation state.
 *
 * Everything here measures along the route polyline. Comparing a straight-line
 * distance-to-destination against the road distance of the route is what made
 * progress read ~19% before the car had moved on a Mumbai -> Pune trip.
 */

const EARTH_RADIUS_M = 6371000;
const METERS_PER_DEG_LAT = 111320;

/** Distance in metres between two {lat, lng} points. */
export function haversineMeters(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/** Local planar projection, accurate enough over the length of one segment. */
function toXY(point, origin) {
  const mPerDegLng = METERS_PER_DEG_LAT * Math.cos(toRad(origin.lat));
  return {
    x: (point.lng - origin.lng) * mPerDegLng,
    y: (point.lat - origin.lat) * METERS_PER_DEG_LAT,
  };
}

/** Interpolate between two {lat, lng} points. */
export function lerpPoint(a, b, t) {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

/** Compass bearing in degrees from a to b, for rotating the car marker. */
export function bearingBetween(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

/**
 * Flatten a DirectionsResult into a dense polyline with cumulative distances
 * and per-step boundaries, so a fix can be located both in space and in the
 * turn-by-turn list.
 *
 * @returns {{
 *   points: {lat: number, lng: number}[],
 *   cumulative: number[],
 *   totalMeters: number,
 *   steps: { startMeters: number, endMeters: number, seconds: number }[],
 *   totalSeconds: number,
 * } | null}
 */
export function buildRoutePath(rawResult) {
  const route = rawResult?.routes?.[0];
  const leg = route?.legs?.[0];
  if (!route) return null;

  const points = [];
  const stepVertexRanges = [];

  const push = (latLng) => {
    const point = normalizeLatLng(latLng);
    if (!point) return;
    const last = points[points.length - 1];
    if (last && last.lat === point.lat && last.lng === point.lng) return;
    points.push(point);
  };

  if (leg?.steps?.length) {
    leg.steps.forEach((step) => {
      const startIndex = Math.max(0, points.length - 1);
      const vertices = step.path?.length
        ? step.path
        : [step.start_location, step.end_location];
      vertices.forEach(push);
      stepVertexRanges.push({
        startIndex,
        endIndex: Math.max(startIndex, points.length - 1),
        seconds: step.duration?.value ?? 0,
      });
    });
  } else if (route.overview_path?.length) {
    route.overview_path.forEach(push);
  }

  if (points.length < 2) return null;

  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    cumulative[i] = cumulative[i - 1] + haversineMeters(points[i - 1], points[i]);
  }
  const totalMeters = cumulative[cumulative.length - 1];

  // Directions gives step durations free of traffic; scale them so the sum
  // matches duration_in_traffic and the ETA countdown stays honest.
  const normalSeconds = leg?.duration?.value ?? 0;
  const trafficSeconds = leg?.duration_in_traffic?.value ?? normalSeconds;
  const trafficFactor = normalSeconds > 0 ? trafficSeconds / normalSeconds : 1;

  const steps = stepVertexRanges.map(({ startIndex, endIndex, seconds }) => ({
    startMeters: cumulative[startIndex],
    endMeters: cumulative[endIndex],
    seconds: seconds * trafficFactor,
  }));

  return {
    points,
    cumulative,
    totalMeters,
    steps,
    totalSeconds: trafficSeconds || normalSeconds,
  };
}

function normalizeLatLng(value) {
  if (!value) return null;
  if (typeof value.lat === 'function') {
    return { lat: value.lat(), lng: value.lng() };
  }
  if (typeof value.lat === 'number') {
    return { lat: value.lat, lng: value.lng };
  }
  return null;
}

/**
 * Project a fix onto the polyline.
 *
 * `hintIndex` (the previous match) lets us scan a small window first, so a
 * once-per-second feed does not walk a few thousand vertices every tick.
 *
 * @returns {{ index: number, alongMeters: number, offsetMeters: number,
 *             snapped: {lat: number, lng: number} }}
 */
export function snapToPath(routePath, position, hintIndex = null) {
  const { points, cumulative } = routePath;

  const scan = (from, to) => {
    let best = null;
    for (let i = Math.max(0, from); i < Math.min(points.length - 1, to); i += 1) {
      const candidate = projectOnSegment(points[i], points[i + 1], position);
      if (!best || candidate.offsetMeters < best.offsetMeters) {
        best = { ...candidate, index: i };
      }
    }
    return best;
  };

  let best = null;
  if (hintIndex !== null) {
    best = scan(hintIndex - 20, hintIndex + 200);
    // A poor local match means we jumped (or drifted off route) — rescan fully.
    if (best && best.offsetMeters > 200) best = null;
  }
  if (!best) best = scan(0, points.length - 1);
  if (!best) {
    return { index: 0, alongMeters: 0, offsetMeters: 0, snapped: points[0] };
  }

  const segmentLength =
    cumulative[best.index + 1] - cumulative[best.index];

  return {
    index: best.index,
    alongMeters: cumulative[best.index] + segmentLength * best.t,
    offsetMeters: best.offsetMeters,
    snapped: lerpPoint(points[best.index], points[best.index + 1], best.t),
  };
}

function projectOnSegment(a, b, p) {
  const segment = toXY(b, a);
  const point = toXY(p, a);
  const lengthSquared = segment.x ** 2 + segment.y ** 2;

  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, (point.x * segment.x + point.y * segment.y) / lengthSquared),
        );

  const dx = point.x - segment.x * t;
  const dy = point.y - segment.y * t;
  return { t, offsetMeters: Math.sqrt(dx * dx + dy * dy) };
}

/** Metres travelled -> a point on the polyline. Used by the simulation driver. */
export function pointAtDistance(routePath, meters) {
  const { points, cumulative, totalMeters } = routePath;
  const target = Math.max(0, Math.min(totalMeters, meters));

  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= target) lo = mid;
    else hi = mid;
  }

  const segmentLength = cumulative[hi] - cumulative[lo];
  const t = segmentLength === 0 ? 0 : (target - cumulative[lo]) / segmentLength;
  return {
    ...lerpPoint(points[lo], points[hi], t),
    heading: bearingBetween(points[lo], points[hi]),
  };
}

/** How far off the polyline a fix has to be before we call it off-route. */
export const OFF_ROUTE_THRESHOLD_M = 150;

/**
 * The single derivation every consumer reads from: progress, remaining
 * distance, remaining time and which turn is active — all from one fix.
 */
export function deriveNavState(routePath, position, hintIndex = null) {
  if (!routePath) return emptyNavState();
  if (!position) return emptyNavState(routePath);

  const snap = snapToPath(routePath, position, hintIndex);
  const { totalMeters, totalSeconds, steps } = routePath;

  const remainingMeters = Math.max(0, totalMeters - snap.alongMeters);
  const progressPercent = totalMeters
    ? clampPercent((snap.alongMeters / totalMeters) * 100)
    : 0;

  return {
    ...snap,
    progressPercent,
    remainingMeters,
    remainingSeconds: remainingSecondsAt(steps, snap.alongMeters, totalMeters, totalSeconds),
    currentStepIndex: currentStepAt(steps, snap.alongMeters),
    offRoute: snap.offsetMeters > OFF_ROUTE_THRESHOLD_M,
    hasFix: true,
  };
}

function emptyNavState(routePath = null) {
  return {
    index: 0,
    alongMeters: 0,
    offsetMeters: 0,
    snapped: routePath?.points?.[0] ?? null,
    progressPercent: 0,
    remainingMeters: routePath?.totalMeters ?? 0,
    remainingSeconds: routePath?.totalSeconds ?? 0,
    currentStepIndex: 0,
    offRoute: false,
    hasFix: false,
  };
}

function remainingSecondsAt(steps, alongMeters, totalMeters, totalSeconds) {
  if (!steps?.length) {
    return totalMeters
      ? totalSeconds * (1 - alongMeters / totalMeters)
      : 0;
  }

  let seconds = 0;
  steps.forEach((step) => {
    if (alongMeters >= step.endMeters) return;
    if (alongMeters <= step.startMeters) {
      seconds += step.seconds;
      return;
    }
    const length = step.endMeters - step.startMeters;
    const fraction = length > 0 ? (step.endMeters - alongMeters) / length : 0;
    seconds += step.seconds * fraction;
  });
  return seconds;
}

function currentStepAt(steps, alongMeters) {
  if (!steps?.length) return 0;
  const index = steps.findIndex((step) => alongMeters < step.endMeters);
  return index === -1 ? steps.length - 1 : index;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}
