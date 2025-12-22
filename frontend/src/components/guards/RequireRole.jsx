// frontend/src/components/guards/RequireRole.jsx
// RBAC Route Guard Component

import { Navigate } from "react-router-dom";

/**
 * RequireRole - Route guard component for role-based access control
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Component to render if access granted
 * @param {string[]} props.allowedRoles - Array of allowed roles (e.g., ["admin", "agent"])
 * @param {string} props.redirectTo - Path to redirect if access denied (default: "/login")
 */
export default function RequireRole({ children, allowedRoles = [], redirectTo = "/login" }) {
    // Get user from localStorage
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    
    // If no user, redirect to login
    if (!storedUser || !storedUser.role) {
        return <Navigate to={redirectTo} replace />;
    }

    const userRole = storedUser.role?.toLowerCase();

    // Check if user role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
        // Redirect to unauthorized page or login
        return <Navigate to="/no-permission" replace />;
    }

    // Access granted, render children
    return <>{children}</>;
}

