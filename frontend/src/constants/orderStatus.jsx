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
 * ADMIN – ASSIGN AGENT
 * - Status = BOOKED
 * - Chưa có agent
 */
export const canAdminAssignAgent = (order, userRole = "admin") => {
  if (!order || userRole !== "admin") return false;

  return (
    Number(order.status) === ORDER_STATUS.BOOKED &&
    (order.agent_id === null ||
      order.agent_id === undefined ||
      Number(order.agent_id) === 0)
  );
};

/**
 * ADMIN – ASSIGN SHIPPER
 * - Status = APPROVED
 * - Chưa có shipper
 */
export const canAdminAssignShipper = (order, userRole = "admin") => {
  if (!order || userRole !== "admin") return false;

  return (
    Number(order.status) === ORDER_STATUS.APPROVED &&
    (order.shipper_id === null ||
      order.shipper_id === undefined ||
      Number(order.shipper_id) === 0)
  );
};
