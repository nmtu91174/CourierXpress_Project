<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

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

// ---- SAFETY: verify auth_user exists
$authUser = $GLOBALS["auth_user"] ?? null;
if (!$authUser || !isset($authUser["id"])) {
    // If your middleware stores user differently, this will reveal it immediately.
    Response::error("Auth session missing. Please login again.");
}

$shipperId = (int)$authUser["id"];

// ---- SAFETY: verify DB connection object exists
if (!isset($conn) || !$conn) {
    Response::serverError("Database connection not initialized.");
}

// Helper: prepare or throw readable error
function prepareOrFail($conn, $sql) {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $conn->error . " | SQL: " . $sql);
    }
    return $stmt;
}

try {
    // 1) Stats
    $sqlStats = "
        SELECT 
            SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS assigned_count,
            SUM(CASE WHEN status IN (3, 4) THEN 1 ELSE 0 END) AS active_count,
            SUM(CASE WHEN status = 5 THEN 1 ELSE 0 END) AS completed_count
        FROM orders
        WHERE shipper_id = ?
    ";

    $stmtStats = prepareOrFail($conn, $sqlStats);
    $stmtStats->bind_param("i", $shipperId);
    if (!$stmtStats->execute()) {
        throw new Exception("Stats execute failed: " . $stmtStats->error);
    }
    $stats = $stmtStats->get_result()->fetch_assoc() ?: [
        "assigned_count" => 0,
        "active_count" => 0,
        "completed_count" => 0
    ];
    $stmtStats->close();

    // 2) New assigned orders (status = 2)
    $sqlNew = "
        SELECT id, order_code, sender_address, receiver_address, status
        FROM orders
        WHERE shipper_id = ? AND status = 2
        ORDER BY created_at DESC
        LIMIT 5
    ";

    $stmtNew = prepareOrFail($conn, $sqlNew);
    $stmtNew->bind_param("i", $shipperId);
    if (!$stmtNew->execute()) {
        throw new Exception("New orders execute failed: " . $stmtNew->error);
    }
    $newOrders = $stmtNew->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmtNew->close();

    // 3) Recent orders (3,4,5)
    $sqlRecent = "
        SELECT id, order_code, receiver_name, receiver_address, status
        FROM orders
        WHERE shipper_id = ? AND status IN (3, 4, 5)
        ORDER BY updated_at DESC
        LIMIT 10
    ";

    $stmtRecent = prepareOrFail($conn, $sqlRecent);
    $stmtRecent->bind_param("i", $shipperId);
    if (!$stmtRecent->execute()) {
        throw new Exception("Recent orders execute failed: " . $stmtRecent->error);
    }
    $recentOrders = $stmtRecent->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmtRecent->close();

    Response::success("Dashboard data fetched", [
        "stats" => $stats,
        "assigned_orders" => $newOrders,
        "recent_orders" => $recentOrders
    ]);
} catch (Exception $e) {
    // This will show the REAL cause (missing column/table, wrong SQL, etc.)
    Response::serverError($e->getMessage());
} finally {
    if (isset($conn) && $conn) $conn->close();
}
