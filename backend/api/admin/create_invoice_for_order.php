<?php
// backend/api/admin/create_invoice_for_order.php
// Create invoice for an order if it doesn't exist

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
// INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);
$orderId = isset($data["order_id"]) ? (int)$data["order_id"] : 0;

if ($orderId <= 0) {
    Response::error("order_id is required");
}

// ==========================
// CHECK IF INVOICE ALREADY EXISTS
// ==========================
$checkStmt = $conn->prepare("SELECT id FROM invoices WHERE order_id = ?");
$checkStmt->bind_param("i", $orderId);
$checkStmt->execute();
$result = $checkStmt->get_result();

if ($result->num_rows > 0) {
    $checkStmt->close();
    Response::error("Invoice already exists for this order");
}

$checkStmt->close();

// ==========================
// GET ORDER DATA
// ==========================
$orderStmt = $conn->prepare("
    SELECT 
        id,
        total_shipping_fee,
        payment_method_id,
        status
    FROM orders
    WHERE id = ?
");
$orderStmt->bind_param("i", $orderId);
$orderStmt->execute();
$order = $orderStmt->get_result()->fetch_assoc();
$orderStmt->close();

if (!$order) {
    Response::error("Order not found");
}

// ==========================
// GENERATE INVOICE NUMBER
// ==========================
require_once __DIR__ . "/../../utils/InvoiceNumberGenerator.php";
$invoiceNumber = InvoiceNumberGenerator::generate($conn);

// ==========================
// CREATE INVOICE
// ==========================
$totalAmount = (float)$order["total_shipping_fee"];
$paymentMethodId = $order["payment_method_id"] ? (int)$order["payment_method_id"] : null;
$status = "unpaid"; // Default to unpaid

$insertStmt = $conn->prepare("
    INSERT INTO invoices (order_id, invoice_number, total_amount, status, payment_method_id, created_at)
    VALUES (?, ?, ?, ?, ?, NOW())
");
$insertStmt->bind_param("isdsi", $orderId, $invoiceNumber, $totalAmount, $status, $paymentMethodId);

if (!$insertStmt->execute()) {
    error_log("Failed to create invoice: " . $insertStmt->error);
    Response::serverError("Failed to create invoice");
}

$invoiceId = $insertStmt->insert_id;
$insertStmt->close();

Response::success("Invoice created successfully", [
    "invoice_id" => $invoiceId,
    "invoice_number" => $invoiceNumber,
    "order_id" => $orderId,
]);

