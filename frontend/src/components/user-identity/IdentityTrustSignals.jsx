// frontend/src/components/user-identity/IdentityTrustSignals.jsx
// Enterprise Trust Signals - Verification & Trust Indicators (READ-ONLY)

import React from "react";
import { FaShieldAlt, FaCheckCircle, FaExclamationCircle, FaEnvelope, FaPhone, FaUserShield } from "react-icons/fa";
import "../../assets/styles/user_identity_dashboard.css";

/**
 * IdentityTrustSignals
 * 
 * Displays trust indicators and verification status
 * - Email verification
 * - Phone verification
 * - Identity level
 * - Last security review
 * 
 * READ-ONLY - shows account trust status
 */
export default function IdentityTrustSignals({ user, loading = false }) {
  if (loading || !user) {
    return null;
  }

  // Mock verification status (will be replaced with real data later)
  const emailVerified = !!user.email; // Assume verified if email exists
  const phoneVerified = !!user.phone; // Assume verified if phone exists
  const identityLevel = user.role === "admin" ? "Elevated" : user.role === "agent" ? "Verified" : "Internal";
  const lastSecurityReview = user.created_at ? new Date(user.created_at) : null;

  const formatDate = (date) => {
    if (!date) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <section className="identity-section">
      <h3 className="section-title">Trust & Verification</h3>
      
      <div className="trust-signals-list">
        {/* Email Verification */}
        <div className="trust-signal-item">
          <div className="trust-signal-icon verified">
            {emailVerified ? <FaCheckCircle /> : <FaExclamationCircle />}
          </div>
          <div className="trust-signal-content">
            <div className="trust-signal-title">
              <FaEnvelope className="trust-signal-title-icon" />
              <span>Email Address</span>
            </div>
            <div className={`trust-signal-status ${emailVerified ? "verified" : "pending"}`}>
              {emailVerified ? "Verified" : "Not verified"}
            </div>
          </div>
        </div>

        {/* Phone Verification */}
        <div className="trust-signal-item">
          <div className={`trust-signal-icon ${phoneVerified ? "verified" : "pending"}`}>
            {phoneVerified ? <FaCheckCircle /> : <FaExclamationCircle />}
          </div>
          <div className="trust-signal-content">
            <div className="trust-signal-title">
              <FaPhone className="trust-signal-title-icon" />
              <span>Phone Number</span>
            </div>
            <div className={`trust-signal-status ${phoneVerified ? "verified" : "pending"}`}>
              {phoneVerified ? "Verified" : "Not verified"}
            </div>
          </div>
        </div>

        {/* Identity Level */}
        <div className="trust-signal-item">
          <div className="trust-signal-icon info">
            <FaUserShield />
          </div>
          <div className="trust-signal-content">
            <div className="trust-signal-title">
              <FaShieldAlt className="trust-signal-title-icon" />
              <span>Identity Level</span>
            </div>
            <div className="trust-signal-status info-text">{identityLevel}</div>
          </div>
        </div>

        {/* Last Security Review */}
        {lastSecurityReview && (
          <div className="trust-signal-item">
            <div className="trust-signal-icon info">
              <FaShieldAlt />
            </div>
            <div className="trust-signal-content">
              <div className="trust-signal-title">
                <FaShieldAlt className="trust-signal-title-icon" />
                <span>Account Created</span>
              </div>
              <div className="trust-signal-status info-text">
                {formatDate(lastSecurityReview)}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

