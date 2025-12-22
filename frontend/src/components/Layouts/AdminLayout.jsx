// frontend/src/components/Layouts/AdminLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
    FaTachometerAlt,
    FaBoxOpen,
    FaUsers,
    FaChartBar,
    FaSignOutAlt
} from "react-icons/fa";

import "../../assets/styles/admin.css";

const AdminLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) setUser(storedUser);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("user");
        setUser(null);
        navigate("/login"); // Quay về trang login sau khi logout
    };

    const isActive = (path) => (location.pathname === path ? "active" : "");

    return (
        <div className="admin-wrapper">
            {/* 📌 SIDEBAR — Luôn cố định */}
            <aside className="sidebar d-flex flex-column justify-content-between">

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
                        >
                            <FaTachometerAlt /> <span>Dashboard</span>
                        </Link>

                        <Link
                            to="/admin/orders"
                            className={`sidebar-link ${isActive("/admin/orders")}`}
                        >
                            <FaBoxOpen /> <span>Quản lý Đơn hàng</span>
                        </Link>

                        <Link
                            to="/admin/agents"
                            className={`sidebar-link ${isActive("/admin/agents")}`}
                        >
                            <FaUsers /> <span>Quản lý Đại lý</span>
                        </Link>

                        <Link
                            to="/admin/reports"
                            className={`sidebar-link ${isActive("/admin/reports")}`}
                        >
                            <FaChartBar /> <span>Báo cáo</span>
                        </Link>
                        {/* MASTER DATA */}
                        <div className="sidebar-section-title">
                        </div>

                        <Link
                        to="/admin/service-types"
                        className={`sidebar-link ${isActive("/admin/service-types")}`}
                        >
                        <FaBoxOpen /> <span>Service Types</span>
                        </Link>

                        <Link
                        to="/admin/payment-methods"
                        className={`sidebar-link ${isActive("/admin/payment-methods")}`}
                        >
                        <FaBoxOpen /> <span>Payment Methods</span>
                        </Link>

                        <Link
                        to="/admin/item-categories"
                        className={`sidebar-link ${isActive("/admin/item-categories")}`}
                        >
                        <FaBoxOpen /> <span>Item Categories</span>
                        </Link>

                        <Link
                        to="/admin/fees"
                        className={`sidebar-link ${isActive("/admin/fees")}`}
                        >
                        <FaBoxOpen /> <span>Fees</span>
                        </Link>

                    </nav>
                </div>

                {/* LOGOUT SECTION — bottom anchor */}
                <div className="mb-3">
                    <button
                        onClick={handleLogout}
                        className="sidebar-link text-danger fw-semibold border-0 bg-transparent d-flex align-items-center"
                    >
                        <FaSignOutAlt /> <span className="ms-1">Đăng xuất</span>
                    </button>
                </div>
            </aside>

            {/* 📌 CONTENT — Scrollable area */}
            <main className="admin-content">

                {/* HEADER */}
                <header className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="text-secondary m-0">Hệ thống quản lý vận chuyển</h5>

                    <div className="d-flex align-items-center">
                        {user ? (
                            <>
                                <span className="me-2 text-muted small">Xin chào,</span>
                                <span className="fw-bold">{user.name}</span>

                                <div
                                    className="rounded-circle ms-2"
                                    style={{
                                        width: 35,
                                        height: 35,
                                        background: "linear-gradient(135deg, #ff4d24, #ff824d)"
                                    }}
                                ></div>
                            </>
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
