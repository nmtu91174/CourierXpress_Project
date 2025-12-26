// frontend/src/pages/agent/MyOrders.jsx
// My Orders - Task Execution View (Agent's personal orders only)

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, Row, Col, Button, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import {
  FaShippingFast,
  FaEye,
  FaFlag,
  FaSearch,
  FaExclamationTriangle,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaWeight,
  FaRoute,
  FaCreditCard,
  FaCalendarAlt,
  FaListAlt,
} from "react-icons/fa";

import OrderTable from "../../components/orders/OrderTable";
import OrderDetailPanel from "../../components/orders/OrderDetailPanel";
import StatusBadge from "../../components/common/StatusBadge";
import { ORDER_STATUS } from "../../constants/orderStatus";
import { initPageAnimations } from "../../utils/gsapAnimations";

import "../../assets/styles/dashboard.css";
import "../../assets/styles/agent_dashboard.css";

export default function MyOrders() {
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
  const [shippers, setShippers] = useState([]);
  
  // Get current user (agent)
  const [currentUser, setCurrentUser] = useState(null);

  // Filter state (simplified for My Orders)
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // =============================
  // PAGINATION STATE
  // =============================
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // =============================
  // NAVIGATION STATE
  // =============================
  const location = useLocation();
  const navigate = useNavigate();

  // =============================
  // 3. FETCH ORDERS (Only orders assigned to current agent)
  // =============================
  const fetchOrders = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user")) || {};
      setCurrentUser(user);

      if (!user.id) {
        setLoadingOrders(false);
        return;
      }

      // Fetch ONLY orders assigned to current agent (agent_id = current_user.id)
      const params = new URLSearchParams({
        page: 1,
        limit: 1000,
        agent_id: user.id, // Filter by current agent
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
  }, []);

  // =============================
  // 3.1. FETCH SHIPPERS
  // =============================
  useEffect(() => {
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

    fetchShippers();
  }, []);

  // Use active_orders_count from backend API (consistent with Dashboard)
  const shippersWithWorkload = useMemo(() => {
    return shippers.map(shipper => ({
      ...shipper,
      active_orders_count: shipper.active_orders_count || 0
    }));
  }, [shippers]);

  // =============================
  // 4. APPLY FILTER VÀO allOrders
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
      agent_name: o.agent_name || "",
      codAmount: o.cod_amount || 0,
      shippingFee: o.total_shipping_fee || 0,
      notes: o.notes || "",
      weight: o.weight || null,
      service_type_name: o.service_type_name || null,
      payment_method_name: o.payment_method_name || null,
      previous_status: o.previous_status || null,
    }));

    return data.filter((o) => {
      // Filter by status
      if (filterStatus !== "all" && String(o.status) !== String(filterStatus)) return false;
      
      // Search
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
  }, [allOrders, filterStatus, searchText]);

  // =============================
  // PAGINATED ORDERS
  // =============================
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchText]);

  // Calculate paginated orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage, pageSize]);

  // Total pages for pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  // =============================
  // 5. DETAIL PANEL
  // =============================
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPanel, setShowPanel] = useState(false);

  const openPanel = (order) => {
    setSelectedOrder(order);
    setShowPanel(true);
  };

  const closePanel = () => setShowPanel(false);

  // =============================
  // 5.1. SCROLL NAVIGATE STATE (for notification redirect)
  // =============================
  const [focusedOrderId, setFocusedOrderId] = useState(null);
  const [navigationIntent, setNavigationIntent] = useState(null);
  const processedRedirectRef = useRef(false);

  // =============================
  // 5.2. STEP 1: RECEIVE NAVIGATION INTENT (query param ?highlight=order_id)
  // =============================
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const highlightOrderId = searchParams.get('highlight');
    
    if (highlightOrderId && !processedRedirectRef.current) {
      const targetOrderId = Number(highlightOrderId);
      processedRedirectRef.current = true;
      
      // Save navigation intent to state
      setNavigationIntent({
        orderId: targetOrderId,
      });
      
      // Set focused order ID for highlighting
      setFocusedOrderId(targetOrderId);
      
      // Clean up URL immediately
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate, location.pathname]);

  // =============================
  // 5.3. STEP 2: PROCESS NAVIGATION INTENT (AFTER ORDERS LOAD)
  // =============================
  useEffect(() => {
    // Wait for navigation intent and orders to be ready
    if (!navigationIntent || loadingOrders || filteredOrders.length === 0) {
      return;
    }

    const { orderId } = navigationIntent;
    const targetOrderId = Number(orderId);

    // Find order in filteredOrders
    const orderIndex = filteredOrders.findIndex(o => Number(o.id) === targetOrderId);
    if (orderIndex === -1) {
      // Order not found - clear intent and state
      setNavigationIntent(null);
      navigate(location.pathname, { replace: true });
      processedRedirectRef.current = false;
      return;
    }

    // Calculate target page
    const targetPage = Math.floor(orderIndex / pageSize) + 1;
    
    // Change page if needed
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      // Wait for page to update before continuing
      return;
    }

    // Page is correct, now scroll and highlight
    const targetOrder = filteredOrders.find(o => Number(o.id) === targetOrderId);
    if (targetOrder) {
      // Scroll to order and highlight (wait for DOM to render)
      setTimeout(() => {
        const orderRow = document.querySelector(`[data-order-id="${targetOrderId}"]`);
        if (orderRow) {
          orderRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Set highlight AFTER scroll completes
          requestAnimationFrame(() => {
            setFocusedOrderId(targetOrderId);
          });
        } else {
          // Fallback: scroll to table
          const tableElement = document.querySelector('.lux-table-wrapper');
          if (tableElement) tableElement.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Clear navigation state AFTER processing is complete
        setTimeout(() => {
          setNavigationIntent(null);
          navigate(location.pathname, { replace: true });
          processedRedirectRef.current = false;
        }, 400);
      }, 300);
    } else {
      // Order not found - clear intent
      setNavigationIntent(null);
      navigate(location.pathname, { replace: true });
      processedRedirectRef.current = false;
    }
  }, [navigationIntent, filteredOrders, loadingOrders, currentPage, pageSize, navigate, location.pathname]);

  // =============================
  // 5.4. AUTO-FADE HIGHLIGHT AFTER 5 SECONDS
  // =============================
  useEffect(() => {
    if (!focusedOrderId) return;
    
    const timer = setTimeout(() => {
      setFocusedOrderId(null);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [focusedOrderId]);

  // =============================
  // 5.5. RESET HIGHLIGHT WHEN FILTER/SEARCH CHANGES
  // =============================
  useEffect(() => {
    if (focusedOrderId) {
      setFocusedOrderId(null);
    }
  }, [filterStatus, searchText]);

  // =============================
  // 6. MODAL ASSIGN SHIPPER
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
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaListAlt className="me-1" /> Order Code</small><div className="fw-bold text-primary">{order.order_code || order.code || "N/A"}</div></div></Col>
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
    const canAssign = Number(order.status) === ORDER_STATUS.APPROVED && (!order.shipper_id || Number(order.shipper_id) === 0);
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
          note: assignShipperData.note || "Assign shipper via My Orders",
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
          try {
            const detailRes = await fetch(`http://localhost:8888/api/admin/get_order_detail.php?order_id=${selectedOrder.id}`, {
              method: "GET",
              credentials: "include",
            });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.status === "success" && detailData.data) {
                const updatedOrderDetail = detailData.data;
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

  // Handler for flag issue (placeholder)
  const handleFlagIssue = (order) => {
    Swal.fire("Info", "Flag issue feature coming soon", "info");
  };

  return (
    <div className="admin-page container-fluid p-0" style={{ background: "transparent" }}>
      {/* ================= HEADER ================= */}
      <div className="page-header d-flex justify-content-between mb-4">
        <div>
          <h3 className="fw-bold">My Orders</h3>
          <p className="text-muted mb-0">Task execution view - Orders assigned to you</p>
        </div>
      </div>

      {/* ================= FILTERS (Simplified) ================= */}
      <Card className="card-lux mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Control
                type="text"
                placeholder="Search by order code, sender, receiver..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="1">Booked</option>
                <option value="2">Approved</option>
                <option value="3">Assigned</option>
                <option value="4">In Progress</option>
                <option value="5">Delivered</option>
                <option value="6">Failed</option>
                <option value="7">Cancelled</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setSearchText("");
                  setFilterStatus("all");
                }}
              >
                Reset Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ================= TABLE ================= */}
      <OrderTable
        loading={loadingOrders}
        orders={paginatedOrders}
        onRowClick={openPanel}
        onViewDetail={openPanel}
        onAssignShipper={handleAssignShipper}
        userRole="agent"
        showAgentColumn={false} // My Orders doesn't need Assigned Agent column
        focusedOrderId={focusedOrderId}
        onUserInteraction={() => setFocusedOrderId(null)}
      />

      {/* ===================== PAGINATION UI ===================== */}
      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap">
        {/* Page size selector */}
        <div className="d-flex align-items-center mb-2">
          <span className="me-2 small text-muted">Rows per page:</span>
          <Form.Select
            size="sm"
            style={{ width: "90px" }}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1); // Reset page when page size changes
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </Form.Select>
        </div>

        {/* Pagination controls - Luxury Style */}
        <div className="d-flex align-items-center gap-3 mb-2">
          <Button
            className="luxury-pagination-btn"
            variant="outline-primary"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => {
              // Reset navigation intent when user manually changes page
              setCurrentPage(prev => Math.max(prev - 1, 1));
              setFocusedOrderId(null);
              setNavigationIntent(null);
              processedRedirectRef.current = false;
            }}
            style={{
              minWidth: "100px",
              padding: "8px 20px",
              borderRadius: "8px",
              border: "1px solid rgba(37, 99, 235, 0.3)",
              background: currentPage === 1 
                ? "rgba(0, 0, 0, 0.05)" 
                : "linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.15))",
              color: currentPage === 1 ? "rgba(0, 0, 0, 0.3)" : "#2563eb",
              fontWeight: 600,
              transition: "all 0.3s ease",
              boxShadow: currentPage === 1 ? "none" : "0 2px 8px rgba(37, 99, 235, 0.15)",
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 1) {
                e.target.style.background = "linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(59, 130, 246, 0.25))";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.25)";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 1) {
                e.target.style.background = "linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.15))";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.15)";
              }
            }}
          >
            ← Previous
          </Button>

          <span 
            className="small"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.05), rgba(15, 23, 42, 0.08))",
              border: "1px solid rgba(15, 23, 42, 0.1)",
              fontWeight: 600,
              color: "#0b1220",
            }}
          >
            Page <strong style={{ color: "#2563eb" }}>{currentPage}</strong> of <strong style={{ color: "#2563eb" }}>{totalPages || 1}</strong>
            {filteredOrders.length > 0 && (
              <span className="text-muted ms-2">({filteredOrders.length} orders)</span>
            )}
          </span>

          <Button
            className="luxury-pagination-btn"
            variant="outline-primary"
            size="sm"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => {
              // Reset navigation intent when user manually changes page
              setCurrentPage(prev => Math.min(prev + 1, totalPages));
              setFocusedOrderId(null);
              setNavigationIntent(null);
              processedRedirectRef.current = false;
            }}
            style={{
              minWidth: "100px",
              padding: "8px 20px",
              borderRadius: "8px",
              border: "1px solid rgba(37, 99, 235, 0.3)",
              background: (currentPage === totalPages || totalPages === 0)
                ? "rgba(0, 0, 0, 0.05)" 
                : "linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.15))",
              color: (currentPage === totalPages || totalPages === 0) ? "rgba(0, 0, 0, 0.3)" : "#2563eb",
              fontWeight: 600,
              transition: "all 0.3s ease",
              boxShadow: (currentPage === totalPages || totalPages === 0) ? "none" : "0 2px 8px rgba(37, 99, 235, 0.15)",
            }}
            onMouseEnter={(e) => {
              if (currentPage !== totalPages && totalPages !== 0) {
                e.target.style.background = "linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(59, 130, 246, 0.25))";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.25)";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== totalPages && totalPages !== 0) {
                e.target.style.background = "linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.15))";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 2px 8px rgba(37, 99, 235, 0.15)";
              }
            }}
          >
            Next →
          </Button>
        </div>
      </div>

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
                    id="confirm-assign-shipper-my-orders"
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
