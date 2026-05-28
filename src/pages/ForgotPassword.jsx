import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "../styles/auth.css";

function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email"); return; }
    setError("");
    setLoading(true);
    try {
      await axios.post("http://localhost:5001/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-card">
        <div className="auth-logo">Wandr ✈️</div>

        {sent ? (
          <div className="forgot-success">
            <div className="forgot-success-icon">📬</div>
            <h2 className="auth-title">Check your inbox</h2>
            <p className="auth-sub">
              If an account exists for <strong>{email}</strong>, a password reset link has been sent. Check your spam folder too.
            </p>
            <p className="forgot-expiry">Link expires in 30 minutes.</p>
            <Link to="/login" className="auth-btn" style={{ display:"block", textAlign:"center", marginTop: 24, textDecoration:"none" }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="auth-title">Forgot Password</h2>
            <p className="auth-sub">Enter your email and we'll send you a reset link.</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">Email Address</label>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link →"}
              </button>
            </form>

            <div className="auth-footer">
              Remember your password? <Link to="/login" className="auth-link">Log in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
