// frontend/src/pages/Invoice/InvoiceView.jsx
// Enterprise Invoice View Page

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card, Row, Col, Button } from "react-bootstrap";
import { FaPrint, FaFileExcel, FaArrowLeft, FaDownload, FaEnvelope, FaCheckCircle } from "react-icons/fa";
import { invoiceService } from "../../services/invoice.service";
import { exportService } from "../../services/export.service";
import { formatInvoiceNumber } from "../../utils/invoiceFormatter";
import emailjs from "emailjs-com";
import { EMAILJS_INVOICE_CONFIG } from "../../config/emailjs.invoice.config";
import Swal from "sweetalert2";
import InvoiceHeader from "../../components/invoice/InvoiceHeader";
import CostBreakdown from "../../components/invoice/CostBreakdown";
import TaxTable from "../../components/invoice/TaxTable";
import InvoiceFooter from "../../components/invoice/InvoiceFooter";
import "../../assets/styles/invoice.css";

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoiceData, setInvoiceData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    fetchInvoiceDetail();
  }, [id]);

  // Handle action from query params (print, export-pdf, email)
  useEffect(() => {
    if (!loading && invoiceData && printRef.current) {
      const action = searchParams.get('action');
      if (action === 'print') {
        // Clear the action param and trigger print
        setSearchParams({}, { replace: true });
        setTimeout(() => window.print(), 100);
      } else if (action === 'export-pdf') {
        // Clear the action param and trigger export
        setSearchParams({}, { replace: true });
        exportService.exportInvoiceToPDF(
          printRef.current,
          invoiceData?.invoice_number || `INV${id}`
        ).catch((error) => {
          console.error("Error exporting PDF:", error);
          alert("Failed to export PDF. Please try again.");
        });
      } else if (action === 'email') {
        // Clear the action param and trigger email
        setSearchParams({}, { replace: true });
        handleSendEmail();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, invoiceData, id]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getInvoiceDetail(parseInt(id));
      setInvoiceData(data.invoice || data);
      setOrderData(data.order || data);
      
      // Debug: Log invoice detail to verify data structure
      console.log("🔍 INVOICE DETAIL DEBUG:", {
        invoice: data.invoice || data,
        order: data.order || data,
        invoice_status: (data.invoice || data)?.status,
        order_status: (data.order || data)?.status,
        order_status_id: (data.order || data)?.status_id,
      });
    } catch (error) {
      console.error("Error fetching invoice detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (printRef.current) {
      try {
        await exportService.exportInvoiceToPDF(
          printRef.current,
          invoiceData?.invoice_number || `INV${id}`
        );
      } catch (error) {
        console.error("Error exporting PDF:", error);
        alert("Failed to export PDF. Please try again.");
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    try {
      await exportService.exportInvoiceToExcel(
        { ...invoiceData, order: orderData },
        invoiceData?.invoice_number || `INV${id}`
      );
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export to Excel. Please try again.");
    }
  };

  // Helper: Get current user role
  const getCurrentUserRole = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      return user?.role || null;
    } catch (error) {
      console.error("Error getting user role:", error);
      return null;
    }
  };

  // Helper: Check if can mark invoice as paid
  // Conditions: invoice.status = 'unpaid' AND order.status = 5 (delivered) AND user role = admin/agent
  const canMarkAsPaid = () => {
    const userRole = getCurrentUserRole();
    
    // Handle both string and number for invoice status (defensive coding)
    // Invoice status should be: 'unpaid', 'paid', 'cancelled' (string)
    // But API might return number due to JOIN issues
    const invoiceStatusRaw = invoiceData?.status;
    const invoiceStatus = typeof invoiceStatusRaw === 'string' 
      ? invoiceStatusRaw.toLowerCase() 
      : invoiceStatusRaw; // If number, keep as is for comparison
    
    // Check both status and status_id (API might return either)
    const orderStatus = orderData?.status || orderData?.status_id;
    
    // Invoice status must be 'unpaid' (string)
    // After backend fix, it should always be string: 'unpaid', 'paid', or 'cancelled'
    const isUnpaid = invoiceStatus === "unpaid" || invoiceStatus === "UNPAID";
    
    // Order status must be 5 (delivered)
    const isDelivered = orderStatus === 5;
    
    // User must be admin or agent
    const hasPermission = userRole === "admin" || userRole === "agent";
    
    const canMark = isUnpaid && isDelivered && hasPermission;
    
    // Debug log
    console.log("🔍 CAN MARK AS PAID CHECK:", {
      invoiceStatusRaw,
      invoiceStatus,
      isUnpaid,
      orderStatus,
      isDelivered,
      userRole,
      hasPermission,
      canMark,
      invoiceData: invoiceData,
      orderData: orderData,
    });
    
    return canMark;
  };

  // Helper: Check if customer email is valid and available
  // Email comes from: orders.customer_id → users.email (via backend JOIN)
  const getValidCustomerEmail = () => {
    if (!orderData) return null;
    
    // Get email from users table (via backend JOIN)
    const customerEmail = orderData?.customer_email || null;
    
    if (!customerEmail) return null;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) return null;

    // Block admin/system emails (safety check)
    const blockedEmails = [
      'admin@gmail.com',
      'admin@courierxpress.com',
      'test@gmail.com',
      'guest@system.local',
      'noreply@',
      'no-reply@'
    ];
    
    const isBlockedEmail = blockedEmails.some(blocked => 
      customerEmail.toLowerCase().includes(blocked.toLowerCase())
    );

    if (isBlockedEmail) return null;

    return customerEmail;
  };

  const handleMarkAsPaid = async () => {
    if (!invoiceData || !invoiceData.id) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Invoice data is not available.",
      });
      return;
    }

    // Confirm action
    const confirmResult = await Swal.fire({
      icon: "question",
      title: "Mark as Paid?",
      text: `Are you sure you want to mark invoice ${formatInvoiceNumber(invoiceData.invoice_number)} as paid?`,
      showCancelButton: true,
      confirmButtonText: "Yes, Mark as Paid",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#28a745",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    try {
      // Show loading
      Swal.fire({
        title: "Processing...",
        text: "Marking invoice as paid",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Call API to mark as paid
      await invoiceService.markAsPaid(invoiceData.id);

      // Update local state
      setInvoiceData((prev) => ({
        ...prev,
        status: "paid",
      }));

      // Show success
      Swal.fire({
        icon: "success",
        title: "Invoice Marked as Paid",
        text: "The invoice status has been updated successfully.",
        timer: 2000,
        showConfirmButton: false,
      });

      // Refresh invoice data to get latest info
      await fetchInvoiceDetail();
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Mark as Paid",
        text: error.message || "An error occurred while marking the invoice as paid.",
      });
    }
  };

  const handleSendEmail = async () => {
    try {
      // Validate required data
      if (!invoiceData || !orderData) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Invoice data is not available. Please try again.",
        });
        return;
      }

      // Get customer email from users table (via orders.customer_id → users.email)
      // This email comes from backend JOIN: LEFT JOIN users u_customer ON o.customer_id = u_customer.id
      const customerEmail = getValidCustomerEmail();
      
      // Debug logging
      console.log("🔍 Email Debug Info:", {
        customer_email: orderData?.customer_email, // From users.email via JOIN
        customer_name: orderData?.customer_name,
        order_code: orderData?.order_code,
        selected_email: customerEmail,
      });

      // getValidCustomerEmail() already validates email format and blocks admin emails
      if (!customerEmail) {
        Swal.fire({
          icon: "warning",
          title: "Email Not Available",
          text: "Customer email address is not available for this invoice. Please contact the customer directly to get their email address.",
        });
        return;
      }

      // Get customer name (fallback to sender name)
      const customerName = orderData?.customer_name || orderData?.sender_name || "Customer";

      // Format invoice number for display
      const invoiceDisplayCode = formatInvoiceNumber(invoiceData.invoice_number);

      // Format invoice status (capitalize first letter)
      // Handle status safely - convert to string and capitalize
      let invoiceStatus = "Unpaid";
      if (invoiceData.status) {
        try {
          const statusStr = String(invoiceData.status).toLowerCase();
          if (statusStr && statusStr.length > 0) {
            invoiceStatus = statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
          }
        } catch (e) {
          console.warn("Error formatting invoice status:", e);
          invoiceStatus = "Unpaid";
        }
      }

      // Format total amount with currency
      const totalAmount = invoiceData.total_amount 
        ? new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(invoiceData.total_amount)
        : "N/A";

      // Generate token-based invoice URL for email (secure public access)
      // Backend generates token, frontend builds URL
      let invoiceUrl;
      try {
        // Try to generate token-based URL (for email links)
        const queryParam = invoiceData.id 
          ? `invoice_id=${invoiceData.id}` 
          : `order_id=${orderData.id}`;
        
        const tokenResponse = await fetch(
          `${import.meta.env.VITE_API_BASE || "http://localhost:8888/api"}/admin/generate_invoice_token_url.php?${queryParam}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.status === "success" && tokenData.data?.invoice_url) {
            invoiceUrl = tokenData.data.invoice_url;
          }
        }
      } catch (tokenError) {
        console.warn("Failed to generate token URL, using fallback:", tokenError);
      }
      
      // Fallback: use customer/guest URL if token generation fails
      if (!invoiceUrl) {
        invoiceUrl = orderData.id 
          ? `${window.location.origin}/user/orders/${orderData.id}/invoice`
          : `${window.location.origin}/invoice/${orderData.order_code}`;
      }

      // Prepare email data for EmailJS template
      const emailData = {
        to: customerEmail, // ⚠️ CRITICAL: Must be customer email, NOT admin email
        customer_name: customerName,
        company_name: "CourierXpress",
        invoice_display_code: invoiceDisplayCode,
        order_code: orderData.order_code || "N/A",
        invoice_status: invoiceStatus,
        total_amount: totalAmount,
        invoice_url: invoiceUrl,
      };

      // Debug: Log email payload before sending
      console.log("📧 EmailJS Payload:", emailData);
      console.log("✅ Sending invoice email to:", customerEmail);

      // Send email via EmailJS
      await emailjs.send(
        EMAILJS_INVOICE_CONFIG.SERVICE_ID,
        EMAILJS_INVOICE_CONFIG.TEMPLATE_ID,
        emailData,
        EMAILJS_INVOICE_CONFIG.PUBLIC_KEY
      );

      console.log("✅ Invoice email sent successfully via EmailJS");
      console.log("📧 Email sent to:", customerEmail);

      Swal.fire({
        icon: "success",
        title: "Invoice Email Sent!",
        text: `Invoice notification has been resent to customer: ${customerEmail}`,
        timer: 3000,
        showConfirmButton: false,
      });

    } catch (emailError) {
      console.error("❌ EmailJS sending failed:", emailError);
      Swal.fire({
        icon: "error",
        title: "Failed to Send Email",
        text: emailError.message || "An error occurred while sending the email. Please try again.",
      });
    }
  };


  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!invoiceData && !orderData) {
    return (
      <div className="container-fluid py-4">
        <Card className="card-lux">
          <Card.Body className="text-center py-5">
            <p className="text-muted">Invoice not found</p>
            <Link to="/admin/invoices" className="btn btn-primary">
              <FaArrowLeft className="me-2" /> Back to Invoice List
            </Link>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Calculate subtotal for tax table
  // Subtotal = invoice total / (1 + VAT rate)
  // NOTE: COD amount is NOT included in invoice calculation
  const vatRate = 0.1;
  const subtotal = invoiceData?.total_amount 
    ? invoiceData.total_amount / (1 + vatRate) // Exclude VAT from total
    : (() => {
        // Fallback: calculate from order fees (excluding COD)
        const feesTotal = orderData?.fees 
          ? orderData.fees
              .filter(f => f.fee_code !== "cod_amount_value")
              .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0)
          : 0;
        const penaltyTotal = orderData?.penalty_fee ? parseFloat(orderData.penalty_fee) : 0;
        return feesTotal + penaltyTotal;
      })();

  return (
    <div className="invoice-view-page container-fluid py-4">
      {/* Action Bar - Hidden when printing */}
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <div>
          <Link to="/admin/invoices" className="btn btn-outline-secondary mb-2">
            <FaArrowLeft className="me-2" /> Back to Invoice List
          </Link>
          <h2 className="fw-bold mb-0 mt-2">
            Invoice #{formatInvoiceNumber(invoiceData?.invoice_number) || id}
          </h2>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            className="btn-action-export-pdf d-flex align-items-center gap-2"
          >
            <FaDownload /> Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="btn-action-print d-flex align-items-center gap-2"
          >
            <FaPrint /> Print PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="btn-action-export-excel d-flex align-items-center gap-2"
          >
            <FaFileExcel /> Export Excel
          </Button>
          {/* Resend Invoice Email to Customer */}
          <Button
            variant="outline"
            onClick={handleSendEmail}
            disabled={!getValidCustomerEmail()}
            className="btn-action-email d-flex align-items-center gap-2"
            title={
              !getValidCustomerEmail()
                ? "Customer email is not available. Cannot send invoice email."
                : "Resend invoice email to customer"
            }
          >
            <FaEnvelope /> Resend to Customer
          </Button>
          {/* Mark as Paid Button - Show independently from Resend button */}
          {/* Conditions: invoice.status = 'unpaid' AND order.status = 5 AND user role = admin/agent */}
          {canMarkAsPaid() && (
            <Button
              variant="success"
              onClick={handleMarkAsPaid}
              className="btn-action-mark-paid d-flex align-items-center gap-2"
              title="Mark this invoice as paid"
            >
              <FaCheckCircle /> Mark as Paid
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Content */}
      <div ref={printRef} className="invoice-content">
        <Card className="card-lux">
          <Card.Body>
            {/* Invoice Header */}
            <InvoiceHeader
              invoiceData={invoiceData}
              orderData={orderData}
              isPrint={false}
            />

            {/* Customer & Order Info */}
            <Row className="mb-4">
              <Col md={6}>
                <div className="invoice-section">
                  <h5 className="section-title">Customer Information</h5>
                  <div className="info-details">
                    <p><strong>Name:</strong> {orderData?.sender_name || "N/A"}</p>
                    <p><strong>Phone:</strong> {orderData?.sender_phone || "N/A"}</p>
                    <p><strong>Address:</strong> {orderData?.sender_address || "N/A"}</p>
                  </div>
                </div>
              </Col>
              <Col md={6}>
                <div className="invoice-section">
                  <h5 className="section-title">Delivery Information</h5>
                  <div className="info-details">
                    <p><strong>Receiver:</strong> {orderData?.receiver_name || "N/A"}</p>
                    <p><strong>Phone:</strong> {orderData?.receiver_phone || "N/A"}</p>
                    <p><strong>Address:</strong> {orderData?.receiver_address || "N/A"}</p>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Cost Breakdown */}
            <CostBreakdown invoiceData={invoiceData} orderData={orderData} />

            {/* Tax Table */}
            <TaxTable subtotal={subtotal} vatRate={0.1} />

            {/* Invoice Footer */}
            <InvoiceFooter
              invoiceData={invoiceData}
              orderData={orderData}
              isPrint={false}
            />
          </Card.Body>
        </Card>
      </div>

      {/* Additional Info - Hidden when printing */}
      {orderData && (
        <Card className="card-lux mt-4 no-print">
          <Card.Body>
            <h5 className="section-title mb-3">Order Details</h5>
            <Row>
              <Col md={4}>
                <p><strong>Order Code:</strong> {orderData.order_code || "N/A"}</p>
                <p><strong>Weight:</strong> {orderData.weight ? `${orderData.weight}g` : "N/A"}</p>
              </Col>
              <Col md={4}>
                <p><strong>Service Type:</strong> {orderData.service_type_name || "Standard"}</p>
                <p><strong>Payment Method:</strong> {orderData.payment_method_name || "N/A"}</p>
              </Col>
              <Col md={4}>
                <p><strong>Created Date:</strong> {orderData.created_at ? new Date(orderData.created_at).toLocaleString() : "N/A"}</p>
                {orderData.notes && (
                  <p><strong>Notes:</strong> {orderData.notes}</p>
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

