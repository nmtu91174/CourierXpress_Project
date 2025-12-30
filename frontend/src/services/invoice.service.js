// frontend/src/services/invoice.service.js
// Enterprise Invoice Service - API communication layer

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8888/api";

/**
 * Invoice Service - Clean API abstraction
 * All invoice-related API calls go through here
 */
export const invoiceService = {
  /**
   * Get invoice list with pagination
   * @param {Object} params - Query parameters (page, limit, status, search, etc.)
   * @returns {Promise<Object>} Invoice list with pagination
   */
  async getInvoiceList(params = {}) {
    try {
      const queryParams = new URLSearchParams({
        page: params.page || 1,
        limit: params.limit || 10,
        ...(params.status && { status: params.status }),
        ...(params.search && { search: params.search }),
        ...(params.dateFrom && { date_from: params.dateFrom }),
        ...(params.dateTo && { date_to: params.dateTo }),
      });

      const response = await fetch(`${API_BASE}/admin/get_invoices.php?${queryParams}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Debug logging
      console.log("Invoice Service - Raw API response:", result);
      console.log("Invoice Service - result.data:", result.data);
      console.log("Invoice Service - result.data.items:", result.data?.items);
      
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to fetch invoices");
      }

      return result.data || { items: [], pagination: {} };
    } catch (error) {
      console.error("invoiceService.getInvoiceList error:", error);
      throw error;
    }
  },

  /**
   * Get invoice detail by ID
   * @param {number} invoiceId - Invoice ID
   * @returns {Promise<Object>} Invoice detail with order and fees
   */
  async getInvoiceDetail(invoiceId) {
    try {
      const response = await fetch(`${API_BASE}/admin/get_invoice.php?invoice_id=${invoiceId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to fetch invoice detail");
      }

      return result.data;
    } catch (error) {
      console.error("invoiceService.getInvoiceDetail error:", error);
      throw error;
    }
  },

  /**
   * Get invoice by order ID
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} Invoice data
   */
  async getInvoiceByOrderId(orderId) {
    try {
      const response = await fetch(`${API_BASE}/admin/get_invoice.php?order_id=${orderId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to fetch invoice");
      }

      return result.data;
    } catch (error) {
      console.error("invoiceService.getInvoiceByOrderId error:", error);
      throw error;
    }
  },

  /**
   * Reprint invoice (re-fetch invoice data)
   * @param {number} invoiceId - Invoice ID
   * @returns {Promise<Object>} Invoice data for reprint
   */
  async reprintInvoice(invoiceId) {
    // Reprint is the same as getInvoiceDetail
    return this.getInvoiceDetail(invoiceId);
  },

  /**
   * Get customer invoice by order ID (validates ownership)
   * @param {number} orderId - Order ID
   * @returns {Promise<Object>} Invoice data with order and fees
   */
  async getCustomerInvoiceByOrderId(orderId) {
    try {
      // Use customer endpoint if exists, otherwise use admin endpoint (backend should validate)
      // TODO: Create dedicated customer endpoint: /api/customer/get_invoice.php
      const response = await fetch(`${API_BASE}/admin/get_invoice.php?order_id=${orderId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to fetch invoice. You may not have permission to view this invoice.");
      }

      return result.data;
    } catch (error) {
      console.error("invoiceService.getCustomerInvoiceByOrderId error:", error);
      throw error;
    }
  },

  /**
   * Get guest invoice by order code (public, no authentication required)
   * @param {string} orderCode - Order code (e.g., "ORD0001")
   * @returns {Promise<Object>} Invoice data with order and fees
   */
  async getGuestInvoiceByOrderCode(orderCode) {
    try {
      const response = await fetch(`${API_BASE}/public/get_guest_invoice.php?order_code=${encodeURIComponent(orderCode)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to fetch invoice. Please check the order code.");
      }

      return result.data;
    } catch (error) {
      console.error("invoiceService.getGuestInvoiceByOrderCode error:", error);
      throw error;
    }
  },

  /**
   * Get invoice by token (public, for email links)
   * @param {string} token - Invoice access token
   * @param {string} orderCode - Order code (required with token)
   * @returns {Promise<Object>} Invoice data with order and fees
   */
  async getInvoiceByToken(token, orderCode) {
    try {
      const queryParams = new URLSearchParams({
        token: token,
        order_code: orderCode,
      });

      const response = await fetch(`${API_BASE}/public/get_invoice_by_token.php?${queryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to fetch invoice. Invalid or expired token.");
      }

      return result.data;
    } catch (error) {
      console.error("invoiceService.getInvoiceByToken error:", error);
      throw error;
    }
  },

  /**
   * Mark invoice as paid
   * @param {number} invoiceId - Invoice ID
   * @param {number} paymentMethodId - Payment method ID (optional)
   * @param {number} amount - Payment amount (optional, defaults to invoice total_amount)
   * @returns {Promise<Object>} Success response with updated invoice data
   */
  async markAsPaid(invoiceId, paymentMethodId = null, amount = null) {
    try {
      const payload = {
        invoice_id: invoiceId,
      };

      if (paymentMethodId !== null) {
        payload.payment_method_id = paymentMethodId;
      }

      if (amount !== null) {
        payload.amount = amount;
      }

      const response = await fetch(`${API_BASE}/admin/invoices/mark_paid.php`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(result.message || "Failed to mark invoice as paid");
      }

      return result.data;
    } catch (error) {
      console.error("invoiceService.markAsPaid error:", error);
      throw error;
    }
  },
};

