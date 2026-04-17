import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import cars from '../data/cars';
import '../styles/fleet.css';  // Only import fleet.css, not cars.css

const categories = ["All", "Sedan", "Convertible", "SUV", "Luxury", "Pickup", "Van"];

function CarCard({ car, onSelect }) {
  return (
    <div className="fleet_card">
      <img className="fleet_card_image" src={car.image} alt={car.model} />
      <div className="fleet_card_info">
        <h3 className="fleet_card_model">{car.model}</h3>
        <div className="fleet_card_specs">
          <div className="fleet_spec_item">
            <img className="fleet_spec_icon" src="/Images/people.png" alt="Seats" />
            <span className="fleet_spec_text">{car.seats} Seats</span>
          </div>
          <div className="fleet_spec_item">
            <img className="fleet_spec_icon" src="/Images/travel-luggage.png" alt="Bags" />
            <span className="fleet_spec_text">{car.bags}</span>
          </div>
          <div className="fleet_spec_item">
            <img className="fleet_spec_icon" src="/Images/transmission.png" alt="Transmission" />
            <span className="fleet_spec_text">{car.transmission}</span>
          </div>
          <div className="fleet_spec_item">
            <img className="fleet_spec_icon" src="/Images/fuel.png" alt="Range" />
            <span className="fleet_spec_text">{car.range}</span>
          </div>
        </div>
        <p className="fleet_card_cost">${car.price} USD/Day</p>
        <button className="fleet_book_btn btn" onClick={() => onSelect(car)}>Book Now</button>
      </div>
    </div>
  );
}

function Fleet() {
  const [activeCategory, setActiveCategory] = useState("All");
  const navigate = useNavigate();

  const filteredCars = activeCategory === "All"
    ? cars
    : cars.filter(car => car.type === activeCategory);

  function handleSelectCar(car) {
    localStorage.setItem('selectedCar', JSON.stringify(car));
    navigate('/addons');
  }

  return (
    <section className="fleet_section">
      <h2 className="fleet_title">Select Your Ride!</h2>

      <div className="fleet_categories">
        {categories.map(cat => (
          <button
            key={cat}
            className={`fleet_category_btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="fleet_cards_wrapper">
        {filteredCars.map(car => (
          <CarCard key={car.id} car={car} onSelect={handleSelectCar} />
        ))}
      </div>
    </section>
  );
}

export default Fleet;