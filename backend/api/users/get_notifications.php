<?php
// backend/api/users/get_notifications.php
// Get user notifications from system_logs

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ OPTIONS phải exit sớm TRƯỚC middleware
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

// ==========================
// AUTH
// ==========================
require_login();

$currentUserId = $GLOBALS['auth_user']['id'];
$currentRole = $GLOBALS['auth_user']['role'];

// ==========================
// PARAMETERS
// ==========================
$limit = isset($_GET["limit"]) ? (int)$_GET["limit"] : 50;
$limit = min(100, max(1, $limit)); // Max 100, min 1

$filterType = $_GET["type"] ?? "all"; // all, security, orders, system

// ==========================
// BUILD QUERY
// ==========================
// Get notifications for this user (or all if admin)
$whereConditions = [];
$params = [];
$types = "";

if ($currentRole !== "admin") {
    // Regular users only see their own notifications
    $whereConditions[] = "sl.user_id = ?";
    $params[] = $currentUserId;
    $types .= "i";
}

// Filter by type
if ($filterType !== "all") {
    if ($filterType === "security") {
        $whereConditions[] = "sl.entity IN ('security', 'users')";
    } elseif ($filterType === "orders") {
        $whereConditions[] = "sl.entity = 'orders'";
    } elseif ($filterType === "system") {
        // System notifications: system, push, email, or entity IS NULL (general system events)
        $whereConditions[] = "(sl.entity IN ('system', 'push', 'email') OR sl.entity IS NULL)";
    }
}

$whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

// Build query
$sql = "SELECT 
    sl.id,
    sl.action,
    sl.entity,
    sl.entity_id,
    sl.user_id,
    sl.created_at,
    u.name AS user_name
FROM system_logs sl
LEFT JOIN users u ON sl.user_id = u.id
{$whereClause}
ORDER BY sl.created_at DESC
LIMIT ?";

$params[] = $limit;
$types .= "i";

// ==========================
// EXECUTE
// ==========================
$stmt = $conn->prepare($sql);
if (!$stmt) {
    Response::serverError("Failed to prepare query: " . $conn->error);
}

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

if (!$stmt->execute()) {
    Response::serverError("Failed to fetch notifications: " . $stmt->error);
}

$result = $stmt->get_result();
$notifications = $result->fetch_all(MYSQLI_ASSOC);

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Notifications loaded", [
    "notifications" => $notifications,
    "total" => count($notifications)
]);

