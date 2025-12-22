// frontend/src/pages/agent/AgentDashboard.jsx
// Agent Dashboard - Workflow Console (matching Dashboard.jsx pattern)

import React, { useEffect, useState, useMemo } from "react";
import { Card, Row, Col, Button, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FaBox,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShippingFast,
  FaBoxOpen,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaWeight,
  FaRoute,
  FaCreditCard,
  FaCalendarAlt,
  FaListAlt,
} from "react-icons/fa";

import OrderFilterBar from "../../components/orders/OrderFilterBar";
import OrderTable from "../../components/orders/OrderTable";
import OrderDetailPanel from "../../components/orders/OrderDetailPanel";
import StatusBadge from "../../components/common/StatusBadge";
import { getStatusesInGroup } from "../../constants/orderStatusGroups";
import { ORDER_STATUS } from "../../constants/orderStatus";
import { initPageAnimations } from "../../utils/gsapAnimations";

import "../../assets/styles/dashboard.css";
import "../../assets/styles/agent_dashboard.css";

export default function AgentDashboard() {
  // =============================
  // 1. GSAP ANIMATION
  // =============================
  useEffect(() => {
    return initPageAnimations();
  }, []);

  // =============================
  // 2. STATE – DATA TỪ API
  // =============================
  const [allOrders, setAllOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [agents, setAgents] = useState([]);
  const [shippers, setShippers] = useState([]);
  
  // Get current user (agent)
  const [currentUser, setCurrentUser] = useState(null);

  // KPI (Agent-specific) - calculated from real data
  const [assignedToday, setAssignedToday] = useState(0);
  const [pendingAssignment, setPendingAssignment] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [attentionRequired, setAttentionRequired] = useState(0);

  // =============================
  // 2.1. FILTER STATE (Enterprise Filters)
  // =============================
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStatusGroup, setFilterStatusGroup] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterShipper, setFilterShipper] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all"); // Filter by agent for team scope
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [filterCOD, setFilterCOD] = useState("all");
  const [filterNoAgent, setFilterNoAgent] = useState(false);
  const [filterNoShipper, setFilterNoShipper] = useState(false);
  const [filterAssignedNotPicked, setFilterAssignedNotPicked] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchText, setSearchText] = useState("");

  // =============================
  // 3. FETCH ORDERS (Team scope - Agent can see all orders for coordination)
  // =============================
  const fetchOrders = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user")) || {};
      setCurrentUser(user);

      // Fetch all orders (team scope) - Agent can view orders of other agents for coordination
      // Backend will handle RBAC - agent can see all orders but actions are restricted
      const params = new URLSearchParams({
        page: 1,
        limit: 1000,
        // Add agent filter if "Only My Orders" is selected
        ...(filterAgent === "me" && user.id ? { agent_id: user.id } : {}),
      });

      const res = await fetch(
        `http://localhost:8888/api/admin/get_orders.php?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }
        const err = await res.text();
        console.error("API Error:", res.status, err);
        setLoadingOrders(false);
        return;
      }

      const json = await res.json();

      if (json.status === "success") {
        const data = Array.isArray(json.data?.items)
          ? json.data.items
          : [];

        setAllOrders(data);
        setLoadingOrders(false);

        // Calculate KPI from real data (team scope - all orders for coordination)
        const today = new Date().toISOString().split('T')[0];
        const user = JSON.parse(localStorage.getItem("user")) || {};
        const currentAgentId = user.id;
        
        // Assigned Today: Orders assigned to current agent today
        const todayOrders = data.filter(o => {
          if (!o.created_at) return false;
          return o.created_at.startsWith(today) && Number(o.agent_id) === Number(currentAgentId);
        });
        
        setAssignedToday(todayOrders.length);
        // Pending Assignment: All approved orders without shipper (team scope)
        setPendingAssignment(data.filter(o => Number(o.status) === 2 && (!o.shipper_id || Number(o.shipper_id) === 0)).length);
        // In Progress: All orders in progress (team scope)
        setInProgress(data.filter(o => [3, 4].includes(Number(o.status))).length);
        // Attention Required: All failed/cancelled orders (team scope)
        setAttentionRequired(data.filter(o => [6, 7].includes(Number(o.status))).length);
      } else {
        setLoadingOrders(false);
      }
    } catch (err) {
      console.error("Lỗi load orders:", err);
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterAgent]); // Refetch when agent filter changes

  // =============================
  // 3.1. FETCH AGENTS & SHIPPERS
  // =============================
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("http://localhost:8888/api/users/get_agents.php", {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success") {
            setAgents(json.data || []);
          }
        }
      } catch (err) {
        console.error("Lỗi load agents:", err);
      }
    };

    const fetchShippers = async () => {
      try {
        const res = await fetch("http://localhost:8888/api/users/get_shippers.php", {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success") {
            setShippers(json.data || []);
          }
        }
      } catch (err) {
        console.error("Lỗi load shippers:", err);
      }
    };

    fetchAgents();
    fetchShippers();
  }, []);

  // Use active_orders_count from backend API (consistent with Dashboard)
  const shippersWithWorkload = useMemo(() => {
    return shippers.map(shipper => ({
      ...shipper,
      active_orders_count: shipper.active_orders_count || 0
    }));
  }, [shippers]);

  // Get orders available for shipper assignment (for modal)
  const ordersForShipperAssignment = useMemo(() => {
    // Only orders that are APPROVED (status=2) and don't have shipper yet
    return allOrders.filter(o => Number(o.status) === 2 && (!o.shipper_id || Number(o.shipper_id) === 0));
  }, [allOrders]);

  // =============================
  // 5. APPLY FILTER VÀO allOrders
  // =============================
  const filteredOrders = useMemo(() => {
    if (!allOrders || allOrders.length === 0) return [];
    
    const data = allOrders.map((o) => ({
      id: o.id,
      order_code: o.order_code || o.code,
      code: o.order_code || o.code,
      branch: o.address || "",
      sender: o.sender || o.sender_name || "",
      sender_name: o.sender_name || o.sender || "",
      sender_phone: o.sender_phone || "",
      sender_address: o.sender_address || "",
      senderPhone: o.sender_phone || "",
      senderAddress: o.sender_address || "",
      receiver: o.receiver || o.receiver_name || "",
      receiver_name: o.receiver_name || o.receiver || "",
      receiver_phone: o.receiver_phone || "",
      receiver_address: o.receiver_address || o.address || "",
      receiverPhone: o.receiver_phone || "",
      receiverAddress: o.receiver_address || o.address || "",
      created_at: o.created_at,
      created: o.created_at,
      createdDisplay: o.created_at
        ? new Date(o.created_at).toLocaleDateString("vi-VN")
        : "",
      status: o.status,
      paymentMethod: o.payment_method || "",
      payment_method_id: o.payment_method_id || null,
      shipper: o.shipper_name || "",
      shipper_id: o.shipper_id || null,
      agent_id: o.agent_id || null,
      agent_name: o.agent_name || "", // For displaying assigned agent
      codAmount: o.cod_amount || 0,
      shippingFee: o.total_shipping_fee || 0,
      notes: o.notes || "",
      weight: o.weight || null,
      service_type_name: o.service_type_name || null,
      payment_method_name: o.payment_method_name || null,
      previous_status: o.previous_status || null,
    }));

    return data.filter((o) => {
      // 1. Filter by agent (for "Only My Orders" quick filter)
      if (filterAgent === "me") {
        const user = JSON.parse(localStorage.getItem("user")) || {};
        if (Number(o.agent_id) !== Number(user.id)) return false;
      } else if (filterAgent && filterAgent !== "all" && filterAgent !== "me") {
        if (Number(o.agent_id) !== Number(filterAgent)) return false;
      }
      
      // 2. Filter by status group
      if (filterStatusGroup && filterStatusGroup !== "all") {
        const statusesInGroup = getStatusesInGroup(filterStatusGroup);
        if (statusesInGroup.length > 0 && !statusesInGroup.includes(Number(o.status))) {
          return false;
        }
      }
      
      // 3. Filter by specific status
      if (filterStatus !== "all" && String(o.status) !== String(filterStatus)) return false;
      
      // 4. Filter by shipper (agent can see all shippers)
      if (filterShipper !== "all" && String(o.shipper_id) !== String(filterShipper)) return false;
      
      // 5. Filter by payment method
      if (filterPayment !== "all" && String(o.payment_method_id) !== String(filterPayment)) return false;

      // 6. Workflow filters
      if (filterNoShipper && o.shipper_id !== null && o.shipper_id !== undefined && Number(o.shipper_id) !== 0) {
        return false;
      }
      if (filterAssignedNotPicked) {
        if (Number(o.status) !== 3) return false;
      }

      // 7. Finance filters
      if (filterCOD === "has_cod" && (!o.codAmount || Number(o.codAmount) <= 0)) {
        return false;
      }
      if (filterCOD === "no_cod" && o.codAmount && Number(o.codAmount) > 0) {
        return false;
      }

      // 8. Filter by date range
      if (filterDateFrom && o.created_at) {
        const orderDate = new Date(o.created_at).toISOString().split('T')[0];
        if (orderDate < filterDateFrom) return false;
      }
      if (filterDateTo && o.created_at) {
        const orderDate = new Date(o.created_at).toISOString().split('T')[0];
        if (orderDate > filterDateTo) return false;
      }

      // 9. Advanced search
      if (searchText) {
        const v = searchText.toLowerCase().trim();
        const haystack = [
          o.code,
          o.order_code,
          o.sender,
          o.sender_name,
          o.receiver,
          o.receiver_name,
          o.senderPhone,
          o.sender_phone,
          o.receiverPhone,
          o.receiver_phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(v)) return false;
      }

      return true;
    });
  }, [
    allOrders,
    filterAgent,
    filterStatus,
    filterStatusGroup,
    filterShipper,
    filterPayment,
    filterPaymentStatus,
    filterCOD,
    filterNoShipper,
    filterAssignedNotPicked,
    filterDateFrom,
    filterDateTo,
    searchText,
  ]);

  // =============================
  // 6. DETAIL PANEL
  // =============================
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPanel, setShowPanel] = useState(false);

  const openPanel = (order) => {
    setSelectedOrder(order);
    setShowPanel(true);
  };

  const closePanel = () => setShowPanel(false);

  // =============================
  // 7. MODAL ASSIGN SHIPPER (Enterprise-grade)
  // =============================
  const [showAssignShipperModal, setShowAssignShipperModal] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState(null);
  const [assignShipperData, setAssignShipperData] = useState({ order_id: "", shipper_id: "", note: "" });
  const [confirmAssignShipper, setConfirmAssignShipper] = useState(false);

  // OrderInfoDisplay component (reusable)
  const OrderInfoDisplay = ({ order, iconColor = "text-warning" }) => {
    if (!order) return null;
    
    const getArea = (address) => {
      if (!address) return "N/A";
      return address.split(",").pop()?.trim() || address;
    };

    return (
      <div className="luxury-order-info mb-4 p-3" style={{ backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #dee2e6" }}>
        <div className="d-flex align-items-center mb-3">
          <FaInfoCircle className={`me-2 ${iconColor}`} />
          <h6 className="fw-bold mb-0">Order Summary (Read-Only)</h6>
        </div>
        <Row className="g-3">
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaBox className="me-1" /> Order Code</small><div className="fw-bold text-primary">{order.order_code || order.code || "N/A"}</div></div></Col>
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaCalendarAlt className="me-1" /> Created Date</small><div className="fw-bold">{order.created_at ? new Date(order.created_at).toLocaleString("en-US") : "N/A"}</div></div></Col>
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-block mb-1">Status</small><div style={{ display: "inline-block" }}><StatusBadge status={order.status} /></div></div></Col>
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaRoute className="me-1" /> Service Type</small><div className="fw-bold">{order.service_type_name || "Standard"}</div></div></Col>
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaMapMarkerAlt className="me-1" /> Pickup Area</small><div className="small fw-semibold">{getArea(order.sender_address || order.senderAddress)}</div></div></Col>
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaMapMarkerAlt className="me-1" /> Delivery Area</small><div className="small fw-semibold">{getArea(order.receiver_address || order.receiverAddress)}</div></div></Col>
          {order.weight && (
            <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaWeight className="me-1" /> Weight</small><div className="fw-bold">{Number(order.weight).toLocaleString("en-US")} grams</div></div></Col>
          )}
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaCreditCard className="me-1" /> Payment Method</small><div className="fw-bold">{order.payment_method_name || (order.payment_method_id === 1 ? "Cash" : order.payment_method_id === 2 ? "Bank Transfer" : order.payment_method_id === 3 ? "MoMo Wallet" : "Not specified")}</div></div></Col>
        </Row>
      </div>
    );
  };

  // Handler for assign shipper from table/panel
  const handleAssignShipper = (order) => {
    // Check if agent can assign shipper to this order
    const canAssign = Number(order.status) === 2 && (!order.shipper_id || Number(order.shipper_id) === 0);
    if (!canAssign) {
      Swal.fire("Warning", "Cannot assign shipper. Order must be APPROVED and have no shipper assigned.", "warning");
      return;
    }
    
    setSelectedOrderForAssign(order);
    setAssignShipperData({ order_id: order.id, shipper_id: "", note: "" });
    setConfirmAssignShipper(false);
    setShowAssignShipperModal(true);
  };

  // Handler for assign shipper submit
  const handleAssignShipperSubmit = async () => {
    if (!assignShipperData.order_id) {
      return Swal.fire("Warning", "Please select an order", "warning");
    }
    if (!assignShipperData.shipper_id) {
      return Swal.fire("Warning", "Please select a shipper", "warning");
    }
    if (!confirmAssignShipper) {
      return Swal.fire("Warning", "Please confirm the assignment", "warning");
    }
    
    try {
      const res = await fetch("http://localhost:8888/api/admin/assign_shipper.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order_id: Number(assignShipperData.order_id),
          shipper_id: Number(assignShipperData.shipper_id),
          note: assignShipperData.note || "Assign shipper via Agent Dashboard",
        }),
      });
      
      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Success", "Shipper assigned successfully!", "success");
        setShowAssignShipperModal(false);
        setConfirmAssignShipper(false);
        setAssignShipperData({ order_id: "", shipper_id: "", note: "" });
        setSelectedOrderForAssign(null);
        
        // Refresh orders
        await fetchOrders();
        
        // Refresh selected order if panel is open
        if (showPanel && selectedOrder && Number(selectedOrder.id) === Number(assignShipperData.order_id)) {
          // Fetch updated order detail
          try {
            const detailRes = await fetch(`http://localhost:8888/api/admin/get_order_detail.php?order_id=${selectedOrder.id}`, {
              method: "GET",
              credentials: "include",
            });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.status === "success" && detailData.data) {
                const updatedOrderDetail = detailData.data;
                // Map to match OrderDetailPanel format
                const mappedOrder = {
                  id: updatedOrderDetail.id,
                  order_code: updatedOrderDetail.order_code || updatedOrderDetail.code,
                  code: updatedOrderDetail.order_code || updatedOrderDetail.code,
                  sender_name: updatedOrderDetail.sender_name || updatedOrderDetail.sender,
                  sender_phone: updatedOrderDetail.sender_phone,
                  sender_address: updatedOrderDetail.sender_address,
                  receiver_name: updatedOrderDetail.receiver_name || updatedOrderDetail.receiver,
                  receiver_phone: updatedOrderDetail.receiver_phone,
                  receiver_address: updatedOrderDetail.receiver_address,
                  created_at: updatedOrderDetail.created_at,
                  status: updatedOrderDetail.status,
                  payment_method_id: updatedOrderDetail.payment_method_id,
                  payment_method_name: updatedOrderDetail.payment_method_name,
                  shipper_id: updatedOrderDetail.shipper_id,
                  shipper_name: updatedOrderDetail.shipper_name,
                  agent_id: updatedOrderDetail.agent_id,
                  agent_name: updatedOrderDetail.agent_name,
                  weight: updatedOrderDetail.weight,
                  service_type_name: updatedOrderDetail.service_type_name,
                  cod_amount: updatedOrderDetail.cod_amount,
                  total_shipping_fee: updatedOrderDetail.total_shipping_fee,
                  notes: updatedOrderDetail.notes,
                  previous_status: updatedOrderDetail.previous_status,
                };
                setSelectedOrder(mappedOrder);
              }
            }
          } catch (err) {
            console.error("Error fetching updated order detail:", err);
          }
        }
      } else {
        Swal.fire("Error", data.message || "Cannot assign shipper", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Server connection error", "error");
    }
  };

  // Handler for clicking on "Pending Assignment" KPI card
  const handlePendingAssignmentClick = () => {
    // Filter to show only pending assignment orders
    setFilterStatusGroup("handling");
    setFilterStatus("2"); // APPROVED status
    setFilterNoShipper(true); // No shipper assigned
  };

  // =============================
  // 7. SMART ACTIONS (Operational Alerts - Option B+C)
  // =============================
  // Calculate smart action alerts (data only, actions handled separately)
  const smartActionAlerts = useMemo(() => {
    const alerts = [];

    // 1. Orders Awaiting Assignment
    const awaitingAssignment = allOrders.filter(o => 
      Number(o.status) === ORDER_STATUS.APPROVED && 
      (!o.shipper_id || Number(o.shipper_id) === 0)
    );
    if (awaitingAssignment.length > 0) {
      alerts.push({
        id: "awaiting-assignment",
        type: "assignment",
        icon: FaShippingFast,
        message: `${awaitingAssignment.length} Order${awaitingAssignment.length > 1 ? 's' : ''} awaiting shipper assignment`,
        count: awaitingAssignment.length,
        orderIds: awaitingAssignment.map(o => o.id || o.order_code),
        color: "warning",
      });
    }

    // 2. Orders Over SLA (for future implementation - can check created_at vs expected delivery)
    // Placeholder: Check for orders created more than 24 hours ago and still in APPROVED/ASSIGNED
    const now = new Date();
    const overSLA = allOrders.filter(o => {
      if (!o.created_at) return false;
      const createdDate = new Date(o.created_at);
      const hoursDiff = (now - createdDate) / (1000 * 60 * 60);
      // Consider orders over 24 hours old and still in non-terminal status as SLA breach
      return hoursDiff > 24 && [1, 2, 3, 4].includes(Number(o.status));
    });
    if (overSLA.length > 0) {
      alerts.push({
        id: "over-sla",
        type: "sla",
        icon: FaExclamationTriangle,
        message: `${overSLA.length} Order${overSLA.length > 1 ? 's' : ''} over SLA (24h)`,
        count: overSLA.length,
        color: "danger",
      });
    }

    // 3. Idle Shippers Available (shippers with low workload)
    const idleShippers = shippersWithWorkload.filter(s => (s.active_orders_count || 0) < 3);
    if (idleShippers.length > 0 && awaitingAssignment.length > 0) {
      alerts.push({
        id: "idle-shippers",
        type: "resource",
        icon: FaShippingFast,
        message: `${idleShippers.length} Shipper${idleShippers.length > 1 ? 's' : ''} available (low workload)`,
        count: idleShippers.length,
        orderIds: awaitingAssignment.map(o => o.id || o.order_code),
        color: "info",
      });
    }

    return alerts;
  }, [allOrders, shippersWithWorkload]);

  // Handler for smart action click
  const handleSmartAction = (alert) => {
    if (alert.id === "awaiting-assignment" || alert.id === "idle-shippers") {
      // Open assign modal for first eligible order
      const awaitingAssignment = allOrders.filter(o => 
        Number(o.status) === ORDER_STATUS.APPROVED && 
        (!o.shipper_id || Number(o.shipper_id) === 0)
      );
      if (awaitingAssignment.length > 0) {
        handleAssignShipper(awaitingAssignment[0]);
      }
    } else if (alert.id === "over-sla") {
      // Filter table to show over SLA orders
      setFilterStatusGroup("handling");
    }
  };

  return (
    <div className="admin-page container-fluid p-0" style={{ background: "transparent" }}>
      {/* ================= HEADER ================= */}
      <div className="page-header d-flex justify-content-between mb-4">
        <div>
          <h3 className="fw-bold">Agent Dashboard</h3>
          <p className="text-muted mb-0">Operational overview and priority queue</p>
        </div>
      </div>

      {/* ================= KPI ================= */}
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)", cursor: "default" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Assigned Today</p>
                  <h2 className="fw-bold my-1">{assignedToday}</h2>
                </div>
                <FaBox className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)", cursor: "pointer" }}
            onClick={handlePendingAssignmentClick}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Pending Assignment</p>
                  <h2 className="fw-bold my-1">{pendingAssignment}</h2>
                </div>
                <FaClock className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)", cursor: "default" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">In Progress</p>
                  <h2 className="fw-bold my-1">{inProgress}</h2>
                </div>
                <FaCheckCircle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#e53935,#ff5252)", cursor: "default" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Attention Required</p>
                  <h2 className="fw-bold my-1">{attentionRequired}</h2>
                </div>
                <FaExclamationTriangle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ================= SMART OPERATIONAL ACTIONS (Conditional - Option B+C) ================= */}
      {smartActionAlerts.length > 0 && (
        <Card className="card-lux mb-4 border-warning" style={{ borderWidth: "1px", borderColor: "rgba(255, 193, 7, 0.3)" }}>
          <Card.Body>
            <h5 className="fw-bold mb-3 d-flex align-items-center">
              <FaExclamationTriangle className="me-2 text-warning" />
              Operational Alerts
            </h5>
            <p className="text-muted small mb-3">Actions requiring immediate attention</p>

            <div className="d-flex flex-column gap-2">
              {smartActionAlerts.map((alert) => {
                const IconComponent = alert.icon;
                return (
                  <button
                    key={alert.id}
                    className={`btn btn-sm d-flex align-items-center justify-content-between p-3 text-start ${
                      alert.color === "warning" 
                        ? "btn-lux-primary-yellow" 
                        : alert.color === "danger"
                        ? "btn-outline-danger"
                        : "btn-lux-primary-blue"
                    }`}
                    onClick={() => handleSmartAction(alert)}
                    style={{ borderRadius: "8px", border: "none" }}
                  >
                    <div className="d-flex align-items-center">
                      <IconComponent className="me-2" />
                      <span className="fw-semibold">{alert.message}</span>
                    </div>
                    <span className="badge bg-white text-dark ms-2">{alert.count}</span>
                  </button>
                );
              })}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* ================= FILTER + TABLE ================= */}
      <OrderFilterBar
        filterStatus={filterStatus}
        filterStatusGroup={filterStatusGroup}
        filterBranch={filterBranch}
        filterShipper={filterShipper}
        filterPayment={filterPayment}
        filterPaymentStatus={filterPaymentStatus}
        filterCOD={filterCOD}
        filterNoAgent={filterNoAgent}
        filterNoShipper={filterNoShipper}
        filterAssignedNotPicked={filterAssignedNotPicked}
        filterDateFrom={filterDateFrom}
        filterDateTo={filterDateTo}
        searchText={searchText}
        agents={agents}
        shippers={shippers}
        userRole="agent"
        filterAgent={filterAgent}
        onFilterAgentChange={setFilterAgent}
        onStatusChange={setFilterStatus}
        onStatusGroupChange={setFilterStatusGroup}
        onBranchChange={setFilterBranch}
        onShipperChange={setFilterShipper}
        onPaymentChange={setFilterPayment}
        onPaymentStatusChange={setFilterPaymentStatus}
        onCODChange={setFilterCOD}
        onNoAgentChange={setFilterNoAgent}
        onNoShipperChange={setFilterNoShipper}
        onAssignedNotPickedChange={setFilterAssignedNotPicked}
        onDateFromChange={setFilterDateFrom}
        onDateToChange={setFilterDateTo}
        onSearchChange={setSearchText}
        onResetFilters={() => {
          setFilterStatus("all");
          setFilterStatusGroup("all");
          setFilterBranch("all");
          setFilterShipper("all");
          setFilterPayment("all");
          setFilterPaymentStatus("all");
          setFilterCOD("all");
          setFilterNoAgent(false);
          setFilterNoShipper(false);
          setFilterAssignedNotPicked(false);
          setFilterDateFrom("");
          setFilterDateTo("");
          setSearchText("");
          setFilterAgent("all");
        }}
      />

      <OrderTable
        loading={loadingOrders}
        orders={filteredOrders}
        onRowClick={openPanel}
        onViewDetail={openPanel}
        onAssignShipper={handleAssignShipper}
        userRole="agent"
        showAgentColumn={true} // Show Assigned Agent column for agent dashboard
      />

      {/* ================= DETAIL PANEL ================= */}
      <OrderDetailPanel
        order={selectedOrder}
        isOpen={showPanel}
        onClose={closePanel}
        onAssign={handleAssignShipper}
        userRole="agent"
      />

      {/* ================= MODAL ASSIGN SHIPPER ================= */}
      {showAssignShipperModal && selectedOrderForAssign && (
        <div className="dqn-modal-overlay">
          <div className="dqn-modal">
            <div className="dqn-modal-header" style={{ background: "linear-gradient(135deg, #ffc107, #ffde59)" }}>
              <div className="dqn-modal-title">
                <FaShippingFast /> Assign Shipper
              </div>
              <button
                className="dqn-modal-close"
                onClick={() => {
                  setShowAssignShipperModal(false);
                  setSelectedOrderForAssign(null);
                  setAssignShipperData({ order_id: "", shipper_id: "", note: "" });
                  setConfirmAssignShipper(false);
                }}
              >
                ×
              </button>
            </div>

            <div className="dqn-modal-body">
              <Form>
                {/* Order Summary (Read-only) */}
                <OrderInfoDisplay order={selectedOrderForAssign} iconColor="text-warning" />

                {/* Shipper Selector */}
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FaShippingFast className="me-2 text-warning" /> Select Shipper <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Select 
                    value={assignShipperData.shipper_id} 
                    onChange={(e) => setAssignShipperData({ ...assignShipperData, shipper_id: e.target.value })} 
                    size="lg" 
                    className="luxury-select"
                  >
                    <option value="">-- Select Shipper --</option>
                    {shippersWithWorkload.map(s => {
                      const workload = s.active_orders_count || 0;
                      const workloadLabel = workload === 0 ? "Available" : workload < 5 ? "Low" : workload < 10 ? "Medium" : "High";
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email}) - {workload} active orders ({workloadLabel}) {s.status === "active" ? "✓" : ""}
                        </option>
                      );
                    })}
                  </Form.Select>
                  {assignShipperData.shipper_id && (() => {
                    const selected = shippersWithWorkload.find(s => s.id === Number(assignShipperData.shipper_id));
                    if (!selected) return null;
                    const workload = selected.active_orders_count || 0;
                    const afterAssign = workload + 1;
                    return (
                      <div className="mt-2 p-2 bg-light rounded">
                        <small className="text-muted d-block mb-1">Estimated Load:</small>
                        <div className="d-flex justify-content-between">
                          <span>Current active orders: <strong>{workload}</strong></span>
                          <span>After assign: <strong className="text-primary">{afterAssign}</strong></span>
                        </div>
                      </div>
                    );
                  })()}
                </Form.Group>

                {/* Assignment Note */}
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">
                    Assignment Note <span className="text-muted small fw-normal">(Optional)</span>
                  </Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    placeholder="e.g., Urgent order - deliver today, VIP customer..." 
                    value={assignShipperData.note} 
                    onChange={(e) => setAssignShipperData({ ...assignShipperData, note: e.target.value })} 
                    className="luxury-textarea" 
                  />
                </Form.Group>

                {/* Confirmation Block */}
                <div className="mb-3 p-3 bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded">
                  <div className="d-flex align-items-start mb-2">
                    <FaExclamationTriangle className="me-2 text-warning mt-1" />
                    <div className="flex-grow-1">
                      <strong className="d-block mb-1">Warning</strong>
                      <small className="text-muted">This action will assign the order to the selected shipper.</small>
                    </div>
                  </div>
                  <Form.Check
                    type="checkbox"
                    id="confirm-assign-shipper"
                    label="I confirm this assignment"
                    checked={confirmAssignShipper}
                    onChange={(e) => setConfirmAssignShipper(e.target.checked)}
                    className="mt-2"
                  />
                </div>
              </Form>
            </div>

            <div className="dqn-modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowAssignShipperModal(false);
                  setSelectedOrderForAssign(null);
                  setAssignShipperData({ order_id: "", shipper_id: "", note: "" });
                  setConfirmAssignShipper(false);
                }} 
                className="btn-lux-outline-secondary"
              >
                Cancel
              </Button>
              <Button 
                variant="warning" 
                onClick={handleAssignShipperSubmit} 
                disabled={!assignShipperData.shipper_id || !confirmAssignShipper} 
                className="btn-lux-primary-yellow"
              >
                <FaShippingFast className="me-2" /> Confirm Assignment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
