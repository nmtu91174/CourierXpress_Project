// frontend/src/pages/admin/NotificationTemplates.jsx
// Admin Notification Template Management - REAL DB - DQN LUXURY

import React, { useEffect, useState } from "react";
import { Card, Table, Button, Form, Spinner } from "react-bootstrap";
import { FaPlus, FaEdit, FaTrash, FaBell, FaExclamationTriangle, FaBox, FaTimes } from "react-icons/fa";
import Swal from "sweetalert2";
import "../../assets/styles/admin.css";
import "../../assets/styles/order-table.css";
import "../../assets/styles/order.css";
import "../../assets/styles/notification-templates.css";
import "../../assets/styles/dashboard.css";

export default function NotificationTemplates() {
  const API_BASE = "http://localhost:8888/api/admin";
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "order",
    title_template: "",
    message_template: "",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
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
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load templates",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name || "",
        type: template.type || "order",
        title_template: template.title_template || "",
        message_template: template.message_template || "",
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        type: "order",
        title_template: "",
        message_template: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      type: "order",
      title_template: "",
      message_template: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.title_template || !formData.message_template) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please fill in all required fields",
      });
      return;
    }

    try {
      const url = editingTemplate
        ? `${API_BASE}/update_notification_template.php`
        : `${API_BASE}/create_notification_template.php`;

      const payload = editingTemplate
        ? { ...formData, id: editingTemplate.id }
        : formData;

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.status === "success") {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: editingTemplate ? "Template updated successfully" : "Template created successfully",
          timer: 2000,
          showConfirmButton: false,
        });
        handleCloseModal();
        fetchTemplates();
      } else {
        throw new Error(data.message || "Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to save template",
      });
    }
  };

  const handleDelete = async (templateId) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Template?",
      text: "Are you sure you want to delete this template?",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc3545",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/delete_notification_template.php`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: templateId }),
      });

      const data = await res.json();
      if (data.status === "success") {
        Swal.fire({
          icon: "success",
          title: "Deleted",
          text: "Template deleted successfully",
          timer: 2000,
          showConfirmButton: false,
        });
        fetchTemplates();
      } else {
        throw new Error(data.message || "Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to delete template",
      });
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "order":
        return <FaBox className="text-primary" />;
      case "system":
        return <FaBell className="text-info" />;
      case "warning":
        return <FaExclamationTriangle className="text-warning" />;
      default:
        return <FaBell />;
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Đang tải danh sách template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 notification-templates-page">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Notification Template Management</h2>
        <Button 
          variant="primary" 
          onClick={() => handleOpenModal()}
          className="btn-lux-primary"
        >
          <FaPlus className="me-2" />
          Add Template
        </Button>
      </div>

      <Card className="card-lux">
        <Card.Body className="p-0">
          {templates.length === 0 ? (
            <div className="text-center py-5">
              <FaBell size={48} className="text-muted mb-3" />
              <p className="text-muted">Chưa có template nào</p>
              <Button 
                variant="primary" 
                onClick={() => handleOpenModal()}
                className="btn-lux-primary"
              >
                <FaPlus className="me-2" />
                Create First Template
              </Button>
            </div>
          ) : (
            <div className="lux-table-wrapper">
              <Table className="lux-table mb-0">
                <thead>
                  <tr>
                    <th>Template Name</th>
                    <th>Type</th>
                    <th>Title Template</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="template-row">
                      <td>
                        <div className="d-flex align-items-center">
                          {getTypeIcon(template.type)}
                          <strong className="ms-2">{template.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className={`badge-type-luxury badge-type-${template.type}`}>
                          {template.type}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">
                          {template.title_template.length > 50
                            ? template.title_template.substring(0, 50) + "..."
                            : template.title_template}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleOpenModal(template)}
                            className="btn-action-edit"
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            className="btn-action-delete"
                          >
                            <FaTrash />
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

      {/* DQN LUXURY MODAL */}
      {showModal && (
        <div className="dqn-modal-overlay" onClick={handleCloseModal}>
          <div className="dqn-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="dqn-modal-header" style={{ background: editingTemplate ? "linear-gradient(135deg, #6c757d, #adb5bd)" : "linear-gradient(135deg, #007bff, #35a0ff)" }}>
              <div className="dqn-modal-title">
                {editingTemplate ? <><FaEdit /> Edit Template</> : <><FaPlus /> Create Template</>}
              </div>
              <button className="dqn-modal-close" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="dqn-modal-body">
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Template Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Order Approved Notification"
                    className="luxury-input"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Type *</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="luxury-select"
                    required
                  >
                    <option value="order">Order</option>
                    <option value="system">System</option>
                    <option value="warning">Warning</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Title Template *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.title_template}
                    onChange={(e) =>
                      setFormData({ ...formData, title_template: e.target.value })
                    }
                    placeholder="e.g., Order {order_code} has been approved"
                    className="luxury-input"
                    required
                  />
                  <Form.Text className="text-muted">
                    Use placeholders like {"{order_code}"}, {"{customer_name}"}, etc.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Message Template *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={formData.message_template}
                    onChange={(e) =>
                      setFormData({ ...formData, message_template: e.target.value })
                    }
                    placeholder="e.g., Your order {order_code} has been approved and is ready for pickup."
                    className="luxury-textarea"
                    required
                  />
                  <Form.Text className="text-muted">
                    Use placeholders like {"{order_code}"}, {"{customer_name}"}, etc.
                  </Form.Text>
                </Form.Group>

                {/* Footer */}
                <div className="dqn-modal-footer">
                  <Button
                    variant="secondary"
                    onClick={handleCloseModal}
                    className="btn-lux-outline-secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    className="btn-lux-primary-blue"
                  >
                    {editingTemplate ? "Update" : "Create"}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
