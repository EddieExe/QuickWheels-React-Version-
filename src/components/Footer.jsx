import { Link } from "react-router-dom";
import ColorSpots from "../components/ColorSpots";
import "../styles/footer.css";

function Footer() {
  return (
    <footer>
      <div className="footer_ambient_a" aria-hidden="true"></div>
      <div className="footer_ambient_b" aria-hidden="true"></div>
      <ColorSpots density="sparse" />

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
          <div className="footer_social_links">
  <a
    className="footer_social_icon footer_social_icon--facebook"
    href="https://www.facebook.com"
    target="_blank"
    rel="noreferrer"
    aria-label="Facebook"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2Z" />
    </svg>
  </a>

  <a
    className="footer_social_icon footer_social_icon--linkedin"
    href="https://in.linkedin.com"
    target="_blank"
    rel="noreferrer"
    aria-label="LinkedIn"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6Z" />
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  </a>

  <a
    className="footer_social_icon footer_social_icon--x"
    href="https://x.com"
    target="_blank"
    rel="noreferrer"
    aria-label="X (Twitter)"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.8003 3L13.5823 10.105L19.9583 19.106C20.3923 19.719 20.6083 20.025 20.5983 20.28C20.594 20.3896 20.5657 20.4969 20.5154 20.5943C20.4651 20.6917 20.3941 20.777 20.3073 20.844C20.1043 21 19.7293 21 18.9793 21H17.2903C16.8353 21 16.6083 21 16.4003 20.939C16.2168 20.8847 16.0454 20.7957 15.8953 20.677C15.7253 20.544 15.5943 20.358 15.3313 19.987L10.6813 13.421L4.64033 4.894C4.20733 4.281 3.99033 3.975 4.00033 3.72C4.00478 3.61035 4.03323 3.50302 4.08368 3.40557C4.13414 3.30812 4.20536 3.22292 4.29233 3.156C4.49433 3 4.87033 3 5.62033 3H7.30833C7.76333 3 7.99033 3 8.19733 3.061C8.38119 3.1152 8.55295 3.20414 8.70333 3.323C8.87333 3.457 9.00433 3.642 9.26733 4.013L13.5833 10.105M4.05033 21L10.6823 13.421" />
    </svg>
  </a>

  <a
    className="footer_social_icon footer_social_icon--instagram"
    href="https://www.instagram.com"
    target="_blank"
    rel="noreferrer"
    aria-label="Instagram"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 25" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.0459 7.5H17.0559M3.0459 12.5C3.0459 9.986 3.0459 8.73 3.3999 7.72C3.71249 6.82657 4.22237 6.01507 4.89167 5.34577C5.56096 4.67647 6.37247 4.16659 7.2659 3.854C8.2759 3.5 9.5329 3.5 12.0459 3.5C14.5599 3.5 15.8159 3.5 16.8269 3.854C17.7202 4.16648 18.5317 4.67621 19.201 5.34533C19.8702 6.01445 20.3802 6.82576 20.6929 7.719C21.0459 8.729 21.0459 9.986 21.0459 12.5C21.0459 15.014 21.0459 16.27 20.6929 17.28C20.3803 18.1734 19.8704 18.9849 19.2011 19.6542C18.5318 20.3235 17.7203 20.8334 16.8269 21.146C15.8169 21.5 14.5599 21.5 12.0469 21.5C9.5329 21.5 8.2759 21.5 7.2659 21.146C6.37268 20.8336 5.56131 20.324 4.89202 19.6551C4.22274 18.9862 3.71274 18.1751 3.3999 17.282C3.0459 16.272 3.0459 15.015 3.0459 12.501V12.5ZM15.8239 11.94C15.9033 12.4387 15.8829 12.9481 15.7641 13.4389C15.6453 13.9296 15.4304 14.392 15.1317 14.7991C14.833 15.2063 14.4566 15.5501 14.0242 15.8108C13.5917 16.0715 13.1119 16.2439 12.6124 16.318C12.1129 16.392 11.6037 16.3663 11.1142 16.2422C10.6248 16.1182 10.1648 15.8983 9.76082 15.5953C9.35688 15.2923 9.01703 14.9123 8.76095 14.4771C8.50486 14.0419 8.33762 13.5602 8.2689 13.06C8.13201 12.0635 8.39375 11.0533 8.99727 10.2487C9.6008 9.44407 10.4974 8.91002 11.4923 8.76252C12.4873 8.61503 13.5002 8.86599 14.3112 9.46091C15.1222 10.0558 15.6658 10.9467 15.8239 11.94Z" />
    </svg>
  </a>
</div>
          <div className="footer_download_options">
            <a href="#play_store" className="footer_store_btn">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                className="footer_store_icon"
                viewBox="0 0 512 512"
              >
                <path d="M99.617 8.057a50.191 50.191 0 00-38.815-6.713l230.932 230.933 74.846-74.846L99.617 8.057zM32.139 20.116c-6.441 8.563-10.148 19.077-10.148 30.199v411.358c0 11.123 3.708 21.636 10.148 30.199l235.877-235.877L32.139 20.116zM464.261 212.087l-67.266-37.637-81.544 81.544 81.548 81.548 67.273-37.64c16.117-9.03 25.738-25.442 25.738-43.908s-9.621-34.877-25.749-43.907zM291.733 279.711L60.815 510.629c3.786.891 7.639 1.371 11.492 1.371a50.275 50.275 0 0027.31-8.07l266.965-149.372-74.849-74.847z" />
              </svg>
              <span className="footer_store_texts">
                <span className="footer_store_text1">GET IT ON</span>
                <span className="footer_store_text2">Google Play</span>
              </span>
            </a>

            <a href="#app_store" className="footer_store_btn">
              <svg
                className="footer_store_icon"
                fill="currentColor"
                viewBox="-52.01 0 560.035 560.035"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M380.844 297.529c.787 84.752 74.349 112.955 75.164 113.314-.622 1.988-11.754 40.191-38.756 79.652-23.343 34.117-47.568 68.107-85.731 68.811-37.499.691-49.557-22.236-92.429-22.236-42.859 0-56.256 21.533-91.753 22.928-36.837 1.395-64.889-36.891-88.424-70.883-48.093-69.53-84.846-196.475-35.496-282.165 24.516-42.554 68.328-69.501 115.882-70.192 36.173-.69 70.315 24.336 92.429 24.336 22.1 0 63.59-30.096 107.208-25.676 18.26.76 69.517 7.376 102.429 55.552-2.652 1.644-61.159 35.704-60.523 106.559M310.369 89.418C329.926 65.745 343.089 32.79 339.498 0 311.308 1.133 277.22 18.785 257 42.445c-18.121 20.952-33.991 54.487-29.709 86.628 31.421 2.431 63.52-15.967 83.078-39.655" />
              </svg>
              <span className="footer_store_texts">
                <span className="footer_store_text1">Download on the</span>
                <span className="footer_store_text2">App Store</span>
              </span>
            </a>
          </div>
        </div>

        <div className="footer_right">
          <div className="footer_links">
            <div className="footer_section">
              <h2 className="footer_heading">Navigation</h2>
              <ul className="main_links">
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#cars">Our Cars</a></li>
                <li><a href="#how_it_works">How It Works</a></li>
                <li><a href="#reviews">Reviews</a></li>
                <li><a href="#locations">Locations</a></li>
                <li><a href="#contact">Contact Us</a></li>
              </ul>
            </div>

            <div className="footer_section">
              <h2 className="footer_heading">Our Fleet</h2>
              <ul className="cars_links">
                <li><Link to="/fleet">Sedan</Link></li>
                <li><Link to="/fleet">SUVs</Link></li>
                <li><Link to="/fleet">Convertible</Link></li>
                <li><Link to="/fleet">Pickup Trucks 4x4</Link></li>
                <li><Link to="/fleet">Van</Link></li>
                <li><Link to="/fleet">Luxury Cars</Link></li>
              </ul>
            </div>

            <div className="footer_section">
              <h2 className="footer_heading">FAQ</h2>
              <ul className="que">
                <li><a href="#how_it_works">How It Works?</a></li>
                <li><a href="#contact">Contact Us</a></li>
                <li><a href="#faq">Frequently Asked Questions</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <p className="footer-copyright">
        &copy; QuickWheels Car Rental Services - All rights reserved.<br></br>
        Made with Love, by EddieExe
      </p>
    </footer>
  );
}

export default Footer;