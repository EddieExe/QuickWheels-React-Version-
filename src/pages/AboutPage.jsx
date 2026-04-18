import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/aboutPage.css";

function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="pg_about_wrapper">
      <section className="pg_about_section">
        
        {/* Header Section */}
        <div className="pg_about_header">
          <h1 className="pg_about_title">Our Journey</h1>
          <div className="pg_blueline"></div>
          <p className="pg_about_intro">
            Redefining mobility with <strong>Quick Wheels</strong>. 
            From local commutes to global adventures, we are with you every mile.
          </p>
        </div>

        {/* Main Content: Text + Mission Card */}
        <div className="pg_about_grid">
          <div className="pg_about_text">
            <h2>Luxury, Comfort, and Reliability</h2>
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
            <h3>Our Mission</h3>
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

        {/* Features / Why Choose Us */}
        <div className="pg_features_section">
          <h3>Why Choose <strong>Quick Wheels ?</strong></h3>
          <div className="pg_features_grid">
            <div className="pg_feature_item">
              <span className="pg_icon">📍</span>
              <p>Global presence with over 30 convenient pickup points.</p>
            </div>
            <div className="pg_feature_item">
              <span className="pg_icon">🚗</span>
              <p>6 Vehicle Categories: Sedan, SUV, Luxury, and more.</p>
            </div>
            <div className="pg_feature_item">
              <span className="pg_icon">🛡️</span>
              <p>Full maintenance and high-tier safety insurance.</p>
            </div>
          </div>
        </div>

        <button className="pg_back_btn btn" onClick={() => navigate("/")}>
          ← Back to Home
        </button>

      </section>
    </div>
  );
}

export default AboutPage;