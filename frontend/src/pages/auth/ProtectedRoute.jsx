// src/pages/auth/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ allowed = [], children }) => {
  const location = useLocation();

  let user;
  try {
    const raw = localStorage.getItem("user");
    user = raw ? JSON.parse(raw) : undefined; 
  } catch {
    user = undefined;
  }

  // ⛔ CHƯA LOAD XONG USER → ĐỪNG REDIRECT
  if (user === undefined) {
    return null; // hoặc spinner loading
  }

  // ❌ KHÔNG ĐĂNG NHẬP
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ❌ USER BỊ KHÓA
  if (user.status && user.status !== "active") {
    return <Navigate to="/no-permission" replace />;
  }

  // ❌ KHÔNG ĐỦ QUYỀN
  if (allowed.length > 0 && !allowed.includes(user.role)) {
    return <Navigate to="/no-permission" replace />;
  }

  // ✅ OK
  return children;
};

export default ProtectedRoute;
