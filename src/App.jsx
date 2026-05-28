import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Teams from "./pages/Teams";
import Bills from "./pages/Bills";
import Trips from "./pages/Trips";
import Hotels from "./pages/Hotels";
import Explore from "./pages/Explore";
import Chat    from "./pages/Chat";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword  from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) setTheme(savedTheme);
  }, []);
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div className={theme}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login"           element={<Login toggleTheme={toggleTheme} />} />
        <Route path="/signup"          element={<Signup toggleTheme={toggleTheme} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard toggleTheme={toggleTheme} /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile toggleTheme={toggleTheme} /></ProtectedRoute>} />
        <Route path="/teams" element={<ProtectedRoute><Teams toggleTheme={toggleTheme} /></ProtectedRoute>} />
        <Route path="/bills"  element={<ProtectedRoute><Bills  toggleTheme={toggleTheme} /></ProtectedRoute>} />
        <Route path="/trips"  element={<ProtectedRoute><Trips  toggleTheme={toggleTheme} /></ProtectedRoute>} />
        <Route path="/hotels"  element={<ProtectedRoute><Hotels  toggleTheme={toggleTheme} /></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><Explore toggleTheme={toggleTheme} /></ProtectedRoute>} />
        <Route path="/chat"    element={<ProtectedRoute><Chat    toggleTheme={toggleTheme} /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;
