<?php
// Test script to check invoices in database
require_once __DIR__ . "/../../db.php";

echo "=== Invoice Test Script ===\n\n";

// Count total invoices
$countResult = $conn->query("SELECT COUNT(*) as total FROM invoices");
$countRow = $countResult->fetch_assoc();
echo "Total invoices in database: " . $countRow['total'] . "\n\n";

// Get first 10 invoices
$result = $conn->query("
    SELECT 
        inv.id,
        inv.invoice_number,
        inv.total_amount,
        inv.status,
        inv.created_at,
        o.order_code,
        o.status as order_status
    FROM invoices inv
    LEFT JOIN orders o ON inv.order_id = o.id
    ORDER BY inv.created_at DESC
    LIMIT 10
");

echo "First 10 invoices:\n";
echo str_repeat("-", 80) . "\n";
while ($row = $result->fetch_assoc()) {
    echo "ID: " . $row['id'] . "\n";
    echo "Invoice Number: " . $row['invoice_number'] . "\n";
    echo "Order Code: " . ($row['order_code'] ?? 'N/A') . "\n";
    echo "Total Amount: " . $row['total_amount'] . "\n";
    echo "Status: " . $row['status'] . "\n";
    echo "Order Status: " . ($row['order_status'] ?? 'N/A') . "\n";
    echo "Created At: " . $row['created_at'] . "\n";
    echo str_repeat("-", 80) . "\n";
}

// Check orders without invoices
$noInvoiceResult = $conn->query("
    SELECT COUNT(*) as total
    FROM orders o
    LEFT JOIN invoices inv ON o.id = inv.order_id
    WHERE inv.id IS NULL
");
$noInvoiceRow = $noInvoiceResult->fetch_assoc();
echo "\nOrders without invoices: " . $noInvoiceRow['total'] . "\n";

$conn->close();

