import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrency } from "../context/CurrencyContext";
import "../styles/addons.css";

/* ── Minimal inline icon set, same pattern as the Fleet page ── */
const IconBase = ({ children, size = 14, className = "", viewBox = "0 0 24 24" }) => (
  <svg
    className={`ad-icon ${className}`}
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const IconCheckCircle = (p) => (
  <IconBase {...p}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </IconBase>
);

const IconPlus = (p) => (
  <IconBase {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </IconBase>
);

const IconArrowRight = (p) => (
  <IconBase {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </IconBase>
);

const IconSparkles = (p) => (
  <IconBase {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </IconBase>
);

const addonsList = [
  {
    id: 1,
    name: "Child Safety Seats",
    price: 10,
    image: "/Images/child-safety-seat-back-car.jpg",
    description:
      "Different types of child safety seats to ensure safe travel for children.",
  },
  {
    id: 2,
    name: "Wi-Fi Hotspot",
    price: 8,
    image: "/Images/business-woman-using-smartphone-car.jpg",
    description: "Stay connected on the go with our portable Wi-Fi hotspot.",
  },
  {
    id: 3,
    name: "Roadside Assistance",
    price: 15,
    image: "/Images/roadside_assistance.jpeg",
    description:
      "24/7 roadside assistance, ready to help with any unexpected issues.",
  },
  {
    id: 4,
    name: "Insurance Package",
    price: 20,
    image:
      "/Images/insurance-agent-working-site-car-accident-claim-process-people-car-insurance-claim.jpg",
    description:
      "Additional insurance options including collision damage waiver and theft protection.",
  },
];

function Addons() {
  const { formatPrice } = useCurrency();
  // load previously selected addons from localStorage
  const [selectedAddons, setSelectedAddons] = useState(() => {
    const saved = localStorage.getItem("selectedAddons");
    return saved ? JSON.parse(saved) : [];
  });
  const navigate = useNavigate();

  function toggleAddon(addon) {
    const exists = selectedAddons.find((a) => a.id === addon.id);
    const updated = exists
      ? selectedAddons.filter((a) => a.id !== addon.id)
      : [...selectedAddons, addon];
    setSelectedAddons(updated);
    // save immediately on every toggle
    localStorage.setItem("selectedAddons", JSON.stringify(updated));
  }

  function handleProceed() {
    localStorage.setItem("selectedAddons", JSON.stringify(selectedAddons));
    navigate("/payment");
  }

  const totalPerDay = selectedAddons.reduce((sum, a) => sum + a.price, 0);

  return (
    <section className="addons-section">
      {/* Animated background — same drifting starfield + ambient glows as the Fleet page */}
      <div className="ad_stars" aria-hidden="true">
        <div className="ad_star_layer ad_star_layer_a"></div>
        <div className="ad_star_layer ad_star_layer_b"></div>
        <div className="ad_star_layer ad_star_layer_c"></div>
      </div>
      <div className="ad_ambient_a" aria-hidden="true"></div>
      <div className="ad_ambient_b" aria-hidden="true"></div>

      <h1 className="addons_title">Our Services &amp; Add-Ons</h1>
      <p className="addons_description">
        Enhance your drive with our top-notch services and add-ons.
      </p>

      <div id="addons-list">
        {addonsList.map((addon) => {
          const isSelected = !!selectedAddons.find((a) => a.id === addon.id);
          return (
            <div
              key={addon.id}
              className={`addon_card ${isSelected ? "addon_selected" : ""}`}
              onClick={() => toggleAddon(addon)}
            >
              <div className="addon_image_wrap">
                <img src={addon.image} alt={addon.name} className="addon_image" />
                {isSelected && (
                  <span className="addon_badge_selected ad-icon-row">
                    <IconCheckCircle size={11} /> Selected
                  </span>
                )}
              </div>
              <div className="addon_content">
                <h3 className="addon_title">{addon.name}</h3>
                <p className="addon_description">{addon.description}</p>
                <div className="addon_price_row">
                  <span className="addon_price">
                    +{formatPrice(addon.price)} <span>/Day</span>
                  </span>
                  <span className="addon_toggle_hint ad-icon-row">
                    {isSelected ? (
                      <>
                        <IconCheckCircle size={12} /> Added
                      </>
                    ) : (
                      <>
                        <IconPlus size={12} /> Add
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="addons_footer_row">
        {selectedAddons.length > 0 && (
          <div className="addons_summary_bar">
            <div className="addons_summary_left">
              <span className="addons_summary_label">Add-ons total</span>
              <span className="addons_summary_total">
                +{formatPrice(totalPerDay)} <span>/day</span>
              </span>
            </div>
            <span className="addons_summary_count ad-icon-row">
              <IconSparkles size={13} />
              {selectedAddons.length} selected
            </span>
          </div>
        )}

        <div className="buttons">
          <button className="skip_btn btn ad-icon-row" onClick={handleProceed}>
            Proceed to Payment <IconArrowRight size={15} />
          </button>
          <button
            className="skip_btn btn"
            onClick={() => {
              localStorage.setItem("selectedAddons", JSON.stringify([]));
              navigate("/payment");
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </section>
  );
}

export default Addons;