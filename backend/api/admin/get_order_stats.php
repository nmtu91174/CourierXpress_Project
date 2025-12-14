<?php
// backend/api/admin/get_order_stats.php
// API endpoint để lấy KPI statistics cho orders

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

// ==========================
// QUERY KPI STATS
// ==========================
$stmt = $conn->prepare("
    SELECT 
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) AS in_transit,
        SUM(CASE WHEN status = 5 THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN status = 6 THEN 1 ELSE 0 END) AS failed,
        COALESCE(SUM(total_shipping_fee), 0) AS total_revenue
    FROM orders
");

$stmt->execute();
$result = $stmt->get_result();
$stats = $result->fetch_assoc();

// Calculate percentages
$total = (int)$stats["total_orders"];
$delivered = (int)$stats["delivered"];
$failed = (int)$stats["failed"];

$successRate = $total > 0 ? round(($delivered / $total) * 100) : 0;
$cancelRate = $total > 0 ? round(($failed / $total) * 100) : 0;

$response = [
    "total_orders" => $total,
    "in_transit" => (int)$stats["in_transit"],
    "delivered" => $delivered,
    "failed" => $failed,
    "total_revenue" => (float)$stats["total_revenue"],
    "success_rate" => $successRate,
    "cancel_rate" => $cancelRate,
];

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Order statistics", $response);

