<?php
// backend/api/admin/generate_invoice_token_url.php
// Generate token-based invoice URL for email links

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";
require_once __DIR__ . "/../../utils/InvoiceTokenGenerator.php";

require_login();
require_role(["admin", "agent"]);

// Get invoice_id or order_id
$invoiceId = (int)($_GET["invoice_id"] ?? 0);
$orderId = (int)($_GET["order_id"] ?? 0);

if ($invoiceId <= 0 && $orderId <= 0) {
    Response::error("invoice_id or order_id is required");
}

// Get invoice data
if ($invoiceId > 0) {
    $sql = "SELECT inv.invoice_number, o.order_code 
            FROM invoices inv
            LEFT JOIN orders o ON inv.order_id = o.id
            WHERE inv.id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $invoiceId);
} else {
    $sql = "SELECT inv.invoice_number, o.order_code 
            FROM orders o
            LEFT JOIN invoices inv ON o.id = inv.order_id
            WHERE o.id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $orderId);
}

if (!$stmt->execute()) {
    error_log("Execute failed: " . $stmt->error);
    Response::serverError("Database execution error");
}

$result = $stmt->get_result();
$row = $result->fetch_assoc();
$stmt->close();

if (!$row || !$row["invoice_number"] || !$row["order_code"]) {
    Response::error("Invoice or order not found");
}

// Generate token
$token = InvoiceTokenGenerator::generate($row["invoice_number"], $row["order_code"]);

// Build URL (frontend will construct full URL)
$baseUrl = $_ENV["FRONTEND_URL"] ?? "http://localhost:5173";
$invoiceUrl = $baseUrl . "/invoice/view?token=" . urlencode($token) . "&order_code=" . urlencode($row["order_code"]);

Response::success("Token URL generated", [
    "token" => $token,
    "order_code" => $row["order_code"],
    "invoice_url" => $invoiceUrl,
]);

