// frontend/src/pages/admin/NotificationsPage.jsx
// Enterprise Notifications Page - Full notification view

import React, { useState, useEffect } from "react";
import { Container, Button, Badge } from "react-bootstrap";
import { FaLock, FaBox, FaExclamationTriangle, FaFilter, FaCheck, FaBell } from "react-icons/fa";
import "../../assets/styles/notifications.css";

/**
 * NotificationsPage
 * 
 * Full notifications view with filtering
 * - Filter by type: All / Security / Orders / System
 * - Timeline view
 * - Mark as read (mock)
 * - Clear all (non-security only)
 */
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, [filterType]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const url = `http://localhost:8888/api/users/get_notifications.php?limit=50${
        filterType !== "all" ? `&type=${filterType}` : ""
      }`;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      const result = await response.json();
      if (result.status === "success") {
        setNotifications(result.data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (entity) => {
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
    const userName = notification.user_name || "System";
    const entity = notification.entity || "";
    const entityId = notification.entity_id || null;

    // Enhanced message formatting with user name and details
    if (action.includes("UPDATE_USER") || action === "UPDATE_USER" || action.includes("cập nhật")) {
      // Parse action for more details
      if (action.includes("địa chỉ") || action.includes("address")) {
        return `${userName} updated address`;
      }
      if (entity === "users" && entityId) {
        return `${userName} updated user information`;
      }
      return `${userName} updated account settings`;
    }

    if (action.includes("Password") || action.includes("password") || action.includes("mật khẩu")) {
      return `${userName} changed password`;
    }

    if (action.includes("address") || action.includes("Address") || action.includes("địa chỉ")) {
      return `${userName} updated address`;
    }

    if (action.includes("CREATE_ORDER") || action === "CREATE_ORDER" || action.includes("Tạo đơn")) {
      const orderCode = entityId ? `#ORD${String(entityId).padStart(4, '0')}` : "";
      return `${userName} created order ${orderCode}`;
    }

    if (action.includes("UPDATE_STATUS") || action === "UPDATE_STATUS" || action.includes("Cập nhật trạng thái")) {
      const orderCode = entityId ? `#ORD${String(entityId).padStart(4, '0')}` : "";
      return `${userName} updated order status ${orderCode}`;
    }

    // Default: return action with user name if available
    if (userName && userName !== "System") {
      return `${userName}: ${action}`;
    }

    return action;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
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
      return time.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const getNotificationTypeLabel = (entity) => {
    if (entity === "security" || entity === "users") return "Security";
    if (entity === "orders") return "Order";
    if (entity === "system" || entity === "push" || entity === "email") return "System";
    return "System";
  };

  return (
    <div className="notifications-page">
      <Container fluid className="notifications-container">
        {/* Header */}
        <div className="notifications-page-header">
          <h2 className="notifications-page-title">Notifications</h2>
          <p className="notifications-page-subtitle">
            View and manage your system notifications
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="notifications-filter-tabs">
          <button
            className={`filter-tab ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
          >
            All
            {filterType === "all" && (
              <Badge bg="primary" className="filter-badge">
                {notifications.length}
              </Badge>
            )}
          </button>
          <button
            className={`filter-tab ${filterType === "security" ? "active" : ""}`}
            onClick={() => setFilterType("security")}
          >
            <FaLock className="me-1" />
            Security
          </button>
          <button
            className={`filter-tab ${filterType === "orders" ? "active" : ""}`}
            onClick={() => setFilterType("orders")}
          >
            <FaBox className="me-1" />
            Orders
          </button>
          <button
            className={`filter-tab ${filterType === "system" ? "active" : ""}`}
            onClick={() => setFilterType("system")}
          >
            <FaExclamationTriangle className="me-1" />
            System
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="notifications-loading">Loading notifications...</div>
        ) : notifications.length > 0 ? (
          <div className="notifications-timeline">
            {notifications.map((notif) => (
              <div key={notif.id} className="notification-timeline-item">
                <div className="notification-icon-wrapper">
                  {getNotificationIcon(notif.entity)}
                </div>
                <div className="notification-timeline-content">
                  <div className="notification-header">
                    <span className="notification-type-badge">
                      {getNotificationTypeLabel(notif.entity)}
                    </span>
                    <span className="notification-time">
                      {formatTimeAgo(notif.created_at)}
                    </span>
                  </div>
                  <div className="notification-message">
                    {formatNotificationMessage(notif)}
                  </div>
                  {notif.entity_id && (
                    <div className="notification-meta">
                      {notif.entity === "orders" 
                        ? `Order #ORD${String(notif.entity_id).padStart(4, '0')}`
                        : notif.entity === "users"
                        ? `User ID: ${notif.entity_id}`
                        : `${notif.entity}: #${notif.entity_id}`}
                    </div>
                  )}
                  {notif.user_name && (
                    <div className="notification-user-info">
                      <small className="text-muted">By: {notif.user_name}</small>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="notifications-empty-state">
            <FaBell className="empty-icon" />
            <p>No notifications found</p>
            <small className="text-muted">
              {filterType !== "all"
                ? `No ${filterType} notifications`
                : "You're all caught up!"}
            </small>
          </div>
        )}
      </Container>
    </div>
  );
}

