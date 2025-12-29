// frontend/src/pages/Invoice/CustomerInvoiceView.jsx
// Customer Invoice View Page (Read-only, Enterprise UX)

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, Row, Col, Button } from "react-bootstrap";
import { FaArrowLeft, FaDownload } from "react-icons/fa";
import { invoiceService } from "../../services/invoice.service";
import { exportService } from "../../services/export.service";
import InvoiceHeader from "../../components/invoice/InvoiceHeader";
import CostBreakdown from "../../components/invoice/CostBreakdown";
import TaxTable from "../../components/invoice/TaxTable";
import InvoiceFooter from "../../components/invoice/InvoiceFooter";
import "../../assets/styles/invoice.css";

export default function CustomerInvoiceView() {
  const { orderId } = useParams(); // order ID from route
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    fetchInvoiceDetail();
  }, [orderId]);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get invoice by order ID (backend will validate ownership)
      const data = await invoiceService.getCustomerInvoiceByOrderId(parseInt(orderId));
      setInvoiceData(data.invoice || data);
      setOrderData(data.order || data);
    } catch (error) {
      console.error("Error fetching customer invoice:", error);
      setError(error.message || "Failed to load invoice. Please check if this invoice belongs to your order.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (printRef.current) {
      try {
        await exportService.exportInvoiceToPDF(
          printRef.current,
          invoiceData?.invoice_number || `INV-${orderId}`
        );
      } catch (error) {
        console.error("Error exporting PDF:", error);
        alert("Failed to export PDF. Please try again.");
      }
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

  if (error) {
    return (
      <div className="container-fluid py-4">
        <Card className="card-lux">
          <Card.Body className="text-center py-5">
            <p className="text-danger mb-3">{error}</p>
            <Link to="/orders" className="btn btn-primary">
              <FaArrowLeft className="me-2" /> Back to My Orders
            </Link>
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (!invoiceData && !orderData) {
    return (
      <div className="container-fluid py-4">
        <Card className="card-lux">
          <Card.Body className="text-center py-5">
            <p className="text-muted">Invoice not found for this order.</p>
            <Link to="/orders" className="btn btn-primary">
              <FaArrowLeft className="me-2" /> Back to My Orders
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
      {/* Action Bar - Customer View (Simple) */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <Link to="/orders" className="btn btn-outline-secondary mb-2">
            <FaArrowLeft className="me-2" /> Back to My Orders
          </Link>
          <h2 className="fw-bold mb-0 mt-2">
            Invoice #{invoiceData?.invoice_number || orderId}
          </h2>
        </div>
        {/* Customer: Only Download PDF button */}
        <div className="d-flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            className="btn-action-export-pdf d-flex align-items-center gap-2"
          >
            <FaDownload /> Download PDF
          </Button>
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

      {/* Additional Info - Simplified for Customer */}
      {orderData && (
        <Card className="card-lux mt-4">
          <Card.Body>
            <h5 className="section-title mb-3">Order Details</h5>
            <Row>
              <Col md={4}>
                <p><strong>Order Code:</strong> {orderData.order_code || "N/A"}</p>
                <p><strong>Service Type:</strong> {orderData.service_type_name || "Standard"}</p>
              </Col>
              <Col md={4}>
                <p><strong>Payment Method:</strong> {orderData.payment_method_name || "N/A"}</p>
                <p><strong>Created Date:</strong> {orderData.created_at ? new Date(orderData.created_at).toLocaleString() : "N/A"}</p>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

