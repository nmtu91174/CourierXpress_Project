// frontend/src/pages/Invoice/InvoiceList.jsx
// Enterprise Invoice List Page

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Row, Col, Table, Button, Form, Badge, Alert } from "react-bootstrap";
import { FaFileInvoice, FaEye, FaPrint, FaFileExcel, FaSearch, FaSync, FaDownload, FaEnvelope } from "react-icons/fa";
import Swal from "sweetalert2";
import { invoiceService } from "../../services/invoice.service";
import InvoiceStatusBadge from "../../components/common/InvoiceStatusBadge";
import "../../assets/styles/invoice.css";
import "../../assets/styles/order-table.css";

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [hoveredInvoiceId, setHoveredInvoiceId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, pageSize, filterStatus, searchText]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      console.log("Fetching invoices with params:", {
        page: currentPage,
        limit: pageSize,
        status: filterStatus !== "all" ? filterStatus : undefined,
        search: searchText || undefined,
      });

      const data = await invoiceService.getInvoiceList({
        page: currentPage,
        limit: pageSize,
        status: filterStatus !== "all" ? filterStatus : undefined,
        search: searchText || undefined,
      });

      console.log("Invoice data received:", data);
      console.log("Invoice items:", data.items || []);

      setInvoices(data.items || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
      setError(null);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      console.error("Error details:", error.message, error.stack);
      setInvoices([]);
      setError(error.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };


  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    return (
      <div style={{ lineHeight: 1.4 }}>
        <div>{dateStr}</div>
        <div className="text-muted small" style={{ fontSize: "0.8rem" }}>{timeStr}</div>
      </div>
    );
  };

  const handleCreateMissingInvoices = async () => {
    try {
      const result = await Swal.fire({
        title: "Create Missing Invoices?",
        text: "This will create invoices for all delivered orders that don't have invoices.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, create them",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) return;

      setLoading(true);
      const response = await fetch("http://localhost:8888/api/admin/create_missing_invoices.php", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.status === "success") {
        await Swal.fire({
          title: "Success!",
          text: `Created ${data.data.invoices_created} invoices for ${data.data.orders_found} orders.`,
          icon: "success",
        });
        // Refresh invoice list
        fetchInvoices();
      } else {
        Swal.fire({
          title: "Error",
          text: data.message || "Failed to create invoices",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error creating missing invoices:", error);
      Swal.fire({
        title: "Error",
        text: error.message || "Failed to create invoices",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invoice-list-page container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-2">
            <FaFileInvoice className="me-2" style={{ color: "#007bff" }} />
            Invoice Management
          </h2>
          <p className="text-muted mb-0">View and manage all invoices</p>
        </div>
        {totalCount === 0 && !loading && (
          <Button
            variant="primary"
            onClick={handleCreateMissingInvoices}
            className="btn-lux-primary-blue"
          >
            <FaSync className="me-2" />
            Create Missing Invoices
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="card-lux mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="lux-label">Search Invoice</Form.Label>
                <div className="position-relative">
                  <FaSearch className="position-absolute" style={{ left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6c757d" }} />
                  <Form.Control
                    type="text"
                    placeholder="Search by invoice number, order code..."
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="lux-input-search"
                    style={{ paddingLeft: "40px" }}
                  />
                </div>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="lux-label">Status</Form.Label>
                <Form.Select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="lux-select"
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="cancelled">Cancelled</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label className="lux-label">Rows</Form.Label>
                <Form.Select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="lux-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Invoice Table */}
      <Card className="card-lux">
        <Card.Body>
          {error && (
            <div className="alert alert-danger" role="alert">
              <strong>Error:</strong> {error}
              <br />
              <small>Please check browser console for details.</small>
            </div>
          )}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-5">
              <FaFileInvoice className="mb-3" style={{ fontSize: "3rem", color: "#adb5bd" }} />
              <p className="text-muted">No invoices found</p>
              {totalCount === 0 && (
                <>
                  <Alert variant="info" className="mt-3">
                    <strong>No invoices in the system.</strong>
                    <br />
                    Invoices are created automatically when orders are created or delivered.
                    <br />
                    You can create invoices for delivered orders that don't have invoices by clicking the button above.
                  </Alert>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table className="lux-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Order Code</th>
                      <th>Date</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                      <th>Payment Method</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => {
                      const isHovered = hoveredInvoiceId === invoice.id;
                      return (
                        <tr
                          key={invoice.id}
                          className={`cursor-pointer order-row ${isHovered ? 'hovered' : ''}`}
                          onMouseEnter={() => setHoveredInvoiceId(invoice.id)}
                          onMouseLeave={() => setHoveredInvoiceId(null)}
                          onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                        >
                          <td className="fw-semibold text-primary" data-label="Invoice #">
                            <span className="order-code">{invoice.invoice_number}</span>
                          </td>
                          <td data-label="Order Code">
                            {invoice.order?.order_code || "N/A"}
                          </td>
                          <td data-label="Date">{formatDate(invoice.created_at)}</td>
                          <td data-label="Total Amount">
                            <strong>{formatCurrency(invoice.total_amount)}</strong>
                          </td>
                          <td data-label="Status">
                            <InvoiceStatusBadge status={invoice.status} />
                          </td>
                          <td data-label="Payment Method">{invoice.payment_method_name || "N/A"}</td>
                          <td className="text-start" data-label="Actions" onClick={(e) => e.stopPropagation()}>
                            <div className="d-flex gap-1 justify-content-start">
                              {/* View - Blue (#2563eb) */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="order-action-btn btn-action-view"
                                title="View Invoice Details"
                                onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                              >
                                <FaEye />
                              </Button>
                              {/* Print - Gray (#64748b) */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="order-action-btn btn-action-print"
                                title="Print Invoice"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/invoices/${invoice.id}?action=print`);
                                }}
                              >
                                <FaPrint />
                              </Button>
                              {/* Export PDF - Red (#dc2626) */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="order-action-btn btn-action-export-pdf"
                                title="Export PDF"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/invoices/${invoice.id}?action=export-pdf`);
                                }}
                              >
                                <FaDownload />
                              </Button>
                              {/* Email - Purple (#7c3aed) */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="order-action-btn btn-action-email"
                                title="Send Invoice via Email"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/invoices/${invoice.id}?action=email`);
                                }}
                              >
                                <FaEnvelope />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {/* Pagination - Luxury Style (giống OrderManagement) */}
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

                {/* Pagination controls - Luxury Style */}
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
                    {totalCount > 0 && (
                      <span className="text-muted ms-2">({totalCount} invoices)</span>
                    )}
                  </span>

                  <Button
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
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

