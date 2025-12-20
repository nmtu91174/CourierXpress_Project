// src/pages/shipper/HomePageShipper.jsx 

import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Table, Spinner, Alert, Badge } from "react-bootstrap";
import { FaMotorcycle, FaTasks, FaCheckCircle, FaClock, FaEye } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import "../../assets/styles/shipper/HomePageShipper.css";

// [NEW] API Base URL (Ensure port matches your backend)
const API_BASE = "http://localhost:8888/backend/api/shipper";

const ShipperHome = () => {
  const navigate = useNavigate();

  // [NEW] State for dynamic data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ assigned_count: 0, active_count: 0, completed_count: 0 });
  const [assignedOrders, setAssignedOrders] = useState([]); // Status 2
  const [recentOrders, setRecentOrders] = useState([]);     // Status 3, 4, 5

  // [NEW] Fetch Dashboard Data
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/get_dashboard.php`, {
        withCredentials: true // Important for session
      });

      if (res.data.status === 'success') {
        const data = res.data.data;
        setStats(data.stats);
        setAssignedOrders(data.assigned_orders);
        setRecentOrders(data.recent_orders);
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // [NEW] Helper to render status badge
  const renderStatusBadge = (status) => {
    const s = parseInt(status);
    if (s === 3) return <Badge bg="primary">Picking Up</Badge>;
    if (s === 4) return <Badge bg="warning" text="dark">In Transit</Badge>;
    if (s === 5) return <Badge bg="success">Completed</Badge>;
    return <Badge bg="secondary">Unknown</Badge>;
  };

  if (loading) return <Container className="py-5 text-center"><Spinner animation="border" /></Container>;

  return (
    <div className="shipper-home-page">
      <Container className="py-4">

        {/* Greeting */}
        <h2 className="fw-bold mb-3">
          👋 Chào Shipper, chúc bạn một ngày giao hàng thuận lợi!
        </h2>
        {error && <Alert variant="danger">{error}</Alert>}

        <p className="text-muted mb-4">
          Dưới đây là tổng quan công việc của bạn hôm nay.
        </p>

        {/* Dashboard Stats (Dynamic) */}
        <Row className="mb-4">
          <Col md={4}>
            <Card className="shadow-sm p-3 stat-card">
              <FaTasks size={35} className="text-primary mb-2" />
              <h5 className="fw-bold">Đơn mới gán</h5>
              <p className="text-muted">{stats.assigned_count} đơn cần nhận</p>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="shadow-sm p-3 stat-card">
              <FaClock size={35} className="text-warning mb-2" />
              <h5 className="fw-bold">Đang thực hiện</h5>
              <p className="text-muted">{stats.active_count} đơn đang lấy/giao</p>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="shadow-sm p-3 stat-card">
              <FaCheckCircle size={35} className="text-success mb-2" />
              <h5 className="fw-bold">Đã hoàn thành</h5>
              <p className="text-muted">{stats.completed_count} đơn giao thành công</p>
            </Card>
          </Col>
        </Row>

        {/* [UPDATED] ASSIGNED ORDERS (Status 2) - Previously "Quick Pick" */}
        <Card className="p-4 shadow-sm mb-4 border-primary border-2">
          <h5 className="fw-bold mb-3 text-primary">🚀 Đơn hàng mới (Cần xác nhận)</h5>

          {assignedOrders.length > 0 ? (
            <div className="d-flex flex-column gap-3">
              {assignedOrders.map(order => (
                <Card key={order.id} className="p-3 bg-light border-0 d-flex flex-row justify-content-between align-items-center">
                  <div>
                    <strong className="d-block text-dark">#{order.order_code}</strong>
                    <span className="text-muted small">📍 Gửi: {order.sender_address}</span> <br />
                    <span className="text-muted small">📍 Nhận: {order.receiver_address}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/shipper/order/${order.id}`)}
                  >
                    <FaMotorcycle className="me-2" />
                    Chi tiết & Nhận
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <Alert variant="info" className="mb-0">Hiện chưa có đơn hàng mới nào được gán cho bạn.</Alert>
          )}
        </Card>

        {/* [UPDATED] Orders List (Status 3, 4, 5) */}
        <Card className="shadow-sm p-4 order-list-card">
          <h5 className="fw-bold mb-3">📦 Đơn hàng đang xử lý & Lịch sử</h5>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách nhận</th>
                <th>Địa chỉ nhận</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? (
                recentOrders.map(order => (
                  <tr key={order.id}>
                    <td>{order.order_code}</td>
                    <td>{order.receiver_name}</td>
                    <td>{order.receiver_address}</td>
                    <td>
                      {renderStatusBadge(order.status)}
                    </td>
                    <td>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => navigate(`/shipper/order/${order.id}`)}
                      >
                        <FaEye /> Xem
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted">Chưa có dữ liệu đơn hàng gần đây.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </Container>
    </div>
  );
};

export default ShipperHome;