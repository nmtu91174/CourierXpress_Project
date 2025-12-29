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
};

