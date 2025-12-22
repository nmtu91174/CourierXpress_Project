// frontend/src/components/user-identity/IdentitySecurity.jsx
// Enterprise Identity Security - Trust Indicators & Security Status

import React from "react";
import { FaShieldAlt, FaEnvelope, FaCheckCircle, FaClock, FaDesktop } from "react-icons/fa";
import "../../assets/styles/user_identity_dashboard.css";

/**
 * IdentitySecurity
 * 
 * Security & Trust Indicators:
 * - Email verification status
 * - Account status
 * - Last login info
 * - Session awareness
 */
export default function IdentitySecurity({ user, loading = false }) {
  if (loading || !user) {
    return (
      <section className="identity-security">
        <div className="security-skeleton">
          <div className="security-item-skeleton" />
          <div className="security-item-skeleton" />
        </div>
      </section>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Not available";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const isEmailVerified = user.email ? true : false; // Placeholder - will connect to real verification status
  const isActive = user.status === "active";
  const lastLogin = user.last_login || null;

  return (
    <section className="identity-security">
      <h3 className="section-title">Account Trust & Security</h3>
      
      <div className="security-list">
        {/* Email Verification */}
        <div className="security-item">
          <div className="security-item-icon verified">
            <FaEnvelope />
          </div>
          <div className="security-item-content">
            <div className="security-item-title">Email Address</div>
            <div className="security-item-description">{user.email || "N/A"}</div>
            <div className={`security-item-status ${isEmailVerified ? "verified" : "pending"}`}>
              {isEmailVerified ? (
                <>
                  <FaCheckCircle /> Verified
                </>
              ) : (
                <>
                  <FaClock /> Pending verification
                </>
              )}
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="security-item">
          <div className={`security-item-icon ${isActive ? "active" : "inactive"}`}>
            <FaShieldAlt />
          </div>
          <div className="security-item-content">
            <div className="security-item-title">Account Status</div>
            <div className={`security-item-description ${isActive ? "status-active" : "status-inactive"}`}>
              {isActive ? "Active and operational" : "Account restricted"}
            </div>
            <div className={`security-item-status ${isActive ? "verified" : "warning"}`}>
              {isActive ? (
                <>
                  <FaCheckCircle /> System access enabled
                </>
              ) : (
                <>
                  <FaClock /> Contact administrator
                </>
              )}
            </div>
          </div>
        </div>

        {/* Last Login */}
        {lastLogin && (
          <div className="security-item">
            <div className="security-item-icon info">
              <FaDesktop />
            </div>
            <div className="security-item-content">
              <div className="security-item-title">Last Login</div>
              <div className="security-item-description">{formatDate(lastLogin)}</div>
              <div className="security-item-status info-text">
                Current session active
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

