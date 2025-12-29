// frontend/src/pages/Invoice/InvoiceView.jsx
// Enterprise Invoice View Page

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card, Row, Col, Button } from "react-bootstrap";
import { FaPrint, FaFileExcel, FaArrowLeft, FaDownload } from "react-icons/fa";
import { invoiceService } from "../../services/invoice.service";
import { exportService } from "../../services/export.service";
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

  const handleSendEmail = async () => {
    // TODO: Implement email sending using EmailJS
    alert("Email functionality will be implemented soon.");
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
      {/* Action Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/admin/invoices" className="btn btn-outline-secondary mb-2">
            <FaArrowLeft className="me-2" /> Back to Invoice List
          </Link>
          <h2 className="fw-bold mb-0 mt-2">
            Invoice #{invoiceData?.invoice_number || id}
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

      {/* Additional Info */}
      {orderData && (
        <Card className="card-lux mt-4">
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

