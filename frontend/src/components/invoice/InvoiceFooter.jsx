// frontend/src/components/invoice/InvoiceFooter.jsx
// Enterprise Invoice Footer Component

import React from "react";
import { FaInfoCircle, FaLock } from "react-icons/fa";
import "../../assets/styles/invoice.css";

/**
 * InvoiceFooter Component
 * Displays invoice footer with terms and notes
 */
export default function InvoiceFooter({ invoiceData, orderData, isPrint = false }) {
  return (
    <div className={`invoice-footer ${isPrint ? "invoice-print-footer" : ""}`}>
      <div className="invoice-footer-content">
        <div className="invoice-terms">
          <FaInfoCircle className="terms-icon" />
          <h6 className="terms-title">Terms & Conditions</h6>
          <ul className="terms-list">
            <li>Payment is due within 30 days of invoice date.</li>
            <li>Late payments may incur additional charges.</li>
            <li>All disputes must be reported within 7 days of delivery.</li>
            <li>Terms are subject to CourierXpress service agreement.</li>
          </ul>
        </div>

        <div className="invoice-status">
          <div className="status-badge-wrapper">
            <FaLock className="status-icon" />
            <span className={`status-badge status-${invoiceData?.status || "unpaid"}`}>
              {invoiceData?.status === "paid"
                ? "PAID"
                : invoiceData?.status === "cancelled"
                ? "CANCELLED"
                : "UNPAID"}
            </span>
          </div>
          {invoiceData?.payment_method_name && (
            <p className="payment-method">
              Payment Method: <strong>{invoiceData.payment_method_name}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="invoice-footer-bottom">
        <p className="footer-note">
          Thank you for choosing CourierXpress. For inquiries, please contact our support team.
        </p>
        <p className="footer-copyright">
          © {new Date().getFullYear()} CourierXpress. All rights reserved.
        </p>
      </div>
    </div>
  );
}

