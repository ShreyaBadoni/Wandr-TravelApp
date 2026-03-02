 import { Routes, Route, Navigate } from "react-router-dom";
import {useState,useEffect} from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";

import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [theme,setTheme]=useState("light");
  useEffect(()=>{
    const savedTheme=localStorage.getItem("theme");
    if(savedTheme) setTheme(savedTheme);
    },[]);
    const toggleTheme=()=>{
      const newTheme=theme==="light"?"dark":"light";
      setTheme(newTheme);
      localStorage.setItem("theme",newTheme);
    };
  return (
    <div className={theme}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login toggleTheme={toggleTheme}/>} />
      <Route path="/signup" element={<Signup toggleTheme={toggleTheme}/>} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard toggleTheme={toggleTheme}/>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile toggleTheme={toggleTheme}/>
          </ProtectedRoute>
        }
      />
    </Routes>
    </div>
  );
}

export default App;
