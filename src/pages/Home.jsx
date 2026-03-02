import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import "../styles/home.css";

const destinations = [
  { name: "Santorini", country: "Greece", emoji: "🏛️", tag: "Island Dream" },
  { name: "Kyoto", country: "Japan", emoji: "🌸", tag: "Ancient Soul" },
  { name: "Patagonia", country: "Argentina", emoji: "🏔️", tag: "Wild Edge" },
  { name: "Marrakech", country: "Morocco", emoji: "🕌", tag: "Spice Route" },
  { name: "Amalfi", country: "Italy", emoji: "🍋", tag: "Coastal Bliss" },
  { name: "Bali", country: "Indonesia", emoji: "🌴", tag: "Sacred Tropics" },
];

const features = [
  {
    icon: "✦",
    title: "Curated Journeys",
    desc: "Hand-picked itineraries crafted by expert travelers who've lived these routes.",
  },
  {
    icon: "◈",
    title: "Smart Planning",
    desc: "AI-powered tools that adapt your trip to your pace, budget, and passions.",
  },
  {
    icon: "⬡",
    title: "Travel Community",
    desc: "Connect with fellow wanderers sharing stories, tips, and hidden gems.",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const scrolled = window.scrollY;
        heroRef.current.style.transform = `translateY(${scrolled * 0.4}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="home">
      {/* NAV */}
      <nav className="home-nav">
        <div className="nav-logo">
          <span className="logo-mark">✦</span>
          <span className="logo-text">Wandr</span>
        </div>
        <div className="nav-links">
          <button className="nav-btn ghost" onClick={() => navigate("/login")}>
            Sign In
          </button>
          <button className="nav-btn solid" onClick={() => navigate("/signup")}>
            Get Started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" ref={heroRef}>
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
          <div className="hero-orb orb-3" />
          <div className="grain" />
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot" />
            The world is waiting
          </div>

          <h1 className="hero-title">
            Travel is not
            <br />
            <em>a destination.</em>
            <br />
            It's a feeling.
          </h1>

          <p className="hero-sub">
            Plan unforgettable journeys. Discover hidden gems. Share every
            story.
            <br />
            Your next adventure starts here.
          </p>

          <div className="hero-cta">
            <button
              className="cta-btn primary"
              onClick={() => navigate("/signup")}
            >
              Start Exploring
              <span className="btn-arrow">→</span>
            </button>
            <button
              className="cta-btn secondary"
              onClick={() => navigate("/login")}
            >
              I have an account
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-num">50K+</span>
              <span className="stat-label">Travelers</span>
            </div>
            <div className="stat-div" />
            <div className="stat">
              <span className="stat-num">120+</span>
              <span className="stat-label">Countries</span>
            </div>
            <div className="stat-div" />
            <div className="stat">
              <span className="stat-num">4.9★</span>
              <span className="stat-label">Rating</span>
            </div>
          </div>
        </div>

        <div className="scroll-hint">
          <div className="scroll-line" />
          <span>scroll</span>
        </div>
      </section>

      {/* DESTINATIONS */}
      <section className="destinations">
        <div className="section-header">
          <span className="section-tag">◈ Top Picks</span>
          <h2 className="section-title">
            Places that pull
            <br />
            at your soul
          </h2>
        </div>

        <div className="dest-grid">
          {destinations.map((d, i) => (
            <div className="dest-card" key={i} style={{ "--i": i }}>
              <div className="dest-emoji">{d.emoji}</div>
              <div className="dest-tag">{d.tag}</div>
              <div className="dest-name">{d.name}</div>
              <div className="dest-country">{d.country}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="features-inner">
          <div className="section-header left">
            <span className="section-tag">✦ Why Wandr</span>
            <h2 className="section-title">
              Built for the
              <br />
              curious mind
            </h2>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div className="feature-card" key={i} style={{ "--i": i }}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="cta-section">
        <div className="cta-bg">
          <div className="cta-orb" />
        </div>
        <div className="cta-content">
          <h2 className="cta-title">
            Your journey
            <br />
            begins with one step.
          </h2>
          <p className="cta-sub">
            Join thousands of travelers who found their path with Wandr.
          </p>
          <button
            className="cta-btn primary large"
            onClick={() => navigate("/signup")}
          >
            Create Free Account
            <span className="btn-arrow">→</span>
          </button>
          <p className="cta-signin">
            Already a member?{" "}
            <span onClick={() => navigate("/login")}>Sign in</span>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="home-footer">
        <div className="footer-logo">
          <span className="logo-mark">✦</span>
          <span className="logo-text">Wandr</span>
        </div>
        <p className="footer-copy">
          © 2026 Wandr. Made for those who wander.
        </p>
      </footer>
    </div>
  );
}
