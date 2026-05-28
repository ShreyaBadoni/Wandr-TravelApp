import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import "../styles/auth.css";

function ResetPassword() {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState("");
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password)              { setError("Enter a new password"); return; }
    if (password.length < 6)    { setError("Password must be at least 6 characters"); return; }
    if (password !== confirm)   { setError("Passwords do not match"); return; }
    if (!token)                 { setError("Invalid reset link"); return; }

    setError("");
    setLoading(true);
    try {
      await axios.post("https://wandr-travelapp.onrender.com/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-bg">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
        </div>
        <div className="auth-card" style={{ textAlign:"center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 className="auth-title">Invalid Link</h2>
          <p className="auth-sub">This reset link is missing or invalid.</p>
          <Link to="/forgot-password" className="auth-btn" style={{ display:"block", textAlign:"center", marginTop:20, textDecoration:"none" }}>
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-card">
        <div className="auth-logo">Wandr ✈️</div>

        {done ? (
          <div className="forgot-success">
            <div className="forgot-success-icon">✅</div>
            <h2 className="auth-title">Password Reset!</h2>
            <p className="auth-sub">Your password has been updated successfully. Redirecting you to login...</p>
          </div>
        ) : (
          <>
            <h2 className="auth-title">Set New Password</h2>
            <p className="auth-sub">Choose a strong password for your account.</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">New Password</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Confirm Password</label>
                <input
                  className="auth-input"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="password-strength">
                  <div className="ps-bars">
                    {[1,2,3].map(i => (
                      <div key={i} className={`ps-bar ${
                        password.length >= 6 && i === 1 ? "weak" :
                        password.length >= 8 && /[A-Z]/.test(password) && i <= 2 ? "medium" :
                        password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) && i <= 3 ? "strong" : ""
                      }`} />
                    ))}
                  </div>
                  <span className="ps-label">
                    {password.length < 6 ? "Too short" :
                     password.length < 8 ? "Weak" :
                     /[A-Z]/.test(password) && password.length >= 8 ? "Good" :
                     "Strong"}
                  </span>
                </div>
              )}

              {error && <div className="auth-error">{error}</div>}

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Reset Password →"}
              </button>
            </form>

            <div className="auth-footer">
              <Link to="/login" className="auth-link">Back to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
