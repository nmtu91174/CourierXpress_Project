// frontend/src/pages/admin/CustomerManagement.jsx
// Admin Customer Search / Filter Page - REAL DATA - DQN LUXURY

import React, { useEffect, useState, useMemo } from "react";
import { Card, Table, Form, InputGroup, Spinner, Button, Alert } from "react-bootstrap";
import { FaSearch, FaUser, FaPhone, FaEnvelope, FaShoppingCart, FaChevronLeft, FaChevronRight, FaBell, FaTimes, FaCheckCircle } from "react-icons/fa";
import "../../assets/styles/admin.css";
import "../../assets/styles/order-table.css";
import "../../assets/styles/StatusBadge.css";
import "../../assets/styles/customer-management.css";
import "../../assets/styles/order.css";
import "../../assets/styles/dashboard.css";

export default function CustomerManagement() {
  const API_BASE = "http://localhost:8888/api/admin";
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected customers for notification (checkbox)
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  // Notification modal states
  const [showModal, setShowModal] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

  useEffect(() => {
    fetchCustomers();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/get_notification_templates.php`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await res.json();
      if (data.status === "success" && data.data?.templates) {
        setTemplates(data.data.templates);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  // Handle checkbox selection
  const handleCustomerToggle = (customerId) => {
    setSelectedCustomers((prev) => {
      if (prev.includes(customerId)) {
        return prev.filter((id) => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  // Handle select all on current page
  const handleSelectAll = () => {
    const currentPageIds = paginatedCustomers.map((c) => c.id);
    const allSelected = currentPageIds.every((id) => selectedCustomers.includes(id));
    
    if (allSelected) {
      // Deselect all on current page
      setSelectedCustomers((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      // Select all on current page
      setSelectedCustomers((prev) => {
        const newSelection = [...prev];
        currentPageIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const handleOpenModal = () => {
    if (selectedCustomers.length === 0) {
      setAlert({
        show: true,
        type: "warning",
        message: "Vui lòng chọn ít nhất một khách hàng",
      });
      return;
    }
    setSelectedTemplate("");
    setNotificationTitle("");
    setNotificationMessage("");
    setAlert({ show: false, type: "", message: "" });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTemplate("");
    setNotificationTitle("");
    setNotificationMessage("");
    setAlert({ show: false, type: "", message: "" });
  };

  const handleSendNotification = async () => {
    if (!selectedTemplate) {
      setAlert({
        show: true,
        type: "danger",
        message: "Vui lòng chọn template thông báo",
      });
      return;
    }

    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      setAlert({
        show: true,
        type: "danger",
        message: "Vui lòng nhập tiêu đề và nội dung thông báo",
      });
      return;
    }

    if (selectedCustomers.length === 0) {
      setAlert({
        show: true,
        type: "danger",
        message: "Vui lòng chọn ít nhất một khách hàng",
      });
      return;
    }

    setSending(true);
    setAlert({ show: false, type: "", message: "" });

    try {
      // Send notification to each selected customer
      const promises = selectedCustomers.map(async (customerId) => {
        const payload = {
          template_name: selectedTemplate,
          target_type: "single",
          target_user_id: customerId,
          custom_title: notificationTitle.trim(),
          custom_message: notificationMessage.trim(),
        };

        const res = await fetch(`${API_BASE}/send_notification.php`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        return { customerId, success: data.status === "success", data };
      });

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        setAlert({
          show: true,
          type: "success",
          message: `Đã gửi thông báo thành công cho ${successCount} khách hàng`,
        });
        
        // Clear selection and auto close modal after 2 seconds
        setTimeout(() => {
          setSelectedCustomers([]);
          handleCloseModal();
        }, 2000);
      } else if (successCount > 0) {
        setAlert({
          show: true,
          type: "warning",
          message: `Đã gửi thành công cho ${successCount} khách hàng, thất bại ${failCount} khách hàng`,
        });
      } else {
        setAlert({
          show: true,
          type: "danger",
          message: "Gửi thông báo thất bại cho tất cả khách hàng",
        });
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      setAlert({
        show: true,
        type: "danger",
        message: "Lỗi kết nối. Vui lòng thử lại.",
      });
    } finally {
      setSending(false);
    }
  };

  const selectedTemplateData = templates.find((t) => t.name === selectedTemplate);

  // Auto-fill title and message when template is selected
  useEffect(() => {
    if (selectedTemplateData) {
      setNotificationTitle(selectedTemplateData.title_template || "");
      setNotificationMessage(selectedTemplateData.message_template || "");
    } else {
      setNotificationTitle("");
      setNotificationMessage("");
    }
  }, [selectedTemplateData]);

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
        <div className="d-flex align-items-center gap-3">
          {selectedCustomers.length > 0 && (
            <Button
              variant="primary"
              onClick={handleOpenModal}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaBell />
              Send Notification ({selectedCustomers.length})
            </Button>
          )}
          <div className="text-muted">
            Total: <strong>{filteredCustomers.length}</strong> customers
            {filteredCustomers.length > 0 && (
              <span className="ms-2">
                (Page {currentPage}/{totalPages})
              </span>
            )}
          </div>
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
                    <th style={{ width: "40px" }}>
                      <Form.Check
                        type="checkbox"
                        checked={paginatedCustomers.length > 0 && paginatedCustomers.every((c) => selectedCustomers.includes(c.id))}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th style={{ minWidth: "180px" }}>Customer Name</th>
                    <th style={{ minWidth: "120px" }}>Phone</th>
                    <th style={{ minWidth: "200px" }}>Email</th>
                    <th className="text-center" style={{ width: "100px" }}>Orders</th>
                    <th style={{ width: "90px" }}>Status</th>
                    <th style={{ width: "100px" }}>Created</th>
                    <th className="text-center" style={{ width: "80px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((customer) => (
                    <tr key={customer.id} className="customer-row">
                      <td data-label="">
                        <Form.Check
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => handleCustomerToggle(customer.id)}
                        />
                      </td>
                      <td data-label="Customer">
                        <div className="d-flex align-items-center">
                          <FaUser className="text-primary me-2" />
                          <strong>{customer.name || "N/A"}</strong>
                        </div>
                      </td>
                      <td data-label="Phone">
                        <div className="d-flex align-items-center">
                          <FaPhone className="text-muted me-2" />
                          {customer.phone || "N/A"}
                        </div>
                      </td>
                      <td data-label="Email">
                        <div className="d-flex align-items-center">
                          <FaEnvelope className="text-muted me-2" />
                          <small className="text-truncate" style={{ maxWidth: "180px" }}>
                            {customer.email || "N/A"}
                          </small>
                        </div>
                      </td>
                      <td className="text-center" data-label="Orders">
                        <span className="badge-orders-luxury">
                          <FaShoppingCart className="me-1" />
                          {customer.total_orders || 0}
                        </span>
                      </td>
                      <td data-label="Status">
                        <span className={`badge-status-luxury ${customer.status === "active" ? "badge-active" : "badge-inactive"}`}>
                          {customer.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td data-label="Created">
                        <small className="text-muted">{formatDate(customer.created_at)}</small>
                      </td>
                      <td data-label="Actions">
                        <div className="d-flex gap-2 justify-content-center">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => {
                              setSelectedCustomers([customer.id]);
                              handleOpenModal();
                            }}
                            title="Send Notification"
                          >
                            <FaBell />
                          </Button>
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

      {/* ================= MODAL SEND NOTIFICATION - DQN LUXURY ================= */}
      {showModal && (
        <div className="dqn-modal-overlay" onClick={handleCloseModal}>
          <div className="dqn-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="dqn-modal-header" style={{ background: "linear-gradient(135deg, #007bff, #35a0ff)" }}>
              <div className="dqn-modal-title">
                <FaBell /> Send Notification
              </div>
              <button className="dqn-modal-close" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="dqn-modal-body">
              {alert.show && (
                <Alert 
                  variant={alert.type} 
                  dismissible 
                  onClose={() => setAlert({ show: false, type: "", message: "" })}
                  className="mb-3"
                >
                  {alert.message}
                </Alert>
              )}

              <Form>
                {/* Section 1: Recipients (Readonly) */}
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold d-flex align-items-center mb-2">
                    <FaUser className="me-2 text-primary" /> Recipients:
                  </Form.Label>
                  <div 
                    className="p-3" 
                    style={{ 
                      background: "linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(59, 130, 246, 0.08))",
                      borderRadius: "8px",
                      border: "1px solid rgba(37, 99, 235, 0.2)",
                      maxHeight: "200px",
                      overflowY: "auto"
                    }}
                  >
                    {selectedCustomers.length === 0 ? (
                      <span className="text-muted">No customers selected</span>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {selectedCustomers.map((customerId) => {
                          const customer = customers.find((c) => c.id === customerId);
                          if (!customer) return null;
                          return (
                            <div 
                              key={customerId} 
                              className="d-flex align-items-center gap-2 p-2"
                              style={{
                                background: "#fff",
                                borderRadius: "6px",
                                border: "1px solid rgba(37, 99, 235, 0.1)"
                              }}
                            >
                              <FaCheckCircle className="text-success" />
                              <strong>{customer.name}</strong>
                              <span className="text-muted small">({customer.email})</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Form.Text className="text-muted">
                    {selectedCustomers.length} customer(s) selected
                  </Form.Text>
                </Form.Group>

                {/* Section 2: Notification Template */}
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold d-flex align-items-center mb-2">
                    Template: <span className="text-danger ms-1">*</span>
                  </Form.Label>
                  <Form.Select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    disabled={sending}
                    className="luxury-select"
                    size="lg"
                  >
                    <option value="">-- Select Template --</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.name}>
                        {template.name} ({template.type})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Choose a notification template to use
                  </Form.Text>
                </Form.Group>

                {/* Section 3: Message Preview (Auto-fill, Editable) */}
                {selectedTemplate && (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold mb-2">
                        Title: <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={notificationTitle}
                        onChange={(e) => setNotificationTitle(e.target.value)}
                        disabled={sending}
                        className="luxury-input"
                        placeholder="Notification title..."
                      />
                      <Form.Text className="text-muted">
                        Auto-filled from template, you can edit it
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="fw-bold mb-2">
                        Message: <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={6}
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                        disabled={sending}
                        className="luxury-textarea"
                        placeholder="Notification message..."
                      />
                      <Form.Text className="text-muted">
                        Auto-filled from template, you can edit it
                      </Form.Text>
                    </Form.Group>
                  </>
                )}
              </Form>
            </div>

            {/* Footer */}
            <div className="dqn-modal-footer">
              <Button 
                variant="secondary" 
                onClick={handleCloseModal} 
                disabled={sending}
                className="btn-lux-outline-secondary"
              >
                <FaTimes className="me-2" /> Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSendNotification}
                disabled={sending || !selectedTemplate || !notificationTitle.trim() || !notificationMessage.trim() || selectedCustomers.length === 0}
                className="btn-lux-primary"
              >
                {sending ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaBell className="me-2" /> Send Notification
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

