<?php
// backend/api/admin/dashboard_latest_orders.php
// Dashboard – Recent Orders (Snapshot only)

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ OPTIONS phải exit sớm TRƯỚC middleware
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ==========================
// METHOD CHECK
// ==========================
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        "status"  => "error",
        "message" => "Method not allowed"
    ]);
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
require_role(["admin"]); // Dashboard chỉ cho admin

// ==========================
// GET PARAMETERS (Pagination)
// ==========================
$page = max(1, (int)($_GET["page"] ?? 1));
$limit = max(1, min(20, (int)($_GET["limit"] ?? 10))); // Default 10, max 20
$offset = ($page - 1) * $limit;

// ==========================
// QUERY – LẤY ĐƠN CẦN HÀNH ĐỘNG (booked + approved)
// Dashboard chỉ hiển thị orders cần xử lý
// ==========================
$sql = "
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
        o.agent_id,
        o.shipper_id,
        o.service_type,
        o.total_shipping_fee
    FROM orders o
    WHERE o.status IN (1, 2)  -- CHỈ booked (1) và approved (2)
    ORDER BY 
      CASE o.status
        WHEN 2 THEN 1   -- APPROVED (higher priority - needs shipper assignment)
        WHEN 1 THEN 2   -- BOOKED (new, pending approval)
        ELSE 99
      END,
      o.updated_at DESC,
      o.created_at DESC
    LIMIT ? OFFSET ?
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    Response::serverError("Database query error: " . $conn->error);
}

$stmt->bind_param("ii", $limit, $offset);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row["id"]         = (int)$row["id"];
        $row["status"]     = (int)$row["status"];
        $row["agent_id"]   = $row["agent_id"] ? (int)$row["agent_id"] : null;
        $row["shipper_id"] = $row["shipper_id"] ? (int)$row["shipper_id"] : null;
        $row["service_type"] = $row["service_type"] ? (int)$row["service_type"] : null;
        $row["total_shipping_fee"] = (float)($row["total_shipping_fee"] ?? 0);
        $row["created_at"] = date("Y-m-d H:i:s", strtotime($row["created_at"]));
        $orders[] = $row;
    }
}
$stmt->close();

// ==========================
// COUNT TOTAL (for pagination)
// ==========================
$countSql = "SELECT COUNT(*) AS total FROM orders WHERE status IN (1, 2)";
$countResult = $conn->query($countSql);
$totalCount = 0;
if ($countResult) {
    $countRow = $countResult->fetch_assoc();
    $totalCount = (int)($countRow["total"] ?? 0);
}

$totalPages = $limit > 0 ? ceil($totalCount / $limit) : 1;

// ==========================
// RESPONSE
// ==========================
Response::success("Dashboard orders loaded", [
    "items" => $orders,
    "pagination" => [
        "page" => $page,
        "limit" => $limit,
        "total" => $totalCount,
        "totalPages" => $totalPages,
    ],
]);

$conn->close();
