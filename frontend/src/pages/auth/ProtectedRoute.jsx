import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spinner } from "react-bootstrap";

const ProtectedRoute = ({ allowed = [], children }) => {
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      setUser(parsed);
    } catch (err) {
      console.error("Auth parse error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ⏳ ĐANG CHECK AUTH → KHÔNG REDIRECT
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <Spinner animation="border" />
      </div>
    );
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

  // ✅ OK
  return children;
};

export default ProtectedRoute;
