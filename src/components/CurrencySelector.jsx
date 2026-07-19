import { useState, useRef, useEffect } from "react";
import { useCurrency } from "../context/CurrencyContext";
import "../styles/currency.css";

function CurrencySelector() {
  const { currency, changeCurrency, getAvailableCurrencies } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currencies = getAvailableCurrencies();

  // Get current currency display
  const currentCurrency = currencies.find(c => c.code === currency);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCurrencySelect = (currencyCode) => {
    changeCurrency(currencyCode);
    setIsOpen(false);
  };

  return (
    <div className="currency_selector" ref={dropdownRef}>
      <button 
        className="currency_selector_btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="currency_symbol">{currentCurrency?.symbol}</span>
        <span className="currency_code">{currentCurrency?.code}</span>
        <span className={`currency_arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="currency_dropdown">
          {currencies.map((curr) => (
            <div
              key={curr.code}
              className={`currency_option ${currency === curr.code ? "active" : ""}`}
              onClick={() => handleCurrencySelect(curr.code)}
            >
              <span className="currency_option_symbol">{curr.symbol}</span>
              <span className="currency_option_name">{curr.name}</span>
              <span className="currency_option_code">{curr.code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CurrencySelector;