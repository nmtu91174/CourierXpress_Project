// frontend/src/components/Layouts/AdminLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
    FaTachometerAlt,
    FaBoxOpen,
    FaUsers,
    FaChartBar,
    FaSignOutAlt,
    FiLayers
} from "react-icons/fa";
import UserMenu from "../layout/UserMenu";

import "../../assets/styles/admin.css";
import { FiCreditCard, FiPackage, FiPercent } from "react-icons/fi";

const AdminLayout = () => {
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
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.removeItem("user");
        setUser(null);
        navigate("/login"); // Quay về trang login sau khi logout
    };

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
        <div className="admin-wrapper">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div 
                    className="sidebar-overlay" 
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                />
            )}

            {/* 📌 SIDEBAR — Luôn cố định */}
            <aside className={`sidebar d-flex flex-column justify-content-between ${sidebarOpen ? 'sidebar-open' : ''}`}>

                {/* LOGO / BRAND */}
                <div>
                    <div className="sidebar-header">
                        <h4 className="fw-bold m-0 text-white">
                            Courier<span style={{ color: "#ff4d24" }}>X</span>press
                        </h4>
                        <small className="text-muted">Admin Portal</small>
                    </div>

                    {/* NAVIGATION */}
                    <nav className="sidebar-menu mt-3">
                        <Link
                            to="/admin/dashboard"
                            className={`sidebar-link ${isActive("/admin/dashboard")}`}
                            data-title="Dashboard"
                        >
                            <FaTachometerAlt /> <span>Dashboard</span>
                        </Link>

                        <Link
                            to="/admin/orders"
                            className={`sidebar-link ${isActive("/admin/orders")}`}
                            data-title="Order Management"
                        >
                            <FaBoxOpen /> <span>Order Management</span>
                        </Link>

                        <Link
                            to="/admin/agents"
                            className={`sidebar-link ${isActive("/admin/agents")}`}
                            data-title="Agent Management"
                        >
                            <FaUsers /> <span>Agent Management</span>
                        </Link>

                        <Link
                            to="/admin/reports"
                            className={`sidebar-link ${isActive("/admin/reports")}`}
                            data-title="Reports"
                        >
                            <FaChartBar /> <span>Reports</span>
                        </Link>
                        {/* MASTER DATA */}
                        <div className="sidebar-section-title">
                        </div>
                        

                        <Link
                        to="/admin/service-types"
                        className={`sidebar-link ${isActive("/admin/service-types")}`}
                        >
                        <FiLayers /> <span>Service Types</span>
                        </Link>
<Link
                        to="/admin/payment-methods"
                        className={`sidebar-link ${isActive("/admin/payment-methods")}`}
                        >
                        <FiCreditCard /> <span>Payment Methods</span>
                        </Link>

                        <Link
                        to="/admin/item-categories"
                        className={`sidebar-link ${isActive("/admin/item-categories")}`}
                        >
                        <FiPackage /> <span>Item Categories</span>
                        </Link>

                        <Link
                        to="/admin/fees"
                        className={`sidebar-link ${isActive("/admin/fees")}`}
                        >
                        <FiPercent /> <span>Fees</span>
                        </Link>

                    </nav>
                </div>

                {/* User menu is now in header - removed sidebar logout */}
                <div className="mb-3">
                    {/* Logout moved to UserMenu component */}
                </div>
            </aside>

            {/* 📌 CONTENT — Scrollable area */}
            <main className="admin-content">

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
                            <span className="fw-bold text-muted">Administrator</span>
                        )}
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
