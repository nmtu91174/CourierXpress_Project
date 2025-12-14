// frontend/src/pages/admin/OrderManagement.jsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Card, Button, Row, Col, Modal, Form } from "react-bootstrap";
import { FaPlus, FaBox, FaShippingFast, FaCheckCircle, FaExclamationTriangle, FaUserTie, FaInfoCircle, FaMapMarkerAlt, FaMoneyBillWave, FaCreditCard, FaCalendarAlt, FaUser, FaPhone, FaWeight, FaRoute, FaImage, FaTag, FaEdit } from "react-icons/fa";
import Swal from "sweetalert2";
import "../../assets/styles/order.css";
import "../../assets/styles/dashboard.css";
import OrderTable from "../../components/orders/OrderTable";
import OrderFilterBar from "../../components/orders/OrderFilterBar";
import OrderDetailPanel from "../../components/orders/OrderDetailPanel";
import StatusBadge from "../../components/common/StatusBadge";
import { getStatusesInGroup } from "../../constants/orderStatusGroups";
import { initPageAnimations } from "../../utils/gsapAnimations";

export default function OrderManagement() {
  const API_BASE = "http://localhost:8888/api/admin";
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [shippers, setShippers] = useState([]);
  const [userRole, setUserRole] = useState("admin");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAssignAgentModal, setShowAssignAgentModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderForShipper, setSelectedOrderForShipper] = useState(null);
  const [selectedOrderForAgent, setSelectedOrderForAgent] = useState(null);

  // Filter states
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStatusGroup, setFilterStatusGroup] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterShipper, setFilterShipper] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [filterCOD, setFilterCOD] = useState("all");
  const [filterNoAgent, setFilterNoAgent] = useState(false);
  const [filterNoShipper, setFilterNoShipper] = useState(false);
  const [filterAssignedNotPicked, setFilterAssignedNotPicked] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchText, setSearchText] = useState("");

  // Form data
  const [createData, setCreateData] = useState({
    sender_name: "", sender_phone: "", sender_address: "",
    receiver_name: "", receiver_phone: "", receiver_address: "",
    item_name: "", weight: "", distance_km: "", payment_method_id: "1"
  });
  const [productImages, setProductImages] = useState([]);
  const [editData, setEditData] = useState({ order_id: "", receiver_address: "", status: 1 });
  const [assignData, setAssignData] = useState({ order_id: "", shipper_id: "", note: "" });
  const [assignAgentData, setAssignAgentData] = useState({ order_id: "", agent_id: "", note: "" });

  // KPI states
  const [kpiStats, setKpiStats] = useState({
    total_orders: 0,
    in_transit: 0,
    delivered: 0,
    failed: 0,
  });

  // Fetch KPI stats
  const fetchKPIStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/get_order_stats.php`, {
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

  // Fetch data
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/get_orders.php?page=1&limit=100`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.status === "success") {
        const ordersList = data.data?.items || data.data || [];
        setOrders(ordersList);
      }
    } catch (error) {
      console.error("Lỗi tải đơn:", error);
      Swal.fire("Lỗi", "Không thể tải danh sách đơn hàng", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(`http://localhost:8888/api/users/get_agents.php`, { method: "GET", credentials: "include" });
      const data = await res.json();
      if (data.status === "success") setAgents(data.data || []);
    } catch (error) {
      console.error("Lỗi tải agents:", error);
    }
  };

  const fetchShippers = async () => {
    try {
      const res = await fetch(`http://localhost:8888/api/users/get_shippers.php`, { method: "GET", credentials: "include" });
      const data = await res.json();
      if (data.status === "success") setShippers(data.data || []);
    } catch (error) {
      console.error("Lỗi tải shippers:", error);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "admin");
    fetchOrders();
    fetchAgents();
    fetchShippers();
    fetchKPIStats();
  }, []);

  // GSAP Animation
  useEffect(() => {
    return initPageAnimations({ kpiSelector: ".kpi-item" });
  }, []);

  // Filter logic - FIXED: Apply all filters
  useEffect(() => {
    let filtered = [...orders];

    // Status group filter
    if (filterStatusGroup !== "all") {
      const statusesInGroup = getStatusesInGroup(filterStatusGroup);
      if (statusesInGroup.length > 0) {
        filtered = filtered.filter((o) => statusesInGroup.includes(Number(o.status)));
      }
    }

    // Specific status filter (if not using group)
    if (filterStatusGroup === "all" && filterStatus !== "all") {
      filtered = filtered.filter((o) => Number(o.status) === Number(filterStatus));
    }

    // Agent filter
    if (filterBranch !== "all") {
      filtered = filtered.filter((o) => Number(o.agent_id) === Number(filterBranch));
    }

    // Shipper filter
    if (filterShipper !== "all") {
      filtered = filtered.filter((o) => Number(o.shipper_id) === Number(filterShipper));
    }

    // Payment method filter
    if (filterPayment !== "all") {
      filtered = filtered.filter((o) => Number(o.payment_method_id) === Number(filterPayment));
    }

    // Workflow filters
    if (filterNoAgent) {
      filtered = filtered.filter((o) => !o.agent_id || Number(o.agent_id) === 0);
    }
    if (filterNoShipper) {
      filtered = filtered.filter((o) => !o.shipper_id || Number(o.shipper_id) === 0);
    }
    if (filterAssignedNotPicked) {
      filtered = filtered.filter((o) => Number(o.status) === 3);
    }

    // Finance filters
    if (filterCOD === "has_cod") {
      filtered = filtered.filter((o) => o.cod_amount && Number(o.cod_amount) > 0);
    } else if (filterCOD === "no_cod") {
      filtered = filtered.filter((o) => !o.cod_amount || Number(o.cod_amount) <= 0);
    }
    // Note: filterPaymentStatus requires backend join with invoices table, handled in backend

    // Date range filter
    if (filterDateFrom) {
      filtered = filtered.filter((o) => {
        const orderDate = new Date(o.created_at);
        return orderDate >= new Date(filterDateFrom);
      });
    }
    if (filterDateTo) {
      filtered = filtered.filter((o) => {
        const orderDate = new Date(o.created_at);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59);
        return orderDate <= toDate;
      });
    }

    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((o) =>
          (o.order_code || "").toLowerCase().includes(searchLower) ||
          (o.sender_name || "").toLowerCase().includes(searchLower) ||
          (o.receiver_name || "").toLowerCase().includes(searchLower) ||
          (o.sender_phone || "").includes(searchText) ||
          (o.receiver_phone || "").includes(searchText)
      );
    }

    setFilteredOrders(filtered);
  }, [orders, filterStatus, filterStatusGroup, filterBranch, filterShipper, filterPayment, filterPaymentStatus, filterCOD, filterNoAgent, filterNoShipper, filterAssignedNotPicked, filterDateFrom, filterDateTo, searchText]);

  // Handlers
  const handleCreateChange = (e) => setCreateData({ ...createData, [e.target.name]: e.target.value });
  
  const handleImageChange = (e) => {
    const input = e.target;
    if (!input || !input.files || input.files.length === 0) {
      return;
    }

    // Convert FileList to Array - this ensures multiple files are captured
    const newFiles = Array.from(input.files);
    
    console.log('Selected files count:', newFiles.length); // Debug log
    
    // Security: Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    // Check total file count (existing + new)
    const totalFiles = productImages.length + newFiles.length;
    if (totalFiles > 5) {
      Swal.fire({
        icon: "error",
        title: "Quá nhiều ảnh",
        html: `Tối đa 5 ảnh. Bạn đã có ${productImages.length} ảnh, chỉ có thể thêm ${5 - productImages.length} ảnh nữa.`,
      });
      input.value = ''; // Reset input
      return;
    }

    // Validate each new file
    const validFiles = [];
    const invalidFiles = [];

    newFiles.forEach((file) => {
      // Check if file already exists (by name and size to prevent duplicates)
      const isDuplicate = productImages.some(
        existingFile => existingFile.name === file.name && existingFile.size === file.size
      );
      
      if (isDuplicate) {
        invalidFiles.push(`${file.name} (đã được chọn)`);
        return;
      }

      // Check MIME type
      const isValidMime = allowedTypes.includes(file.type);
      
      // Check file extension (double security)
      const fileName = file.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      // Check file size (max 5MB per file)
      const maxSize = 5 * 1024 * 1024; // 5MB
      const isValidSize = file.size <= maxSize;

      if (isValidMime && hasValidExtension && isValidSize) {
        validFiles.push(file);
      } else {
        let reason = [];
        if (!isValidMime) reason.push('MIME type không hợp lệ');
        if (!hasValidExtension) reason.push('Định dạng không hợp lệ');
        if (!isValidSize) reason.push('File quá lớn (>5MB)');
        invalidFiles.push(`${file.name} (${reason.join(', ')})`);
      }
    });

    // Show error if any invalid files
    if (invalidFiles.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Một số file không hợp lệ",
        html: `Các file sau không được thêm:<br>${invalidFiles.join('<br>')}<br><br>Chỉ chấp nhận: JPG, PNG, GIF, WEBP (tối đa 5MB/file)`,
      });
    }

    // Append valid files to existing images (not replace)
    if (validFiles.length > 0) {
      setProductImages(prev => [...prev, ...validFiles]);
    }
    
    // Reset input to allow selecting same files again if needed
    // Note: We don't reset if there were invalid files, so user can see the error
    if (invalidFiles.length === 0) {
      input.value = '';
    }
  };
  
  const removeImage = (index) => setProductImages(productImages.filter((_, i) => i !== index));
  
  const handleCreateSubmit = async () => {
    if (!createData.sender_name || !createData.receiver_name) {
      return Swal.fire("Lỗi", "Vui lòng nhập đầy đủ thông tin", "error");
    }
    try {
      const formData = new FormData();
      Object.keys(createData).forEach(key => formData.append(key, createData[key]));
      productImages.forEach(file => formData.append(`images[]`, file));

      const res = await fetch(`${API_BASE}/create_order.php`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorData = JSON.parse(errorText);
          return Swal.fire("Lỗi", errorData.message || `Lỗi server (${res.status})`, "error");
        } catch {
          return Swal.fire("Lỗi", `Lỗi server (${res.status})`, "error");
        }
      }
      
      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Thành công", `Đã tạo đơn: ${data.data?.order_code || "thành công"}`, "success");
        setShowCreateModal(false);
        setCreateData({ sender_name: "", sender_phone: "", sender_address: "", receiver_name: "", receiver_phone: "", receiver_address: "", item_name: "", weight: "", distance_km: "", payment_method_id: "1" });
        setProductImages([]);
        fetchOrders();
      } else {
        Swal.fire("Lỗi", data.message || "Không thể tạo đơn", "error");
      }
    } catch (error) {
      Swal.fire("Lỗi", `Lỗi kết nối server: ${error.message}`, "error");
    }
  };

  const openEditModal = (order) => {
    setEditData({ order_id: order.id, receiver_address: order.receiver_address || order.address || "", status: order.status });
    setShowEditModal(true);
  };
  
  const handleEditChange = (e) => setEditData({ ...editData, [e.target.name]: e.target.value });
  
  const handleUpdateSubmit = async () => {
    try {
      const res = await fetch(`${API_BASE}/update_order.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Đã cập nhật", "", "success");
        setShowEditModal(false);
        fetchOrders();
      } else {
        Swal.fire("Lỗi", data.message || "Không thể cập nhật", "error");
      }
    } catch (error) {
      Swal.fire("Lỗi", "Lỗi kết nối server", "error");
    }
  };

  const handleDelete = async (orderId) => {
    const result = await Swal.fire({
      title: 'Xóa đơn hàng?',
      text: "Hành động này không thể hoàn tác!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Xóa ngay',
      cancelButtonText: 'Hủy'
    });
    
    if (result.isConfirmed) {
      try {
        const res = await fetch(`${API_BASE}/delete_order.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ order_id: orderId }),
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          try {
            const errorData = JSON.parse(errorText);
            return Swal.fire('Lỗi', errorData.message || `Lỗi server (${res.status})`, 'error');
          } catch {
            return Swal.fire('Lỗi', `Lỗi server (${res.status})`, 'error');
          }
        }
        
        const data = await res.json();
        if (data.status === "success") {
          Swal.fire('Đã xóa!', '', 'success');
          fetchOrders();
        } else {
          Swal.fire('Lỗi', data.message || 'Không thể xóa đơn hàng', 'error');
        }
      } catch (error) {
        Swal.fire('Lỗi', `Lỗi kết nối server: ${error.message}`, 'error');
      }
    }
  };

  const openAssignModal = (o) => {
    setSelectedOrderForShipper(o);
    setAssignData({ order_id: o.id, shipper_id: "", note: "" });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async () => {
    if (!assignData.shipper_id) {
      return Swal.fire("Chú ý", "Vui lòng chọn shipper", "warning");
    }
    try {
      const res = await fetch(`${API_BASE}/assign_shipper.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...assignData, note: assignData.note || "Phân công shipper" }),
      });
      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Thành công", "Đã phân công shipper!", "success");
        setShowAssignModal(false);
        setSelectedOrderForShipper(null);
        fetchOrders();
      } else {
        Swal.fire("Lỗi", data.message || "Không thể phân công", "error");
      }
    } catch (error) {
      Swal.fire("Lỗi", "Lỗi kết nối server", "error");
    }
  };

  const openAssignAgentModal = (o) => {
    setSelectedOrderForAgent(o);
    setAssignAgentData({ order_id: o.id, agent_id: "", note: "" });
    setShowAssignAgentModal(true);
  };

  const handleAssignAgentSubmit = async () => {
    if (!assignAgentData.agent_id) {
      return Swal.fire("Chú ý", "Vui lòng chọn agent", "warning");
    }
    try {
      const res = await fetch(`${API_BASE}/assign_agent.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(assignAgentData),
      });
      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Thành công", "Đã phân công agent!", "success");
        setShowAssignAgentModal(false);
        fetchOrders();
      } else {
        Swal.fire("Lỗi", data.message || "Không thể phân công", "error");
      }
    } catch (error) {
      Swal.fire("Lỗi", "Lỗi kết nối server", "error");
    }
  };

  const location = useLocation();
  useEffect(() => {
    if (location.state?.action === "create") {
      setShowCreateModal(true);
      window.history.replaceState({}, document.title);
    }
    if (location.state?.action === "assign" || location.state?.action === "assign_agent") {
      const tableElement = document.querySelector('.lux-table-wrapper');
      if (tableElement) tableElement.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Apply filters from navigation state (drill-down from Agent Management)
    if (location.state?.agent_id) {
      setFilterBranch(location.state.agent_id);
      
      // Priority: specific status > status_group
      if (location.state.status) {
        setFilterStatus(location.state.status);
        setFilterStatusGroup("all"); // Clear status group if specific status is set
      } else if (location.state.status_group) {
        setFilterStatusGroup(location.state.status_group);
        setFilterStatus("all"); // Clear specific status if status group is set
      }
      
      // Clear navigation state after applying filters
      window.history.replaceState({}, document.title);
      
      // Scroll to table
      setTimeout(() => {
        const tableElement = document.querySelector('.lux-table-wrapper');
        if (tableElement) tableElement.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location]);

  const resetFilters = () => {
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
  };

  const resetCreateModal = () => {
    setCreateData({ sender_name: "", sender_phone: "", sender_address: "", receiver_name: "", receiver_phone: "", receiver_address: "", item_name: "", weight: "", distance_km: "", payment_method_id: "1" });
    setProductImages([]);
  };

  // Order info component (reusable)
  const OrderInfoDisplay = ({ order, iconColor = "text-warning" }) => (
    <div className="luxury-order-info mb-4">
      <div className="d-flex align-items-center mb-3">
        <FaInfoCircle className={`me-2 ${iconColor}`} />
        <h6 className="fw-bold mb-0">Thông tin đơn hàng</h6>
      </div>
      <Row className="g-3">
        <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaBox className="me-1" /> Mã đơn hàng</small><div className="fw-bold text-primary">{order.order_code || order.code}</div></div></Col>
        <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaCalendarAlt className="me-1" /> Ngày tạo</small><div className="fw-bold">{new Date(order.created_at).toLocaleString("vi-VN")}</div></div></Col>
        <Col md={6}><div className="luxury-info-item"><small className="text-muted d-block mb-1">Trạng thái</small><StatusBadge status={order.status} /></div></Col>
        <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaMoneyBillWave className="me-1" /> COD</small><div className="fw-bold text-success">{order.cod_amount ? `${Number(order.cod_amount).toLocaleString("vi-VN")} ₫` : "Không có"}</div></div></Col>
        <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaCreditCard className="me-1" /> Phương thức thanh toán</small><div className="fw-bold">{order.payment_method_id === 1 ? "Tiền mặt" : order.payment_method_id === 2 ? "Chuyển khoản" : order.payment_method_id === 3 ? "Ví MoMo" : "Chưa xác định"}</div></div></Col>
        <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaMapMarkerAlt className="me-1" /> Địa chỉ gửi</small><div className="small">{order.sender_address || "-"}</div></div></Col>
        <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaMapMarkerAlt className="me-1" /> Địa chỉ nhận</small><div className="small">{order.receiver_address || "-"}</div></div></Col>
      </Row>
    </div>
  );

  return (
    <div className="admin-page">
      <div className="page-header d-flex justify-content-between mb-4">
        <h3 className="fw-bold">Quản lý Đơn hàng</h3>
        <Button className="btn-lux-primary" onClick={() => setShowCreateModal(true)}>
          <FaPlus className="me-2" /> Tạo vận đơn
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}><Card className="border-0 shadow-sm text-white kpi-item" style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">{kpiStats.total_orders}</h2><small>Tổng đơn</small></div><FaBox className="fs-1 opacity-50" /></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white kpi-item" style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">{kpiStats.in_transit}</h2><small>Đang vận chuyển</small></div><FaShippingFast className="fs-1 opacity-50" /></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white kpi-item" style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">{kpiStats.delivered}</h2><small>Đã giao</small></div><FaCheckCircle className="fs-1 opacity-50" /></Card.Body></Card></Col>
        <Col md={3}><Card className="border-0 shadow-sm text-white kpi-item" style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}><Card.Body className="d-flex justify-content-between align-items-center"><div><h2 className="fw-bold my-1">{kpiStats.failed}</h2><small>Huỷ đơn</small></div><FaExclamationTriangle className="fs-1 opacity-50" /></Card.Body></Card></Col>
      </Row>

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
        onResetFilters={resetFilters}
      />

      <OrderTable
        loading={loading}
        orders={filteredOrders}
        userRole={userRole}
        onRowClick={(order) => { setSelectedOrder(order); setShowDetailPanel(true); }}
        onViewDetail={(order) => { setSelectedOrder(order); setShowDetailPanel(true); }}
        onAssignAgent={openAssignAgentModal}
        onAssignShipper={openAssignModal}
        onEditOrder={openEditModal}
        onDeleteOrder={(order) => handleDelete(order.id)}
      />

      <OrderDetailPanel
        order={selectedOrder}
        isOpen={showDetailPanel}
        userRole={userRole}
        onClose={() => { setShowDetailPanel(false); setSelectedOrder(null); }}
        onAssign={openAssignModal}
      />

      {/* MODAL CREATE */}
      <Modal show={showCreateModal} onHide={() => { setShowCreateModal(false); resetCreateModal(); }} size="lg" className="modal-luxury" centered>
        <Modal.Header closeButton className="luxury-modal-header" style={{ background: "linear-gradient(135deg, #007bff, #35a0ff)", borderBottom: "none" }}>
          <Modal.Title className="text-white d-flex align-items-center"><FaPlus className="me-2" /> Tạo Vận Đơn Mới</Modal.Title>
        </Modal.Header>
        <Modal.Body className="luxury-create-body p-4">
          <Form>
            <Row className="mb-4">
              <Col md={6}>
                <div className="luxury-section-header mb-3">
                  <h6 className="fw-bold d-flex align-items-center text-primary mb-0"><FaUser className="me-2" /> Người Gửi</h6>
                </div>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center"><FaUser className="me-1" style={{ fontSize: "0.75rem" }} /> Tên người gửi</Form.Label>
                  <Form.Control name="sender_name" placeholder="Nhập tên người gửi" className="luxury-input" value={createData.sender_name} onChange={handleCreateChange} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center"><FaPhone className="me-1" style={{ fontSize: "0.75rem" }} /> Số điện thoại</Form.Label>
                  <Form.Control name="sender_phone" placeholder="Nhập số điện thoại" className="luxury-input" value={createData.sender_phone} onChange={handleCreateChange} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center"><FaMapMarkerAlt className="me-1" style={{ fontSize: "0.75rem" }} /> Địa chỉ</Form.Label>
                  <Form.Control name="sender_address" placeholder="Nhập địa chỉ người gửi" className="luxury-input" value={createData.sender_address} onChange={handleCreateChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <div className="luxury-section-header mb-3">
                  <h6 className="fw-bold d-flex align-items-center text-success mb-0"><FaUser className="me-2" /> Người Nhận</h6>
                </div>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center"><FaUser className="me-1" style={{ fontSize: "0.75rem" }} /> Tên người nhận</Form.Label>
                  <Form.Control name="receiver_name" placeholder="Nhập tên người nhận" className="luxury-input" value={createData.receiver_name} onChange={handleCreateChange} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center"><FaPhone className="me-1" style={{ fontSize: "0.75rem" }} /> Số điện thoại</Form.Label>
                  <Form.Control name="receiver_phone" placeholder="Nhập số điện thoại" className="luxury-input" value={createData.receiver_phone} onChange={handleCreateChange} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="small text-muted d-flex align-items-center"><FaMapMarkerAlt className="me-1" style={{ fontSize: "0.75rem" }} /> Địa chỉ</Form.Label>
                  <Form.Control name="receiver_address" placeholder="Nhập địa chỉ người nhận" className="luxury-input" value={createData.receiver_address} onChange={handleCreateChange} />
                </Form.Group>
              </Col>
            </Row>
            <div className="luxury-section-header mb-3">
              <h6 className="fw-bold d-flex align-items-center mb-0"><FaBox className="me-2 text-primary" /> Thông tin Hàng hóa</h6>
            </div>
            <Row className="mb-4">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small text-muted d-flex align-items-center"><FaTag className="me-1" style={{ fontSize: "0.75rem" }} /> Tên hàng hóa</Form.Label>
                  <Form.Control name="item_name" placeholder="Nhập tên hàng hóa" className="luxury-input" value={createData.item_name} onChange={handleCreateChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small text-muted d-flex align-items-center"><FaWeight className="me-1" style={{ fontSize: "0.75rem" }} /> Trọng lượng (kg)</Form.Label>
                  <Form.Control type="number" name="weight" placeholder="0.0" step="0.1" min="0" className="luxury-input" value={createData.weight} onChange={handleCreateChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small text-muted d-flex align-items-center"><FaRoute className="me-1" style={{ fontSize: "0.75rem" }} /> Khoảng cách (km)</Form.Label>
                  <Form.Control type="number" name="distance_km" placeholder="0.0" step="0.1" min="0" className="luxury-input" value={createData.distance_km} onChange={handleCreateChange} />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small text-muted d-flex align-items-center"><FaCreditCard className="me-1" style={{ fontSize: "0.75rem" }} /> Phương thức thanh toán</Form.Label>
                  <Form.Select name="payment_method_id" onChange={handleCreateChange} value={createData.payment_method_id} className="luxury-select">
                  <option value="1">Tiền mặt</option>
                  <option value="2">Chuyển khoản</option>
                  <option value="3">Ví MoMo</option>
                </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <div className="luxury-section-header mb-3">
              <h6 className="fw-bold d-flex align-items-center mb-0">
                <FaImage className="me-2 text-primary" /> Ảnh sản phẩm 
                <span className="text-muted small fw-normal ms-2">
                  ({productImages.length}/5 ảnh)
                </span>
              </h6>
            </div>
            <Row className="mb-3">
              <Col md={12}>
                <Form.Control 
                  type="file" 
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" 
                  multiple={true}
                  onChange={handleImageChange} 
                  className="luxury-input mb-3"
                  style={{ cursor: "pointer" }}
                  disabled={productImages.length >= 5}
                />
                {productImages.length >= 5 && (
                  <Form.Text className="text-warning d-block mb-2">
                    Đã đạt tối đa 5 ảnh. Vui lòng xóa ảnh để thêm ảnh mới.
                  </Form.Text>
                )}
                {productImages.length > 0 && (
                  <div className="luxury-image-preview">
                    <div className="d-flex flex-wrap gap-3">
                      {productImages.map((file, index) => (
                        <div key={index} className="luxury-image-item position-relative">
                          <img src={URL.createObjectURL(file)} alt={`Preview ${index + 1}`} className="luxury-preview-img" />
                          <button type="button" className="luxury-image-remove btn btn-sm btn-danger position-absolute" onClick={() => removeImage(index)} title="Xóa ảnh">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer className="luxury-modal-footer">
          <Button variant="secondary" onClick={() => { setShowCreateModal(false); resetCreateModal(); }} className="btn-lux-outline-secondary">Hủy</Button>
          <Button variant="primary" onClick={handleCreateSubmit} className="btn-lux-primary-blue"><FaPlus className="me-2" /> Tạo Vận Đơn</Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL EDIT - LUXURY */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" className="modal-luxury" centered>
        <Modal.Header closeButton className="luxury-modal-header" style={{ background: "linear-gradient(135deg, #6c757d, #adb5bd)", borderBottom: "none" }}>
          <Modal.Title className="text-white d-flex align-items-center"><FaEdit className="me-2" /> Cập nhật Đơn hàng</Modal.Title>
        </Modal.Header>
        <Modal.Body className="luxury-modal-body p-4">
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold d-flex align-items-center"><FaMapMarkerAlt className="me-2 text-primary" /> Địa chỉ người nhận</Form.Label>
              <Form.Control name="receiver_address" value={editData.receiver_address} onChange={handleEditChange} placeholder="Nhập địa chỉ người nhận" className="luxury-input" />
            </Form.Group>
            <Form.Group>
              <Form.Label className="fw-bold d-flex align-items-center"><FaBox className="me-2 text-primary" /> Trạng thái</Form.Label>
              <Form.Select name="status" value={editData.status} onChange={handleEditChange} className="luxury-select">
                <option value="1">1 - Booked (Đã tạo đơn)</option>
                <option value="2">2 - Approved (Đã duyệt)</option>
                <option value="3">3 - Assigned (Đã phân công shipper)</option>
                <option value="4">4 - Picked Up (Đã lấy hàng)</option>
                <option value="5">5 - Delivered (Giao thành công)</option>
                <option value="6">6 - Failed (Giao thất bại)</option>
              </Form.Select>
              <Form.Text className="text-muted">Lưu ý: Thay đổi trạng thái phải tuân thủ workflow. Admin có thể override.</Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="luxury-modal-footer">
          <Button variant="secondary" onClick={() => setShowEditModal(false)} className="btn-lux-outline-secondary">Hủy</Button>
          <Button variant="primary" onClick={handleUpdateSubmit} className="btn-lux-primary-blue">Cập nhật</Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL ASSIGN SHIPPER */}
      <Modal show={showAssignModal} onHide={() => { setShowAssignModal(false); setSelectedOrderForShipper(null); }} size="lg" className="modal-luxury" centered>
        <Modal.Header closeButton className="luxury-modal-header" style={{ background: "linear-gradient(135deg, #ffc107, #ffde59)", borderBottom: "none" }}>
          <Modal.Title className="text-white d-flex align-items-center"><FaShippingFast className="me-2" /> Phân công Shipper</Modal.Title>
        </Modal.Header>
        <Modal.Body className="luxury-modal-body p-4">
          <Form>
            {selectedOrderForShipper && <OrderInfoDisplay order={selectedOrderForShipper} iconColor="text-warning" />}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold d-flex align-items-center"><FaShippingFast className="me-2 text-warning" /> Chọn Shipper <span className="text-danger ms-1">*</span></Form.Label>
              <Form.Select value={assignData.shipper_id} onChange={(e) => setAssignData({ ...assignData, shipper_id: e.target.value })} size="lg" className="luxury-select">
                <option value="">-- Chọn Shipper --</option>
                {shippers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email}) {s.status === "active" ? "✓" : ""}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Ghi chú phân công <span className="text-muted small fw-normal">(Tùy chọn)</span></Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Ví dụ: Đơn gấp – giao trong hôm nay, Khách VIP..." value={assignData.note} onChange={(e) => setAssignData({ ...assignData, note: e.target.value })} className="luxury-textarea" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="luxury-modal-footer">
          <Button variant="secondary" onClick={() => { setShowAssignModal(false); setSelectedOrderForShipper(null); }} className="btn-lux-outline-secondary">Hủy</Button>
          <Button variant="warning" onClick={handleAssignSubmit} disabled={!assignData.shipper_id} className="btn-lux-primary-yellow"><FaShippingFast className="me-2" /> Xác nhận Phân công</Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL ASSIGN AGENT */}
      <Modal show={showAssignAgentModal} onHide={() => { setShowAssignAgentModal(false); setSelectedOrderForAgent(null); }} size="lg" className="modal-luxury" centered>
        <Modal.Header closeButton className="luxury-modal-header" style={{ background: "linear-gradient(135deg, #e53935, #ff5252)", borderBottom: "none" }}>
          <Modal.Title className="text-white d-flex align-items-center"><FaUserTie className="me-2" /> Phân công Agent</Modal.Title>
        </Modal.Header>
        <Modal.Body className="luxury-modal-body p-4">
          <Form>
            {selectedOrderForAgent && <OrderInfoDisplay order={selectedOrderForAgent} iconColor="text-danger" />}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold d-flex align-items-center"><FaUserTie className="me-2 text-danger" /> Chọn Agent <span className="text-danger ms-1">*</span></Form.Label>
              <Form.Select value={assignAgentData.agent_id} onChange={(e) => setAssignAgentData({ ...assignAgentData, agent_id: e.target.value })} size="lg" className="luxury-select">
                <option value="">-- Chọn Agent --</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.email}) {a.status === "active" ? "✓" : ""}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Ghi chú phân công <span className="text-muted small fw-normal">(Tùy chọn)</span></Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Ví dụ: Đơn gấp – xử lý trong hôm nay, Khách VIP..." value={assignAgentData.note} onChange={(e) => setAssignAgentData({ ...assignAgentData, note: e.target.value })} className="luxury-textarea" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="luxury-modal-footer">
          <Button variant="secondary" onClick={() => { setShowAssignAgentModal(false); setSelectedOrderForAgent(null); }} className="btn-lux-outline-secondary">Hủy</Button>
          <Button variant="danger" onClick={handleAssignAgentSubmit} disabled={!assignAgentData.agent_id} className="btn-lux-primary-red"><FaUserTie className="me-2" /> Xác nhận Phân công</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
