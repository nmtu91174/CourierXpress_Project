// frontend/src/components/user-identity/IdentityStats.jsx
// Enterprise Identity Stats - DQN Luxury (Gradient KPI Cards like Dashboard)

import React from "react";
import { Card } from "react-bootstrap";
import { 
  FaBox, 
  FaCheckCircle, 
  FaShippingFast, 
  FaExclamationTriangle,
  FaChartBar,
  FaDollarSign 
} from "react-icons/fa";
import "../../assets/styles/user_identity_dashboard.css";

/**
 * IdentityStats
 * 
 * Role-based statistics with gradient KPI cards (matching Dashboard admin style)
 * - Admin: System-wide metrics from get_order_stats.php
 * - Agent: Agent-specific operational metrics
 * - User: Personal activity metrics
 */
export default function IdentityStats({ user, stats = null, loading = false }) {
  if (loading || !user) {
    return (
      <section className="identity-stats">
        <h3 className="section-title">System Overview</h3>
        <div className="stats-grid-kpi">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="kpi-item border-0 shadow-sm" style={{ background: "#f0f0f0" }}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="kpi-skeleton-label" />
                    <div className="kpi-skeleton-value" />
                  </div>
                  <div className="kpi-skeleton-icon" />
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  const role = user.role || "customer";
  const defaultStats = {
    total_orders: 0,
    in_transit: 0,
    delivered: 0,
    failed: 0,
    total_revenue: 0,
    success_rate: "0%",
  };

  const displayStats = stats || defaultStats;

  // Calculate success rate
  const successRate = displayStats.total_orders > 0 
    ? Math.round((displayStats.delivered / displayStats.total_orders) * 100) + "%"
    : "0%";

  // Format revenue
  const formattedRevenue = displayStats.total_revenue 
    ? Number(displayStats.total_revenue).toLocaleString("vi-VN", {
        style: "currency",
        currency: "VND",
      })
    : "₫ 0";

  // Admin Stats - System Overview (Gradient KPI cards like Dashboard)
  if (role === "admin") {
    return (
      <section className="identity-stats">
        <h3 className="section-title">System Overview</h3>
        <div className="stats-grid-kpi">
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Total Orders</p>
                  <h2 className="fw-bold my-1">{displayStats.total_orders || 0}</h2>
                </div>
                <FaBox className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>

          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Total Revenue</p>
                  <h2 className="fw-bold my-1" style={{ fontSize: "1.5rem" }}>
                    {formattedRevenue}
                  </h2>
                </div>
                <FaChartBar className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>

          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Success Rate</p>
                  <h2 className="fw-bold my-1">{successRate}</h2>
                </div>
                <FaCheckCircle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>

          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Failed</p>
                  <h2 className="fw-bold my-1">{displayStats.failed || 0}</h2>
                </div>
                <FaExclamationTriangle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </div>
      </section>
    );
  }

  // Agent Stats - Operational Metrics (Gradient KPI cards)
  if (role === "agent") {
    return (
      <section className="identity-stats">
        <h3 className="section-title">Operational Metrics</h3>
        <div className="stats-grid-kpi">
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Total Assigned</p>
                  <h2 className="fw-bold my-1">{displayStats.total_orders || 0}</h2>
                </div>
                <FaBox className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>

          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">In Progress</p>
                  <h2 className="fw-bold my-1">{displayStats.in_transit || 0}</h2>
                </div>
                <FaShippingFast className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>

          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Completed</p>
                  <h2 className="fw-bold my-1">{displayStats.delivered || 0}</h2>
                </div>
                <FaCheckCircle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>

          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Failed</p>
                  <h2 className="fw-bold my-1">{displayStats.failed || 0}</h2>
                </div>
                <FaExclamationTriangle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </div>
      </section>
    );
  }

  // User/Customer Stats - Activity Summary (Gradient KPI cards)
  return (
    <section className="identity-stats">
      <h3 className="section-title">Activity Summary</h3>
      <div className="stats-grid-kpi">
        <Card
          className="kpi-item border-0 shadow-sm text-white"
          style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}
        >
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="m-0 opacity-75 small">Total Orders</p>
                <h2 className="fw-bold my-1">{displayStats.total_orders || 0}</h2>
              </div>
              <FaBox className="fs-1 opacity-50" />
            </div>
          </Card.Body>
        </Card>

        <Card
          className="kpi-item border-0 shadow-sm text-white"
          style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}
        >
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="m-0 opacity-75 small">Delivered</p>
                <h2 className="fw-bold my-1">{displayStats.delivered || 0}</h2>
              </div>
              <FaCheckCircle className="fs-1 opacity-50" />
            </div>
          </Card.Body>
        </Card>

        <Card
          className="kpi-item border-0 shadow-sm text-white"
          style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}
        >
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="m-0 opacity-75 small">In Transit</p>
                <h2 className="fw-bold my-1">{displayStats.in_transit || 0}</h2>
              </div>
              <FaShippingFast className="fs-1 opacity-50" />
            </div>
          </Card.Body>
        </Card>
      </div>
    </section>
  );
}

