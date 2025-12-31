// frontend/src/pages/agent/OrderReport.jsx
// Agent Order Report + CSV Export - REAL DATA - DQN LUXURY

import React, { useEffect, useState, useMemo } from "react";
import { Card, Table, Button, Spinner, Form } from "react-bootstrap";
import { FaFileCsv, FaBox, FaChevronLeft, FaChevronRight, FaDollarSign, FaCalendarAlt } from "react-icons/fa";
import StatusBadge from "../../components/common/StatusBadge";
import "../../assets/styles/admin.css";
import "../../assets/styles/order-table.css";
import "../../assets/styles/StatusBadge.css";
import "../../assets/styles/order-report.css";
import "../../assets/styles/agent_dashboard.css";

export default function OrderReport() {
  const API_BASE = "http://localhost:8888/api/agent";
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchOrderReport();
  }, []);

  const fetchOrderReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/get_order_report.php`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch order report");
      }

      const data = await res.json();
      if (data.status === "success" && data.data?.orders) {
        setOrders(data.data.orders);
      }
    } catch (error) {
      console.error("Error fetching order report:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (orders.length === 0) {
      alert("Không có dữ liệu để export");
      return;
    }

    // CSV Headers
    const headers = ["Order Code", "Status", "Total Amount", "Created At"];
    
    // CSV Rows
    const rows = orders.map((order) => [
      order.order_code || "",
      order.status || "",
      order.total_amount?.toFixed(2) || "0.00",
      order.created_at || "",
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Add BOM for UTF-8 Excel compatibility
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

    // Create download link
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `agent_order_report_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount) => {
    if (!amount) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("vi-VN");
    } catch {
      return dateString;
    }
  };

  // Map status string to status number for StatusBadge
  const getStatusNumber = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("delivered") || statusLower.includes("giao thành công")) {
      return 5; // DELIVERED
    } else if (statusLower.includes("failed") || statusLower.includes("thất bại")) {
      return 6; // FAILED
    } else if (statusLower.includes("cancelled") || statusLower.includes("hủy")) {
      return 7; // CANCELLED
    } else if (statusLower.includes("picked") || statusLower.includes("đã lấy")) {
      return 4; // PICKED_UP
    } else if (statusLower.includes("assigned") || statusLower.includes("đã phân công")) {
      return 3; // ASSIGNED
    } else if (statusLower.includes("approved") || statusLower.includes("đã duyệt")) {
      return 2; // APPROVED
    } else {
      return 1; // BOOKED
    }
  };

  // Pagination calculation
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return orders.slice(startIndex, endIndex);
  }, [orders, currentPage, pageSize]);

  const totalPages = Math.ceil(orders.length / pageSize);

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Đang tải báo cáo đơn hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page container-fluid p-0" style={{ background: "transparent" }}>
      {/* ================= HEADER ================= */}
      <div className="page-header d-flex justify-content-between mb-4">
        <div>
          <h3 className="fw-bold">Order Report</h3>
          <p className="text-muted mb-0">View and export your order reports</p>
        </div>
        <Button variant="primary" onClick={exportToCSV} className="btn-lux-primary">
          <FaFileCsv className="me-2" />
          Export CSV
        </Button>
      </div>

      {/* ================= TABLE ================= */}
      <Card className="card-lux mb-4">
        <Card.Body>
          {orders.length === 0 ? (
            <div className="text-center py-5">
              <FaBox size={48} className="text-muted mb-3" />
              <p className="text-muted">Chưa có đơn hàng nào được phân công</p>
            </div>
          ) : (
            <div className="lux-table-wrapper">
              <Table hover responsive className="lux-table align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: "150px" }}>Order Code</th>
                    <th style={{ width: "130px" }}>Status</th>
                    <th className="text-end" style={{ width: "180px" }}>Total Amount</th>
                    <th style={{ width: "200px" }}>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="order-row">
                      {/* Order Code */}
                      <td>
                        <div className="d-flex align-items-center">
                          <FaBox className="text-primary me-2 flex-shrink-0" />
                          <span className="order-code fw-semibold text-primary">
                            {order.order_code || "N/A"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge status={getStatusNumber(order.status)} />
                      </td>

                      {/* Total Amount */}
                      <td className="text-end">
                        <div className="d-flex align-items-center justify-content-end">
                          <FaDollarSign className="text-success me-2 flex-shrink-0" />
                          <strong className="text-success">{formatCurrency(order.total_amount)}</strong>
                        </div>
                      </td>

                      {/* Created At */}
                      <td>
                        <div className="d-flex align-items-center">
                          <FaCalendarAlt className="text-muted me-2 flex-shrink-0" />
                          <small className="text-muted">{formatDate(order.created_at)}</small>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ===================== PAGINATION UI ===================== */}
      {orders.length > 0 && (
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
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
              {orders.length > 0 && (
                <span className="text-muted ms-2">({orders.length} orders)</span>
              )}
            </span>

            <Button
              className="luxury-pagination-btn"
              variant="outline-primary"
              size="sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
      )}
    </div>
  );
}
