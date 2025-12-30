// frontend/src/components/invoice/InvoiceHeader.jsx
// Enterprise Invoice Header Component

import React from "react";
import { FaFileInvoice, FaBuilding, FaCalendarAlt } from "react-icons/fa";
import { formatInvoiceNumber } from "../../utils/invoiceFormatter";
import "../../assets/styles/invoice.css";

/**
 * InvoiceHeader Component
 * Displays invoice header with company info and invoice number
 */
export default function InvoiceHeader({ invoiceData, orderData, isPrint = false }) {
  return (
    <div className={`invoice-header ${isPrint ? "invoice-print-header" : ""}`}>
      <div className="invoice-header-top">
        <div className="invoice-company">
          <FaBuilding className="company-icon" />
          <div className="company-info">
            <h3 className="company-name">CourierXpress</h3>
            <p className="company-tagline">Professional Logistics & Delivery Services</p>
            <div className="company-details">
              <p>123 Business Street, Hanoi, Vietnam</p>
              <p>Phone: +84 123 456 789 | Email: info@courierxpress.com</p>
            </div>
          </div>
        </div>

        <div className="invoice-meta">
          <div className="invoice-number-box">
            <FaFileInvoice className="invoice-icon" />
            <div>
              <label className="invoice-label">INVOICE</label>
              <div className="invoice-number">
                {formatInvoiceNumber(invoiceData?.invoice_number || orderData?.invoice_number) || "N/A"}
              </div>
            </div>
          </div>
          {invoiceData?.created_at && (
            <div className="invoice-date-box">
              <FaCalendarAlt className="date-icon" />
              <div>
                <label className="invoice-label">Date</label>
                <div className="invoice-date">
                  {new Date(invoiceData.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

