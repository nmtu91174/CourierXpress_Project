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
$page = isset($_GET["page"]) ? (int)$_GET["page"] : 1;
$page = max(1, $page); // Minimum page 1

$pageSize = isset($_GET["page_size"]) ? (int)$_GET["page_size"] : 10; // Default 10 per page
$pageSize = min(100, max(1, $pageSize)); // Max 100, min 1

$offset = ($page - 1) * $pageSize;

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

// RBAC: Admin sees only admin/agent/system notifications (not customer notifications)
// Other users only see their own notifications
if ($currentRole === "admin") {
    // Admin should only see notifications for admin, agent, system roles
    // Exclude customer notifications to avoid confusion
    $whereConditions[] = "EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = n.user_id 
        AND u.role IN ('admin', 'agent', 'system')
    )";
    // No params needed for this subquery
} else {
    // Other roles: only see their own notifications
    $whereConditions[] = "n.user_id = ?";
    $params[] = $currentUserId;
    $types .= "i";
}

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
LIMIT ? OFFSET ?";

$params[] = $pageSize;
$params[] = $offset;
$types .= "ii";

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
    // Admin: count only admin/agent/system notifications (exclude customer)
    $unreadCountSql = "SELECT COUNT(*) as unread_count 
                       FROM notifications n
                       INNER JOIN users u ON n.user_id = u.id
                       WHERE n.is_read = 0 
                       AND u.role IN ('admin', 'agent', 'system')";
    $totalCountSql = "SELECT COUNT(*) as total_count 
                      FROM notifications n
                      INNER JOIN users u ON n.user_id = u.id
                      WHERE u.role IN ('admin', 'agent', 'system')";
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
$totalPages = $totalCount > 0 ? ceil($totalCount / $pageSize) : 0;

Response::success("Notifications loaded", [
    "notifications" => $notifications,
    "pagination" => [
        "page" => $page,
        "page_size" => $pageSize,
        "total_count" => $totalCount,
        "total_pages" => $totalPages,
        "has_next" => $page < $totalPages,
        "has_prev" => $page > 1
    ],
    "unread_count" => $unreadCount
]);

