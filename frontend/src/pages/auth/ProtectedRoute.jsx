// src/pages/auth/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ allowed = [], children }) => {
  const location = useLocation();

  let user = null;
  try {
    const raw = localStorage.getItem("user");
    user = raw ? JSON.parse(raw) : null;
  } catch (err) {
    user = null;
  }


  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }


  if (user.status && user.status !== "active") {
    return <Navigate to="/no-permission" replace />;
  }


  if (allowed.length > 0 && !allowed.includes(user.role)) {
    return <Navigate to="/no-permission" replace />;
  }


  return children;
};

export default ProtectedRoute;
