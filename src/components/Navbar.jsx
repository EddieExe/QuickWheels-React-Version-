import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/header.css";

const MAX_WIDTH_PERCENT = 80;
const MIN_WIDTH_PERCENT = 60;
const SHRINK_SCROLL_RANGE = 250; // px of scroll over which the shrink completes

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isHome = location.pathname === "/";
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navWidth, setNavWidth] = useState(MAX_WIDTH_PERCENT);
  const tickingRef = useRef(false);

  // Check if current page is admin, dealer, or trip-dashboard
  const isAdminPage = location.pathname.startsWith("/admin");
  const isDealerPage = location.pathname.startsWith("/dealer");
  const isTripDashboard = location.pathname.startsWith("/trip-dashboard");

  const handleNavClick = (section) => (e) => {
    e.preventDefault();
    scrollToSection(section);
    setMenuOpen(false);
  };

  // Shrinking navbar on scroll (80% -> 60%), smooth via rAF
  const updateNavWidth = useCallback(() => {
    const scrollY = window.scrollY;
    const progress = Math.min(scrollY / SHRINK_SCROLL_RANGE, 1);
    const width =
      MAX_WIDTH_PERCENT - (MAX_WIDTH_PERCENT - MIN_WIDTH_PERCENT) * progress;
    setNavWidth(width);
    tickingRef.current = false;
  }, []);

  useEffect(() => {
    function handleScroll() {
      if (!tickingRef.current) {
        tickingRef.current = true;
        window.requestAnimationFrame(updateNavWidth);
      }
    }

    updateNavWidth();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [updateNavWidth]);

  // Add click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      // Close profile dropdown
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }

      // Close hamburger menu
      if (
        !e.target.closest(".pnav-links") &&
        !e.target.closest(".pnav-hamburger")
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function scrollToSection(sectionId) {
    if (isHome) {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => {
        document
          .getElementById(sectionId)
          ?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }

  async function handleLogout() {
    await logout();
    setShowProfile(false);
    navigate("/");
  }

  // Don't render navbar on these pages
  if (isAdminPage || isDealerPage || isTripDashboard) {
    return null;
  }

  return (
    <header className="pnav-header">
      <nav className="pnav-shell" style={{ width: `${navWidth}%` }}>
        <Link to="/" className="pnav-brand">
          <img className="pnav-logo" src="/Images/logo2.png" alt="logo" />
        </Link>

        <ul className={`pnav-links ${menuOpen ? "active" : ""}`}>
          <li>
            <a
              className="pnav-link"
              href="#home"
              onClick={handleNavClick("home")}
            >
              Home
            </a>
          </li>
          <li>
            <a
              className="pnav-link"
              href="#about"
              onClick={handleNavClick("about")}
            >
              About
            </a>
          </li>
          <li>
            <a
              className="pnav-link"
              href="#cars"
              onClick={handleNavClick("cars")}
            >
              Fleet
            </a>
          </li>
          <li>
            <a
              className="pnav-link"
              href="#how_it_works"
              onClick={handleNavClick("how_it_works")}
            >
              How It Works
            </a>
          </li>
          <li>
            <a
              className="pnav-link"
              href="#reviews"
              onClick={handleNavClick("reviews")}
            >
              Reviews
            </a>
          </li>
          <li>
            <a
              className="pnav-link"
              href="#locations"
              onClick={handleNavClick("locations")}
            >
              Locations
            </a>
          </li>
          <li>
            <a
              className="pnav-link"
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                if (user) {
                  navigate("/profile", { state: { tab: "contact" } });
                } else {
                  scrollToSection("contact");
                }
                setMenuOpen(false);
              }}
            >
              Contact Us
            </a>
          </li>
        </ul>

        <div className="pnav-actions">
          <button
            type="button"
            className="pnav-search-btn"
            aria-label="Search"
            title="Search (coming soon)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {user ? (
            <div className="pnav-profile-wrapper" ref={profileRef}>
              <button
                className="pnav-profile-btn"
                onClick={() => setShowProfile(!showProfile)}
              >
                <div className="pnav-profile-btn-points">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <i key={i} className="pnav-profile-btn-point"></i>
                  ))}
                </div>
                <span className="pnav-profile-btn-inner">
                  <svg
                    className="pnav-profile-btn-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {user.displayName?.split(" ")[0] || "Account"}
                </span>
              </button>

              {showProfile && (
                <div className="pnav-dropdown">
                  <div className="pnav-dropdown-inner">
                    <div className="pnav-dropdown-header">
                      <p className="pnav-user-name">{user.displayName}</p>
                      <p className="pnav-user-email">{user.email}</p>
                    </div>

                    <div className="pnav-dropdown-divider"></div>

                    <Link
                      to="/profile"
                      className="pnav-dropdown-link"
                      onClick={() => setShowProfile(false)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      My Profile
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="pnav-signout-btn"
                    >
                      <div className="pnav-sign-icon">
                        <svg viewBox="0 0 512 512">
                          <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                        </svg>
                      </div>
                      <div className="pnav-sign-text">Logout</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/signin" className="pnav-signin-btn">
              Sign In
            </Link>
          )}

          <button
            className={`pnav-hamburger ${menuOpen ? "active" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;