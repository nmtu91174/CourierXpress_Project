<?php
// backend/api/public/get_invoice_by_token.php
// Public API endpoint for invoice viewing via token (for email links)
// No authentication required - token is the security mechanism

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// Only GET method allowed
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode([
        "status" => "error",
        "message" => "Only GET method is allowed"
    ]);
    exit;
}

// ==========================
// CORE
// ==========================
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";

// ==========================
// VALIDATE INPUT
// ==========================
$token = trim($_GET["token"] ?? "");

if (empty($token)) {
    Response::error("Token is required");
}

// Validate token format (should be a hash)
if (strlen($token) < 32) {
    Response::error("Invalid token format");
}

// ==========================
// VERIFY TOKEN AND GET INVOICE
// ==========================
// Token is stateless: hash_hmac('sha256', invoice_number . order_code, SECRET_KEY)
// We need order_code from URL to query invoice, then verify token matches

$orderCode = trim($_GET["order_code"] ?? "");

if (empty($orderCode)) {
    Response::error("Order code is required along with token");
}

require_once __DIR__ . "/../../utils/InvoiceTokenGenerator.php";

// Get invoice by order code
$sql = "
    SELECT 
        inv.id AS invoice_id,
        inv.invoice_number,
        inv.order_id,
        inv.total_amount,
        inv.status AS invoice_status,
        inv.payment_method_id,
        inv.created_at AS invoice_created_at,
        o.id AS order_id,
        o.order_code,
        o.sender_name,
        o.sender_phone,
        o.sender_address,
        o.receiver_name,
        o.receiver_phone,
        o.receiver_address,
        o.total_shipping_fee,
        o.cod_amount,
        o.penalty_fee,
        o.weight,
        o.notes,
        o.created_at,
        pm.name AS payment_method_name,
        pm.code AS payment_method_code,
        st.name AS service_type_name,
        st.fee AS service_type_fee
    FROM orders o
    LEFT JOIN invoices inv ON o.id = inv.order_id
    LEFT JOIN payment_methods pm ON inv.payment_method_id = pm.id
    LEFT JOIN service_types st ON o.service_type = st.id
    WHERE o.order_code = ?
    LIMIT 1
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Database query error");
}

$stmt->bind_param("s", $orderCode);
if (!$stmt->execute()) {
    error_log("Execute failed: " . $stmt->error);
    Response::serverError("Database execution error");
}

$result = $stmt->get_result();
$row = $result->fetch_assoc();
$stmt->close();

if (!$row || !$row["order_id"]) {
    Response::error("Order not found");
}

// Check if invoice exists
if (!$row["invoice_id"] && !$row["invoice_number"]) {
    Response::error("Invoice not found for this order. Invoice may not have been generated yet.");
}

// Verify token
require_once __DIR__ . "/../../utils/InvoiceTokenGenerator.php";
if (!InvoiceTokenGenerator::verify($token, $row["invoice_number"], $row["order_code"])) {
    Response::error("Invalid or expired token");
}

// ==========================
// GET ORDER FEES
// ==========================
$orderId = (int)$row["order_id"];
$feesSql = "
    SELECT 
        of.*,
        f.name AS fee_name,
        f.code AS fee_code,
        f.type AS fee_type
    FROM order_fees of
    LEFT JOIN fees f ON of.fee_id = f.id
    WHERE of.order_id = ?
";

$feesStmt = $conn->prepare($feesSql);
if (!$feesStmt) {
    error_log("Prepare failed (fees): " . $conn->error);
    Response::serverError("Database query error");
}

$feesStmt->bind_param("i", $orderId);
if (!$feesStmt->execute()) {
    error_log("Execute failed (fees): " . $feesStmt->error);
    Response::serverError("Database execution error");
}

$feesResult = $feesStmt->get_result();
$fees = [];
while ($feeRow = $feesResult->fetch_assoc()) {
    $fees[] = [
        "fee_code" => $feeRow["fee_code"],
        "fee_type" => $feeRow["fee_type"],
        "name" => $feeRow["fee_name"],
        "amount" => (float)$feeRow["amount"],
    ];
}
$feesStmt->close();

// ==========================
// BUILD RESPONSE
// ==========================
$invoice = [
    "id" => (int)$row["invoice_id"],
    "invoice_number" => $row["invoice_number"],
    "order_id" => $orderId,
    "total_amount" => (float)$row["total_amount"],
    "status" => $row["invoice_status"] ?? "unpaid",
    "payment_method_id" => (int)($row["payment_method_id"] ?? 0),
    "payment_method_name" => $row["payment_method_name"],
    "payment_method_code" => $row["payment_method_code"],
    "created_at" => $row["invoice_created_at"] ?? $row["created_at"],
];

$order = [
    "id" => $orderId,
    "order_code" => $row["order_code"],
    "sender_name" => $row["sender_name"],
    "sender_phone" => $row["sender_phone"],
    "sender_address" => $row["sender_address"],
    "receiver_name" => $row["receiver_name"],
    "receiver_phone" => $row["receiver_phone"],
    "receiver_address" => $row["receiver_address"],
    "total_shipping_fee" => (float)$row["total_shipping_fee"],
    "cod_amount" => (float)$row["cod_amount"],
    "penalty_fee" => (float)($row["penalty_fee"] ?? 0),
    "weight" => (int)$row["weight"],
    "service_type_name" => $row["service_type_name"],
    "service_type_fee" => (float)($row["service_type_fee"] ?? 0),
    "payment_method_name" => $row["payment_method_name"],
    "notes" => $row["notes"],
    "created_at" => $row["created_at"],
    "fees" => $fees,
];

Response::success("Invoice retrieved successfully", [
    "invoice" => $invoice,
    "order" => $order,
]);

