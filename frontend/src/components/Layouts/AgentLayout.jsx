// frontend/src/components/Layouts/AgentLayout.jsx
// Agent Portal Layout - Operational Workspace

import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
    FaTachometerAlt,
    FaBoxOpen,
    FaUserTie,
    FaBell,
    FaUser,
    FaMapMarkerAlt,
    FaFileAlt
} from "react-icons/fa";
import UserMenu from "../layout/UserMenu";

import "../../assets/styles/agent_layout.css";

const AgentLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar state
    const [coverageAreas, setCoverageAreas] = useState([]); // Agent coverage districts
    const [loadingCoverage, setLoadingCoverage] = useState(true);

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

    // ==========================
    // FETCH AGENT COVERAGE AREAS (Layout-level - persists across pages)
    // ==========================
    useEffect(() => {
        const fetchCoverage = async () => {
            try {
                setLoadingCoverage(true);
                const res = await fetch("http://localhost:8888/api/agent/get_coverage.php", {
                    method: "GET",
                    credentials: "include",
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === "success" && data.data && data.data.areas) {
                        setCoverageAreas(data.data.areas || []);
                    }
                }
            } catch (err) {
                console.error("Error fetching agent coverage:", err);
            } finally {
                setLoadingCoverage(false);
            }
        };

        // Only fetch if user is logged in and is agent
        const storedUser = JSON.parse(localStorage.getItem("user") || "null");
        if (storedUser && (storedUser.role === "agent" || storedUser.role === "admin")) {
            fetchCoverage();
        }
    }, [user]);

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

                        <Link
                            to="/agent/reports"
                            className={`sidebar-link ${isActive("/agent/reports")}`}
                            data-title="Order Report"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <FaFileAlt /> <span>Order Report</span>
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
                <header className="d-flex flex-column mb-4">
                    {/* Top row: Title + User Menu */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
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
                    </div>

                    {/* Coverage Areas - ENTERPRISE: Agent identity info */}
                    {user && (user.role === "agent" || user.role === "admin") && (
                        <div className="d-flex align-items-center flex-wrap gap-2">
                            <FaMapMarkerAlt className="text-primary me-1" />
                            <span className="text-muted small fw-bold me-2">Coverage:</span>
                            {loadingCoverage ? (
                                <span className="text-muted small">Loading...</span>
                            ) : coverageAreas.length > 0 ? (
                                coverageAreas.map((area) => (
                                    <span 
                                        key={area.id} 
                                        className="badge-coverage-luxury"
                                        title={area.ward_name ? `${area.district_name} - ${area.ward_name}` : area.district_name}
                                    >
                                        {area.district_name}
                                        {area.priority > 1 && (
                                            <span className="ms-1 opacity-75" style={{ fontSize: '0.75em' }}>({area.priority})</span>
                                        )}
                                    </span>
                                ))
                            ) : (
                                <span className="text-muted small">No coverage areas assigned</span>
                            )}
                        </div>
                    )}
                </header>

                {/* PAGE CONTENT */}
                <Outlet />
            </main>
        </div>
    );
};

export default AgentLayout;

