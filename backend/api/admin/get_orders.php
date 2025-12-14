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
// Frontend React luôn gửi OPTIONS trước, middleware không được chặn
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
// Middleware sẽ tự start session và kiểm tra authentication
// Nếu không có session, middleware sẽ trả về 401 và exit
require_login();
require_role(["admin", "agent", "shipper", "customer"]);

// ⭐ QUY TẮC VÀNG: Middleware là single source of truth
// Không cần check $_SESSION hay fallback - middleware đã xử lý rồi
$userId = (int)$GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];


// ==========================
// PAGINATION
// ==========================
$page  = max(1, (int)($_GET["page"]  ?? 1));
$limit = min(100, max(1, (int)($_GET["limit"] ?? 10)));
$offset = ($page - 1) * $limit;

// ==========================
// BASE SQL (Enterprise - Join invoices)
// ==========================
$baseSql = "
    FROM orders o
    LEFT JOIN invoices inv ON o.id = inv.order_id
";

// ==========================
// ROLE FILTER (RBAC-aware)
// ==========================
$where   = [];
$params = [];
$types  = "";

switch ($role) {
    case "admin":
        // Admin thấy tất cả
        break;

    case "agent":
        $where[] = "o.agent_id = ?";
        $params[] = $userId;
        $types   .= "i";
        break;

    case "shipper":
        $where[] = "o.shipper_id = ?";
        $params[] = $userId;
        $types   .= "i";
        break;

    case "customer":
        $where[] = "o.customer_id = ?";
        $params[] = $userId;
        $types   .= "i";
        break;
}

// ==========================
// ENTERPRISE FILTERS
// ==========================

// 1. Status Group Filter
$statusGroup = $_GET["status_group"] ?? null;
if ($statusGroup && $statusGroup !== "all") {
    $statusGroups = [
        "pending" => [1],
        "approved" => [2],
        "handling" => [3, 4],
        "completed" => [5],
        "exception" => [6, 7],
    ];
    
    if (isset($statusGroups[$statusGroup])) {
        $statusList = $statusGroups[$statusGroup];
        $placeholders = implode(",", array_fill(0, count($statusList), "?"));
        $where[] = "o.status IN ($placeholders)";
        foreach ($statusList as $s) {
            $params[] = $s;
            $types .= "i";
        }
    }
}

// 2. Specific Status Filter
$status = $_GET["status"] ?? null;
if ($status && $status !== "all") {
    $where[] = "o.status = ?";
    $params[] = (int)$status;
    $types .= "i";
}

// 3. Agent Filter
$agentId = $_GET["agent_id"] ?? null;
if ($agentId && $agentId !== "all") {
    $where[] = "o.agent_id = ?";
    $params[] = (int)$agentId;
    $types .= "i";
}

// 4. Shipper Filter
$shipperId = $_GET["shipper_id"] ?? null;
if ($shipperId && $shipperId !== "all") {
    $where[] = "o.shipper_id = ?";
    $params[] = (int)$shipperId;
    $types .= "i";
}

// 5. Payment Method Filter
$paymentMethod = $_GET["payment_method_id"] ?? null;
if ($paymentMethod && $paymentMethod !== "all") {
    $where[] = "o.payment_method_id = ?";
    $params[] = (int)$paymentMethod;
    $types .= "i";
}

// 6. Payment Status Filter (Finance)
$paymentStatus = $_GET["payment_status"] ?? null;
if ($paymentStatus && $paymentStatus !== "all") {
    $where[] = "inv.status = ?";
    $params[] = $paymentStatus;
    $types .= "s";
}

// 7. COD Filter
$codFilter = $_GET["cod"] ?? null;
if ($codFilter === "has_cod") {
    $where[] = "o.cod_amount > 0";
} elseif ($codFilter === "no_cod") {
    $where[] = "(o.cod_amount IS NULL OR o.cod_amount = 0)";
}

// 8. Workflow Filters
$noAgent = isset($_GET["no_agent"]) && $_GET["no_agent"] === "1";
if ($noAgent) {
    $where[] = "(o.agent_id IS NULL OR o.agent_id = 0)";
}

$noShipper = isset($_GET["no_shipper"]) && $_GET["no_shipper"] === "1";
if ($noShipper) {
    $where[] = "(o.shipper_id IS NULL OR o.shipper_id = 0)";
}

$assignedNotPicked = isset($_GET["assigned_not_picked"]) && $_GET["assigned_not_picked"] === "1";
if ($assignedNotPicked) {
    $where[] = "o.status = 3"; // ASSIGNED
}

// 9. Date Range Filter
$dateFrom = $_GET["date_from"] ?? null;
if ($dateFrom) {
    $where[] = "DATE(o.created_at) >= ?";
    $params[] = $dateFrom;
    $types .= "s";
}

$dateTo = $_GET["date_to"] ?? null;
if ($dateTo) {
    $where[] = "DATE(o.created_at) <= ?";
    $params[] = $dateTo;
    $types .= "s";
}

// 10. Advanced Search (Enterprise)
$search = $_GET["search"] ?? null;
if ($search && trim($search) !== "") {
    $searchTerm = "%" . trim($search) . "%";
    $where[] = "(
        o.order_code LIKE ? 
        OR o.sender_phone LIKE ? 
        OR o.receiver_phone LIKE ?
        OR inv.invoice_number LIKE ?
    )";
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $types .= "ssss";
}

// Build WHERE clause
$whereClause = "";
if (!empty($where)) {
    $whereClause = " WHERE " . implode(" AND ", $where);
}

// ==========================
// COUNT
// ==========================
$sqlCount = "SELECT COUNT(*) AS total " . $baseSql . $whereClause;
$stmtCount = $conn->prepare($sqlCount);
if (!$stmtCount) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi truy vấn database");
}
if ($params && !empty($types)) {
    $stmtCount->bind_param($types, ...$params);
}
$stmtCount->execute();
$resultCount = $stmtCount->get_result();
if (!$resultCount) {
    error_log("Execute failed: " . $stmtCount->error);
    Response::serverError("Lỗi thực thi truy vấn");
}
$total = (int)$resultCount->fetch_assoc()["total"];
$stmtCount->close();

// ==========================
// LIST (Enterprise - Include invoice info)
// ==========================
$sqlList = "
    SELECT 
        o.id,
        o.order_code,
        o.sender_name,
        o.sender_phone,
        o.sender_address,
        o.receiver_name,
        o.receiver_phone,
        o.receiver_address,
        o.status,
        o.created_at,
        o.customer_id,
        o.agent_id,
        o.shipper_id,
        o.cod_amount,
        o.total_shipping_fee,
        o.notes,
        o.payment_method_id,
        inv.invoice_number,
        inv.status AS invoice_status
    " . $baseSql . $whereClause . "
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
";

$paramsList = $params;
$typesList  = $types . "ii";
$paramsList[] = $limit;
$paramsList[] = $offset;

$stmt = $conn->prepare($sqlList);
if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi truy vấn database");
}
$stmt->bind_param($typesList, ...$paramsList);
if (!$stmt->execute()) {
    error_log("Execute failed: " . $stmt->error);
    Response::serverError("Lỗi thực thi truy vấn");
}

$data = [];
$res = $stmt->get_result();
if ($res) {
while ($row = $res->fetch_assoc()) {
    $row["status"] = (int)$row["status"];
    $data[] = $row;
    }
}

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Danh sách đơn hàng", [
    "items" => $data,
    "pagination" => [
        "page"        => $page,
        "limit"       => $limit,
        "total"       => $total,
        "total_pages" => ceil($total / $limit)
    ]
]);
