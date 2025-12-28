// ===================================================
// CourierXpress – OPTION B – STATUS MAP (LOCKED)
// Single Source of Truth for Order Workflow
// ===================================================

// frontend/src/constants/orderStatus.js

/**
 * STATUS ID – PHẢI KHỚP DB `statuses.id`
 */
export const ORDER_STATUS = Object.freeze({
  BOOKED: 1,
  APPROVED: 2,
  ASSIGNED: 3,
  IN_PROGRESS: 4,
  DELIVERED: 5,
  FAILED: 6,
  CANCELLED: 7,
});

/**
 * LABEL – DÙNG CHO UI (badge / dropdown / chart)
 */
export const ORDER_STATUS_LABEL = Object.freeze({
  [ORDER_STATUS.BOOKED]: "Booked",
  [ORDER_STATUS.APPROVED]: "Approved",
  [ORDER_STATUS.ASSIGNED]: "Assigned",
  [ORDER_STATUS.IN_PROGRESS]: "Picked Up",
  [ORDER_STATUS.DELIVERED]: "Delivered",
  [ORDER_STATUS.FAILED]: "Failed",
  [ORDER_STATUS.CANCELLED]: "Cancelled",
});

/**
 * COLOR CLASS – DÙNG CHUNG TOÀN HỆ
 */
export const ORDER_STATUS_COLOR = Object.freeze({
  [ORDER_STATUS.BOOKED]: "sb-blue",
  [ORDER_STATUS.APPROVED]: "sb-indigo",
  [ORDER_STATUS.ASSIGNED]: "sb-purple",
  [ORDER_STATUS.IN_PROGRESS]: "sb-orange",
  [ORDER_STATUS.DELIVERED]: "sb-green",
  [ORDER_STATUS.FAILED]: "sb-red",
  [ORDER_STATUS.CANCELLED]: "sb-gray",
});

/**
 * TERMINAL STATES
 * - Khi đã terminal → KHÔNG CHO UPDATE / ASSIGN
 */
export const isTerminalStatus = (status) => {
  const s = Number(status);
  return (
    s === ORDER_STATUS.DELIVERED ||
    s === ORDER_STATUS.FAILED ||
    s === ORDER_STATUS.CANCELLED
  );
};

/**
 * ADMIN – ASSIGN AGENT (ENTERPRISE: FALLBACK ONLY)
 * - Status = BOOKED
 * - Chưa có agent
 * - routing_status === 'fallback_admin' OR agent_id IS NULL
 */
export const canAdminAssignAgent = (order, userRole = "admin") => {
  if (!order || userRole !== "admin") return false;

  const status = Number(order.status);
  const routingStatus = order.routing_status || 'auto';
  const hasAgent = order.agent_id !== null && order.agent_id !== undefined && Number(order.agent_id) !== 0;

  // ENTERPRISE RULE: Only allow admin assign in fallback scenarios
  return (
    status === ORDER_STATUS.BOOKED &&
    (routingStatus === 'fallback_admin' || !hasAgent)
  );
};

/**
 * ADMIN – ASSIGN SHIPPER (DEPRECATED - ENTERPRISE RULE)
 * 
 * ⚠️ ENTERPRISE: Admin must NEVER assign shipper in normal workflow.
 * Only Agent can assign shipper.
 * 
 * This function is kept for backward compatibility but should return false.
 * 
 * @deprecated Use canAssign() in OrderTable which returns false for admin
 */
export const canAdminAssignShipper = (order, userRole = "admin") => {
  // ENTERPRISE RULE: Admin cannot assign shipper
  return false;
};
