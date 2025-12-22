// src/pages/shipper/HomePageShipper.jsx
import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Table, Spinner, Alert, Badge } from "react-bootstrap";
import {
  FaMotorcycle, FaTasks, FaCheckCircle, FaClock, FaEye, 
  FaSyncAlt, FaMapMarkerAlt, FaBoxOpen, FaRegListAlt, FaChevronRight
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// [STYLE] UI từ nhánh Giap-tuan-3
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

// [CONFIG] Ưu tiên dùng Env variable, fallback về port backend của main
const API_BASE = import.meta.env.VITE_SHIPPER_API_BASE || "http://localhost:8888/api/shipper/";

const ShipperHome = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  // [DATA STATE] Theo cấu trúc API workflow mới từ main
  const [stats, setStats] = useState({
    waiting_accept: 0,
    active: 0,
    completed: 0
  });

  const [waitingOrders, setWaitingOrders] = useState([]);   // Status 2
  const [activeOrders, setActiveOrders] = useState([]);     // Status 3,4
  const [completedOrders, setCompletedOrders] = useState([]); // Status 5

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE}/get_dashboard.php`, {
        withCredentials: true 
      });

      if (res.data.status === "success") {
        const data = res.data.data;
        // Map đúng key backend trả về từ file get_dashboard.php đã merge trước đó
        setStats(data.stats || {});
        setWaitingOrders(data.waiting_orders || []);
        setActiveOrders(data.active_orders || []);
        setCompletedOrders(data.completed_orders || []);
        setLastUpdatedAt(new Date());
      } else {
        setError(res.data.message || "Failed to load dashboard.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (d) => {
    if (!d) return "";
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d);
  };

  // [HELPER] Render badge theo workflow chuẩn
  const renderStatusBadge = (status) => {
    const s = parseInt(status);
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

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="grow" variant="dark" />
        <div className="mt-3 text-muted fw-bold">Syncing your dashboard...</div>
      </Container>
    );
  }

  // Gộp đơn đang thực hiện và lịch sử cho bảng danh sách bên dưới
  const recentOrders = [...activeOrders, ...completedOrders];

  return (
    <div className="bg-light min-vh-100 py-4">
      <Container>
        {/* HEADER SECTION */}
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-1">👋 Chào Shipper!</h2>
            <div className="d-flex align-items-center gap-2 text-muted small">
              <FaClock size={12} />
              Cập nhật lần cuối: <span className="text-dark fw-semibold">{formatTime(lastUpdatedAt)}</span>
            </div>
          </div>
          <Button variant="white" className="shadow-sm border-0 rounded-pill px-4" onClick={fetchDashboardData}>
            <FaSyncAlt className={`me-2 ${loading ? 'fa-spin' : ''}`} /> Làm mới dữ liệu
          </Button>
        </div>

        {error && <Alert variant="danger" className="rounded-4 shadow-sm border-0 mb-4">{error}</Alert>}

        {/* STATS SECTION */}
        <Row className="g-4 mb-4">
          {[
            { label: "Đơn mới gán", count: stats.waiting_accept, icon: <FaTasks />, color: "#6c757d", bg: "#f8f9fa" },
            { label: "Đang thực hiện", count: stats.active, icon: <FaMotorcycle />, color: "#0dcaf0", bg: "#e1f5fe" },
            { label: "Đã hoàn thành", count: stats.completed, icon: <FaCheckCircle />, color: "#198754", bg: "#e8f5e9" }
          ].map((item, idx) => (
            <Col md={4} key={idx}>
              <Card style={styles.statsCard}>
                <Card.Body className="d-flex align-items-center p-4">
                  <div style={{ ...styles.iconBox, backgroundColor: item.bg, color: item.color }} className="me-3">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-muted small text-uppercase fw-bold">{item.label}</div>
                    <div className="fs-2 fw-bold text-dark">{item.count || 0}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ASSIGNED ORDERS (Status 2) */}
        <Card className="border-0 shadow-sm rounded-4 mb-4">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center gap-2 mb-4">
              <div className="bg-primary text-white p-2 rounded-3"><FaBoxOpen /></div>
              <h5 className="fw-bold mb-0 text-primary">🚀 Đơn hàng mới (Cần xác nhận)</h5>
            </div>

            {waitingOrders.length > 0 ? (
              <Row className="g-3">
                {waitingOrders.map((order) => (
                  <Col lg={6} key={order.id}>
                    <Card style={styles.orderCard} className="h-100 shadow-sm-hover">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <span className="fw-bold text-primary">#{order.order_code}</span>
                          {renderStatusBadge(2)}
                        </div>
                        <div className="small text-muted mb-3">
                          <div className="mb-2 d-flex gap-2">
                            <FaMapMarkerAlt className="text-danger mt-1" />
                            <span><strong>Gửi:</strong> {order.sender_address}</span>
                          </div>
                          <div className="d-flex gap-2">
                            <FaMapMarkerAlt className="text-success mt-1" />
                            <span><strong>Nhận:</strong> {order.receiver_address}</span>
                          </div>
                        </div>
                        <Button variant="dark" className="w-100 rounded-pill py-2 fw-bold" 
                          onClick={() => navigate(`/shipper/order/${order.id}`)}>
                          Chi tiết & Nhận đơn <FaChevronRight size={10} className="ms-2" />
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="text-center py-5 bg-light rounded-4 border border-dashed">
                <FaRegListAlt size={40} className="text-muted mb-3 opacity-25" />
                <p className="text-muted mb-0">Tuyệt vời! Không có nhiệm vụ nào đang chờ.</p>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* RECENT ACTIVITY TABLE (Status 3, 4, 5) */}
        <Card className="border-0 shadow-sm rounded-4">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center gap-2 mb-4">
              <div className="bg-secondary text-white p-2 rounded-3"><FaRegListAlt /></div>
              <h5 className="fw-bold mb-0">Hoạt động giao hàng gần đây</h5>
            </div>

            <div className="table-responsive">
              <Table borderless hover className="align-middle">
                <thead className="text-muted small text-uppercase">
                  <tr className="border-bottom">
                    <th className="pb-3">Mã đơn</th>
                    <th className="pb-3">Người nhận</th>
                    <th className="pb-3">Điểm đến</th>
                    <th className="pb-3">Trạng thái</th>
                    <th className="pb-3 text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="border-bottom-faint">
                        <td className="fw-bold py-3">{order.order_code}</td>
                        <td>{order.receiver_name}</td>
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">Chưa có dữ liệu đơn hàng gần đây.</td>
                    </tr>
                  )}
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