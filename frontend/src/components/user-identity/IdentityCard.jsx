// frontend/src/components/user-identity/IdentityCard.jsx
// Enterprise Identity Card - Static Identity Display (Full-width card at top)

import React from "react";
import { FaUserCircle, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import "../../assets/styles/user_identity_dashboard.css";

/**
 * IdentityCard
 * 
 * Full-width Identity Summary Card (displayed at top of page)
 * - Avatar
 * - Full name
 * - Role
 * - Account status
 * - Member since
 * 
 * This panel is NOT editable directly - represents "who I am"
 * Displayed similar to quick action cards in Dashboard
 */
export default function IdentityCard({ user, loading = false }) {
  if (loading || !user) {
    return (
      <div className="identity-card">
        <div className="identity-card-skeleton">
          <div className="avatar-skeleton-large" />
          <div className="info-skeleton">
            <div className="line-skeleton-title" />
            <div className="line-skeleton-role" />
            <div className="line-skeleton-status" />
            <div className="line-skeleton-date" />
          </div>
        </div>
      </div>
    );
  }

  const formatRole = (role) => {
    if (!role) return "User";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const isActive = user.status === "active";
  const userName = user.name || "User";
  const userRole = formatRole(user.role);
  // Ensure avatar URL is absolute if it's a relative path
  let userAvatar = user.avatar || null;
  if (userAvatar) {
    // Convert relative path to absolute
    if (!userAvatar.startsWith('http') && !userAvatar.startsWith('data:')) {
      userAvatar = `http://localhost:8888${userAvatar}`;
    }
    // Always add timestamp to prevent browser cache
    const timestamp = Date.now();
    const separator = userAvatar.includes('?') ? '&' : '?';
    userAvatar = `${userAvatar}${separator}v=${timestamp}`;
  }

  return (
    <div className="identity-card">
      <div className="identity-card-content">
        {/* Avatar */}
        <div className="identity-avatar-large">
          {userAvatar ? (
            <img src={userAvatar} alt={userName} key={userAvatar} />
          ) : (
            <FaUserCircle className="avatar-placeholder-large" />
          )}
        </div>

        {/* Name */}
        <h1 className="identity-name">{userName}</h1>

        {/* Role Badge */}
        <div className="identity-role-badge">
          <span className="role-label">{userRole}</span>
        </div>

        {/* Status */}
        <div className="identity-status">
          <div className={`status-indicator ${isActive ? "active" : "inactive"}`}>
            {isActive ? <FaCheckCircle /> : <FaTimesCircle />}
            <span className="status-text">{userRole} Account</span>
          </div>
          <div className="status-detail">
            {isActive ? "Active and operational" : "Account restricted"}
          </div>
          {/* Sub-info line - Enterprise authority signal */}
          <div className="status-sub-info">
            {user.role === "admin" && (
              <span className="sub-info-text">
                Admin Account • System-level access • Verified
              </span>
            )}
            {user.role === "agent" && (
              <span className="sub-info-text">
                Agent Account • Operational access • Verified
              </span>
            )}
            {(user.role === "customer" || !user.role) && (
              <span className="sub-info-text">
                Customer Account • Standard access • Verified
              </span>
            )}
          </div>
        </div>

        {/* Member Since */}
        <div className="identity-meta">
          <div className="meta-label">Member Since</div>
          <div className="meta-value">{formatDate(user.created_at)}</div>
        </div>

        {/* Identity Description (Role-based) */}
        <div className="identity-description">
          {user.role === "admin" && (
            <p className="description-text">
              System administrator with full system access and management capabilities.
            </p>
          )}
          {user.role === "agent" && (
            <p className="description-text">
              Operational account with order management and workflow responsibilities.
            </p>
          )}
          {(user.role === "customer" || !user.role) && (
            <p className="description-text">
              Customer account for shipping and order tracking services.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

