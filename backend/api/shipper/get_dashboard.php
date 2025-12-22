<?php
// backend/api/shipper/get_dashboard.php
// Dashboard API for Shipper (Workflow mới)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);


// ==========================
// CORS
// ==========================
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================
// METHOD CHECK
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode([
        "status" => "error",
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
require_role(["shipper"]);

$shipperId = (int)$GLOBALS['auth_user']['id'];

try {
    // =====================================================
    // 1️⃣ STATISTICS (CHO DASHBOARD CARD)
    // =====================================================
    // waiting_accept : status = 3 (ASSIGNED - đã gán, chưa pickup)
    // active         : status = 4 (PICKED - đã lấy hàng, đang giao)
    // completed      : status = 5 (DELIVERED)

    $sqlStats = "
        SELECT
            SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) AS waiting_accept,
            SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status = 5 THEN 1 ELSE 0 END) AS completed
        FROM orders
        WHERE shipper_id = ?
    ";

    $stmtStats = $conn->prepare($sqlStats);
    $stmtStats->bind_param("i", $shipperId);
    $stmtStats->execute();
    $stats = $stmtStats->get_result()->fetch_assoc();

    // Ensure not null
    $stats = [
        "waiting_accept" => (int)($stats["waiting_accept"] ?? 0),
        "active"         => (int)($stats["active"] ?? 0),
        "completed"      => (int)($stats["completed"] ?? 0),
    ];

    // =====================================================
    // 2️⃣ WAITING ORDERS (STATUS = 3 - ASSIGNED)
    // =====================================================
    // Status 3 = ASSIGNED: Đã được admin gán cho shipper, chưa pickup
    $sqlWaiting = "
        SELECT
            id,
            order_code,
            sender_address,
            receiver_address,
            status,
            shipper_id
        FROM orders
        WHERE shipper_id = ?
          AND status = 3
        ORDER BY created_at DESC
        LIMIT 5
    ";

    $stmtWaiting = $conn->prepare($sqlWaiting);
    $stmtWaiting->bind_param("i", $shipperId);
    $stmtWaiting->execute();
    $waitingOrdersRaw = $stmtWaiting->get_result()->fetch_all(MYSQLI_ASSOC);
    
    // Ensure shipper_id is integer
    $waitingOrders = [];
    foreach ($waitingOrdersRaw as $order) {
        $order["id"] = (int)$order["id"];
        $order["status"] = (int)$order["status"];
        $order["shipper_id"] = (int)$order["shipper_id"];
        $waitingOrders[] = $order;
    }

    // =====================================================
    // 3️⃣ ACTIVE ORDERS (STATUS = 4 - PICKED/IN TRANSIT)
    // =====================================================
    // Status 4 = PICKED: Shipper đã lấy hàng, đang giao
    $sqlActive = "
        SELECT
            id,
            order_code,
            receiver_name,
            receiver_address,
            status,
            shipper_id
        FROM orders
        WHERE shipper_id = ?
          AND status = 4
        ORDER BY created_at DESC
        LIMIT 10
    ";

    $stmtActive = $conn->prepare($sqlActive);
    $stmtActive->bind_param("i", $shipperId);
    $stmtActive->execute();
    $activeOrdersRaw = $stmtActive->get_result()->fetch_all(MYSQLI_ASSOC);
    
    // Ensure shipper_id is integer
    $activeOrders = [];
    foreach ($activeOrdersRaw as $order) {
        $order["id"] = (int)$order["id"];
        $order["status"] = (int)$order["status"];
        $order["shipper_id"] = (int)$order["shipper_id"];
        $activeOrders[] = $order;
    }

    // =====================================================
    // 4️⃣ COMPLETED ORDERS (STATUS = 5)
    // =====================================================
    $sqlCompleted = "
        SELECT
            id,
            order_code,
            receiver_name,
            receiver_address,
            status,
            shipper_id
        FROM orders
        WHERE shipper_id = ?
          AND status = 5
        ORDER BY created_at DESC
        LIMIT 10
    ";

    $stmtCompleted = $conn->prepare($sqlCompleted);
    $stmtCompleted->bind_param("i", $shipperId);
    $stmtCompleted->execute();
    $completedOrdersRaw = $stmtCompleted->get_result()->fetch_all(MYSQLI_ASSOC);
    
    // Ensure shipper_id is integer
    $completedOrders = [];
    foreach ($completedOrdersRaw as $order) {
        $order["id"] = (int)$order["id"];
        $order["status"] = (int)$order["status"];
        $order["shipper_id"] = (int)$order["shipper_id"];
        $completedOrders[] = $order;
    }

    // =====================================================
    // 5️⃣ RESPONSE (KHỚP 100% FRONTEND)
    // =====================================================
    Response::success("Dashboard data fetched", [
        "stats"            => $stats,
        "waiting_orders"   => $waitingOrders,
        "active_orders"    => $activeOrders,
        "completed_orders" => $completedOrders
    ]);
} catch (Exception $e) {
    error_log("GET_DASHBOARD_ERROR: " . $e->getMessage());
    Response::serverError("Failed to load dashboard");
}

$conn->close();
