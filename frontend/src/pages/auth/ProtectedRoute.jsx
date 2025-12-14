// src/pages/auth/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spinner } from "react-bootstrap";

const ProtectedRoute = ({ allowed = [], children }) => {
  const location = useLocation();

  // Synchronous localStorage read (fast, no need for async)
  let user = null;
  try {
    const raw = localStorage.getItem("user");
    user = raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Error parsing user from localStorage:", err);
    user = null;
  }

  // No user found - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User account is inactive - redirect to no permission
  if (user.status && user.status !== "active") {
    return <Navigate to="/no-permission" replace />;
  }

  // User role not in allowed list - redirect to no permission
  if (allowed.length > 0 && !allowed.includes(user.role)) {
    return <Navigate to="/no-permission" replace />;
  }

  // All checks passed - render children
  return children;
};

export default ProtectedRoute;
