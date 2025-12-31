<?php
/**
 * InvoiceTokenGenerator.php
 * Generate secure tokens for invoice email links
 * 
 * Token format: hash_hmac('sha256', invoice_number . order_code, SECRET_KEY)
 * This is stateless - no need to store tokens in DB
 */

class InvoiceTokenGenerator
{
    private static $secretKey = "courierxpress_invoice_secret_2025"; // Should be moved to config/env
    
    /**
     * Generate token for invoice email link
     * 
     * @param string $invoiceNumber Invoice number (e.g., "INV2025000014")
     * @param string $orderCode Order code (e.g., "ORD0004")
     * @return string Token hash
     */
    public static function generate($invoiceNumber, $orderCode)
    {
        if (empty($invoiceNumber) || empty($orderCode)) {
            throw new InvalidArgumentException("Invoice number and order code are required");
        }
        
        return hash_hmac('sha256', $invoiceNumber . $orderCode, self::$secretKey);
    }
    
    /**
     * Verify token for invoice access
     * 
     * @param string $token Token to verify
     * @param string $invoiceNumber Invoice number
     * @param string $orderCode Order code
     * @return bool True if token is valid
     */
    public static function verify($token, $invoiceNumber, $orderCode)
    {
        if (empty($token) || empty($invoiceNumber) || empty($orderCode)) {
            return false;
        }
        
        $expectedToken = self::generate($invoiceNumber, $orderCode);
        return hash_equals($expectedToken, $token);
    }
}









