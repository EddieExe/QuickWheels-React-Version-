import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackToTop from "../components/BackToTop";
import { useAuth } from "../context/AuthContext";
import validateEmail from "../utils/emailValidator";
import AnimatedSection from "../components/AnimatedSection";
import ColorSpots from "../components/ColorSpots";
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

function FancyButtonFx() {
  return (
    <>
      <span className="qw_fancy_btn_fold"></span>
      <div className="qw_fancy_btn_points">
        {Array.from({ length: 10 }).map((_, i) => (
          <i key={i} className="qw_fancy_btn_point"></i>
        ))}
      </div>
    </>
  );
}

function Home() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const { user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [contactError, setContactError] = useState("");

  const handleContactSubmit = (e) => {
    const emailInput = e.target.email.value;
    const emailError = validateEmail(emailInput);
    if (emailError) {
      e.preventDefault();
      setContactError(emailError);
      return;
    }
    setContactError("");
    setTimeout(() => e.target.reset(), 100);
  };

  const handleSubmit = (e) => {
    setTimeout(() => {
      e.target.reset(); // clears all fields
    }, 100); // small delay ensures submission completes
  };

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
          <AnimatedSection>
            <p className="main_title">
              Welcome to <strong>QuickWheels!</strong>
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.2}>
            <p className="subtitle">
              Ready to hit the road? You're at the right place! Discover the
              freedom and convenience of car rental with{" "}
              <strong>Quick Wheels</strong>—your trusted partner for a safe and
              easy travel experience!
            </p>
            <button
              type="button"
              className="book_btn qw_fancy_btn"
              onClick={() => navigate("/booking")}
            >
              <FancyButtonFx />
              <span className="qw_fancy_btn_inner">
                <svg
                  className="qw_fancy_btn_icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                >
                  <polyline points="13.18 1.37 13.18 9.64 21.45 9.64 10.82 22.63 10.82 14.36 2.55 14.36 13.18 1.37"></polyline>
                </svg>
                Book Now!
              </span>
            </button>
          </AnimatedSection>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about_section">
        {/* Stars Background - Now at section level */}
        <div className="stars-container">
          <div id="stars"></div>
          <div id="stars2"></div>
          <div id="stars3"></div>
        </div>

        {/* ── Part 1: Eclipse hero panel ── */}
        <div className="about_hero">
          <div className="about_hero_ambient" aria-hidden="true"></div>
          <ColorSpots density="sparse" />
          <div className="about_eclipse_wrap" aria-hidden="true">
            <div className="about_eclipse_ring"></div>
          </div>
          <div className="about_warm_glow" aria-hidden="true"></div>

          <AnimatedSection className="about_hero_content">
            <p className="about_tagline text-gradient">
              Our promise is freedom, flexibility &amp; trust
            </p>
            <h1 className="about_hero_title qw_shine_heading">
              Drive your way with <b>QuickWheels</b>
            </h1>
          </AnimatedSection>
        </div>

        {/* ── Part 2: Offer / feature panel ── */}
        <div className="about_offer">
          <ColorSpots />

          <AnimatedSection className="about_badge_wrap">
            <span className="about_badge">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l1.6 4.9L18.5 8l-4.9 1.6L12 14.5l-1.6-4.9L5.5 8l4.9-1.1L12 2zM19 14l.9 2.7L22.5 17.5l-2.6.8L19 21l-.9-2.7-2.6-.8 2.6-.8L19 14zM5 14.5l.75 2.25L8 17.5l-2.25.75L5 20.5l-.75-2.25L2 17.5l2.25-.75L5 14.5z" />
              </svg>
              Who We Are
            </span>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <h2 className="about_offer_title qw_shine_heading">About Us</h2>
          </AnimatedSection>

          <AnimatedSection delay={0.15} className="about_para_wrap">
            <div className="about_para">
              <p>
                At <strong>Quick Wheels</strong>, we offer a diverse fleet to
                suit every need. From compact, fuel-efficient city cars to
                eco-friendly electric and hybrid models, we have the perfect
                vehicle for you. For those seeking luxury, our premium
                vehicles from renowned manufacturers provide style and
                comfort.
              </p>
              <p>
                More than just a car rental service,{" "}
                <strong>Quick Wheels</strong> empowers you with flexible
                options for rideshare driving, allowing you to be your own
                boss. Enjoy top-notch customer service and well-maintained
                vehicles.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2} className="about_features">
            <div className="about_feature_card">
              <div className="about_feature_art">
                <svg viewBox="0 0 400 200" fill="none" preserveAspectRatio="xMidYMid slice">
                  <path d="M10,50 C140,15 250,65 390,125" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                  <path d="M10,80 C140,45 250,95 390,155" stroke="rgba(255,255,255,0.11)" strokeWidth="1" />
                  <path d="M10,110 C140,80 250,125 390,180" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  <circle cx="335" cy="38" r="9" fill="#ffffff" opacity="0.9" />
                  <circle cx="55" cy="95" r="3.5" fill="#ffffff" opacity="0.65" />
                  <circle cx="115" cy="150" r="2.5" fill="#ffffff" opacity="0.5" />
                </svg>
              </div>
              <div className="about_feature_body">
                <h3 className="about_feature_title">A Fleet for Every Need</h3>
                <p className="about_feature_desc">
                  From fuel-efficient city cars to eco-friendly hybrids and
                  premium luxury models, our fleet is built to match your
                  exact journey.
                </p>
              </div>
            </div>

            <div className="about_feature_card">
              <div className="about_feature_art">
                <svg viewBox="0 0 400 200" fill="none" preserveAspectRatio="xMidYMid slice">
                  <path d="M200,200 L45,15" stroke="rgba(168,85,247,0.28)" strokeWidth="1" />
                  <path d="M200,200 L105,15" stroke="rgba(168,85,247,0.22)" strokeWidth="1" />
                  <path d="M200,200 L165,15" stroke="rgba(236,72,153,0.22)" strokeWidth="1" />
                  <path d="M200,200 L200,15" stroke="rgba(236,72,153,0.28)" strokeWidth="1" />
                  <path d="M200,200 L240,15" stroke="rgba(249,115,22,0.22)" strokeWidth="1" />
                  <path d="M200,200 L300,15" stroke="rgba(249,115,22,0.22)" strokeWidth="1" />
                  <path d="M200,200 L360,15" stroke="rgba(249,115,22,0.16)" strokeWidth="1" />
                  <circle cx="130" cy="42" r="5" fill="#a855f7" opacity="0.85" />
                  <circle cx="285" cy="60" r="3.5" fill="#ffffff" opacity="0.65" />
                  <circle cx="205" cy="95" r="2.5" fill="#ffffff" opacity="0.5" />
                </svg>
              </div>
              <div className="about_feature_body">
                <h3 className="about_feature_title">Flexible Rideshare Options</h3>
                <p className="about_feature_desc">
                  Be your own boss. Rent on your terms and drive for
                  rideshare platforms with flexible pickup and return
                  options.
                </p>
              </div>
            </div>

            <div className="about_feature_card">
              <div className="about_feature_art">
                <svg viewBox="0 0 400 200" fill="none" preserveAspectRatio="xMidYMid slice">
                  <path d="M0,65 C110,25 220,105 400,55" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
                  <path d="M0,105 C130,145 230,65 400,115" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <path d="M0,150 C160,180 260,120 400,160" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  <circle cx="55" cy="48" r="4.5" fill="#ffffff" opacity="0.7" />
                  <circle cx="335" cy="68" r="3.5" fill="#ffffff" opacity="0.6" />
                  <circle cx="255" cy="138" r="3" fill="#a855f7" opacity="0.75" />
                </svg>
              </div>
              <div className="about_feature_body">
                <h3 className="about_feature_title">Trusted &amp; Well-Maintained</h3>
                <p className="about_feature_desc">
                  Every vehicle is regularly inspected and serviced, backed
                  by a support team dedicated to a safe, worry-free trip.
                </p>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.3} className="about_cta_wrap">
            <button type="button" className="about_btn qw_fancy_btn" onClick={() => navigate("/about")}>
              <FancyButtonFx />
              <span className="qw_fancy_btn_inner">
                <svg
                  className="qw_fancy_btn_icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                >
                  <polyline points="13.18 1.37 13.18 9.64 21.45 9.64 10.82 22.63 10.82 14.36 2.55 14.36 13.18 1.37"></polyline>
                </svg>
                Read More
              </span>
            </button>
          </AnimatedSection>
        </div>
      </section>

      {/* Explore Fleet Section */}
      <section id="cars" className="our_cars">
        <div className="cars_ambient_a" aria-hidden="true"></div>
        <div className="cars_ambient_b" aria-hidden="true"></div>
        <ColorSpots />

        <AnimatedSection>
          <div className="cars_content">
            <div className="car_info">
              <div className="cars_badge_wrap">
                <span className="cars_badge">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2l1.6 4.9L18.5 8l-4.9 1.6L12 14.5l-1.6-4.9L5.5 8l4.9-1.1L12 2zM19 14l.9 2.7L22.5 17.5l-2.6.8L19 21l-.9-2.7-2.6-.8 2.6-.8L19 14zM5 14.5l.75 2.25L8 17.5l-2.25.75L5 20.5l-.75-2.25L2 17.5l2.25-.75L5 14.5z" />
                  </svg>
                  Our Fleet
                </span>
              </div>
              <h2 className="cars_title qw_shine_heading">
                Explore Our Fleet
              </h2>
              <p className="cars_description">
                At <strong>Quick Wheels</strong>, we offer a wide variety of
                vehicles to suit every need and occasion. Whether you're looking
                for a reliable car for your daily commute, a spacious vehicle
                for a family trip, or something stylish for a special event, we
                have you covered. <br />
                Our fleet is carefully maintained and regularly updated to
                ensure you have access to the latest models, complete with
                advanced safety features and modern comforts. With our extensive
                selection, you can easily find a vehicle that meets your
                requirements and enjoy a smooth, comfortable driving experience.
              </p>
              <div className="cars_download_options">
                <a href="#play_store" className="cars_store_btn">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    className="cars_store_icon"
                    viewBox="0 0 512 512"
                  >
                    <path d="M99.617 8.057a50.191 50.191 0 00-38.815-6.713l230.932 230.933 74.846-74.846L99.617 8.057zM32.139 20.116c-6.441 8.563-10.148 19.077-10.148 30.199v411.358c0 11.123 3.708 21.636 10.148 30.199l235.877-235.877L32.139 20.116zM464.261 212.087l-67.266-37.637-81.544 81.544 81.548 81.548 67.273-37.64c16.117-9.03 25.738-25.442 25.738-43.908s-9.621-34.877-25.749-43.907zM291.733 279.711L60.815 510.629c3.786.891 7.639 1.371 11.492 1.371a50.275 50.275 0 0027.31-8.07l266.965-149.372-74.849-74.847z" />
                  </svg>
                  <span className="cars_store_texts">
                    <span className="cars_store_text1">GET IT ON</span>
                    <span className="cars_store_text2">Google Play</span>
                  </span>
                </a>

                <a href="#app_store" className="cars_store_btn">
                  <svg
                    className="cars_store_icon"
                    fill="currentColor"
                    viewBox="-52.01 0 560.035 560.035"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M380.844 297.529c.787 84.752 74.349 112.955 75.164 113.314-.622 1.988-11.754 40.191-38.756 79.652-23.343 34.117-47.568 68.107-85.731 68.811-37.499.691-49.557-22.236-92.429-22.236-42.859 0-56.256 21.533-91.753 22.928-36.837 1.395-64.889-36.891-88.424-70.883-48.093-69.53-84.846-196.475-35.496-282.165 24.516-42.554 68.328-69.501 115.882-70.192 36.173-.69 70.315 24.336 92.429 24.336 22.1 0 63.59-30.096 107.208-25.676 18.26.76 69.517 7.376 102.429 55.552-2.652 1.644-61.159 35.704-60.523 106.559M310.369 89.418C329.926 65.745 343.089 32.79 339.498 0 311.308 1.133 277.22 18.785 257 42.445c-18.121 20.952-33.991 54.487-29.709 86.628 31.421 2.431 63.52-15.967 83.078-39.655" />
                  </svg>
                  <span className="cars_store_texts">
                    <span className="cars_store_text1">Download on the</span>
                    <span className="cars_store_text2">App Store</span>
                  </span>
                </a>
              </div>
              <hr className="blueline2" />
            </div>

            <div className="car_on_right">
              <div className="car_on_right_glow" aria-hidden="true"></div>
              <div className="sketchfab-embed-wrapper">
                <iframe 
                  title="Porsche GT3 RS" 
                  frameBorder="0" 
                  allowFullScreen 
                  mozallowfullscreen="true" 
                  webkitallowfullscreen="true" 
                  allow="autoplay; fullscreen; xr-spatial-tracking" 
                  xr-spatial-tracking 
                  execution-while-out-of-viewport 
                  execution-while-not-rendered 
                  web-share 
                  src="https://sketchfab.com/models/e738eae819c34d19a31dd066c45e0f3d/embed?ui_theme=dark&autostart=1&preload=1&transparent=1&ui_hint=0&controls=0&annotations_visible=0&dnt=1"
                  className="sketchfab-iframe"
                >
                </iframe>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
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
                className={`cars_type_card ${car.type.toUpperCase().replace(/\s+/g, "")}`}
                onClick={() => navigate("/fleet")}
              >
                <div className="cars_type_glow" aria-hidden="true"></div>
                <div className="cars_type_img_wrap">
                  <img className="car_img" src={car.img} alt={car.type} />
                </div>
                <p className="cars_type_label">
                  <strong>{car.type}</strong>
                </p>
                {/* <span className="cars_type_arrow" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span> */}
              </div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* How It Works Section */}
      <section id="how_it_works" className="how_it_works_section">
        <div className="how_ambient_a" aria-hidden="true"></div>
        <div className="how_ambient_b" aria-hidden="true"></div>
        <ColorSpots />

        <AnimatedSection className="how_badge_wrap">
          <span className="how_badge">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2l1.6 4.9L18.5 8l-4.9 1.6L12 14.5l-1.6-4.9L5.5 8l4.9-1.1L12 2zM19 14l.9 2.7L22.5 17.5l-2.6.8L19 21l-.9-2.7-2.6-.8 2.6-.8L19 14zM5 14.5l.75 2.25L8 17.5l-2.25.75L5 20.5l-.75-2.25L2 17.5l2.25-.75L5 14.5z" />
            </svg>
            The Process
          </span>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <h2 className="section_title qw_shine_heading">How It Works</h2>
          <hr className="blueline3" />
          <p className="section_description">
            Renting a car with <strong>Quick Wheels</strong> is easier than ever
            before. Our streamlined process ensures you can book the perfect car
            with just a few clicks. Follow these simple steps to get on the road
            in no time and enjoy a hassle-free experience that lets you focus on
            your journey. Whether you're planning a weekend getaway or need a
            car for daily commutes, <strong>Quick Wheels</strong> makes it
            simple, fast, and convenient.
          </p>
        </AnimatedSection>

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
          ].map((item, index) => (
            <AnimatedSection key={item.step} delay={index * 0.15}>
              <div className="step_card">
                <img src={item.img} alt={item.step} className="step_image" />
                <div className="step_content">
                  <h3 className="step_title">{item.step}</h3>
                  <p className="step_description">{item.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="review_section" id="reviews">
        <div className="review_ambient_a" aria-hidden="true"></div>
        <div className="review_ambient_b" aria-hidden="true"></div>
        <ColorSpots />

        <AnimatedSection className="review_badge_wrap">
          <span className="review_badge">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2l1.6 4.9L18.5 8l-4.9 1.6L12 14.5l-1.6-4.9L5.5 8l4.9-1.1L12 2zM19 14l.9 2.7L22.5 17.5l-2.6.8L19 21l-.9-2.7-2.6-.8 2.6-.8L19 14zM5 14.5l.75 2.25L8 17.5l-2.25.75L5 20.5l-.75-2.25L2 17.5l2.25-.75L5 14.5z" />
            </svg>
            Testimonials
          </span>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <h2 className="review_title qw_shine_heading">
            What Our Customers Say
          </h2>
          <hr className="blueline4" />
          <p className="review_description">
            Hear from our satisfied customers who have enjoyed a smooth and
            hassle-free car rental experience with{" "}
            <strong>Quick Wheels.</strong>
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
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
                    <img
                      className="customer_image"
                      src={r.image}
                      alt={r.name}
                    />
                    <h3 className="customer_name">{r.name}</h3>
                    <p className="customer_location">{r.location}</p>
                    <div className="star_rating">⭐⭐⭐⭐⭐</div>
                    <p className="customer_review">"{r.review}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.3}>
          <div className="review_image">
            <img src="/Images/Google-Review-Logo.png" alt="Google Reviews" />
          </div>
        </AnimatedSection>
      </section>

      {/* Locations Section */}
      <section className="location" id="locations">
        <div className="location_ambient_a" aria-hidden="true"></div>
        <div className="location_ambient_b" aria-hidden="true"></div>
        <ColorSpots />

        <AnimatedSection>
          <div className="location_content">
            <div className="location_head">
              <div className="location_badge_wrap">
                <span className="location_badge">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2l1.6 4.9L18.5 8l-4.9 1.6L12 14.5l-1.6-4.9L5.5 8l4.9-1.1L12 2zM19 14l.9 2.7L22.5 17.5l-2.6.8L19 21l-.9-2.7-2.6-.8 2.6-.8L19 14zM5 14.5l.75 2.25L8 17.5l-2.25.75L5 20.5l-.75-2.25L2 17.5l2.25-.75L5 14.5z" />
                  </svg>
                  Find Us
                </span>
              </div>
              <h2 className="location_title qw_shine_heading">
                Where Are We?
              </h2>
              <p className="location_description">
                "With service stations located across the country, we're always
                nearby to serve you. Whether you're in the heart of New York
                City, the sunny streets of Los Angeles, or any of our other
                convenient locations, our team is ready to provide exceptional
                service. Explore our interactive map to find the nearest
                station, or check out the list below for a location closest to
                you."
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
        </AnimatedSection>
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
                navigate("/booking");
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
        <div className="stars-container">
          <div id="stars"></div>
          <div id="stars2"></div>
          <div id="stars3"></div>
        </div>
        <ColorSpots />

        {/* Wrap the top text in a container so it doesn't break the flex layout */}
        <div className="contact_header_text">
          <div className="contact_badge_wrap">
            <span className="contact_badge">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l1.6 4.9L18.5 8l-4.9 1.6L12 14.5l-1.6-4.9L5.5 8l4.9-1.1L12 2zM19 14l.9 2.7L22.5 17.5l-2.6.8L19 21l-.9-2.7-2.6-.8 2.6-.8L19 14zM5 14.5l.75 2.25L8 17.5l-2.25.75L5 20.5l-.75-2.25L2 17.5l2.25-.75L5 14.5z" />
              </svg>
              Get In Touch
            </span>
          </div>
          <h1 className="contact_title qw_shine_heading">Contact Us</h1>
          <hr className="blueline5" />
        </div>

        <div className="contact_info">
          <div className="contact_image card">
            <p className="contact_description">
              <strong>We'd love to hear from you!</strong> Whether you have a
              question, feedback, or need support, feel free to reach out to us.
            </p>
            <img
              src="https://uiverse.io/astronaut.png"
              alt="Contact illustration"
              className="image"
            />
            <div className="heading">We're on Social Media</div>
            <div className="icons">
              <a href="https://www.instagram.com/uiverse.io/" className="instagram" target="_blank" rel="noreferrer">
                <svg
                  width="24"
                  height="25"
                  viewBox="0 0 24 25"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17.0459 7.5H17.0559M3.0459 12.5C3.0459 9.986 3.0459 8.73 3.3999 7.72C3.71249 6.82657 4.22237 6.01507 4.89167 5.34577C5.56096 4.67647 6.37247 4.16659 7.2659 3.854C8.2759 3.5 9.5329 3.5 12.0459 3.5C14.5599 3.5 15.8159 3.5 16.8269 3.854C17.7202 4.16648 18.5317 4.67621 19.201 5.34533C19.8702 6.01445 20.3802 6.82576 20.6929 7.719C21.0459 8.729 21.0459 9.986 21.0459 12.5C21.0459 15.014 21.0459 16.27 20.6929 17.28C20.3803 18.1734 19.8704 18.9849 19.2011 19.6542C18.5318 20.3235 17.7203 20.8334 16.8269 21.146C15.8169 21.5 14.5599 21.5 12.0469 21.5C9.5329 21.5 8.2759 21.5 7.2659 21.146C6.37268 20.8336 5.56131 20.324 4.89202 19.6551C4.22274 18.9862 3.71274 18.1751 3.3999 17.282C3.0459 16.272 3.0459 15.015 3.0459 12.501V12.5ZM15.8239 11.94C15.9033 12.4387 15.8829 12.9481 15.7641 13.4389C15.6453 13.9296 15.4304 14.392 15.1317 14.7991C14.833 15.2063 14.4566 15.5501 14.0242 15.8108C13.5917 16.0715 13.1119 16.2439 12.6124 16.318C12.1129 16.392 11.6037 16.3663 11.1142 16.2422C10.6248 16.1182 10.1648 15.8983 9.76082 15.5953C9.35688 15.2923 9.01703 14.9123 8.76095 14.4771C8.50486 14.0419 8.33762 13.5602 8.2689 13.06C8.13201 12.0635 8.39375 11.0533 8.99727 10.2487C9.6008 9.44407 10.4974 8.91002 11.4923 8.76252C12.4873 8.61503 13.5002 8.86599 14.3112 9.46091C15.1222 10.0558 15.6658 10.9467 15.8239 11.94Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </a>
              <a href="https://twitter.com/uiverse_io" className="x" target="_blank" rel="noreferrer">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M19.8003 3L13.5823 10.105L19.9583 19.106C20.3923 19.719 20.6083 20.025 20.5983 20.28C20.594 20.3896 20.5657 20.4969 20.5154 20.5943C20.4651 20.6917 20.3941 20.777 20.3073 20.844C20.1043 21 19.7293 21 18.9793 21H17.2903C16.8353 21 16.6083 21 16.4003 20.939C16.2168 20.8847 16.0454 20.7957 15.8953 20.677C15.7253 20.544 15.5943 20.358 15.3313 19.987L10.6813 13.421L4.64033 4.894C4.20733 4.281 3.99033 3.975 4.00033 3.72C4.00478 3.61035 4.03323 3.50302 4.08368 3.40557C4.13414 3.30812 4.20536 3.22292 4.29233 3.156C4.49433 3 4.87033 3 5.62033 3H7.30833C7.76333 3 7.99033 3 8.19733 3.061C8.38119 3.1152 8.55295 3.20414 8.70333 3.323C8.87333 3.457 9.00433 3.642 9.26733 4.013L13.5833 10.105M4.05033 21L10.6823 13.421"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </a>
              <a href="https://discord.gg/KD8ba2uUpT" className="discord" target="_blank" rel="noreferrer">
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 25 25"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.5989 6.5003H14.2919C14.3851 6.5003 14.4764 6.47427 14.5555 6.42515C14.6347 6.37603 14.6985 6.30577 14.7399 6.2223L15.4179 4.8543C15.4664 4.75358 15.5488 4.67313 15.6506 4.62706C15.7524 4.58098 15.8673 4.57222 15.9749 4.6023C16.6309 4.7903 18.0049 5.2433 19.1029 6.0003C22.9669 8.8973 22.6069 15.3903 22.5779 16.7603C22.5765 16.8444 22.5541 16.9269 22.5129 17.0003C20.5299 20.5003 17.0899 20.5003 17.0899 20.5003L15.9239 18.0743M15.9239 18.0743C16.4479 17.9163 17.0029 17.7253 17.6029 17.5003M15.9239 18.0743C13.4799 18.8093 11.7219 18.8083 9.27791 18.0733M13.5989 6.5003H10.9109C10.8179 6.50039 10.7266 6.47451 10.6475 6.42557C10.5683 6.37664 10.5044 6.30659 10.4629 6.2233L9.77991 4.8533C9.73146 4.75279 9.64925 4.6725 9.54762 4.62644C9.446 4.58038 9.33142 4.57148 9.22391 4.6013C8.56891 4.7893 7.19291 5.2433 6.09391 6.0003C2.23091 8.8973 2.59091 15.3903 2.61991 16.7603C2.62132 16.8445 2.64366 16.9269 2.68491 17.0003C4.66791 20.5003 8.10791 20.5003 8.10791 20.5003L9.27791 18.0733M9.27791 18.0733C8.75491 17.9163 8.19891 17.7253 7.59891 17.5003M10.6009 12.5003C10.6009 12.7655 10.4956 13.0199 10.308 13.2074C10.1205 13.3949 9.86612 13.5003 9.60091 13.5003C9.33569 13.5003 9.08134 13.3949 8.8938 13.2074C8.70626 13.0199 8.60091 12.7655 8.60091 12.5003C8.60091 12.2351 8.70626 11.9807 8.8938 11.7932C9.08134 11.6057 9.33569 11.5003 9.60091 11.5003C9.86612 11.5003 10.1205 11.6057 10.308 11.7932C10.4956 11.9807 10.6009 12.2351 10.6009 12.5003ZM16.6029 12.5003C16.6029 12.7655 16.4976 13.0199 16.31 13.2074C16.1225 13.3949 15.8681 13.5003 15.6029 13.5003C15.3377 13.5003 15.0833 13.3949 14.8958 13.2074C14.7083 13.0199 14.6029 12.7655 14.6029 12.5003C14.6029 12.2351 14.7083 11.9807 14.8958 11.7932C15.0833 11.6057 15.3377 11.5003 15.6029 11.5003C15.8681 11.5003 16.1225 11.6057 16.31 11.7932C16.4976 11.9807 16.6029 12.2351 16.6029 12.5003Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                </svg>
              </a>
            </div>
          </div>

          <div className="contact_content">
            <div className="contact_form">
              <h2 className="qw_shine_heading">Send Us a Message</h2>
              <form
                action="https://formspree.io/f/mrbpgvzd"
                method="POST"
                onSubmit={handleContactSubmit}
              >
                {contactError && (
                  <p
                    style={{
                      color: "#ff4d4d",
                      fontSize: "13px",
                      marginBottom: "8px",
                    }}
                  >
                    {contactError}
                  </p>
                )}
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
                <button type="submit" className="submit_btn qw_fancy_btn">
                  <FancyButtonFx />
                  <span className="qw_fancy_btn_inner">
                    <svg
                      className="qw_fancy_btn_icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                    >
                      <polyline points="13.18 1.37 13.18 9.64 21.45 9.64 10.82 22.63 10.82 14.36 2.55 14.36 13.18 1.37"></polyline>
                    </svg>
                    Send Message
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
      <BackToTop />
    </main>
  );
}

export default Home;