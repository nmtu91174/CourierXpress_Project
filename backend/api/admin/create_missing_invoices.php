<?php
// backend/api/admin/create_missing_invoices.php
// Create invoices for all delivered orders that don't have invoices

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================
// CORE
// ==========================
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";

// ==========================
// AUTH
// ==========================
require_login();
require_role(["admin"]);

$userId = (int)$GLOBALS['auth_user']['id'];

// ==========================
// FIND ORDERS WITHOUT INVOICES
// ==========================
$sql = "
    SELECT 
        o.id as order_id,
        o.total_shipping_fee,
        o.payment_method_id,
        o.order_code
    FROM orders o
    LEFT JOIN invoices inv ON o.id = inv.order_id
    WHERE inv.id IS NULL
    AND o.status IN (5, 6)  -- Delivered or Failed
    ORDER BY o.id DESC
";

$result = $conn->query($sql);
$ordersWithoutInvoices = [];
while ($row = $result->fetch_assoc()) {
    $ordersWithoutInvoices[] = $row;
}

$createdCount = 0;
$errors = [];

// ==========================
// CREATE INVOICES
// ==========================
require_once __DIR__ . "/../../utils/InvoiceNumberGenerator.php";

foreach ($ordersWithoutInvoices as $order) {
    try {
        // Generate invoice number (enterprise format: INV-YYYY-XXXXXX)
        $invoiceNumber = InvoiceNumberGenerator::generate($conn);

        // Get order data
        $totalAmount = (float)$order["total_shipping_fee"];
        $paymentMethodId = $order["payment_method_id"] ? (int)$order["payment_method_id"] : null;
        $orderId = (int)$order["order_id"];

        // Create invoice
        $insertStmt = $conn->prepare("
            INSERT INTO invoices (order_id, invoice_number, total_amount, status, payment_method_id, created_at)
            VALUES (?, ?, ?, 'unpaid', ?, NOW())
        ");
        $insertStmt->bind_param("isdi", $orderId, $invoiceNumber, $totalAmount, $paymentMethodId);

        if ($insertStmt->execute()) {
            $createdCount++;
        } else {
            $errors[] = "Failed to create invoice for order #{$orderId}: " . $insertStmt->error;
        }
        $insertStmt->close();
    } catch (Exception $e) {
        $errors[] = "Error creating invoice for order #{$order['order_id']}: " . $e->getMessage();
    }
}

Response::success("Invoice creation completed", [
    "orders_found" => count($ordersWithoutInvoices),
    "invoices_created" => $createdCount,
    "errors" => $errors,
]);

