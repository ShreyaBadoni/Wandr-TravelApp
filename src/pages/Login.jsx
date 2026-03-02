// import {useState} from "react";
// import {useNavigate} from "react-router-dom";
// import { useEffect } from "react";
// import { toast } from "react-toastify";
// import axios from "axios";
// import "../styles/auth.css"
// function Login() {
  
  
//  const[email,setEmail]=useState("");
//  const[password,setPassword]=useState("");
//  const [loading,setLoading]=useState(false);
//  const navigate=useNavigate();
  
  
//  const handleLogin=async ()=>{
  
//   if(email==""||password==""){
//     toast.error("fill all fields");
//     return;
//   }
//   try{
//   setLoading(true);
  
// const res=await axios.post("http://localhost:5001/login", {

//         email,
//         password
//       });
//   localStorage.setItem("token",res.data.token);
//   toast.success("login success");
//   console.log(localStorage.getItem("token"));
//   navigate("/dashboard");
//     }
//   catch(error){
//       console.log(error.response?.data);
//     }
//   finally{
//         setLoading(false);
//       }
//     };
// return (
//   <div className="auth-container">
//     <div className="auth-card">
//       <h2>Login</h2>

//       <input
//         className="auth-input"
//         type="email"
//         placeholder="Email"
//         value={email}
//         onChange={(e) => setEmail(e.target.value)}
//       />

//       <input
//         className="auth-input"
//         type="password"
//         placeholder="Password"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//       />

//       <button className="auth-btn" onClick={handleLogin} disabled={loading}>
//         {loading ? "Logging in..." : "Login"}
//       </button>

//       <p className="auth-link" onClick={() => navigate("/signup")}>
//         Create Account
//       </p>
//     </div>
//   </div>
// );
// }
// export default Login;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import "../styles/auth.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (email === "" || password === "") {
      toast.error("Fill all fields");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5001/login", { email, password });
      localStorage.setItem("token", res.data.token);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-grain" />
      </div>

      <nav className="auth-nav">
        <div className="auth-nav-logo" onClick={() => navigate("/")}>
          <span className="auth-logo-mark">✦</span>
          <span className="auth-logo-text">Wandr</span>
        </div>
        <p className="auth-nav-link">
          No account?
          <span onClick={() => navigate("/signup")}>Sign up free</span>
        </p>
      </nav>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-card-icon">✦</div>
          <h2>Welcome back</h2>
          <p className="auth-card-sub">Sign in to continue your journey</p>

          <div className="auth-input-group">
            <label className="auth-input-label">Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-input-label">Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <button className="auth-btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>

          <p className="auth-link">
            New to Wandr?{" "}
            <span onClick={() => navigate("/signup")}>Create account</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
