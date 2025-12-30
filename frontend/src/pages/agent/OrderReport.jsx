// frontend/src/pages/agent/OrderReport.jsx
// Agent Order Report + CSV Export - REAL DATA - DQN LUXURY

import React, { useEffect, useState, useMemo } from "react";
import { Card, Table, Button, Spinner, Form } from "react-bootstrap";
import { FaFileCsv, FaBox, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import StatusBadge from "../../components/common/StatusBadge";
import "../../assets/styles/admin.css";
import "../../assets/styles/order-table.css";
import "../../assets/styles/StatusBadge.css";
import "../../assets/styles/order-report.css";

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
    <div className="container-fluid py-4 order-report-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Order Report</h2>
        <div className="d-flex gap-2 align-items-center">
          <div className="text-muted me-3">
            Tổng: <strong>{orders.length}</strong> đơn hàng
            {orders.length > 0 && (
              <span className="ms-2">
                (Trang {currentPage}/{totalPages})
              </span>
            )}
          </div>
          <Button variant="primary" onClick={exportToCSV}>
            <FaFileCsv className="me-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="card-lux">
        <Card.Body className="p-0">
          {orders.length === 0 ? (
            <div className="text-center py-5">
              <FaBox size={48} className="text-muted mb-3" />
              <p className="text-muted">Chưa có đơn hàng nào được phân công</p>
            </div>
          ) : (
            <div className="lux-table-wrapper">
              <Table className="lux-table mb-0">
                <thead>
                  <tr>
                    <th>Order Code</th>
                    <th>Status</th>
                    <th className="text-end">Total Amount</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="order-row">
                      <td>
                        <div className="d-flex align-items-center">
                          <FaBox className="text-primary me-2" />
                          <strong>{order.order_code || "N/A"}</strong>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={getStatusNumber(order.status)} />
                      </td>
                      <td className="text-end">
                        <strong className="text-success">{formatCurrency(order.total_amount)}</strong>
                      </td>
                      <td>
                        <small className="text-muted">{formatDate(order.created_at)}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Pagination UI */}
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
                setCurrentPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Form.Select>
          </div>

          {/* Pagination controls */}
          <div className="d-flex align-items-center gap-3 mb-2">
            <Button
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
            >
              <FaChevronLeft className="me-1" />
              Previous
            </Button>

            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>
            </div>

            <Button
              variant="outline-primary"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              style={{
                minWidth: "100px",
                padding: "8px 20px",
                borderRadius: "8px",
                border: "1px solid rgba(37, 99, 235, 0.3)",
                background: currentPage === totalPages 
                  ? "rgba(0, 0, 0, 0.05)" 
                  : "linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.15))",
                color: currentPage === totalPages ? "rgba(0, 0, 0, 0.3)" : "#2563eb",
                fontWeight: 600,
                transition: "all 0.3s ease",
                boxShadow: currentPage === totalPages ? "none" : "0 2px 8px rgba(37, 99, 235, 0.15)",
              }}
            >
              Next
              <FaChevronRight className="ms-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
