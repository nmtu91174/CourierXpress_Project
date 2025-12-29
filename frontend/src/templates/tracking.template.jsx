// frontend/src/templates/tracking.template.jsx
// Enterprise Tracking Details Print Template

import React from "react";
import { FaRoute, FaMapMarkerAlt, FaClock, FaCheckCircle } from "react-icons/fa";
import "../assets/styles/invoice.css";

/**
 * Tracking Template Component
 * Print template for order tracking details
 */
export default function TrackingTemplate({ orderData, trackingHistory = [], isPrint = false }) {
  if (!orderData) return null;

  return (
    <div className={`invoice-print-page ${isPrint ? "tracking-print" : ""}`}>
      {/* Tracking Header */}
      <div className="invoice-header invoice-print-header">
        <div className="invoice-header-top">
          <div className="invoice-company">
            <FaRoute className="company-icon" />
            <div className="company-info">
              <h3 className="company-name">CourierXpress</h3>
              <p className="company-tagline">Order Tracking Details</p>
            </div>
          </div>
          <div className="invoice-meta">
            <div className="invoice-number-box">
              <FaRoute className="invoice-icon" />
              <div>
                <label className="invoice-label">ORDER CODE</label>
                <div className="invoice-number">{orderData.order_code || "N/A"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Information */}
      <div className="print-info-section">
        <div className="print-info-grid">
          <div>
            <h6 className="print-info-title">
              <FaMapMarkerAlt className="me-2" />
              Sender
            </h6>
            <div className="print-info-details">
              <p><strong>{orderData.sender_name || "N/A"}</strong></p>
              <p>{orderData.sender_phone || "N/A"}</p>
              <p>{orderData.sender_address || "N/A"}</p>
            </div>
          </div>
          <div>
            <h6 className="print-info-title">
              <FaMapMarkerAlt className="me-2" />
              Receiver
            </h6>
            <div className="print-info-details">
              <p><strong>{orderData.receiver_name || "N/A"}</strong></p>
              <p>{orderData.receiver_phone || "N/A"}</p>
              <p>{orderData.receiver_address || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Timeline */}
      <div className="invoice-cost-breakdown">
        <div className="breakdown-header">
          <FaClock className="breakdown-icon" />
          <h5 className="breakdown-title">Tracking History</h5>
        </div>

        <div className="tracking-timeline">
          {trackingHistory.length > 0 ? (
            trackingHistory.map((item, index) => (
              <div key={index} className="tracking-item">
                <div className="tracking-icon-wrapper">
                  <FaCheckCircle className="tracking-icon" />
                </div>
                <div className="tracking-content">
                  <div className="tracking-status">
                    <strong>{item.status_name || item.status_code || "Status Update"}</strong>
                  </div>
                  <div className="tracking-date">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : "N/A"}
                  </div>
                  {item.note && (
                    <div className="tracking-note">{item.note}</div>
                  )}
                  {item.user_name && (
                    <div className="tracking-user">By: {item.user_name} ({item.role})</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted py-4">No tracking history available</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="invoice-footer invoice-print-footer">
        <div className="invoice-footer-bottom">
          <p className="footer-note">
            Track your order online at courierxpress.com/tracking/{orderData.order_code}
          </p>
          <p className="footer-copyright">
            © {new Date().getFullYear()} CourierXpress. All rights reserved.
          </p>
        </div>
      </div>

      {/* Tracking Timeline Styles */}
      <style>{`
        .tracking-timeline {
          padding: 20px 0;
        }
        .tracking-item {
          display: flex;
          gap: 20px;
          padding: 16px 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .tracking-item:last-child {
          border-bottom: none;
        }
        .tracking-icon-wrapper {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #007bff, #35a0ff);
          border-radius: 50%;
          color: #ffffff;
        }
        .tracking-icon {
          font-size: 1.2rem;
        }
        .tracking-content {
          flex: 1;
        }
        .tracking-status {
          font-size: 1rem;
          color: #1a1d29;
          margin-bottom: 4px;
        }
        .tracking-date {
          font-size: 0.9rem;
          color: #6c757d;
          margin-bottom: 4px;
        }
        .tracking-note {
          font-size: 0.9rem;
          color: #495057;
          margin-top: 4px;
          font-style: italic;
        }
        .tracking-user {
          font-size: 0.85rem;
          color: #adb5bd;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

