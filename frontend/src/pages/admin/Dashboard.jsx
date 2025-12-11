// frontend/src/pages/admin/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card, Table, Badge, Button, Row, Col, ListGroup
} from "react-bootstrap";
import { Bar, Line } from "react-chartjs-2";
import {
  FaBox, FaShippingFast, FaCheckCircle, FaExclamationTriangle,
  FaBell, FaClipboardList, FaChartBar, FaSearch
} from "react-icons/fa";
import "../../assets/styles/dashboard.css";

export default function Dashboard() {
  // --- 1. STATE: Nơi lưu trữ dữ liệu từ API ---
  const [recentOrders, setRecentOrders] = useState([]); // Chứa danh sách đơn hàng mới nhất

  // Mock Data cho KPI và Biểu đồ (Giữ nguyên phần này để hiển thị cho đẹp)
  const totalOrders = 3650;
  const totalRevenue = "₫ 12.8B";
  const successRate = "94%";
  const cancelRate = "4%";
  const chartOrdersByBranch = {
    labels: ["Hà Nội", "HCM", "Đà Nẵng", "Cần Thơ"],
    datasets: [{ label: "Đơn hàng", data: [32, 21, 18, 9], backgroundColor: ["#0d6efd", "#4caf50", "#ffeb3b", "#f44336"], borderRadius: 6 }]
  };
  const chartOrders7Days = {
    labels: ["2/12", "3/12", "4/12", "5/12", "6/12", "7/12", "8/12"],
    datasets: [{ label: "Đơn theo ngày", data: [30, 42, 38, 45, 50, 46, 53], borderColor: "#2196f3", backgroundColor: "rgba(33,150,243,0.25)", tension: 0.4 }]
  };

  // --- 2. EFFECT: Gọi API khi trang vừa tải xong ---
  useEffect(() => {
    const fetchLatestOrders = async () => {
      try {
        // Gọi API backend chúng ta vừa tạo
        const res = await fetch("http://localhost:8888/api/admin/get_latest_orders.php");
        const data = await res.json();

        if (data.status === "success") {
          setRecentOrders(data.data); // Lưu dữ liệu vào State -> Giao diện sẽ tự cập nhật
        }
      } catch (error) {
        console.error("Lỗi tải Dashboard:", error);
      }
    };

    fetchLatestOrders();
  }, []); // [] rỗng nghĩa là chỉ chạy 1 lần lúc vào trang

  // Hàm hỗ trợ hiển thị trạng thái đẹp mắt
  const renderStatus = (status) => {
    switch (status) {
      case 1: return <span className="status-badge status-blue">Booked</span>;
      case 2: return <span className="status-badge status-yellow">Approved</span>;
      case 7: return <span className="status-badge status-green">Delivered</span>;
      default: return <span className="status-badge status-red">Status {status}</span>;
    }
  };

  return (
    <div className="admin-page container-fluid p-0">
      {/* KPI Section - Giữ nguyên */}
      <Row className="mb-4 g-3">
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}><Card.Body><div className="d-flex justify-content-between align-items-center"><div><p className="m-0 opacity-75 small">Tổng đơn (năm)</p><h2 className="fw-bold my-1">{totalOrders}</h2></div><FaBox className="fs-1 opacity-50" /></div></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}><Card.Body><div className="d-flex justify-content-between align-items-center"><div><p className="m-0 opacity-75 small">Tổng doanh thu</p><h2 className="fw-bold my-1">{totalRevenue}</h2></div><FaChartBar className="fs-1 opacity-50" /></div></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}><Card.Body><div className="d-flex justify-content-between align-items-center"><div><p className="m-0 opacity-75 small">Tỷ lệ giao thành công</p><h2 className="fw-bold my-1">{successRate}</h2></div><FaCheckCircle className="fs-1 opacity-50" /></div></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white" style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}><Card.Body><div className="d-flex justify-content-between align-items-center"><div><p className="m-0 opacity-75 small">Tỷ lệ huỷ</p><h2 className="fw-bold my-1">{cancelRate}</h2></div><FaExclamationTriangle className="fs-1 opacity-50" /></div></Card.Body></Card></Col>
      </Row>

      {/* Quick Actions - Giữ nguyên logic chuyển hướng */}
      <Card className="card-lux mb-4">
        <Card.Body>
          <h5 className="fw-bold mb-3">Tác vụ nhanh</h5>
          <div className="d-flex gap-3 flex-wrap">
            <Link to="/admin/orders" state={{ action: "create" }} className="btn btn-sm btn-lux-primary-blue btn-hover-scale">
              <FaClipboardList className="me-2" /> Tạo vận đơn
            </Link>
            <Link to="/admin/orders" state={{ action: "assign" }} className="btn btn-sm btn-lux-primary-yellow btn-hover-scale">
              <FaShippingFast className="me-2" /> Phân công shipper
            </Link>
            <Link to="/admin/reports" className="btn btn-sm btn-lux-primary-green btn-hover-scale">
              <FaChartBar className="me-2" /> Xem báo cáo
            </Link>
          </div>
        </Card.Body>
      </Card>

      {/* --- 3. RECENT ORDERS TABLE (PHẦN QUAN TRỌNG ĐÃ SỬA) --- */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold m-0">Đơn gần đây</h4>
        <Link to="/admin/orders" className="text-decoration-none fw-bold">Xem tất cả &rarr;</Link>
      </div>

      <Card className="card-lux mb-4">
        <div className="lux-table-wrapper">
          <Table hover responsive className="lux-table align-middle">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Người Gửi</th>
                <th>Người Nhận</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {/* Nếu chưa có dữ liệu thì hiện dòng thông báo */}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-3">Đang tải hoặc chưa có đơn hàng nào...</td>
                </tr>
              )}

              {/* Vòng lặp hiển thị dữ liệu thật */}
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="fw-bold text-primary">{order.order_code}</td>
                  <td>{order.sender}</td>
                  <td>{order.receiver}</td>
                  {/* Format ngày tháng cho dễ đọc */}
                  <td>{new Date(order.created_at).toLocaleDateString('vi-VN')}</td>
                  <td>{renderStatus(order.status)}</td>
                  <td>
                    {/* Nút Chi tiết vẫn chưa có trang cụ thể, tạm thời link về trang quản lý */}
                    <Link to="/admin/orders" className="btn-lux-primary-blue-soft btn-hover-scale text-decoration-none small">
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Charts & Notifications - Giữ nguyên */}
      <Row className="g-4 mb-4">
        <Col md={6}><Card className="card-lux p-3"><h6 className="fw-bold mb-3">Đơn hàng theo chi nhánh</h6><div style={{ height: 240 }}><Bar data={chartOrdersByBranch} options={{ maintainAspectRatio: false }} /></div></Card></Col>
        <Col md={6}><Card className="card-lux p-3"><h6 className="fw-bold mb-3">7 ngày gần nhất</h6><div style={{ height: 240 }}><Line data={chartOrders7Days} options={{ maintainAspectRatio: false }} /></div></Card></Col>
      </Row>
    </div>
  );
}