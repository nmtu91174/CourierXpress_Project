<?php
// backend/api/shipper/get_dashboard.php
// Dashboard API for Shipper (Workflow mới - Merged)
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
// AUTH & SAFETY CHECKS
// ==========================
require_login();
require_role(["shipper"]);

$authUser = $GLOBALS["auth_user"] ?? null;
if (!$authUser || !isset($authUser["id"])) {
    Response::error("Auth session missing. Please login again.");
}

$shipperId = (int)$authUser["id"];

if (!isset($conn) || !$conn) {
    Response::serverError("Database connection not initialized.");
}

/**
 * Helper: prepare or throw readable error
 */
function prepareOrFail($conn, $sql) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $conn->error . " | SQL: " . $sql);
    }
    return $stmt;
}

try {
    // =====================================================
    // 1️⃣ STATISTICS (CHO DASHBOARD CARD)
    // =====================================================
    $sqlStats = "
        SELECT
            SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS waiting_accept,
            SUM(CASE WHEN status IN (3,4) THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status = 5 THEN 1 ELSE 0 END) AS completed
        FROM orders
        WHERE shipper_id = ?
    ";

    $stmtStats = prepareOrFail($conn, $sqlStats);
    $stmtStats->bind_param("i", $shipperId);
    if (!$stmtStats->execute()) {
        throw new Exception("Stats execute failed: " . $stmtStats->error);
    }
    $statsRaw = $stmtStats->get_result()->fetch_assoc();
    $stmtStats->close();

    $stats = [
        "waiting_accept" => (int)($statsRaw["waiting_accept"] ?? 0),
        "active"         => (int)($statsRaw["active"] ?? 0),
        "completed"      => (int)($statsRaw["completed"] ?? 0),
    ];

    // =====================================================
    // 2️⃣ WAITING ORDERS (STATUS = 2)
    // =====================================================
    $sqlWaiting = "
        SELECT id, order_code, sender_address, receiver_address, status, shipper_id
        FROM orders
        WHERE shipper_id = ? AND status = 2
        ORDER BY created_at DESC
        LIMIT 5
    ";

    $stmtWaiting = prepareOrFail($conn, $sqlWaiting);
    $stmtWaiting->bind_param("i", $shipperId);
    $stmtWaiting->execute();
    $waitingOrdersRaw = $stmtWaiting->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmtWaiting->close();
    
    $waitingOrders = array_map(function($order) {
        $order["id"] = (int)$order["id"];
        $order["status"] = (int)$order["status"];
        $order["shipper_id"] = (int)$order["shipper_id"];
        return $order;
    }, $waitingOrdersRaw);

    // =====================================================
    // 3️⃣ ACTIVE ORDERS (STATUS = 3,4)
    // =====================================================
    $sqlActive = "
        SELECT id, order_code, receiver_name, receiver_address, status, shipper_id
        FROM orders
        WHERE shipper_id = ? AND status IN (3,4)
        ORDER BY created_at DESC
        LIMIT 10
    ";

    $stmtActive = prepareOrFail($conn, $sqlActive);
    $stmtActive->bind_param("i", $shipperId);
    $stmtActive->execute();
    $activeOrdersRaw = $stmtActive->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmtActive->close();

    $activeOrders = array_map(function($order) {
        $order["id"] = (int)$order["id"];
        $order["status"] = (int)$order["status"];
        $order["shipper_id"] = (int)$order["shipper_id"];
        return $order;
    }, $activeOrdersRaw);

    // =====================================================
    // 4️⃣ COMPLETED ORDERS (STATUS = 5)
    // =====================================================
    $sqlCompleted = "
        SELECT id, order_code, receiver_name, receiver_address, status, shipper_id
        FROM orders
        WHERE shipper_id = ? AND status = 5
        ORDER BY created_at DESC
        LIMIT 10
    ";

    $stmtCompleted = prepareOrFail($conn, $sqlCompleted);
    $stmtCompleted->bind_param("i", $shipperId);
    $stmtCompleted->execute();
    $completedOrdersRaw = $stmtCompleted->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmtCompleted->close();

    $completedOrders = array_map(function($order) {
        $order["id"] = (int)$order["id"];
        $order["status"] = (int)$order["status"];
        $order["shipper_id"] = (int)$order["shipper_id"];
        return $order;
    }, $completedOrdersRaw);

    // =====================================================
    // 5️⃣ RESPONSE
    // =====================================================
    Response::success("Dashboard data fetched", [
        "stats"            => $stats,
        "waiting_orders"   => $waitingOrders,
        "active_orders"    => $activeOrders,
        "completed_orders" => $completedOrders
    ]);

} catch (Exception $e) {
    error_log("GET_DASHBOARD_ERROR: " . $e->getMessage());
    // Trả về message chi tiết của Exception để dễ debug như mong muốn của nhánh Giap-tuan-3
    Response::serverError($e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}