import { useNavigate, useLocation } from "react-router-dom";
import "../styles/dashboard.css";

function Navbar({ toggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const name = localStorage.getItem("userName") || "";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    navigate("/login");
  };

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "W";

  const navLinks = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/teams", label: "Teams" },
    { path: "/profile", label: "Profile" },
  ];

  return (
    <nav className="wandr-nav">
      <div className="wandr-nav-left">
        <div className="wandr-nav-logo" onClick={() => navigate("/")}>
          <span className="wandr-logo-mark">✦</span>
          <span className="wandr-logo-text">Wandr</span>
        </div>
        <div className="wandr-nav-links">
          {navLinks.map((link) => (
            <button
              key={link.path}
              className={`wandr-nav-link ${location.pathname === link.path ? "active" : ""}`}
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      <div className="wandr-nav-right">
        <div className="wandr-nav-user">
          <div className="wandr-avatar">{initials}</div>
          {name && <span className="wandr-username">{name}</span>}
        </div>
        <button className="wandr-logout-btn" onClick={logout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
