// frontend/src/components/security/ActiveSessionsPanel.jsx
// Enterprise Active Sessions Panel

import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import { FaDesktop, FaMobile, FaLaptop, FaTimes } from "react-icons/fa";
import "../../assets/styles/account_settings.css";

/**
 * ActiveSessionsPanel
 * 
 * Displays active and recent user sessions
 * - Device type
 * - Browser
 * - IP address
 * - Location (mock)
 * - Last active time
 * - Revoke session button
 */
export default function ActiveSessionsPanel({ userId }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // Get current IP and device info
    const getCurrentSessionInfo = () => {
      // Try to detect device type
      const userAgent = navigator.userAgent || "";
      let device = "Desktop";
      let deviceIcon = FaDesktop;
      
      if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
        device = "Mobile";
        deviceIcon = FaMobile;
      } else if (/Laptop|Macintosh/i.test(userAgent)) {
        device = "Laptop";
        deviceIcon = FaLaptop;
      }

      // Get browser
      let browser = "Unknown";
      if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
        browser = "Chrome";
      } else if (userAgent.includes("Firefox")) {
        browser = "Firefox";
      } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
        browser = "Safari";
      } else if (userAgent.includes("Edg")) {
        browser = "Edge";
      }

      // Mock IP (in real app, get from server)
      const ip = "192.168.1.100";
      
      // Mock location based on IP (in real app, use geolocation API)
      const location = "Ho Chi Minh City, Vietnam";

      return { device, deviceIcon, browser, ip, location };
    };

    const currentInfo = getCurrentSessionInfo();

    // Mock session data (will be replaced with real API later)
    const mockSessions = [
      {
        id: 1,
        device: currentInfo.device,
        deviceIcon: currentInfo.deviceIcon,
        browser: currentInfo.browser,
        ip: currentInfo.ip,
        location: currentInfo.location,
        lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        isCurrent: true,
      },
      {
        id: 2,
        device: "Desktop",
        deviceIcon: FaDesktop,
        browser: "Chrome",
        ip: "192.168.1.101",
        location: "Hanoi, Vietnam",
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isCurrent: false,
      },
      {
        id: 3,
        device: "Mobile",
        deviceIcon: FaMobile,
        browser: "Safari",
        ip: "192.168.1.102",
        location: "Da Nang, Vietnam",
        lastActive: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        isCurrent: false,
      },
    ];

    // Simulate API call
    setTimeout(() => {
      setSessions(mockSessions);
      setLoading(false);
    }, 500);
  }, [userId]);

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to revoke this session?")) {
      return;
    }

    // TODO: Implement revoke session API
    setSessions(sessions.filter((s) => s.id !== sessionId));
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return timestamp.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  if (loading) {
    return (
      <div className="settings-card">
        <div className="sessions-loading">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="settings-card">
      <h4 className="card-title">Active Sessions</h4>
      <p className="card-description">
        Manage devices that have access to your account. Revoke any session you don't recognize.
      </p>

      {sessions.length > 0 ? (
        <div className="sessions-list">
          {sessions.map((session) => {
            const DeviceIcon = session.deviceIcon || FaDesktop;
            return (
              <div
                key={session.id}
                className={`session-item ${session.isCurrent ? "current" : ""}`}
              >
                <div className="session-icon">
                  <DeviceIcon />
                </div>
                <div className="session-info">
                  <div className="session-header">
                    <span className="session-device">{session.device}</span>
                    {session.isCurrent && (
                      <span className="session-badge current">Current Session</span>
                    )}
                  </div>
                  <div className="session-details">
                    <span>{session.browser}</span>
                    <span className="session-separator">•</span>
                    <span>{session.ip}</span>
                    <span className="session-separator">•</span>
                    <span>{session.location}</span>
                  </div>
                  <div className="session-time">
                    Last active: {formatTimeAgo(session.lastActive)}
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    className="session-revoke-btn"
                  >
                    <FaTimes /> Revoke
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="sessions-empty">No active sessions</div>
      )}
    </div>
  );
}

