import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/addons.css";

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

  return (
    <section className="addons-section">
      <h1 className="addons_title">Our Services & Add-Ons</h1>
      <p className="addons_description">
        Enhance your drive with our top-notch services and add-ons.
      </p>

      <div id="addons-list">
        {addonsList.map((addon) => {
          const isSelected = selectedAddons.find((a) => a.id === addon.id);
          return (
            <div
              key={addon.id}
              className={`addon_card ${isSelected ? "addon_selected" : ""}`}
              onClick={() => toggleAddon(addon)}
              style={{ cursor: "pointer" }}
            >
              <img src={addon.image} alt={addon.name} className="addon_image" />
              <div className="addon_content">
                <h3 className="addon_title">{addon.name}</h3>
                <p className="addon_description">{addon.description}</p>
                <p>
                  <strong>+{addon.price} USD/Day</strong>
                </p>
                {isSelected && (
                  <p style={{ color: "green", fontWeight: "bold" }}>Selected</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="buttons">
        <button className="skip_btn btn" onClick={handleProceed}>
          Proceed to Payment
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
    </section>
  );
}

export default Addons;
