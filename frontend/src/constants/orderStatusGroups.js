// frontend/src/constants/orderStatusGroups.js
// Enterprise Order Status Groups

export const ORDER_STATUS_GROUPS = {
  pending: [1],              // BOOKED
  approved: [2],             // APPROVED
  handling: [3, 4],          // ASSIGNED + IN_PROGRESS
  completed: [5],            // DELIVERED
  exception: [6, 7],         // FAILED / CANCELLED
};

export const STATUS_GROUP_LABELS = {
  all: "Tất cả",
  pending: "Đang chờ xử lý",
  approved: "Đã duyệt",
  handling: "Đang giao",
  completed: "Hoàn thành",
  exception: "Sự cố",
};

export const STATUS_GROUP_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Đang chờ xử lý" },
  { value: "approved", label: "Đã duyệt" },
  { value: "handling", label: "Đang giao" },
  { value: "completed", label: "Hoàn thành" },
  { value: "exception", label: "Sự cố" },
];

// Helper function để check status có trong group không
export const isStatusInGroup = (status, group) => {
  if (group === "all") return true;
  const statusNum = Number(status);
  return ORDER_STATUS_GROUPS[group]?.includes(statusNum) || false;
};

// Get all statuses in a group
export const getStatusesInGroup = (group) => {
  if (group === "all") return [];
  return ORDER_STATUS_GROUPS[group] || [];
};

