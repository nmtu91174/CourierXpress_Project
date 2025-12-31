// frontend/src/utils/invoiceFormatter.js
// Format invoice numbers for display (UI-friendly)

/**
 * Format invoice number for display
 * DB Format: INV2025000001 (13 chars, no dashes)
 * UI Format: INV-2025-000001 (with dashes for readability)
 * 
 * @param {string} raw - Invoice number from DB (e.g., "INV2025000001")
 * @returns {string} Formatted invoice number (e.g., "INV-2025-000001")
 */
export function formatInvoiceNumber(raw) {
  if (!raw || typeof raw !== 'string') {
    return raw || '';
  }

  // If already formatted (contains dashes), return as is
  if (raw.includes('-')) {
    return raw;
  }

  // Handle new format: INVYYYYXXXXXX (13 chars)
  // Example: INV2025000001 -> INV-2025-000001
  const match = raw.match(/^INV(\d{4})(\d{6})$/);
  if (match) {
    const [, year, number] = match;
    return `INV-${year}-${number}`;
  }

  // Handle old format: INV-YYYY-XXXXXX (for backward compatibility)
  if (raw.match(/^INV-\d{4}-\d{6}$/)) {
    return raw; // Already formatted
  }

  // If format doesn't match, return original
  return raw;
}

/**
 * Get raw invoice number (remove formatting for DB operations)
 * 
 * @param {string} formatted - Formatted invoice number (e.g., "INV-2025-000001")
 * @returns {string} Raw invoice number (e.g., "INV2025000001")
 */
export function getRawInvoiceNumber(formatted) {
  if (!formatted || typeof formatted !== 'string') {
    return formatted || '';
  }

  // Remove dashes if present
  return formatted.replace(/-/g, '');
}









