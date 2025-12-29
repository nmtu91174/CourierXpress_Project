// frontend/src/templates/receipt.template.jsx
// Enterprise Receipt Print Template

import React from "react";
import { FaReceipt, FaBox, FaUser, FaMapMarkerAlt, FaWeight } from "react-icons/fa";
import "../assets/styles/invoice.css";

/**
 * Receipt Template Component
 * Lightweight receipt template for shipment receipt printing
 */
export default function ReceiptTemplate({ orderData, isPrint = false }) {
  if (!orderData) return null;

  return (
    <div className={`invoice-print-page ${isPrint ? "receipt-print" : ""}`}>
      {/* Receipt Header */}
      <div className="invoice-header invoice-print-header">
        <div className="invoice-header-top">
          <div className="invoice-company">
            <FaReceipt className="company-icon" />
            <div className="company-info">
              <h3 className="company-name">CourierXpress</h3>
              <p className="company-tagline">Shipment Receipt</p>
            </div>
          </div>
          <div className="invoice-meta">
            <div className="invoice-number-box">
              <FaBox className="invoice-icon" />
              <div>
                <label className="invoice-label">ORDER CODE</label>
                <div className="invoice-number">{orderData.order_code || "N/A"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Content */}
      <div className="print-info-section">
        <div className="print-info-grid">
          {/* Sender Info */}
          <div>
            <h6 className="print-info-title">
              <FaUser className="me-2" />
              Sender Information
            </h6>
            <div className="print-info-details">
              <p><strong>Name:</strong> {orderData.sender_name || "N/A"}</p>
              <p><strong>Phone:</strong> {orderData.sender_phone || "N/A"}</p>
              <p><strong>Address:</strong> {orderData.sender_address || "N/A"}</p>
            </div>
          </div>

          {/* Receiver Info */}
          <div>
            <h6 className="print-info-title">
              <FaUser className="me-2" />
              Receiver Information
            </h6>
            <div className="print-info-details">
              <p><strong>Name:</strong> {orderData.receiver_name || "N/A"}</p>
              <p><strong>Phone:</strong> {orderData.receiver_phone || "N/A"}</p>
              <p><strong>Address:</strong> {orderData.receiver_address || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Package Details */}
      <div className="invoice-cost-breakdown">
        <div className="breakdown-header">
          <FaBox className="breakdown-icon" />
          <h5 className="breakdown-title">Package Details</h5>
        </div>

        <div className="breakdown-table-wrapper">
          <table className="breakdown-table">
            <tbody>
              <tr>
                <td className="breakdown-item-name">
                  <FaWeight className="item-icon" />
                  Weight
                </td>
                <td className="breakdown-item-desc">{orderData.weight ? `${orderData.weight}g` : "N/A"}</td>
                <td></td>
              </tr>
              {orderData.service_type_name && (
                <tr>
                  <td className="breakdown-item-name">
                    <FaBox className="item-icon" />
                    Service Type
                  </td>
                  <td className="breakdown-item-desc">{orderData.service_type_name}</td>
                  <td></td>
                </tr>
              )}
              {orderData.cod_amount > 0 && (
                <tr className="breakdown-total-row">
                  <td className="breakdown-item-name">
                    <strong>COD Amount</strong>
                  </td>
                  <td></td>
                  <td className="breakdown-total-amount">
                    <strong>
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(orderData.cod_amount)}
                    </strong>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="invoice-footer invoice-print-footer">
        <div className="invoice-footer-bottom">
          <p className="footer-note">
            This is a shipment receipt. Please keep this receipt for your records.
          </p>
          <p className="footer-copyright">
            © {new Date().getFullYear()} CourierXpress. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

