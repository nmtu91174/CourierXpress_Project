// frontend/src/components/layout/UserMenu.jsx
// Enterprise User Menu Component - Dropdown Panel

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaUserCircle, FaCog, FaSignOutAlt, FaBell, FaChevronDown } from "react-icons/fa";
import "../../assets/styles/user_menu.css";

/**
 * UserMenu - Enterprise user menu dropdown
 * 
 * Features:
 * - Avatar/icon trigger
 * - Dropdown panel with user info
 * - Notification badge
 * - Quick actions (View Profile, Settings, Logout)
 * - Close on outside click
 */
export default function UserMenu({ user = null }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      // Call logout API
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      if (userData?.id) {
        try {
          await fetch("http://localhost:8888/api/auth/logout.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              user_id: userData.id,
              role: userData.role,
            }),
          });
        } catch (apiError) {
          console.error("Logout API error:", apiError);
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    }
  };

  const handleViewProfile = () => {
    setIsOpen(false);
    // Route based on role
    const role = user.role?.toLowerCase();
    if (role === "admin") {
      navigate("/admin/profile");
    } else if (role === "agent") {
      navigate("/agent/profile");
    } else {
      navigate("/user/profile");
    }
  };

  const handleSettings = () => {
    setIsOpen(false);
    // Navigate to Account Settings
    const role = user.role?.toLowerCase();
    if (role === "admin") {
      navigate("/admin/account-settings");
    } else if (role === "agent") {
      navigate("/agent/account-settings");
    } else {
      navigate("/user/account-settings");
    }
  };

  // Get user display info
  const userName = user.name || "User";
  const userRole = user.role || "customer";
  // Get avatar URL with proper formatting
  let userAvatar = user.avatar || null;
  if (userAvatar) {
    // Convert relative path to absolute if needed
    if (!userAvatar.startsWith('http') && !userAvatar.startsWith('data:')) {
      userAvatar = `http://localhost:8888${userAvatar}`;
    }
    // Add timestamp to bypass browser cache if not already present
    if (!userAvatar.includes('?v=')) {
      const separator = userAvatar.includes('?') ? '&' : '?';
      userAvatar = `${userAvatar}${separator}v=${Date.now()}`;
    }
  }

  // Format role for display
  const formatRole = (role) => {
    if (!role) return "User";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Notification count (placeholder - will be connected to real notifications later)
  const notificationCount = 0; // TODO: Connect to notification system

  return (
    <>
      {/* Mobile overlay - close on click */}
      {isOpen && (
        <div 
          className="user-menu-overlay"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        />
      )}
      
      <div className="user-menu-wrapper" ref={menuRef}>
        {/* Trigger Button */}
        <button
          className="user-menu-trigger"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="User menu"
          aria-expanded={isOpen}
        >
          <div className="user-menu-avatar">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} />
            ) : (
              <FaUserCircle className="avatar-placeholder" />
            )}
          </div>
          <FaChevronDown className={`chevron-icon ${isOpen ? "open" : ""}`} />
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="user-menu-panel">
          {/* User Info Section */}
          <div className="user-menu-header">
            <div className="user-menu-header-avatar">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} />
              ) : (
                <FaUserCircle className="avatar-placeholder-large" />
              )}
            </div>
            <div className="user-menu-header-info">
              <div className="user-menu-name">{userName}</div>
              <div className="user-menu-role">{formatRole(userRole)}</div>
            </div>
          </div>

          <div className="user-menu-divider" />

          {/* Quick Actions */}
          <div className="user-menu-actions">
            {/* Notifications */}
            <button
              className="user-menu-item"
              onClick={() => {
                setIsOpen(false);
                const role = user.role?.toLowerCase();
                if (role === "admin") {
                  navigate("/admin/notifications");
                } else if (role === "agent") {
                  navigate("/agent/notifications");
                } else {
                  navigate("/user/notifications");
                }
              }}
            >
              <div className="user-menu-item-icon">
                <FaBell />
                {notificationCount > 0 && (
                  <span className="notification-badge">{notificationCount}</span>
                )}
              </div>
              <span className="user-menu-item-text">Notifications</span>
              {notificationCount > 0 && (
                <span className="user-menu-item-badge">{notificationCount}</span>
              )}
            </button>

            {/* View Profile */}
            <button className="user-menu-item" onClick={handleViewProfile}>
              <div className="user-menu-item-icon">
                <FaUser />
              </div>
              <span className="user-menu-item-text">View Profile</span>
            </button>

            {/* Account Settings (placeholder) */}
            <button className="user-menu-item" onClick={handleSettings}>
              <div className="user-menu-item-icon">
                <FaCog />
              </div>
              <span className="user-menu-item-text">Account Settings</span>
            </button>
          </div>

          <div className="user-menu-divider" />

          {/* Logout */}
          <div className="user-menu-footer">
            <button className="user-menu-item logout" onClick={handleLogout}>
              <div className="user-menu-item-icon">
                <FaSignOutAlt />
              </div>
              <span className="user-menu-item-text">Logout</span>
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

