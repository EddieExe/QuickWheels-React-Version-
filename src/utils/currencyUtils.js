// src/utils/currencyUtils.js
// Live exchange-rate fetching, with a 24h localStorage cache and a static
// fallback table so the app still works if the network/API is unavailable.
//
// Uses open.er-api.com — free, no API key required, rates refresh ~daily.
// If you already have a paid FX provider (exchangerate-api.com,
// currencyapi.com, etc.) for tighter accuracy, swap FX_API_URL and the
// response-parsing line marked below — nothing else in the app needs to
// change, since everything else just consumes the { CODE: rate, ... } map
// this returns.

const FX_API_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_KEY = "fxRatesCache";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h — matches the API's own refresh cadence

// Only used if the live fetch fails AND there's no cache yet at all (e.g.
// first-ever load with no network). Kept close to the old hardcoded table
// so behavior doesn't change drastically if the API is ever unreachable.
export const FALLBACK_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 150.2,
  AED: 3.67,
};

/**
 * Get current USD-based exchange rates as { CODE: rate, ... }.
 * - Serves from a 24h localStorage cache when available and fresh.
 * - On cache miss/expiry, fetches live rates and re-caches them.
 * - On fetch failure, falls back to stale cache if present, otherwise
 *   FALLBACK_RATES.
 */
export async function getExchangeRates() {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_MAX_AGE_MS) {
    return cached.rates;
  }

  try {
    const res = await fetch(FX_API_URL);
    if (!res.ok) throw new Error(`FX API returned ${res.status}`);
    const data = await res.json();

    // ── Swap this line if you change FX_API_URL to a different provider ──
    const rates = data.rates;
    if (!rates || typeof rates !== "object") {
      throw new Error("FX API response missing rates");
    }

    writeCache(rates);
    return rates;
  } catch (err) {
    console.warn("[currencyUtils] Live FX fetch failed, falling back:", err.message);
    return cached ? cached.rates : FALLBACK_RATES;
  }
}

/**
 * Convert a USD amount into another currency using a specific rate map —
 * pass the rates you already have (e.g. from context) rather than
 * re-fetching, since this is called on every render/keystroke in places
 * like the booking summary.
 */
export function convertWithRates(amountUSD, currencyCode, rates) {
  const rate = rates?.[currencyCode] ?? FALLBACK_RATES[currencyCode] ?? 1;
  return amountUSD * rate;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.rates || !parsed?.fetchedAt) return null;
    return parsed;
  } catch {
    return null; // corrupted cache — ignore
  }
}

function writeCache(rates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() }));
  } catch {
    // localStorage full/unavailable — non-fatal, just means no caching this time
  }
}