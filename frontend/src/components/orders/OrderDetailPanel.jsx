// frontend/src/components/orders/OrderDetailPanel.jsx
import React, { useEffect, useState } from "react";
import { FaTimes, FaUserCheck, FaImage, FaWeight, FaRuler, FaTag, FaTruck, FaMoneyBillWave, FaUser, FaPhone, FaMapMarkerAlt, FaEnvelope, FaBox, FaInfoCircle } from "react-icons/fa";
import StatusBadge from "../common/StatusBadge";
import ImageModal from "../common/ImageModal";
import { ORDER_STATUS, canAdminAssignShipper, isTerminalStatus } from "../../constants/orderStatus";
import hanoiData from "../../data/hanoi.json";

import "../../assets/styles/orderDetailPanel.css";
import "../../assets/styles/imageModal.css";

/**
 * OrderDetailPanel - Enterprise Workflow (Option B) - DQN Luxury
 * 
 * Role-based actions:
 * - Admin: ASSIGN SHIPPER (chỉ khi status=2 APPROVED && !shipper_id)
 * - Agent: Không có action (chỉ view)
 * - Shipper: Không có action trong panel này (actions ở shipper pages)
 * - Customer: Không có action (chỉ view)
 */
export default function OrderDetailPanel({
  order,
  isOpen,
  onClose,
  onAssign,
  userRole = "admin", // Get from props or localStorage
}) {
  const [orderImages, setOrderImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [allImages, setAllImages] = useState([]); // Combined pickup + delivery + failed images
  const [fullOrderDetail, setFullOrderDetail] = useState(null); // Full order detail from API

  // Fetch full order detail from API when order.id changes
  // This ensures we have complete data (weight, service_type_name, etc.) even if passed order is incomplete
  useEffect(() => {
    if (order && order.id) {
      const orderId = Number(order.id);
      if (orderId > 0 && !isNaN(orderId)) {
        fetchFullOrderDetail(orderId);
        fetchOrderImages(orderId);
      } else {
        console.warn("Invalid order.id:", order.id);
        setFullOrderDetail(null);
        setOrderImages([]);
        setAllImages([]);
      }
    } else {
      setFullOrderDetail(null);
      setOrderImages([]);
      setAllImages([]);
    }
  }, [order?.id]); // Only depend on order.id to avoid unnecessary re-fetches

  // Fetch full order detail from API
  const fetchFullOrderDetail = async (orderId) => {
    try {
      const res = await fetch(
        `http://localhost:8888/api/admin/get_order_detail.php?order_id=${orderId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      
      if (!res.ok) {
        console.error(`Failed to fetch order detail: ${res.status} ${res.statusText}`);
        setFullOrderDetail(null);
        return;
      }
      
      const data = await res.json();
      if (data.status === "success" && data.data) {
        setFullOrderDetail(data.data);
      } else {
        setFullOrderDetail(null);
      }
    } catch (error) {
      console.error("Error fetching order detail:", error);
      setFullOrderDetail(null);
    }
  };

  // Update allImages when orderImages changes (include pickup, delivery, and failed images)
  useEffect(() => {
    setAllImages([...orderImages]);
  }, [orderImages]);

  // Convert image URL to absolute URL
  // Images are served from backend (port 8888), not frontend (port 5173)
  const getImageUrl = (url) => {
    if (!url) return "";
    // If already absolute URL, return as is
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    // If relative URL (e.g., /uploads/order_images/xxx.jpg), prepend backend base URL
    const backendBaseUrl = "http://localhost:8888";
    // Keep leading slash for proper URL path
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;
    return `${backendBaseUrl}${cleanUrl}`;
  };

  const fetchOrderImages = async (orderId) => {
    if (!orderId) {
      setOrderImages([]);
      return;
    }
    
    setLoadingImages(true);
    try {
      const res = await fetch(
        `http://localhost:8888/api/admin/get_order_detail.php?order_id=${orderId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      
      if (!res.ok) {
        console.error(`Failed to fetch order images: ${res.status} ${res.statusText}`);
        setOrderImages([]);
        return;
      }
      
      const data = await res.json();
      if (data.status === "success" && data.data?.images && Array.isArray(data.data.images)) {
        // Normalize image URLs to absolute URLs
        // Filter out invalid/placeholder URLs
        const normalizedImages = data.data.images
          .filter(img => {
            // Filter out empty, null, or invalid URLs
            if (!img.image_url || typeof img.image_url !== "string") return false;
            // Filter out placeholder URLs like "800x600", "150", "100", etc.
            if (/^\d+x?\d*$/.test(img.image_url)) return false;
            // Filter out very short URLs (likely invalid)
            if (img.image_url.length < 5) return false;
            return true;
          })
          .map(img => ({
            ...img,
            image_url: getImageUrl(img.image_url),
          }));
        setOrderImages(normalizedImages);
      } else {
        console.warn("No images found or invalid response:", data);
        setOrderImages([]);
      }
    } catch (error) {
      console.error("Error fetching order images:", error);
      setOrderImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  if (!order) return null;

  // ============================================================
  // NORMALIZE ORDER DATA (Chuẩn hóa data từ nhiều nguồn)
  // Priority: fullOrderDetail (from API) > order (from props)
  // ============================================================
  const normalizeOrder = (orderData) => {
    if (!orderData) return null;
    
    // Normalize all possible field names to a standard format
    return {
      id: orderData.id,
      order_code: orderData.order_code || orderData.code || (orderData.id ? `ORD${String(orderData.id).padStart(4, '0')}` : null),
      created_at: orderData.created_at || orderData.created || orderData.created_at || null,
      payment_method_name: orderData.payment_method_name || orderData.paymentMethod || null,
      payment_method_code: orderData.payment_method_code || orderData.paymentMethodCode || null,
      payment_method_id: orderData.payment_method_id || orderData.paymentMethodId || null,
      weight: orderData.weight !== undefined && orderData.weight !== null ? Number(orderData.weight) : null,
      payer_type: orderData.payer_type !== undefined ? Number(orderData.payer_type) : 1,
      agent_name: orderData.agent_name || orderData.agentName || orderData.agent || null,
      shipper_name: orderData.shipper_name || orderData.shipperName || orderData.shipper || null,
      category_name: orderData.category_name || orderData.category || null,
      service_type_name: orderData.service_type_name || orderData.service_type || null,
      sender_name: orderData.sender_name || orderData.sender || null,
      sender_phone: orderData.sender_phone || orderData.senderPhone || null,
      sender_address: orderData.sender_address || orderData.senderAddress || null,
      receiver_name: orderData.receiver_name || orderData.receiver || null,
      receiver_phone: orderData.receiver_phone || orderData.receiverPhone || null,
      receiver_address: orderData.receiver_address || orderData.receiverAddress || null,
      receiver_email: orderData.receiver_email || orderData.receiverEmail || null,
      length: orderData.length || null,
      width: orderData.width || null,
      height: orderData.height || null,
      distance_km: orderData.distance_km || null,
      cod_amount: orderData.cod_amount || orderData.codAmount || null,
      total_shipping_fee: orderData.total_shipping_fee || orderData.shippingFee || null,
      total_amount: orderData.total_amount || orderData.totalAmount || null,
      notes: orderData.notes || orderData.note || null,
      status: orderData.status,
    };
  };

  // Use fullOrderDetail if available (complete data from API), otherwise use order prop
  const orderToNormalize = fullOrderDetail || order;
  const normalizedOrder = normalizeOrder(orderToNormalize);

  // Enterprise workflow: Admin chỉ assign khi status=2 (APPROVED) && !shipper_id
  const canAssign = () => {
    if (userRole !== "admin") return false;
    if (isTerminalStatus(normalizedOrder.status)) return false; // Không assign terminal states
    return canAdminAssignShipper(normalizedOrder);
  };

  const orderCode = normalizedOrder.order_code || "-";
  const agentName = normalizedOrder.agent_name || "-";
  const shipperName = normalizedOrder.shipper_name || "-";
  
  // Payment method: Use payment_method_code (English) from database, fallback to id mapping
  // Database codes: 'cash', 'banking', 'momo'
  let paymentLabel = "-";
  if (normalizedOrder.payment_method_code) {
    const paymentCodeMap = {
      'cash': 'Cash',
      'banking': 'Bank Transfer',
      'momo': 'MoMo Wallet',
    };
    paymentLabel = paymentCodeMap[normalizedOrder.payment_method_code.toLowerCase()] || normalizedOrder.payment_method_code;
  } else if (normalizedOrder.payment_method_id) {
    // Fallback to ID mapping if code not available
    const paymentMethods = {
      1: "Cash",
      2: "Bank Transfer",
      3: "MoMo Wallet",
    };
    paymentLabel = paymentMethods[normalizedOrder.payment_method_id] || "-";
  }
  
  const categoryName = normalizedOrder.category_name || "-";
  const serviceTypeName = normalizedOrder.service_type_name || "-";
  
  // Format weight (grams) - Only show if weight exists and > 0
  const weightGram = normalizedOrder.weight;
  let weightDisplay = "-";
  if (weightGram !== null && weightGram !== undefined && weightGram > 0) {
    weightDisplay = weightGram >= 1000 
      ? `${(weightGram / 1000).toFixed(2)} kg (${weightGram.toLocaleString("en-US")} grams)`
      : `${weightGram.toLocaleString("en-US")} grams`;
  }

  // Payer type
  const payerType = normalizedOrder.payer_type || 1;
  const payerTypeLabel = payerType === 1 ? "Sender Pays" : "Receiver Pays";

  // Format date - Handle multiple formats
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      // Handle MySQL datetime format: "YYYY-MM-DD HH:MM:SS"
      // Handle ISO format: "YYYY-MM-DDTHH:MM:SS"
      // Handle other formats
      let date = new Date(dateStr);
      
      // If invalid date, try parsing manually
      if (isNaN(date.getTime())) {
        // Try MySQL format
        const mysqlMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
        if (mysqlMatch) {
          const [, year, month, day, hour = "00", minute = "00"] = mysqlMatch;
          date = new Date(year, month - 1, day, hour, minute);
        } else {
          return "-";
        }
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "-";
      }
      
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (e) {
      console.error("Error formatting date:", dateStr, e);
      return "-";
    }
  };

  // Extract area (district) from address
  const getArea = (address) => {
    if (!address) return "N/A";
    // Try to extract district from address using hanoiData
    const districts = Object.keys(hanoiData);
    for (const district of districts) {
      if (address.includes(district)) return district;
    }
    // Fallback: try to get last part of address (usually district)
    const parts = address.split(",").map(p => p.trim());
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1];
      // Check if last part matches any district
      for (const district of districts) {
        if (lastPart.includes(district) || district.includes(lastPart)) {
          return district;
        }
      }
      return lastPart;
    }
    return address;
  };

  // Separate images by type (URLs already normalized in fetchOrderImages)
  const pickupImages = orderImages.filter(img => img.type === "pickup");
  const deliveryImages = orderImages.filter(img => img.type === "delivery");
  const failedImages = orderImages.filter(img => img.type === "delivery_failed");

  // Handle image click - open modal
  const handleImageClick = (imageIndex, imageType) => {
    // Calculate index in allImages array (pickup -> delivery -> failed)
    let globalIndex = 0;
    if (imageType === "pickup") {
      globalIndex = imageIndex;
    } else if (imageType === "delivery") {
      globalIndex = pickupImages.length + imageIndex;
    } else if (imageType === "failed") {
      globalIndex = pickupImages.length + deliveryImages.length + imageIndex;
    }
    setSelectedImageIndex(globalIndex);
    setShowImageModal(true);
  };

  return (
    <>
      {/* OVERLAY BACKGROUND - DQN Luxury Modal Style */}
      {isOpen && (
        <div 
          className="order-panel-overlay"
          onClick={onClose}
        />
      )}
      
      <div className={`order-panel luxury-panel ${isOpen ? "open" : ""}`}>
      {/* HEADER - DQN Luxury */}
      <div className="order-panel-header luxury-panel-header">
        <div className="d-flex align-items-center gap-2">
          <FaBox className="text-primary" style={{ fontSize: "1.2rem" }} />
        <h5 className="fw-bold m-0">
            Order Details{" "}
            <span className="text-primary">{orderCode}</span>
        </h5>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Trạng thái tổng quát */}
          <StatusBadge status={normalizedOrder.status} />

          {/* Enterprise Workflow: Chỉ hiển thị ASSIGN SHIPPER khi đúng điều kiện */}
          {canAssign() && onAssign && (
            <button
              className="btn btn-sm btn-lux-primary-yellow d-flex align-items-center gap-1"
              onClick={() => onAssign(normalizedOrder)}
              type="button"
              title="Assign Shipper (only when status=APPROVED and no shipper assigned)"
            >
              <FaUserCheck /> Assign
            </button>
          )}

          <button
            className="btn-close-panel"
            onClick={onClose}
            type="button"
            title="Close"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* BODY - DQN Luxury */}
      <div className="order-panel-body luxury-panel-body">
        {/* THÔNG TIN CHUNG */}
        <section className="panel-section luxury-section">
          <h6 className="section-title luxury-section-title">
            <FaInfoCircle className="me-2" />
            General Information
          </h6>
          <div className="section-content luxury-section-content">
            <div className="luxury-info-item">
              <small className="text-muted">Order Code</small>
              <div className="fw-bold text-primary">{orderCode}</div>
            </div>
            <div className="luxury-info-item">
              <small className="text-muted">Created Date</small>
              <div>{formatDate(normalizedOrder.created_at)}</div>
            </div>
            <div className="luxury-info-item">
              <small className="text-muted">Payment Method</small>
              <div>{paymentLabel}</div>
            </div>
            <div className="luxury-info-item">
              <small className="text-muted">Shipping Fee Payer</small>
              <div className="fw-semibold">{payerTypeLabel}</div>
            </div>
            {normalizedOrder.total_amount && (
              <div className="luxury-info-item">
                <small className="text-muted">Total Amount</small>
                <div className="fw-bold text-success">
                  {parseFloat(normalizedOrder.total_amount).toLocaleString("en-US")} ₫
                </div>
              </div>
            )}
          </div>
        </section>

        {/* NGƯỜI GỬI */}
        <section className="panel-section luxury-section">
          <h6 className="section-title luxury-section-title">
            <FaUser className="me-2" />
            Sender
          </h6>
          <div className="section-content luxury-section-content">
            <div className="luxury-info-item">
              <small className="text-muted">Tên</small>
              <div className="fw-semibold">{normalizedOrder.sender_name || "-"}</div>
            </div>
            <div className="luxury-info-item">
              <small className="text-muted">
                <FaPhone className="me-1" style={{ fontSize: "0.75rem" }} />
                Phone
              </small>
              <div>{normalizedOrder.sender_phone || "-"}</div>
            </div>
            <div className="luxury-info-item">
              <small className="text-muted">
                <FaMapMarkerAlt className="me-1" style={{ fontSize: "0.75rem" }} />
                Address
              </small>
              <div>{normalizedOrder.sender_address || "-"}</div>
            </div>
            <div className="luxury-info-item">
              <small className="text-muted d-flex align-items-center">
                <FaMapMarkerAlt className="me-1" style={{ fontSize: "0.75rem" }} />
                Pickup Area
              </small>
              <div className="fw-semibold text-primary">{getArea(normalizedOrder.sender_address)}</div>
            </div>
          </div>
        </section>

        {/* NGƯỜI NHẬN */}
        <section className="panel-section luxury-section">
          <h6 className="section-title luxury-section-title">
            <FaUser className="me-2" />
            Receiver
          </h6>
          <div className="section-content luxury-section-content">
            <div className="luxury-info-item">
              <small className="text-muted">Tên</small>
              <div className="fw-semibold">{normalizedOrder.receiver_name || "-"}</div>
            </div>
            <div className="luxury-info-item">
              <small className="text-muted">
                <FaPhone className="me-1" style={{ fontSize: "0.75rem" }} />
                Phone
              </small>
              <div>{normalizedOrder.receiver_phone || "-"}</div>
            </div>
            {normalizedOrder.receiver_email && (
              <div className="luxury-info-item">
                <small className="text-muted">
                  <FaEnvelope className="me-1" style={{ fontSize: "0.75rem" }} />
                  Email
                </small>
                <div>{normalizedOrder.receiver_email}</div>
              </div>
            )}
            <div className="luxury-info-item">
              <small className="text-muted">
                <FaMapMarkerAlt className="me-1" style={{ fontSize: "0.75rem" }} />
                Address
              </small>
              <div>{normalizedOrder.receiver_address || "-"}</div>
            </div>
            <div className="luxury-info-item">
              <small className="text-muted d-flex align-items-center">
                <FaMapMarkerAlt className="me-1" style={{ fontSize: "0.75rem" }} />
                Delivery Area
              </small>
              <div className="fw-semibold text-success">{getArea(normalizedOrder.receiver_address)}</div>
            </div>
          </div>
        </section>

        {/* THÔNG TIN HÀNG HÓA */}
        <section className="panel-section luxury-section">
          <h6 className="section-title luxury-section-title">
            <FaBox className="me-2" />
            Item Information
          </h6>
          <div className="section-content luxury-section-content">
            {categoryName !== "-" && (
              <div className="luxury-info-item">
                <small className="text-muted">
                  <FaTag className="me-1" style={{ fontSize: "0.75rem" }} />
                  Category
                </small>
                <div>{categoryName}</div>
              </div>
            )}
            <div className="luxury-info-item">
              <small className="text-muted">
                <FaWeight className="me-1" style={{ fontSize: "0.75rem" }} />
                Weight
              </small>
              <div className="fw-semibold">{weightDisplay}</div>
            </div>
            {(normalizedOrder.length || normalizedOrder.width || normalizedOrder.height) && (
              <div className="luxury-info-item">
                <small className="text-muted">
                  <FaRuler className="me-1" style={{ fontSize: "0.75rem" }} />
                  Dimensions (L x W x H)
                </small>
                <div>
                  {normalizedOrder.length || 0} cm × {normalizedOrder.width || 0} cm × {normalizedOrder.height || 0} cm
                </div>
              </div>
            )}
            {serviceTypeName !== "-" && (
              <div className="luxury-info-item">
                <small className="text-muted">
                  <FaTruck className="me-1" style={{ fontSize: "0.75rem" }} />
                  Service Type
                </small>
                <div>{serviceTypeName}</div>
              </div>
            )}
            {normalizedOrder.distance_km && (
              <div className="luxury-info-item">
                <small className="text-muted">Distance</small>
                <div>{parseFloat(normalizedOrder.distance_km).toFixed(2)} km</div>
              </div>
            )}
          </div>
        </section>

        {/* VẬN CHUYỂN */}
        <section className="panel-section luxury-section">
          <h6 className="section-title luxury-section-title">
            <FaTruck className="me-2" />
            Shipping
          </h6>
          <div className="section-content luxury-section-content">
            <div className="luxury-info-item">
              <small className="text-muted">Assigned Agent</small>
              <div>{agentName}</div>
            </div>
            <div className="luxury-info-item">
              <small className="text-muted">Shipper</small>
              <div>{shipperName}</div>
            </div>
            <div className="luxury-info-item">
              <small className="text-muted">
                <FaMoneyBillWave className="me-1" style={{ fontSize: "0.75rem" }} />
                COD Amount
              </small>
              <div className="fw-semibold text-warning">
              {normalizedOrder.cod_amount
                  ? parseFloat(normalizedOrder.cod_amount).toLocaleString("en-US") + " ₫"
                  : "0 ₫"}
              </div>
            </div>
            <div className="luxury-info-item">
              <small className="text-muted">Shipping Fee</small>
              <div className="fw-bold text-success">
              {normalizedOrder.total_shipping_fee
                  ? parseFloat(normalizedOrder.total_shipping_fee).toLocaleString("en-US") + " ₫"
                  : "0 ₫"}
              </div>
            </div>
          </div>
        </section>

        {/* ẢNH SẢN PHẨM */}
        {(pickupImages.length > 0 || deliveryImages.length > 0 || failedImages.length > 0) && (
          <section className="panel-section luxury-section">
            <h6 className="section-title luxury-section-title">
              <FaImage className="me-2" />
              Product Images
            </h6>
            <div className="section-content luxury-section-content">
              {pickupImages.length > 0 && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-2">
                    <strong>Pickup Images ({pickupImages.length})</strong>
                  </small>
                  <div className="luxury-image-grid">
                    {pickupImages.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="luxury-image-item"
                        onClick={() => handleImageClick(idx, "pickup")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleImageClick(idx, "pickup");
                          }
                        }}
                      >
                        <img
                          src={img.image_url}
                          alt={`Pickup ${idx + 1}`}
                          className="luxury-preview-img"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/150?text=Image+Error";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {deliveryImages.length > 0 && (
                <div className={failedImages.length > 0 ? "mb-3" : ""}>
                  <small className="text-muted d-block mb-2">
                    <strong>Delivery Images ({deliveryImages.length})</strong>
                  </small>
                  <div className="luxury-image-grid">
                    {deliveryImages.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="luxury-image-item"
                        onClick={() => handleImageClick(idx, "delivery")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleImageClick(idx, "delivery");
                          }
                        }}
                      >
                        <img
                          src={img.image_url}
                          alt={`Delivery ${idx + 1}`}
                          className="luxury-preview-img"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/150?text=Image+Error";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {failedImages.length > 0 && (
                <div>
                  <small className="text-muted d-block mb-2">
                    <strong className="text-danger">Failed Proof Images ({failedImages.length})</strong>
                  </small>
                  <div className="luxury-image-grid">
                    {failedImages.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="luxury-image-item"
                        onClick={() => handleImageClick(idx, "failed")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleImageClick(idx, "failed");
                          }
                        }}
                      >
                        <img
                          src={img.image_url}
                          alt={`Failed Proof ${idx + 1}`}
                          className="luxury-preview-img"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/150?text=Image+Error";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* GHI CHÚ */}
        <section className="panel-section luxury-section">
          <h6 className="section-title luxury-section-title">
            <FaInfoCircle className="me-2" />
            Notes
          </h6>
          <div className="section-content luxury-section-content">
            <div className="luxury-note">
              {normalizedOrder.notes || "No notes."}
            </div>
          </div>
        </section>
      </div>
    </div>

    {/* Image Modal */}
    <ImageModal
      images={allImages}
      isOpen={showImageModal}
      onClose={() => setShowImageModal(false)}
      initialIndex={selectedImageIndex}
    />
    </>
  );
}
  