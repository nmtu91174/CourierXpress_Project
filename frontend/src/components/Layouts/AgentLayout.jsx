// frontend/src/components/Layouts/AgentLayout.jsx
// Agent Portal Layout - Operational Workspace

import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
    FaTachometerAlt,
    FaBoxOpen,
    FaUserTie,
    FaBell,
    FaUser
} from "react-icons/fa";
import UserMenu from "../layout/UserMenu";

import "../../assets/styles/agent_layout.css";

const AgentLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar state

    // Load user from localStorage on mount
    useEffect(() => {
        const loadUser = () => {
            const storedUser = JSON.parse(localStorage.getItem("user") || "null");
            if (storedUser) setUser(storedUser);
        };
        loadUser();
    }, []);

    // Listen for localStorage changes (when avatar/profile is updated)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === "user") {
                const storedUser = JSON.parse(e.newValue || "null");
                if (storedUser) setUser(storedUser);
            }
        };

        // Listen for storage events (from other tabs/windows)
        window.addEventListener("storage", handleStorageChange);

        // Also listen for custom event (from same tab)
        const handleCustomStorageChange = () => {
            const storedUser = JSON.parse(localStorage.getItem("user") || "null");
            if (storedUser) setUser(storedUser);
        };
        window.addEventListener("userUpdated", handleCustomStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("userUpdated", handleCustomStorageChange);
        };
    }, []);

    // Also check localStorage on route change (in case update happened in same tab)
    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user") || "null");
        if (storedUser) {
            // Only update if user data actually changed (especially avatar)
            if (!user || user.avatar !== storedUser.avatar || user.name !== storedUser.name) {
                setUser(storedUser);
            }
        }
    }, [location.pathname, user]);

    const isActive = (path) => (location.pathname === path ? "active" : "");

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [sidebarOpen]);

    // Close sidebar when route changes (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="agent-wrapper">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div 
                    className="sidebar-overlay" 
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                />
            )}

            {/* 📌 SIDEBAR — Luôn cố định */}
            <aside className={`sidebar d-flex flex-column justify-content-between ${sidebarOpen ? 'sidebar-open' : ''}`} onClick={(e) => e.stopPropagation()}>

                {/* LOGO / BRAND */}
                <div>
                    <div className="sidebar-header">
                        <h4 className="fw-bold m-0 text-white">
                            Courier<span style={{ color: "#ff4d24" }}>X</span>press
                        </h4>
                        <small className="text-muted">Agent Portal</small>
                    </div>

                    {/* NAVIGATION */}
                    <nav className="sidebar-menu mt-3">
                        <Link
                            to="/agent/dashboard"
                            className={`sidebar-link ${isActive("/agent/dashboard")}`}
                            data-title="Dashboard"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <FaTachometerAlt /> <span>Dashboard</span>
                        </Link>

                        <Link
                            to="/agent/orders"
                            className={`sidebar-link ${isActive("/agent/orders")}`}
                            data-title="My Orders"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <FaBoxOpen /> <span>My Orders</span>
                        </Link>

                        <Link
                            to="/agent/assign-shipper"
                            className={`sidebar-link ${isActive("/agent/assign-shipper")}`}
                            data-title="Assign Shipper"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <FaUserTie /> <span>Assign Shipper</span>
                        </Link>

                    </nav>
                </div>

                {/* Footer space */}
                <div className="mb-3">
                    {/* Reserved for future use */}
                </div>
            </aside>

            {/* 📌 CONTENT — Scrollable area */}
            <main className="agent-content">

                {/* HEADER */}
                <header className="d-flex justify-content-between align-items-center mb-4">
                    {/* Mobile sidebar toggle button */}
                    <button 
                        className="sidebar-toggle-mobile d-md-none"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label="Toggle sidebar"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12h18M3 6h18M3 18h18"/>
                        </svg>
                    </button>
                    <h5 className="text-secondary m-0 flex-grow-1 text-truncate">Shipping Management System</h5>

                    <div className="d-flex align-items-center flex-shrink-0">
                        {user ? (
                            <UserMenu user={user} />
                        ) : (
                            <span className="fw-bold text-muted">Agent</span>
                        )}
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <Outlet />
            </main>
        </div>
    );
};

export default AgentLayout;

