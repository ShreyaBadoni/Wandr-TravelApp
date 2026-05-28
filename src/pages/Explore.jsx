import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import axios from "axios";
import { toast } from "react-toastify";
import "../styles/dashboard.css";
import "../styles/explore.css";

const TYPES = [
  { key: "hotel",               label: "Hotels",       emoji: "🏨" },
  { key: "restaurant",          label: "Restaurants",  emoji: "🍽️" },
  { key: "tourist_attraction",  label: "Attractions",  emoji: "🎯" },
  { key: "shopping_mall",       label: "Shopping",     emoji: "🛍️" },
  { key: "night_club",          label: "Nightlife",    emoji: "🎶" },
];

const PRICE_LABELS = ["Free", "Inexpensive", "Moderate", "Expensive", "Very Expensive"];

function Explore({ toggleTheme }) {
  const [teams, setTeams]           = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [type, setType]             = useState("hotel");
  const [places, setPlaces]         = useState([]);
  const [loading, setLoading]       = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [searched, setSearched]     = useState(false);
  const token    = localStorage.getItem("token");
  const navigate = useNavigate();

  // Load active vacation teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get("http://localhost:5001/teams", { headers: { Authorization: token } });
        const active = res.data.teams.filter(t => t.vacation?.active);
        setTeams(active);
        if (active.length > 0) setSelectedTeam(active[0]);
      } catch { toast.error("Failed to load teams"); }
      finally { setTeamsLoading(false); }
    };
    fetchTeams();
  }, []);

  // Auto-search when team or type changes
  useEffect(() => {
    if (selectedTeam?.vacation?.destination) search(selectedTeam.vacation.destination, type);
  }, [selectedTeam, type]);

  const search = async (destination, searchType) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await axios.get("http://localhost:5001/explore/search", {
        headers: { Authorization: token },
        params:  { destination, type: searchType }
      });
      setPlaces(res.data.places);
    } catch (err) {
      toast.error(err.response?.data?.message || "Search failed");
      setPlaces([]);
    } finally { setLoading(false); }
  };

  const openInMaps    = (place) => window.open(place.mapsUrl, "_blank");
  const searchBooking = (place) => window.open(`https://www.booking.com/search.html?ss=${encodeURIComponent(place.name + " " + (selectedTeam?.vacation?.destination || ""))}`, "_blank");
  const searchMMT     = (place) => window.open(`https://www.makemytrip.com/hotels/${encodeURIComponent(selectedTeam?.vacation?.destination?.toLowerCase().replace(/ /g,"-") || "")}.html`, "_blank");

  const stars = (rating) => {
    if (!rating) return null;
    const full  = Math.floor(rating);
    const half  = rating % 1 >= 0.5;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
  };

  return (
    <div className="wandr-page">
      <div className="wandr-page-bg">
        <div className="wandr-bg-orb wandr-bg-orb-1" />
        <div className="wandr-bg-orb wandr-bg-orb-2" />
      </div>
      <Navbar toggleTheme={toggleTheme} />

      <div className="wandr-page-content">
        <div className="wandr-page-header">
          <div>
            <span className="wandr-page-tag">◈ Discover</span>
            <h1 className="wandr-page-title">Explore <em>Destination</em></h1>
            <p className="wandr-page-sub">Find hotels, restaurants & attractions at your destination</p>
          </div>
        </div>

        {teamsLoading ? (
          <div className="wandr-loading"><div className="wandr-spinner" /><span>Loading...</span></div>
        ) : teams.length === 0 ? (
          <div className="teams-empty">
            <div className="teams-empty-icon">🗺️</div>
            <h3>No active vacation</h3>
            <p>Start a vacation from the Teams page to explore your destination.</p>
            <button className="wandr-btn wandr-btn-primary" onClick={() => navigate("/teams")}>Go to Teams</button>
          </div>
        ) : (
          <>
            {/* Team selector */}
            {teams.length > 1 && (
              <div className="bills-team-selector" style={{ marginBottom: 20 }}>
                {teams.map(t => (
                  <button key={t._id}
                    className={`bills-team-tab ${selectedTeam?._id === t._id ? "active" : ""}`}
                    onClick={() => setSelectedTeam(t)}>
                    <span className="bills-live-dot">●</span>
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            {/* Destination banner */}
            {selectedTeam && (
              <div className="explore-dest-banner">
                <div className="explore-dest-icon">✈️</div>
                <div>
                  <div className="explore-dest-name">{selectedTeam.vacation.destination}</div>
                  <div className="explore-dest-team">with {selectedTeam.name}</div>
                </div>
              </div>
            )}

            {/* Type tabs */}
            <div className="explore-type-tabs">
              {TYPES.map(t => (
                <button key={t.key}
                  className={`explore-type-tab ${type === t.key ? "active" : ""}`}
                  onClick={() => setType(t.key)}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            {/* Results */}
            {loading ? (
              <div className="wandr-loading"><div className="wandr-spinner" /><span>Searching {selectedTeam?.vacation?.destination}...</span></div>
            ) : places.length === 0 && searched ? (
              <div className="bills-empty">
                <div>🔍</div>
                <p>No results found. Try a different category.</p>
              </div>
            ) : (
              <div className="explore-grid">
                {places.map((place, i) => (
                  <div className="explore-card" key={place.id} style={{ "--i": i }}>
                    {/* Photo */}
                    <div className="explore-card-photo">
                      {place.photo
                        ? <img src={place.photo} alt={place.name} />
                        : <div className="explore-card-no-photo">{TYPES.find(t=>t.key===type)?.emoji || "📍"}</div>
                      }
                      {place.open === true  && <span className="explore-open-badge">Open Now</span>}
                      {place.open === false && <span className="explore-closed-badge">Closed</span>}
                    </div>

                    {/* Info */}
                    <div className="explore-card-body">
                      <div className="explore-card-name">{place.name}</div>
                      <div className="explore-card-address">📍 {place.address}</div>

                      <div className="explore-card-meta">
                        {place.rating && (
                          <span className="explore-rating">
                            <span className="explore-stars">{stars(place.rating)}</span>
                            <span className="explore-rating-num">{place.rating}</span>
                            {place.totalRatings && <span className="explore-rating-count">({place.totalRatings.toLocaleString()})</span>}
                          </span>
                        )}
                        {place.priceLevel != null && (
                          <span className="explore-price">{"₹".repeat(place.priceLevel + 1)}</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="explore-card-actions">
                        <button className="explore-btn explore-btn-maps" onClick={() => openInMaps(place)}>
                          🗺️ View on Maps
                        </button>
                        {type === "hotel" && (
                          <>
                            <button className="explore-btn explore-btn-booking" onClick={() => searchBooking(place)}>
                              Booking.com →
                            </button>
                            <button className="explore-btn explore-btn-mmt" onClick={() => searchMMT(place)}>
                              MakeMyTrip →
                            </button>
                          </>
                        )}
                        {type === "restaurant" && (
                          <button className="explore-btn explore-btn-booking"
                            onClick={() => window.open(`https://www.zomato.com/search?q=${encodeURIComponent(place.name)}`, "_blank")}>
                            Zomato →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Explore;
