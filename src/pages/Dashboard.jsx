import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "../styles/dashboard.css";

const destinations = [
  { name: "Santorini", country: "Greece", emoji: "🏛️", tag: "Island Dream" },
  { name: "Kyoto", country: "Japan", emoji: "🌸", tag: "Ancient Soul" },
  { name: "Patagonia", country: "Argentina", emoji: "🏔️", tag: "Wild Edge" },
  { name: "Marrakech", country: "Morocco", emoji: "🕌", tag: "Spice Route" },
  { name: "Amalfi", country: "Italy", emoji: "🍋", tag: "Coastal Bliss" },
];

function Dashboard({ toggleTheme }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:5001/profile", {
          headers: { Authorization: token },
        });
        setName(res.data.name);
        setEmail(res.data.email);
        localStorage.setItem("userName", res.data.name);
      } catch (err) {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "W";

  return (
    <div className="wandr-page">
      <div className="wandr-page-bg">
        <div className="wandr-bg-orb wandr-bg-orb-1" />
        <div className="wandr-bg-orb wandr-bg-orb-2" />
      </div>

      <Navbar toggleTheme={toggleTheme} />

      <div className="wandr-page-content">
        {loading ? (
          <div className="wandr-loading">
            <div className="wandr-spinner" />
            <span>Loading your journey...</span>
          </div>
        ) : (
          <>
            {/* Welcome banner */}
            <div className="wandr-welcome">
              <div className="wandr-welcome-avatar">{initials}</div>
              <div className="wandr-welcome-text">
                <h3>Welcome back, {name} ✦</h3>
                <p>Ready to plan your next adventure?</p>
              </div>
            </div>

            {/* Stats */}
            <div className="wandr-grid">
              {[
                { icon: "🗺️", value: "12", label: "Trips Planned", i: 0 },
                { icon: "🌍", value: "8", label: "Countries Visited", i: 1 },
                { icon: "📸", value: "340", label: "Memories Saved", i: 2 },
                { icon: "⭐", value: "4.9", label: "Avg. Trip Rating", i: 3 },
              ].map((s) => (
                <div className="wandr-stat-card" key={s.label} style={{ "--i": s.i }}>
                  <div className="wandr-stat-icon">{s.icon}</div>
                  <div className="wandr-stat-value">{s.value}</div>
                  <div className="wandr-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Destinations */}
            <div className="wandr-card" style={{ animationDelay: "0.3s" }}>
              <div className="wandr-card-title">✦ Explore Destinations</div>
              <ul className="wandr-destinations">
                {destinations.map((d, i) => (
                  <li className="wandr-dest-item" key={d.name} style={{ "--i": i }}>
                    <span className="wandr-dest-emoji">{d.emoji}</span>
                    <div className="wandr-dest-info">
                      <div className="wandr-dest-name">{d.name}</div>
                      <div className="wandr-dest-country">{d.country}</div>
                    </div>
                    <span className="wandr-dest-tag">{d.tag}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
