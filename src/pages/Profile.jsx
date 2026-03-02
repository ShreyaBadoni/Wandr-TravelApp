import Navbar from "../components/Navbar";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "../styles/dashboard.css";

function Profile({ toggleTheme }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [origName, setOrigName] = useState("");
  const [origEmail, setOrigEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("http://localhost:5001/profile", {
          headers: { Authorization: token },
        });
        setName(res.data.name);
        setEmail(res.data.email);
        setOrigName(res.data.name);
        setOrigEmail(res.data.email);
        localStorage.setItem("userName", res.data.name);
      } catch (err) {
        toast.error("Failed to load profile");
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, [token]);

  const saveProfile = async () => {
    if (!name || !email) {
      toast.error("Fields cannot be empty");
      return;
    }
    try {
      setLoading(true);
      await axios.put(
        "http://localhost:5001/profile",
        { name, email },
        { headers: { Authorization: token } }
      );
      setOrigName(name);
      setOrigEmail(email);
      localStorage.setItem("userName", name);
      toast.success("Profile updated!");
      setIsEditing(false);
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setName(origName);
    setEmail(origEmail);
    setIsEditing(false);
  };

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
        <div className="wandr-page-header">
          <span className="wandr-page-tag">◈ Account</span>
          <h1 className="wandr-page-title">
            Your <em>Profile</em>
          </h1>
          <p className="wandr-page-sub">Manage your personal details</p>
        </div>

        {fetching ? (
          <div className="wandr-loading">
            <div className="wandr-spinner" />
            <span>Loading profile...</span>
          </div>
        ) : (
          <div className="wandr-card">
            {/* Avatar + name header */}
            <div className="wandr-profile-header">
              <div className="wandr-profile-avatar">{initials}</div>
              <div className="wandr-profile-info">
                <h3>{name}</h3>
                <p>{email}</p>
              </div>
            </div>

            {/* Fields */}
            {!isEditing ? (
              <>
                <div className="wandr-field">
                  <span className="wandr-field-label">Full Name</span>
                  <div className="wandr-field-value">{name}</div>
                </div>
                <div className="wandr-field">
                  <span className="wandr-field-label">Email Address</span>
                  <div className="wandr-field-value">{email}</div>
                </div>
                <button className="wandr-edit-btn" onClick={() => setIsEditing(true)}>
                  ✎ Edit Profile
                </button>
              </>
            ) : (
              <>
                <div className="wandr-field">
                  <label className="wandr-field-label">Full Name</label>
                  <input
                    className="wandr-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="wandr-field">
                  <label className="wandr-field-label">Email Address</label>
                  <input
                    className="wandr-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </div>
                <div className="wandr-btn-row">
                  <button
                    className="wandr-btn wandr-btn-primary"
                    onClick={saveProfile}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button className="wandr-btn wandr-btn-ghost" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
