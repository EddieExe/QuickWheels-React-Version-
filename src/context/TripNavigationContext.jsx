import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../utils/googleMapsLoader';
import { geocodeAddress, getDirections, formatDuration } from '../utils/googleMapsService';
import { buildRoutePath, deriveNavState } from '../utils/routeGeometry';
import { startSimDriver } from '../utils/simDriver';

/**
 * TripNavigationContext
 *
 * The single owner of "where is the car and how far along is it". Geocoding,
 * the Directions request, the position feed and every derived number live
 * here; RouteMap and LiveNavigation only render what this exposes.
 *
 * Previously both of those components geocoded and routed independently
 * (4 geocode + 2 Directions calls per dashboard load) and each kept its own
 * distance/ETA/progress state, so the two panels could disagree on screen.
 *
 * The position feed has two interchangeable drivers:
 *   mode="gps" — navigator.geolocation.watchPosition
 *   mode="sim" — simDriver, walking the real route polyline
 * Both emit the same fix shape, so demo mode exercises the production maths.
 */

const TripNavigationContext = createContext(null);

const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  // No cached fixes: a 10s-stale position is what made tracking look frozen.
  maximumAge: 0,
};

export function TripNavigationProvider({
  pickup,
  dropoff,
  mode = 'gps',
  children,
}) {
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [position, setPosition] = useState(null);
  const [positionError, setPositionError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [simMultiplier, setSimMultiplier] = useState(10);

  // Read inside the position callbacks. Reading the state variable there
  // captured its value at subscribe time, so tracking started before the
  // route resolved never produced progress.
  const routePathRef = useRef(null);
  const snapIndexRef = useRef(null);
  const stopFeedRef = useRef(null);
  const simDriverRef = useRef(null);

  const routePath = useMemo(
    () => (route?.rawResult ? buildRoutePath(route.rawResult) : null),
    [route],
  );
  routePathRef.current = routePath;

  // ── Route: geocode both ends and fetch directions, once per trip ──
  const loadRoute = useCallback(async () => {
    if (!isLoaded || !pickup || !dropoff) return;

    setLoadingRoute(true);
    setRouteError(null);
    try {
      const [origin, destination] = await Promise.all([
        geocodeAddress(pickup),
        geocodeAddress(dropoff),
      ]);
      const result = await getDirections(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng,
      );
      setRoute({ ...result, origin, destination });
      snapIndexRef.current = null;
    } catch (error) {
      console.error('[TripNavigation] route failed:', error);
      setRouteError(error.message);
      setRoute(null);
    }
    setLoadingRoute(false);
  }, [isLoaded, pickup, dropoff]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  // ── Position feed ──
  const stopTracking = useCallback(() => {
    stopFeedRef.current?.();
    stopFeedRef.current = null;
    simDriverRef.current = null;
    setIsTracking(false);
  }, []);

  const handleFix = useCallback((fix) => {
    setPositionError(null);
    setPosition(fix);
  }, []);

  const startTracking = useCallback(() => {
    setPositionError(null);

    if (mode === 'sim') {
      const path = routePathRef.current;
      if (!path) {
        setPositionError('Route is still loading — try again in a moment.');
        return;
      }
      const driver = startSimDriver(
        path,
        {
          multiplier: simMultiplier,
          startMeters: simDriverRef.current?.getTravelled() ?? 0,
        },
        handleFix,
      );
      simDriverRef.current = driver;
      stopFeedRef.current = driver.stop;
      setIsTracking(true);
      return;
    }

    if (!navigator.geolocation) {
      setPositionError('Geolocation is not supported by this browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (browserPosition) =>
        handleFix({
          lat: browserPosition.coords.latitude,
          lng: browserPosition.coords.longitude,
          heading: browserPosition.coords.heading ?? null,
          speed: browserPosition.coords.speed ?? null,
          accuracy: browserPosition.coords.accuracy,
          timestamp: browserPosition.timestamp,
          isMock: false,
        }),
      (error) => {
        // Silent failure here is why a denied permission looked like a frozen map.
        const messages = {
          1: 'Location permission denied. Enable GPS access for this site to track your trip.',
          2: 'Location unavailable. Check your GPS signal.',
          3: 'Location request timed out.',
        };
        setPositionError(messages[error.code] || 'Unable to get your location.');
      },
      GEOLOCATION_OPTIONS,
    );

    stopFeedRef.current = () => navigator.geolocation.clearWatch(watchId);
    setIsTracking(true);
  }, [handleFix, mode, simMultiplier]);

  const toggleTracking = useCallback(() => {
    if (isTracking) stopTracking();
    else startTracking();
  }, [isTracking, startTracking, stopTracking]);

  // Switching between real and simulated driving must not leave a feed running.
  useEffect(() => {
    stopTracking();
    setPosition(null);
    snapIndexRef.current = null;
  }, [mode, stopTracking]);

  // Restart the simulation in place when the speed changes.
  useEffect(() => {
    if (mode !== 'sim' || !isTracking) return;
    stopFeedRef.current?.();
    startTracking();
    // startTracking already captures the new multiplier and resumes from
    // the previous distance travelled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simMultiplier]);

  useEffect(() => stopTracking, [stopTracking]);

  // ── Derived navigation state — the one source of truth on screen ──
  const nav = useMemo(() => {
    const state = deriveNavState(routePath, position, snapIndexRef.current);
    snapIndexRef.current = state.hasFix ? state.index : null;
    return state;
  }, [routePath, position]);

  const value = useMemo(
    () => ({
      isLoaded,
      loadingRoute,
      routeError,
      refreshRoute: loadRoute,

      route,
      routePath,
      steps: route?.steps ?? [],
      traffic: route?.traffic ?? null,
      originName: route?.origin?.name ?? pickup ?? 'Pickup',
      destinationName: route?.destination?.name ?? dropoff ?? 'Dropoff',
      totalDistanceText: route?.distance?.text ?? '--',

      mode,
      isSimulated: mode === 'sim',
      simMultiplier,
      setSimMultiplier,

      position,
      positionError,
      isTracking,
      toggleTracking,

      progressPercent: nav.progressPercent,
      currentStepIndex: nav.currentStepIndex,
      offRoute: nav.offRoute,
      hasFix: nav.hasFix,
      remainingText: route ? formatDistance(nav.remainingMeters) : '--',
      etaText: route ? formatDuration(Math.round(nav.remainingSeconds)) : '--',
      arrivalTime: route ? arrivalFrom(nav.remainingSeconds) : '--',
    }),
    [
      isLoaded,
      loadingRoute,
      routeError,
      loadRoute,
      route,
      routePath,
      pickup,
      dropoff,
      mode,
      simMultiplier,
      position,
      positionError,
      isTracking,
      toggleTracking,
      nav,
    ],
  );

  return (
    <TripNavigationContext.Provider value={value}>
      {children}
    </TripNavigationContext.Provider>
  );
}

export function useTripNavigation() {
  const context = useContext(TripNavigationContext);
  if (!context) {
    throw new Error('useTripNavigation must be used within TripNavigationProvider');
  }
  return context;
}

function formatDistance(meters) {
  if (meters >= 1000) return `${Math.round(meters / 100) / 10} km`;
  return `${Math.round(meters)} m`;
}

function arrivalFrom(remainingSeconds) {
  return new Date(Date.now() + remainingSeconds * 1000).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
