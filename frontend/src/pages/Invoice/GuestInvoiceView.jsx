// frontend/src/pages/Invoice/GuestInvoiceView.jsx
// Guest Invoice View Page (Public, No Authentication Required)

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, Row, Col, Button, Alert, Spinner } from "react-bootstrap";
import { FaArrowLeft, FaDownload } from "react-icons/fa";
import { invoiceService } from "../../services/invoice.service";
import { exportService } from "../../services/export.service";
import { formatInvoiceNumber } from "../../utils/invoiceFormatter";
import InvoiceHeader from "../../components/invoice/InvoiceHeader";
import CostBreakdown from "../../components/invoice/CostBreakdown";
import TaxTable from "../../components/invoice/TaxTable";
import InvoiceFooter from "../../components/invoice/InvoiceFooter";
import "../../assets/styles/invoice.css";

export default function GuestInvoiceView() {
  const { orderCode } = useParams(); // order_code from route
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    fetchGuestInvoice();
  }, [orderCode]);

  const fetchGuestInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get invoice by order code (public endpoint, no auth required)
      const data = await invoiceService.getGuestInvoiceByOrderCode(orderCode);
      setInvoiceData(data.invoice || data);
      setOrderData(data.order || data);
    } catch (err) {
      console.error("Error fetching guest invoice:", err);
      setError(err.message || "Failed to load invoice. Please check the order code.");
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
            <Alert variant="danger">{error || "Invoice not found. Please check the order code."}</Alert>
            <Link to="/tracking" className="btn btn-primary mt-3">
              <FaArrowLeft className="me-2" /> Back to Tracking
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
      {/* Action Bar - Guest View (Simple) */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <Link to={`/tracking/${orderCode}`} className="btn btn-outline-secondary mb-2">
            <FaArrowLeft className="me-2" /> Back to Order Tracking
          </Link>
          <h2 className="fw-bold mb-0 mt-2">
            Invoice #{formatInvoiceNumber(invoiceData?.invoice_number) || orderCode}
          </h2>
        </div>
        {/* Guest: Only Download PDF button */}
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
    </div>
  );
}

