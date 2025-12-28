// frontend/src/pages/admin/OrderManagement.jsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { ORDER_STATUS, ORDER_STATUS_LABEL, isTerminalStatus } from "../../constants/orderStatus";
import { initPageAnimations } from "../../utils/gsapAnimations";
import hanoiData from "../../data/hanoi.json";

const WEIGHT_THRESHOLD = 1000; // 1000 grams = 1kg
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

  // ===================== PAGINATION STATES ===================== new nmtu 9:56 24-12
  // Client-side pagination for filteredOrders
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default: 10 orders per page
  // ===================== END PAGINATION STATES =====================

  // ===================== HIGHLIGHT STATE (for Dashboard redirect) =====================
  const [focusedOrderId, setFocusedOrderId] = useState(null);
  const processedRedirectRef = React.useRef(false); // Use ref to prevent redirect loop without clearing state too early
  // ===================== END HIGHLIGHT STATE =====================

  // Form data
  const [createData, setCreateData] = useState({
    sender_name: "", sender_phone: "",
    fromStreet: "", fromWard: "", fromDistrict: "",
    receiver_name: "", receiver_phone: "", receiver_email: "",
    toStreet: "", toWard: "", toDistrict: "",
    item_name: "", category_id: "", weight: 500, length: 10, width: 10, height: 10, // weight default 500 grams
    service_type: 1, cod_amount: 0, payment_method_id: 1, payer_type: 1, // payer_type: 1 = Người gửi trả, 2 = Người nhận trả
    distance_km: "", note: ""
  });
  const [distanceKm, setDistanceKm] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [editData, setEditData] = useState({ order_id: "", receiver_address: "", status: 1, original_status: 1 });
  const [assignData, setAssignData] = useState({ order_id: "", shipper_id: "", note: "" });
  const [assignAgentData, setAssignAgentData] = useState({ order_id: "", agent_id: "", note: "" });
  const [confirmAssignShipper, setConfirmAssignShipper] = useState(false);
  const [confirmAssignAgent, setConfirmAssignAgent] = useState(false);

  // KPI states
  const [kpiStats, setKpiStats] = useState({
    total_orders: 0,
    in_transit: 0,
    delivered: 0,
    failed: 0,
    cancelled: 0,
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
      // Fetch all orders (high limit to get all orders for OrderManagement)
      const res = await fetch(`${API_BASE}/get_orders.php?page=1&limit=10000`, {
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
      Swal.fire("Error", "Cannot load orders", "error");
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

    // RESET pagination when filters/search change - new nmtu 9:56 24-12
    // Prevents empty table when current page exceeds total pages
    setCurrentPage(1); // <-- ADDED
    //------------

  }, [orders, filterStatus, filterStatusGroup, filterBranch, filterShipper, filterPayment, filterPaymentStatus, filterCOD, filterNoAgent, filterNoShipper, filterAssignedNotPicked, filterDateFrom, filterDateTo, searchText]);

  //new nmtu 9:56 24-12
  // ===================== PAGINATED ORDERS =====================
  // Calculate orders for current page AFTER filtering
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage, pageSize]);

  // Total pages for pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  // ===================== END PAGINATED ORDERS =====================

  // ===================== CALCULATE WORKLOAD FOR AGENTS & SHIPPERS =====================
  // Calculate workload from ALL orders (same logic as Dashboard)
  const agentsWithWorkload = useMemo(() => {
    return agents.map(agent => {
      const activeOrders = orders.filter(o => 
        Number(o.agent_id) === Number(agent.id) && 
        [1, 2, 3, 4].includes(Number(o.status)) // Non-terminal statuses
      ).length;
      return { ...agent, active_orders_count: activeOrders };
    });
  }, [agents, orders]);

  const shippersWithWorkload = useMemo(() => {
    return shippers.map(shipper => {
      const activeOrders = orders.filter(o => 
        Number(o.shipper_id) === Number(shipper.id) && 
        [1, 2, 3, 4].includes(Number(o.status)) // Non-terminal statuses
      ).length;
      return { ...shipper, active_orders_count: activeOrders };
    });
  }, [shippers, orders]);
  // ===================== END CALCULATE WORKLOAD =====================

  // Calculate distance automatically from addresses (same as OrderNoAccount.js)
  const calculateDistanceFromAddresses = useCallback(async () => {
    const { fromStreet, fromWard, fromDistrict, toStreet, toWard, toDistrict } = createData;
    
    if (!fromStreet || !fromWard || !fromDistrict || !toStreet || !toWard || !toDistrict) {
      return null;
    }

    const API_KEY = "9aed6a93b4d540e6b3b740a688d9921e";
    
    try {
      // Geocode from address
      const fromParts = [fromStreet.trim(), fromWard.trim(), fromDistrict.trim(), "Hà Nội", "Vietnam"];
      const fromFull = fromParts.join(", ");
      const fromUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(fromFull)}&filter=countrycode:vn&format=json&apiKey=${API_KEY}`;
      
      const fromRes = await fetch(fromUrl);
      if (!fromRes.ok) throw new Error("Geoapify geocode error");
      const fromData = await fromRes.json();
      if (!fromData.results || fromData.results.length === 0) throw new Error("From address not found");
      
      const fromSelected = fromData.results.find(r => {
        const txt = ((r.formatted || "") + " " + (r.city || "")).toLowerCase();
        return txt.includes("hà nội") || txt.includes("ha noi");
      }) || fromData.results[0];
      
      const fromLat = Number(fromSelected.lat);
      const fromLon = Number(fromSelected.lon);
      if (!fromLat || !fromLon) throw new Error("Cannot get from coordinates");

      // Geocode to address
      const toParts = [toStreet.trim(), toWard.trim(), toDistrict.trim(), "Hà Nội", "Vietnam"];
      const toFull = toParts.join(", ");
      const toUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(toFull)}&filter=countrycode:vn&format=json&apiKey=${API_KEY}`;
      
      const toRes = await fetch(toUrl);
      if (!toRes.ok) throw new Error("Geoapify geocode error");
      const toData = await toRes.json();
      if (!toData.results || toData.results.length === 0) throw new Error("To address not found");
      
      const toSelected = toData.results.find(r => {
        const txt = ((r.formatted || "") + " " + (r.city || "")).toLowerCase();
        return txt.includes("hà nội") || txt.includes("ha noi");
      }) || toData.results[0];
      
      const toLat = Number(toSelected.lat);
      const toLon = Number(toSelected.lon);
      if (!toLat || !toLon) throw new Error("Cannot get to coordinates");

      // Get route distance
      const routeUrl = `https://api.geoapify.com/v1/routing?waypoints=${fromLat},${fromLon}|${toLat},${toLon}&mode=drive&apiKey=${API_KEY}`;
      const routeRes = await fetch(routeUrl);
      if (!routeRes.ok) throw new Error("Geoapify routing error");
      const routeData = await routeRes.json();
      
      if (!routeData.features || routeData.features.length === 0) throw new Error("Cannot find route");
      const props = routeData.features[0].properties;
      if (!props || typeof props.distance !== "number") throw new Error("Invalid routing result");
      
      const km = props.distance / 1000; // Convert meters to km
      return parseFloat(km.toFixed(2));
    } catch (err) {
      console.error("Distance calculation error:", err);
      return null;
    }
  }, [createData]);

  // Auto-calculate distance when addresses are complete
  useEffect(() => {
    if (createData.fromStreet && createData.fromWard && createData.fromDistrict &&
        createData.toStreet && createData.toWard && createData.toDistrict &&
        !distanceKm) {
      calculateDistanceFromAddresses().then(km => {
        if (km && km > 0) {
          setDistanceKm(km.toString());
        }
      }).catch(err => {
        console.error("Auto-calculate distance failed:", err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createData.fromStreet, createData.fromWard, createData.fromDistrict,
      createData.toStreet, createData.toWard, createData.toDistrict]);

  // Calculate fees function (from OrderNoAccount.js)
  const calculateFees = useMemo(() => {
    const data = createData;
    // Use distanceKm if available, otherwise 0 (backend will calculate)
    const distance = distanceKm ? parseFloat(distanceKm) : 0;
    let total_shipping_fee = 0;
    const fees_detail = [];
    // Weight is now in GRAMS (INT) instead of KG (FLOAT)
    const weight = parseInt(data.weight) || 0; // Weight in grams
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

    // 1. Base Shipping Fee - Always included
    if (baseFee) {
      const currentBaseFee = parseFloat(baseFee.amount);
      total_shipping_fee += currentBaseFee;
      fees_detail.push({ id: baseFee.id, code: baseFee.code, name: "Base Shipping Fee", amount: currentBaseFee });
    }

    // 2. Weight Surcharge (weight is in grams, threshold is 1000g = 1kg)
    if (weightFee && weight > WEIGHT_THRESHOLD) {
      const extraGrams = weight - WEIGHT_THRESHOLD;
      const extraKg = Math.ceil(extraGrams / 1000); // Convert grams to kg (rounded up)
      const extraWeightFee = extraKg * WEIGHT_FEE_PER_KG;
      if (extraWeightFee > 0) {
        total_shipping_fee += extraWeightFee;
        fees_detail.push({ id: weightFee.id, code: weightFee.code, name: `Weight Surcharge (${extraKg}kg extra)`, amount: extraWeightFee });
      }
    }

    // 3. Insurance Fee
    if (insuranceFee && cod_amount > 500000) {
      if (INSURANCE_FEE_AMOUNT > 0) {
        total_shipping_fee += INSURANCE_FEE_AMOUNT;
        fees_detail.push({ id: insuranceFee.id, code: insuranceFee.code, name: "Insurance Fee", amount: INSURANCE_FEE_AMOUNT });
      }
    }

    // 4. Distance Surcharge - Calculate extra km beyond threshold
    if (distance && distanceFee && distance > 0) {
      const km = parseFloat(distance);
      if (!isNaN(km) && km > DISTANCE_THRESHOLD) {
        // Calculate extra km (rounded up to nearest integer)
        const extraKm = Math.ceil(km - DISTANCE_THRESHOLD);
        const extraDistanceFee = extraKm * FEE_PER_EXTRA_KM;
        if (extraDistanceFee > 0) {
          total_shipping_fee += extraDistanceFee;
          fees_detail.push({ 
            id: distanceFee.id, 
            code: distanceFee.code, 
            name: `Distance Surcharge (${extraKm}km extra)`, 
            amount: extraDistanceFee 
          });
        }
      }
    }

    // 5. Service Fee - ALWAYS calculate if service_type is selected
    if (service_type && serviceTypes.length > 0) {
      // Convert both to numbers for comparison to avoid type mismatch
      const selectedService = serviceTypes.find(s => Number(s.id) === Number(service_type));
      if (selectedService && selectedService.fee) {
        const serviceFee = parseFloat(selectedService.fee) || 0;
        // Always add service fee (even if 0, to show in details)
        total_shipping_fee += serviceFee;
        fees_detail.push({
          id: SERVICE_SURCHARGE_FEE_ID,
          code: 'service_surcharge',
          name: `Service Fee (${selectedService.name || 'Service Type'})`,
          amount: serviceFee
        });
      }
    }

    // Total Shipping Fee = Sum of all shipping fees above
    // COD Amount is calculated AFTER shipping fee is finalized

    // 6. COD Amount (Collected from Receiver) - This is the amount to collect, NOT a fee
    // COD Amount is displayed separately and added to final total
    // Note: COD Amount is NOT a shipping fee, it's the collected amount from receiver
    let codAmount = parseFloat(cod_amount) || 0;
    
    // COD Amount is always shown in fee breakdown (even if 0)
    // But we don't add it to fees_detail as a "fee" - it's shown separately in UI

    // Final Total = Total Shipping Fee + COD Amount
    const total_amount_with_cod = total_shipping_fee + codAmount;

    return { fees_detail, total_shipping_fee, total_amount_with_cod, cod_amount: codAmount };
  }, [createData, distanceKm, fees, serviceTypes]);

  // Handlers
  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    
    // Reset distance when address fields change
    if (['fromStreet', 'fromWard', 'fromDistrict', 'toStreet', 'toWard', 'toDistrict'].includes(name)) {
      setDistanceKm(null);
    }
    
    // Handle payer_type change - auto-set payment method for receiver
    if (name === 'payer_type') {
      const newPayerType = parseInt(value) || 1;
      setCreateData(prev => ({
        ...prev,
        payer_type: newPayerType,
        // Receiver pays: force Cash (ID = 1) and auto-enable COD
        payment_method_id: newPayerType === 2 ? 1 : prev.payment_method_id,
        // Auto-enable COD when receiver pays (keep existing value or set to 0 for user to enter)
        cod_amount: newPayerType === 2 ? (prev.cod_amount || 0) : prev.cod_amount
      }));
      return;
    }
    
    setCreateData(prev => ({
      ...prev,
      [name]: (['weight', 'length', 'width', 'height', 'cod_amount', 'service_type', 'payment_method_id', 'category_id', 'payer_type'].includes(name))
        ? (name === 'service_type' || name === 'payment_method_id' || name === 'category_id' || name === 'payer_type'
          ? parseInt(value) || (name === 'payer_type' ? 1 : 0)
          : name === 'weight'
            ? parseInt(value) || 0 // weight is now INT (grams)
            : parseFloat(value) || 0)
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
        invalidFiles.push(`${file.name} (already selected)`);
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
        html: `The following files cannot be added:<br>${invalidFiles.join('<br>')}<br><br>Only accept: JPG, PNG, GIF, WEBP (max 5MB/file)`,
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
    if (!createData.fromStreet || createData.fromStreet.trim() === "") missingFields.push("Street Address (Sender)");
    if (!createData.fromDistrict || createData.fromDistrict.trim() === "") missingFields.push("District (Sender)");

    if (!createData.receiver_name || createData.receiver_name.trim() === "") missingFields.push("Receiver Name");
    if (!createData.receiver_phone || createData.receiver_phone.trim() === "") missingFields.push("Receiver Phone");
    if (!createData.toStreet || createData.toStreet.trim() === "") missingFields.push("Street Address (Receiver)");
    if (!createData.toDistrict || createData.toDistrict.trim() === "") missingFields.push("District (Receiver)");

    if (!createData.category_id || createData.category_id === "" || createData.category_id === 0) missingFields.push("Item Category");
    if (!createData.weight || createData.weight === 0 || createData.weight === "") missingFields.push("Weight (grams)");
    if (!createData.length || createData.length === 0 || createData.length === "") missingFields.push("Length");
    if (!createData.width || createData.width === 0 || createData.width === "") missingFields.push("Width");
    if (!createData.height || createData.height === 0 || createData.height === "") missingFields.push("Height");

    if (missingFields.length > 0) {
      return Swal.fire({
        icon: "error",
        title: "Missing Required Fields",
        html: `Please fill in the following fields:<br><strong>${missingFields.join(", ")}</strong>`,
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
      // Weight is in grams (INT) - ensure it's an integer
      formData.append('weight', Math.round(parseFloat(createData.weight) || 0));
      formData.append('length', createData.length);
      formData.append('width', createData.width);
      formData.append('height', createData.height);
      formData.append('service_type_id', createData.service_type);
      formData.append('payment_method_id', createData.payment_method_id);
      formData.append('payer_type', createData.payer_type || 1); // 1 = Người gửi trả, 2 = Người nhận trả
      formData.append('cod_amount', createData.cod_amount || 0);
      formData.append('note', createData.note || '');

      // Get district_id and ward_id for auto-routing (same as OrderNoAccount.js)
      let pickupDistrictId = null;
      let pickupWardId = null;
      try {
        const districtWardRes = await fetch("http://localhost:8888/api/tracking/get_district_ward_ids.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            district_name: createData.fromDistrict,
            ward_name: createData.fromWard || ""
          })
        });
        if (districtWardRes.ok) {
          const districtWardData = await districtWardRes.json();
          if (districtWardData.status === "success") {
            pickupDistrictId = districtWardData.data.district_id;
            pickupWardId = districtWardData.data.ward_id;
          }
        }
      } catch (err) {
        console.warn("Could not get district/ward IDs:", err);
        // Continue without IDs - backend will handle fallback
      }

      // Add district/ward IDs for auto-routing
      if (pickupDistrictId) {
        formData.append('pickup_district_id', pickupDistrictId.toString());
      }
      if (pickupWardId) {
        formData.append('pickup_ward_id', pickupWardId.toString());
      }

      // Distance will be calculated automatically by backend (same as createorder.php)
      // Do NOT send distance_km - backend will calculate from addresses if not provided
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

        // Refresh orders list first, then reset pagination to page 1
        await fetchOrders();
        
        // Reset pagination to page 1 to show new order at the top
        // Set after fetchOrders completes to ensure orders are loaded
        setCurrentPage(1);
        
        fetchKPIStats();

        // If detail panel is open, fetch updated order detail
        if (showDetailPanel && selectedOrder && data.data?.order_id) {
          try {
            const detailRes = await fetch(`${API_BASE}/get_order_detail.php?order_id=${data.data.order_id}`, {
              method: "GET",
              credentials: "include",
            });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.status === "success" && detailData.data) {
                setSelectedOrder(detailData.data);
              }
            }
          } catch (error) {
            console.error("Error fetching order detail:", error);
          }
        }
      } else {
        Swal.fire("Error", data.message || "Cannot create order", "error");
      }
    } catch (error) {
      Swal.fire("Error", `Server connection error: ${error.message}`, "error");
    }
  };

  // Get available status options for edit modal
  // Enterprise Option A: Allows next status, previous status (rollback 1 step), or Failed
  const getAvailableStatuses = (currentStatus) => {
    const status = Number(currentStatus);
    const options = [];

    // If terminal status, return empty (should not be editable)
    if (isTerminalStatus(status)) {
      return options; // Terminal states cannot be changed
    }

    // Enterprise workflow mapping (correct status progression):
    // BOOKED (1) → APPROVED (2) → ASSIGNED (3) → IN_PROGRESS (4) → DELIVERED (5)
    // Get next status in workflow
    const nextStatus = status + 1;

    // Add next status (if exists and not terminal)
    // Note: ASSIGNED (3) → IN_PROGRESS (4) is correct workflow
    // Label "Picked Up" is correct for status 4 (IN_PROGRESS)
    if (nextStatus <= ORDER_STATUS.DELIVERED) {
      const statusLabel = ORDER_STATUS_LABEL[nextStatus] || "Unknown";
      options.push({
        value: nextStatus,
        label: `${nextStatus} - ${statusLabel}${status === ORDER_STATUS.ASSIGNED && nextStatus === ORDER_STATUS.IN_PROGRESS ? " (Shipper must confirm pickup)" : ""}`
      });
    }

    // Enterprise: Allow rollback 1 step (Option A)
    // Only allow rollback if current status > BOOKED (status 1)
    if (status > ORDER_STATUS.BOOKED) {
      const previousStatus = status - 1;
      options.push({
        value: previousStatus,
        label: `${previousStatus} - ${ORDER_STATUS_LABEL[previousStatus] || "Unknown"} (Rollback)`
      });
    }

    // Always add Failed option (can be selected from any non-terminal status)
    options.push({
      value: ORDER_STATUS.FAILED,
      label: `${ORDER_STATUS.FAILED} - ${ORDER_STATUS_LABEL[ORDER_STATUS.FAILED]}`
    });

    return options;
  };

  const openEditModal = (order) => {
    const currentStatus = Number(order.status);
    // Get next status as default (or Failed if terminal/at last step)
    let defaultStatus = currentStatus;
    const availableStatuses = getAvailableStatuses(currentStatus);
    if (availableStatuses.length > 0) {
      // Default to next status (first option), or Failed if no next status
      defaultStatus = availableStatuses[0].value;
    }

    setEditData({
      order_id: order.id,
      receiver_address: order.receiver_address || order.address || "",
      status: defaultStatus,
      original_status: currentStatus // Store original status for dropdown logic
    });
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
        Swal.fire("Updated", "", "success");
        setShowEditModal(false);
        fetchOrders();
      } else {
        Swal.fire("Error", data.message || "Cannot update", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Server connection error", "error");
    }
  };

  // Enterprise: Cancel Order (Soft Cancel) - replaces Delete
  const handleCancel = async (order) => {
    const { value: cancelReason } = await Swal.fire({
      title: 'Cancel Order?',
      html: `
        <p>This will mark the order as <strong>Cancelled</strong>.</p>
        <p class="text-muted small">Note: Soft-cancelled orders (before assignment) can be reopened later.</p>
        <input id="cancel-reason" class="swal2-input" placeholder="Cancel reason (optional)">
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Cancel Order',
      cancelButtonText: 'Keep Order',
      preConfirm: () => {
        return document.getElementById('cancel-reason')?.value || 'Order cancelled by admin';
      }
    });

    if (cancelReason !== undefined) {
      try {
        const res = await fetch(`${API_BASE}/cancel_order.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            order_id: order.id,
            cancel_reason: cancelReason
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          try {
            const errorData = JSON.parse(errorText);
            return Swal.fire('Error', errorData.message || `Server error (${res.status})`, 'error');
          } catch {
            return Swal.fire('Error', `Server error (${res.status})`, 'error');
          }
        }

        const data = await res.json();
        if (data.status === "success") {
          const cancelType = data.data?.cancel_type || 'soft';
          Swal.fire({
            icon: 'success',
            title: 'Order Cancelled',
            text: 'Order cancelled successfully. You can clone or create a follow-up order if needed.',
          });
          fetchOrders();
          fetchKPIStats();
        } else {
          Swal.fire('Error', data.message || 'Cannot cancel order', 'error');
        }
      } catch (error) {
        Swal.fire('Error', `Server connection error: ${error.message}`, 'error');
      }
    }
  };

  // Enterprise: Terminate Workflow (Internal Close) - separates from Business Cancellation
  // Allowed from ASSIGNED (3) onward, used to enable clone/follow-up
  const handleTerminateWorkflow = async (order) => {
    const { value: terminationReason } = await Swal.fire({
      title: 'Terminate Workflow?',
      html: `
        <p>This will <strong>terminate the workflow</strong> (internal close) for this order.</p>
        <p class="text-muted small"><strong>Enterprise Rule:</strong> Workflow Termination is separate from Business Cancellation. This action is only available for ASSIGNED or IN_PROGRESS orders. After termination, you can create a Clone (if ASSIGNED) or Follow-up (if IN_PROGRESS) order.</p>
        <p class="text-warning small"><strong>Note:</strong> This action cannot be undone. The order will be marked as CANCELLED but with workflow termination context (not business cancellation).</p>
        <input id="termination-reason" class="swal2-input" placeholder="Termination reason (required)" required>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6c757d',
      confirmButtonText: 'Terminate Workflow',
      cancelButtonText: 'Keep Active',
      preConfirm: () => {
        const reason = document.getElementById('termination-reason')?.value;
        if (!reason || reason.trim() === '') {
          Swal.showValidationMessage('Please provide a termination reason');
          return false;
        }
        return reason;
      }
    });

    if (terminationReason !== undefined) {
      try {
        const res = await fetch(`${API_BASE}/terminate_workflow.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            order_id: order.id,
            termination_reason: terminationReason
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          try {
            const errorData = JSON.parse(errorText);
            return Swal.fire('Error', errorData.message || `Server error (${res.status})`, 'error');
          } catch {
            return Swal.fire('Error', `Server error (${res.status})`, 'error');
          }
        }

        const data = await res.json();
        if (data.status === "success") {
          const canClone = data.data?.can_clone || false;
          const canCreateFollowup = data.data?.can_create_followup || false;

          let followupMessage = 'Workflow terminated successfully.';
          if (canClone) {
            followupMessage += ' You can now clone this order to restart from scratch.';
          } else if (canCreateFollowup) {
            followupMessage += ' You can now create a follow-up order to continue the shipment.';
          }

          Swal.fire({
            icon: 'success',
            title: 'Workflow Terminated',
            text: followupMessage,
          });
          fetchOrders();
          fetchKPIStats();

          // If detail panel is open for this order, fetch updated order detail
          if (showDetailPanel && selectedOrder && selectedOrder.id === order.id) {
            try {
              const detailRes = await fetch(`${API_BASE}/get_order_detail.php?order_id=${order.id}`, {
                method: "GET",
                credentials: "include",
              });
              if (detailRes.ok) {
                const detailData = await detailRes.json();
                if (detailData.status === "success" && detailData.data) {
                  setSelectedOrder(detailData.data);
                }
              }
            } catch (error) {
              console.error("Error fetching order detail:", error);
            }
          }
        } else {
          Swal.fire('Error', data.message || 'Cannot terminate workflow', 'error');
        }
      } catch (error) {
        Swal.fire('Error', `Server connection error: ${error.message}`, 'error');
      }
    }
  };

  // Enterprise: Reopen Order (revives soft-cancelled order, restores to previous status)
  const handleReopen = async (order) => {
    const { value: reopenReason } = await Swal.fire({
      title: 'Reopen Order?',
      html: `
        <p>This will <strong>revive</strong> the soft-cancelled order and restore it to its previous status.</p>
        <p class="text-muted small">Only soft-cancelled orders (before assignment) can be reopened.</p>
        <input id="reopen-reason" class="swal2-input" placeholder="Reopen reason (optional)">
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      confirmButtonText: 'Reopen Order',
      cancelButtonText: 'Keep Cancelled',
      preConfirm: () => {
        return document.getElementById('reopen-reason')?.value || 'Order reopened by admin';
      }
    });

    if (reopenReason !== undefined) {
      try {
        const res = await fetch(`${API_BASE}/reopen_order.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            order_id: order.id,
            reopen_reason: reopenReason
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          try {
            const errorData = JSON.parse(errorText);
            return Swal.fire('Error', errorData.message || `Server error (${res.status})`, 'error');
          } catch {
            return Swal.fire('Error', `Server error (${res.status})`, 'error');
          }
        }

        const data = await res.json();
        if (data.status === "success") {
          Swal.fire({
            icon: 'success',
            title: 'Order Reopened',
            text: `Order restored to status: ${data.data?.status_label || 'Previous status'}`,
          });
          fetchOrders();
          fetchKPIStats();
        } else {
          Swal.fire('Error', data.message || 'Cannot reopen order', 'error');
        }
      } catch (error) {
        Swal.fire('Error', `Server connection error: ${error.message}`, 'error');
      }
    }
  };

  // Enterprise: Clone Order (creates NEW order from cancelled/failed order)
  const handleClone = async (order) => {
    const { value: cloneReason } = await Swal.fire({
      title: 'Clone Order?',
      html: `
        <p>This will create a <strong>new order</strong> with the same data to restart from scratch.</p>
        <p class="text-muted small"><strong>Enterprise Rule:</strong> Clone is only available for orders cancelled at ASSIGNED (before pickup). Use Reopen for orders cancelled at BOOKED/APPROVED, or Follow-up for orders cancelled after pickup.</p>
        <input id="clone-reason" class="swal2-input" placeholder="Clone reason (optional)">
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#17a2b8',
      confirmButtonText: 'Clone Order',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        return document.getElementById('clone-reason')?.value || 'Order cloned by admin';
      }
    });

    if (cloneReason !== undefined) {
      try {
        const res = await fetch(`${API_BASE}/clone_order.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            order_id: order.id,
            clone_reason: cloneReason
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          try {
            const errorData = JSON.parse(errorText);
            return Swal.fire('Error', errorData.message || `Server error (${res.status})`, 'error');
          } catch {
            return Swal.fire('Error', `Server error (${res.status})`, 'error');
          }
        }

        const data = await res.json();
        if (data.status === "success") {
          Swal.fire({
            icon: 'success',
            title: 'Order Cloned',
            text: `New order created: ${data.data?.new_order_code || 'N/A'}`,
          });
          fetchOrders();
          fetchKPIStats();
        } else {
          Swal.fire('Error', data.message || 'Cannot clone order', 'error');
        }
      } catch (error) {
        Swal.fire('Error', `Server connection error: ${error.message}`, 'error');
      }
    }
  };

  // Enterprise: Create Follow-up Order (creates NEW order to continue shipment after pickup)
  const handleCreateFollowup = async (order) => {
    const { value: followupReason } = await Swal.fire({
      title: 'Create Follow-up Order?',
      html: `
        <p>This will create a <strong>new order</strong> to continue the shipment.</p>
        <p class="text-muted small"><strong>Enterprise Rule:</strong> Follow-up is only available for orders that were cancelled or failed AFTER pickup (real-world operation occurred). Use Clone for orders cancelled at ASSIGNED (before pickup), or Reopen for orders cancelled at BOOKED/APPROVED.</p>
        <input id="followup-reason" class="swal2-input" placeholder="Follow-up reason (required)" required>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ffc107',
      confirmButtonText: 'Create Follow-up',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const reason = document.getElementById('followup-reason')?.value;
        if (!reason || reason.trim() === '') {
          Swal.showValidationMessage('Please provide a follow-up reason');
          return false;
        }
        return reason;
      }
    });

    if (followupReason !== undefined) {
      try {
        const res = await fetch(`${API_BASE}/create_followup_order.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            order_id: order.id,
            followup_reason: followupReason
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          try {
            const errorData = JSON.parse(errorText);
            return Swal.fire('Error', errorData.message || `Server error (${res.status})`, 'error');
          } catch {
            return Swal.fire('Error', `Server error (${res.status})`, 'error');
          }
        }

        const data = await res.json();
        if (data.status === "success") {
          Swal.fire({
            icon: 'success',
            title: 'Follow-up Order Created',
            text: `New order created: ${data.data?.new_order_code || 'N/A'}`,
          });
          fetchOrders();
          fetchKPIStats();
        } else {
          Swal.fire('Error', data.message || 'Cannot create follow-up order', 'error');
        }
      } catch (error) {
        Swal.fire('Error', `Server connection error: ${error.message}`, 'error');
      }
    }
  };

  const openAssignModal = (o) => {
    setSelectedOrderForShipper(o);
    setAssignData({ order_id: o.id, shipper_id: "", note: "" });
    setConfirmAssignShipper(false);
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async () => {
    if (!assignData.shipper_id) {
      return Swal.fire("Warning", "Please select a shipper", "warning");
    }
    if (!confirmAssignShipper) {
      return Swal.fire("Warning", "Please confirm the assignment", "warning");
    }
    try {
      const res = await fetch(`${API_BASE}/assign_shipper.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...assignData, note: assignData.note || "Assign shipper" }),
      });
      const data = await res.json();
      if (data.status === "success") {
        Swal.fire("Success", "Shipper assigned successfully!", "success");
        setShowAssignModal(false);
        setSelectedOrderForShipper(null);
        setConfirmAssignShipper(false);

        // Refresh orders list
        await fetchOrders();

        // If detail panel is open for this order, fetch updated order detail
        if (showDetailPanel && selectedOrder && selectedOrder.id === assignData.order_id) {
          try {
            const detailRes = await fetch(`${API_BASE}/get_order_detail.php?order_id=${assignData.order_id}`, {
              method: "GET",
              credentials: "include",
            });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.status === "success" && detailData.data) {
                setSelectedOrder(detailData.data);
              }
            }
          } catch (error) {
            console.error("Error fetching order detail:", error);
          }
        }
      } else {
        Swal.fire("Lỗi", data.message || "Không thể phân công", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Server connection error", "error");
    }
  };

  const openAssignAgentModal = (o) => {
    setSelectedOrderForAgent(o);
    setAssignAgentData({ order_id: o.id, agent_id: "", note: "" });
    setConfirmAssignAgent(false);
    setShowAssignAgentModal(true);
  };

  const handleAssignAgentSubmit = async () => {
    if (!assignAgentData.agent_id) {
      return Swal.fire("Warning", "Please select an agent", "warning");
    }
    if (!confirmAssignAgent) {
      return Swal.fire("Warning", "Please confirm the assignment", "warning");
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
        Swal.fire("Success", "Agent assigned successfully!", "success");
        setShowAssignAgentModal(false);
        setConfirmAssignAgent(false);

        // Refresh orders list
        await fetchOrders();

        // If detail panel is open for this order, fetch updated order detail
        if (showDetailPanel && selectedOrder && selectedOrder.id === assignAgentData.order_id) {
          try {
            const detailRes = await fetch(`${API_BASE}/get_order_detail.php?order_id=${assignAgentData.order_id}`, {
              method: "GET",
              credentials: "include",
            });
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              if (detailData.status === "success" && detailData.data) {
                setSelectedOrder(detailData.data);
              }
            }
          } catch (error) {
            console.error("Error fetching order detail:", error);
          }
        }
      } else {
        Swal.fire("Lỗi", data.message || "Không thể phân công", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Server connection error", "error");
    }
  };

  const location = useLocation();
  const navigate = useNavigate();
  
  // State for navigation intent (from Dashboard or Notification)
  const [navigationIntent, setNavigationIntent] = useState(null);
  
  // ===================== STEP 1: RECEIVE NAVIGATION INTENT (ONLY ONCE) =====================
  useEffect(() => {
    if (location.state?.action === "create") {
      setShowCreateModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Handle redirect from Dashboard with focusOrderId (state-based)
    if (location.state?.focusOrderId && !processedRedirectRef.current) {
      const targetOrderId = Number(location.state.focusOrderId);
      const shouldOpenAssign = location.state.openAssign || false;
      const shouldOpenAssignAgent = location.state.openAssignAgent || false;
      
      // Mark as processed to prevent duplicate execution
      processedRedirectRef.current = true;
      
      // Save navigation intent to local state (separate from location.state)
      setNavigationIntent({
        orderId: targetOrderId,
        openAssign: shouldOpenAssign,
        openAssignAgent: shouldOpenAssignAgent,
      });
      
      // Set focused order ID for highlighting
      setFocusedOrderId(targetOrderId);
      return;
    }

    // Handle redirect from Notification with query param ?focus=order_id
    const searchParams = new URLSearchParams(location.search);
    const focusOrderId = searchParams.get('focus');
    if (focusOrderId && !processedRedirectRef.current) {
      const targetOrderId = Number(focusOrderId);
      processedRedirectRef.current = true;
      
      setNavigationIntent({
        orderId: targetOrderId,
        openAssign: false,
        openAssignAgent: false,
      });
      
      setFocusedOrderId(targetOrderId);
      
      // Clean up URL
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, location.search, navigate]);
  
  // ===================== STEP 2: PROCESS NAVIGATION INTENT (AFTER ORDERS LOAD) =====================
  useEffect(() => {
    // Wait for navigation intent and orders to be ready
    if (!navigationIntent || loading || orders.length === 0 || filteredOrders.length === 0) {
      return;
    }

    const { orderId, openAssign, openAssignAgent } = navigationIntent;
    const targetOrderId = Number(orderId);

    // Find order in filteredOrders
    const orderIndex = filteredOrders.findIndex(o => Number(o.id) === targetOrderId);
    if (orderIndex === -1) {
      // Order not found - clear intent and state
      setNavigationIntent(null);
      navigate(location.pathname, { replace: true, state: {} });
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
      // Open modal if requested
      if (openAssign) {
        openAssignModal(targetOrder);
      } else if (openAssignAgent) {
        openAssignAgentModal(targetOrder);
      }
      
      // Scroll to order and highlight (wait for DOM to render)
      setTimeout(() => {
        const orderRow = document.querySelector(`[data-order-id="${targetOrderId}"]`);
        if (orderRow) {
          orderRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Set highlight AFTER scroll completes using requestAnimationFrame
          requestAnimationFrame(() => {
            // Highlight is already set via focusedOrderId state, but ensure it's applied
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
          navigate(location.pathname, { replace: true, state: {} });
          processedRedirectRef.current = false;
        }, 400);
      }, 300);
    } else {
      // Order not found - clear intent
      setNavigationIntent(null);
      navigate(location.pathname, { replace: true, state: {} });
      processedRedirectRef.current = false;
    }
  }, [navigationIntent, orders, filteredOrders, loading, currentPage, pageSize, navigate, openAssignModal, openAssignAgentModal]);

  // ===================== STEP 3: APPLY FILTERS FROM NAVIGATION STATE (Agent Management drill-down) =====================
  useEffect(() => {
    if (location.state?.agent_id) {
      setFilterBranch(location.state.agent_id);

      // Priority: specific status > status_group
      // If both are set, status takes priority
      if (location.state.status && location.state.status !== "all") {
        setFilterStatus(location.state.status);
        setFilterStatusGroup("all"); // Clear status group if specific status is set
      } else if (location.state.status_group && location.state.status_group !== "all") {
        setFilterStatusGroup(location.state.status_group);
        setFilterStatus("all"); // Clear specific status if status group is set
      } else {
        // If both are "all" or not set, reset to defaults
        setFilterStatus("all");
        setFilterStatusGroup("all");
      }

      // Clear navigation state after applying filters
      navigate(location.pathname, { replace: true, state: {} });

      // Scroll to table
      setTimeout(() => {
        const tableElement = document.querySelector('.lux-table-wrapper');
        if (tableElement) tableElement.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location.state?.agent_id, location.state?.status, location.state?.status_group, navigate]);

  // Reset highlight when filter/search changes (user changed context)
  useEffect(() => {
    if (focusedOrderId) {
      setFocusedOrderId(null);
      processedRedirectRef.current = false;
    }
  }, [filterStatus, filterStatusGroup, filterBranch, filterShipper, filterPayment, filterPaymentStatus, filterCOD, filterNoAgent, filterNoShipper, filterAssignedNotPicked, filterDateFrom, filterDateTo, searchText]);

  // Auto-fade highlight after 5 seconds
  useEffect(() => {
    if (!focusedOrderId) return;

    const timer = setTimeout(() => {
      setFocusedOrderId(null);
    }, 5000); // 5 seconds as per user request

    return () => clearTimeout(timer);
  }, [focusedOrderId]);

  // Ensure highlight is applied after DOM updates (using requestAnimationFrame for reliability)
  useEffect(() => {
    if (!focusedOrderId) return;
    
    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      // Double RAF to ensure render is complete
      requestAnimationFrame(() => {
        const orderRow = document.querySelector(`[data-order-id="${focusedOrderId}"]`);
        if (orderRow) {
          // Force highlight class to be applied
          orderRow.classList.add('highlight');
        }
      });
    });
    
    return () => cancelAnimationFrame(rafId);
  }, [focusedOrderId, paginatedOrders, currentPage]);

  // Reset highlight when user explicitly interacts (ONLY on click, NOT on hover)
  // Hover should NOT reset highlight - only click or page/filter change
  const handleUserInteraction = () => {
    // Only reset on explicit click, not on hover
    // Highlight will auto-fade after 5 seconds via useEffect
    if (focusedOrderId) {
      setFocusedOrderId(null);
      processedRedirectRef.current = false;
    }
  };

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
      item_name: "", category_id: "", weight: 500, length: 10, width: 10, height: 10, // weight default 500 grams
      service_type: 1, cod_amount: 0, payment_method_id: 1, payer_type: 1, // payer_type: 1 = Người gửi trả
      distance_km: "", note: ""
    });
    setProductImages([]);
    setDistanceKm(null);
  };

  // Order info component (reusable) - ENTERPRISE ENHANCED
  const OrderInfoDisplay = ({ order, iconColor = "text-warning" }) => {
    // Extract area from address (simple extraction)
    const getArea = (address) => {
      if (!address) return "N/A";
      // Try to extract district from address
      const districts = Object.keys(hanoiData);
      for (const district of districts) {
        if (address.includes(district)) return district;
      }
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
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaRoute className="me-1" /> Service Type</small><div className="fw-bold">{order.service_type_name || serviceTypes.find(s => s.id === order.service_type)?.name || "Standard"}</div></div></Col>
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaMapMarkerAlt className="me-1" /> Pickup Area</small><div className="small fw-semibold">{getArea(order.sender_address)}</div></div></Col>
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaMapMarkerAlt className="me-1" /> Delivery Area</small><div className="small fw-semibold">{getArea(order.receiver_address)}</div></div></Col>
          {order.weight && (
            <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaWeight className="me-1" /> Weight</small><div className="fw-bold">{Number(order.weight).toLocaleString("en-US")} grams</div></div></Col>
          )}
          <Col md={6}><div className="luxury-info-item"><small className="text-muted d-flex align-items-center mb-1"><FaCreditCard className="me-1" /> Payment Method</small><div className="fw-bold">{order.payment_method_name || (order.payment_method_id === 1 ? "Cash" : order.payment_method_id === 2 ? "Bank Transfer" : order.payment_method_id === 3 ? "MoMo Wallet" : "Not specified")}</div></div></Col>
        </Row>
      </div>
    );
  };

  return (
    <div className="admin-page container-fluid p-0">
      <div className="page-header d-flex justify-content-between mb-4">
        <h3 className="fw-bold">Order Management</h3>
        <Button className="btn-lux-primary" onClick={() => setShowCreateModal(true)}>
          <FaPlus className="me-2" /> Create Order
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm text-white kpi-item" style={{ background: "linear-gradient(135deg,#007bff,#35a0ff)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Total Orders</p>
                  <h2 className="fw-bold my-1">{kpiStats.total_orders}</h2>
                </div>
                <FaBox className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-white kpi-item" style={{ background: "linear-gradient(135deg,#ffc107,#ffde59)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">In Transit</p>
                  <h2 className="fw-bold my-1">{kpiStats.in_transit}</h2>
                </div>
                <FaShippingFast className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-white kpi-item" style={{ background: "linear-gradient(135deg,#43a047,#8bc34a)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Delivered</p>
                  <h2 className="fw-bold my-1">{kpiStats.delivered}</h2>
                </div>
                <FaCheckCircle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm text-white kpi-item" style={{ background: "linear-gradient(135deg,#e53935,#ff5252)" }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="m-0 opacity-75 small">Cancelled</p>
                  <h2 className="fw-bold my-1">{kpiStats.cancelled || 0}</h2>
                </div>
                <FaExclamationTriangle className="fs-1 opacity-50" />
              </div>
            </Card.Body>
          </Card>
        </Col>
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
        // new nmtu 9:56 24-12
        // Use paginatedOrders instead of full filteredOrders
        // Enables client-side pagination without changing OrderTable
        orders={paginatedOrders}
        //------------------- thay cho orders={filteredOrders}
        userRole={userRole}
        focusedOrderId={focusedOrderId}
        onUserInteraction={handleUserInteraction}
        onRowClick={(order) => { setSelectedOrder(order); setShowDetailPanel(true); }}
        onViewDetail={(order) => { setSelectedOrder(order); setShowDetailPanel(true); }}
        onAssignAgent={openAssignAgentModal}
        // ENTERPRISE: Admin must NEVER assign shipper in normal workflow
        // onAssignShipper={openAssignModal} // REMOVED - Admin cannot assign shipper
        onEditOrder={openEditModal}
        onCancelOrder={handleCancel}
        onTerminateWorkflow={handleTerminateWorkflow}
        onReopenOrder={handleReopen}
        onCloneOrder={handleClone}
        onCreateFollowupOrder={handleCreateFollowup}
      />
      {/* ===================== new nmtu 9:56 24-12 ===================== */}
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

      {/* --------------------------------------------------------------- */}
      <OrderDetailPanel
        order={selectedOrder}
        isOpen={showDetailPanel}
        userRole={userRole}
        onClose={() => { setShowDetailPanel(false); setSelectedOrder(null); }}
        // ENTERPRISE: Admin must NEVER assign shipper in normal workflow
        // onAssign removed - Only Agent can assign shipper
      />

      {showCreateModal && (
        <div className="dqn-modal-overlay">

          <div className="dqn-modal">

            {/* ================= HEADER ================= */}
            <div className="dqn-modal-header">
              <div className="dqn-modal-title">
                <FaPlus /> Create New Order
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
                        <FaUser className="me-2" /> Sender
                      </h6>
                    </div>

                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Sender Name (*)</Form.Label>
                      <Form.Control
                        name="sender_name"
                        placeholder="Enter sender name"
                        className="luxury-input"
                        value={createData.sender_name}
                        onChange={handleCreateChange}
                      />
                    </Form.Group>

                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Phone (*)</Form.Label>
                      <Form.Control
                        name="sender_phone"
                        placeholder="Enter phone number"
                        className="luxury-input"
                        value={createData.sender_phone}
                        onChange={handleCreateChange}
                      />
                    </Form.Group>

                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Street Address (*)</Form.Label>
                      <Form.Control
                        name="fromStreet"
                        placeholder="Street address"
                        className="luxury-input"
                        value={createData.fromStreet}
                        onChange={handleCreateChange}
                      />
                    </Form.Group>

                    <Row className="mb-2">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">District (*)</Form.Label>
                          <Form.Select
                            name="fromDistrict"
                            value={createData.fromDistrict}
                            onChange={(e) => handleDistrictChange(e, "from")}
                            className="luxury-select"
                          >
                            <option value="">-- Select District --</option>
                            {Object.keys(hanoiData).map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Ward</Form.Label>
                          <Form.Select
                            name="fromWard"
                            value={createData.fromWard}
                            onChange={(e) => handleWardChange(e, "from")}
                            disabled={!createData.fromDistrict}
                            className="luxury-select"
                          >
                            <option value="">-- Select Ward --</option>
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
                        <FaUser className="me-2" /> Receiver
                      </h6>
                    </div>

                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Receiver Name (*)</Form.Label>
                      <Form.Control
                        name="receiver_name"
                        placeholder="Enter receiver name"
                        className="luxury-input"
                        value={createData.receiver_name}
                        onChange={handleCreateChange}
                      />
                    </Form.Group>

                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Phone (*)</Form.Label>
                      <Form.Control
                        name="receiver_phone"
                        placeholder="Enter phone number"
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
                        placeholder="Receiver email"
                        className="luxury-input"
                        value={createData.receiver_email}
                        onChange={handleCreateChange}
                      />
                    </Form.Group>

                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Street Address (*)</Form.Label>
                      <Form.Control
                        name="toStreet"
                        placeholder="Street address"
                        className="luxury-input"
                        value={createData.toStreet}
                        onChange={handleCreateChange}
                      />
                    </Form.Group>

                    <Row className="mb-2">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">District (*)</Form.Label>
                          <Form.Select
                            name="toDistrict"
                            value={createData.toDistrict}
                            onChange={(e) => handleDistrictChange(e, "to")}
                            className="luxury-select"
                          >
                            <option value="">-- Select District --</option>
                            {Object.keys(hanoiData).map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small text-muted">Ward</Form.Label>
                          <Form.Select
                            name="toWard"
                            value={createData.toWard}
                            onChange={(e) => handleWardChange(e, "to")}
                            disabled={!createData.toDistrict}
                            className="luxury-select"
                          >
                            <option value="">-- Select Ward --</option>
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
                    <FaBox className="me-2 text-primary" /> Item Information
                  </h6>
                </div>

                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Item Name</Form.Label>
                      <Form.Control
                        name="item_name"
                        placeholder="Enter item name (e.g., Clothes, Phone, Books...)"
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
                      <Form.Label className="small text-muted">Item Category (*)</Form.Label>
                      <Form.Select
                        name="category_id"
                        value={createData.category_id}
                        onChange={handleCreateChange}
                        className="luxury-select"
                      >
                        <option value="">-- Select Category --</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Weight (grams) (*)</Form.Label>
                      <Form.Control
                        type="number"
                        name="weight"
                        step="1"
                        min="1"
                        className="luxury-input"
                        value={createData.weight}
                        onChange={handleCreateChange}
                        placeholder="e.g., 500 (for 0.5kg)"
                      />
                    </Form.Group>
                  </Col>

                </Row>

                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Length (cm) (*)</Form.Label>
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
                      <Form.Label className="small text-muted">Width (cm) (*)</Form.Label>
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
                      <Form.Label className="small text-muted">Height (cm) (*)</Form.Label>
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
                      <Form.Label className="small text-muted">Shipping Fee Payer (*)</Form.Label>
                      <Form.Select
                        name="payer_type"
                        value={createData.payer_type}
                        onChange={handleCreateChange}
                        className="luxury-select"
                      >
                        <option value={1}>Sender Pays</option>
                        <option value={2}>Receiver Pays</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Payment Method (*)</Form.Label>
                      {createData.payer_type === 1 ? (
                        // Sender pays: can choose payment method
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
                      ) : (
                        // Receiver pays: Cash on Delivery only (fixed, no selection)
                        <div>
                          <Form.Control
                            type="text"
                            value="Cash (Receiver Pay)"
                            readOnly
                            disabled
                            className="luxury-input"
                            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                          />
                          <Form.Text className="text-muted">
                            Receiver will pay in cash upon delivery. COD is automatically enabled.
                          </Form.Text>
                        </div>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">
                        COD Amount (Collected from Receiver) - VND
                        {createData.payer_type === 2 && <span className="text-danger ms-1">*</span>}
                      </Form.Label>
                      <Form.Control
                        type="number"
                        name="cod_amount"
                        step="1000"
                        min="0"
                        className="luxury-input"
                        value={createData.cod_amount}
                        onChange={handleCreateChange}
                        placeholder={createData.payer_type === 2 ? "Enter COD amount (required)" : "Enter COD amount (optional)"}
                        required={createData.payer_type === 2}
                        style={createData.payer_type === 2 ? { borderColor: '#ffc107', borderWidth: '2px' } : {}}
                      />
                      {createData.payer_type === 2 ? (
                        <Form.Text className="text-warning" style={{ fontWeight: '500' }}>
                          ⚠️ COD is required when Receiver Pays. Enter the amount receiver will pay in cash.
                        </Form.Text>
                      ) : (
                        <Form.Text className="text-muted">Enter the COD amount that will be collected from receiver (if any).</Form.Text>
                      )}
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Service Type (*)</Form.Label>
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
                </Row>

                <Row className="mb-3">
                  <Col md={12}>
                    <Form.Group className="mb-2">
                      <Form.Label className="small text-muted">Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="note"
                        placeholder="Notes for order"
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
                    <FaMoneyBillWave className="me-2 text-success" /> Fee Details
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
                      <strong>{Number(fee.amount).toLocaleString("en-US")} VND</strong>
                    </div>
                  ))}

                  <hr className="my-2" />

                  <div className="d-flex justify-content-between fw-bold text-primary">
                    <span>Total Shipping Fee:</span>
                    <strong>{Number(calculateFees.total_shipping_fee).toLocaleString("en-US")} VND</strong>
                  </div>

                  <div className="d-flex justify-content-between fw-bold text-warning mt-2">
                    <span>COD Amount (Collected from Receiver):</span>
                    <strong>
                      {Number(calculateFees.cod_amount || 0).toLocaleString("en-US")} VND
                        </strong>
                      </div>

                  <hr className="my-2" />

                  <div className="d-flex justify-content-between fw-bold fs-5 text-success">
                    <span>
                      {createData.payer_type === 2 ? 'Amount to Collect from Receiver:' : 'Final Total (Shipping + COD):'}
                    </span>
                        <strong>
                          {Number(calculateFees.total_amount_with_cod).toLocaleString("en-US")} VND
                        </strong>
                      </div>
                </div>

                <div className="luxury-section-header mb-2">
                  <h6 className="fw-bold d-flex align-items-center mb-0">
                    <FaImage className="me-2 text-primary" /> Product Images
                    <span className="text-muted small fw-normal ms-2">
                      ({productImages.length}/5 images)
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
                        Maximum 5 images reached. Please remove an image to add a new one.
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
                                title="Remove Image"
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
                Cancel
              </Button>

              <Button
                variant="primary"
                className="btn-lux-primary-blue"
                onClick={handleCreateSubmit}
              >
                <FaPlus className="me-2" /> Create Order
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
                <FaEdit /> Update Order
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
                {/* Order Info Display (Read-only) */}
                {selectedOrder && (() => {
                  const getArea = (address) => {
                    if (!address) return "N/A";
                    const districts = Object.keys(hanoiData);
                    for (const district of districts) {
                      if (address.includes(district)) return district;
                    }
                    const parts = address.split(",").map(p => p.trim());
                    if (parts.length > 0) {
                      const lastPart = parts[parts.length - 1];
                      for (const district of districts) {
                        if (lastPart.includes(district) || district.includes(lastPart)) {
                          return district;
                        }
                      }
                      return lastPart;
                    }
                    return address;
                  };
                  
                  return (
                    <div className="luxury-order-info mb-4 p-3" style={{ backgroundColor: "#f8f9fa", borderRadius: "8px", border: "1px solid #dee2e6" }}>
                      <div className="d-flex align-items-center mb-3">
                        <FaInfoCircle className="me-2 text-primary" />
                        <h6 className="fw-bold mb-0">Order Information (Read-Only)</h6>
                      </div>
                      <Row className="g-3">
                        <Col md={6}>
                          <div className="luxury-info-item">
                            <small className="text-muted d-flex align-items-center mb-1">
                              <FaMapMarkerAlt className="me-1" /> Pickup Area
                            </small>
                            <div className="small fw-semibold text-primary">
                              {getArea(selectedOrder.sender_address || selectedOrder.senderAddress || "")}
                            </div>
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="luxury-info-item">
                            <small className="text-muted d-flex align-items-center mb-1">
                              <FaMapMarkerAlt className="me-1" /> Delivery Area
                            </small>
                            <div className="small fw-semibold text-success">
                              {getArea(selectedOrder.receiver_address || selectedOrder.receiverAddress || "")}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  );
                })()}
                
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FaMapMarkerAlt className="me-2 text-primary" /> Receiver Address
                  </Form.Label>
                  <Form.Control
                    name="receiver_address"
                    value={editData.receiver_address}
                    onChange={handleEditChange}
                    placeholder="Enter receiver address"
                    className="luxury-input"
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label className="fw-bold d-flex align-items-center">
                    <FaBox className="me-2 text-primary" /> New Status
                  </Form.Label>
                  {/* Show current status */}
                  {(() => {
                    const originalStatus = editData.original_status || editData.status;
                    const isTerminal = isTerminalStatus(originalStatus);
                    return (
                      <>
                        {!isTerminal && (
                          <div className="mb-2 p-2 bg-light rounded">
                            <small className="text-muted d-block mb-1">Current Status:</small>
                            <div style={{ display: "inline-block" }}><StatusBadge status={originalStatus} /></div>
                          </div>
                        )}
                        <Form.Select
                          name="status"
                          value={editData.status}
                          onChange={handleEditChange}
                          className="luxury-select"
                          disabled={isTerminal}
                        >
                          {/* Only show available next statuses - next status and Failed */}
                          {getAvailableStatuses(originalStatus).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          {isTerminal
                            ? "Note: Terminal status (Delivered/Failed/Cancelled) cannot be changed."
                            : "Note: You can advance to the next status, rollback 1 step, or mark as Failed."}
                        </Form.Text>
                      </>
                    );
                  })()}
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
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateSubmit}
                className="btn-lux-primary-blue"
              >
                Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASSIGN SHIPPER - ENTERPRISE: REMOVED FOR ADMIN */}
      {/* ENTERPRISE RULE: Admin must NEVER assign shipper in normal workflow */}
      {/* Only Agent can assign shipper */}
      {false && showAssignModal && (
        <div className="dqn-modal-overlay">
          <div className="dqn-modal">
            {/* ================= HEADER ================= */}
            <div className="dqn-modal-header" style={{ background: "linear-gradient(135deg, #ffc107, #ffde59)" }}>
              <div className="dqn-modal-title">
                <FaShippingFast /> Assign Shipper
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
                    <FaShippingFast className="me-2 text-warning" /> Select Shipper <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Select
                    value={assignData.shipper_id}
                    onChange={(e) => setAssignData({ ...assignData, shipper_id: e.target.value })}
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
                          {s.name} ({s.email}) - {workload} active orders ({workloadLabel}) {s.status === "active" ? "✓" : ""}
                        </option>
                      );
                    })}
                  </Form.Select>
                  {assignData.shipper_id && (() => {
                    const selected = shippersWithWorkload.find(s => s.id === Number(assignData.shipper_id));
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
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">
                    Assignment Note <span className="text-muted small fw-normal">(Optional)</span>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="e.g., Urgent order - deliver today, VIP customer..."
                    value={assignData.note}
                    onChange={(e) => setAssignData({ ...assignData, note: e.target.value })}
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
                Cancel
              </Button>
              <Button
                variant="warning"
                onClick={handleAssignSubmit}
                disabled={!assignData.shipper_id || !confirmAssignShipper}
                className="btn-lux-primary-yellow"
              >
                <FaShippingFast className="me-2" /> Confirm Assignment
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
                <FaUserTie /> Assign Agent
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
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleAssignAgentSubmit}
                disabled={!assignAgentData.agent_id || !confirmAssignAgent}
                className="btn-lux-primary-red"
              >
                <FaUserTie className="me-2" /> Confirm Assignment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
