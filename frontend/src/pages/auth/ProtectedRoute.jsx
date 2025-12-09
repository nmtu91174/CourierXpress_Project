import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ allowed, children }) => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) return <Navigate to="/login" />;

    if (!allowed.includes(user.role)) {
        return <Navigate to="/no-permission" />;
    }

    return children;
};

export default ProtectedRoute;
