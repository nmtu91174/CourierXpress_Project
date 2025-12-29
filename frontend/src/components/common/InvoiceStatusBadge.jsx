// components/common/InvoiceStatusBadge.jsx
import React from "react";
import "../../assets/styles/statusBadge.css";

/**
 * InvoiceStatusBadge - Luxury style badge for invoice status
 * Status: paid, unpaid, cancelled
 */
export default function InvoiceStatusBadge({ status }) {
  const statusLower = (status || "").toLowerCase();
  let cls = "sb-default";
  let label = "UNKNOWN";

  switch (statusLower) {
    case "paid":
      cls = "sb-green";
      label = "PAID";
      break;
    case "unpaid":
      cls = "sb-orange";
      label = "UNPAID";
      break;
    case "cancelled":
      cls = "sb-gray";
      label = "CANCELLED";
      break;
    default:
      cls = "sb-default";
      label = status ? status.toUpperCase() : "UNKNOWN";
      break;
  }

  return <span className={`status-badge-lux ${cls}`}>{label}</span>;
}

