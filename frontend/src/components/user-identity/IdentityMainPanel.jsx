// frontend/src/components/user-identity/IdentityMainPanel.jsx
// Enterprise Identity Main Panel - Role-based Context & Actions (RIGHT PANEL)

import React, { useState } from "react";
import { FaEdit, FaUser, FaPhone, FaMapMarkerAlt, FaEnvelope, FaSave, FaTimes, FaImage } from "react-icons/fa";
import IdentityStats from "./IdentityStats";
import IdentitySecurity from "./IdentitySecurity";
import IdentityOrganizationalContext from "./IdentityOrganizationalContext";
import IdentityActivitySnapshot from "./IdentityActivitySnapshot";
import IdentityTrustSignals from "./IdentityTrustSignals";
import "../../assets/styles/user_identity_dashboard.css";

/**
 * IdentityMainPanel
 * 
 * RIGHT PANEL - Role-based Context & Actions (dynamic)
 * - Admin: System-level context
 * - Agent: Operational context
 * - User: Personal context
 * 
 * Fully interactive - can edit profile here
 */
export default function IdentityMainPanel({ user, stats, loading, onUpdateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  if (loading || !user) {
    return (
      <main className="identity-main-panel">
        <div className="main-panel-skeleton">
          <div className="section-skeleton" />
          <div className="section-skeleton" />
        </div>
      </main>
    );
  }

  const role = user.role || "customer";

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      name: user.name || "",
      phone: user.phone || "",
      address: user.address || "",
    });
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      name: user.name || "",
      phone: user.phone || "",
      address: user.address || "",
    });
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please select JPG, PNG, GIF, or WEBP image.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size too large. Maximum 5MB allowed.");
      return;
    }

    setAvatarFile(file);
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      // Ensure address is included in update payload (even if empty)
      const updatePayload = {
        ...editData,
        address: editData.address || "", // Explicitly include address, even if empty
      };
      
      // Use updateProfile with avatar file if selected
      if (avatarFile) {
        await onUpdateProfile(updatePayload, avatarFile);
      } else {
        await onUpdateProfile(updatePayload);
      }
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error("Failed to update profile:", error);
      // Error handling will be shown via parent component
    }
  };

  return (
    <main className="identity-main-panel">
      {/* Personal Information Section */}
      <section className="identity-section">
        <div className="section-header">
          <h3 className="section-title">Personal Information</h3>
          {!isEditing ? (
            <button className="btn-icon-text" onClick={handleEdit}>
              <FaEdit />
              <span>Edit</span>
            </button>
          ) : (
            <div className="section-actions">
              <button className="btn-icon-text primary" onClick={handleSave}>
                <FaSave />
                <span>Save</span>
              </button>
              <button className="btn-icon-text" onClick={handleCancel}>
                <FaTimes />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        <div className="info-list">
          {/* Avatar Upload (only when editing) */}
          {isEditing && (() => {
            // Get current avatar URL with proper formatting
            let currentAvatarUrl = user.avatar || null;
            if (currentAvatarUrl && !avatarPreview) {
              // Convert relative path to absolute if needed
              if (!currentAvatarUrl.startsWith('http') && !currentAvatarUrl.startsWith('data:')) {
                currentAvatarUrl = `http://localhost:8888${currentAvatarUrl}`;
              }
              // Add timestamp to bypass cache
              const separator = currentAvatarUrl.includes('?') ? '&' : '?';
              currentAvatarUrl = `${currentAvatarUrl}${separator}v=${Date.now()}`;
            }
            
            return (
              <div className="info-item">
                <div className="info-item-label">
                  <FaImage className="info-item-icon" />
                  <span>Profile Avatar</span>
                </div>
                <div className="avatar-upload-section">
                  <div className="avatar-preview-container">
                    <div className="avatar-preview">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar preview" />
                      ) : currentAvatarUrl ? (
                        <img src={currentAvatarUrl} alt="Current avatar" />
                      ) : (
                        <div className="avatar-placeholder">
                          <FaUser className="avatar-placeholder-icon" />
                        </div>
                      )}
                    </div>
                    <label htmlFor="avatar-upload" className="avatar-upload-btn">
                      <FaImage /> Choose Image
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleAvatarChange}
                      style={{ display: "none" }}
                    />
                    {avatarFile && (
                      <div className="avatar-file-info">
                        <small>{avatarFile.name} ({(avatarFile.size / 1024 / 1024).toFixed(2)} MB)</small>
                      </div>
                    )}
                  </div>
                  <div className="avatar-upload-help">
                    <small className="text-muted">JPG, PNG, GIF, or WEBP. Max 5MB.</small>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Name */}
          <div className="info-item">
            <div className="info-item-label">
              <FaUser className="info-item-icon" />
              <span>Full Name</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                className="info-item-input"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Enter your name"
              />
            ) : (
              <div className="info-item-value">{user.name || "N/A"}</div>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="info-item">
            <div className="info-item-label">
              <FaEnvelope className="info-item-icon" />
              <span>Email Address</span>
            </div>
            <div className="info-item-value read-only">{user.email || "N/A"}</div>
          </div>

          {/* Phone */}
          <div className="info-item">
            <div className="info-item-label">
              <FaPhone className="info-item-icon" />
              <span>Phone Number</span>
            </div>
            {isEditing ? (
              <input
                type="tel"
                className="info-item-input"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            ) : (
              <div className="info-item-value">{user.phone || "N/A"}</div>
            )}
          </div>

          {/* Address */}
          <div className="info-item">
            <div className="info-item-label">
              <FaMapMarkerAlt className="info-item-icon" />
              <span>Address</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                className="info-item-input"
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                placeholder="Enter address"
              />
            ) : (
              <div className="info-item-value">{user.address !== null && user.address !== undefined && user.address !== '' ? user.address : "N/A"}</div>
            )}
          </div>
        </div>
      </section>

      {/* Organizational Context Section */}
      <IdentityOrganizationalContext user={user} loading={loading} />

      {/* Statistics Section */}
      <IdentityStats user={user} stats={stats} loading={loading} />

      {/* Activity Snapshot Section */}
      <IdentityActivitySnapshot user={user} loading={loading} />

      {/* Trust Signals Section */}
      <IdentityTrustSignals user={user} loading={loading} />

      {/* Security Section (minimal, security details go to Account Settings) */}
      <IdentitySecurity user={user} loading={loading} />

      {/* Role-based Context Message */}
      {role === "admin" && (
        <section className="identity-section context-message">
          <div className="context-content admin">
            <h4 className="context-title">System Administrator</h4>
            <p className="context-text">
              You have system-level access and are responsible for system integrity, 
              user management, and operational oversight.
            </p>
          </div>
        </section>
      )}

      {role === "agent" && (
        <section className="identity-section context-message">
          <div className="context-content agent">
            <h4 className="context-title">Operational Account</h4>
            <p className="context-text">
              You manage orders, coordinate shipments, and ensure smooth workflow operations.
            </p>
          </div>
        </section>
      )}

      {(role === "customer" || !role) && (
        <section className="identity-section context-message">
          <div className="context-content user">
            <h4 className="context-title">Customer Account</h4>
            <p className="context-text">
              You can create orders, track shipments, and manage your shipping history.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

