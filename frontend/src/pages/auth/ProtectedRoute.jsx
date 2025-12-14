// src/pages/auth/ProtectedRoute.jsx
import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ allowed = [], children }) => {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Đọc user từ localStorage
    try {
      const raw = localStorage.getItem("user");
      const parsedUser = raw ? JSON.parse(raw) : null;
      setUser(parsedUser);
    } catch (err) {
      console.error("Error parsing user from localStorage:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Đang loading - không render gì cả
  if (loading) {
    return null; // hoặc có thể return loading spinner
  }

  // Chưa có user - redirect về login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User bị khóa
  if (user.status && user.status !== "active") {
    return <Navigate to="/no-permission" replace />;
  }

  // User không có quyền truy cập
  if (allowed.length > 0 && !allowed.includes(user.role)) {
    return <Navigate to="/no-permission" replace />;
  }

  // Có quyền - render children
  return children;
};

export default ProtectedRoute;
