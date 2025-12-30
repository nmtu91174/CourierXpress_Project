// frontend/src/pages/admin/CustomerManagement.jsx
// Admin Customer Search / Filter Page - REAL DATA - DQN LUXURY

import React, { useEffect, useState, useMemo } from "react";
import { Card, Table, Form, InputGroup, Spinner, Button } from "react-bootstrap";
import { FaSearch, FaUser, FaPhone, FaEnvelope, FaShoppingCart, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "../../assets/styles/admin.css";
import "../../assets/styles/order-table.css";
import "../../assets/styles/StatusBadge.css";
import "../../assets/styles/customer-management.css";

export default function CustomerManagement() {
  const API_BASE = "http://localhost:8888/api/admin";
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Client-side filtering by name or phone
    if (!searchText.trim()) {
      setFilteredCustomers(customers);
    } else {
      const searchLower = searchText.toLowerCase().trim();
      const filtered = customers.filter(
        (customer) =>
          customer.name?.toLowerCase().includes(searchLower) ||
          customer.phone?.toLowerCase().includes(searchLower)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchText, customers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/get_customers.php`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch customers");
      }

      const data = await res.json();
      if (data.status === "success" && data.data?.customers) {
        setCustomers(data.data.customers);
        setFilteredCustomers(data.data.customers);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Pagination calculation
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Đang tải danh sách khách hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 customer-management-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Customer Management</h2>
        <div className="text-muted">
          Total: <strong>{filteredCustomers.length}</strong> customers
          {filteredCustomers.length > 0 && (
            <span className="ms-2">
              (Page {currentPage}/{totalPages})
            </span>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <Card className="card-lux mb-4">
        <Card.Body>
          <InputGroup>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </InputGroup>
        </Card.Body>
      </Card>

      {/* Customer Table - DQN LUXURY */}
      <Card className="card-lux">
        <Card.Body className="p-0">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-5">
              <FaUser size={48} className="text-muted mb-3" />
              <p className="text-muted">
                {searchText ? "Không tìm thấy khách hàng nào" : "Chưa có khách hàng nào"}
              </p>
            </div>
          ) : (
            <div className="lux-table-wrapper">
              <Table className="lux-table mb-0">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th className="text-center">Total Orders</th>
                    <th>Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((customer) => (
                    <tr key={customer.id} className="customer-row">
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUser className="text-primary me-2" />
                          <strong>{customer.name || "N/A"}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaPhone className="text-muted me-2" />
                          {customer.phone || "N/A"}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaEnvelope className="text-muted me-2" />
                          <small className="text-truncate" style={{ maxWidth: "200px" }}>
                            {customer.email || "N/A"}
                          </small>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="badge-orders-luxury">
                          <FaShoppingCart className="me-1" />
                          {customer.total_orders || 0}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status-luxury ${customer.status === "active" ? "badge-active" : "badge-inactive"}`}>
                          {customer.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">{formatDate(customer.created_at)}</small>
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
      {filteredCustomers.length > 0 && (
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

