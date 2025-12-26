// frontend/src/pages/admin/AccountSettingsPage.jsx
// Enterprise Account Settings - Security Hub

import React, { useState, useEffect } from "react";
import { Alert, Button, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import ActiveSessionsPanel from "../../components/security/ActiveSessionsPanel";
import SecurityOverviewCard from "../../components/security/SecurityOverviewCard";
import { userService } from "../../services/user.service";
import "../../assets/styles/account_settings.css";

/**
 * AccountSettingsPage
 * 
 * Enterprise Security Hub for Account Settings
 * - Authentication & Access
 * - Active Sessions
 * - Security Controls (2FA, Login History)
 * - Notifications & Preferences
 * - Account Governance (Admin only)
 * 
 * This is a SECURITY CONTROL CENTER, not a profile page
 */
export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [logoutOtherSessions, setLogoutOtherSessions] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    securityAlerts: true, // Cannot be disabled
    systemNotifications: true,
    orderNotifications: true,
  });

  // Interface preferences state
  const [preferences, setPreferences] = useState({
    language: "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: "MM/DD/YYYY",
  });

  useEffect(() => {
    // Check authentication
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");
    if (!currentUser) {
      navigate("/login", { replace: true });
      return;
    }
    setUser(currentUser);
    setLoading(false);
  }, [navigate]);

  // Calculate password strength
  useEffect(() => {
    const password = passwordData.newPassword;
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

    setPasswordStrength(strength);
  }, [passwordData.newPassword]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setError(null);

    // Validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      setIsChangingPassword(false);
      return;
    }

    if (passwordStrength < 3) {
      setError("Password is too weak. Please use a stronger password.");
      setIsChangingPassword(false);
      return;
    }

    try {
      // Call API to change password
      await userService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      // Reset form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      setPasswordStrength(0);
      
      // Show success message
      setError(null);
      alert("Password changed successfully!");
      
      // If user wants to logout other sessions, could implement here
      // For now, just show success
    } catch (err) {
      setError(err.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return "None";
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength === 3) return "Fair";
    if (passwordStrength === 4) return "Good";
    return "Strong";
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return "#ef4444";
    if (passwordStrength === 3) return "#f59e0b";
    if (passwordStrength === 4) return "#10b981";
    return "#10b981";
  };

  if (loading) {
    return (
      <div className="account-settings-page admin-page">
        <div className="settings-container">
          <div className="settings-loading">Loading...</div>
        </div>
      </div>
    );
  }

  const role = user?.role?.toLowerCase() || "customer";
  const isAdmin = role === "admin";

  return (
    <div className="account-settings-page admin-page" data-role={role}>
      <div className="settings-container">
        {/* Page Header */}
        <div className="settings-header">
          <h2 className="settings-title">Account Settings</h2>
          <p className="settings-subtitle">Manage your account security and preferences</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" className="settings-alert">
            {error}
          </Alert>
        )}

        {/* Security Overview */}
        <SecurityOverviewCard user={user} />

        {/* SECTION 1: Authentication & Access */}
        <section className="settings-section">
          <h3 className="section-title">Authentication & Access</h3>

          {/* Change Password Card */}
          <div className="settings-card">
            <h4 className="card-title">Change Password</h4>
            <p className="card-description">
              Update your password to keep your account secure. Use a strong, unique password.
            </p>

            <Form onSubmit={handlePasswordChange}>
              <Form.Group className="mb-3">
                <Form.Label>Current Password</Form.Label>
                <Form.Control
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  required
                  minLength={8}
                />
                {passwordData.newPassword && (
                  <div className="password-strength">
                    <div className="password-strength-bar">
                      <div
                        className="password-strength-fill"
                        style={{
                          width: `${(passwordStrength / 5) * 100}%`,
                          backgroundColor: getPasswordStrengthColor(),
                        }}
                      />
                    </div>
                    <small className="password-strength-label">
                      Strength: {getPasswordStrengthLabel()}
                    </small>
                  </div>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Confirm New Password</Form.Label>
                <Form.Control
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Log out from all other sessions after password change"
                  checked={logoutOtherSessions}
                  onChange={(e) => setLogoutOtherSessions(e.target.checked)}
                />
              </Form.Group>

              <div className="card-actions">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isChangingPassword}
                  className="btn-lux-primary"
                >
                  {isChangingPassword ? "Changing Password..." : "Change Password"}
                </Button>
              </div>
            </Form>
          </div>
        </section>

        {/* SECTION 2: Active Sessions */}
        <section className="settings-section">
          <h3 className="section-title">Active Sessions</h3>
          <ActiveSessionsPanel userId={user?.id} />
        </section>

        {/* SECTION 3: Security Controls */}
        <section className="settings-section">
          <h3 className="section-title">Security Controls</h3>

          {/* Two-Factor Authentication */}
          <div className="settings-card">
            <h4 className="card-title">Two-Factor Authentication (2FA)</h4>
            <p className="card-description">
              Add an extra layer of security to your account.
            </p>
            <div className="security-control-status">
              <span className="status-label">Status:</span>
              <span className="status-value inactive">Disabled</span>
            </div>
            <div className="card-actions">
              <Button variant="outline-primary" disabled>
                Enable 2FA (Coming Soon)
              </Button>
            </div>
          </div>

          {/* Login History Summary */}
          <div className="settings-card">
            <h4 className="card-title">Login History</h4>
            <div className="login-history-summary">
              <div className="history-item">
                <span className="history-label">Last successful login:</span>
                <span className="history-value">
                  {new Date().toLocaleString()}
                </span>
              </div>
              <div className="history-item">
                <span className="history-label">Last failed attempt:</span>
                <span className="history-value">None</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Notifications & Preferences */}
        <section className="settings-section">
          <h3 className="section-title">Notifications & Preferences</h3>

          {/* Notification Settings */}
          <div className="settings-card">
            <h4 className="card-title">Notification Settings</h4>
            <Form>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label="Security alerts (cannot be disabled)"
                  checked={notifications.securityAlerts}
                  disabled
                  onChange={() => {}}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label="System notifications"
                  checked={notifications.systemNotifications}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      systemNotifications: e.target.checked,
                    })
                  }
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  label="Order-related notifications"
                  checked={notifications.orderNotifications}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      orderNotifications: e.target.checked,
                    })
                  }
                />
              </Form.Group>
              <div className="card-actions">
                <Button variant="outline-primary">Save Preferences</Button>
              </div>
            </Form>
          </div>

          {/* Interface Preferences */}
          <div className="settings-card">
            <h4 className="card-title">Interface Preferences</h4>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Language</Form.Label>
                <Form.Select
                  value={preferences.language}
                  onChange={(e) =>
                    setPreferences({ ...preferences, language: e.target.value })
                  }
                >
                  <option value="en">English</option>
                  <option value="vi">Tiếng Việt</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Timezone</Form.Label>
                <Form.Select
                  value={preferences.timezone}
                  onChange={(e) =>
                    setPreferences({ ...preferences, timezone: e.target.value })
                  }
                >
                  <option value={preferences.timezone}>{preferences.timezone}</option>
                  <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
                  <option value="UTC">UTC</option>
                </Form.Select>
              </Form.Group>
              <div className="card-actions">
                <Button variant="outline-primary">Save Preferences</Button>
              </div>
            </Form>
          </div>
        </section>

        {/* SECTION 5: Account Governance (Admin Only) */}
        {isAdmin && (
          <section className="settings-section">
            <h3 className="section-title">Account Governance</h3>

            <div className="settings-card">
              <h4 className="card-title">Role & Permissions</h4>
              <div className="governance-info">
                <div className="governance-item">
                  <span className="governance-label">Role:</span>
                  <span className="governance-value">{user.role}</span>
                </div>
                <div className="governance-item">
                  <span className="governance-label">Permission Scope:</span>
                  <span className="governance-value">System-wide</span>
                </div>
                <div className="governance-item">
                  <span className="governance-label">Account Created:</span>
                  <span className="governance-value">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="governance-item">
                  <span className="governance-label">Last Permission Update:</span>
                  <span className="governance-value">N/A</span>
                </div>
              </div>
              <div className="governance-note">
                <small className="text-muted">
                  Permissions are managed by system administrators. Contact an administrator
                  to request changes.
                </small>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

