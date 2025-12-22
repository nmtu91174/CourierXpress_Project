// frontend/src/components/notifications/NotificationsDropdown.jsx
// Enterprise Notifications Dropdown - Quick signal display

import React, { useState, useEffect } from "react";
import { FaBell, FaLock, FaBox, FaExclamationTriangle, FaCheckCircle, FaClock } from "react-icons/fa";
import "../../assets/styles/notifications.css";

/**
 * NotificationsDropdown
 * 
 * Quick notifications dropdown for UserMenu
 * - Shows unread count badge
 * - Lists recent notifications (last 10)
 * - Icons by type (security, order, system)
 * - Time ago display
 */
export default function NotificationsDropdown({ userId, onViewAll }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8888/api/users/get_notifications.php?limit=10`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const result = await response.json();
        if (result.status === "success") {
          setNotifications(result.data.notifications || []);
          // Count unread (all are unread for now - mock logic)
          setUnreadCount(result.data.notifications?.length || 0);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const getNotificationIcon = (entity, action) => {
    if (entity === "security" || entity === "users") {
      return <FaLock className="notification-icon security" />;
    }
    if (entity === "orders") {
      return <FaBox className="notification-icon order" />;
    }
    return <FaExclamationTriangle className="notification-icon system" />;
  };

  const formatNotificationMessage = (notification) => {
    const action = notification.action || "";
    const entity = notification.entity || "";

    // Simplify action messages
    if (action.includes("Password")) return "Password changed";
    if (action.includes("Login")) return "Login detected";
    if (action.includes("CREATE_ORDER")) return "Order created";
    if (action.includes("UPDATE_ORDER")) return "Order updated";
    if (action.includes("ASSIGN")) return "Order assigned";

    return action.length > 50 ? action.substring(0, 50) + "..." : action;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return time.toLocaleDateString();
    }
  };

  return (
    <div className="notifications-dropdown">
      <div className="notifications-header">
        <h5 className="notifications-title">Notifications</h5>
        {notifications.length > 0 && (
          <button className="notifications-view-all" onClick={onViewAll}>
            View All
          </button>
        )}
      </div>

      {loading ? (
        <div className="notifications-loading">Loading...</div>
      ) : notifications.length > 0 ? (
        <div className="notifications-list">
          {notifications.slice(0, 10).map((notif) => (
            <div key={notif.id} className="notification-item">
              <div className="notification-icon-wrapper">
                {getNotificationIcon(notif.entity, notif.action)}
              </div>
              <div className="notification-content">
                <div className="notification-message">
                  {formatNotificationMessage(notif)}
                </div>
                <div className="notification-time">
                  {formatTimeAgo(notif.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="notifications-empty">
          <FaBell className="notifications-empty-icon" />
          <p>No notifications</p>
        </div>
      )}
    </div>
  );
}

