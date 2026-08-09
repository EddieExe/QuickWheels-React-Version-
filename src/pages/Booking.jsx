import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/booking.css";

// ── Location Data: Country → State → City ─────────────────
const locationData = {
  "United States": {
    California: [
      "Los Angeles",
      "San Francisco",
      "San Diego",
      "Sacramento",
      "Santa Barbara",
    ],
    "New York": ["New York City", "Buffalo", "Rochester", "Albany", "Syracuse"],
    Florida: ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale"],
    Texas: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth"],
    Illinois: ["Chicago", "Aurora", "Naperville", "Rockford", "Springfield"],
    Nevada: ["Las Vegas", "Reno", "Henderson", "North Las Vegas", "Sparks"],
    Washington: ["Seattle", "Spokane", "Tacoma", "Vancouver", "Bellevue"],
    Massachusetts: [
      "Boston",
      "Worcester",
      "Springfield",
      "Cambridge",
      "Lowell",
    ],
    Georgia: ["Atlanta", "Augusta", "Columbus", "Savannah", "Athens"],
    Colorado: [
      "Denver",
      "Colorado Springs",
      "Aurora",
      "Fort Collins",
      "Lakewood",
    ],
  },
  Canada: {
    Ontario: ["Toronto", "Ottawa", "Mississauga", "Hamilton", "London"],
    "British Columbia": [
      "Vancouver",
      "Victoria",
      "Surrey",
      "Burnaby",
      "Richmond",
    ],
    Quebec: ["Montreal", "Quebec City", "Laval", "Gatineau", "Longueuil"],
    Alberta: ["Calgary", "Edmonton", "Red Deer", "Lethbridge", "Medicine Hat"],
  },
  "United Kingdom": {
    England: ["London", "Manchester", "Birmingham", "Liverpool", "Bristol"],
    Scotland: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Inverness"],
    Wales: ["Cardiff", "Swansea", "Newport", "Bangor", "St Davids"],
  },
  Australia: {
    "New South Wales": [
      "Sydney",
      "Newcastle",
      "Wollongong",
      "Central Coast",
      "Coffs Harbour",
    ],
    Victoria: ["Melbourne", "Geelong", "Ballarat", "Bendigo", "Shepparton"],
    Queensland: [
      "Brisbane",
      "Gold Coast",
      "Cairns",
      "Townsville",
      "Sunshine Coast",
    ],
    "Western Australia": [
      "Perth",
      "Fremantle",
      "Mandurah",
      "Bunbury",
      "Albany",
    ],
  },
  Germany: {
    Bavaria: ["Munich", "Nuremberg", "Augsburg", "Regensburg", "Wurzburg"],
    Berlin: ["Berlin", "Spandau", "Charlottenburg", "Kopenick", "Lichtenberg"],
    Hamburg: ["Hamburg", "Altona", "Eimsbüttel", "Harburg", "Wandsbek"],
    "North Rhine-Westphalia": [
      "Cologne",
      "Dusseldorf",
      "Dortmund",
      "Essen",
      "Bonn",
    ],
  },
  France: {
    "Île-de-France": [
      "Paris",
      "Versailles",
      "Boulogne-Billancourt",
      "Saint-Denis",
      "Argenteuil",
    ],
    "Provence-Alpes-Côte d'Azur": [
      "Marseille",
      "Nice",
      "Toulon",
      "Aix-en-Provence",
      "Cannes",
    ],
    "Auvergne-Rhône-Alpes": [
      "Lyon",
      "Grenoble",
      "Villeurbanne",
      "Saint-Étienne",
      "Clermont-Ferrand",
    ],
  },
  Spain: {
    Madrid: [
      "Madrid",
      "Alcalá de Henares",
      "Móstoles",
      "Leganés",
      "Fuenlabrada",
    ],
    Catalonia: [
      "Barcelona",
      "L'Hospitalet",
      "Badalona",
      "Terrassa",
      "Sabadell",
    ],
    Andalusia: [
      "Seville",
      "Malaga",
      "Cordoba",
      "Granada",
      "Jerez de la Frontera",
    ],
  },
  Italy: {
    Lazio: ["Rome", "Latina", "Guidonia Montecelio", "Fiumicino", "Aprilia"],
    Lombardy: ["Milan", "Brescia", "Monza", "Bergamo", "Como"],
    Campania: ["Naples", "Salerno", "Giugliano", "Torre del Greco", "Pozzuoli"],
  },
  Japan: {
    Tokyo: ["Tokyo", "Hachioji", "Machida", "Fuchu", "Chofu"],
    Osaka: ["Osaka", "Sakai", "Higashiosaka", "Hirakata", "Toyonaka"],
    Kanagawa: ["Yokohama", "Kawasaki", "Sagamihara", "Yamato", "Hiratsuka"],
  },
  India: {
    Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
    Delhi: ["New Delhi", "Delhi", "Noida", "Gurgaon", "Ghaziabad"],
    Karnataka: ["Bangalore", "Mysore", "Hubli", "Mangalore", "Belgaum"],
    "Tamil Nadu": [
      "Chennai",
      "Coimbatore",
      "Madurai",
      "Tiruchirappalli",
      "Salem",
    ],
    Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"],
  },
  Brazil: {
    "São Paulo": [
      "São Paulo",
      "Guarulhos",
      "Campinas",
      "São Bernardo",
      "Santo André",
    ],
    "Rio de Janeiro": [
      "Rio de Janeiro",
      "Niterói",
      "Duque de Caxias",
      "Nova Iguaçu",
      "São Gonçalo",
    ],
    "Minas Gerais": [
      "Belo Horizonte",
      "Uberlândia",
      "Contagem",
      "Juiz de Fora",
      "Betim",
    ],
  },
  Mexico: {
    "Mexico City": [
      "Mexico City",
      "Ecatepec",
      "Nezahualcóyotl",
      "Naucalpan",
      "Tlalnepantla",
    ],
    Jalisco: [
      "Guadalajara",
      "Zapopan",
      "Tlaquepaque",
      "Tonalá",
      "Puerto Vallarta",
    ],
    "Nuevo León": [
      "Monterrey",
      "Guadalupe",
      "San Nicolás",
      "Apodaca",
      "Santa Catarina",
    ],
  },
  Netherlands: {
    "North Holland": [
      "Amsterdam",
      "Haarlem",
      "Zaanstad",
      "Hilversum",
      "Alkmaar",
    ],
    "South Holland": [
      "Rotterdam",
      "The Hague",
      "Zoetermeer",
      "Delft",
      "Leiden",
    ],
    Utrecht: ["Utrecht", "Amersfoort", "Veenendaal", "De Bilt", "Zeist"],
  },
  Switzerland: {
    Zurich: ["Zurich", "Winterthur", "Uster", "Dübendorf", "Dietikon"],
    Bern: ["Bern", "Thun", "Biel/Bienne", "Köniz", "Ostermundigen"],
    Geneva: ["Geneva", "Vernier", "Lancy", "Meyrin", "Carouge"],
  },
  Singapore: {
    "Central Region": [
      "Singapore",
      "Toa Payoh",
      "Bishan",
      "Ang Mo Kio",
      "Serangoon",
    ],
    "East Region": ["Bedok", "Tampines", "Pasir Ris", "Changi", "Geylang"],
  },
  Thailand: {
    Bangkok: ["Bangkok", "Thonburi", "Bang Kapi", "Bang Na", "Lat Phrao"],
    "Chiang Mai": [
      "Chiang Mai",
      "Lamphun",
      "San Kamphaeng",
      "Hang Dong",
      "Saraphi",
    ],
    Phuket: ["Phuket", "Kathu", "Thalang", "Patong", "Karon"],
  },
  UAE: {
    Dubai: ["Dubai", "Jebel Ali", "Al Quoz", "Deira", "Bur Dubai"],
    "Abu Dhabi": [
      "Abu Dhabi",
      "Al Ain",
      "Musaffah",
      "Khalifa City",
      "Mohammed Bin Zayed City",
    ],
  },
};

// ── Icons (replace emoji glyphs with proper SVG) ─────────
function PinIcon(props) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ChevronIcon({ active }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className="arrow_icon"
      style={{ transform: active ? "rotate(180deg)" : "none", color: active ? "var(--purple)" : undefined }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function BanIcon(props) {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#ffa500" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

function PlateIcon(props) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="6" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="18" y2="10" />
      <line x1="6" y1="14" x2="18" y2="14" />
    </svg>
  );
}

function StarIcon(props) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function KitIcon(props) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="9.5" y1="13.5" x2="14.5" y2="13.5" />
    </svg>
  );
}

function GpsIcon(props) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}

// ── Cross Border Warning Modal ───────────────────────────
function CrossBorderWarningModal({ pickupCountry, onClose, onConfirm }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.85)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)",
          border: "1px solid rgba(255,165,0,0.4)",
          borderRadius: "20px",
          maxWidth: "450px",
          width: "100%",
          padding: "32px",
          textAlign: "center",
          fontFamily: "Quicksand, sans-serif",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          animation: "modalPopIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "16px",
          animation: "iconGlowPulse 1.8s ease-in-out infinite",
        }}>
          <BanIcon />
        </div>
        <h2
          style={{ color: "#ffa500", marginBottom: "12px", fontSize: "1.5rem" }}
        >
          International Travel Restricted
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.7)",
            lineHeight: "1.6",
            marginBottom: "20px",
          }}
        >
          Our rental policy requires that{" "}
          <strong>
            dropoff location must be in the same country as pickup location
          </strong>
          .
        </p>
        <div
          style={{
            background: "rgba(255,165,0,0.1)",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "24px",
            border: "1px solid rgba(255,165,0,0.2)",
          }}
        >
          <p style={{ margin: 0, color: "#ffa500", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <PinIcon /> Pickup Country: <strong>{pickupCountry}</strong>
          </p>
          <p
            style={{
              margin: "8px 0 0",
              color: "rgba(255,255,255,0.6)",
              fontSize: "13px",
            }}
          >
            Dropoff country must be <strong>{pickupCountry}</strong> as well
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={onConfirm}
            style={{
              background: "linear-gradient(30deg, #0400ff, #4ce3f7)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              padding: "12px 28px",
              fontWeight: "700",
              cursor: "pointer",
              fontFamily: "Quicksand, sans-serif",
              fontSize: "14px",
              transition: "transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(76,227,247,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            OK, I Understand
          </button>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "10px",
              color: "#fff",
              padding: "12px 28px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Quicksand, sans-serif",
              fontSize: "14px",
              transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Booking() {
  const { user } = useAuth();
  const [selectedCar, setSelectedCar] = useState(null);
  const [formData, setFormData] = useState({
    country: "",
    state: "",
    city: "",
    dropoffCountry: "",
    dropoffState: "",
    dropoffCity: "",
    tripType: "round-trip",
    pickupDate: "",
    dropoffDate: "",
  });
  const [availableStates, setAvailableStates] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [availableDropoffStates, setAvailableDropoffStates] = useState([]);
  const [availableDropoffCities, setAvailableDropoffCities] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [errors, setErrors] = useState({});
  const [showCrossBorderWarning, setShowCrossBorderWarning] = useState(false);
  const [pendingDropoffCountry, setPendingDropoffCountry] = useState(null);
  const navigate = useNavigate();

  // Refs for dropdowns
  const pickupCountryRef = useRef(null);
  const pickupStateRef = useRef(null);
  const pickupCityRef = useRef(null);
  const dropoffCountryRef = useRef(null);
  const dropoffStateRef = useRef(null);
  const dropoffCityRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const refs = [
        pickupCountryRef,
        pickupStateRef,
        pickupCityRef,
        dropoffCountryRef,
        dropoffStateRef,
        dropoffCityRef,
      ];
      const clickedOutside = refs.every(
        (ref) => ref.current && !ref.current.contains(event.target),
      );
      if (clickedOutside) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/signin");
    }
  }, [user, navigate]);

  useEffect(() => {
    const car = localStorage.getItem("selectedCar");
    if (car) setSelectedCar(JSON.parse(car));

    const saved = localStorage.getItem("bookingData");
    if (saved) {
      const parsed = JSON.parse(saved);

      // Map the saved data structure to formData structure
      setFormData({
        country: parsed.pickupCountry || "",
        state: parsed.pickupState || "",
        city: parsed.pickupCity || "",
        dropoffCountry: parsed.dropoffCountry || "",
        dropoffState: parsed.dropoffState || "",
        dropoffCity: parsed.dropoffCity || "",
        tripType: parsed.tripType || "round-trip",
        pickupDate: parsed.pickupDate || "",
        dropoffDate: parsed.dropoffDate || "",
      });

      // Load states and cities for saved data
      if (parsed.pickupCountry) {
        const states = Object.keys(locationData[parsed.pickupCountry] || {});
        setAvailableStates(states);
        if (parsed.pickupState) {
          const cities =
            locationData[parsed.pickupCountry]?.[parsed.pickupState] || [];
          setAvailableCities(cities);
        }
      }
      if (parsed.dropoffCountry) {
        const states = Object.keys(locationData[parsed.dropoffCountry] || {});
        setAvailableDropoffStates(states);
        if (parsed.dropoffState) {
          const cities =
            locationData[parsed.dropoffCountry]?.[parsed.dropoffState] || [];
          setAvailableDropoffCities(cities);
        }
      }
    }
  }, []);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 1);
  const maxDateStr = maxDate.toISOString().split("T")[0];
  const currentYear = today.getFullYear();

  // Get unique countries list
  const countries = Object.keys(locationData);

  // Get available dropoff countries based on pickup country (only same country allowed)
  const getAvailableDropoffCountries = () => {
    if (formData.country) {
      return [formData.country]; // Only the same country as pickup
    }
    return countries; // All countries before pickup is selected
  };

  // Handle country change for pickup
  function handleCountryChange(value) {
    const states = Object.keys(locationData[value] || {});
    setAvailableStates(states);
    setAvailableCities([]);

    // Reset dropoff to same country
    setFormData({
      ...formData,
      country: value,
      state: "",
      city: "",
      dropoffCountry: value,
      dropoffState: "",
      dropoffCity: "",
    });

    // Load states for dropoff (same country)
    const dropoffStates = Object.keys(locationData[value] || {});
    setAvailableDropoffStates(dropoffStates);
    setAvailableDropoffCities([]);

    if (errors.country) setErrors({ ...errors, country: "" });
  }

  // Handle state change for pickup
  function handleStateChange(value) {
    const cities = locationData[formData.country]?.[value] || [];
    setAvailableCities(cities);
    setFormData({
      ...formData,
      state: value,
      city: "",
    });
    if (errors.state) setErrors({ ...errors, state: "" });
  }

  // Handle country change for dropoff with warning
  function handleDropoffCountryChange(value) {
    // Check if trying to select a different country
    if (formData.country && value !== formData.country) {
      setPendingDropoffCountry(value);
      setShowCrossBorderWarning(true);
      return;
    }

    // If same country, proceed normally
    const states = Object.keys(locationData[value] || {});
    setAvailableDropoffStates(states);
    setAvailableDropoffCities([]);
    setFormData({
      ...formData,
      dropoffCountry: value,
      dropoffState: "",
      dropoffCity: "",
    });
    if (errors.dropoffCountry) setErrors({ ...errors, dropoffCountry: "" });
  }

  // Handle dropoff country after warning confirmation
  function handleCrossBorderConfirm() {
    // Reset to pickup country
    const states = Object.keys(locationData[formData.country] || {});
    setAvailableDropoffStates(states);
    setAvailableDropoffCities([]);
    setFormData({
      ...formData,
      dropoffCountry: formData.country,
      dropoffState: "",
      dropoffCity: "",
    });
    setShowCrossBorderWarning(false);
    setPendingDropoffCountry(null);
  }

  // Handle state change for dropoff
  function handleDropoffStateChange(value) {
    const cities = locationData[formData.dropoffCountry]?.[value] || [];
    setAvailableDropoffCities(cities);
    setFormData({
      ...formData,
      dropoffState: value,
      dropoffCity: "",
    });
    if (errors.dropoffState) setErrors({ ...errors, dropoffState: "" });
  }

  function handleReset() {
    setFormData({
      country: "",
      state: "",
      city: "",
      dropoffCountry: "",
      dropoffState: "",
      dropoffCity: "",
      tripType: "round-trip",
      pickupDate: "",
      dropoffDate: "",
    });
    setAvailableStates([]);
    setAvailableCities([]);
    setAvailableDropoffStates([]);
    setAvailableDropoffCities([]);
    setErrors({});
    localStorage.removeItem("bookingData");
    setSelectedCar(null);
    localStorage.removeItem("selectedCar");
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  }

  // Opens the native date picker on click anywhere in the field, not just
  // the small calendar icon. showPicker() is supported in Chrome/Edge 99+;
  // browsers without it (older Firefox/Safari) silently fall back to the
  // default behavior (click the icon), so this is a safe enhancement.
  function openDatePicker(e) {
    try {
      e.target.showPicker?.();
    } catch {
      // ignore — falls back to native icon-click behavior
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const {
      country,
      state,
      city,
      dropoffCountry,
      dropoffState,
      dropoffCity,
      pickupDate,
      dropoffDate,
    } = formData;
    const newErrors = {};

    // Validate pickup location
    if (!country) newErrors.country = "Please select a country.";
    if (!state) newErrors.state = "Please select a state.";
    if (!city) newErrors.city = "Please select a city.";

    // Validate dropoff location
    if (!dropoffCountry)
      newErrors.dropoffCountry = "Please select a dropoff country.";
    if (!dropoffState)
      newErrors.dropoffState = "Please select a dropoff state.";
    if (!dropoffCity) newErrors.dropoffCity = "Please select a dropoff city.";

    // Validate cross-border restriction
    if (country && dropoffCountry && country !== dropoffCountry) {
      newErrors.dropoffCountry = `Dropoff country must be ${country}. International rentals are not permitted.`;
    }

    // Format full location strings
    const pickupLocation = `${city}, ${state}, ${country}`;
    const dropoffLocation = `${dropoffCity}, ${dropoffState}, ${dropoffCountry}`;

    const pickup_ = new Date(pickupDate);
    const dropoff_ = new Date(dropoffDate);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    if (!pickupDate) {
      newErrors.pickupDate = "Please select a pickup date.";
    } else if (pickup_ < todayMidnight) {
      newErrors.pickupDate = "Pickup date cannot be in the past.";
    } else if (pickup_.getFullYear() !== currentYear) {
      newErrors.pickupDate = `Booking must be within ${currentYear}.`;
    }

    if (!dropoffDate) {
      newErrors.dropoffDate = "Please select a drop-off date.";
    } else if (dropoff_ <= pickup_) {
      newErrors.dropoffDate = "Drop-off must be at least 1 day after pickup.";
    } else if (dropoff_ > maxDate) {
      newErrors.dropoffDate = "Maximum rental period is 1 month.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const days = Math.ceil((dropoff_ - pickup_) / (1000 * 60 * 60 * 24));
    const bookingDataToSave = {
      pickup: pickupLocation,
      dropoff: dropoffLocation,
      pickupCountry: country,
      pickupState: state,
      pickupCity: city,
      dropoffCountry,
      dropoffState,
      dropoffCity,
      tripType: formData.tripType,
      pickupDate,
      dropoffDate,
      days,
      // Phase 2: Include car details if a car is selected
      ...(selectedCar
        ? {
            selectedCarId: selectedCar.id,
            selectedCarModel: selectedCar.model,
            selectedCarNumberPlate: selectedCar.numberPlate || "",
            selectedCarSafetyRating: selectedCar.safetyRating || 0,
            selectedCarEmergencyKit: selectedCar.emergencyKit || false,
            selectedCarGpsAvailable: selectedCar.gpsAvailable || false,
            selectedCarInsuranceInfo: selectedCar.insuranceInfo || "",
            selectedCarRcBook: selectedCar.rcBook || "",
            selectedCarPucCertificate: selectedCar.pucCertificate || "",
            selectedCarLastServiceDate: selectedCar.lastServiceDate || "",
          }
        : {}),
    };

    localStorage.setItem("bookingData", JSON.stringify(bookingDataToSave));
    navigate("/fleet");
  }

  // Dropdown render helper
  const renderDropdown = (
    type,
    items,
    value,
    onSelect,
    placeholder,
    ref,
    isDisabled = false,
  ) => {
    const isOpen = openDropdown === type;
    return (
      <div className="custom_select_container" ref={ref}>
        <div
          className={`location_select ${isOpen ? "active" : ""} ${isDisabled ? "disabled" : ""}`}
          onClick={() => !isDisabled && setOpenDropdown(isOpen ? null : type)}
          style={{
            opacity: isDisabled ? 0.5 : 1,
            cursor: isDisabled ? "not-allowed" : "pointer",
          }}
        >
          <span>{value || placeholder}</span>
          <ChevronIcon active={isOpen} />
        </div>
        {isOpen && !isDisabled && (
          <div className="custom_location_list">
            {items.map((item) => (
              <div
                key={item}
                className="location_option"
                onClick={() => {
                  onSelect(item);
                  setOpenDropdown(null);
                }}
              >
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const availableDropoffCountries = getAvailableDropoffCountries();
  const isDropoffDisabled = !formData.country;

  return (
    <main>
      <section className="booking_section">
        <div className="booking_wrapper">
          <div className="booking_left">
            <h1 className="qw_shine_heading">Book Your Ride Now!</h1>
            <p>
              Fill out the form below to reserve your vehicle.{" "}
              <strong>Quick Wheels</strong> offers a variety of vehicles to suit
              your needs.
            </p>
            <img src="/Images/Book Your Ride Now!.gif" alt="Car animation" />
          </div>

          <div className="input_field">
            <form onSubmit={handleSubmit}>
              {selectedCar && (
                <div className="selected_car_preview">
                  <div className="car_preview_header">
                    <p style={{ margin: 0 }}>
                      Selected Car:{" "}
                      <strong style={{ color: "#4ce3f7" }}>
                        {selectedCar.model}
                      </strong>
                    </p>
                    <p style={{ margin: 0 }}>
                      Price:{" "}
                      <strong style={{ color: "#22c55e" }}>
                        {selectedCar.price} USD/Day
                      </strong>
                    </p>
                  </div>

                  {/* Phase 2: Car Details */}
                  <div className="car_chip_row">
                    {selectedCar.numberPlate && (
                      <span className="car_chip plate">
                        <PlateIcon /> {selectedCar.numberPlate}
                      </span>
                    )}
                    {selectedCar.safetyRating > 0 && (
                      <span className="car_chip safety">
                        <StarIcon /> {selectedCar.safetyRating}/5 Safety
                      </span>
                    )}
                    {selectedCar.emergencyKit && (
                      <span className="car_chip kit">
                        <KitIcon /> Emergency Kit
                      </span>
                    )}
                    {selectedCar.gpsAvailable && (
                      <span className="car_chip gps">
                        <GpsIcon /> GPS
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Pickup Location Section */}
              <fieldset className="pickdrop">
                <legend style={{ marginBottom: "10px" }}>
                  <span className="legend_icon"><PinIcon /></span>
                  Pickup Location
                </legend>

                <div className="location_group">
                  <div className="location_field">
                    {renderDropdown(
                      "pickupCountry",
                      countries,
                      formData.country,
                      handleCountryChange,
                      "Select Country",
                      pickupCountryRef,
                    )}
                    {errors.country && (
                      <p className="field_error">{errors.country}</p>
                    )}
                  </div>

                  <div className="location_field">
                    {renderDropdown(
                      "pickupState",
                      availableStates,
                      formData.state,
                      handleStateChange,
                      "Select State",
                      pickupStateRef,
                      !formData.country,
                    )}
                    {errors.state && (
                      <p className="field_error">{errors.state}</p>
                    )}
                  </div>

                  <div className="location_field">
                    {renderDropdown(
                      "pickupCity",
                      availableCities,
                      formData.city,
                      (value) => {
                        setFormData({ ...formData, city: value });
                        if (errors.city) setErrors({ ...errors, city: "" });
                        setOpenDropdown(null);
                      },
                      "Select City",
                      pickupCityRef,
                      !formData.state,
                    )}
                    {errors.city && (
                      <p className="field_error">{errors.city}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Dropoff Location Section */}
              {/* Dropoff Location Section */}
              <fieldset className="pickdrop">
                <legend style={{ marginBottom: "10px" }}>
                  <span className="legend_icon"><PinIcon /></span>
                  Dropoff Location
                  {formData.country && (
                    <span
                      style={{
                        fontSize: "12px",
                        marginLeft: "10px",
                        fontWeight: "normal",
                      }}
                    >
                      (Must be same as pickup: {formData.country})
                    </span>
                  )}
                </legend>

                <div className="location_group">
                  <div className="location_field">
                    {renderDropdown(
                      "dropoffCountry",
                      availableDropoffCountries,
                      formData.dropoffCountry,
                      handleDropoffCountryChange,
                      "Select Country",
                      dropoffCountryRef,
                      isDropoffDisabled,
                    )}
                    {errors.dropoffCountry && (
                      <p className="field_error">{errors.dropoffCountry}</p>
                    )}
                  </div>

                  <div className="location_field">
                    {renderDropdown(
                      "dropoffState",
                      availableDropoffStates,
                      formData.dropoffState,
                      handleDropoffStateChange,
                      "Select State",
                      dropoffStateRef,
                      !formData.dropoffCountry,
                    )}
                    {errors.dropoffState && (
                      <p className="field_error">{errors.dropoffState}</p>
                    )}
                  </div>

                  <div className="location_field">
                    {renderDropdown(
                      "dropoffCity",
                      availableDropoffCities,
                      formData.dropoffCity,
                      (value) => {
                        setFormData({ ...formData, dropoffCity: value });
                        if (errors.dropoffCity)
                          setErrors({ ...errors, dropoffCity: "" });
                        setOpenDropdown(null);
                      },
                      "Select City",
                      dropoffCityRef,
                      !formData.dropoffState,
                    )}
                    {errors.dropoffCity && (
                      <p className="field_error">{errors.dropoffCity}</p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Trip Type */}
              {/* Trip Type - Side by side */}
              <div className="trip_type_container">
                <div className="trip_type_header">Trip Type</div>
                <div className="input-group trip-type">
                  <label>
                    <input
                      type="radio"
                      name="tripType"
                      value="round-trip"
                      checked={formData.tripType === "round-trip"}
                      onChange={handleChange}
                    />
                    Round Trip
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="tripType"
                      value="one-way"
                      checked={formData.tripType === "one-way"}
                      onChange={handleChange}
                    />
                    One Way
                  </label>
                </div>
              </div>

              {/* Dates */}
              <fieldset className="pickup-dropoff-dates">
                <div>
                  <label>Pick-Up Date</label>
                  <input
                    type="date"
                    name="pickupDate"
                    value={formData.pickupDate}
                    onChange={handleChange}
                    onClick={openDatePicker}
                    min={todayStr}
                    max={maxDateStr}
                    required
                  />
                  {errors.pickupDate && (
                    <p className="field_error">{errors.pickupDate}</p>
                  )}
                </div>
                <div>
                  <label>Drop-Off Date</label>
                  <input
                    type="date"
                    name="dropoffDate"
                    value={formData.dropoffDate}
                    onChange={handleChange}
                    onClick={openDatePicker}
                    min={formData.pickupDate || todayStr}
                    max={maxDateStr}
                    required
                  />
                  {errors.dropoffDate && (
                    <p className="field_error">{errors.dropoffDate}</p>
                  )}
                </div>
              </fieldset>

              <div className="form_buttons_container">
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleReset}
                    className="secondary_btn"
                  >
                    Reset
                  </button>
                  <button type="submit" className="form_btn btn">
                    Confirm
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Cross Border Warning Modal */}
      {showCrossBorderWarning && (
        <CrossBorderWarningModal
          pickupCountry={formData.country}
          onClose={() => {
            setShowCrossBorderWarning(false);
            setPendingDropoffCountry(null);
          }}
          onConfirm={handleCrossBorderConfirm}
        />
      )}
    </main>
  );
}

export default Booking;