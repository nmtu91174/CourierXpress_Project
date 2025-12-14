// components/common/StatusBadge.jsx
import React from "react";
import "../../assets/styles/statusBadge.css";
import { ORDER_STATUS, ORDER_STATUS_LABEL } from "../../constants/orderStatus";

/**
 * StatusBadge - Enterprise Workflow (Option B)
 * Status Map: 1=BOOKED, 2=APPROVED, 3=ASSIGNED, 4=PICKED_UP, 5=DELIVERED, 6=FAILED, 7=CANCELLED
 */
export default function StatusBadge({ status }) {
  const statusNum = Number(status);
  const label = ORDER_STATUS_LABEL[statusNum] || "Unknown";
  
  let cls = "sb-default";
  
  switch (statusNum) {
    case ORDER_STATUS.BOOKED: // 1
      cls = "sb-blue";
      break;
    case ORDER_STATUS.APPROVED: // 2
      cls = "sb-indigo";
      break;
    case ORDER_STATUS.ASSIGNED: // 3
      cls = "sb-purple";
      break;
    case ORDER_STATUS.IN_PROGRESS: // 4
      cls = "sb-orange";
      break;
    case ORDER_STATUS.DELIVERED: // 5
      cls = "sb-green";
      break;
    case ORDER_STATUS.FAILED: // 6 (terminal)
      cls = "sb-red";
      break;
    case ORDER_STATUS.CANCELLED: // 7 (terminal)
      cls = "sb-gray";
      break;
    default:
      cls = "sb-default";
      break;
  }

  return <span className={`status-badge-lux ${cls}`}>{label}</span>;
}
