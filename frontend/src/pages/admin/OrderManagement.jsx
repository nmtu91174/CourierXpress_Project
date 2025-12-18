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
import hanoiData from "../../data/hanoi.json";

const WEIGHT_THRESHOLD = 1.0;
const DISTANCE_THRESHOLD = 0.0;
const SERVICE_SURCHARGE_FEE_ID = 6;

export default function OrderManagement() {
  const API_BASE = "http://localhost:8888/api/admin";
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [shippers, setShippers] = useState([]);
  const [userRole, setUserRole] = useState("admin");
  
  // Additional data for order creation
  const [categories, setCategories] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [fees, setFees] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

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
    sender_name: "", sender_phone: "", 
    fromStreet: "", fromWard: "", fromDistrict: "",
    receiver_name: "", receiver_phone: "", receiver_email: "",
    toStreet: "", toWard: "", toDistrict: "",
    item_name: "", category_id: "", weight: 1, length: 10, width: 10, height: 10,
    service_type: 1, cod_amount: 0, payment_method_id: 1,
    distance_km: "", note: ""
  });
  const [distanceKm, setDistanceKm] = useState(null);
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

  const fetchCategories = async () => {
    try {
      const res = await fetch("http://localhost:8888/get_item_categories.php");
      if (res.ok) {
        const data = await res.json();
        setCategories(data || []);
      }
    } catch (error) {
      console.error("Lỗi tải categories:", error);
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const res = await fetch("http://localhost:8888/get_service_types.php");
      if (res.ok) {
        const data = await res.json();
        setServiceTypes(data || []);
      }
    } catch (error) {
      console.error("Lỗi tải service types:", error);
    }
  };

  const fetchFees = async () => {
    try {
      const res = await fetch("http://localhost:8888/get_fees.php");
      if (res.ok) {
        const data = await res.json();
        setFees(data || []);
      }
    } catch (error) {
      console.error("Lỗi tải fees:", error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch("http://localhost:8888/get_payment_methods.php");
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(data || []);
      }
    } catch (error) {
      console.error("Lỗi tải payment methods:", error);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setUserRole(user.role || "admin");
    fetchOrders();
    fetchAgents();
    fetchShippers();
    fetchKPIStats();
    fetchCategories();
    fetchServiceTypes();
    fetchFees();
    fetchPaymentMethods();
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

  // Calculate fees function (from OrderNoAccount.js)
  const calculateFees = useMemo(() => {
    const data = createData;
    const distance = distanceKm || data.distance_km || 0;
    let total_shipping_fee = 0;
    const fees_detail = [];
    const weight = parseFloat(data.weight) || 0;
    const cod_amount = parseFloat(data.cod_amount) || 0;
    const service_type = parseInt(data.service_type) || 1;

    // Get fee types
    const baseFee = fees.find(f => f.type === 'base');
    const distanceFee = fees.find(f => f.code === 'distance_fee');
    const weightFee = fees.find(f => f.type === 'weight');
    const insuranceFee = fees.find(f => f.type === 'insurance');
    const FEE_PER_EXTRA_KM = distanceFee ? parseFloat(distanceFee.amount) : 0;
    const WEIGHT_FEE_PER_KG = weightFee ? parseFloat(weightFee.amount) : 0;
    const INSURANCE_FEE_AMOUNT = insuranceFee ? parseFloat(insuranceFee.amount) : 0;

    // 1. Base fee
    if (baseFee) {
      const currentBaseFee = parseFloat(baseFee.amount);
      total_shipping_fee += currentBaseFee;
      fees_detail.push({ id: baseFee.id, code: baseFee.code, name: baseFee.name, amount: currentBaseFee });
    }

    // 2. Weight fee
    if (weightFee && weight > WEIGHT_THRESHOLD) {
      const extraKg = Math.ceil(weight - WEIGHT_THRESHOLD);
      const extraWeightFee = extraKg * WEIGHT_FEE_PER_KG;
      if (extraWeightFee > 0) {
        total_shipping_fee += extraWeightFee;
        fees_detail.push({ id: weightFee.id, code: weightFee.code, name: weightFee.name, amount: extraWeightFee });
      }
    }

    // 3. Insurance fee
    if (insuranceFee && cod_amount > 500000) {
      if (INSURANCE_FEE_AMOUNT > 0) {
        total_shipping_fee += INSURANCE_FEE_AMOUNT;
        fees_detail.push({ id: insuranceFee.id, code: insuranceFee.code, name: insuranceFee.name, amount: INSURANCE_FEE_AMOUNT });
      }
    }

    // 4. Distance fee
    if (distance && distanceFee) {
      const km = parseFloat(distance);
      if (km > DISTANCE_THRESHOLD) {
        const extraKm = Math.ceil(km - DISTANCE_THRESHOLD);
        const extraDistanceFee = extraKm * FEE_PER_EXTRA_KM;
        if (extraDistanceFee > 0) {
          total_shipping_fee += extraDistanceFee;
          fees_detail.push({ id: distanceFee.id, code: distanceFee.code, name: `Phụ phí Khoảng cách (${extraKm}km phụ trội)`, amount: extraDistanceFee });
        }
      }
    }

    // 5. Service fee
    const selectedService = serviceTypes.find(s => s.id === service_type);
    if (selectedService) {
      const serviceFee = parseFloat(selectedService.fee) || 0;
      if (serviceFee > 0) {
        total_shipping_fee += serviceFee;
        fees_detail.push({ id: SERVICE_SURCHARGE_FEE_ID, code: 'service_surcharge', name: `Phụ phí Dịch vụ (${selectedService.name})`, amount: serviceFee });
      }
    }

    const total_amount_with_cod = total_shipping_fee + cod_amount;

    // COD fee (not added to shipping fee)
    const codFee = fees.find(f => f.type === 'cod');
    if (codFee && cod_amount > 0) {
      fees_detail.push({ id: codFee.id, code: codFee.code, name: codFee.name, amount: cod_amount });
    }

    return { fees_detail, total_shipping_fee, total_amount_with_cod, cod_amount };
  }, [createData, distanceKm, fees, serviceTypes]);

  // Handlers
  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateData(prev => ({
      ...prev,
      [name]: (['weight', 'length', 'width', 'height', 'cod_amount', 'service_type', 'payment_method_id', 'category_id'].includes(name))
        ? (name === 'service_type' || name === 'payment_method_id' || name === 'category_id' ? parseInt(value) || 0 : parseFloat(value) || 0)
        : value
    }));
  };

  const handleDistrictChange = (e, type) => {
    const { value } = e.target;
    setDistanceKm(null);
    if (type === 'from') {
      setCreateData(prev => ({ ...prev, fromDistrict: value, fromWard: '' }));
    } else {
      setCreateData(prev => ({ ...prev, toDistrict: value, toWard: '' }));
    }
  };

  const handleWardChange = (e, type) => {
    const { value } = e.target;
    setDistanceKm(null);
    if (type === 'from') {
      setCreateData(prev => ({ ...prev, fromWard: value }));
    } else {
      setCreateData(prev => ({ ...prev, toWard: value }));
    }
  };
  
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
    // Validation - Kiểm tra tất cả trường bắt buộc
    const missingFields = [];
    
    if (!createData.sender_name || createData.sender_name.trim() === "") missingFields.push("Tên người gửi");
    if (!createData.sender_phone || createData.sender_phone.trim() === "") missingFields.push("Số điện thoại người gửi");
    if (!createData.fromStreet || createData.fromStreet.trim() === "") missingFields.push("Số nhà, Tên đường (người gửi)");
    if (!createData.fromDistrict || createData.fromDistrict.trim() === "") missingFields.push("Quận/Huyện (người gửi)");
    
    if (!createData.receiver_name || createData.receiver_name.trim() === "") missingFields.push("Tên người nhận");
    if (!createData.receiver_phone || createData.receiver_phone.trim() === "") missingFields.push("Số điện thoại người nhận");
    if (!createData.toStreet || createData.toStreet.trim() === "") missingFields.push("Số nhà, Tên đường (người nhận)");
    if (!createData.toDistrict || createData.toDistrict.trim() === "") missingFields.push("Quận/Huyện (người nhận)");
    
    if (!createData.category_id || createData.category_id === "" || createData.category_id === 0) missingFields.push("Loại hàng hóa");
    if (!createData.weight || createData.weight === 0 || createData.weight === "") missingFields.push("Trọng lượng");
    if (!createData.length || createData.length === 0 || createData.length === "") missingFields.push("Chiều dài");
    if (!createData.width || createData.width === 0 || createData.width === "") missingFields.push("Chiều rộng");
    if (!createData.height || createData.height === 0 || createData.height === "") missingFields.push("Chiều cao");
    
    if (missingFields.length > 0) {
      return Swal.fire({
        icon: "error",
        title: "Thiếu thông tin bắt buộc",
        html: `Vui lòng nhập đầy đủ các trường sau:<br><strong>${missingFields.join(", ")}</strong>`,
      });
    }

    try {
      const formData = new FormData();
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      formData.append("customer_id", user.id || 6);
      
      // Address fields
      formData.append('sender_address', `${createData.fromStreet}, ${createData.fromWard || ''}, ${createData.fromDistrict}, Hà Nội`);
      formData.append('receiver_address', `${createData.toStreet}, ${createData.toWard || ''}, ${createData.toDistrict}, Hà Nội`);
      
      // Basic fields
      formData.append('sender_name', createData.sender_name);
      formData.append('sender_phone', createData.sender_phone);
      formData.append('receiver_name', createData.receiver_name);
      formData.append('receiver_phone', createData.receiver_phone);
      formData.append('receiver_email', createData.receiver_email || '');
      formData.append('item_name', createData.item_name || '');
      formData.append('category_id', createData.category_id);
      formData.append('weight', createData.weight);
      formData.append('length', createData.length);
      formData.append('width', createData.width);
      formData.append('height', createData.height);
      formData.append('service_type_id', createData.service_type);
      formData.append('payment_method_id', createData.payment_method_id);
      formData.append('cod_amount', createData.cod_amount || 0);
      formData.append('note', createData.note || '');
      
      // Distance and fees - Backend yêu cầu distance_km không được empty
      const finalDistance = distanceKm || createData.distance_km || "";
      // Đảm bảo distance_km luôn có giá trị (ít nhất là "0" nếu không nhập)
      formData.append('distance_km', finalDistance !== "" && finalDistance !== null ? finalDistance.toString() : "0");
      formData.append('total_shipping_fee', calculateFees.total_shipping_fee.toString());
      formData.append('total_amount_with_cod', calculateFees.total_amount_with_cod.toString());

      // Fee details
      calculateFees.fees_detail.forEach(f => {
        if (f.id !== null && f.amount > 0 && f.code !== 'cod') {
          formData.append('fee_ids[]', f.id.toString());
          formData.append('fee_amounts[]', f.amount.toString());
        }
      });

      // Images
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
        resetCreateModal();
        fetchOrders();
        fetchKPIStats();
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
    setCreateData({
      sender_name: "", sender_phone: "",
      fromStreet: "", fromWard: "", fromDistrict: "",
      receiver_name: "", receiver_phone: "", receiver_email: "",
      toStreet: "", toWard: "", toDistrict: "",
      item_name: "", category_id: "", weight: 1, length: 10, width: 10, height: 10,
      service_type: 1, cod_amount: 0, payment_method_id: 1,
      distance_km: "", note: ""
    });
    setProductImages([]);
    setDistanceKm(null);
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

{showCreateModal && (
  <div className="dqn-modal-overlay">

    <div className="dqn-modal">

      {/* ================= HEADER ================= */}
      <div className="dqn-modal-header">
        <div className="dqn-modal-title">
          <FaPlus /> Tạo Vận Đơn Mới
        </div>

        <button
          className="dqn-modal-close"
          onClick={() => {
            setShowCreateModal(false);
            resetCreateModal();
          }}
        >
          ×
        </button>
      </div>

      {/* ================= BODY (SCROLL) ================= */}
      <div className="dqn-modal-body luxury-create-body">
        <Form>
      <Row className="mb-3">
        <Col md={6}>
          <div className="luxury-section-header mb-2">
            <h6 className="fw-bold d-flex align-items-center text-primary mb-0">
              <FaUser className="me-2" /> Người Gửi
            </h6>
          </div>

          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Tên người gửi (*)</Form.Label>
            <Form.Control
              name="sender_name"
              placeholder="Nhập tên người gửi"
              className="luxury-input"
              value={createData.sender_name}
              onChange={handleCreateChange}
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Số điện thoại (*)</Form.Label>
            <Form.Control
              name="sender_phone"
              placeholder="Nhập số điện thoại"
              className="luxury-input"
              value={createData.sender_phone}
              onChange={handleCreateChange}
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Số nhà, Tên đường (*)</Form.Label>
            <Form.Control
              name="fromStreet"
              placeholder="Số nhà, Tên đường"
              className="luxury-input"
              value={createData.fromStreet}
              onChange={handleCreateChange}
            />
          </Form.Group>

          <Row className="mb-2">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small text-muted">Quận/Huyện (*)</Form.Label>
                <Form.Select
                  name="fromDistrict"
                  value={createData.fromDistrict}
                  onChange={(e) => handleDistrictChange(e, "from")}
                  className="luxury-select"
                >
                  <option value="">-- Chọn Quận/Huyện --</option>
                  {Object.keys(hanoiData).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="small text-muted">Phường/Xã</Form.Label>
                <Form.Select
                  name="fromWard"
                  value={createData.fromWard}
                  onChange={(e) => handleWardChange(e, "from")}
                  disabled={!createData.fromDistrict}
                  className="luxury-select"
                >
                  <option value="">-- Chọn Phường/Xã --</option>
                  {createData.fromDistrict &&
                    hanoiData[createData.fromDistrict]?.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Col>

        <Col md={6}>
          <div className="luxury-section-header mb-2">
            <h6 className="fw-bold d-flex align-items-center text-success mb-0">
              <FaUser className="me-2" /> Người Nhận
            </h6>
          </div>

          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Tên người nhận (*)</Form.Label>
            <Form.Control
              name="receiver_name"
              placeholder="Nhập tên người nhận"
              className="luxury-input"
              value={createData.receiver_name}
              onChange={handleCreateChange}
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Số điện thoại (*)</Form.Label>
            <Form.Control
              name="receiver_phone"
              placeholder="Nhập số điện thoại"
              className="luxury-input"
              value={createData.receiver_phone}
              onChange={handleCreateChange}
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Email</Form.Label>
            <Form.Control
              type="email"
              name="receiver_email"
              placeholder="Email người nhận"
              className="luxury-input"
              value={createData.receiver_email}
              onChange={handleCreateChange}
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Số nhà, Tên đường (*)</Form.Label>
            <Form.Control
              name="toStreet"
              placeholder="Số nhà, Tên đường"
              className="luxury-input"
              value={createData.toStreet}
              onChange={handleCreateChange}
            />
          </Form.Group>

          <Row className="mb-2">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small text-muted">Quận/Huyện (*)</Form.Label>
                <Form.Select
                  name="toDistrict"
                  value={createData.toDistrict}
                  onChange={(e) => handleDistrictChange(e, "to")}
                  className="luxury-select"
                >
                  <option value="">-- Chọn Quận/Huyện --</option>
                  {Object.keys(hanoiData).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="small text-muted">Phường/Xã</Form.Label>
                <Form.Select
                  name="toWard"
                  value={createData.toWard}
                  onChange={(e) => handleWardChange(e, "to")}
                  disabled={!createData.toDistrict}
                  className="luxury-select"
                >
                  <option value="">-- Chọn Phường/Xã --</option>
                  {createData.toDistrict &&
                    hanoiData[createData.toDistrict]?.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Col>
      </Row>

      <div className="luxury-section-header mb-2">
        <h6 className="fw-bold d-flex align-items-center mb-0">
          <FaBox className="me-2 text-primary" /> Thông tin Hàng hóa
        </h6>
      </div>

      <Row className="mb-3">
        <Col md={12}>
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Tên hàng hóa</Form.Label>
            <Form.Control
              name="item_name"
              placeholder="Nhập tên hàng hóa (ví dụ: Quần áo, Điện thoại, Sách...)"
              className="luxury-input"
              value={createData.item_name}
              onChange={handleCreateChange}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Loại hàng hóa (*)</Form.Label>
            <Form.Select
              name="category_id"
              value={createData.category_id}
              onChange={handleCreateChange}
              className="luxury-select"
            >
              <option value="">-- Chọn loại hàng hóa --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={4}>
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Trọng lượng (kg) (*)</Form.Label>
            <Form.Control
              type="number"
              name="weight"
              step="0.1"
              min="0.1"
              className="luxury-input"
              value={createData.weight}
              onChange={handleCreateChange}
            />
          </Form.Group>
        </Col>

        <Col md={4}>
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Khoảng cách (km)</Form.Label>
            <Form.Control
              type="number"
              name="distance_km"
              step="0.1"
              min="0"
              className="luxury-input"
              value={distanceKm !== null && distanceKm !== "" ? distanceKm : (createData.distance_km || "")}
              onChange={(e) => {
                const val = e.target.value;
                setDistanceKm(val === "" ? null : val);
              }}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Chiều dài (cm) (*)</Form.Label>
            <Form.Control
              type="number"
              name="length"
              step="1"
              min="1"
              className="luxury-input"
              value={createData.length}
              onChange={handleCreateChange}
            />
          </Form.Group>
        </Col>

        <Col md={4}>
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Chiều rộng (cm) (*)</Form.Label>
            <Form.Control
              type="number"
              name="width"
              step="1"
              min="1"
              className="luxury-input"
              value={createData.width}
              onChange={handleCreateChange}
            />
          </Form.Group>
        </Col>

        <Col md={4}>
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Chiều cao (cm) (*)</Form.Label>
            <Form.Control
              type="number"
              name="height"
              step="1"
              min="1"
              className="luxury-input"
              value={createData.height}
              onChange={handleCreateChange}
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={6}>
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Loại dịch vụ (*)</Form.Label>
            <Form.Select
              name="service_type"
              value={createData.service_type}
              onChange={handleCreateChange}
              className="luxury-select"
            >
              {serviceTypes.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({Number(service.fee).toLocaleString()} VNĐ)
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Phương thức thanh toán (*)</Form.Label>
            <Form.Select
              name="payment_method_id"
              value={createData.payment_method_id}
              onChange={handleCreateChange}
              className="luxury-select"
            >
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>{method.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={6}>
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Tiền thu hộ (COD) - VNĐ</Form.Label>
            <Form.Control
              type="number"
              name="cod_amount"
              step="1000"
              min="0"
              className="luxury-input"
              value={createData.cod_amount}
              onChange={handleCreateChange}
            />
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group className="mb-2">
            <Form.Label className="small text-muted">Ghi chú</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="note"
              placeholder="Ghi chú cho đơn hàng"
              className="luxury-input"
              value={createData.note}
              onChange={handleCreateChange}
            />
          </Form.Group>
        </Col>
      </Row>

      {/* Fee Calculation Display */}
      <div className="luxury-section-header mb-2">
        <h6 className="fw-bold d-flex align-items-center mb-0">
          <FaMoneyBillWave className="me-2 text-success" /> Chi Tiết Phí
        </h6>
      </div>

      <div
        className="mb-3 p-3"
        style={{
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
        }}
      >
        {calculateFees.fees_detail.map((fee, idx) => (
          <div key={idx} className="d-flex justify-content-between mb-1 small">
            <span>{fee.name}:</span>
            <strong>{Number(fee.amount).toLocaleString("vi-VN")} VNĐ</strong>
          </div>
        ))}

        <hr className="my-2" />

        <div className="d-flex justify-content-between fw-bold text-primary">
          <span>Tổng phí vận chuyển:</span>
          <strong>{Number(calculateFees.total_shipping_fee).toLocaleString("vi-VN")} VNĐ</strong>
        </div>

        {calculateFees.cod_amount > 0 && (
          <>
            <div className="d-flex justify-content-between mt-2">
              <span>Tiền thu hộ (COD):</span>
              <strong className="text-success">
                {Number(calculateFees.cod_amount).toLocaleString("vi-VN")} VNĐ
              </strong>
            </div>

            <div
              className="d-flex justify-content-between mt-2 fw-bold"
              style={{ fontSize: "1.1em", color: "#28a745" }}
            >
              <span>Tổng tiền cần thanh toán:</span>
              <strong>
                {Number(calculateFees.total_amount_with_cod).toLocaleString("vi-VN")} VNĐ
              </strong>
            </div>
          </>
        )}
      </div>

      <div className="luxury-section-header mb-2">
        <h6 className="fw-bold d-flex align-items-center mb-0">
          <FaImage className="me-2 text-primary" /> Ảnh sản phẩm
          <span className="text-muted small fw-normal ms-2">
            ({productImages.length}/5 ảnh)
          </span>
        </h6>
      </div>

      <Row className="mb-2">
        <Col md={12}>
          <Form.Control
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            multiple={true}
            onChange={handleImageChange}
            className="luxury-input mb-2"
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
              <div className="d-flex flex-wrap gap-2">
                {productImages.map((file, index) => (
                  <div
                    key={index}
                    className="luxury-image-item position-relative"
                    style={{ width: "80px", height: "80px" }}
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="luxury-preview-img"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "4px",
                      }}
                    />
                    <button
                      type="button"
                      className="luxury-image-remove btn btn-sm btn-danger position-absolute"
                      style={{
                        top: "-5px",
                        right: "-5px",
                        width: "20px",
                        height: "20px",
                        padding: 0,
                        fontSize: "12px",
                      }}
                      onClick={() => removeImage(index)}
                      title="Xóa ảnh"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            resetCreateModal();
          }}
        >
          Hủy
        </Button>

        <Button
          variant="primary"
          className="btn-lux-primary-blue"
          onClick={handleCreateSubmit}
        >
          <FaPlus className="me-2" /> Tạo Vận Đơn
        </Button>
      </div>

    </div>
  </div>
)}



      {/* MODAL EDIT - DQN LUXURY */}
      {showEditModal && (
        <div className="dqn-modal-overlay">
          <div className="dqn-modal">
            {/* ================= HEADER ================= */}
            <div className="dqn-modal-header" style={{ background: "linear-gradient(135deg, #6c757d, #adb5bd)" }}>
              <div className="dqn-modal-title">
                <FaEdit /> Cập nhật Đơn hàng
              </div>
              <button
                className="dqn-modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            {/* ================= BODY (SCROLL) ================= */}
            <div className="dqn-modal-body">
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FaMapMarkerAlt className="me-2 text-primary" /> Địa chỉ người nhận
                  </Form.Label>
                  <Form.Control 
                    name="receiver_address" 
                    value={editData.receiver_address} 
                    onChange={handleEditChange} 
                    placeholder="Nhập địa chỉ người nhận" 
                    className="luxury-input" 
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FaBox className="me-2 text-primary" /> Trạng thái
                  </Form.Label>
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
            </div>

            {/* ================= FOOTER ================= */}
            <div className="dqn-modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => setShowEditModal(false)} 
                className="btn-lux-outline-secondary"
              >
                Hủy
              </Button>
              <Button 
                variant="primary" 
                onClick={handleUpdateSubmit} 
                className="btn-lux-primary-blue"
              >
                Cập nhật
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASSIGN SHIPPER - DQN LUXURY */}
      {showAssignModal && (
        <div className="dqn-modal-overlay">
          <div className="dqn-modal">
            {/* ================= HEADER ================= */}
            <div className="dqn-modal-header" style={{ background: "linear-gradient(135deg, #ffc107, #ffde59)" }}>
              <div className="dqn-modal-title">
                <FaShippingFast /> Phân công Shipper
              </div>
              <button
                className="dqn-modal-close"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOrderForShipper(null);
                }}
              >
                ×
              </button>
            </div>

            {/* ================= BODY (SCROLL) ================= */}
            <div className="dqn-modal-body">
              <Form>
                {selectedOrderForShipper && <OrderInfoDisplay order={selectedOrderForShipper} iconColor="text-warning" />}
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FaShippingFast className="me-2 text-warning" /> Chọn Shipper <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Select 
                    value={assignData.shipper_id} 
                    onChange={(e) => setAssignData({ ...assignData, shipper_id: e.target.value })} 
                    size="lg" 
                    className="luxury-select"
                  >
                    <option value="">-- Chọn Shipper --</option>
                    {shippers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email}) {s.status === "active" ? "✓" : ""}</option>)}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">
                    Ghi chú phân công <span className="text-muted small fw-normal">(Tùy chọn)</span>
                  </Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    placeholder="Ví dụ: Đơn gấp – giao trong hôm nay, Khách VIP..." 
                    value={assignData.note} 
                    onChange={(e) => setAssignData({ ...assignData, note: e.target.value })} 
                    className="luxury-textarea" 
                  />
                </Form.Group>
              </Form>
            </div>

            {/* ================= FOOTER ================= */}
            <div className="dqn-modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOrderForShipper(null);
                }} 
                className="btn-lux-outline-secondary"
              >
                Hủy
              </Button>
              <Button 
                variant="warning" 
                onClick={handleAssignSubmit} 
                disabled={!assignData.shipper_id} 
                className="btn-lux-primary-yellow"
              >
                <FaShippingFast className="me-2" /> Xác nhận Phân công
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASSIGN AGENT - DQN LUXURY */}
      {showAssignAgentModal && (
        <div className="dqn-modal-overlay">
          <div className="dqn-modal">
            {/* ================= HEADER ================= */}
            <div className="dqn-modal-header" style={{ background: "linear-gradient(135deg, #e53935, #ff5252)" }}>
              <div className="dqn-modal-title">
                <FaUserTie /> Phân công Agent
              </div>
              <button
                className="dqn-modal-close"
                onClick={() => {
                  setShowAssignAgentModal(false);
                  setSelectedOrderForAgent(null);
                }}
              >
                ×
              </button>
            </div>

            {/* ================= BODY (SCROLL) ================= */}
            <div className="dqn-modal-body">
              <Form>
                {selectedOrderForAgent && <OrderInfoDisplay order={selectedOrderForAgent} iconColor="text-danger" />}
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FaUserTie className="me-2 text-danger" /> Chọn Agent <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Select 
                    value={assignAgentData.agent_id} 
                    onChange={(e) => setAssignAgentData({ ...assignAgentData, agent_id: e.target.value })} 
                    size="lg" 
                    className="luxury-select"
                  >
                    <option value="">-- Chọn Agent --</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.email}) {a.status === "active" ? "✓" : ""}</option>)}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">
                    Ghi chú phân công <span className="text-muted small fw-normal">(Tùy chọn)</span>
                  </Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    placeholder="Ví dụ: Đơn gấp – xử lý trong hôm nay, Khách VIP..." 
                    value={assignAgentData.note} 
                    onChange={(e) => setAssignAgentData({ ...assignAgentData, note: e.target.value })} 
                    className="luxury-textarea" 
                  />
                </Form.Group>
              </Form>
            </div>

            {/* ================= FOOTER ================= */}
            <div className="dqn-modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowAssignAgentModal(false);
                  setSelectedOrderForAgent(null);
                }} 
                className="btn-lux-outline-secondary"
              >
                Hủy
              </Button>
              <Button 
                variant="danger" 
                onClick={handleAssignAgentSubmit} 
                disabled={!assignAgentData.agent_id} 
                className="btn-lux-primary-red"
              >
                <FaUserTie className="me-2" /> Xác nhận Phân công
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
