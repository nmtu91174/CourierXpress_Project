// frontend/src/pages/admin/AgentsManagement.jsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Card, Table, Button, Row, Col
} from "react-bootstrap";

import {
  FaSearch, FaPlus,
  FaStore, FaUserTie, FaPhone, FaChartPie
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

import "../../assets/styles/agents.css";


export default function AgentsManagement() {

  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState("");

  // ======================
  // MOCK DATA
  // ======================
  useEffect(() => {
    setAgents([
      { id:1, code:"AGT001", name:"Hanoi Distribution Center",  manager:"Nguyen Van A", phone:"0988 123 456", status:"Active" },
      { id:2, code:"AGT002", name:"Danang Logistics Hub",      manager:"Tran Thi B",   phone:"0912 888 777", status:"Pending" },
      { id:3, code:"AGT003", name:"Saigon Delivery Center",    manager:"Pham Van C",   phone:"0905 222 333", status:"Inactive" },
      { id:4, code:"AGT004", name:"Cantho Warehouse",          manager:"Le Thi D",     phone:"0936 555 222", status:"Active" },
      { id:5, code:"AGT005", name:"HaiPhong Express Station",  manager:"Hoang Van E",  phone:"0325 746 908", status:"Pending" },
    ]);
  }, []);

  // ======================
  // STATUS Badges (Luxury)
  // ======================
  const renderStatus = (st) => {
    const map = {
      "Active":   <span className="status-badge status-green">Active</span>,
      "Pending":  <span className="status-badge status-yellow">Pending</span>,
      "Inactive": <span className="status-badge status-red">Inactive</span>,
    };
    return map[st] || st;
  };


  // ======================
  // CHART DATA (Mini Dashboard cho đại lý)
  // ======================
  const provinces = ["HN","HCM","DN","CT","HP"];
  const activeCount = [5,4,3,2,3]; // đại lý hoạt động ở mỗi vùng
  const pendingCount = [1,2,1,1,2];
  const inactiveCount = [0,1,1,0,1];

  const chartAgentsByCity = {
    labels: provinces,
    datasets: [
      { label: "Active",    data: activeCount,    backgroundColor:"#36c689" },
      { label: "Pending",   data: pendingCount,   backgroundColor:"#ffc107" },
      { label: "Inactive",  data: inactiveCount,  backgroundColor:"#ff4d6d" },
    ]
  };

  const chartAgentStatusPie = {
    labels:["Active","Pending","Inactive"],
    datasets:[
      {
        data:[14, 7, 3],
        backgroundColor:["#36c689","#ffc107","#ff4d6d"],
      }
    ]
  };


  // =====================================================
  // UI
  // =====================================================
  return (
    <div className="admin-page">

      {/* ========================= HEADER ========================= */}
      <div className="page-header">
        <h3 className="fw-bold m-0">Quản lý Đại Lý</h3>
        <Button className="btn-lux-primary">
          <FaPlus className="me-2" /> Thêm Đại Lý
        </Button>
      </div>


      {/* ========================= KPI CARDS ========================= */}
      <Row className="g-3 mb-4">

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white"
            style={{ background:"linear-gradient(135deg,#007bff,#35a0ff)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Tổng đại lý</p>
                  <h2 className="fw-bold my-1">25</h2>
                </div>
                <FaStore className="fs-1 opacity-50" />
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
                  <p className="m-0 opacity-75 small">Đang hoạt động</p>
                  <h2 className="fw-bold my-1">14</h2>
                </div>
                <FaUserTie className="fs-1 opacity-50" />
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
                  <p className="m-0 opacity-75 small">Đang chờ duyệt</p>
                  <h2 className="fw-bold my-1">7</h2>
                </div>
                <FaChartPie className="fs-1 opacity-50" />
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
                  <p className="m-0 opacity-75 small">Ngừng hoạt động</p>
                  <h2 className="fw-bold my-1">3</h2>
                </div>
                <FaPhone className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

      </Row>


      {/* ========================= SEARCH BAR ========================= */}
      <Card className="card-lux mb-4">
        <Card.Body>
          <div className="search-bar-wrapper">
            <input
              className="lux-search-input"
              type="text"
              placeholder="Tìm đại lý theo tên, quản lý, mã..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="lux-search-btn">
              <FaSearch className="me-2" /> Tìm kiếm
            </button>
          </div>
        </Card.Body>
      </Card>


      {/* ========================= MINI CHARTS ========================= */}
      <Row className="g-4 mb-4">

        <Col md={6}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-3">Đại lý theo khu vực</h6>
            <div style={{ height:260 }}>
              <Bar data={chartAgentsByCity} />
            </div>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-3">Tỷ lệ trạng thái đại lý</h6>
            <div style={{ height:260 }}>
              <Pie data={chartAgentStatusPie} />
            </div>
          </Card>
        </Col>

      </Row>


      {/* ========================= AGENT TABLE ========================= */}
      <Card className="card-lux">
        <div className="lux-table-wrapper">
          <Table hover responsive className="lux-table align-middle">

            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên Đại Lý</th>
                <th>Quản Lý</th>
                <th>Điện Thoại</th>
                <th>Tình Trạng</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {agents.map(a => (
                <tr key={a.id}>
                  <td className="fw-bold text-primary">{a.code}</td>
                  <td>{a.name}</td>
                  <td>{a.manager}</td>
                  <td>{a.phone}</td>
                  <td>{renderStatus(a.status)}</td>
                  <td>
                    <Button size="sm" className="btn-lux-outline">Chi tiết</Button>
                  </td>
                </tr>
              ))}
            </tbody>

          </Table>
        </div>
      </Card>


      {/* ========================= AI SUGGEST ========================= */}
      <Card className="card-lux p-4 mt-4">
        <h6 className="fw-bold mb-2">Đề xuất từ dữ liệu</h6>
        <p className="text-muted small mb-1">
          Hà Nội & HCM có nhiều đại lý hoạt động — nên triển khai kho trung chuyển mini.
        </p>
        <p className="text-muted small mb-0">
          Tỷ lệ Pending nhiều ở Hải Phòng — đề xuất kiểm tra hồ sơ đăng ký đại lý mới.
        </p>
      </Card>

    </div>
  );
}
