// frontend/src/components/Layouts/AdminLayout.jsx
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaHistory,
  FaMapMarkedAlt,
  FaBell,
  FaCog
} from 'react-icons/fa';

import Header from '../Header';
import '../../assets/styles/admin.css';

const UserLayout = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="app-wrapper">


      <Header />

      <div className="body-wrapper">

        {/* ===== SIDEBAR ===== */}
        <nav className="sidebar">
          <div className="sidebar-header">
            <h4 className="fw-bold m-0 text-white">
              Courier<span style={{ color: '#ee4d2d' }}>X</span>press
            </h4>
            <small className="text-muted">Admin Portal</small>
          </div>

          <div className="sidebar-menu mt-3">
            <Link to="#" className={`sidebar-link ${isActive('/user/profile')}`}>
              <FaUsers /> Hồ sơ cá nhân
            </Link>

            <Link to="#" className={`sidebar-link ${isActive('/user/history')}`}>
              <FaHistory /> Lịch sử hoạt động
            </Link>

            <Link to="#" className={`sidebar-link ${isActive('/user/areas')}`}>
              <FaMapMarkedAlt /> Khu vực giao hàng
            </Link>

            <Link to="#" className={`sidebar-link ${isActive('/user/notifications')}`}>
              <FaBell /> Thông báo
            </Link>

            <Link to="#" className={`sidebar-link ${isActive('/user/reports')}`}>
              <FaChartBar /> Báo cáo
            </Link>

            <Link to="#" className={`sidebar-link ${isActive('/user/settings')}`}>
              <FaCog /> Cài đặt
            </Link>

            <Link to="/login" className="sidebar-link mt-5 text-danger">
              <FaSignOutAlt /> Đăng xuất
            </Link>
          </div>
        </nav>

        {/* ===== MAIN CONTENT ===== */}
        <main className="admin-content">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default UserLayout;
