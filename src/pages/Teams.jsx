import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import axios from "axios";
import { toast } from "react-toastify";
import "../styles/dashboard.css";
import "../styles/teams.css";

function Teams({ toggleTheme }) {
  const [teams, setTeams]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeamName, setNewTeamName]   = useState("");
  const [newTeamDesc, setNewTeamDesc]   = useState("");
  const [joinCode, setJoinCode]         = useState("");
  const [inviteEmail, setInviteEmail]   = useState("");
  const [destination, setDestination]   = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const token    = localStorage.getItem("token");
  const navigate = useNavigate();

  const currentUserId = (() => {
    try { return JSON.parse(atob(token.split(".")[1])).id; }
    catch { return null; }
  })();

  const fetchTeams = async () => {
    try {
      const res = await axios.get("http://localhost:5001/teams", { headers: { Authorization: token } });
      setTeams(res.data.teams);
    } catch { toast.error("Failed to load teams"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTeams(); }, []);

  const openModal = (type, team = null) => {
    setModal(type);
    setSelectedTeam(team);
    setNewTeamName(""); setNewTeamDesc(""); setJoinCode("");
    setInviteEmail(""); setDestination("");
  };
  const closeModal = () => { setModal(null); setSelectedTeam(null); };

  const isOwner = (team) => team.owner._id === currentUserId || team.owner._id?.toString() === currentUserId;

  // ── API Actions ──────────────────────────────────────────────

  const createTeam = async () => {
    if (!newTeamName.trim()) { toast.error("Team name is required"); return; }
    try {
      setSubmitting(true);
      const res = await axios.post("http://localhost:5001/teams",
        { name: newTeamName, description: newTeamDesc },
        { headers: { Authorization: token } }
      );
      toast.success(`Team "${res.data.team.name}" created!`);
      closeModal(); fetchTeams();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to create team"); }
    finally { setSubmitting(false); }
  };

  const joinTeam = async () => {
    if (!joinCode.trim()) { toast.error("Enter a team code"); return; }
    try {
      setSubmitting(true);
      const res = await axios.post("http://localhost:5001/teams/join",
        { code: joinCode },
        { headers: { Authorization: token } }
      );
      toast.success(res.data.message);
      closeModal(); fetchTeams();
    } catch (err) { toast.error(err.response?.data?.message || "Invalid team code"); }
    finally { setSubmitting(false); }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) { toast.error("Enter an email"); return; }
    try {
      setSubmitting(true);
      const res = await axios.post(
        `http://localhost:5001/teams/${selectedTeam._id}/invite`,
        { email: inviteEmail },
        { headers: { Authorization: token } }
      );
      toast.success(res.data.message);
      setInviteEmail("");
    } catch (err) { toast.error(err.response?.data?.message || "Invite failed"); }
    finally { setSubmitting(false); }
  };

  const toggleLock = async (team) => {
    try {
      const res = await axios.post(`http://localhost:5001/teams/${team._id}/lock`, {},
        { headers: { Authorization: token } }
      );
      toast.success(res.data.message);
      fetchTeams();
      // update selected team in modal
      setSelectedTeam(prev => prev ? { ...prev, isLocked: res.data.isLocked } : prev);
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const startVacation = async () => {
    if (!destination.trim()) { toast.error("Enter a destination"); return; }
    try {
      setSubmitting(true);
      const res = await axios.post(
        `http://localhost:5001/teams/${selectedTeam._id}/vacation/start`,
        { destination },
        { headers: { Authorization: token } }
      );
      toast.success(res.data.message);
      closeModal(); fetchTeams();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to start vacation"); }
    finally { setSubmitting(false); }
  };

  const endVacation = async (team) => {
    try {
      await axios.post(`http://localhost:5001/teams/${team._id}/vacation/end`, {},
        { headers: { Authorization: token } }
      );
      toast.success("Vacation ended!");
      closeModal(); fetchTeams();
    } catch (err) { toast.error(err.response?.data?.message || "Failed"); }
  };

  const leaveTeam = async (team) => {
    try {
      await axios.post(`http://localhost:5001/teams/${team._id}/leave`, {},
        { headers: { Authorization: token } }
      );
      toast.success(`Left "${team.name}"`);
      closeModal(); fetchTeams();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to leave"); }
  };

  const deleteTeam = async (team) => {
    try {
      await axios.delete(`http://localhost:5001/teams/${team._id}`,
        { headers: { Authorization: token } }
      );
      toast.success(`Deleted "${team.name}"`);
      closeModal(); fetchTeams();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to delete"); }
  };

  return (
    <div className="wandr-page">
      <div className="wandr-page-bg">
        <div className="wandr-bg-orb wandr-bg-orb-1" />
        <div className="wandr-bg-orb wandr-bg-orb-2" />
      </div>

      <Navbar toggleTheme={toggleTheme} />

      <div className="wandr-page-content">
        {/* Header */}
        <div className="wandr-page-header teams-header">
          <div>
            <span className="wandr-page-tag">◈ Travel Together</span>
            <h1 className="wandr-page-title">Your <em>Teams</em></h1>
            <p className="wandr-page-sub">Plan adventures with your crew</p>
          </div>
          <div className="teams-header-actions">
            <button className="wandr-btn wandr-btn-ghost" onClick={() => openModal("join")}>Enter Code</button>
            <button className="wandr-btn wandr-btn-primary" onClick={() => openModal("create")}>+ Create Team</button>
          </div>
        </div>

        {/* Teams */}
        {loading ? (
          <div className="wandr-loading">
            <div className="wandr-spinner" />
            <span>Loading your teams...</span>
          </div>
        ) : teams.length === 0 ? (
          <div className="teams-empty">
            <div className="teams-empty-icon">🧭</div>
            <h3>No teams yet</h3>
            <p>Create a team to plan trips together, or join one with a code.</p>
            <div className="teams-empty-actions">
              <button className="wandr-btn wandr-btn-primary" onClick={() => openModal("create")}>+ Create Team</button>
              <button className="wandr-btn wandr-btn-ghost" onClick={() => openModal("join")}>Join with Code</button>
            </div>
          </div>
        ) : (
          <div className="teams-grid">
            {teams.map((team, i) => (
              <div className="team-card" key={team._id} style={{ "--i": i }}
                onClick={() => openModal("detail", team)}>

                {/* Vacation banner */}
                {team.vacation?.active && (
                  <div className="team-vacation-banner">
                    ✈️ Vacationing in {team.vacation.destination}
                  </div>
                )}

                <div className="team-card-top">
                  <div className="team-avatar">{team.name.slice(0, 2).toUpperCase()}</div>
                  <div className="team-card-badges">
                    {isOwner(team) && <span className="team-owner-badge">Owner</span>}
                    {team.isLocked && !team.vacation?.active && <span className="team-locked-badge">🔒 Locked</span>}
                    {team.vacation?.active && <span className="team-live-badge">● LIVE</span>}
                  </div>
                </div>

                <div className="team-card-name">{team.name}</div>
                {team.description && <div className="team-card-desc">{team.description}</div>}

                <div className="team-card-footer">
                  <span className="team-member-count">👥 {team.members.length} member{team.members.length !== 1 ? "s" : ""}</span>
                  <span className="team-code-badge">{team.code}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="teams-modal-backdrop" onClick={closeModal}>
          <div className="teams-modal" onClick={e => e.stopPropagation()}>

            {/* CREATE */}
            {modal === "create" && (
              <>
                <div className="modal-header">
                  <div className="modal-icon">✦</div>
                  <h2>Create a Team</h2>
                  <p>Start planning adventures together</p>
                </div>
                <div className="wandr-field">
                  <label className="wandr-field-label">Team Name *</label>
                  <input className="wandr-input" placeholder="e.g. Summer Crew" value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)} autoFocus />
                </div>
                <div className="wandr-field">
                  <label className="wandr-field-label">Description (optional)</label>
                  <input className="wandr-input" placeholder="What's this team about?" value={newTeamDesc}
                    onChange={e => setNewTeamDesc(e.target.value)} />
                </div>
                <div className="wandr-btn-row">
                  <button className="wandr-btn wandr-btn-primary" onClick={createTeam} disabled={submitting}>
                    {submitting ? "Creating..." : "Create Team →"}
                  </button>
                  <button className="wandr-btn wandr-btn-ghost" onClick={closeModal}>Cancel</button>
                </div>
              </>
            )}

            {/* JOIN */}
            {modal === "join" && (
              <>
                <div className="modal-header">
                  <div className="modal-icon">🧭</div>
                  <h2>Join a Team</h2>
                  <p>Enter the 6-character team code</p>
                </div>
                <div className="wandr-field">
                  <label className="wandr-field-label">Team Code</label>
                  <input className="wandr-input join-code-input" placeholder="ABC123"
                    value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6} autoFocus />
                </div>
                <div className="wandr-btn-row">
                  <button className="wandr-btn wandr-btn-primary" onClick={joinTeam} disabled={submitting}>
                    {submitting ? "Joining..." : "Join Team →"}
                  </button>
                  <button className="wandr-btn wandr-btn-ghost" onClick={closeModal}>Cancel</button>
                </div>
              </>
            )}

            {/* START VACATION */}
            {modal === "vacation" && selectedTeam && (
              <>
                <div className="modal-header">
                  <div className="modal-icon">✈️</div>
                  <h2>Start Vacation</h2>
                  <p>Where is <strong>{selectedTeam.name}</strong> going?</p>
                </div>
                <div className="wandr-field">
                  <label className="wandr-field-label">Destination *</label>
                  <input className="wandr-input" placeholder="e.g. Bali, Indonesia"
                    value={destination} onChange={e => setDestination(e.target.value)} autoFocus />
                </div>
                <div className="modal-info-box">
                  ℹ️ Starting a vacation will automatically <strong>lock the team</strong> — no new members can join.
                </div>
                <div className="wandr-btn-row">
                  <button className="wandr-btn wandr-btn-primary" onClick={startVacation} disabled={submitting}>
                    {submitting ? "Starting..." : "🌴 Start Vacation"}
                  </button>
                  <button className="wandr-btn wandr-btn-ghost" onClick={closeModal}>Cancel</button>
                </div>
              </>
            )}

            {/* DETAIL */}
            {modal === "detail" && selectedTeam && (
              <>
                <div className="modal-header">
                  <div className="team-avatar large">{selectedTeam.name.slice(0, 2).toUpperCase()}</div>
                  <h2>{selectedTeam.name}</h2>
                  {selectedTeam.description && <p>{selectedTeam.description}</p>}
                </div>

                {/* Active vacation banner */}
                {selectedTeam.vacation?.active && (
                  <div className="modal-vacation-active">
                    <span>✈️</span>
                    <div>
                      <div className="modal-vacation-dest">{selectedTeam.vacation.destination}</div>
                      <div className="modal-vacation-since">
                        Since {new Date(selectedTeam.vacation.startedAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                      </div>
                    </div>
                    <span className="team-live-badge">● LIVE</span>
                  </div>
                )}

                {/* Code */}
                <div className="team-code-row">
                  <span className="wandr-field-label">Team Code</span>
                  <div className="team-code-display">
                    <span>{selectedTeam.code}</span>
                    <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(selectedTeam.code); toast.success("Code copied!"); }}>
                      Copy
                    </button>
                  </div>
                </div>

                {/* Owner controls */}
                {isOwner(selectedTeam) && (
                  <div className="owner-controls">
                    <span className="wandr-field-label">Team Controls</span>
                    <div className="owner-controls-row">
                      {/* Lock / Unlock */}
                      <button
                        className={`control-btn ${selectedTeam.isLocked ? "control-btn-unlock" : "control-btn-lock"}`}
                        onClick={() => toggleLock(selectedTeam)}
                      >
                        {selectedTeam.isLocked ? "🔓 Open Registration" : "🔒 Close Registration"}
                      </button>

                      {/* Start / End vacation */}
                      {!selectedTeam.vacation?.active ? (
                        <button className="control-btn control-btn-vacation"
                          onClick={() => openModal("vacation", selectedTeam)}>
                          ✈️ Start Vacation
                        </button>
                      ) : (
                        <button className="control-btn control-btn-end"
                          onClick={() => { if (window.confirm("End the vacation?")) endVacation(selectedTeam); }}>
                          🏁 End Vacation
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Members */}
                <div className="wandr-field">
                  <span className="wandr-field-label">Members ({selectedTeam.members.length})</span>
                  <div className="members-list">
                    {selectedTeam.members.map(m => (
                      <div className="member-row" key={m.user._id}>
                        <div className="member-avatar">{m.user.name?.slice(0, 2).toUpperCase() || "?"}</div>
                        <div className="member-info">
                          <div className="member-name">{m.user.name}</div>
                          <div className="member-email">{m.user.email}</div>
                        </div>
                        {m.user._id === selectedTeam.owner._id && <span className="team-owner-badge">Owner</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending invites */}
                {selectedTeam.pendingInvites?.length > 0 && (
                  <div className="wandr-field">
                    <span className="wandr-field-label">Pending Invites</span>
                    <div className="pending-list">
                      {selectedTeam.pendingInvites.map(e => (
                        <div className="pending-row" key={e}><span>📧</span> {e}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invite */}
                {!selectedTeam.isLocked && (
                  <div className="invite-section">
                    <span className="wandr-field-label">Invite by Email</span>
                    <div className="invite-row">
                      <input className="wandr-input" placeholder="friend@email.com"
                        value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" />
                      <button className="wandr-btn wandr-btn-primary invite-send-btn"
                        onClick={inviteMember} disabled={submitting}>
                        {submitting ? "..." : "Send"}
                      </button>
                    </div>
                  </div>
                )}
                {selectedTeam.isLocked && !isOwner(selectedTeam) && (
                  <div className="modal-info-box">🔒 Registration is closed. New members cannot join this team.</div>
                )}

                {/* Danger */}
                <div className="modal-danger-row">
                  {isOwner(selectedTeam) ? (
                    <button className="danger-btn" onClick={() => { if (window.confirm(`Delete "${selectedTeam.name}"?`)) deleteTeam(selectedTeam); }}>
                      🗑 Delete Team
                    </button>
                  ) : (
                    <button className="danger-btn" onClick={() => { if (window.confirm(`Leave "${selectedTeam.name}"?`)) leaveTeam(selectedTeam); }}>
                      ↩ Leave Team
                    </button>
                  )}
                  <button className="wandr-btn wandr-btn-ghost" onClick={closeModal}>Close</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

export default Teams;
