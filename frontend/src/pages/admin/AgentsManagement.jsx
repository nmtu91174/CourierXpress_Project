// frontend/src/pages/admin/AgentsManagement.jsx
"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, Table, Button, Row, Col, Form, Badge
} from "react-bootstrap";
import {
  FaSearch, FaUserTie, FaPhone, FaChartPie, FaStore,
  FaEye, FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle, FaArrowRight, FaPlus, FaIdCard, FaMapMarkerAlt
} from "react-icons/fa";
import Swal from "sweetalert2";
import "../../assets/styles/agents.css";
import "../../assets/styles/dashboard.css";
import { initPageAnimations } from "../../utils/gsapAnimations";

export default function AgentsManagement() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState("");
  const [kpiStats, setKpiStats] = useState({
    total_agents: 0,
    active_agents: 0,
    pending_agents: 0,
    inactive_agents: 0,
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterWorkload, setFilterWorkload] = useState("all");
  const [filterApproval, setFilterApproval] = useState("all");

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  // Create agent form data
  const [createAgentData, setCreateAgentData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    citizen_id: "",
    status: "active",
  });

  // Fetch agents with KPI from API
  const fetchAgents = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterWorkload !== "all") params.append("workload", filterWorkload);
      if (filterApproval !== "all") params.append("approval", filterApproval);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`http://localhost:8888/api/admin/get_agents_with_kpi.php?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success") {
          setAgents(data.data || []);
        }
      }
    } catch (error) {
      console.error("Lỗi tải agents:", error);
      Swal.fire("Lỗi", "Không thể tải danh sách agents", "error");
    }
  };

  // Fetch KPI stats
  const fetchKPIStats = async () => {
    try {
      const res = await fetch("http://localhost:8888/api/admin/get_agent_stats.php", {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success") {
          setKpiStats(data.data);
        }
      }
    } catch (error) {
      console.error("Lỗi tải KPI stats:", error);
    }
  };

  useEffect(() => {
    fetchKPIStats();
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [filterStatus, filterWorkload, filterApproval, search]);

  // GSAP Animation - Only run once on mount (like OrderManagement)
  useEffect(() => {
    return initPageAnimations({ kpiSelector: ".kpi-item" });
  }, []);

  // Toggle agent status
  const handleToggleStatus = async (agentId, currentStatus, agentName) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const actionText = newStatus === "active" ? "kích hoạt" : "vô hiệu hóa";

    const result = await Swal.fire({
      title: "Xác nhận",
      html: `Bạn có chắc muốn <strong>${actionText}</strong> agent <strong>${agentName}</strong>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("http://localhost:8888/api/admin/toggle_agent_status.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          agent_id: agentId,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Thành công", `Đã ${actionText} agent thành công`, "success");
        fetchAgents();
        fetchKPIStats();
      } else {
        Swal.fire("Lỗi", data.message || "Không thể cập nhật trạng thái", "error");
      }
    } catch (error) {
      console.error("Error toggling agent status:", error);
      Swal.fire("Lỗi", "Không thể cập nhật trạng thái agent", "error");
    }
  };

  // View agent details
  const handleViewAgent = (agent) => {
    setSelectedAgent(agent);
    setShowViewModal(true);
  };

  // Drill-down to Order Management with filters
  const handleViewOrders = (agentId, filterType) => {
    setShowViewModal(false); // Close agent modal first
    
    let filterState = {
      agent_id: agentId.toString(),
    };

    // Apply status filter based on KPI type
    switch (filterType) {
      case "total":
        filterState.status_group = "all";
        break;
      case "active":
        filterState.status_group = "handling"; // status IN (1,2,3,4)
        break;
      case "completed":
        filterState.status = "5"; // DELIVERED
        break;
      case "failed":
        filterState.status = "6"; // FAILED
        break;
      default:
        filterState.status_group = "all";
    }

    navigate("/admin/orders", { state: filterState });
  };

  // Status Badges
  const renderStatus = (status) => {
    const map = {
      "active": <Badge bg="success">Active</Badge>,
      "inactive": <Badge bg="danger">Inactive</Badge>,
      "pending": <Badge bg="warning">Pending</Badge>,
    };
    return map[status] || <Badge bg="secondary">{status}</Badge>;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  // Handle create agent form change
  const handleCreateAgentChange = (e) => {
    const { name, value } = e.target;
    setCreateAgentData({ ...createAgentData, [name]: value });
  };

  // Reset create agent form
  const resetCreateAgentForm = () => {
    setCreateAgentData({
      name: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      citizen_id: "",
      status: "active",
    });
  };

  // Handle create agent submit
  const handleCreateAgentSubmit = async () => {
    // Validation
    if (!createAgentData.name || !createAgentData.email || !createAgentData.password) {
      return Swal.fire("Lỗi", "Vui lòng nhập đầy đủ thông tin bắt buộc (Tên, Email, Mật khẩu)", "error");
    }

    if (createAgentData.password.length < 6) {
      return Swal.fire("Lỗi", "Mật khẩu phải từ 6 ký tự trở lên", "error");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createAgentData.email)) {
      return Swal.fire("Lỗi", "Email không hợp lệ", "error");
    }

    try {
      const res = await fetch("http://localhost:8888/api/admin/create_agent.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(createAgentData),
      });

      // Check if response is OK
      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorData = JSON.parse(errorText);
          return Swal.fire("Lỗi", errorData.message || `Lỗi server (${res.status})`, "error");
        } catch {
          return Swal.fire("Lỗi", `Lỗi server (${res.status}): ${errorText}`, "error");
        }
      }

      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Thành công", `Đã tạo agent: ${data.data.name}`, "success");
        setShowCreateModal(false);
        resetCreateAgentForm();
        fetchAgents();
        fetchKPIStats();
      } else {
        Swal.fire("Lỗi", data.message || "Không thể tạo agent", "error");
      }
    } catch (error) {
      console.error("Error creating agent:", error);
      Swal.fire("Lỗi", `Lỗi kết nối: ${error.message}`, "error");
    }
  };

  return (
    <div className="admin-page agents-management-page">
      {/* HEADER */}
      <div className="page-header">
        <h3 className="fw-bold m-0">Quản lý Đại Lý</h3>
        <Button className="btn-lux-primary" onClick={() => setShowCreateModal(true)}>
          <FaPlus className="me-2" /> Thêm Đại Lý
        </Button>
      </div>

      {/* KPI CARDS */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm text-white kpi-item"
            style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Tổng đại lý</p>
                  <h2 className="fw-bold my-1">{kpiStats.total_agents}</h2>
                </div>
                <FaStore className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white kpi-item"
            style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Đang hoạt động</p>
                  <h2 className="fw-bold my-1">{kpiStats.active_agents}</h2>
                </div>
                <FaUserTie className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white kpi-item"
            style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Đang chờ duyệt</p>
                  <h2 className="fw-bold my-1">{kpiStats.pending_agents}</h2>
                </div>
                <FaChartPie className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm text-white kpi-item"
            style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Ngừng hoạt động</p>
                  <h2 className="fw-bold my-1">{kpiStats.inactive_agents}</h2>
                </div>
                <FaPhone className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* FILTERS & SEARCH */}
      <Card className="card-lux mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Label className="small fw-bold">Trạng thái Agent</Form.Label>
              <Form.Select 
                size="sm" 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Workload</Form.Label>
              <Form.Select 
                size="sm" 
                value={filterWorkload} 
                onChange={(e) => setFilterWorkload(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="has_active">Có đơn đang xử lý</option>
                <option value="no_orders">Không có đơn</option>
                <option value="overloaded">Quá tải (≥5 đơn)</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Approval</Form.Label>
              <Form.Select 
                size="sm" 
                value={filterApproval} 
                onChange={(e) => setFilterApproval(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="has_pending">Có đơn chờ duyệt</option>
                <option value="no_pending">Không có pending</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="small fw-bold">Tìm kiếm</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
              type="text"
                  placeholder="Tên, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && fetchAgents()}
                  size="sm"
            />
                <Button size="sm" variant="primary" onClick={fetchAgents}>
                  <FaSearch />
                </Button>
          </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* AGENT TABLE - ENTERPRISE */}
      <Card className="card-lux">
        <div className="lux-table-wrapper">
          <Table hover responsive className="lux-table align-middle">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Phone</th>
                <th>Status</th>
                <th className="text-center">Tổng đơn</th>
                <th className="text-center">Đang xử lý</th>
                <th className="text-center">Hoàn tất</th>
                <th className="text-center">Lỗi</th>
                <th className="text-center">Pending</th>
                <th>Ngày tạo</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.length > 0 ? (
                agents.map(agent => (
                  <tr key={agent.id}>
                    <td>
                      <div>
                        <div className="fw-bold">{agent.name}</div>
                        <small className="text-muted">{agent.email}</small>
                      </div>
                    </td>
                    <td>{agent.phone || "N/A"}</td>
                    <td>{renderStatus(agent.status)}</td>
                    <td className="text-center">
                      <Badge bg="primary">{agent.total_orders}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge bg="warning" text="dark">{agent.active_orders}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge bg="success">{agent.completed_orders}</Badge>
                    </td>
                    <td className="text-center">
                      <Badge bg="danger">{agent.failed_orders}</Badge>
                    </td>
                    <td className="text-center">
                      {agent.pending_approvals > 0 ? (
                        <Badge bg="warning" text="dark">
                          <FaExclamationTriangle className="me-1" />
                          {agent.pending_approvals}
                        </Badge>
                      ) : (
                        <span className="text-muted">0</span>
                      )}
                    </td>
                    <td>{formatDate(agent.created_at)}</td>
                    <td>
                      <div className="d-flex gap-2 justify-content-center">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleViewAgent(agent)}
                          title="Xem chi tiết"
                        >
                          <FaEye />
                        </Button>
                        {agent.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleToggleStatus(agent.id, agent.status, agent.name)}
                            title="Vô hiệu hóa"
                          >
                            <FaTimesCircle />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline-success"
                            onClick={() => handleToggleStatus(agent.id, agent.status, agent.name)}
                            title="Kích hoạt"
                          >
                            <FaCheckCircle />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-4">
                    Không có agent nào
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* MODAL CREATE AGENT - DQN LUXURY */}
      {showCreateModal && (
        <div className="dqn-modal-overlay">
          <div className="dqn-modal">
            {/* ================= HEADER ================= */}
            <div className="dqn-modal-header" style={{ background: "linear-gradient(135deg, #007bff, #35a0ff)" }}>
              <div className="dqn-modal-title">
                <FaPlus /> Thêm Đại Lý Mới
              </div>
              <button
                className="dqn-modal-close"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateAgentForm();
                }}
              >
                ×
              </button>
            </div>

            {/* ================= BODY (SCROLL) ================= */}
            <div className="dqn-modal-body luxury-create-body">
          <Form>
            <div className="luxury-section-header mb-3">
              <h6 className="fw-bold d-flex align-items-center text-primary mb-0">
                <FaUserTie className="me-2" /> Thông tin cơ bản
              </h6>
            </div>
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center">
                    <FaUserTie className="me-1" style={{ fontSize: "0.75rem" }} /> Tên đại lý <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Control
                    name="name"
                    placeholder="Nhập tên đại lý"
                    className="luxury-input"
                    value={createAgentData.name}
                    onChange={handleCreateAgentChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center">
                    <FaUserTie className="me-1" style={{ fontSize: "0.75rem" }} /> Email <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="email@example.com"
                    className="luxury-input"
                    value={createAgentData.email}
                    onChange={handleCreateAgentChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center">
                    <FaUserTie className="me-1" style={{ fontSize: "0.75rem" }} /> Mật khẩu <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="Tối thiểu 6 ký tự"
                    className="luxury-input"
                    value={createAgentData.password}
                    onChange={handleCreateAgentChange}
                    required
                  />
                  <Form.Text className="text-muted">Mật khẩu tối thiểu 6 ký tự</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center">
                    <FaPhone className="me-1" style={{ fontSize: "0.75rem" }} /> Số điện thoại
                  </Form.Label>
                  <Form.Control
                    name="phone"
                    placeholder="0901234567"
                    className="luxury-input"
                    value={createAgentData.phone}
                    onChange={handleCreateAgentChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center">
                    <FaMapMarkerAlt className="me-1" style={{ fontSize: "0.75rem" }} /> Địa chỉ
                  </Form.Label>
                  <Form.Control
                    name="address"
                    placeholder="Nhập địa chỉ"
                    className="luxury-input"
                    value={createAgentData.address}
                    onChange={handleCreateAgentChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center">
                    <FaIdCard className="me-1" style={{ fontSize: "0.75rem" }} /> CMND/CCCD
                  </Form.Label>
                  <Form.Control
                    name="citizen_id"
                    placeholder="012345678901"
                    className="luxury-input"
                    value={createAgentData.citizen_id}
                    onChange={handleCreateAgentChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small text-muted d-flex align-items-center">
                    <FaUserTie className="me-1" style={{ fontSize: "0.75rem" }} /> Trạng thái
                  </Form.Label>
                  <Form.Select
                    name="status"
                    className="luxury-select"
                    value={createAgentData.status}
                    onChange={handleCreateAgentChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
            </div>

            {/* ================= FOOTER ================= */}
            <div className="dqn-modal-footer">
              <Button
                variant="secondary"
                className="btn-lux-outline-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateAgentForm();
                }}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                className="btn-lux-primary-blue"
                onClick={handleCreateAgentSubmit}
              >
                <FaPlus className="me-2" /> Tạo Đại Lý
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW AGENT - DQN LUXURY */}
      {showViewModal && (
        <div className="dqn-modal-overlay">
          <div className="dqn-modal">
            {/* ================= HEADER ================= */}
            <div className="dqn-modal-header" style={{ background: "linear-gradient(135deg, #43a047, #8bc34a)" }}>
              <div className="dqn-modal-title">
                <FaUserTie /> Chi tiết Agent
              </div>
              <button
                className="dqn-modal-close"
                onClick={() => setShowViewModal(false)}
              >
                ×
              </button>
            </div>

            {/* ================= BODY (SCROLL) ================= */}
            <div className="dqn-modal-body">
          {selectedAgent && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <h6 className="fw-bold text-primary">Thông tin cơ bản</h6>
                  <div className="mb-2">
                    <strong>Tên:</strong> {selectedAgent.name}
                  </div>
                  <div className="mb-2">
                    <strong>Email:</strong> {selectedAgent.email}
                  </div>
                  <div className="mb-2">
                    <strong>Phone:</strong> {selectedAgent.phone || "N/A"}
                  </div>
                  <div className="mb-2">
                    <strong>Status:</strong> {renderStatus(selectedAgent.status)}
                  </div>
                  <div className="mb-2">
                    <strong>Ngày tạo:</strong> {formatDate(selectedAgent.created_at)}
                  </div>
                </Col>
                <Col md={6}>
                  <h6 className="fw-bold text-success mb-3">KPI Performance</h6>
                  <Row className="g-2">
                    <Col xs={6}>
                      <Card className="border-0 bg-light hover-lift" style={{ cursor: selectedAgent.total_orders > 0 ? "pointer" : "default" }}>
                        <Card.Body className="p-3 text-center">
                          <div className="fw-bold text-primary mb-1" style={{ fontSize: "1.5rem" }}>{selectedAgent.total_orders}</div>
                          <small className="text-muted d-block mb-2">Tổng đơn</small>
                          {selectedAgent.total_orders > 0 && (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="btn-drill-down"
                              onClick={() => handleViewOrders(selectedAgent.id, "total")}
                            >
                              <FaEye className="me-1" /> Xem
                            </Button>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={6}>
                      <Card className="border-0 bg-light hover-lift" style={{ cursor: selectedAgent.active_orders > 0 ? "pointer" : "default" }}>
                        <Card.Body className="p-3 text-center">
                          <div className="fw-bold text-warning mb-1" style={{ fontSize: "1.5rem" }}>{selectedAgent.active_orders}</div>
                          <small className="text-muted d-block mb-2">Đang xử lý</small>
                          {selectedAgent.active_orders > 0 && (
                            <Button
                              size="sm"
                              variant="outline-warning"
                              className="btn-drill-down"
                              onClick={() => handleViewOrders(selectedAgent.id, "active")}
                            >
                              <FaEye className="me-1" /> Xem
                            </Button>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={6}>
                      <Card className="border-0 bg-light hover-lift" style={{ cursor: selectedAgent.completed_orders > 0 ? "pointer" : "default" }}>
                        <Card.Body className="p-3 text-center">
                          <div className="fw-bold text-success mb-1" style={{ fontSize: "1.5rem" }}>{selectedAgent.completed_orders}</div>
                          <small className="text-muted d-block mb-2">Hoàn tất</small>
                          {selectedAgent.completed_orders > 0 && (
                            <Button
                              size="sm"
                              variant="outline-success"
                              className="btn-drill-down"
                              onClick={() => handleViewOrders(selectedAgent.id, "completed")}
                            >
                              <FaEye className="me-1" /> Xem
                            </Button>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={6}>
                      <Card className="border-0 bg-light hover-lift" style={{ cursor: selectedAgent.failed_orders > 0 ? "pointer" : "default" }}>
                        <Card.Body className="p-3 text-center">
                          <div className="fw-bold text-danger mb-1" style={{ fontSize: "1.5rem" }}>{selectedAgent.failed_orders}</div>
                          <small className="text-muted d-block mb-2">Lỗi</small>
                          {selectedAgent.failed_orders > 0 && (
                            <Button
                              size="sm"
                              variant="outline-danger"
                              className="btn-drill-down"
                              onClick={() => handleViewOrders(selectedAgent.id, "failed")}
                            >
                              <FaEye className="me-1" /> Xem
                            </Button>
                          )}
                        </Card.Body>
      </Card>
                    </Col>
                  </Row>
                  {selectedAgent.pending_approvals > 0 && (
                    <div className="mt-3">
                      <Badge bg="warning" text="dark" className="p-2">
                        <FaClock className="me-2" />
                        {selectedAgent.pending_approvals} đơn chờ duyệt
                      </Badge>
                    </div>
                  )}
                </Col>
              </Row>
            </div>
          )}
            </div>

            {/* ================= FOOTER ================= */}
            <div className="dqn-modal-footer">
              <Button
                variant="secondary"
                className="btn-lux-outline-secondary"
                onClick={() => setShowViewModal(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
