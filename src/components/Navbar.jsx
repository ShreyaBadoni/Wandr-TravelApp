import { useNavigate, useLocation } from "react-router-dom";
import "../styles/dashboard.css";

function Navbar({ toggleTheme }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const name      = localStorage.getItem("userName") || "";
  const avatarSrc = localStorage.getItem("userAvatar") || "";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userAvatar");
    navigate("/login");
  };

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "W";

  const navLinks = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/teams",     label: "Teams"     },
    { path: "/chat",      label: "Chat"      },
    { path: "/explore",   label: "Explore"   },
    { path: "/bills",     label: "Bills"     },
    { path: "/profile",   label: "Profile"   },
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
          <div className="wandr-avatar">
            {avatarSrc
              ? <img src={avatarSrc} alt="avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              : initials
            }
          </div>
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
