<?php
// backend/api/agent/get_order_report.php
// Agent Order Report - REAL DATA from orders + statuses tables

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
// AUTH - Agent only
// ==========================
require_login();
require_role(["agent", "admin"]);

$userId = (int)$GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// QUERY ORDERS FOR CURRENT AGENT
// ==========================
// Agent can only see orders assigned to them (agent_id = current user id)
$sql = "
    SELECT 
        o.id,
        o.order_code,
        o.status,
        s.code AS status_code,
        s.description AS status_description,
        o.total_amount,
        o.created_at
    FROM orders o
    LEFT JOIN statuses s ON o.status = s.id
    WHERE o.agent_id = ?
    ORDER BY o.created_at DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

if (!$result) {
    Response::serverError("Lỗi truy vấn database: " . $conn->error);
}

$orders = [];
while ($row = $result->fetch_assoc()) {
    $orders[] = [
        "id" => (int)$row["id"],
        "order_code" => $row["order_code"],
        "status" => $row["status_code"] ?: $row["status"],
        "status_description" => $row["status_description"] ?: "N/A",
        "total_amount" => (float)$row["total_amount"],
        "created_at" => $row["created_at"],
    ];
}

$stmt->close();

Response::success("Lấy báo cáo đơn hàng thành công", [
    "orders" => $orders,
    "total" => count($orders),
]);

