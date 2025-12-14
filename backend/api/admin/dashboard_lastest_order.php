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
// QUERY – LẤY ĐƠN MỚI NHẤT
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
        o.created_at
    FROM orders o
    ORDER BY o.created_at DESC
    LIMIT 5
";

$result = $conn->query($sql);

$orders = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $row["id"]         = (int)$row["id"];
        $row["status"]     = (int)$row["status"];
        $row["created_at"] = date("Y-m-d H:i", strtotime($row["created_at"]));
        $orders[] = $row;
    }
}

// ==========================
// RESPONSE
// ==========================
Response::success("Latest orders loaded", $orders);

$conn->close();
