import React from 'react';
import "../styles/readmore.css";

function About() {
  return (
    <section className="about_section">
      <div className="about_container">
        <div className="about_header">
          <h1 className="about_title">About Quick Wheels</h1>
          <div className="blueline"></div>
          <h2 className="about_subtitle">"Drive Your Way with Quick Wheels"</h2>
        </div>

        <div className="about_content_grid">
          <div className="about_text_block">
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
          
          <div className="about_mission_card">
            <h3>Our Mission</h3>
            <p>
              To provide every customer with a seamless, affordable, and enjoyable 
              car rental experience — wherever their journey takes them.
            </p>
          </div>
        </div>

        <div className="about_stats_grid">
          <div className="stat_item">
            <h4>30+</h4>
            <span>Locations Worldwide</span>
          </div>
          <div className="stat_item">
            <h4>6</h4>
            <span>Vehicle Categories</span>
          </div>
          <div className="stat_item">
            <h4>24/7</h4>
            <span>Roadside Support</span>
          </div>
          <div className="stat_item">
            <h4>100%</h4>
            <span>Transparent Pricing</span>
          </div>
        </div>

        <div className="why_choose_us">
          <h3>Why Choose Us?</h3>
          <div className="features_list">
            <div className="feature_card">
              <span className="feature_icon">📍</span>
              <p>Global presence with over 30 convenient pickup points.</p>
            </div>
            <div className="feature_card">
              <span className="feature_icon">🚗</span>
              <p>Full range: Sedan, SUV, Luxury, Convertible, Pickup, and Van.</p>
            </div>
            <div className="feature_card">
              <span className="feature_icon">🛡️</span>
              <p>Well-maintained vehicles with top-notch safety ratings.</p>
            </div>
            <div className="feature_card">
              <span className="feature_icon">⚡</span>
              <p>Easy online booking and instant confirmation in minutes.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;