<?php
// backend/api/agent/get_assigned_today.php
// Get count of orders assigned to agent today (from order_history)

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
// QUERY ASSIGNED TODAY
// ==========================
// Assigned Today = Orders assigned to this agent today with status = APPROVED (2)
// Simple logic: Count orders where agent_id = current agent, status = APPROVED, created_at = today
// This captures both auto-assigned and admin-assigned orders
// Use created_at because when order is created and auto-assigned, created_at reflects the assignment time

// Use CURDATE() from database to ensure timezone consistency
$stmt = $conn->prepare("
    SELECT COUNT(*) AS assigned_today_count
    FROM orders
    WHERE agent_id = ?
      AND status = 2  -- APPROVED status
      AND DATE(created_at) = CURDATE()
      AND agent_id IS NOT NULL
");

if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Database query error: " . $conn->error);
}

$stmt->bind_param("i", $agentId);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();
$stmt->close();

$assignedToday = (int)($row['assigned_today_count'] ?? 0);

// Get today's date from database for response (before closing connection)
$dateResult = $conn->query("SELECT CURDATE() AS today");
$todayFromDb = $dateResult->fetch_assoc()['today'];

$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Assigned today count", [
    "agent_id" => $agentId,
    "assigned_today" => $assignedToday,
    "date" => $todayFromDb
]);

