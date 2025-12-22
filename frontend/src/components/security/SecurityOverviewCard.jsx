// frontend/src/components/security/SecurityOverviewCard.jsx
// Enterprise Security Overview Card

import React from "react";
import { FaShieldAlt, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import "../../assets/styles/account_settings.css";

/**
 * SecurityOverviewCard
 * 
 * Displays security overview summary
 * - Email verification status
 * - 2FA status
 * - Active sessions count
 * - Last login time
 */
export default function SecurityOverviewCard({ user }) {
  if (!user) return null;

  // Mock security status (will be replaced with real data later)
  const emailVerified = !!user.email;
  const twoFactorEnabled = false;
  const activeSessionsCount = 2; // Mock
  const lastLogin = new Date(); // Mock

  const securityScore = (emailVerified ? 1 : 0) + (twoFactorEnabled ? 1 : 0);
  const securityHealth = securityScore === 2 ? "good" : securityScore === 1 ? "fair" : "poor";

  return (
    <div className="security-overview-card">
      <div className="security-overview-header">
        <FaShieldAlt className="security-overview-icon" />
        <h3 className="security-overview-title">Security Overview</h3>
      </div>

      <div className="security-overview-body">
        <div className="security-metrics">
          {/* Email Verification */}
          <div className="security-metric">
            <div className="metric-icon verified">
              {emailVerified ? <FaCheckCircle /> : <FaExclamationTriangle />}
            </div>
            <div className="metric-content">
              <div className="metric-label">Email</div>
              <div className={`metric-status ${emailVerified ? "verified" : "pending"}`}>
                {emailVerified ? "Verified" : "Not verified"}
              </div>
            </div>
          </div>

          {/* 2FA Status */}
          <div className="security-metric">
            <div className={`metric-icon ${twoFactorEnabled ? "verified" : "pending"}`}>
              {twoFactorEnabled ? <FaCheckCircle /> : <FaExclamationTriangle />}
            </div>
            <div className="metric-content">
              <div className="metric-label">Two-Factor Auth</div>
              <div className={`metric-status ${twoFactorEnabled ? "verified" : "pending"}`}>
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </div>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="security-metric">
            <div className="metric-icon info">
              <FaShieldAlt />
            </div>
            <div className="metric-content">
              <div className="metric-label">Active Sessions</div>
              <div className="metric-status info-text">{activeSessionsCount}</div>
            </div>
          </div>

          {/* Last Login */}
          <div className="security-metric">
            <div className="metric-icon info">
              <FaShieldAlt />
            </div>
            <div className="metric-content">
              <div className="metric-label">Last Login</div>
              <div className="metric-status info-text">
                {lastLogin.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Security Health Indicator */}
        <div className={`security-health health-${securityHealth}`}>
          <span className="health-label">Security Health:</span>
          <span className="health-value">{securityHealth.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

