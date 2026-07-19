import React from 'react';
import { useNavigate } from 'react-router-dom';
import ColorSpots from '../components/ColorSpots';
import "../styles/home.css";
import "../styles/about.css";
import "../styles/aboutPage.css";

function AboutPage() {
  const navigate = useNavigate();

  const SparkleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.6 4.9L18.5 8l-4.9 1.6L12 14.5l-1.6-4.9L5.5 8l4.9-1.1L12 2zM19 14l.9 2.7L22.5 17.5l-2.6.8L19 21l-.9-2.7-2.6-.8 2.6-.8L19 14zM5 14.5l.75 2.25L8 17.5l-2.25.75L5 20.5l-.75-2.25L2 17.5l2.25-.75L5 14.5z" />
    </svg>
  );

  return (
    <div className="pg_about_wrapper">
      {/* Stars Background — same as the Home page's About section */}
      <div className="stars-container">
        <div id="stars"></div>
        <div id="stars2"></div>
        <div id="stars3"></div>
      </div>

      <div className="pg_about_ambient_a" aria-hidden="true"></div>
      <div className="pg_about_ambient_b" aria-hidden="true"></div>
      <ColorSpots />

      <section className="pg_about_section">

        {/* Header Section */}
        <div className="pg_about_header">
          <div className="pg_about_badge_wrap">
            <span className="pg_about_badge">
              <SparkleIcon />
              Our Story
            </span>
          </div>
          <h1 className="pg_about_title qw_shine_heading">Our Journey</h1>
          <hr className="blueline6" />
        </div>

        {/* Main Content: Text + Mission Card */}
        <div className="pg_about_grid">
          <div className="pg_about_text">
            <h2 className="qw_shine_heading">Luxury, Comfort, and Reliability</h2>
            <p>
              At <strong>Quick Wheels</strong>, we offer a diverse fleet to suit every need.
              From compact, fuel-efficient city cars to eco-friendly electric and hybrid models,
              we have the perfect vehicle for your next adventure.
            </p>
            <p>
              For those seeking luxury, our premium vehicles from renowned manufacturers
              provide unparalleled style and comfort. We also offer robust SUVs, spacious vans,
              and powerful trucks for both business and leisure.
            </p>
          </div>

          <div className="pg_mission_card">
            <div className="pg_card_glow"></div>
            <span className="pg_mission_badge">
              <SparkleIcon />
              Our Mission
            </span>
            <p>
              To provide every customer with a seamless, affordable, and enjoyable
              car rental experience — wherever their journey takes them.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="pg_stats_bar">
          <div className="pg_stat_box">
            <h4>30+</h4>
            <span>Locations</span>
          </div>
          <div className="pg_stat_box">
            <h4>500+</h4>
            <span>Vehicles</span>
          </div>
          <div className="pg_stat_box">
            <h4>24/7</h4>
            <span>Support</span>
          </div>
          <div className="pg_stat_box">
            <h4>15k+</h4>
            <span>Happy Clients</span>
          </div>
        </div>

        {/* Features / Why Choose Us — same card style as the Home page's About section */}
        <div className="pg_features_section">
          <h3 className="qw_shine_heading">Why Choose Quick Wheels?</h3>
          <div className="pg_features_grid about_features">
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
                <h3 className="about_feature_title">Global Presence</h3>
                <p className="about_feature_desc">
                  Global presence with over 30 convenient pickup points, so
                  wherever you're headed, we're already there.
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
                <h3 className="about_feature_title">Diverse Fleet</h3>
                <p className="about_feature_desc">
                  Six vehicle categories — Sedan, SUV, Luxury, and more —
                  built to match your exact journey.
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
                <h3 className="about_feature_title">Safety &amp; Maintenance</h3>
                <p className="about_feature_desc">
                  Full maintenance and high-tier safety insurance on every
                  vehicle, backed by a support team dedicated to worry-free trips.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pg_btn_container">
          <button className="btn" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>

      </section>
    </div>
  );
}

export default AboutPage;