// frontend/src/pages/admin/OrderManagement.jsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Card, Table, Button, Row, Col
} from "react-bootstrap";

import {
  FaSearch, FaPlus,
  FaBox, FaShippingFast, FaCheckCircle, FaExclamationTriangle
} from "react-icons/fa";

import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

import "../../assets/styles/order.css";

export default function OrderManagement() {

  const [orders, setOrders] = useState([]);

  // ======================
  // SAMPLE DATA (mini dashboard)
  // ======================
  const days = ["T2","T3","T4","T5","T6","T7","CN"];
  const booked =     [3, 5, 4, 6, 3, 2, 4];
  const inTransit =  [1, 2, 1, 2, 3, 1, 1];
  const delivered =  [6, 3, 4, 5, 7, 8, 6];

  // ======================
  // CHART CONFIG
  // ======================
  const chartDailyStatus = {
    labels: days,
    datasets: [
      { label:"Đã giao", backgroundColor:"#36c689", data:delivered },
      { label:"Đang vận chuyển", backgroundColor:"#ffc107", data:inTransit },
      { label:"Đã tạo đơn", backgroundColor:"#4098ff", data:booked },
    ]
  };

  const chartPie = {
    labels:["Đã giao", "Đang vận chuyển", "Huỷ"],
    datasets:[
      {
        backgroundColor:["#36c689","#ffc107","#ff4d6d"],
        data:[18, 7, 2],
      }
    ]
  };

  // ======================
  // TABLE DATA
  // ======================
  useEffect(() => {
    setOrders([
      { id:1, order_code:"ORD0001", sender:"Nguyễn Văn A", receiver:"Trần Thị B", created_at:"03/12/2025", status:"Booked" },
      { id:2, order_code:"ORD0002", sender:"Lê Văn C", receiver:"Phạm Thị D", created_at:"02/12/2025", status:"In Transit" },
      { id:3, order_code:"ORD0003", sender:"Công ty XYZ", receiver:"Kho Hà Nội", created_at:"01/12/2025", status:"Delivered" },
    ]);
  }, []);

  const renderStatus = (status) => {
    const map = {
      "Booked":     <span className="status-badge status-blue">Booked</span>,
      "In Transit": <span className="status-badge status-yellow">In Transit</span>,
      "Delivered":  <span className="status-badge status-green">Delivered</span>,
      "Cancelled":  <span className="status-badge status-red">Cancelled</span>,
    };
    return map[status] || status;
  };


  // =========================================================
  // UI
  // =========================================================
  return (
    <div className="admin-page">

      {/* HEADER */}
      <div className="page-header">
        <h3 className="fw-bold m-0">Quản lý Đơn hàng</h3>
        <Button className="btn-lux-primary">
          <FaPlus className="me-2" /> Tạo vận đơn
        </Button>
      </div>


      {/* =====================
          KPI CARDS (Luxury x Dashboard style)
      ====================== */}
      <Row className="g-3 mb-4">

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white"
            style={{ background:"linear-gradient(135deg,#007bff,#35a0ff)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Tổng đơn (tuần)</p>
                  <h2 className="fw-bold my-1">27</h2>
                </div>
                <FaBox className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white"
            style={{ background:"linear-gradient(135deg,#ffc107,#ffde59)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Đang vận chuyển</p>
                  <h2 className="fw-bold my-1">7</h2>
                </div>
                <FaShippingFast className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white"
            style={{ background:"linear-gradient(135deg,#43a047,#8bc34a)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Đã giao</p>
                  <h2 className="fw-bold my-1">18</h2>
                </div>
                <FaCheckCircle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white"
            style={{ background:"linear-gradient(135deg,#e53935,#ff5252)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Huỷ đơn</p>
                  <h2 className="fw-bold my-1">2</h2>
                </div>
                <FaExclamationTriangle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

      </Row>


      {/* SEARCH */}
      <Card className="card-lux mb-4">
        <Card.Body>
          <div className="search-bar-wrapper">
            <input className="lux-search-input" placeholder="Tìm kiếm đơn hàng theo mã đơn, người gửi, người nhận..." />
            <button className="lux-search-btn">
              <FaSearch className="me-2" /> Tìm kiếm
            </button>
          </div>
        </Card.Body>
      </Card>


      {/* CHARTS */}
      <Row className="g-4 mb-4">

        <Col md={6}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-3">Biểu đồ trạng thái trong tuần</h6>
            <div style={{ height:240 }}>
              <Bar data={chartDailyStatus} />
            </div>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-3">Tỉ lệ trạng thái đơn</h6>
            <div style={{ height:240 }}>
              <Pie data={chartPie} />
            </div>
          </Card>
        </Col>

      </Row>


      {/* TABLE */}
      <Card className="card-lux">
        <div className="lux-table-wrapper">
          <Table hover responsive className="lux-table align-middle">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Người gửi</th>
                <th>Người nhận</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="fw-bold text-primary">{o.order_code}</td>
                  <td>{o.sender}</td>
                  <td>{o.receiver}</td>
                  <td>{o.created_at}</td>
                  <td>{renderStatus(o.status)}</td>
                  <td><Button size="sm" className="btn-lux-outline">Chi tiết</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>


      {/* AI INSIGHT */}
      <Card className="card-lux p-4 mt-4">
        <h6 className="fw-bold mb-2">Gợi ý xử lý</h6>
        <p className="text-muted small mb-0">Nên tăng shipper vào ngày thứ 5 – thứ 6.</p>
        <p className="text-muted small mb-0">Gọi xác minh khách trước khi giao.</p>
      </Card>

    </div>
  );
}
