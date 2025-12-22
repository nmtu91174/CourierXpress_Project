// frontend/src/pages/agent/AssignShipper.jsx
// Assign Shipper - Exception Handling Page (Only APPROVED orders without shipper)

import React, { useState, useEffect, useMemo } from "react";
import { Card, Row, Col, Button, Form, Table, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";
import {
  FaShippingFast,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaWeight,
  FaRoute,
  FaExclamationTriangle,
  FaSearch,
} from "react-icons/fa";

import StatusBadge from "../../components/common/StatusBadge";
import OrderDetailPanel from "../../components/orders/OrderDetailPanel";
import { ORDER_STATUS } from "../../constants/orderStatus";
import { initPageAnimations } from "../../utils/gsapAnimations";

import "../../assets/styles/dashboard.css";
import "../../assets/styles/agent_dashboard.css";

export default function AssignShipper() {
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

  // Filter state (simplified - only show APPROVED orders without shipper)
  const [searchText, setSearchText] = useState("");

  // =============================
  // 3. FETCH ORDERS (Only APPROVED orders without shipper - exception handling)
  // =============================
  const fetchOrders = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user")) || {};
      setCurrentUser(user);

      // Fetch all orders (team scope for coordination)
      // Filter to APPROVED + no shipper in frontend
      const params = new URLSearchParams({
        page: 1,
        limit: 1000,
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

        // Filter: Only APPROVED orders without shipper
        const filtered = data.filter(o => 
          Number(o.status) === ORDER_STATUS.APPROVED && 
          (!o.shipper_id || Number(o.shipper_id) === 0)
        );

        setAllOrders(filtered);
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
      sender_name: o.sender_name || o.sender || "",
      sender_phone: o.sender_phone || "",
      sender_address: o.sender_address || "",
      receiver_name: o.receiver_name || o.receiver || "",
      receiver_phone: o.receiver_phone || "",
      receiver_address: o.receiver_address || o.address || "",
      created_at: o.created_at,
      status: o.status,
      payment_method_id: o.payment_method_id || null,
      payment_method_name: o.payment_method_name || null,
      shipper_id: o.shipper_id || null,
      shipper_name: o.shipper_name || "",
      agent_id: o.agent_id || null,
      agent_name: o.agent_name || "",
      weight: o.weight || null,
      service_type_name: o.service_type_name || null,
      cod_amount: o.cod_amount || 0,
      total_shipping_fee: o.total_shipping_fee || 0,
      notes: o.notes || "",
      previous_status: o.previous_status || null,
    }));

    return data.filter((o) => {
      // Search
      if (searchText) {
        const v = searchText.toLowerCase().trim();
        const haystack = [
          o.code,
          o.order_code,
          o.sender_name,
          o.receiver_name,
          o.sender_phone,
          o.receiver_phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(v)) return false;
      }

      return true;
    });
  }, [allOrders, searchText]);

  // Helper: Get full address (not just last part) - For Hanoi inner city operations
  const getFullAddress = (address) => {
    if (!address) return "N/A";
    // Return full address for Hanoi inner city operations
    return address;
  };

  // Helper: Format weight
  const formatWeight = (weight) => {
    if (!weight) return "N/A";
    return `${Number(weight).toLocaleString("en-US")} g`;
  };

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
  // 6. MODAL ASSIGN SHIPPER
  // =============================
  const [showAssignShipperModal, setShowAssignShipperModal] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState(null);
  const [assignShipperData, setAssignShipperData] = useState({ order_id: "", shipper_id: "", note: "" });
  const [confirmAssignShipper, setConfirmAssignShipper] = useState(false);

  // OrderInfoDisplay component (reusable)
  const OrderInfoDisplay = ({ order, iconColor = "text-warning" }) => {
    if (!order) return null;

    return (
      <div className="luxury-order-info mb-4 p-3" style={{ backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #dee2e6" }}>
        <div className="d-flex align-items-center mb-3">
          <FaInfoCircle className={`me-2 ${iconColor}`} />
          <h6 className="fw-bold mb-0">Order Summary (Read-Only)</h6>
        </div>
        <Row className="g-3">
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaInfoCircle className="me-1" /> Order Code</small><div className="fw-bold text-primary">{order.order_code || order.code || "N/A"}</div></div></Col>
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-block mb-1">Status</small><div style={{ display: "inline-block" }}><StatusBadge status={order.status} /></div></div></Col>
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaMapMarkerAlt className="me-1" /> Pickup Address</small><div className="small fw-semibold">{getFullAddress(order.sender_address)}</div></div></Col>
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaMapMarkerAlt className="me-1" /> Delivery Address</small><div className="small fw-semibold">{getFullAddress(order.receiver_address)}</div></div></Col>
          {order.weight && (
            <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaWeight className="me-1" /> Weight</small><div className="fw-bold">{formatWeight(order.weight)}</div></div></Col>
          )}
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaRoute className="me-1" /> Service Type</small><div className="fw-bold">{order.service_type_name || "Standard"}</div></div></Col>
        </Row>
      </div>
    );
  };

  // Handler for assign shipper from table
  const handleAssignShipper = (order) => {
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
          note: assignShipperData.note || "Assign shipper via Assign Shipper page",
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

  return (
    <div className="admin-page container-fluid p-0" style={{ background: "transparent" }}>
      {/* ================= HEADER ================= */}
      <div className="page-header d-flex justify-content-between mb-4">
        <div>
          <h3 className="fw-bold">Assign Shipper</h3>
          <p className="text-muted mb-0">Exception handling - Approve orders awaiting shipper assignment</p>
        </div>
      </div>

      {/* ================= INFO CARD ================= */}
      <Card className="card-lux mb-4 border-warning" style={{ borderWidth: "2px" }}>
        <Card.Body>
          <div className="d-flex align-items-start">
            <FaExclamationTriangle className="me-3 text-warning fs-4 mt-1" />
            <div>
              <h6 className="fw-bold mb-2">Exception Handling Page</h6>
              <p className="text-muted mb-0 small">
                This page displays only orders with status <strong>APPROVED</strong> that have <strong>no shipper assigned</strong>.
                These orders require immediate attention to ensure timely delivery.
              </p>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* ================= FILTERS ================= */}
      <Card className="card-lux mb-3">
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Control
                type="text"
                placeholder="Search by order code, sender, receiver..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setSearchText("");
                }}
              >
                Reset Filter
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ================= TABLE (Exception-focused columns) ================= */}
      <Card className="card-lux mb-4">
        <Card.Body>
          <div className="lux-table-wrapper">
            <Table hover responsive className="lux-table align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>Order Code</th>
                  <th style={{ width: "280px" }}>Pickup Address</th>
                  <th style={{ width: "280px" }}>Delivery Address</th>
                  <th style={{ width: "100px" }}>Weight</th>
                  <th style={{ width: "150px" }}>Service Type</th>
                  <th style={{ width: "115px" }}>Status</th>
                  <th className="text-start" style={{ width: "150px" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {/* Loading */}
                {loadingOrders && (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading orders...
                    </td>
                  </tr>
                )}

                {/* Empty */}
                {!loadingOrders && filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No pending assignment orders found.
                    </td>
                  </tr>
                )}

                {/* Data */}
                {!loadingOrders &&
                  filteredOrders.map((o) => (
                    <tr
                      key={o.id || o.order_code}
                      className="cursor-pointer"
                      onClick={() => openPanel(o)}
                    >
                      {/* Order Code */}
                      <td className="fw-semibold text-primary">
                        <span className="order-code">{o.order_code || o.code}</span>
                      </td>

                      {/* Pickup Address */}
                      <td>
                        <div className="d-flex align-items-start">
                          <FaMapMarkerAlt className="me-2 text-muted mt-1 flex-shrink-0" />
                          <span className="small" style={{ lineHeight: "1.4" }}>{getFullAddress(o.sender_address)}</span>
                        </div>
                      </td>

                      {/* Delivery Address */}
                      <td>
                        <div className="d-flex align-items-start">
                          <FaMapMarkerAlt className="me-2 text-muted mt-1 flex-shrink-0" />
                          <span className="small" style={{ lineHeight: "1.4" }}>{getFullAddress(o.receiver_address)}</span>
                        </div>
                      </td>

                      {/* Weight */}
                      <td>
                        <div className="d-flex align-items-center">
                          <FaWeight className="me-2 text-muted" />
                          <span>{formatWeight(o.weight)}</span>
                        </div>
                      </td>

                      {/* Service Type */}
                      <td>
                        <div className="d-flex align-items-center">
                          <FaRoute className="me-2 text-muted flex-shrink-0" />
                          <span className="small" style={{ whiteSpace: "nowrap" }}>{o.service_type_name || "Standard"}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge status={o.status} />
                      </td>

                      {/* Actions */}
                      <td className="text-start">
                        <div className="d-flex gap-1">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="order-action-btn"
                            title="View Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPanel(o);
                            }}
                          >
                            <FaSearch />
                          </Button>
                          <Button
                            size="sm"
                            variant="warning"
                            className="btn-lux-primary-yellow order-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignShipper(o);
                            }}
                          >
                            <FaShippingFast className="me-1" /> Assign
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

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
                    id="confirm-assign-shipper-page"
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
