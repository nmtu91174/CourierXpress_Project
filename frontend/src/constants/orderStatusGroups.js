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
  all: "All",
  pending: "Pending",
  approved: "Approved",
  handling: "In Transit",
  completed: "Completed",
  exception: "Exception",
};

export const STATUS_GROUP_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "handling", label: "In Transit" },
  { value: "completed", label: "Completed" },
  { value: "exception", label: "Exception" },
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

