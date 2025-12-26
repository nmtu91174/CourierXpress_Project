<?php
// backend/api/users/get_notifications.php
// Get user notifications from notifications table

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
$limit = isset($_GET["limit"]) ? (int)$_GET["limit"] : 200; // Default 200 for full history
$limit = min(500, max(1, $limit)); // Max 500, min 1

$filterType = $_GET["type"] ?? "all"; // all, order, system, warning
$unreadOnly = isset($_GET["unread_only"]) && $_GET["unread_only"] === "1";

// ==========================
// BUILD QUERY
// ==========================
// Admin sees ALL system-wide notifications (like Recent Notifications in Dashboard)
// Other users only see their own notifications
$whereConditions = [];
$params = [];
$types = "";

// RBAC: Admin sees all notifications, others only see their own
if ($currentRole !== "admin") {
    $whereConditions[] = "n.user_id = ?";
    $params[] = $currentUserId;
    $types .= "i";
}
// Admin: no user_id filter (sees all notifications)

// Filter by type (validate to prevent empty results)
if ($filterType !== "all") {
    $validTypes = ['order', 'system', 'warning'];
    if (in_array($filterType, $validTypes, true)) {
        $whereConditions[] = "n.type = ?";
        $params[] = $filterType;
        $types .= "s";
    }
    // If invalid type, ignore filter (safer than returning empty)
}

// Filter unread only
if ($unreadOnly) {
    $whereConditions[] = "n.is_read = 0";
}

$whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

// Build query
$sql = "SELECT 
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.type,
    n.related_order_id,
    n.is_read,
    n.read_at,
    n.metadata,
    n.created_at,
    o.order_code,
    u.name AS user_name
FROM notifications n
LEFT JOIN orders o ON n.related_order_id = o.id
LEFT JOIN users u ON n.user_id = u.id
{$whereClause}
ORDER BY n.created_at DESC
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
$notifications = [];
while ($row = $result->fetch_assoc()) {
    // Parse metadata JSON if exists
    if (!empty($row['metadata'])) {
        $row['metadata'] = json_decode($row['metadata'], true);
    }
    $notifications[] = $row;
}

// Get unread count and total count (for badge synchronization)
// RBAC: Admin sees all, others only see their own
$unreadCountSql = "";
$totalCountSql = "";

if ($currentRole === "admin") {
    // Admin: count all notifications
    $unreadCountSql = "SELECT COUNT(*) as unread_count FROM notifications WHERE is_read = 0";
    $totalCountSql = "SELECT COUNT(*) as total_count FROM notifications";
} else {
    // Other roles: count only their own notifications
    $unreadCountSql = "SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0";
    $totalCountSql = "SELECT COUNT(*) as total_count FROM notifications WHERE user_id = ?";
}

// Get unread count
$countStmt = $conn->prepare($unreadCountSql);
if ($currentRole !== "admin") {
    $countStmt->bind_param("i", $currentUserId);
}
$countStmt->execute();
$countResult = $countStmt->get_result();
$unreadCount = 0;
if ($countRow = $countResult->fetch_assoc()) {
    $unreadCount = (int)$countRow['unread_count'];
}
$countStmt->close();

// Get total count (for badge synchronization - matches badge blue count)
$totalStmt = $conn->prepare($totalCountSql);
if ($currentRole !== "admin") {
    $totalStmt->bind_param("i", $currentUserId);
}
$totalStmt->execute();
$totalResult = $totalStmt->get_result();
$totalCount = 0;
if ($totalRow = $totalResult->fetch_assoc()) {
    $totalCount = (int)$totalRow['total_count'];
}
$totalStmt->close();

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Notifications loaded", [
    "notifications" => $notifications,
    "total" => count($notifications), // Count of notifications in result set (may be limited)
    "total_count" => $totalCount, // Total count from DB (for badge synchronization)
    "unread_count" => $unreadCount
]);

