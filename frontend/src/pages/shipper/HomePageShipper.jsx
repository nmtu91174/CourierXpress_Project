// src/pages/shipper/HomePageShipper.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Button, Table, Spinner, Alert, Badge } from "react-bootstrap";
import {
  FaMotorcycle, FaTasks, FaCheckCircle, FaClock, FaEye, 
  FaSyncAlt, FaMapMarkerAlt, FaBoxOpen, FaRegListAlt, FaChevronRight
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Styles nội bộ để đồng bộ với trang Profile
const styles = {
  statsCard: {
    borderRadius: "20px",
    border: "none",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    transition: "transform 0.2s ease",
  },
  iconBox: {
    width: "50px",
    height: "50px",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  orderCard: {
    borderRadius: "16px",
    border: "1px solid #f0f0f0",
    transition: "all 0.3s ease",
  }
};

const API_BASE = import.meta.env.VITE_SHIPPER_API_BASE || 
                 "http://localhost:8890/CourierXpress_Project/backend/api/shipper";

const ShipperHome = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ assigned_count: 0, active_count: 0, completed_count: 0 });
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE}/get_dashboard.php`, { withCredentials: true });

      if (res?.data?.status === "success") {
        const data = res.data.data || {};
        setStats(data.stats || { assigned_count: 0, active_count: 0, completed_count: 0 });
        setAssignedOrders(Array.isArray(data.assigned_orders) ? data.assigned_orders : []);
        setRecentOrders(Array.isArray(data.recent_orders) ? data.recent_orders : []);
        setLastUpdatedAt(new Date());
      } else {
        setError(res?.data?.message || "Failed to load dashboard data.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchDashboardData();
  }, []);

  const formatTime = (d) => {
    if (!d) return "";
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d);
  };

  const renderStatusBadge = (status) => {
    const s = Number(status);
    const meta = {
      2: { label: "Assigned", variant: "secondary", icon: <FaTasks /> },
      3: { label: "Picking Up", variant: "info", icon: <FaMotorcycle /> },
      4: { label: "In Transit", variant: "warning", icon: <FaClock /> },
      5: { label: "Completed", variant: "success", icon: <FaCheckCircle /> },
    }[s] || { label: "Unknown", variant: "dark", icon: null };

    return (
      <Badge bg={meta.variant} className="px-3 py-2 rounded-pill d-inline-flex align-items-center gap-2">
        {meta.icon} <span>{meta.label}</span>
      </Badge>
    );
  };

  if (loading) return (
    <Container className="py-5 text-center">
      <Spinner animation="grow" variant="dark" />
      <div className="mt-3 text-muted fw-bold">Syncing your dashboard...</div>
    </Container>
  );

  return (
    <div className="bg-light min-vh-100 py-4">
      <Container>
        {/* HEADER SECTION */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-1">Shipper Dashboard</h2>
            <div className="d-flex align-items-center gap-2 text-muted small">
              <FaClock size={12} />
              Last updated: <span className="text-dark fw-semibold">{formatTime(lastUpdatedAt)}</span>
            </div>
          </div>
          <Button variant="white" className="shadow-sm border-0 rounded-pill px-4" onClick={fetchDashboardData}>
            <FaSyncAlt className={`me-2 ${loading ? 'fa-spin' : ''}`} /> Refresh Data
          </Button>
        </div>

        {error && <Alert variant="danger" className="rounded-4 shadow-sm border-0 mb-4">{error}</Alert>}

        {/* STATS SECTION */}
        <Row className="g-4 mb-4">
          {[
            { label: "Pending", count: stats.assigned_count, icon: <FaTasks />, color: "#6c757d", bg: "#f8f9fa" },
            { label: "Active", count: stats.active_count, icon: <FaMotorcycle />, color: "#0dcaf0", bg: "#e1f5fe" },
            { label: "Success", count: stats.completed_count, icon: <FaCheckCircle />, color: "#198754", bg: "#e8f5e9" }
          ].map((item, idx) => (
            <Col md={4} key={idx}>
              <Card style={styles.statsCard}>
                <Card.Body className="d-flex align-items-center p-4">
                  <div style={{ ...styles.iconBox, backgroundColor: item.bg, color: item.color }} className="me-3">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-muted small text-uppercase fw-bold" style={{ letterSpacing: "1px" }}>{item.label}</div>
                    <div className="fs-2 fw-bold text-dark">{item.count}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ASSIGNED ORDERS (FOCUS SECTION) */}
        <Card className="border-0 shadow-sm rounded-4 mb-4">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center gap-2 mb-4">
              <div className="bg-dark text-white p-2 rounded-3"><FaBoxOpen /></div>
              <h5 className="fw-bold mb-0">New Tasks Awaiting Action</h5>
            </div>

            {assignedOrders.length > 0 ? (
              <Row className="g-3">
                {assignedOrders.map((order) => (
                  <Col lg={6} key={order.id}>
                    <Card style={styles.orderCard} className="h-100 hover-shadow">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <span className="fw-bold text-primary">#{order.order_code || order.id}</span>
                          {renderStatusBadge(2)}
                        </div>
                        <div className="small text-muted mb-3">
                          <div className="mb-2 d-flex gap-2">
                            <FaMapMarkerAlt className="text-danger mt-1" />
                            <span><strong>From:</strong> {order.sender_address}</span>
                          </div>
                          <div className="d-flex gap-2">
                            <FaMapMarkerAlt className="text-success mt-1" />
                            <span><strong>To:</strong> {order.receiver_address}</span>
                          </div>
                        </div>
                        <Button variant="dark" className="w-100 rounded-pill py-2 fw-bold" 
                          onClick={() => navigate(`/shipper/order/${order.id}`)}>
                          Process Delivery <FaChevronRight size={10} className="ms-2" />
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="text-center py-5 bg-light rounded-4 border border-dashed">
                <FaRegListAlt size={40} className="text-muted mb-3 opacity-25" />
                <p className="text-muted mb-0">Hooray! No pending tasks at the moment.</p>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* RECENT ACTIVITY TABLE */}
        <Card className="border-0 shadow-sm rounded-4">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center gap-2 mb-4">
              <div className="bg-secondary text-white p-2 rounded-3"><FaRegListAlt /></div>
              <h5 className="fw-bold mb-0">Recent Delivery Activity</h5>
            </div>

            <div className="table-responsive">
              <Table borderless hover className="align-middle">
                <thead className="text-muted small text-uppercase">
                  <tr className="border-bottom">
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Recipient</th>
                    <th className="pb-3">Destination</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-bottom-faint">
                      <td className="fw-bold py-3">{order.order_code || `#${order.id}`}</td>
                      <td>{order.receiver_name || "N/A"}</td>
                      <td className="text-muted small" style={{ maxWidth: "250px" }}>
                        <div className="text-truncate">{order.receiver_address}</div>
                      </td>
                      <td>{renderStatusBadge(order.status)}</td>
                      <td className="text-end">
                        <Button variant="light" size="sm" className="rounded-circle shadow-sm"
                          onClick={() => navigate(`/shipper/order/${order.id}`)}>
                          <FaEye size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default ShipperHome;