// frontend/src/pages/admin/Dashboard.jsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";

import {
  Card,
  Row,
  Col,
  ListGroup,
  Button,
  Form,
} from "react-bootstrap";
import Swal from "sweetalert2";

import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

import {
  FaBox,
  FaShippingFast,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBell,
  FaClipboardList,
  FaChartBar,
  FaUserTie,
  FaHistory,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaWeight,
  FaRoute,
  FaCreditCard,
  FaCalendarAlt,
} from "react-icons/fa";

import { initPageAnimations } from "../../utils/gsapAnimations";

// ⭐ 3 COMPONENT TÁCH RIÊNG
import OrderFilterBar from "../../components/orders/OrderFilterBar";
import OrderTable from "../../components/orders/OrderTable";
import OrderDetailPanel from "../../components/orders/OrderDetailPanel";
import StatusBadge from "../../components/common/StatusBadge";
import { getStatusesInGroup } from "../../constants/orderStatusGroups";

import "../../assets/styles/dashboard.css";

export default function Dashboard() {
  // =============================
  // 1. GSAP ANIMATION
  // =============================
  useEffect(() => {
    return initPageAnimations();
  }, []);

  // =============================
  // 2. STATE – DATA TỪ API
  // =============================
  const [allOrders, setAllOrders] = useState([]);       // dùng cho filter + chart + KPI
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [userRole, setUserRole] = useState("admin");    // Get from localStorage
  const [agents, setAgents] = useState([]);             // Danh sách agents
  const [shippers, setShippers] = useState([]);          // Danh sách shippers
  const [systemLogs, setSystemLogs] = useState([]);     // Nhật ký hệ thống (lỗi kỹ thuật - DEV ONLY)
  const [businessLogs, setBusinessLogs] = useState([]);  // Nhật ký nghiệp vụ (lỗi business - ADMIN)
  const [notifications, setNotifications] = useState([]); // Thông báo gần đây

  // KPI (tạm dùng state, có thể tính từ allOrders)
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState("₫ 0");
  const [successRate, setSuccessRate] = useState("0%");
  const [cancelRate, setCancelRate] = useState("0%");

  // =============================
  // 2.1. FILTER STATE (Enterprise Filters) - Phải khai báo trước useEffect
  // =============================
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStatusGroup, setFilterStatusGroup] = useState("all"); // NEW: Filter theo nhóm
  const [filterBranch, setFilterBranch] = useState("all");      // agent_id
  const [filterShipper, setFilterShipper] = useState("all");    // shipper_id
  const [filterPayment, setFilterPayment] = useState("all");    // payment_method_id
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all"); // NEW: unpaid/paid/cancelled
  const [filterCOD, setFilterCOD] = useState("all");            // NEW: has_cod / no_cod
  const [filterNoAgent, setFilterNoAgent] = useState(false);     // NEW: Chưa có agent
  const [filterNoShipper, setFilterNoShipper] = useState(false); // NEW: Chưa có shipper
  const [filterAssignedNotPicked, setFilterAssignedNotPicked] = useState(false); // NEW: Đã assign chưa pickup
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchText, setSearchText] = useState("");

  // =============================
  // 3. FETCH TẤT CẢ ĐƠN HÀNG
  // =============================
  const fetchOrders = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user")) || {};
      setUserRole(user.role || "admin");

      const params = new URLSearchParams({
        page: 1,
        limit: 100,
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

        // ===== KPI =====
        const total = data.length;
        const delivered = data.filter(o => Number(o.status) === 5).length;
        const cancelled = data.filter(o => Number(o.status) === 7).length; // Status 7 = Cancelled

        setTotalOrders(total);

        const revenue = data.reduce(
          (sum, o) => sum + Number(o.total_shipping_fee || 0),
          0
        );

        setTotalRevenue(
          revenue.toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
          })
        );

        setSuccessRate(total ? Math.round((delivered / total) * 100) + "%" : "0%");
        setCancelRate(total ? Math.round((cancelled / total) * 100) + "%" : "0%");
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
  }, []); // Chỉ fetch một lần khi mount, không phụ thuộc vào filter

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

  // =============================
  // 3.2. FETCH SYSTEM LOGS & NOTIFICATIONS
  // =============================
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Fetch audit logs (thông báo gần đây)
        const auditRes = await fetch(
          "http://localhost:8888/api/admin/view_logs.php?type=audit&lines=20",
          {
            method: "GET",
            credentials: "include",
          }
        );
        if (auditRes.ok) {
          const auditJson = await auditRes.json();
          if (auditJson.status === "success" && auditJson.data?.content) {
            const lines = auditJson.data.content.split("\n").filter((l) => l.trim());
            const notifications = lines
              .slice(-20)
              .reverse()
              .slice(0, 10) // Chỉ lấy 10 mới nhất
              .map((line) => {
                // Parse audit log format: [timestamp] user=... role=... action=... order=... note=...
                const timeMatch = line.match(/\[([^\]]+)\]/);
                const userMatch = line.match(/user=(\d+)/);
                const roleMatch = line.match(/role=(\w+)/);
                const actionMatch = line.match(/action=(\w+)/);
                const orderMatch = line.match(/order=(\d+)/);
                const noteMatch = line.match(/note=([^\n]+)/);
                
                const action = actionMatch ? actionMatch[1] : "";
                const orderId = orderMatch ? orderMatch[1] : null;
                const note = noteMatch ? noteMatch[1].trim() : "";
                const role = roleMatch ? roleMatch[1] : "";
                
                // Get order code from note or generate from orderId
                let orderCode = null;
                if (orderId) {
                  // Try to extract ORD code from note first
                  const ordMatch = note.match(/ORD\d+/);
                  if (ordMatch) {
                    orderCode = ordMatch[0];
                  } else {
                    orderCode = `ORD${String(orderId).padStart(4, '0')}`;
                  }
                }
                
                // Get role display name
                const roleDisplay = role === "admin" ? "Admin" : role === "agent" ? "Agent" : role === "shipper" ? "Shipper" : "User";
                
                // Map action thành message thân thiện với format mới
                let message = "";
                switch (action) {
                  case "CREATE_ORDER":
                    message = orderCode ? `${roleDisplay} created order #${orderCode}` : `${roleDisplay} created order`;
                    break;
                  case "UPDATE_STATUS":
                    message = orderCode ? `${roleDisplay} updated order status #${orderCode}` : `${roleDisplay} updated order status`;
                    break;
                  case "ASSIGN_AGENT":
                    const agentMatch = note.match(/agent=(\d+)/);
                    if (agentMatch) {
                      const agentId = parseInt(agentMatch[1]);
                      const agent = agents.find(a => a.id === agentId);
                      const agentName = agent ? agent.name : `Agent #${agentId}`;
                      message = orderCode ? `${roleDisplay} assigned agent ${agentName} to order #${orderCode}` : `${roleDisplay} assigned agent ${agentName}`;
                    } else {
                      message = orderCode ? `${roleDisplay} assigned agent to order #${orderCode}` : `${roleDisplay} assigned agent`;
                    }
                    break;
                  case "ASSIGN_SHIPPER":
                    const shipperMatch = note.match(/shipper=(\d+)/);
                    if (shipperMatch) {
                      const shipperId = parseInt(shipperMatch[1]);
                      const shipper = shippers.find(s => s.id === shipperId);
                      const shipperName = shipper ? shipper.name : `Shipper #${shipperId}`;
                      message = orderCode ? `${roleDisplay} assigned shipper ${shipperName} to order #${orderCode}` : `${roleDisplay} assigned shipper ${shipperName}`;
                    } else {
                      message = orderCode ? `${roleDisplay} assigned shipper to order #${orderCode}` : `${roleDisplay} assigned shipper`;
                    }
                    break;
                  case "DELETE_ORDER":
                    message = orderCode ? `${roleDisplay} deleted order #${orderCode}` : `${roleDisplay} deleted order`;
                    break;
                  case "LOGIN":
                    message = `${roleDisplay} logged in`;
                    break;
                  case "REGISTER":
                    message = `${roleDisplay} registered`;
                    break;
                  case "RESET_PASSWORD":
                    message = `${roleDisplay} reset password`;
                    break;
                  case "UPDATE_USER":
                    message = `${roleDisplay} updated user information`;
                    break;
                  case "CONFIRM_PICKUP":
                    message = orderCode ? `Shipper confirmed pickup for order #${orderCode}` : "Shipper confirmed pickup";
                    break;
                  case "CONFIRM_DELIVERY":
                    message = orderCode ? `Shipper delivered order #${orderCode} successfully` : "Shipper delivered order successfully";
                    break;
                  default:
                    message = note || action || "System action";
                }
                
                return {
                  time: timeMatch ? timeMatch[1] : "",
                  event: action,
                  message: message,
                  orderId: orderId,
                  orderCode: orderCode,
                  note: note,
                  role: role,
                };
              });
            setNotifications(notifications);
          }
        }

        // Fetch app logs (nhật ký hệ thống)
        const appRes = await fetch(
          "http://localhost:8888/api/admin/view_logs.php?type=app&lines=100",
          {
            method: "GET",
            credentials: "include",
          }
        );
        if (appRes.ok) {
          const appJson = await appRes.json();
          if (appJson.status === "success" && appJson.data?.content) {
            const lines = appJson.data.content.split("\n").filter((l) => l.trim());
            
            // Tách thành 2 loại: System Logs (kỹ thuật) và Business Logs (nghiệp vụ)
            const systemErrors = [];
            const businessErrors = [];
            
            lines
              .filter((line) => line.includes("[ERROR]"))
              .slice(-20)
              .reverse()
              .forEach((line) => {
                const timeMatch = line.match(/\[([^\]]+)\]/);
                const errorMatch = line.match(/\[ERROR\]\s*(.+)/);
                const message = errorMatch ? errorMatch[1].trim() : line;
                
                // Map lỗi kỹ thuật sang business message
                const businessMessage = mapBusinessMessage(message);
                const isBusinessError = businessMessage !== message; // Nếu message thay đổi = business error
                
                const logEntry = {
                  time: timeMatch ? timeMatch[1] : "",
                  message: message,
                  businessMessage: businessMessage,
                  fullMessage: line,
                };
                
                if (isBusinessError) {
                  businessErrors.push(logEntry);
                } else {
                  systemErrors.push(logEntry);
                }
              });
            
            // Chỉ lấy 10 mới nhất mỗi loại
            setSystemLogs(systemErrors.slice(0, 10));
            setBusinessLogs(businessErrors.slice(0, 10));
          }
        }
      } catch (err) {
        console.error("Lỗi load logs:", err);
      }
    };

    fetchLogs();
    // Refresh logs mỗi 30 giây
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [agents, shippers]); // Thêm dependencies để re-parse khi agents/shippers thay đổi

  // =============================
  // 3.3. MAP BUSINESS MESSAGE
  // =============================
  const mapBusinessMessage = (technicalMessage) => {
    const msg = technicalMessage.toLowerCase();
    
    // Business errors - map sang message thân thiện
    if (msg.includes("thiếu cấu hình đơn giá") || msg.includes("thiếu cấu hình")) {
      return "System is not ready to process orders. Please contact administrator to configure shipping fees.";
    }
    if (msg.includes("không thể phân công") || msg.includes("assign")) {
      return "Cannot assign shipper. Please check order status.";
    }
    if (msg.includes("foreign key") || msg.includes("constraint")) {
      return "Invalid data. Please check order information.";
    }
    if (msg.includes("không tồn tại") || msg.includes("not found")) {
      return "Requested data not found. Please try again.";
    }
    if (msg.includes("không có quyền") || msg.includes("permission")) {
      return "You do not have permission to perform this action.";
    }
    if (msg.includes("đã tồn tại") || msg.includes("already exists")) {
      return "Data already exists in the system.";
    }
    
    // Technical errors - giữ nguyên (sẽ hiển thị ở system logs)
    return technicalMessage;
  };

  // =============================
  // 5. APPLY FILTER VÀO allOrders
  // (chuyển allOrders sang format phù hợp cho OrderTable)
  // =============================
  const filteredOrders = useMemo(() => {
    if (!allOrders || allOrders.length === 0) return [];
    
    const data = allOrders.map((o) => ({
      id: o.id,
      order_code: o.order_code || o.code,
      code: o.order_code || o.code,
      // tạm map branch = receiver_address (sau này có cột branch thì sửa ở đây)
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
      shipper_id: o.shipper_id || null, // Cần để check canAssignShipper
      agent_id: o.agent_id || null, // Cần để filter
      codAmount: o.cod_amount || 0,
      shippingFee: o.total_shipping_fee || 0,
      notes: o.notes || "",
    }));

    return data.filter((o) => {
      // 1. Filter by status group (Enterprise)
      if (filterStatusGroup && filterStatusGroup !== "all") {
        const statusesInGroup = getStatusesInGroup(filterStatusGroup);
        if (statusesInGroup.length > 0 && !statusesInGroup.includes(Number(o.status))) {
          return false;
        }
      }
      
      // 2. Filter by specific status (nếu có chọn chi tiết)
      if (filterStatus !== "all" && String(o.status) !== String(filterStatus)) return false;
      
      // 3. Filter by agent
      if (filterBranch !== "all" && String(o.agent_id) !== String(filterBranch)) return false;
      
      // 4. Filter by shipper
      if (filterShipper !== "all" && String(o.shipper_id) !== String(filterShipper)) return false;
      
      // 5. Filter by payment method
      if (filterPayment !== "all" && String(o.payment_method_id) !== String(filterPayment)) return false;

      // 6. Workflow filters (Enterprise)
      if (filterNoAgent && o.agent_id !== null && o.agent_id !== undefined && Number(o.agent_id) !== 0) {
        return false;
      }
      if (filterNoShipper && o.shipper_id !== null && o.shipper_id !== undefined && Number(o.shipper_id) !== 0) {
        return false;
      }
      if (filterAssignedNotPicked) {
        // Status = ASSIGNED (3) nhưng chưa pickup (status chưa = 4)
        if (Number(o.status) !== 3) return false;
      }

      // 7. Finance filters
      if (filterCOD === "has_cod" && (!o.codAmount || Number(o.codAmount) <= 0)) {
        return false;
      }
      if (filterCOD === "no_cod" && o.codAmount && Number(o.codAmount) > 0) {
        return false;
      }
      // filterPaymentStatus sẽ xử lý ở backend (cần join invoices)

      // 8. Filter by date range
      if (filterDateFrom && o.created_at) {
        const orderDate = new Date(o.created_at).toISOString().split('T')[0];
        if (orderDate < filterDateFrom) return false;
      }
      if (filterDateTo && o.created_at) {
        const orderDate = new Date(o.created_at).toISOString().split('T')[0];
        if (orderDate > filterDateTo) return false;
      }

      // 9. Advanced search (Enterprise)
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
          // invoice_number sẽ được thêm khi backend join invoices
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
    filterStatus,
    filterStatusGroup,
    filterBranch,
    filterShipper,
    filterPayment,
    filterPaymentStatus,
    filterCOD,
    filterNoAgent,
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
  // 6.1. ASSIGN MODAL STATES
  // =============================
  const [showAssignAgentModal, setShowAssignAgentModal] = useState(false);
  const [showAssignShipperModal, setShowAssignShipperModal] = useState(false);
  const [selectedOrderForAssign, setSelectedOrderForAssign] = useState(null);
  const [assignAgentData, setAssignAgentData] = useState({ order_id: "", agent_id: "", note: "" });
  const [assignShipperData, setAssignShipperData] = useState({ order_id: "", shipper_id: "", note: "" });
  const [confirmAssignAgent, setConfirmAssignAgent] = useState(false);
  const [confirmAssignShipper, setConfirmAssignShipper] = useState(false);

  // Calculate workload for agents and shippers from allOrders
  const agentsWithWorkload = useMemo(() => {
    return agents.map(agent => {
      const activeOrders = allOrders.filter(o => 
        Number(o.agent_id) === Number(agent.id) && 
        [1, 2, 3, 4].includes(Number(o.status)) // Non-terminal statuses
      ).length;
      return { ...agent, active_orders_count: activeOrders };
    });
  }, [agents, allOrders]);

  const shippersWithWorkload = useMemo(() => {
    return shippers.map(shipper => {
      const activeOrders = allOrders.filter(o => 
        Number(o.shipper_id) === Number(shipper.id) && 
        [1, 2, 3, 4].includes(Number(o.status)) // Non-terminal statuses
      ).length;
      return { ...shipper, active_orders_count: activeOrders };
    });
  }, [shippers, allOrders]);

  // Get orders available for assignment (for dropdown)
  // Enterprise: Only show orders eligible for agent assignment (agent_id IS NULL)
  const ordersForAgentAssignment = useMemo(() => {
    return allOrders.filter(o => {
      const status = Number(o.status);
      const hasAgent = o.agent_id !== null && o.agent_id !== undefined && Number(o.agent_id) !== 0;
      
      // Only BOOKED (1) orders without agent are eligible for assignment
      // Exclude terminal statuses (CANCELLED=7, FAILED=6, DELIVERED=5)
      return status === 1 && !hasAgent && status !== 5 && status !== 6 && status !== 7;
    });
  }, [allOrders]);

  const ordersForShipperAssignment = useMemo(() => {
    // Only orders that are APPROVED (status=2) and don't have shipper yet
    return allOrders.filter(o => Number(o.status) === 2 && (!o.shipper_id || Number(o.shipper_id) === 0));
  }, [allOrders]);

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

  // Handlers
  const openAssignAgentModal = () => {
    setSelectedOrderForAssign(null);
    setAssignAgentData({ order_id: "", agent_id: "", note: "" });
    setConfirmAssignAgent(false);
    setShowAssignAgentModal(true);
  };

  const openAssignShipperModal = () => {
    setSelectedOrderForAssign(null);
    setAssignShipperData({ order_id: "", shipper_id: "", note: "" });
    setConfirmAssignShipper(false);
    setShowAssignShipperModal(true);
  };

  const handleAssignAgentSubmit = async () => {
    if (!assignAgentData.order_id) {
      return Swal.fire("Warning", "Please select an order", "warning");
    }
    if (!assignAgentData.agent_id) {
      return Swal.fire("Warning", "Please select an agent", "warning");
    }
    if (!confirmAssignAgent) {
      return Swal.fire("Warning", "Please confirm the assignment", "warning");
    }
    
    try {
      const res = await fetch("http://localhost:8888/api/admin/assign_agent.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order_id: Number(assignAgentData.order_id),
          agent_id: Number(assignAgentData.agent_id),
          note: assignAgentData.note || "Assign agent via Dashboard quick action",
        }),
      });
      
      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Success", "Agent assigned successfully!", "success");
        setShowAssignAgentModal(false);
        setConfirmAssignAgent(false);
        setAssignAgentData({ order_id: "", agent_id: "", note: "" });
        setSelectedOrderForAssign(null);
        
        // Refresh orders
        await fetchOrders();
      } else {
        Swal.fire("Error", data.message || "Cannot assign agent", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Server connection error", "error");
    }
  };

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
          note: assignShipperData.note || "Assign shipper via Dashboard quick action",
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
      } else {
        Swal.fire("Error", data.message || "Cannot assign shipper", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Server connection error", "error");
    }
  };

  // =============================
  // 7. CHART DATA (ECharts) – TÍNH TỪ allOrders
  // =============================

  // 7.1. Đếm theo status -> Pie chart - Enterprise Workflow (Option B)
  const statusCounts = useMemo(() => {
    const counts = {
      booked: 0,      // 1
      approved: 0,    // 2
      assigned: 0,    // 3
      inProgress: 0,  // 4
      delivered: 0,   // 5
      failed: 0,      // 6
      cancelled: 0,   // 7
    };

    allOrders.forEach((o) => {
      switch (Number(o.status)) {
        case 1: // BOOKED
          counts.booked++;
          break;
        case 2: // APPROVED
          counts.approved++;
          break;
        case 3: // ASSIGNED
          counts.assigned++;
          break;
        case 4: // IN_PROGRESS
          counts.inProgress++;
          break;
        case 5: // DELIVERED
          counts.delivered++;
          break;
        case 6: // FAILED (terminal)
          counts.failed++;
          break;
        case 7: // CANCELLED (terminal)
          counts.cancelled++;
          break;
        default:
          break;
      }
    });

    return counts;
  }, [allOrders]);

  const optionOrderStatusPie = {
    tooltip: { trigger: "item" },
    legend: { 
      bottom: 10,
      left: "center",
      itemGap: 10,
      textStyle: {
        fontSize: 12
      }
    },
    grid: {
      top: 20,
      bottom: 80,
      left: 20,
      right: 20,
    },
    series: [
      {
        name: "Status",
        type: "pie",
        radius: ["40%", "70%"],
        center: ["50%", "45%"],
        avoidLabelOverlap: true,
        data: [
          { value: statusCounts.booked, name: "Booked" },
          { value: statusCounts.approved, name: "Approved" },
          { value: statusCounts.assigned, name: "Assigned" },
          { value: statusCounts.inProgress, name: "Picked Up" },
          { value: statusCounts.delivered, name: "Delivered" },
          { value: statusCounts.failed, name: "Failed" },
          { value: statusCounts.cancelled, name: "Cancelled" },
        ],
        itemStyle: {
          borderRadius: 6,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: "{b}: {c}",
          fontSize: 11
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 8
        }
      },
    ],
  };

  // 7.2. 7 ngày gần nhất – Line chart
  const last7Days = useMemo(() => {
    const labels = [];
    const values = [];

    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD

      const count = allOrders.filter((o) => {
        if (!o.created_at) return false;
        const dateStr = o.created_at.slice(0, 10);
        return dateStr === key;
      }).length;

      labels.push(
        d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        })
      );
      values.push(count);
    }

    return { labels, values };
  }, [allOrders]);

  const optionOrders7Days = {
    tooltip: { trigger: "axis" },
    grid: {
      top: 20,
      bottom: 40,
      left: 50,
      right: 30,
      containLabel: true
    },
    xAxis: { 
      type: "category", 
      data: last7Days.labels,
      axisLabel: {
        fontSize: 11
      }
    },
    yAxis: { 
      type: "value",
      axisLabel: {
        fontSize: 11
      }
    },
    series: [
      {
        name: "Daily Orders",
        type: "line",
        data: last7Days.values,
        smooth: true,
        lineStyle: { width: 4, color: "#2196f3" },
        areaStyle: { color: "rgba(33,150,243,0.25)" },
        symbol: "circle",
        symbolSize: 9,
        itemStyle: { color: "#2196f3" },
      },
    ],
    animationDuration: 900,
    animationEasing: "cubicOut",
  };

  return (
    <div className="admin-page container-fluid p-0">
      {/* ================= KPI ================= */}
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Total Orders (Year)</p>
                  <h2 className="fw-bold my-1">{totalOrders}</h2>
                </div>
                <FaBox className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Total Revenue (Est.)</p>
                  <h2 className="fw-bold my-1">{totalRevenue}</h2>
                </div>
                <FaChartBar className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Success Rate</p>
                  <h2 className="fw-bold my-1">{successRate}</h2>
                </div>
                <FaCheckCircle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card
            className="kpi-item border-0 shadow-sm text-white"
            style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Cancel Rate</p>
                  <h2 className="fw-bold my-1">{cancelRate}</h2>
                </div>
                <FaExclamationTriangle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ================= QUICK ACTION ================= */}
      <Card className="card-lux mb-4">
        <Card.Body>
          <h5 className="fw-bold mb-3">Quick Actions</h5>

          <div className="d-flex gap-3 flex-wrap">
            <Link
              to="/admin/orders"
              state={{ action: "create" }}
              className="quick-action btn btn-sm btn-lux-primary-blue btn-hover-scale"
            >
              <FaClipboardList className="me-2" /> Create Order
            </Link>

            <Button
              onClick={openAssignAgentModal}
              disabled={userRole !== "admin"}
              className="quick-action btn btn-sm btn-lux-primary-red btn-hover-scale"
              title={userRole !== "admin" ? "Only admin can assign agents" : "Assign Agent to Order"}
            >
              <FaUserTie className="me-2" /> Assign Agent
            </Button>

            <Button
              onClick={openAssignShipperModal}
              disabled={userRole !== "admin" && userRole !== "agent"}
              className="quick-action btn btn-sm btn-lux-primary-yellow btn-hover-scale"
              title={userRole !== "admin" && userRole !== "agent" ? "Only admin/agent can assign shippers" : "Assign Shipper to Order"}
            >
              <FaShippingFast className="me-2" /> Assign Shipper
            </Button>

            <Link
              to="/admin/reports"
              className="quick-action btn btn-sm btn-lux-primary-green btn-hover-scale"
            >
              <FaChartBar className="me-2" /> View Reports
            </Link>
          </div>
        </Card.Body>
      </Card>

            {/* ================= CHARTS ================= */}
      <Row className="g-4 mb-4">
        <Col md={6} className="chart-wrapper">
          <Card className="card-lux p-3" style={{ minHeight: '450px' }}>
            <h6 className="fw-bold mb-3">Order Status Distribution</h6>
            <div style={{ height: 380, marginTop: '10px' }}>
              <ReactECharts
                option={optionOrderStatusPie}
                style={{ height: "100%", width: "100%" }}
                echarts={echarts}
              />
            </div>
          </Card>
        </Col>

        <Col md={6} className="chart-wrapper">
          <Card className="card-lux p-3" style={{ minHeight: '450px' }}>
            <h6 className="fw-bold mb-3">Last 7 Days</h6>
            <div style={{ height: 380, marginTop: '10px' }}>
              <ReactECharts
                option={optionOrders7Days}
                style={{ height: "100%", width: "100%" }}
                echarts={echarts}
              />
            </div>
          </Card>
        </Col>
      </Row>

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
        }}
      />

      <OrderTable
        loading={loadingOrders}
        orders={filteredOrders}
        onRowClick={openPanel}
        onViewDetail={openPanel}
        onAssignShipper={(order) => {
          // Handle assign shipper - sẽ implement modal sau
          console.log("Assign shipper for order:", order);
          // TODO: Open assign modal
        }}
        userRole={userRole}
      />


      {/* ================= NOTIFS & LOGS (từ API) ================= */}
      <Row className="g-3 mb-5">
        <Col md={6} className="fade-section">
          <Card className="card-lux">
            <Card.Body>
              <h6 className="fw-bold mb-3 d-flex align-items-center">
                <FaBell className="me-2 text-warning" style={{ fontSize: "1.1rem" }} />
                Recent Notifications
              </h6>
              <ListGroup variant="flush">
                {notifications.length > 0 ? (
                  notifications.map((notif, idx) => {
                    // Parse time từ format [2025-12-13 17:29:30]
                    let timeStr = "";
                    if (notif.time) {
                      try {
                        const date = new Date(notif.time.replace(/\[|\]/g, ""));
                        if (!isNaN(date.getTime())) {
                          timeStr = date.toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        } else {
                          // Fallback: parse format [YYYY-MM-DD HH:MM:SS]
                          const match = notif.time.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
                          if (match) {
                            const [datePart, timePart] = match.slice(1);
                            const [hour, minute] = timePart.split(":");
                            timeStr = `${datePart.split("-").reverse().join("/")} ${hour}:${minute}`;
                          }
                        }
                      } catch (e) {
                        timeStr = notif.time;
                      }
                    }
                    return (
                      <ListGroup.Item key={idx} className="d-flex align-items-start">
                        <FaInfoCircle className="me-2 mt-1 text-info" style={{ fontSize: "0.85rem", flexShrink: 0 }} />
                        <div className="flex-grow-1">
                          <div className="small">{notif.message || notif.event}</div>
                          {timeStr && (
                            <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                              {timeStr}
                            </div>
                          )}
                        </div>
                      </ListGroup.Item>
                    );
                  })
                ) : (
                  <ListGroup.Item className="text-muted">
                    No notifications
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="fade-section">
          <Card className="card-lux">
            <Card.Body>
              <h6 className="fw-bold mb-3 d-flex align-items-center">
                <FaHistory className="me-2 text-primary" style={{ fontSize: "1.1rem" }} />
                Business Logs
              </h6>
              <ListGroup variant="flush">
                {businessLogs.length > 0 ? (
                  businessLogs.map((log, idx) => {
                    // Parse time từ format [2025-12-13 17:29:30]
                    let timeStr = "";
                    if (log.time) {
                      try {
                        const date = new Date(log.time.replace(/\[|\]/g, ""));
                        if (!isNaN(date.getTime())) {
                          timeStr = date.toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        } else {
                          // Fallback: parse format [YYYY-MM-DD HH:MM:SS]
                          const match = log.time.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
                          if (match) {
                            const [datePart, timePart] = match.slice(1);
                            const [hour, minute] = timePart.split(":");
                            timeStr = `${datePart.split("-").reverse().join("/")} ${hour}:${minute}`;
                          }
                        }
                      } catch (e) {
                        timeStr = log.time;
                      }
                    }
                    return (
                      <ListGroup.Item key={idx} className="text-danger d-flex align-items-start">
                        <FaExclamationTriangle className="me-2 mt-1" style={{ fontSize: "0.85rem", flexShrink: 0 }} />
                        <div className="flex-grow-1">
                          <div className="small">
                            <span className="fw-semibold">[WARNING]</span> {log.businessMessage}
                          </div>
                          {timeStr && (
                            <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                              {timeStr}
                            </div>
                          )}
                        </div>
                      </ListGroup.Item>
                    );
                  })
                ) : (
                  <ListGroup.Item className="text-muted">
                    No business warnings
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ================= DETAIL PANEL ================= */}
      <OrderDetailPanel
        order={selectedOrder}
        isOpen={showPanel}
        onClose={closePanel}
        onAssign={(order) => {
          // Handle assign shipper - sẽ implement modal sau
          console.log("Assign shipper for order:", order);
          // TODO: Open assign modal
        }}
        userRole={userRole}
      />

      {/* ================= MODAL ASSIGN AGENT ================= */}
      {showAssignAgentModal && (
        <div className="dqn-modal-overlay">
          <div className="dqn-modal">
            <div className="dqn-modal-header" style={{ background: "linear-gradient(135deg, #e53935, #ff5252)" }}>
              <div className="dqn-modal-title">
                <FaUserTie /> Assign Agent
              </div>
              <button
                className="dqn-modal-close"
                onClick={() => {
                  setShowAssignAgentModal(false);
                  setSelectedOrderForAssign(null);
                  setAssignAgentData({ order_id: "", agent_id: "", note: "" });
                  setConfirmAssignAgent(false);
                }}
              >
                ×
              </button>
            </div>

            <div className="dqn-modal-body">
              <Form>
                {/* Order Selector */}
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FaBox className="me-2 text-primary" /> Select Order <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Select 
                    value={assignAgentData.order_id} 
                    onChange={(e) => {
                      const orderId = e.target.value;
                      setAssignAgentData({ ...assignAgentData, order_id: orderId });
                      const order = ordersForAgentAssignment.find(o => String(o.id) === orderId);
                      setSelectedOrderForAssign(order || null);
                    }} 
                    size="lg" 
                    className="luxury-select"
                  >
                    <option value="">-- Select Order --</option>
                    {ordersForAgentAssignment.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.order_code || o.code} - {o.sender_name || "N/A"} → {o.receiver_name || "N/A"} ({o.status === 1 ? "Booked" : o.status === 2 ? "Approved" : "Other"})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Order Summary (Read-only) */}
                {selectedOrderForAssign && <OrderInfoDisplay order={selectedOrderForAssign} iconColor="text-danger" />}

                {/* Agent Selector */}
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FaUserTie className="me-2 text-danger" /> Select Agent <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Select 
                    value={assignAgentData.agent_id} 
                    onChange={(e) => setAssignAgentData({ ...assignAgentData, agent_id: e.target.value })} 
                    size="lg" 
                    className="luxury-select"
                  >
                    <option value="">-- Select Agent --</option>
                    {agentsWithWorkload.map(a => {
                      const workload = a.active_orders_count || 0;
                      const workloadLabel = workload === 0 ? "Available" : workload < 5 ? "Low" : workload < 10 ? "Medium" : "High";
                      return (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.email}) - {workload} active orders ({workloadLabel}) {a.status === "active" ? "✓" : ""}
                        </option>
                      );
                    })}
                  </Form.Select>
                  {assignAgentData.agent_id && (() => {
                    const selected = agentsWithWorkload.find(a => a.id === Number(assignAgentData.agent_id));
                    if (!selected) return null;
                    const workload = selected.active_orders_count || 0;
                    const afterAssign = workload + 1;
                    return (
                      <div className="mt-2 p-2 bg-light rounded">
                        <small className="text-muted d-block mb-1">Estimated Workload:</small>
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
                    placeholder="e.g., Urgent order - process today, VIP customer..." 
                    value={assignAgentData.note} 
                    onChange={(e) => setAssignAgentData({ ...assignAgentData, note: e.target.value })} 
                    className="luxury-textarea" 
                  />
                </Form.Group>

                {/* Confirmation Block */}
                <div className="mb-3 p-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded">
                  <div className="d-flex align-items-start mb-2">
                    <FaExclamationTriangle className="me-2 text-danger mt-1" />
                    <div className="flex-grow-1">
                      <strong className="d-block mb-1">Warning</strong>
                      <small className="text-muted">This action will assign the order to the selected agent.</small>
                    </div>
                  </div>
                  <Form.Check
                    type="checkbox"
                    id="confirm-assign-agent"
                    label="I confirm this assignment"
                    checked={confirmAssignAgent}
                    onChange={(e) => setConfirmAssignAgent(e.target.checked)}
                    className="mt-2"
                  />
                </div>
              </Form>
            </div>

            <div className="dqn-modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowAssignAgentModal(false);
                  setSelectedOrderForAssign(null);
                  setAssignAgentData({ order_id: "", agent_id: "", note: "" });
                  setConfirmAssignAgent(false);
                }} 
                className="btn-lux-outline-secondary"
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={handleAssignAgentSubmit} 
                disabled={!assignAgentData.order_id || !assignAgentData.agent_id || !confirmAssignAgent} 
                className="btn-lux-primary-red"
              >
                <FaUserTie className="me-2" /> Confirm Assignment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ASSIGN SHIPPER ================= */}
      {showAssignShipperModal && (
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
                {/* Order Selector */}
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FaBox className="me-2 text-primary" /> Select Order <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Select 
                    value={assignShipperData.order_id} 
                    onChange={(e) => {
                      const orderId = e.target.value;
                      setAssignShipperData({ ...assignShipperData, order_id: orderId });
                      const order = ordersForShipperAssignment.find(o => String(o.id) === orderId);
                      setSelectedOrderForAssign(order || null);
                    }} 
                    size="lg" 
                    className="luxury-select"
                  >
                    <option value="">-- Select Order (Approved orders only) --</option>
                    {ordersForShipperAssignment.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.order_code || o.code} - {o.sender_name || "N/A"} → {o.receiver_name || "N/A"}
                      </option>
                    ))}
                  </Form.Select>
                  {ordersForShipperAssignment.length === 0 && (
                    <Form.Text className="text-warning d-block mt-1">
                      No approved orders available for shipper assignment.
                    </Form.Text>
                  )}
                </Form.Group>

                {/* Order Summary (Read-only) */}
                {selectedOrderForAssign && <OrderInfoDisplay order={selectedOrderForAssign} iconColor="text-warning" />}

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
                      const workloadColor = workload === 0 ? "text-success" : workload < 5 ? "text-info" : workload < 10 ? "text-warning" : "text-danger";
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email}) - {workload} active orders ({workloadLabel}) ✓
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
                disabled={!assignShipperData.order_id || !assignShipperData.shipper_id || !confirmAssignShipper} 
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
