import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "../styles/dashboard.css";

function Dashboard({ toggleTheme }) {
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(true);
  const [teams, setTeams]     = useState([]);
  const token    = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, teamsRes] = await Promise.all([
          axios.get("http://localhost:5001/profile", { headers: { Authorization: token } }),
          axios.get("http://localhost:5001/teams",   { headers: { Authorization: token } }),
        ]);
        setName(profileRes.data.name);
        localStorage.setItem("userName", profileRes.data.name);
        setTeams(teamsRes.data.teams);
      } catch {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  const initials = name
    ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "W";

  const activeVacations = teams.filter(t => t.vacation?.active);
  const myTeams         = teams.slice(0, 4); // show max 4 on dashboard

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
            {/* Welcome */}
            <div className="wandr-welcome">
              <div className="wandr-welcome-avatar">{initials}</div>
              <div className="wandr-welcome-text">
                <h3>Welcome back, {name} ✦</h3>
                <p>{activeVacations.length > 0 ? "You have an active vacation right now!" : "Ready to plan your next adventure?"}</p>
              </div>
            </div>

            {/* Active Vacations */}
            {activeVacations.length > 0 && (
              <div className="db-section">
                <div className="db-section-title">🌴 Current Vacation</div>
                <div className="vacation-cards">
                  {activeVacations.map(team => (
                    <div className="vacation-card" key={team._id}>
                      <div className="vacation-pulse" />
                      <div className="vacation-card-top">
                        <span className="vacation-live-badge">● LIVE</span>
                        <span className="vacation-team-name">{team.name}</span>
                      </div>
                      <div className="vacation-destination">
                        ✈️ {team.vacation.destination}
                      </div>
                      <div className="vacation-meta">
                        Started {new Date(team.vacation.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        · {team.members.length} traveller{team.members.length !== 1 ? "s" : ""}
                      </div>
                      <div className="vacation-members">
                        {team.members.slice(0, 5).map(m => (
                          <div className="vacation-member-avatar" key={m.user._id} title={m.user.name}>
                            {m.user.name?.slice(0, 2).toUpperCase()}
                          </div>
                        ))}
                        {team.members.length > 5 && (
                          <div className="vacation-member-avatar more">+{team.members.length - 5}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="wandr-grid">
              {[
                { icon: "👥", value: teams.length,                                      label: "My Teams"         },
                { icon: "🌴", value: activeVacations.length,                            label: "Active Vacations" },
                { icon: "🌍", value: teams.reduce((a,t) => a + t.members.length, 0),    label: "Total Members"    },
                { icon: "🔒", value: teams.filter(t => t.isLocked).length,              label: "Locked Teams"     },
              ].map((s, i) => (
                <div className="wandr-stat-card" key={s.label} style={{ "--i": i }}>
                  <div className="wandr-stat-icon">{s.icon}</div>
                  <div className="wandr-stat-value">{s.value}</div>
                  <div className="wandr-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* My Teams */}
            <div className="wandr-card" style={{ animationDelay: "0.3s" }}>
              <div className="db-card-header">
                <div className="wandr-card-title">👥 My Teams</div>
                <button className="db-see-all" onClick={() => navigate("/teams")}>
                  See all →
                </button>
              </div>

              {myTeams.length === 0 ? (
                <div className="db-empty">
                  <p>You haven't joined any teams yet.</p>
                  <button className="wandr-btn wandr-btn-primary" onClick={() => navigate("/teams")}>
                    Create or Join a Team
                  </button>
                </div>
              ) : (
                <div className="db-teams-list">
                  {myTeams.map((team, i) => (
                    <div className="db-team-row" key={team._id} style={{ "--i": i }}
                      onClick={() => navigate("/teams")}>
                      <div className="db-team-avatar">
                        {team.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="db-team-info">
                        <div className="db-team-name">{team.name}</div>
                        <div className="db-team-meta">
                          {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                          {team.vacation?.active && <span className="db-vacation-pill">✈️ On vacation</span>}
                        </div>
                      </div>
                      <div className="db-team-badges">
                        {team.isLocked && <span className="db-lock-badge">🔒</span>}
                        {team.vacation?.active && <span className="db-active-badge">LIVE</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
