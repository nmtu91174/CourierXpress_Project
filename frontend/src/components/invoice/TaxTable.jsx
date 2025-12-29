// frontend/src/components/invoice/TaxTable.jsx
// Enterprise Invoice Tax Table Component

import React from "react";
import { FaReceipt } from "react-icons/fa";
import "../../assets/styles/invoice.css";

/**
 * TaxTable Component
 * Displays tax information table
 */
export default function TaxTable({ subtotal, vatRate = 0.1 }) {
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  return (
    <div className="invoice-tax-table">
      <div className="tax-header">
        <FaReceipt className="tax-icon" />
        <h6 className="tax-title">Tax Information</h6>
      </div>

      <div className="tax-table-wrapper">
        <table className="tax-table">
          <tbody>
            <tr>
              <td className="tax-label">Subtotal (excluding VAT)</td>
              <td className="tax-value">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(subtotal)}
              </td>
            </tr>
            <tr>
              <td className="tax-label">VAT Rate</td>
              <td className="tax-value">{vatRate * 100}%</td>
            </tr>
            <tr>
              <td className="tax-label">VAT Amount</td>
              <td className="tax-value">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(vatAmount)}
              </td>
            </tr>
            <tr className="tax-total-row">
              <td className="tax-label">
                <strong>Total (including VAT)</strong>
              </td>
              <td className="tax-value">
                <strong>
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(total)}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

