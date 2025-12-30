<?php
/**
 * InvoiceFormatter.php
 * Format invoice numbers for display (UI-friendly)
 * 
 * DB Format: INV2025000001 (13 chars, no dashes)
 * UI Format: INV-2025-000001 (with dashes for readability)
 */

class InvoiceFormatter
{
    /**
     * Format invoice number for display
     * 
     * @param string $raw Invoice number from DB (e.g., "INV2025000001")
     * @return string Formatted invoice number (e.g., "INV-2025-000001")
     */
    public static function formatForDisplay($raw)
    {
        if (empty($raw)) {
            return $raw;
        }

        // If already formatted (contains dashes), return as is
        if (strpos($raw, '-') !== false) {
            return $raw;
        }

        // Handle new format: INVYYYYXXXXXX (13 chars)
        // Example: INV2025000001 -> INV-2025-000001
        if (preg_match('/^INV(\d{4})(\d{6})$/', $raw, $matches)) {
            $year = $matches[1];
            $number = $matches[2];
            return "INV-{$year}-{$number}";
        }

        // Handle old format: INV-YYYY-XXXXXX (for backward compatibility)
        if (preg_match('/^INV-(\d{4})-(\d{6})$/', $raw, $matches)) {
            return $raw; // Already formatted
        }

        // If format doesn't match, return original
        return $raw;
    }

    /**
     * Get raw invoice number (remove formatting for DB operations)
     * 
     * @param string $formatted Formatted invoice number (e.g., "INV-2025-000001")
     * @return string Raw invoice number (e.g., "INV2025000001")
     */
    public static function getRaw($formatted)
    {
        if (empty($formatted)) {
            return $formatted;
        }

        // Remove dashes if present
        return str_replace('-', '', $formatted);
    }
}




