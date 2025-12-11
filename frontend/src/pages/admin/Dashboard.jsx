// frontend/src/pages/admin/Dashboard.jsx
import React from "react";
import { Link } from "react-router-dom";

import {
  Card,
  Table,
  Badge,
  Button,
  Row,
  Col,
  ListGroup
} from "react-bootstrap";

import { Bar, Line } from "react-chartjs-2";

import {
  FaBox,
  FaShippingFast,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBell,
  FaClipboardList,
  FaChartBar,
  FaSearch
} from "react-icons/fa";

import "../../assets/styles/dashboard.css";

export default function Dashboard() {

  // KPI
  const totalOrders = 3650;
  const totalRevenue = "₫ 12.8B";
  const successRate = "94%";
  const cancelRate = "4%";

  // Chart data
  const branches = ["Hà Nội", "HCM", "Đà Nẵng", "Cần Thơ"];
  const ordersByBranch = [32, 21, 18, 9];

  const days = ["2/12", "3/12", "4/12", "5/12", "6/12", "7/12", "8/12"];
  const ordersLast7Days = [30, 42, 38, 45, 50, 46, 53];

  const chartOrdersByBranch = {
    labels: branches,
    datasets: [
      {
        label: "Đơn hàng",
        data: ordersByBranch,
        backgroundColor: ["#0d6efd", "#4caf50", "#ffeb3b", "#f44336"],
        borderRadius: 6
      }
    ]
  };

  const chartOrders7Days = {
    labels: days,
    datasets: [
      {
        label: "Đơn theo ngày",
        data: ordersLast7Days,
        borderColor: "#2196f3",
        backgroundColor: "rgba(33,150,243,0.25)",
        tension: 0.4
      }
    ]
  };

  return (
    <div className="admin-page container-fluid p-0">

      {/* KPI */}
      <Row className="mb-4 g-3">

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Tổng đơn (năm)</p>
                  <h2 className="fw-bold my-1">{totalOrders}</h2>
                </div>
                <FaBox className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Tổng doanh thu</p>
                  <h2 className="fw-bold my-1">{totalRevenue}</h2>
                </div>
                <FaChartBar className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Tỷ lệ giao thành công</p>
                  <h2 className="fw-bold my-1">{successRate}</h2>
                </div>
                <FaCheckCircle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Tỷ lệ huỷ</p>
                  <h2 className="fw-bold my-1">{cancelRate}</h2>
                </div>
                <FaExclamationTriangle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      {/* QUICK ACTION */}
      <Card className="card-lux mb-4">
        <Card.Body>
          <h5 className="fw-bold mb-3">Tác vụ nhanh</h5>
          <div className="d-flex gap-3 flex-wrap">

            <Link
              to="/admin/orders"
              state={{ action: "create" }}
              className="btn btn-sm btn-lux-primary-blue btn-hover-scale"
            >
              <FaClipboardList className="me-2" /> Tạo vận đơn
            </Link>

            <Link
              to="/admin/orders"
              state={{ action: "assign" }}
              className="btn btn-sm btn-lux-primary-yellow btn-hover-scale"
            >
              <FaShippingFast className="me-2" /> Phân công shipper
            </Link>

            <Link
              to="/admin/reports"
              className="btn btn-sm btn-lux-primary-green btn-hover-scale"
            >
              <FaChartBar className="me-2" /> Xem báo cáo
            </Link>

          </div>
        </Card.Body>
      </Card>

      {/* RECENT ORDERS */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold m-0">Đơn gần đây</h4>

        <div className="d-flex gap-2">
          <input
            className="lux-input-search"
            placeholder="Tìm mã đơn, người nhận..."
          />
          <Button size="sm" className="btn-lux-outline">
            <FaSearch className="me-2" />Tìm kiếm
          </Button>
        </div>
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
              <tr>
                <td className="fw-bold text-primary">ORD-0001</td>
                <td>Nguyễn Văn A</td>
                <td>Trần Thị B</td>
                <td>03/12/2025</td>
                <td>
                  <span className="status-badge status-blue">Booked</span>
                </td>
                <td>
                  <Link
                    to="/admin/orders/1"
                    className="btn-lux-primary-blue-soft btn-hover-scale"
                  >
                    Chi tiết
                  </Link>
                </td>
              </tr>

              <tr>
                <td className="fw-bold text-primary">ORD-0002</td>
                <td>Lê Văn C</td>
                <td>Phạm Thị D</td>
                <td>02/12/2025</td>
                <td>
                  <span className="status-badge status-yellow">In Transit</span>
                </td>
                <td>
                  <Link
                    to="/admin/orders/2"
                    className="btn-lux-primary-blue-soft btn-hover-scale"
                  >
                    Chi tiết
                  </Link>
                </td>
              </tr>

              <tr>
                <td className="fw-bold text-primary">ORD-0003</td>
                <td>Công ty XYZ</td>
                <td>Kho Hà Nội</td>
                <td>01/12/2025</td>
                <td>
                  <span className="status-badge status-green">Delivered</span>
                </td>
                <td>
                  <Link
                    to="/admin/orders/3"
                    className="btn-lux-primary-blue-soft btn-hover-scale"
                  >
                    Chi tiết
                  </Link>
                </td>
              </tr>
            </tbody>


          </Table>
        </div>

        <Card.Footer className="border-0 bg-white text-end py-3">
          <Button size="sm" className="btn-lux-outline me-2">‹ Trước</Button>
          <Button size="sm" className="btn-lux-outline">Sau ›</Button>
        </Card.Footer>
      </Card>

      {/* CHARTS */}
      <Row className="g-4 mb-4">

        <Col md={6}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-3">Đơn hàng theo chi nhánh</h6>
            <div style={{ height: 240 }}>
              <Bar
                data={chartOrdersByBranch}
                options={{
                  plugins: { legend: { display: true, position: "bottom" } },
                  maintainAspectRatio: false
                }}
              />
            </div>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-3">7 ngày gần nhất</h6>
            <div style={{ height: 240 }}>
              <Line
                data={chartOrders7Days}
                options={{
                  plugins: { legend: { display: true, position: "bottom" } },
                  maintainAspectRatio: false
                }}
              />
            </div>
          </Card>
        </Col>

      </Row>

      {/* NOTIFS + LOG */}
      <Row className="g-3 mb-5">

        <Col md={6}>
          <Card className="card-lux">
            <Card.Body>
              <h6 className="fw-bold mb-3">
                <FaBell className="me-2 text-warning" />Thông báo gần đây
              </h6>
              <ListGroup variant="flush">
                <ListGroup.Item>Đơn #ORD0003 đã giao — <span className="text-muted small">13:21 03/12</span></ListGroup.Item>
                <ListGroup.Item>Shipper cập nhật đơn #ORD0005 — <span className="text-muted small">10:55 03/12</span></ListGroup.Item>
                <ListGroup.Item>Hoá đơn #INV002 đã thanh toán — <span className="text-muted small">09:28 03/12</span></ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="card-lux">
            <Card.Body>
              <h6 className="fw-bold mb-3">
                <FaClipboardList className="me-2 text-primary" />Nhật ký hệ thống
              </h6>
              <ListGroup variant="flush">
                <ListGroup.Item>Admin đăng nhập — <span className="text-muted small">08:15 03/12</span></ListGroup.Item>
                <ListGroup.Item>Agent duyệt đơn #002 — <span className="text-muted small">22:41 02/12</span></ListGroup.Item>
                <ListGroup.Item>Shipper giao đơn #004 — <span className="text-muted small">19:17 02/12</span></ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

      </Row>

    </div>
  );
}
