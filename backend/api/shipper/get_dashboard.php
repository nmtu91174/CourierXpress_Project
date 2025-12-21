<?php
// backend/api/shipper/get_dashboard.php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// CORS Headers
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

// Auth
require_login();
require_role(["shipper"]);

$shipperId = (int)$GLOBALS['auth_user']['id'];

try {
    // 1. Get Statistics
    // Status 2: Assigned (Need to accept)
    // Status 3, 4: In Progress (Picking up, Delivering)
    // Status 5: Completed
    $sqlStats = "
        SELECT 
            SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS assigned_count,
            SUM(CASE WHEN status IN (3, 4) THEN 1 ELSE 0 END) AS active_count,
            SUM(CASE WHEN status = 5 THEN 1 ELSE 0 END) AS completed_count
        FROM orders
        WHERE shipper_id = ?
    ";
    $stmtStats = $conn->prepare($sqlStats);
    $stmtStats->bind_param("i", $shipperId);
    $stmtStats->execute();
    $stats = $stmtStats->get_result()->fetch_assoc();

    // 2. Assigned orders (Status = 2)
    $sqlNew = "
        SELECT id, order_code, sender_address, receiver_address, status
        FROM orders
        WHERE shipper_id = ? AND status = 2
        ORDER BY created_at DESC
        LIMIT 5
    ";
    $stmtNew = $conn->prepare($sqlNew);
    $stmtNew->bind_param("i", $shipperId);
    $stmtNew->execute();
    $newOrders = $stmtNew->get_result()->fetch_all(MYSQLI_ASSOC);

    // 3. Recent orders (Status 3,4,5)
    $sqlRecent = "
        SELECT id, order_code, receiver_name, receiver_address, status
        FROM orders
        WHERE shipper_id = ? AND status IN (3,4,5)
        ORDER BY COALESCE(updated_at, created_at) DESC
        LIMIT 10
    ";
    $stmtRecent = $conn->prepare($sqlRecent);
    $stmtRecent->bind_param("i", $shipperId);
    $stmtRecent->execute();
    $recentOrders = $stmtRecent->get_result()->fetch_all(MYSQLI_ASSOC);

    Response::success("Dashboard data fetched", [
        "stats" => $stats,
        "assigned_orders" => $newOrders,
        "recent_orders" => $recentOrders
    ]);
} catch (Throwable $e) {
    error_log("GET_DASHBOARD_ERROR: " . $e->getMessage());
    Response::serverError($e->getMessage());
}

$conn->close();
