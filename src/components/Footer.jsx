import { Link } from "react-router-dom";
import "../styles/footer.css";

function Footer() {
  return (
    <footer>
      <div className="footer_content">
        <div className="footer_left">
          <div className="brand_info">
            <img
              className="footer_logo"
              src="/Images/logo2.png"
              alt="Quick Wheels Logo"
            />
            <h1>Quick Wheels - Car Rental Service</h1>
            <p>
              Whether you're planning a business trip, a weekend getaway, or a
              family vacation, <strong>Quick Wheels</strong> offers an exceptional range of
              vehicles to suit your needs. Choose from our exclusive collection
              of luxury, sports, and eco-friendly cars, including top brands
              like Porsche, Ferrari, Tesla, BMW, and more. Elevate your driving
              experience with our premium add-ons, such as state-of-the-art GPS
              navigation systems and personalized entertainment options.
              Experience the freedom of the open road with <strong>Quick Wheels</strong> – where
              your journey begins with us.
            </p>
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
        </div>

        <div className="footer_right">
          <div className="footer_links">
            <div className="footer_section">
              <h2 className="footer_heading">Navigation</h2>
              <ul className="main_links">
                <li>
                  <a href="#home">Home</a>
                </li>
                <li>
                  <a href="#about">About</a>
                </li>
                <li>
                  <a href="#cars">Our Cars</a>
                </li>
                <li>
                  <a href="#how_it_works">How It Works</a>
                </li>
                <li>
                  <a href="#reviews">Reviews</a>
                </li>
                <li>
                  <a href="#locations">Locations</a>
                </li>
                <li>
                  <a href="#contact">Contact Us</a>
                </li>
              </ul>
              <h2 className="footer_heading">Our Fleet</h2>
              <ul className="cars_links">
                <li>
                  <Link to="/fleet">Sedan</Link>
                </li>
                <li>
                  <Link to="/fleet">SUVs</Link>
                </li>
                <li>
                  <Link to="/fleet">Convertible</Link>
                </li>
                <li>
                  <Link to="/fleet">Pickup Trucks 4x4</Link>
                </li>
                <li>
                  <Link to="/fleet">Van</Link>
                </li>
                <li>
                  <Link to="/fleet">Luxury Cars</Link>
                </li>
              </ul>

              <h2 className="footer_heading">FAQ</h2>
              <ul className="que">
                <li>
                  <a href="#how_it_works">How It Works?</a>
                </li>
                <li>
                  <a href="#contact">Contact Us</a>
                </li>
                <li>
                  <a href="#faq">Frequently Asked Questions</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <p className="footer-copyright">
        &copy; QuickWheels Car Rental Services - Aditya's Workshop. All rights
        reserved.
      </p>
    </footer>
  );
}

export default Footer;
