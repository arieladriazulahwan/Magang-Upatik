import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest } from "../services/api";

function ProtectedRoute({ children, allowedRoles = [] }) {
  const [checkingSession, setCheckingSession] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const token = localStorage.getItem("token");
  const role = String(localStorage.getItem("role") || "").toLowerCase();

  useEffect(() => {
    if (!isLoggedIn || !token) {
      setCheckingSession(false);
      return;
    }

    let active = true;
    apiRequest("/auth/me")
      .then(() => {
        if (active) setIsSessionValid(true);
      })
      .catch(() => {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("role");
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        if (active) setIsSessionValid(false);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => { active = false; };
  }, [isLoggedIn, token]);

  if (!isLoggedIn || !token) {
    return <Navigate to="/login" replace />;
  }

  if (checkingSession) {
    return <div className="route-loading">Memvalidasi sesi...</div>;
  }

  if (!isSessionValid) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
