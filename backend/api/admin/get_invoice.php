<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ FIX 1: Cho OPTIONS thoát sớm TRƯỚC middleware
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
// AUTH - Sử dụng middleware
// ==========================
require_login();
require_role(["admin", "agent", "customer"]);

$userId = (int)$GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// VALIDATE INPUT
// ==========================
$invoiceId = (int)($_GET["invoice_id"] ?? 0);
$orderId = (int)($_GET["order_id"] ?? 0);

if ($invoiceId <= 0 && $orderId <= 0) {
    Response::error("invoice_id or order_id is required");
}

// ==========================
// GET INVOICE DETAIL
// ==========================
if ($invoiceId > 0) {
    $sql = "
        SELECT 
            inv.*,
            o.*,
            pm.name AS payment_method_name,
            pm.code AS payment_method_code,
            st.name AS service_type_name,
            st.fee AS service_type_fee,
            u_agent.name AS agent_name,
            u_shipper.name AS shipper_name,
            u_customer.name AS customer_name
        FROM invoices inv
        LEFT JOIN orders o ON inv.order_id = o.id
        LEFT JOIN payment_methods pm ON inv.payment_method_id = pm.id
        LEFT JOIN service_types st ON o.service_type = st.id
        LEFT JOIN users u_agent ON o.agent_id = u_agent.id
        LEFT JOIN users u_shipper ON o.shipper_id = u_shipper.id
        LEFT JOIN users u_customer ON o.customer_id = u_customer.id
        WHERE inv.id = ?
    ";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        error_log("Prepare failed: " . $conn->error);
        Response::serverError("Lỗi truy vấn database");
    }
    
    $stmt->bind_param("i", $invoiceId);
} else {
    $sql = "
        SELECT 
            inv.*,
            o.*,
            pm.name AS payment_method_name,
            pm.code AS payment_method_code,
            st.name AS service_type_name,
            st.fee AS service_type_fee,
            u_agent.name AS agent_name,
            u_shipper.name AS shipper_name,
            u_customer.name AS customer_name
        FROM orders o
        LEFT JOIN invoices inv ON o.id = inv.order_id
        LEFT JOIN payment_methods pm ON inv.payment_method_id = pm.id
        LEFT JOIN service_types st ON o.service_type = st.id
        LEFT JOIN users u_agent ON o.agent_id = u_agent.id
        LEFT JOIN users u_shipper ON o.shipper_id = u_shipper.id
        LEFT JOIN users u_customer ON o.customer_id = u_customer.id
        WHERE o.id = ?
    ";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        error_log("Prepare failed: " . $conn->error);
        Response::serverError("Lỗi truy vấn database");
    }
    
    $stmt->bind_param("i", $orderId);
}

if (!$stmt->execute()) {
    error_log("Execute failed: " . $stmt->error);
    Response::serverError("Lỗi thực thi truy vấn");
}

$result = $stmt->get_result();
$row = $result->fetch_assoc();
$stmt->close();

if (!$row) {
    Response::error("Invoice not found");
}

// Role-based access control
if ($role === "customer") {
    if ($row["customer_id"] != $userId) {
        Response::error("You don't have permission to view this invoice");
    }
} elseif ($role === "agent") {
    if ($row["agent_id"] != $userId) {
        Response::error("You don't have permission to view this invoice");
    }
}

// ==========================
// GET ORDER FEES
// ==========================
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
$orderIdForFees = (int)($row["order_id"] ?? $row["id"]);
$feesStmt->bind_param("i", $orderIdForFees);
$feesStmt->execute();
$feesResult = $feesStmt->get_result();
$fees = [];
while ($feeRow = $feesResult->fetch_assoc()) {
    $fees[] = [
        "id" => (int)$feeRow["id"],
        "fee_id" => (int)$feeRow["fee_id"],
        "fee_name" => $feeRow["fee_name"],
        "fee_code" => $feeRow["fee_code"],
        "fee_type" => $feeRow["fee_type"],
        "amount" => (float)$feeRow["amount"],
    ];
}
$feesStmt->close();

// ==========================
// BUILD RESPONSE
// ==========================
$invoice = [
    "id" => (int)$row["id"],
    "invoice_number" => $row["invoice_number"],
    "total_amount" => (float)$row["total_amount"],
    "status" => $row["status"],
    "payment_method_id" => $row["payment_method_id"] ? (int)$row["payment_method_id"] : null,
    "payment_method_name" => $row["payment_method_name"],
    "payment_method_code" => $row["payment_method_code"],
    "created_at" => $row["created_at"],
];

$order = [
    "id" => (int)$row["order_id"] ?? (int)$row["id"],
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
    "agent_name" => $row["agent_name"],
    "shipper_name" => $row["shipper_name"],
    "customer_name" => $row["customer_name"],
    "notes" => $row["notes"],
    "created_at" => $row["created_at"],
    "fees" => $fees,
];

Response::success("Invoice retrieved successfully", [
    "invoice" => $invoice,
    "order" => $order,
]);

