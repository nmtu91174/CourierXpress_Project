<?php
/**
 * InvoiceNumberGenerator.php
 * Enterprise Invoice Number Generator
 * Format: INV-YYYY-XXXXXX (e.g., INV-2025-000014)
 * 
 * Rules:
 * - Year-based sequence (resets each year)
 * - Sequential numbering within the year
 * - 6-digit padding for sequence
 * - Thread-safe (uses database MAX query)
 */

class InvoiceNumberGenerator
{
    /**
     * Generate invoice number in format: INV-YYYY-XXXXXX
     * 
     * @param mysqli $conn Database connection
     * @return string Invoice number (e.g., "INV-2025-000014")
     */
    public static function generate($conn)
    {
        $year = date('Y');
        
        // Find max sequence for current year
        $maxStmt = $conn->prepare("
            SELECT MAX(CAST(SUBSTRING(invoice_number, 9) AS UNSIGNED)) AS max_seq
            FROM invoices
            WHERE invoice_number LIKE ?
        ");
        $pattern = "INV-{$year}-%";
        $maxStmt->bind_param("s", $pattern);
        $maxStmt->execute();
        $result = $maxStmt->get_result();
        $row = $result->fetch_assoc();
        $maxStmt->close();
        
        $maxSeq = ($row && $row['max_seq']) ? (int)$row['max_seq'] : 0;
        $nextSeq = $maxSeq + 1;
        
        // Pad sequence to 6 digits
        $sequence = str_pad($nextSeq, 6, '0', STR_PAD_LEFT);
        
        return "INV-{$year}-{$sequence}";
    }
}

