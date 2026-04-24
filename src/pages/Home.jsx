import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackToTop from "../components/BackToTop";
import "../styles/home.css";
import "../styles/about.css";
import "../styles/cars.css";
import "../styles/how.css";
import "../styles/footer.css";
import "../styles/reviews.css";
import "../styles/location.css";
import "../styles/contact.css";
import "../styles/scroll.css";

const reviews = [
  {
    id: 1,
    name: "Sarah Johnson",
    location: "Los Angeles, CA",
    image: "/Images/Customers/Sarah Johnson.jpg",
    review:
      "Quick Wheels exceeded my expectations! The booking process was seamless, and the car was in excellent condition.",
  },
  {
    id: 2,
    name: "Robert Wilson",
    location: "Denver, CO",
    image: "/Images/Customers/Robert Wilson.jpg",
    review:
      "Quick Wheels provided excellent service from start to finish. The vehicle was in great condition, and the staff were very professional.",
  },
  {
    id: 3,
    name: "Emily Davis",
    location: "Chicago, IL",
    image: "/Images/Customers/Emily Davis.jpg",
    review:
      "I loved the convenience of Quick Wheels. The car was clean and well-maintained, and the pickup and drop-off process was super smooth.",
  },
  {
    id: 4,
    name: "Jessica Lee",
    location: "Seattle, WA",
    image: "/Images/Customers/Jessica Lee.jpg",
    review:
      "The customer service at Quick Wheels is top-notch! The team went beyond to ensure we had a great experience.",
  },
  {
    id: 5,
    name: "David Martinez",
    location: "Miami, FL",
    image: "/Images/Customers/David Martinez.jpg",
    review:
      "Quick Wheels made our weekend getaway stress-free. The online booking was simple, and the rates were very competitive.",
  },
  {
    id: 6,
    name: "Daniel Garcia",
    location: "Houston, TX",
    image: "/Images/Customers/Daniel Garcia.jpg",
    review:
      "I had a great experience renting with Quick Wheels. The car selection was impressive, and the rates were very reasonable.",
  },
  {
    id: 7,
    name: "Amanda Thompson",
    location: "Boston, MA",
    image: "/Images/Customers/Amanda Thompson.jpg",
    review:
      "Renting a car has never been this easy! Quick Wheels offers an exceptional service that is both convenient and affordable.",
  },
  {
    id: 8,
    name: "Michael Brown",
    location: "New York, NY",
    image: "/Images/Customers/Michael Brown.png",
    review:
      "Amazing service! The staff were friendly, helpful and the car was perfect for our family vacation.",
  },
  {
    id: 9,
    name: "Lisa Nguyen",
    location: "San Francisco, CA",
    image: "/Images/Customers/Lisa Nguyen.jpg",
    review:
      "This was my first time renting from Quick Wheels, and I was very impressed. The process was straightforward.",
  },
  {
    id: 10,
    name: "James Anderson",
    location: "Las Vegas, NV",
    image: "/Images/Customers/James Anderson.jpg",
    review:
      "Fantastic service and a great selection of cars! Quick Wheels made our trip to Las Vegas a memorable one.",
  },
];

const locations = [
  {
    id: "amsterdam",
    city: "Amsterdam, Netherlands",
    address: "1234 Canal Street, Amsterdam, Netherlands",
    email: "contact.amsterdam@quickwheels.com",
    phone: "+31-20-123-4567",
    image: "/Images/Locations/Amsterdam, Netherlands.jpg",
  },
  {
    id: "bangkok",
    city: "Bangkok, Thailand",
    address: "5678 Sukhumvit Road, Bangkok, Thailand",
    email: "contact.bangkok@quickwheels.com",
    phone: "+66-2-987-6543",
    image: "/Images/Locations/Bangkok, Thailand.jpg",
  },
  {
    id: "barcelona",
    city: "Barcelona, Spain",
    address: "90 La Rambla, Barcelona, Spain",
    email: "contact.barcelona@quickwheels.com",
    phone: "+34-93-456-7890",
    image: "/Images/Locations/Barcelona, Spain.jpg",
  },
  {
    id: "berlin",
    city: "Berlin, Germany",
    address: "23 Unter den Linden, Berlin, Germany",
    email: "contact.berlin@quickwheels.com",
    phone: "+49-30-123-4567",
    image: "/Images/Locations/Berlin, Germany.jpg",
  },
  {
    id: "boston",
    city: "Boston, MA, USA",
    address: "12 Beacon Street, Boston, MA, USA",
    email: "contact.boston@quickwheels.com",
    phone: "+1-617-555-1212",
    image: "/Images/Locations/Boston, MA, USA.jpg",
  },
  {
    id: "buenosaires",
    city: "Buenos Aires, Argentina",
    address: "456 Avenida de Mayo, Buenos Aires",
    email: "contact.buenosaires@quickwheels.com",
    phone: "+54-11-5555-1234",
    image: "/Images/Locations/Buenos Aires, Argentina.jpg",
  },
  {
    id: "chicago",
    city: "Chicago, IL, USA",
    address: "789 Michigan Avenue, Chicago, IL, USA",
    email: "contact.chicago@quickwheels.com",
    phone: "+1-312-555-5678",
    image: "/Images/Locations/Chicago, IL, USA.jpg",
  },
  {
    id: "dubai",
    city: "Dubai, UAE",
    address: "100 Sheikh Zayed Road, Dubai, UAE",
    email: "contact.dubai@quickwheels.com",
    phone: "+971-4-123-4567",
    image: "/Images/Locations/Dubai, UAE.jpg",
  },
  {
    id: "hongkong",
    city: "Hong Kong, China",
    address: "345 Nathan Road, Hong Kong",
    email: "contact.hongkong@quickwheels.com",
    phone: "+852-1234-5678",
    image: "/Images/Locations/Hong Kong, China.jpg",
  },
  {
    id: "istanbul",
    city: "Istanbul, Turkey",
    address: "789 Istiklal Street, Istanbul",
    email: "contact.istanbul@quickwheels.com",
    phone: "+90-212-555-6789",
    image: "/Images/Locations/Istanbul, Turkey.jpg",
  },
  {
    id: "lasvegas",
    city: "Las Vegas, NV, USA",
    address: "456 Strip Avenue, Las Vegas, NV",
    email: "contact.lasvegas@quickwheels.com",
    phone: "+1-702-555-7890",
    image: "/Images/Locations/Las Vegas, NV, USA.jpg",
  },
  {
    id: "london",
    city: "London, UK",
    address: "10 Downing Street, London, UK",
    email: "contact.london@quickwheels.com",
    phone: "+44-20-1234-5678",
    image: "/Images/Locations/London, UK.jpg",
  },
  {
    id: "losangeles",
    city: "Los Angeles, CA, USA",
    address: "123 Hollywood Blvd, Los Angeles",
    email: "contact.losangeles@quickwheels.com",
    phone: "+1-323-555-6789",
    image: "/Images/Locations/Los Angeles, CA, USA.jpg",
  },
  {
    id: "madrid",
    city: "Madrid, Spain",
    address: "789 Gran Via, Madrid, Spain",
    email: "contact.madrid@quickwheels.com",
    phone: "+34-91-555-6789",
    image: "/Images/Locations/Madrid, Spain.jpg",
  },
  {
    id: "mexicocity",
    city: "Mexico City, Mexico",
    address: "456 Paseo de la Reforma, Mexico City",
    email: "contact.mexicocity@quickwheels.com",
    phone: "+52-55-5555-1234",
    image: "/Images/Locations/Mexico City, Mexico.jpg",
  },
  {
    id: "miami",
    city: "Miami, FL, USA",
    address: "123 Ocean Drive, Miami, FL, USA",
    email: "contact.miami@quickwheels.com",
    phone: "+1-305-555-1212",
    image: "/Images/Locations/Miami, FL, USA.jpg",
  },
  {
    id: "newyork",
    city: "New York, NY, USA",
    address: "789 Fifth Avenue, New York, NY",
    email: "contact.newyork@quickwheels.com",
    phone: "+1-212-555-6789",
    image: "/Images/Locations/New York, NY, USA.jpg",
  },
  {
    id: "paris",
    city: "Paris, France",
    address: "56 Rue de Rivoli, Paris, France",
    email: "contact.paris@quickwheels.com",
    phone: "+33-1-2345-6789",
    image: "/Images/Locations/Paris, France.jpg",
  },
  {
    id: "rome",
    city: "Rome, Italy",
    address: "89 Via Condotti, Rome, Italy",
    email: "contact.rome@quickwheels.com",
    phone: "+39-06-555-6789",
    image: "/Images/Locations/Rome, Italy.jpg",
  },
  {
    id: "sanfrancisco",
    city: "San Francisco, CA, USA",
    address: "678 Lombard Street, San Francisco",
    email: "contact.sanfrancisco@quickwheels.com",
    phone: "+1-415-555-6789",
    image: "/Images/Locations/San Francisco, CA, USA.jpg",
  },
  {
    id: "saopaulo",
    city: "Sao Paulo, Brazil",
    address: "Avenida Paulista 1578, São Paulo",
    email: "contact.saopaulo@quickwheels.com",
    phone: "+55-11-5555-1234",
    image: "/Images/Locations/Sao Paulo, Brazil.jpg",
  },
  {
    id: "seattle",
    city: "Seattle, WA, USA",
    address: "1501 4th Avenue, Seattle, WA",
    email: "contact.seattle@quickwheels.com",
    phone: "+1-206-555-0123",
    image: "/Images/Locations/Seattle, WA, USA.jpg",
  },
  {
    id: "singapore",
    city: "Singapore",
    address: "101 Orchard Road, Singapore",
    email: "contact.singapore@quickwheels.com",
    phone: "+65-1234-5678",
    image: "/Images/Locations/Singapore, Singapore.jpg",
  },
  {
    id: "sydney",
    city: "Sydney, Australia",
    address: "321 George Street, Sydney",
    email: "contact.sydney@quickwheels.com",
    phone: "+61-2-555-6789",
    image: "/Images/Locations/Sydney, Australia.jpg",
  },
  {
    id: "tokyo",
    city: "Tokyo, Japan",
    address: "123 Shibuya Crossing, Tokyo",
    email: "contact.tokyo@quickwheels.com",
    phone: "+81-3-5555-1234",
    image: "/Images/Locations/Tokyo, Japan.jpg",
  },
  {
    id: "toronto",
    city: "Toronto, Canada",
    address: "789 Yonge Street, Toronto",
    email: "contact.toronto@quickwheels.com",
    phone: "+1-416-555-1212",
    image: "/Images/Locations/Toronto, Canada.jpg",
  },
  {
    id: "venice",
    city: "Venice, Italy",
    address: "190 Piazza San Marco, Venice",
    email: "contact.venice@quickwheels.com",
    phone: "+39-041-555-6789",
    image: "/Images/Locations/Venice, Italy.jpg",
  },
  {
    id: "vienna",
    city: "Vienna, Austria",
    address: "Stephansplatz 1, Vienna",
    email: "contact.vienna@quickwheels.com",
    phone: "+43-1-555-6789",
    image: "/Images/Locations/Vienna, Austria.jpg",
  },
  {
    id: "washington",
    city: "Washington, D.C., USA",
    address: "1600 Pennsylvania Avenue NW",
    email: "contact.washington@quickwheels.com",
    phone: "+1-202-555-6789",
    image: "/Images/Locations/Washington, D.C., USA.jpg",
  },
  {
    id: "zurich",
    city: "Zurich, Switzerland",
    address: "Bahnhofstrasse 64, Zurich",
    email: "contact.zurich@quickwheels.com",
    phone: "+41-44-555-6789",
    image: "/Images/Locations/Zurich, Switzerland.jpg",
  },
];

const handleSubmit = (e) => {
  setTimeout(() => {
    e.target.reset(); // clears all fields
  }, 100); // small delay ensures submission completes
};

function Home() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const scroll = setInterval(() => {
      if (
        container.scrollLeft + container.clientWidth >=
        container.scrollWidth
      ) {
        container.scrollLeft = 0; // reset to start
      } else {
        container.scrollLeft += 1; // scroll 1px at a time
      }
    }, 20); // every 20ms = smooth

    return () => clearInterval(scroll); // cleanup
  }, []);

  return (
    <main>
      {/* Hero Section */}
      <section id="home" className="home_page">
        <div className="overlay">
          <p className="main_title">
            Welcome to <strong>Quick Wheels!</strong>
          </p>
          <p className="subtitle">
            Ready to hit the road? You're at the right place! Discover the
            freedom and convenience of car rental with{" "}
            <strong>Quick Wheels</strong>—your trusted partner for a safe and
            easy travel experience!
          </p>
          <button className="book_btn btn" onClick={() => navigate("/booking")}>
            Book Now!
          </button>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about_section">
        <div className="about_img">
          <img src="/Images/about.jpg" alt="about" />
        </div>
        <div className="about_info">
          <h1 className="about_title">About Us</h1>
          <hr className="blueline1" />
          <h2 className="about_subtitle">
            "Drive Your Way with <strong>Quick Wheels</strong>"
          </h2>
          <div className="about_para">
            <p>
              At <strong>Quick Wheels</strong>, we offer a diverse fleet to suit
              every need. From compact, fuel-efficient city cars to eco-friendly
              electric and hybrid models, we have the perfect vehicle for you.
              For those seeking luxury, our premium vehicles from renowned
              manufacturers provide style and comfort.
            </p>
            <p>
              More than just a car rental service, <strong>Quick Wheels</strong>{" "}
              empowers you with flexible options for rideshare driving, allowing
              you to be your own boss. Enjoy top-notch customer service and
              well-maintained vehicles.
            </p>
          </div>
          <button className="about_btn btn" onClick={() => navigate("/about")}>
            Read More
          </button>
        </div>
      </section>

      {/* Explore Fleet Section */}
      <section id="cars" className="our_cars">
        <div className="cars_content">
          <div className="car_info">
            <h2 className="cars_title">
              <strong>Explore Our Fleet</strong>
            </h2>
            <p className="cars_description">
              At <strong>Quick Wheels</strong>, we offer a wide variety of
              vehicles to suit every need and occasion. Whether you're looking
              for a reliable car for your daily commute, a spacious vehicle for
              a family trip, or something stylish for a special event, we have
              you covered. <br />
              Our fleet is carefully maintained and regularly updated to ensure
              you have access to the latest models, complete with advanced
              safety features and modern comforts. With our extensive selection,
              you can easily find a vehicle that meets your requirements and
              enjoy a smooth, comfortable driving experience.
            </p>
            <div className="download_options">
              <a href="#play_store">
                <img
                  className="download_option"
                  src="/Images/playstore.png"
                  alt="Play Store"
                />
              </a>
              <a href="#app_store">
                <img
                  className="download_option"
                  src="/Images/appstore.png"
                  alt="App Store"
                />
              </a>
            </div>
            <hr className="blueline2" />
          </div>

          <div className="car_on_right">
            <img src="/Images/Untitled design (1).png" alt="car" />
          </div>
        </div>

        <div className="cars_types">
          {[
            { type: "Sedan", img: "/Images/Sedan/mazda3.png" },
            { type: "SUVs", img: "/Images/SUV/mazda_cx5.png" },
            {
              type: "Convertible",
              img: "/Images/Convertible/audi-A5-cabriolet.png",
            },
            {
              type: "Pickup Trucks 4x4",
              img: "/Images/Pickup Trucks/ram_trx2.png",
            },
            { type: "Van", img: "/Images/Van/ford_transit.png" },
            { type: "Luxury Cars", img: "/Images/Luxury/s-class.png" },
          ].map((car) => (
            <div
              key={car.type}
              className={car.type.toUpperCase().replace(/\s+/g, "")}
              onClick={() => navigate("/fleet")}
            >
              <img className="car_img" src={car.img} alt={car.type} />
              <p>
                <strong>{car.type}</strong>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how_it_works" className="how_it_works_section">
        <h2 className="section_title">How It Works</h2>
        <hr className="blueline3" />
        <p className="section_description">
          Renting a car with <strong>Quick Wheels</strong> is easier than ever
          before. Our streamlined process ensures you can book the perfect car
          with just a few clicks. Follow these simple steps to get on the road
          in no time and enjoy a hassle-free experience that lets you focus on
          your journey. Whether you're planning a weekend getaway or need a car
          for daily commutes, <strong>Quick Wheels</strong> makes it simple,
          fast, and convenient.
        </p>

        <div className="steps_container">
          {[
            {
              step: "Step 1: Choose Your Car",
              img: "/Images/elegant-couple-car-salon.jpg",
              desc: "Browse our extensive fleet of vehicles and select the car that suits your needs best. From sedans to SUVs, we have it all!",
            },
            {
              step: "Step 2: Book Your Car",
              img: "/Images/young-couple-choosing-car-car-show-room.jpg",
              desc: "Fill in your details and choose your rental dates. Our booking process is quick and hassle-free.",
            },
            {
              step: "Step 3: Pick Up Your Car",
              img: "/Images/stylish-elegant-woman-car-salon.jpg",
              desc: "Visit our location, present your booking confirmation, and pick up your car. You're ready to hit the road!",
            },
            {
              step: "Step 4: Enjoy Your Drive",
              img: "/Images/smiley-businesswoman-driving-her-car-city.jpg",
              desc: "Enjoy your journey with our well-maintained vehicles. Drive with confidence and comfort.",
            },
          ].map((item) => (
            <div key={item.step} className="step_card">
              <img src={item.img} alt={item.step} className="step_image" />
              <div className="step_content">
                <h3 className="step_title">{item.step}</h3>
                <p className="step_description">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="review_section" id="reviews">
        <h2 className="review_title">What Our Customers Say</h2>
        <hr className="blueline4" />
        <p className="review_description">
          Hear from our satisfied customers who have enjoyed a smooth and
          hassle-free car rental experience with <strong>Quick Wheels.</strong>
        </p>

        <div className="reviews_container_wrapper">
          <div
            ref={scrollRef}
            className="reviews_container"
            style={{
              display: "flex",
              overflowX: "hidden",
              gap: "20px",
              padding: "20px 0",
            }}
          >
            {/* duplicate reviews for seamless loop */}
            {[...reviews, ...reviews].map((r, index) => (
              <div
                key={index}
                className="review_card"
                style={{ minWidth: "300px", flexShrink: 0 }}
              >
                <div className="review_content">
                  <img className="customer_image" src={r.image} alt={r.name} />
                  <h3 className="customer_name">{r.name}</h3>
                  <p className="customer_location">{r.location}</p>
                  <div className="star_rating">⭐⭐⭐⭐⭐</div>
                  <p className="customer_review">"{r.review}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="review_image">
          <img src="/Images/Google-Review-Logo.png" alt="Google Reviews" />
        </div>
      </section>

      {/* Locations Section */}
      <section className="location" id="locations">
        <div className="location_content">
          <div className="location_head">
            <h1 className="location_title">Where Are We?</h1>
            <p className="location_description">
              "With service stations located across the country, we're always
              nearby to serve you. Whether you're in the heart of New York City,
              the sunny streets of Los Angeles, or any of our other convenient
              locations, our team is ready to provide exceptional service.
              Explore our interactive map to find the nearest station, or check
              out the list below for a location closest to you."
            </p>
          </div>

          <div className="locations">
            <h2>Our Service Locations</h2>
            <hr />
            <ul>
              {locations.map((loc) => (
                <li key={loc.id}>
                  <a
                    href={`#${loc.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedLocation(loc);
                    }}
                  >
                    {loc.city}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Location Modal - Now using .card class */}
      {/* Location Modal */}
      {selectedLocation && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedLocation(null)}
        >
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedLocation(null)}
            >
              ×
            </button>
            <img
              src={selectedLocation.image}
              alt={selectedLocation.city}
              className="modal-image"
            />
            <h3>{selectedLocation.city}</h3>
            <hr /> {/* Optional divider for consistency */}
            <p>
              <b>Address:</b> {selectedLocation.address}
            </p>
            <p>
              <b>Email:</b> {selectedLocation.email}
            </p>
            <p>
              <b>Phone:</b> {selectedLocation.phone}
            </p>
            <button
              className="btn"
              onClick={() => {
                navigate("/booking")
                setSelectedLocation(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Book a Car Here
            </button>
          </div>
        </div>
      )}

      {/* Contact Section */}
      <section className="contact" id="contact">
        {/* Wrap the top text in a container so it doesn't break the flex layout */}
        <div className="contact_header_text">
          <h1 className="contact_title">Contact Us</h1>
          <hr className="blueline5" />
        </div>

        <div className="contact_info">
          <div className="contact_image">
            <p className="contact_description">
              <strong>We'd love to hear from you!</strong> Whether you have a
              question, feedback, or need support, feel free to reach out to us.
            </p>
            <img src="/Images/QUICK WHEELS (2).png" alt="contact" />
          </div>

          <div className="contact_content">
            <div className="contact_form">
              <h2>Send Us a Message</h2>
              <form action="https://formspree.io/f/mrbpgvzd" method="POST" onSubmit={handleSubmit}>
                <div className="form_group">
                  <input type="text" id="name" name="name" required />
                  <label htmlFor="name">Enter your Name</label>
                </div>
                <div className="form_group">
                  <input type="email" id="email" name="email" required />
                  <label htmlFor="email">Enter your Email</label>
                </div>
                <div className="form_group">
                  <textarea
                    id="message"
                    name="message"
                    rows="6"
                    required
                  ></textarea>
                  <label htmlFor="message">Enter your Message</label>
                </div>
                <button type="submit" className="submit_btn btn">
                  Send Message
                </button>
              </form>
            </div>
            <div className="social_links">
              <a
                className="social_icon"
                href="https://www.facebook.com"
                target="_blank"
                rel="noreferrer"
              >
                <img src="/Images/fb.png" alt="Facebook" />
              </a>
              <a
                className="social_icon"
                href="https://in.linkedin.com"
                target="_blank"
                rel="noreferrer"
              >
                <img src="/Images/linkedin.png" alt="LinkedIn" />
              </a>
              <a
                className="social_icon"
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
              >
                <img src="/Images/x.png" alt="Twitter" />
              </a>
              <a
                className="social_icon"
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
              >
                <img src="/Images/instagram.png" alt="Instagram" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <BackToTop />
    </main>
  );
}

export default Home;
