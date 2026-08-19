import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import { getExchangeRates, FALLBACK_RATES } from "../utils/currencyUtils";

const CurrencyContext = createContext();

// Currency metadata (symbol/name) — rate here is only the day-one fallback
// before live rates load; getExchangeRates() overwrites these at runtime.
const CURRENCY_META = {
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
};

function buildRatesTable(rateMap) {
  const table = {};
  for (const code of Object.keys(CURRENCY_META)) {
    table[code] = {
      ...CURRENCY_META[code],
      rate: rateMap?.[code] ?? FALLBACK_RATES[code] ?? 1,
    };
  }
  return table;
}

// Simple country to currency mapping (based on browser language) — only
// used for a brand-new visitor with no saved preference anywhere yet.
const getCurrencyFromCountry = () => {
  const language = navigator.language || "en-US";

  if (language.includes("IN") || language.includes("hi")) return "INR";
  if (language.includes("GB") || language.includes("en-GB")) return "GBP";
  if (language.includes("EU") || language.includes("fr") || language.includes("de")) return "EUR";
  if (language.includes("JP") || language.includes("ja")) return "JPY";
  if (language.includes("AE") || language.includes("ar")) return "AED";
  if (language.includes("CA") || language.includes("fr-CA")) return "CAD";
  if (language.includes("AU")) return "AUD";

  return "USD"; // Default to USD
};

export function CurrencyProvider({ children }) {
  const { user } = useAuth();
  const [currency, setCurrency] = useState("USD");
  const [rates, setRates] = useState(buildRatesTable(null));
  const [isLoading, setIsLoading] = useState(true);

  // Live exchange rates — fetched once on mount (cached 24h internally by
  // currencyUtils), independent of who's logged in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const liveRates = await getExchangeRates();
      if (!cancelled) setRates(buildRatesTable(liveRates));
    })();
    return () => { cancelled = true; };
  }, []);

  // Which currency to show. Source of truth, in priority order:
  // 1. The user's saved profile preference (Firestore users/{email}) — so
  //    it follows them across devices/browsers.
  // 2. This browser's last choice (localStorage) — covers logged-out
  //    browsing, and acts as an instant-paint value before the Firestore
  //    read resolves.
  // 3. Browser-language-based guess, for a first-ever visit.
  useEffect(() => {
    let cancelled = false;

    async function resolveCurrency() {
      setIsLoading(true);

      const localSaved = localStorage.getItem("preferredCurrency");
      const initialGuess =
        localSaved && CURRENCY_META[localSaved] ? localSaved : getCurrencyFromCountry();

      // Paint something immediately so the UI isn't stuck on USD while we
      // check Firestore (only matters for logged-in users).
      if (!cancelled) setCurrency(initialGuess);
      if (!localSaved) localStorage.setItem("preferredCurrency", initialGuess);

      if (!user?.email) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.email));
        const savedCurrency = snap.exists() ? snap.data().preferredCurrency : null;

        if (savedCurrency && CURRENCY_META[savedCurrency]) {
          if (!cancelled) setCurrency(savedCurrency);
          localStorage.setItem("preferredCurrency", savedCurrency);
        } else {
          // Logged in but no profile preference saved yet — persist
          // whatever we just resolved (local/browser-detected) so it
          // becomes their profile preference going forward.
          setDoc(doc(db, "users", user.email), { preferredCurrency: initialGuess }, { merge: true })
            .catch((err) => console.error("Failed to save initial currency preference:", err));
        }
      } catch (err) {
        console.error("Failed to load currency preference from profile:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    resolveCurrency();
    return () => { cancelled = true; };
  }, [user]);

  // Convert price from USD to selected currency
  const convertPrice = useCallback(
    (priceInUSD) => {
      const rate = rates[currency]?.rate || 1;
      return (priceInUSD || 0) * rate;
    },
    [rates, currency],
  );

  // Format price with currency symbol
  const formatPrice = useCallback(
    (priceInUSD, decimals = 2) => {
      const converted = convertPrice(priceInUSD);
      const symbol = rates[currency]?.symbol || "$";

      if (currency === "JPY") {
        return `${symbol}${Math.round(converted)}`;
      }
      return `${symbol}${converted.toFixed(decimals)}`;
    },
    [convertPrice, rates, currency],
  );

  // Change currency — updates local state + localStorage immediately, and
  // persists to the user's Firestore profile if logged in so it follows
  // them everywhere (cars, addons, receipts, emails all read from here).
  const changeCurrency = useCallback(
    (newCurrency) => {
      if (!CURRENCY_META[newCurrency]) return;
      setCurrency(newCurrency);
      localStorage.setItem("preferredCurrency", newCurrency);

      if (user?.email) {
        setDoc(doc(db, "users", user.email), { preferredCurrency: newCurrency }, { merge: true })
          .catch((err) => console.error("Failed to save currency preference:", err));
      }
    },
    [user],
  );

  const getAvailableCurrencies = useCallback(() => {
    return Object.keys(CURRENCY_META).map((code) => ({
      code,
      symbol: CURRENCY_META[code].symbol,
      name: CURRENCY_META[code].name,
    }));
  }, []);

  const value = {
    currency,
    symbol: rates[currency]?.symbol || "$",
    rates,
    convertPrice,
    formatPrice,
    changeCurrency,
    getAvailableCurrencies,
    isLoading,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}