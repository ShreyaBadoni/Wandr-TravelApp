import Navbar from "../components/Navbar";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "../styles/dashboard.css";
import "../styles/Profile.css";

function Profile({ toggleTheme }) {
  const [isEditing, setIsEditing]   = useState(false);
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [bio, setBio]               = useState("");
  const [location, setLocation]     = useState("");
  const [avatar, setAvatar]         = useState("");
  const [origData, setOrigData]     = useState({});
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(false);
  const [fetching, setFetching]     = useState(true);
  const [uploading, setUploading]   = useState(false);
  const fileInputRef                = useRef();
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([
          axios.get("https://wandr-travelapp.onrender.com/profile",       { headers: { Authorization: token } }),
          axios.get("https://wandr-travelapp.onrender.com/profile/stats", { headers: { Authorization: token } }),
        ]);
        const p = profileRes.data;
        setName(p.name); setEmail(p.email);
        setBio(p.bio || ""); setLocation(p.location || "");
        setAvatar(p.avatar || "");
        setOrigData({ name: p.name, email: p.email, bio: p.bio || "", location: p.location || "" });
        localStorage.setItem("userName", p.name);
        if (p.avatar) localStorage.setItem("userAvatar", p.avatar);
        setStats(statsRes.data);
      } catch { toast.error("Failed to load profile"); }
      finally { setFetching(false); }
    };
    fetchAll();
  }, [token]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setUploading(true);
      try {
        await axios.put("https://wandr-travelapp.onrender.com/profile/avatar",
          { avatar: base64 },
          { headers: { Authorization: token } }
        );
        setAvatar(base64);
        localStorage.setItem("userAvatar", base64);
        toast.success("Profile picture updated!");
      } catch (err) {
        toast.error(err.response?.data?.message || "Upload failed");
      } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!name || !email) { toast.error("Name and email are required"); return; }
    try {
      setLoading(true);
      await axios.put("https://wandr-travelapp.onrender.com/profile",
        { name, email, bio, location },
        { headers: { Authorization: token } }
      );
      setOrigData({ name, email, bio, location });
      localStorage.setItem("userName", name);
      toast.success("Profile updated!");
      setIsEditing(false);
    } catch (err) { toast.error(err.response?.data?.message || "Update failed"); }
    finally { setLoading(false); }
  };

  const cancelEdit = () => {
    setName(origData.name); setEmail(origData.email);
    setBio(origData.bio); setLocation(origData.location);
    setIsEditing(false);
  };

  const initials = name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "W";

  const memberSince = stats?.memberSince
    ? new Date(stats.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="wandr-page">
      <div className="wandr-page-bg">
        <div className="wandr-bg-orb wandr-bg-orb-1" />
        <div className="wandr-bg-orb wandr-bg-orb-2" />
      </div>
      <Navbar toggleTheme={toggleTheme} />

      <div className="wandr-page-content">
        {fetching ? (
          <div className="wandr-loading"><div className="wandr-spinner" /><span>Loading profile...</span></div>
        ) : (
          <div className="profile-layout">

            {/* LEFT — avatar + stats */}
            <div className="profile-sidebar">

              {/* Avatar card */}
              <div className="wandr-card profile-avatar-card">
                <div className="profile-avatar-wrap">
                  <div className="profile-avatar-ring">
                    {avatar
                      ? <img src={avatar} alt="avatar" className="profile-avatar-img" />
                      : <div className="profile-avatar-initials">{initials}</div>
                    }
                    {uploading && <div className="profile-avatar-uploading"><div className="wandr-spinner" /></div>}
                  </div>
                  <button className="profile-avatar-edit-btn" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                    {uploading ? "Uploading..." : "📷 Change Photo"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
                </div>
                <div className="profile-avatar-name">{name}</div>
                <div className="profile-avatar-email">{email}</div>
                {location && <div className="profile-avatar-location">📍 {location}</div>}
                <div className="profile-member-since">Member since {memberSince}</div>
              </div>

              {/* Travel stats */}
              {stats && (
                <div className="wandr-card profile-stats-card">
                  <div className="db-card-header" style={{ marginBottom: 0 }}>
                    <div className="wandr-card-title">✦ Travel Stats</div>
                    <button className="db-see-all" onClick={() => navigate("/trips")}>View Trips →</button>
                  </div>
                  <div className="profile-stats-grid">
                    {[
                      { icon: "👥", value: stats.totalTeams,      label: "Teams"         },
                      { icon: "✈️", value: stats.totalTrips,      label: "Trips"         },
                      { icon: "🌍", value: stats.destinations.length, label: "Destinations" },
                      { icon: "🤝", value: stats.totalMembers,    label: "Co-travellers" },
                    ].map((s, i) => (
                      <div className="profile-stat" key={i}>
                        <div className="ps-icon">{s.icon}</div>
                        <div className="ps-value">{s.value}</div>
                        <div className="ps-label">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="profile-money-stats">
                    <div className="pms-row">
                      <span className="pms-label">💳 Total Paid</span>
                      <span className="pms-value gold">{fmt(stats.totalPaid)}</span>
                    </div>
                    <div className="pms-row">
                      <span className="pms-label">🧾 Your Share Spent</span>
                      <span className="pms-value">{fmt(stats.totalSpent)}</span>
                    </div>
                  </div>

                  {stats.destinations.length > 0 && (
                    <div className="profile-destinations">
                      <div className="wandr-field-label" style={{ marginBottom: 10 }}>Places Visited</div>
                      <div className="dest-tags">
                        {stats.destinations.map((d, i) => (
                          <span className="dest-tag-pill" key={i}>✈️ {d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT — edit form */}
            <div className="profile-main">
              <div className="wandr-card">
                <div className="db-card-header" style={{ marginBottom: 24 }}>
                  <div className="wandr-card-title">◈ Personal Details</div>
                  {!isEditing && (
                    <button className="wandr-edit-btn" onClick={() => setIsEditing(true)}>✎ Edit</button>
                  )}
                </div>

                {!isEditing ? (
                  <>
                    {[
                      { label: "Full Name",     value: name                },
                      { label: "Email Address", value: email               },
                      { label: "Bio",           value: bio || "—"          },
                      { label: "Location",      value: location || "—"     },
                    ].map(f => (
                      <div className="wandr-field" key={f.label}>
                        <span className="wandr-field-label">{f.label}</span>
                        <div className="wandr-field-value">{f.value}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="wandr-field">
                      <label className="wandr-field-label">Full Name</label>
                      <input className="wandr-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="wandr-field">
                      <label className="wandr-field-label">Email Address</label>
                      <input className="wandr-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
                    </div>
                    <div className="wandr-field">
                      <label className="wandr-field-label">Bio</label>
                      <input className="wandr-input" value={bio} onChange={e => setBio(e.target.value)} placeholder="A short bio about yourself..." maxLength={120} />
                      <span style={{ fontSize: 11, color: "rgba(245,240,232,0.3)", marginTop: 4, display: "block" }}>{bio.length}/120</span>
                    </div>
                    <div className="wandr-field">
                      <label className="wandr-field-label">Location</label>
                      <input className="wandr-input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Mumbai, India" />
                    </div>
                    <div className="wandr-btn-row">
                      <button className="wandr-btn wandr-btn-primary" onClick={saveProfile} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                      </button>
                      <button className="wandr-btn wandr-btn-ghost" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </>
                )}
              </div>

              {/* Active vacation status */}
              {stats?.activeVacations > 0 && (
                <div className="wandr-card profile-vacation-banner">
                  <span className="team-live-badge" style={{ marginBottom: 8, display: "inline-block" }}>● LIVE</span>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                    You're on vacation! 🌴
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(245,240,232,0.5)" }}>
                    {stats.activeVacations} active trip{stats.activeVacations !== 1 ? "s" : ""} in progress
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
