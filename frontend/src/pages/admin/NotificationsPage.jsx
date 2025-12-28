// frontend/src/pages/admin/NotificationsPage.jsx
// Enterprise Notifications Page - Full notification view

import React, { useState, useEffect } from "react";
import { Container, Button, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaLock, FaBox, FaExclamationTriangle, FaFilter, FaCheck, FaBell, FaCircle } from "react-icons/fa";
import "../../assets/styles/notifications.css";

/**
 * NotificationsPage
 * 
 * Full notifications view with filtering
 * - Filter by type: All / Order / System / Warning
 * - Timeline view
 * - Mark as read
 * - Mark all as read
 */
function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0); // Total count for "All" badge synchronization
  
  // Get current user role
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const userRole = currentUser?.role?.toLowerCase() || "";

  useEffect(() => {
    fetchNotifications();
  }, [filterType]);

  // Normalize notification type: backend uses 'order'|'system'|'warning', but display needs mapping
  const normalizeType = (type) => {
    // Backend type is already 'order', 'system', 'warning' - no mapping needed
    // But ensure we handle any edge cases
    if (type === "order" || type === "system" || type === "warning") {
      return type;
    }
    return "system"; // Default fallback
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // FIX 1: Filter client-side if needed (backend already supports type filter)
      const url = `http://localhost:8888/api/users/get_notifications.php?limit=200${
        filterType !== "all" ? `&type=${filterType}` : ""
      }`;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      const result = await response.json();
      if (result.status === "success") {
        let fetchedNotifications = result.data.notifications || [];
        
        // Client-side filter if backend type doesn't match (safety)
        if (filterType !== "all") {
          fetchedNotifications = fetchedNotifications.filter(notif => 
            normalizeType(notif.type) === filterType
          );
        }
        
        setNotifications(fetchedNotifications);
        setUnreadCount(result.data.unread_count || 0);
        // Use total_count from API for badge synchronization (matches UserMenu badge blue)
        setTotalCount(result.data.total_count || fetchedNotifications.length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        "http://localhost:8888/api/users/mark_notification_read.php",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notification_id: notificationId }),
        }
      );

      const result = await response.json();
      if (result.status === "success") {
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId
              ? { ...notif, is_read: 1, read_at: new Date().toISOString() }
              : notif
          )
        );
        // FIX 5: Safe unread count decrement
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        "http://localhost:8888/api/users/mark_notification_read.php",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mark_all: true }),
        }
      );

      const result = await response.json();
      if (result.status === "success") {
        // Update local state
        setNotifications((prev) =>
          prev.map((notif) => ({
            ...notif,
            is_read: 1,
            read_at: new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // FIX 4: Use normalized type for icon and label
  const getNotificationIcon = (type) => {
    const normalizedType = normalizeType(type);
    if (normalizedType === "order") {
      return <FaBox className="notification-icon order" />;
    }
    if (normalizedType === "warning") {
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

  // Format time for display (similar to Dashboard Recent Notifications)
  const formatTimeDisplay = (timestamp) => {
    const time = new Date(timestamp);
    return time.toLocaleString("en-US", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNotificationTypeLabel = (type) => {
    const normalizedType = normalizeType(type);
    if (normalizedType === "order") return "Order";
    if (normalizedType === "warning") return "Warning";
    return "System";
  };

  return (
    <div className="notifications-page" data-role={userRole}>
      <Container fluid className="notifications-container">
        {/* Header */}
        <div className="notifications-page-header">
          <div>
          <h2 className="notifications-page-title">Notifications</h2>
          <p className="notifications-page-subtitle">
            View and manage your system notifications
              {unreadCount > 0 && (
                <Badge bg="danger" className="ms-2">
                  {unreadCount} unread
                </Badge>
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={markAllAsRead}
            >
              <FaCheck className="me-1" />
              Mark all as read
            </Button>
          )}
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
                {totalCount}
              </Badge>
            )}
          </button>
          <button
            className={`filter-tab ${filterType === "order" ? "active" : ""}`}
            onClick={() => setFilterType("order")}
          >
            <FaBox className="me-1" />
            Orders
          </button>
          <button
            className={`filter-tab ${filterType === "system" ? "active" : ""}`}
            onClick={() => setFilterType("system")}
          >
            <FaLock className="me-1" />
            System
          </button>
          <button
            className={`filter-tab ${filterType === "warning" ? "active" : ""}`}
            onClick={() => setFilterType("warning")}
          >
            <FaExclamationTriangle className="me-1" />
            Warning
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="notifications-loading">Loading notifications...</div>
        ) : notifications.length > 0 ? (
          <div className="notifications-timeline">
            {notifications.map((notif) => {
              const handleNotificationClick = () => {
                if (!notif.is_read) {
                  markAsRead(notif.id);
                }
                
                // Navigate based on role and notification type (RBAC-based routing)
                const metadata = notif.metadata || {};
                const normalizedType = normalizeType(notif.type);
                
                // Only navigate if notification has related order
                if (notif.related_order_id && (normalizedType === "order" || normalizedType === "warning")) {
                  // Admin/Agent MUST use action_url from metadata (role-specific routing)
                  if (userRole === "admin" || userRole === "agent") {
                    if (metadata.action_url) {
                      navigate(metadata.action_url);
                    } else {
                      // Fallback: Use admin order management with order_id
                      navigate(`/admin/orders?focus=${notif.related_order_id}`);
                    }
                  }
                  // Customer ONLY uses order_code (NO fallback to order_id)
                  else if (userRole === "customer") {
                    const orderCode = notif.order_code || metadata.order_code;
                    if (orderCode) {
                      navigate(`/user/orders/${orderCode}`);
                    } else {
                      // Customer requires order_code - show error or skip
                      console.warn("Customer notification missing order_code:", notif);
                      return;
                    }
                  }
                  // Shipper: Use action_url or fallback
                  else if (userRole === "shipper") {
                    if (metadata.action_url) {
                      navigate(metadata.action_url);
                    } else if (notif.related_order_id) {
                      navigate(`/shipper/order/${notif.related_order_id}`);
                    }
                  }
                }
              };
              
              return (
              <div
                key={notif.id}
                className={`notification-timeline-item ${
                  !notif.is_read ? "unread" : ""
                }`}
                onClick={handleNotificationClick}
                style={{ cursor: notif.related_order_id ? "pointer" : (notif.is_read ? "default" : "pointer") }}
              >
                <div className="notification-icon-wrapper">
                  {getNotificationIcon(notif.type)}
                  {/* FIX 6: Removed blue/green badge - only use red global badge */}
                </div>
                <div className="notification-timeline-content">
                  <div className="notification-header">
                    <span className="notification-type-badge">
                      {getNotificationTypeLabel(notif.type)}
                    </span>
                    <span className="notification-time">
                      {formatTimeDisplay(notif.created_at)}
                    </span>
                  </div>
                  <div className="notification-title">{notif.title}</div>
                  <div className="notification-message">{notif.message}</div>
                  {notif.order_code && (
                    <div className="notification-meta">
                      Order: {notif.order_code}
                    </div>
                  )}
                  {notif.related_order_id && (
                    <div className="text-primary small mt-1" style={{ fontSize: "0.7rem" }}>
                      Click to view order
                    </div>
                  )}
                </div>
              </div>
              );
            })}
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

export default NotificationsPage;
