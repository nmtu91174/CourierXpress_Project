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
require_role(["admin", "agent"]);

$userId = (int)$GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// PAGINATION
// ==========================
$page  = max(1, (int)($_GET["page"]  ?? 1));
$limit = min(100, max(1, (int)($_GET["limit"] ?? 10)));
$offset = ($page - 1) * $limit;

// ==========================
// FILTERS
// ==========================
$where = [];
$params = [];
$types = "";

// Status filter
if (isset($_GET["status"]) && $_GET["status"] !== "all" && $_GET["status"] !== "") {
    $where[] = "inv.status = ?";
    $params[] = $_GET["status"];
    $types .= "s";
}

// Search filter
if (isset($_GET["search"]) && trim($_GET["search"]) !== "") {
    $search = "%" . trim($_GET["search"]) . "%";
    $where[] = "(inv.invoice_number LIKE ? OR o.order_code LIKE ?)";
    $params[] = $search;
    $params[] = $search;
    $types .= "ss";
}

// Date range filter
if (isset($_GET["date_from"]) && trim($_GET["date_from"]) !== "") {
    $where[] = "DATE(inv.created_at) >= ?";
    $params[] = $_GET["date_from"];
    $types .= "s";
}

if (isset($_GET["date_to"]) && trim($_GET["date_to"]) !== "") {
    $where[] = "DATE(inv.created_at) <= ?";
    $params[] = $_GET["date_to"];
    $types .= "s";
}

$whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

// ==========================
// COUNT TOTAL
// ==========================
$sqlCount = "
    SELECT COUNT(*) as total
    FROM invoices inv
    LEFT JOIN orders o ON inv.order_id = o.id
    " . $whereClause . "
";

// Debug logging
error_log("Invoice List Query - WHERE clause: " . $whereClause);
error_log("Invoice List Query - Params: " . json_encode($params));

$stmt = $conn->prepare($sqlCount);
if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi truy vấn database");
}

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

if (!$stmt->execute()) {
    error_log("Execute failed: " . $stmt->error);
    Response::serverError("Lỗi thực thi truy vấn");
}

$result = $stmt->get_result();
$totalRow = $result->fetch_assoc();
$total = (int)($totalRow["total"] ?? 0);
$stmt->close();

$totalPages = max(1, ceil($total / $limit));

// Debug logging
error_log("Invoice List - Total invoices: " . $total);
error_log("Invoice List - Total pages: " . $totalPages);

// ==========================
// FETCH INVOICES
// ==========================
$sqlList = "
    SELECT 
        inv.id,
        inv.invoice_number,
        inv.total_amount,
        inv.status,
        inv.created_at,
        inv.payment_method_id,
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
        pm.name AS payment_method_name,
        pm.code AS payment_method_code
    FROM invoices inv
    LEFT JOIN orders o ON inv.order_id = o.id
    LEFT JOIN payment_methods pm ON inv.payment_method_id = pm.id
    " . $whereClause . "
    ORDER BY inv.created_at DESC
    LIMIT ? OFFSET ?
";

$paramsList = $params;
$typesList  = $types . "ii";
$paramsList[] = $limit;
$paramsList[] = $offset;

// Debug logging
error_log("Invoice List SQL: " . $sqlList);
error_log("Invoice List Params: " . json_encode($paramsList));
error_log("Invoice List Types: " . $typesList);

$stmt = $conn->prepare($sqlList);
if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi truy vấn database");
}

// Always bind params (limit and offset are always present)
$stmt->bind_param($typesList, ...$paramsList);

if (!$stmt->execute()) {
    error_log("Execute failed: " . $stmt->error);
    Response::serverError("Lỗi thực thi truy vấn");
}

$result = $stmt->get_result();
$items = [];

// Debug logging
error_log("Invoice List - Rows fetched: " . $result->num_rows);

while ($row = $result->fetch_assoc()) {
    // Debug first row
    if (count($items) === 0) {
        error_log("Invoice List - First row: " . json_encode($row));
    }
    $items[] = [
        "id" => (int)$row["id"],
        "invoice_number" => $row["invoice_number"],
        "total_amount" => (float)$row["total_amount"],
        "status" => $row["status"],
        "created_at" => $row["created_at"],
        "payment_method_id" => $row["payment_method_id"] ? (int)$row["payment_method_id"] : null,
        "payment_method_name" => $row["payment_method_name"],
        "order" => [
            "id" => (int)$row["order_id"],
            "order_code" => $row["order_code"],
            "sender_name" => $row["sender_name"],
            "sender_phone" => $row["sender_phone"],
            "sender_address" => $row["sender_address"],
            "receiver_name" => $row["receiver_name"],
            "receiver_phone" => $row["receiver_phone"],
            "receiver_address" => $row["receiver_address"],
            "total_shipping_fee" => (float)$row["total_shipping_fee"],
            "cod_amount" => (float)$row["cod_amount"],
        ],
    ];
}

$stmt->close();

// Debug logging
error_log("Invoice List - Final items count: " . count($items));
error_log("Invoice List - Total from count query: " . $total);

Response::success("Invoices retrieved successfully", [
    "items" => $items,
    "pagination" => [
        "page" => $page,
        "limit" => $limit,
        "total" => $total,
        "totalPages" => $totalPages,
    ],
]);

