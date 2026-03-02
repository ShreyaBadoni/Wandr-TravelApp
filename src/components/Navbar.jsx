// import { useNavigate } from "react-router-dom";

// function Navbar({toggleTheme}) {
//   const navigate = useNavigate();

//   const logout = () => {
//     localStorage.removeItem("isLoggedIn");
//     navigate("/login");
//   };

//   return (
//     <div style={{ background: "#333", padding: "10px", color: "white" }}>
//       <span style={{ marginRight: "20px", cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
//         Dashboard
//       </span>

//       <span style={{ marginRight: "20px", cursor: "pointer" }} onClick={() => navigate("/profile")}>
//         Profile
//       </span>
     
//      <button onClick={() => toggleTheme && toggleTheme()}>
//   Toggle Theme
// </button>
// <button
//   className="auth-btn"
//   onClick={() => navigate("/signup")}
// >
//   Logout
// </button>


//     </div>
//   );
// }

// export default Navbar;
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

  return (
    <nav className="wandr-nav">
      <div className="wandr-nav-left">
        <div className="wandr-nav-logo" onClick={() => navigate("/")}>
          <span className="wandr-logo-mark">✦</span>
          <span className="wandr-logo-text">Wandr</span>
        </div>
        <div className="wandr-nav-links">
          <button
            className={`wandr-nav-link ${location.pathname === "/dashboard" ? "active" : ""}`}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`wandr-nav-link ${location.pathname === "/profile" ? "active" : ""}`}
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>
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
