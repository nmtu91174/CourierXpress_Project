// frontend/src/components/notifications/NotificationsDropdown.jsx
// Enterprise Notifications Dropdown - Quick signal display

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaLock, FaBox, FaExclamationTriangle, FaCheckCircle, FaClock, FaCircle } from "react-icons/fa";
import "../../assets/styles/notifications.css";

/**
 * NotificationsDropdown
 * 
 * Quick notifications dropdown for UserMenu
 * - Shows unread count badge
 * - Lists recent notifications (last 10)
 * - Icons by type (order, system, warning)
 * - Time ago display
 * - Click to mark as read
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
          setUnreadCount(result.data.unread_count || 0);
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

  const navigate = useNavigate();
  
  // Get current user role
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const userRole = currentUser?.role?.toLowerCase() || "";

  const handleNotificationClick = async (notif) => {
    // Mark as read
    if (!notif.is_read) {
      try {
        const response = await fetch(
          "http://localhost:8888/api/users/mark_notification_read.php",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ notification_id: notif.id }),
          }
        );

        const result = await response.json();
        if (result.status === "success") {
          // Update local state
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notif.id
                ? { ...n, is_read: 1, read_at: new Date().toISOString() }
                : n
            )
          );
          if (unreadCount > 0) {
            setUnreadCount(unreadCount - 1);
          }
        }
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    // Navigate based on role (RBAC-based routing)
    // Use action_url from metadata if available, otherwise fallback to default routing
    if (notif.related_order_id && (notif.type === "order" || notif.type === "warning")) {
      // Check if metadata has action_url (from backend)
      const metadata = notif.metadata || {};
      if (metadata.action_url) {
        navigate(metadata.action_url);
        return;
      }
      
      // Fallback to default routing
      const orderCode = notif.order_code || metadata.order_code;
      
      if (userRole === "admin") {
        // Admin: Opens detail panel in OrderManagement
        navigate(`/admin/orders?focus=${notif.related_order_id}`);
      } else if (userRole === "agent") {
        // Agent: Opens detail panel in MyOrders
        navigate(`/agent/orders?highlight=${notif.related_order_id}`);
      } else if (userRole === "customer") {
        // Customer: ONLY use order_code (NO fallback to order_id)
        // Standard: same pattern as shipper but with order_code
        if (orderCode) {
          navigate(`/user/orders/${orderCode}`);
        } else {
          // Customer requires order_code - log warning, don't navigate
          console.warn("Customer notification missing order_code:", notif);
          return;
        }
      } else if (userRole === "shipper") {
        // Shipper: Use action_url if available, otherwise use order_id (standard pattern)
        if (metadata.action_url) {
          navigate(metadata.action_url);
        } else if (notif.related_order_id) {
          navigate(`/shipper/order/${notif.related_order_id}`);
        }
      }
    }
  };

  const getNotificationIcon = (type) => {
    if (type === "order") {
      return <FaBox className="notification-icon order" />;
    }
    if (type === "warning") {
      return <FaExclamationTriangle className="notification-icon warning" />;
    }
    return <FaLock className="notification-icon system" />;
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
            <div
              key={notif.id}
              className={`notification-item ${!notif.is_read ? "unread" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                handleNotificationClick(notif);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="notification-icon-wrapper">
                {getNotificationIcon(notif.type)}
                {!notif.is_read && (
                  <FaCircle className="unread-indicator" />
                )}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notif.title}</div>
                <div className="notification-message">
                  {notif.message.length > 60
                    ? notif.message.substring(0, 60) + "..."
                    : notif.message}
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

