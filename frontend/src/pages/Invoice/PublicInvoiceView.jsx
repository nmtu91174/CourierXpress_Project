// frontend/src/pages/Invoice/PublicInvoiceView.jsx
// Public Invoice View - Token-based access (for email links)
// Route: /invoice/view?token=xxx&order_code=ORD0004

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Card, Row, Col, Button, Spinner, Alert } from "react-bootstrap";
import { FaDownload, FaArrowLeft } from "react-icons/fa";
import { invoiceService } from "../../services/invoice.service";
import { exportService } from "../../services/export.service";
import { formatInvoiceNumber } from "../../utils/invoiceFormatter";
import InvoiceHeader from "../../components/invoice/InvoiceHeader";
import CostBreakdown from "../../components/invoice/CostBreakdown";
import TaxTable from "../../components/invoice/TaxTable";
import InvoiceFooter from "../../components/invoice/InvoiceFooter";
import "../../assets/styles/invoice.css";

export default function PublicInvoiceView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const orderCode = searchParams.get("order_code");
  
  const [invoiceData, setInvoiceData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (token && orderCode) {
      fetchInvoiceByToken();
    } else {
      setError("Token and order code are required");
      setLoading(false);
    }
  }, [token, orderCode]);

  const fetchInvoiceByToken = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await invoiceService.getInvoiceByToken(token, orderCode);
      setInvoiceData(data.invoice || data);
      setOrderData(data.order || data);
    } catch (err) {
      console.error("Error fetching invoice by token:", err);
      setError(err.message || "Failed to load invoice. Invalid or expired token.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (printRef.current) {
      try {
        await exportService.exportInvoiceToPDF(
          printRef.current,
          invoiceData?.invoice_number || `INV_${orderCode}`
        );
      } catch (err) {
        console.error("Error exporting PDF:", err);
        alert("Failed to download PDF. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </div>
    );
  }

  if (error || (!invoiceData && !orderData)) {
    return (
      <div className="container-fluid py-4">
        <Card className="card-lux">
          <Card.Body className="text-center py-5">
            <Alert variant="danger">{error || "Invoice not found. Please check the link."}</Alert>
            <Link to="/" className="btn btn-primary mt-3">
              <FaArrowLeft className="me-2" /> Back to Home
            </Link>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Calculate subtotal for tax table
  const vatRate = 0.1;
  const subtotal = invoiceData?.total_amount
    ? invoiceData.total_amount / (1 + vatRate)
    : (() => {
        const feesTotal = orderData?.fees
          ? orderData.fees
              .filter(f => f.fee_code !== "cod_amount_value")
              .reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0)
          : 0;
        const penaltyTotal = orderData?.penalty_fee ? parseFloat(orderData.penalty_fee) : 0;
        return feesTotal + penaltyTotal;
      })();

  return (
    <div className="customer-invoice-view-page container-fluid py-4">
      {/* Action Bar - Public Token View (Simple) - Hidden when printing */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2 no-print">
        <div>
          <Link to="/" className="btn btn-outline-secondary mb-2">
            <FaArrowLeft className="me-2" /> Back to Home
          </Link>
          <h2 className="fw-bold mb-0 mt-2">
            Invoice #{formatInvoiceNumber(invoiceData?.invoice_number) || orderCode}
          </h2>
        </div>
        {/* Public: Only Download PDF button */}
        <div className="d-flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
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
                  <h5 className="section-title">Order Information</h5>
                  <div className="info-details">
                    <p><strong>Order Code:</strong> {orderData?.order_code || "N/A"}</p>
                    <p><strong>Service Type:</strong> {orderData?.service_type_name || "Standard"}</p>
                    <p><strong>Created Date:</strong> {orderData?.created_at ? new Date(orderData.created_at).toLocaleString() : "N/A"}</p>
                  </div>
                </div>
              </Col>
            </Row>

            <CostBreakdown invoiceData={invoiceData} orderData={orderData} />
            <TaxTable subtotal={subtotal} vatRate={vatRate} />
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

