import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/header.css";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isHome = location.pathname === "/";
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const handleNavClick = (section) => (e) => {
    e.preventDefault();
    scrollToSection(section);
    setMenuOpen(false);
  };

  // Add click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      // Close profile dropdown
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }

      // Close hamburger menu
      if (
        !e.target.closest(".header_container") &&
        !e.target.closest(".hamburger")
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

  return (
    <header>
      <nav>
        <img className="brand_logo" src="/Images/logo2.png" alt="logo" />
        <button
          className={`hamburger ${menuOpen ? "active" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <ul className={`header_container ${menuOpen ? "active" : ""}`}>
          <li>
            <a
              className="header_link"
              href="#home"
              onClick={handleNavClick("home")}
            >
              Home
            </a>
          </li>
          <li>
            <a
              className="header_link"
              href="#about"
              onClick={handleNavClick("about")}
            >
              About
            </a>
          </li>
          <li>
            <a
              className="header_link"
              href="#cars"
              onClick={handleNavClick("cars")}
            >
              Fleet
            </a>
          </li>
          <li>
            <a
              className="header_link"
              href="#how_it_works"
              onClick={handleNavClick("how_it_works")}
            >
              How It Works
            </a>
          </li>
          <li>
            <a
              className="header_link"
              href="#reviews"
              onClick={handleNavClick("reviews")}
            >
              Reviews
            </a>
          </li>
          <li>
            <a
              className="header_link"
              href="#locations"
              onClick={handleNavClick("locations")}
            >
              Locations
            </a>
          </li>
          <li>
            <a
              className="header_link"
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                if (user) {
                  navigate("/profile", { state: { tab: "contact" } });
                } else {
                  scrollToSection("contact");
                }
              }}
            >
              Contact Us
            </a>
          </li>
        </ul>

        {user ? (
          <div className="profile_wrapper" ref={profileRef}>
            <button
              className="user-profile"
              onClick={() => setShowProfile(!showProfile)}
            >
              {/* Inner container for the dark background and content */}
              <div className="user-profile-inner">
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
                <span>{user.displayName?.split(" ")[0] || "Account"}</span>
              </div>
            </button>

            {showProfile && (
              <div className="profile_dropdown">
                <div className="profile_dropdown_inner">
                  <div className="dropdown_header">
                    <p className="user_name">{user.displayName}</p>
                    <p className="user_email">{user.email}</p>
                  </div>

                  <div className="dropdown_divider"></div>

                  <Link
                    to="/profile"
                    className="dropdown_link"
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

                  <button onClick={handleLogout} className="signout_expand_btn">
                    <div className="sign">
                      <svg viewBox="0 0 512 512">
                        <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                      </svg>
                    </div>
                    <div className="text">Logout</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link to="/signin" className="btn" style={{ textDecoration: "none" }}>
            Sign In
          </Link>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
