// frontend/src/pages/admin/Dashboard.jsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";

import {
  Card,
  Row,
  Col,
  ListGroup,
} from "react-bootstrap";

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
} from "react-icons/fa";

import { initPageAnimations } from "../../utils/gsapAnimations";

// ⭐ 3 COMPONENT TÁCH RIÊNG
import OrderFilterBar from "../../components/orders/OrderFilterBar";
import OrderTable from "../../components/orders/OrderTable";
import OrderDetailPanel from "../../components/orders/OrderDetailPanel";
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
useEffect(() => {
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
        const failed = data.filter(o => Number(o.status) === 6).length; // Status 6 = Failed (thay vì cancelled status 7)

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
        setCancelRate(total ? Math.round((failed / total) * 100) + "%" : "0%");
      } else {
        setLoadingOrders(false);
      }
    } catch (err) {
      console.error("Lỗi load orders:", err);
      setLoadingOrders(false);
    }
  };

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
                const roleDisplay = role === "admin" ? "Admin" : role === "agent" ? "Đại lý" : role === "shipper" ? "Shipper" : "Người dùng";
                
                // Map action thành message thân thiện với format mới
                let message = "";
                switch (action) {
                  case "CREATE_ORDER":
                    message = orderCode ? `${roleDisplay} đã tạo đơn hàng #${orderCode}` : `${roleDisplay} đã tạo đơn hàng`;
                    break;
                  case "UPDATE_STATUS":
                    message = orderCode ? `${roleDisplay} đã cập nhật trạng thái đơn hàng #${orderCode}` : `${roleDisplay} đã cập nhật trạng thái đơn hàng`;
                    break;
                  case "ASSIGN_AGENT":
                    const agentMatch = note.match(/agent=(\d+)/);
                    if (agentMatch) {
                      const agentId = parseInt(agentMatch[1]);
                      const agent = agents.find(a => a.id === agentId);
                      const agentName = agent ? agent.name : `Agent #${agentId}`;
                      message = orderCode ? `${roleDisplay} đã phân công đại lý ${agentName} cho đơn hàng #${orderCode}` : `${roleDisplay} đã phân công đại lý ${agentName}`;
                    } else {
                      message = orderCode ? `${roleDisplay} đã phân công đại lý cho đơn hàng #${orderCode}` : `${roleDisplay} đã phân công đại lý`;
                    }
                    break;
                  case "ASSIGN_SHIPPER":
                    const shipperMatch = note.match(/shipper=(\d+)/);
                    if (shipperMatch) {
                      const shipperId = parseInt(shipperMatch[1]);
                      const shipper = shippers.find(s => s.id === shipperId);
                      const shipperName = shipper ? shipper.name : `Shipper #${shipperId}`;
                      message = orderCode ? `${roleDisplay} đã phân công shipper ${shipperName} cho đơn hàng #${orderCode}` : `${roleDisplay} đã phân công shipper ${shipperName}`;
                    } else {
                      message = orderCode ? `${roleDisplay} đã phân công shipper cho đơn hàng #${orderCode}` : `${roleDisplay} đã phân công shipper`;
                    }
                    break;
                  case "DELETE_ORDER":
                    message = orderCode ? `${roleDisplay} đã xóa đơn hàng #${orderCode}` : `${roleDisplay} đã xóa đơn hàng`;
                    break;
                  case "LOGIN":
                    message = `${roleDisplay} đã đăng nhập`;
                    break;
                  case "REGISTER":
                    message = `${roleDisplay} đã tạo tài khoản`;
                    break;
                  case "RESET_PASSWORD":
                    message = `${roleDisplay} đã reset mật khẩu`;
                    break;
                  case "UPDATE_USER":
                    message = `${roleDisplay} đã cập nhật thông tin người dùng`;
                    break;
                  case "CONFIRM_PICKUP":
                    message = orderCode ? `Shipper đã xác nhận lấy hàng đơn #${orderCode}` : "Shipper đã xác nhận lấy hàng";
                    break;
                  case "CONFIRM_DELIVERY":
                    message = orderCode ? `Shipper đã giao hàng thành công đơn #${orderCode}` : "Shipper đã giao hàng thành công";
                    break;
                  default:
                    message = note || action || "Hành động hệ thống";
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
      return "Hệ thống chưa sẵn sàng xử lý đơn. Vui lòng liên hệ quản trị viên để cấu hình phí vận chuyển.";
    }
    if (msg.includes("không thể phân công") || msg.includes("assign")) {
      return "Không thể phân công shipper. Vui lòng kiểm tra lại trạng thái đơn hàng.";
    }
    if (msg.includes("foreign key") || msg.includes("constraint")) {
      return "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin đơn hàng.";
    }
    if (msg.includes("không tồn tại") || msg.includes("not found")) {
      return "Không tìm thấy dữ liệu yêu cầu. Vui lòng thử lại.";
    }
    if (msg.includes("không có quyền") || msg.includes("permission")) {
      return "Bạn không có quyền thực hiện thao tác này.";
    }
    if (msg.includes("đã tồn tại") || msg.includes("already exists")) {
      return "Dữ liệu đã tồn tại trong hệ thống.";
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
    legend: { bottom: 0 },
    series: [
      {
        name: "Trạng thái",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
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
    xAxis: { type: "category", data: last7Days.labels },
    yAxis: { type: "value" },
    series: [
      {
        name: "Đơn theo ngày",
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
                  <p className="m-0 opacity-75 small">Tổng đơn (năm)</p>
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
                  <p className="m-0 opacity-75 small">Tổng doanh thu (ước tính)</p>
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
                  <p className="m-0 opacity-75 small">Tỷ lệ giao thành công</p>
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
                  <p className="m-0 opacity-75 small">Tỷ lệ huỷ</p>
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
          <h5 className="fw-bold mb-3">Tác vụ nhanh</h5>

          <div className="d-flex gap-3 flex-wrap">
            <Link
              to="/admin/orders"
              state={{ action: "create" }}
              className="quick-action btn btn-sm btn-lux-primary-blue btn-hover-scale"
            >
              <FaClipboardList className="me-2" /> Tạo vận đơn
            </Link>

            <Link
              to="/admin/orders"
              state={{ action: "assign_agent" }}
              className="quick-action btn btn-sm btn-lux-primary-red btn-hover-scale"
            >
              <FaUserTie className="me-2" /> Phân công agent
            </Link>

            <Link
              to="/admin/orders"
              state={{ action: "assign" }}
              className="quick-action btn btn-sm btn-lux-primary-yellow btn-hover-scale"
            >
              <FaShippingFast className="me-2" /> Phân công shipper
            </Link>

            <Link
              to="/admin/reports"
              className="quick-action btn btn-sm btn-lux-primary-green btn-hover-scale"
            >
              <FaChartBar className="me-2" /> Xem báo cáo
            </Link>
          </div>
        </Card.Body>
      </Card>

            {/* ================= CHARTS ================= */}
      <Row className="g-4 mb-4">
        <Col md={6} className="chart-wrapper">
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-3">Tỷ lệ trạng thái đơn hàng</h6>
            <div style={{ height: 288 }}>
              <ReactECharts
                option={optionOrderStatusPie}
                style={{ height: "100%" }}
                echarts={echarts}
              />
            </div>
          </Card>
        </Col>

        <Col md={6} className="chart-wrapper">
          <Card className="card-lux p-3">
            <h6 className="fw-bold mb-3">7 ngày gần nhất</h6>
            <div style={{ height: 288 }}>
              <ReactECharts
                option={optionOrders7Days}
                style={{ height: "100%" }}
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
                Thông báo gần đây
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
                    Chưa có thông báo
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
                Nhật ký nghiệp vụ
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
                            <span className="fw-semibold">[CẢNH BÁO]</span> {log.businessMessage}
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
                    Không có cảnh báo nghiệp vụ
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
    </div>
  );
}
