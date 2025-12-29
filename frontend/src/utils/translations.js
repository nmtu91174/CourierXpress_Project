// frontend/src/utils/translations.js
// Enterprise Translation Utilities for Customer Pages

/**
 * Translate status text from Vietnamese to English (Enterprise Standard)
 */
export const translateStatus = (statusText) => {
  if (!statusText) return "Unknown";
  
  const normalized = statusText.trim();
  
  const statusMap = {
    // Vietnamese → English (Enterprise Standard) - Exact match first
    "Đã tạo đơn": "Booked",
    "Đã duyệt": "Approved",
    "Đã giao shipper": "Assigned",
    "Đã gán shipper (chờ pickup)": "Assigned (Awaiting Pickup)",
    "Đã gán shipper": "Assigned",
    "Đang giao hàng": "In Progress",
    "Đã lấy hàng và đang giao": "In Progress",
    "Đã giao hàng": "Delivered",
    "Giao thành công": "Delivered",
    "Giao hàng thất bại": "Delivery Failed",
    "Đã hủy": "Cancelled",
    
    // Already English (keep as is)
    "Booked": "Booked",
    "Approved": "Approved",
    "Assigned": "Assigned",
    "Assigned (Awaiting Pickup)": "Assigned (Awaiting Pickup)",
    "In Progress": "In Progress",
    "Delivered": "Delivered",
    "Delivery Failed": "Delivery Failed",
    "Cancelled": "Cancelled",
  };
  
  // Exact match first
  if (statusMap[normalized]) {
    return statusMap[normalized];
  }
  
  // Case-insensitive partial matching
  const lowerNormalized = normalized.toLowerCase();
  for (const [vn, en] of Object.entries(statusMap)) {
    if (lowerNormalized.includes(vn.toLowerCase()) || 
        vn.toLowerCase().includes(lowerNormalized)) {
      return en;
    }
  }

  return statusText; // Return original if no translation found
};

/**
 * Translate fee names from Vietnamese to English (Enterprise Standard)
 */
export const translateFeeName = (feeName) => {
  if (!feeName) return feeName;
  
  const normalized = feeName.trim();
  
  const feeMap = {
    // Vietnamese → English (Enterprise Standard)
    "Phí theo trọng lượng": "Weight Fee",
    "Phí theo km": "Distance Fee",
    "Giá trị Thu Hộ (COD)": "COD Amount",
    "Cash on Delivery": "COD Amount",
    "Thu Hộ": "COD Amount",
    "COD": "COD Amount",
    "Phí theo thể tích": "Volume Fee",
  };

  // Exact match first
  if (feeMap[normalized]) {
    return feeMap[normalized];
  }
  
  // Case-insensitive partial matching
  const lowerNormalized = normalized.toLowerCase();
  for (const [vn, en] of Object.entries(feeMap)) {
    if (lowerNormalized.includes(vn.toLowerCase()) || 
        vn.toLowerCase().includes(lowerNormalized)) {
      return en;
    }
  }

  return feeName; // Return original if no translation found
};
