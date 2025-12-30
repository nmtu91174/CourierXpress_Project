<?php
/**
 * InvoiceNumberGenerator.php
 * Enterprise Invoice Number Generator
 * Format: INVYYYYXXXXXX (e.g., INV2025000014) - 13 characters max
 * 
 * Rules:
 * - Year-based sequence (resets each year)
 * - Sequential numbering within the year
 * - 6-digit padding for sequence
 * - Thread-safe (uses database MAX query)
 * - Format: INV + YYYY + XXXXXX (no dashes to save space)
 */

class InvoiceNumberGenerator
{
    /**
     * Generate invoice number in format: INVYYYYXXXXXX
     * 
     * @param mysqli $conn Database connection
     * @return string Invoice number (e.g., "INV2025000014")
     */
    public static function generate($conn)
    {
        $year = date('Y');
        
        // Find max sequence for current year
        // Support both formats: INVYYYYXXXXXX (new) and INV-YYYY-XXXXXX (old)
        $maxStmt = $conn->prepare("
            SELECT invoice_number
            FROM invoices
            WHERE invoice_number LIKE ?
            ORDER BY invoice_number DESC
            LIMIT 1
        ");
        
        // Try new format first: INVYYYYXXXXXX
        $pattern = "INV{$year}%";
        $maxStmt->bind_param("s", $pattern);
        $maxStmt->execute();
        $result = $maxStmt->get_result();
        $row = $result->fetch_assoc();
        $maxStmt->close();
        
        $maxSeq = 0;
        
        if ($row && $row['invoice_number']) {
            $invoiceNum = $row['invoice_number'];
            
            // Handle new format: INVYYYYXXXXXX (13 chars)
            if (preg_match('/^INV' . $year . '(\d{6})$/', $invoiceNum, $matches)) {
                $maxSeq = (int)$matches[1];
            }
            // Handle old format: INV-YYYY-XXXXXX (for backward compatibility)
            elseif (preg_match('/^INV-' . $year . '-(\d{6})$/', $invoiceNum, $matches)) {
                $maxSeq = (int)$matches[1];
            }
        }
        
        $nextSeq = $maxSeq + 1;
        
        // Pad sequence to 6 digits
        $sequence = str_pad($nextSeq, 6, '0', STR_PAD_LEFT);
        
        // Return new format: INVYYYYXXXXXX (13 characters)
        return "INV{$year}{$sequence}";
    }
}

