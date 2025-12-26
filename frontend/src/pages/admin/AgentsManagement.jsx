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
    unassigned_orders: 0,
    inactive_agents: 0,
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterWorkload, setFilterWorkload] = useState("all");

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
      Swal.fire("Error", "Cannot load agents list", "error");
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
  }, [filterStatus, filterWorkload, search]);

  // GSAP Animation - Only run once on mount (like OrderManagement)
  useEffect(() => {
    return initPageAnimations({ kpiSelector: ".kpi-item" });
  }, []);

  // Toggle agent status
  const handleToggleStatus = async (agentId, currentStatus, agentName) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const actionText = newStatus === "active" ? "activate" : "deactivate";

    const result = await Swal.fire({
      title: "Confirm",
      html: `Are you sure you want to <strong>${actionText}</strong> agent <strong>${agentName}</strong>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirm",
      cancelButtonText: "Cancel",
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
        Swal.fire("Success", `Agent ${actionText}d successfully`, "success");
        fetchAgents();
        fetchKPIStats();
      } else {
        Swal.fire("Error", data.message || "Cannot update status", "error");
      }
    } catch (error) {
      console.error("Error toggling agent status:", error);
      Swal.fire("Error", "Cannot update agent status", "error");
    }
  };

  // View agent details
  const handleViewAgent = (agent) => {
    setSelectedAgent(agent);
    setShowViewModal(true);
  };

  // Drill-down to Order Management with filters
  // IMPORTANT: Filter must match backend KPI calculation exactly
  // Backend: active_orders = status IN (3,4) - ASSIGNED and PICKED only
  // Backend: completed_orders = status = 5 - DELIVERED
  // Backend: failed_orders = status = 6 - FAILED
  const handleViewOrders = (agentId, filterType) => {
    setShowViewModal(false); // Close agent modal first
    
    let filterState = {
      agent_id: agentId.toString(),
    };

    // Apply status filter based on KPI type
    // Must match backend calculation in get_agents_with_kpi.php exactly
    switch (filterType) {
      case "total":
        filterState.status_group = "all";
        filterState.status = "all";
        break;
      case "active":
        // Backend counts: status IN (3,4) - ASSIGNED (3) and PICKED (4)
        // Use status_group "handling" which maps to [3, 4] in orderStatusGroups.js
        filterState.status_group = "handling"; // Maps to status IN (3,4)
        filterState.status = "all"; // Clear specific status to use status_group
        break;
      case "completed":
        // Backend counts: status = 5 - DELIVERED
        filterState.status = "5"; // DELIVERED
        filterState.status_group = "all"; // Clear status_group to use specific status
        break;
      case "failed":
        // Backend counts: status = 6 - FAILED
        filterState.status = "6"; // FAILED
        filterState.status_group = "all"; // Clear status_group to use specific status
        break;
      default:
        filterState.status_group = "all";
        filterState.status = "all";
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
      return Swal.fire("Error", "Please fill in all required fields (Name, Email, Password)", "error");
    }

    if (createAgentData.password.length < 6) {
      return Swal.fire("Error", "Password must be at least 6 characters", "error");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createAgentData.email)) {
      return Swal.fire("Error", "Invalid email", "error");
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
          return Swal.fire("Error", errorData.message || `Server error (${res.status})`, "error");
        } catch {
          return Swal.fire("Error", `Server error (${res.status}): ${errorText}`, "error");
        }
      }

      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Success", `Agent created: ${data.data.name}`, "success");
        setShowCreateModal(false);
        resetCreateAgentForm();
        fetchAgents();
        fetchKPIStats();
      } else {
        Swal.fire("Error", data.message || "Cannot create agent", "error");
      }
    } catch (error) {
      console.error("Error creating agent:", error);
      Swal.fire("Error", `Connection error: ${error.message}`, "error");
    }
  };

  return (
    <div className="admin-page container-fluid p-0 agents-management-page">
      {/* HEADER */}
      <div className="page-header">
        <h3 className="fw-bold m-0">Agent Management</h3>
        <Button className="btn-lux-primary" onClick={() => setShowCreateModal(true)}>
          <FaPlus className="me-2" /> Add Agent
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
                  <p className="m-0 opacity-75 small">Total Agents</p>
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
                  <p className="m-0 opacity-75 small">Active</p>
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
                  <p className="m-0 opacity-75 small">Unassigned Orders</p>
                  <h2 className="fw-bold my-1">{kpiStats.unassigned_orders}</h2>
                </div>
                <FaExclamationTriangle className="fs-1 opacity-50" />
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
                  <p className="m-0 opacity-75 small">Inactive</p>
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
              <Form.Label className="small fw-bold">Agent Status</Form.Label>
              <Form.Select 
                size="sm" 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All</option>
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
                <option value="all">All</option>
                <option value="has_active">Has Active Orders</option>
                <option value="no_orders">No Orders</option>
                <option value="overloaded">Overloaded (≥5 orders)</option>
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label className="small fw-bold">Search</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
              type="text"
                  placeholder="Name, email, phone..."
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
                <th style={{ minWidth: '200px' }}>Agent</th>
                <th style={{ minWidth: '120px' }}>Phone</th>
                <th style={{ minWidth: '100px' }}>Status</th>
                <th className="text-center" style={{ minWidth: '120px' }}>Total Orders</th>
                <th className="text-center" style={{ minWidth: '130px' }}>In Progress</th>
                <th className="text-center" style={{ minWidth: '120px' }}>Completed</th>
                <th className="text-center" style={{ minWidth: '100px' }}>Failed</th>
                <th style={{ minWidth: '150px' }}>Created Date</th>
                <th className="text-center" style={{ minWidth: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.length > 0 ? (
                agents.map(agent => (
                  <tr key={agent.id}>
                    <td data-label="">
                      <div>
                        <div className="fw-bold">{agent.name}</div>
                        <small className="text-muted">{agent.email}</small>
                      </div>
                    </td>
                    <td data-label="Phone">{agent.phone || "N/A"}</td>
                    <td data-label="Status">{renderStatus(agent.status)}</td>
                    <td className="text-center" data-label="Total Orders">
                      <Badge bg="primary">{agent.total_orders}</Badge>
                    </td>
                    <td className="text-center" data-label="In Progress">
                      <Badge bg="warning" text="dark">{agent.active_orders}</Badge>
                    </td>
                    <td className="text-center" data-label="Completed">
                      <Badge bg="success">{agent.completed_orders}</Badge>
                    </td>
                    <td className="text-center" data-label="Failed">
                      <Badge bg="danger">{agent.failed_orders}</Badge>
                    </td>
                    <td data-label="Created">{formatDate(agent.created_at)}</td>
                    <td data-label="Actions">
                      <div className="d-flex gap-2 justify-content-center">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleViewAgent(agent)}
                          title="View Details"
                        >
                          <FaEye />
                        </Button>
                        {agent.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleToggleStatus(agent.id, agent.status, agent.name)}
                            title="Deactivate"
                          >
                            <FaTimesCircle />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline-success"
                            onClick={() => handleToggleStatus(agent.id, agent.status, agent.name)}
                            title="Activate"
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
                  <td colSpan={9} className="text-center text-muted py-4">
                    No agents found
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
                <FaPlus /> Add New Agent
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
                <FaUserTie className="me-2" /> Basic Information
              </h6>
            </div>
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center">
                    <FaUserTie className="me-1" style={{ fontSize: "0.75rem" }} /> Agent Name <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Control
                    name="name"
                    placeholder="Enter agent name"
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
                    <FaUserTie className="me-1" style={{ fontSize: "0.75rem" }} /> Password <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="Minimum 6 characters"
                    className="luxury-input"
                    value={createAgentData.password}
                    onChange={handleCreateAgentChange}
                    required
                  />
                  <Form.Text className="text-muted">Password must be at least 6 characters</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center">
                    <FaPhone className="me-1" style={{ fontSize: "0.75rem" }} /> Phone
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
                    <FaMapMarkerAlt className="me-1" style={{ fontSize: "0.75rem" }} /> Address
                  </Form.Label>
                  <Form.Control
                    name="address"
                    placeholder="Enter address"
                    className="luxury-input"
                    value={createAgentData.address}
                    onChange={handleCreateAgentChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center">
                    <FaIdCard className="me-1" style={{ fontSize: "0.75rem" }} /> ID Number
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
                    <FaUserTie className="me-1" style={{ fontSize: "0.75rem" }} /> Status
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
                Cancel
              </Button>
              <Button
                variant="primary"
                className="btn-lux-primary-blue"
                onClick={handleCreateAgentSubmit}
              >
                <FaPlus className="me-2" /> Create Agent
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
                <FaUserTie /> Agent Details
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
                  <h6 className="fw-bold text-primary">Basic Information</h6>
                  <div className="mb-2">
                    <strong>Name:</strong> {selectedAgent.name}
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
                    <strong>Created Date:</strong> {formatDate(selectedAgent.created_at)}
                  </div>
                </Col>
                <Col md={6}>
                  <h6 className="fw-bold text-success mb-3">Performance KPI</h6>
                  <Row className="g-2">
                    <Col xs={6}>
                      <Card className="border-0 bg-light hover-lift" style={{ cursor: selectedAgent.total_orders > 0 ? "pointer" : "default" }}>
                        <Card.Body className="p-3 text-center">
                          <div className="fw-bold text-primary mb-1" style={{ fontSize: "1.5rem" }}>{selectedAgent.total_orders}</div>
                          <small className="text-muted d-block mb-2">Total Orders</small>
                          {selectedAgent.total_orders > 0 && (
                            <Button
                              size="sm"
                              variant="outline-primary"
                              className="btn-drill-down"
                              onClick={() => handleViewOrders(selectedAgent.id, "total")}
                            >
                              <FaEye className="me-1" /> View
                            </Button>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={6}>
                      <Card className="border-0 bg-light hover-lift" style={{ cursor: selectedAgent.active_orders > 0 ? "pointer" : "default" }}>
                        <Card.Body className="p-3 text-center">
                          <div className="fw-bold text-warning mb-1" style={{ fontSize: "1.5rem" }}>{selectedAgent.active_orders}</div>
                          <small className="text-muted d-block mb-2">In Progress</small>
                          {selectedAgent.active_orders > 0 && (
                            <Button
                              size="sm"
                              variant="outline-warning"
                              className="btn-drill-down"
                              onClick={() => handleViewOrders(selectedAgent.id, "active")}
                            >
                              <FaEye className="me-1" /> View
                            </Button>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={6}>
                      <Card className="border-0 bg-light hover-lift" style={{ cursor: selectedAgent.completed_orders > 0 ? "pointer" : "default" }}>
                        <Card.Body className="p-3 text-center">
                          <div className="fw-bold text-success mb-1" style={{ fontSize: "1.5rem" }}>{selectedAgent.completed_orders}</div>
                          <small className="text-muted d-block mb-2">Completed</small>
                          {selectedAgent.completed_orders > 0 && (
                            <Button
                              size="sm"
                              variant="outline-success"
                              className="btn-drill-down"
                              onClick={() => handleViewOrders(selectedAgent.id, "completed")}
                            >
                              <FaEye className="me-1" /> View
                            </Button>
                          )}
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={6}>
                      <Card className="border-0 bg-light hover-lift" style={{ cursor: selectedAgent.failed_orders > 0 ? "pointer" : "default" }}>
                        <Card.Body className="p-3 text-center">
                          <div className="fw-bold text-danger mb-1" style={{ fontSize: "1.5rem" }}>{selectedAgent.failed_orders}</div>
                          <small className="text-muted d-block mb-2">Failed</small>
                          {selectedAgent.failed_orders > 0 && (
                            <Button
                              size="sm"
                              variant="outline-danger"
                              className="btn-drill-down"
                              onClick={() => handleViewOrders(selectedAgent.id, "failed")}
                            >
                              <FaEye className="me-1" /> View
                            </Button>
                          )}
                        </Card.Body>
      </Card>
                    </Col>
                  </Row>
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
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
