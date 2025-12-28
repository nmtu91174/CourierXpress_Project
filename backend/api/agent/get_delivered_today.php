<?php
// backend/api/agent/get_delivered_today.php
// Get count of orders delivered today for agent (status = DELIVERED and delivered_at = today)

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

// ==========================
// AUTH
// ==========================
require_login();
require_role(["agent", "admin"]);

$currentUserId = (int)$GLOBALS['auth_user']['id'];
$currentUserRole = (string)$GLOBALS['auth_user']['role'];

// ==========================
// GET AGENT ID
// ==========================
$agentId = $currentUserId;
if ($currentUserRole === "admin" && isset($_GET["agent_id"]) && (int)$_GET["agent_id"] > 0) {
    $agentId = (int)$_GET["agent_id"];
} elseif ($currentUserRole === "agent") {
    $agentId = $currentUserId;
}

// ==========================
// QUERY DELIVERED TODAY
// ==========================
// Delivered Today = Orders with status = DELIVERED (5) assigned to this agent today
// Simple logic: Count orders where agent_id = current agent, status = DELIVERED, delivered_at = today (or updated_at if delivered_at not exists)

// Check if orders table has delivered_at column
$checkColumn = $conn->query("SHOW COLUMNS FROM orders LIKE 'delivered_at'");
$hasDeliveredAtColumn = $checkColumn->num_rows > 0;

if ($hasDeliveredAtColumn) {
    // Use delivered_at column if exists
    $stmt = $conn->prepare("
        SELECT COUNT(*) AS delivered_today_count
        FROM orders
        WHERE agent_id = ?
          AND status = 5  -- DELIVERED status
          AND DATE(delivered_at) = CURDATE()
          AND agent_id IS NOT NULL
    ");
} else {
    // Fallback: Use created_at if delivered_at column doesn't exist
    // Note: This assumes order was delivered today (status changed to DELIVERED today)
    $stmt = $conn->prepare("
        SELECT COUNT(*) AS delivered_today_count
        FROM orders
        WHERE agent_id = ?
          AND status = 5  -- DELIVERED status
          AND DATE(created_at) = CURDATE()
          AND agent_id IS NOT NULL
    ");
}

if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Database query error: " . $conn->error);
}

$stmt->bind_param("i", $agentId);

$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();
$stmt->close();

$deliveredToday = (int)($row['delivered_today_count'] ?? 0);

// Get today's date from database for response
$dateResult = $conn->query("SELECT CURDATE() AS today");
$todayFromDb = $dateResult->fetch_assoc()['today'];

$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Delivered today count", [
    "agent_id" => $agentId,
    "delivered_today" => $deliveredToday,
    "date" => $todayFromDb
]);

