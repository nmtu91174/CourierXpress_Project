// frontend/src/components/invoice/CostBreakdown.jsx
// Enterprise Invoice Cost Breakdown Component

import React from "react";
import { FaTag, FaCoins } from "react-icons/fa";
import "../../assets/styles/invoice.css";

/**
 * CostBreakdown Component
 * Displays detailed cost breakdown for invoice
 * 
 * Data mapping rules (DB-aware):
 * - Cost items come from orderData.fees array (order_fees table join fees table)
 * - COD amount (orders.cod_amount) is display-only, NOT included in invoice total
 * - Invoice total comes from invoices.total_amount (already calculated)
 * - Penalty fee (orders.penalty_fee) should be included if exists
 */
export default function CostBreakdown({ invoiceData, orderData }) {
  if (!invoiceData && !orderData) return null;

  // Build cost breakdown from order_fees table (orderData.fees array)
  const costItems = [];
  
  if (orderData && orderData.fees && Array.isArray(orderData.fees)) {
    // Map order_fees to cost items
    // Exclude COD amount from cost breakdown (COD is display-only, not part of invoice total)
    orderData.fees.forEach((fee) => {
      // Skip COD amount - it's display-only, not part of invoice calculation
      if (fee.fee_code === "cod_amount_value") {
        return;
      }

      costItems.push({
        name: fee.fee_name || fee.name || "Fee",
        description: getFeeDescription(fee.fee_code || fee.code, fee.fee_type || fee.type),
        amount: parseFloat(fee.amount) || 0,
        type: fee.fee_type || fee.type,
      });
    });
  }

  // Add penalty fee if exists (from orders.penalty_fee)
  if (orderData && orderData.penalty_fee > 0) {
    costItems.push({
      name: "Penalty Fee",
      description: "Weight mismatch penalty",
      amount: parseFloat(orderData.penalty_fee) || 0,
      type: "extra",
    });
  }

  // If no fees found, fallback to total_shipping_fee (backward compatibility)
  if (costItems.length === 0 && orderData && orderData.total_shipping_fee > 0) {
    costItems.push({
      name: "Shipping Fee",
      description: "Base shipping fee",
      amount: parseFloat(orderData.total_shipping_fee) || 0,
      type: "base",
    });
  }

  // Calculate subtotal from cost items only
  // NOTE: COD amount is NOT included in subtotal
  const subtotal = costItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  // VAT (10% - standard Vietnam VAT)
  const vatRate = 0.1;
  const vatAmount = subtotal * vatRate;

  // Total = subtotal + VAT
  // NOTE: Use invoiceData.total_amount if available (from DB), otherwise calculate
  const calculatedTotal = subtotal + vatAmount;
  const total = invoiceData?.total_amount ? parseFloat(invoiceData.total_amount) : calculatedTotal;

  return (
    <div className="invoice-cost-breakdown">
      <div className="breakdown-header">
        <FaTag className="breakdown-icon" />
        <h5 className="breakdown-title">Cost Breakdown</h5>
      </div>

      <div className="breakdown-table-wrapper">
        <table className="breakdown-table">
          <thead>
            <tr>
              <th className="breakdown-col-item">Item</th>
              <th className="breakdown-col-desc">Description</th>
              <th className="breakdown-col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {costItems.length > 0 ? (
              costItems.map((item, index) => (
                <tr key={index}>
                  <td className="breakdown-item-name">
                    <FaCoins className="item-icon" />
                    {item.name}
                  </td>
                  <td className="breakdown-item-desc">{item.description}</td>
                  <td className="breakdown-item-amount">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(item.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center text-muted py-3">
                  No cost items found
                </td>
              </tr>
            )}

            {/* Subtotal */}
            <tr className="breakdown-subtotal-row">
              <td colSpan={2} className="breakdown-subtotal-label">
                <strong>Subtotal</strong>
              </td>
              <td className="breakdown-subtotal-amount">
                <strong>
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(subtotal)}
                </strong>
              </td>
            </tr>

            {/* VAT */}
            <tr className="breakdown-vat-row">
              <td colSpan={2} className="breakdown-vat-label">
                <strong>VAT (10%)</strong>
              </td>
              <td className="breakdown-vat-amount">
                <strong>
                  {new Intl.NumberFormat("vi-VN", {
                    style: "currency",
                    currency: "VND",
                  }).format(vatAmount)}
                </strong>
              </td>
            </tr>

            {/* Total */}
            <tr className="breakdown-total-row">
              <td colSpan={2} className="breakdown-total-label">
                <strong>TOTAL</strong>
              </td>
              <td className="breakdown-total-amount">
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

      {/* COD Amount Display (separate, not included in total) */}
      {orderData && orderData.cod_amount > 0 && (
        <div className="cod-display-box mt-3 p-3 bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong className="text-warning">COD Amount (Display Only)</strong>
              <p className="text-muted small mb-0">
                This amount is collected from receiver and not included in invoice total.
              </p>
            </div>
            <div className="text-end">
              <div className="fw-bold text-warning fs-5">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(orderData.cod_amount)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to get fee description based on fee code/type
 */
function getFeeDescription(feeCode, feeType) {
  const descriptions = {
    base_fee: "Base shipping fee",
    weight_fee: "Weight-based fee",
    distance_fee: "Distance-based fee",
    extra: "Additional service fee",
    insurance_fee: "Insurance fee",
    service_surcharge: "Service surcharge",
  };

  if (feeCode && descriptions[feeCode]) {
    return descriptions[feeCode];
  }

  const typeDescriptions = {
    base: "Base fee",
    weight: "Weight-based fee",
    extra: "Additional fee",
    cod: "COD fee",
    insurance: "Insurance fee",
  };

  return typeDescriptions[feeType] || "Service fee";
}

