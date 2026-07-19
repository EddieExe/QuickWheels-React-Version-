import { createContext, useContext, useState, useEffect } from "react";

const CurrencyContext = createContext();

// Supported currencies with their symbols
const currencies = {
  USD: { symbol: "$", name: "US Dollar", rate: 1 },
  EUR: { symbol: "€", name: "Euro", rate: 0.92 },
  GBP: { symbol: "£", name: "British Pound", rate: 0.79 },
  INR: { symbol: "₹", name: "Indian Rupee", rate: 83.5 },
  CAD: { symbol: "C$", name: "Canadian Dollar", rate: 1.36 },
  AUD: { symbol: "A$", name: "Australian Dollar", rate: 1.52 },
  JPY: { symbol: "¥", name: "Japanese Yen", rate: 150.2 },
  AED: { symbol: "د.إ", name: "UAE Dirham", rate: 3.67 },
};

// Simple country to currency mapping (based on browser language)
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
  const [currency, setCurrency] = useState("USD");
  const [rates, setRates] = useState(currencies);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved currency from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem("preferredCurrency");
    if (savedCurrency && currencies[savedCurrency]) {
      setCurrency(savedCurrency);
    } else {
      const detectedCurrency = getCurrencyFromCountry();
      setCurrency(detectedCurrency);
      localStorage.setItem("preferredCurrency", detectedCurrency);
    }
  }, []);

  // Convert price from USD to selected currency
  const convertPrice = (priceInUSD) => {
    const rate = rates[currency]?.rate || 1;
    return priceInUSD * rate;
  };

  // Format price with currency symbol
  const formatPrice = (priceInUSD, decimals = 2) => {
    const converted = convertPrice(priceInUSD);
    const symbol = rates[currency]?.symbol || "$";
    
    // For currencies that might need different formatting
    if (currency === "JPY") {
      return `${symbol}${Math.round(converted)}`;
    }
    return `${symbol}${converted.toFixed(decimals)}`;
  };

  // Change currency
  const changeCurrency = (newCurrency) => {
    if (currencies[newCurrency]) {
      setCurrency(newCurrency);
      localStorage.setItem("preferredCurrency", newCurrency);
    }
  };

  // Get available currencies list
  const getAvailableCurrencies = () => {
    return Object.keys(currencies).map(code => ({
      code,
      symbol: currencies[code].symbol,
      name: currencies[code].name
    }));
  };

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