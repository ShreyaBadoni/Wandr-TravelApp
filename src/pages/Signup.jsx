// import {useState} from "react";
// import axios from "axios";
// import {useNavigate} from "react-router-dom";
// import { toast } from "react-toastify";
// import "../styles/auth.css"

// function Signup() {
  
//   const[name,setName]=useState("");
//  const[email,setEmail]=useState("");
//  const[password,setPassword]=useState("");
//  const [confirmPassword,setConfirmPassword]=useState("");
//  const navigate=useNavigate();
//  const [error,setError]=useState("");
//  const[loading,setLoading]=useState(false);
//  const[strength,setStrength]=useState("");
//  const checkStrength=(value)=>{
//     let score=0;
//     if(value.length>=6) score++;
//     if(/[A-Z]/.test(value)) score++;
//     if(/[0-9]/.test(value)) score++;
//     if(/[^A-Za-z0-9]/.test(value)) score++;
//     if(score<=1) setStrength("weak");
//     else if(score==2||score==3) setStrength("medium");
//     else setStrength("strong");
//  };
//  const handleSignup=async ()=>{
//   if(name==""||password==""||email==""||!confirmPassword){
//     toast.error("fill all fields");
//     return;
//   }

//   if(!email.includes("@")){
//     toast.error("invalid email");
//     return;
//   }
//   if(password.length<6){
//     toast.error("password must be 6+");
//     return;
//   }
//   if(strength=="weak"){
//     toast.error("password too weak");
//     return;
//   }
//   if (password !== confirmPassword) {
//       toast.error("Passwords do not match");
//       return;
//     }try{
//     setLoading(true);
//     await axios.post("http://localhost:5001/signup", {
//         name,
//         email,
//         password
//       });
//     toast.success("signup success");
//     setName("");
//     setEmail("");
//     setPassword("");
//     setConfirmPassword("");
    
//     setLoading(false);
//     navigate("/login");
//     }
//     catch (error) {
//       toast.error(
//         error.response?.data?.message || "Signup failed"
//       );
//     } finally {
//       setLoading(false);
//     }
//  };
//  return (
//   <div className="auth-container">
//     <div className="auth-card">
//       <h2>Signup</h2>

//       <input
//         className="auth-input"
//         placeholder="Name"
//         value={name}
//         onChange={(e) => setName(e.target.value)}
//       />

//       <input
//         className="auth-input"
//         placeholder="Email"
//         value={email}
//         onChange={(e) => setEmail(e.target.value)}
//       />

//       <input
//         className="auth-input"
//         type="password"
//         placeholder="Password"
//         value={password}
//         onChange={(e) => {
//           setPassword(e.target.value);
//           checkStrength(e.target.value);
//         }}
//       />
//       <input
//         className="auth-input"
//         type="password"
//         placeholder="confirmPassword"
//         value={confirmPassword}
//         onChange={(e) => {
//           setConfirmPassword(e.target.value);
        
//         }}
//       />

//       <button className="auth-btn" onClick={handleSignup} disabled={loading}>
//         {loading ? "Creating..." : "Signup"}
//       </button>
//     </div>
//   </div>
// );

// }
// export default Signup;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import "../styles/auth.css";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState("");
  const navigate = useNavigate();

  const checkStrength = (value) => {
    let score = 0;
    if (value.length >= 6) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    if (score <= 1) setStrength("weak");
    else if (score <= 3) setStrength("medium");
    else setStrength("strong");
  };

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Fill all fields");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Invalid email");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be 6+ characters");
      return;
    }
    if (strength === "weak") {
      toast.error("Password too weak");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      await axios.post("http://localhost:5001/signup", { name, email, password });
      toast.success("Account created!");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
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
          Have an account?
          <span onClick={() => navigate("/login")}>Sign in</span>
        </p>
      </nav>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-card-icon">🌍</div>
          <h2>Start exploring</h2>
          <p className="auth-card-sub">Create your free Wandr account</p>

          <div className="auth-input-group">
            <label className="auth-input-label">Full Name</label>
            <input
              className="auth-input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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
              onChange={(e) => {
                setPassword(e.target.value);
                checkStrength(e.target.value);
              }}
            />
            {strength && (
              <>
                <div className="strength-bar-wrap">
                  <div className={`strength-bar ${strength}`} />
                </div>
                <span className={`strength-label ${strength}`}>
                  {strength.charAt(0).toUpperCase() + strength.slice(1)} password
                </span>
              </>
            )}
          </div>

          <div className="auth-input-group">
            <label className="auth-input-label">Confirm Password</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button className="auth-btn" onClick={handleSignup} disabled={loading}>
            {loading ? "Creating account..." : "Create Account →"}
          </button>

          <p className="auth-link">
            Already a member?{" "}
            <span onClick={() => navigate("/login")}>Sign in</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
