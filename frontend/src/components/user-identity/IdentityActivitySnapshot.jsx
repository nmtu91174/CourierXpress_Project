// frontend/src/components/user-identity/IdentityActivitySnapshot.jsx
// Enterprise Activity Snapshot - Recent Activity Display (READ-ONLY)

import React, { useState, useEffect } from "react";
import { FaHistory, FaClock, FaBox, FaCheckCircle, FaEdit, FaChartBar } from "react-icons/fa";
import "../../assets/styles/user_identity_dashboard.css";

/**
 * IdentityActivitySnapshot
 * 
 * Displays recent activity for the user (last 7-14 days)
 * - Login events
 * - Order actions
 * - Administrative actions (for admin/agent)
 * 
 * READ-ONLY - for audit and visibility
 */
export default function IdentityActivitySnapshot({ user, loading = false }) {
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    // Mock activity data (will be replaced with real API later)
    // For now, generate some placeholder activities
    const mockActivities = [
      {
        id: 1,
        type: "login",
        action: "Logged in",
        description: "Login from desktop browser",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        icon: FaClock,
      },
      {
        id: 2,
        type: "order",
        action: "Order Created",
        description: "Created order ORD123",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        icon: FaBox,
      },
      {
        id: 3,
        type: "order",
        action: "Order Updated",
        description: "Updated order ORD122 status",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        icon: FaEdit,
      },
    ];

    // Simulate API call
    setTimeout(() => {
      setActivities(mockActivities);
      setActivityLoading(false);
    }, 500);
  }, [user]);

  if (loading || activityLoading || !user) {
    return (
      <section className="identity-section">
        <h3 className="section-title">Recent Activity</h3>
        <div className="activity-skeleton">
          <div className="activity-item-skeleton" />
          <div className="activity-item-skeleton" />
          <div className="activity-item-skeleton" />
        </div>
      </section>
    );
  }

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

  return (
    <section className="identity-section">
      <div className="section-header">
        <h3 className="section-title">Recent Activity</h3>
        <small className="text-muted">Last 7 days</small>
      </div>

      {activities.length > 0 ? (
        <div className="activity-list">
          {activities.map((activity) => {
            const IconComponent = activity.icon || FaHistory;
            return (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  <IconComponent />
                </div>
                <div className="activity-content">
                  <div className="activity-action">{activity.action}</div>
                  <div className="activity-description">{activity.description}</div>
                  <div className="activity-timestamp">{formatTimeAgo(activity.timestamp)}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="activity-empty">
          <FaHistory className="activity-empty-icon" />
          <p className="activity-empty-text">No recent activity</p>
        </div>
      )}
    </section>
  );
}

