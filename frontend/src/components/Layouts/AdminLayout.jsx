// frontend/src/components/Layouts/AdminLayout.jsx
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FaTachometerAlt, FaBoxOpen, FaUsers, FaChartBar, FaSignOutAlt } from 'react-icons/fa';
import '../../assets/styles/admin.css'; // Import file CSS ở trên

const AdminLayout = () => {
    // Dùng hook này để biết đang ở trang nào thì tô màu menu đó (Active state)
    const location = useLocation();

    // Hàm kiểm tra active
    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <div className="admin-wrapper">
            {/* 1. SIDEBAR (BÊN TRÁI) */}
            <nav className="sidebar">
                <div className="sidebar-header">
                    <h4 className="fw-bold m-0 text-white">Courier<span style={{ color: '#ee4d2d' }}>X</span>press</h4>
                    <small className="text-muted">Admin Portal</small>
                </div>

                <div className="sidebar-menu mt-3">
                    <Link to="/admin/dashboard" className={`sidebar-link ${isActive('/admin/dashboard')}`}>
                        <FaTachometerAlt /> Dashboard
                    </Link>

                    <Link to="/admin/couriers" className={`sidebar-link ${isActive('/admin/couriers')}`}>
                        <FaBoxOpen /> Quản lý Đơn hàng
                    </Link>

                    <Link to="/admin/agents" className={`sidebar-link ${isActive('/admin/agents')}`}>
                        <FaUsers /> Quản lý Đại lý
                    </Link>

                    <Link to="/admin/reports" className={`sidebar-link ${isActive('/admin/reports')}`}>
                        <FaChartBar /> Báo cáo
                    </Link>

                    {/* Nút đăng xuất giả */}
                    <Link to="/login" className="sidebar-link mt-5 text-danger">
                        <FaSignOutAlt /> Đăng xuất
                    </Link>
                </div>
            </nav>

            {/* 2. MAIN CONTENT (BÊN PHẢI) */}
            <main className="admin-content">
                {/* Header nhỏ phía trên nội dung */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="text-secondary m-0">Hệ thống quản lý vận chuyển</h5>
                    <div className="d-flex align-items-center">
                        <span className="me-2 text-muted small">Xin chào,</span>
                        <span className="fw-bold">Administrator</span>
                        <div className="bg-secondary rounded-circle ms-2" style={{ width: 35, height: 35 }}></div>
                    </div>
                </div>

                {/* Outlet: Nơi các trang con (Dashboard, Couriers...) sẽ hiển thị */}
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;