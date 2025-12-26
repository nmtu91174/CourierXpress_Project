<?php
// backend/api/users/get_notification_count.php
// Get unread notification count for badge display

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
require_once __DIR__ . "/../../services/NotificationService.php";

// ==========================
// AUTH
// ==========================
require_login();

$currentUserId = $GLOBALS['auth_user']['id'];
$currentRole = $GLOBALS['auth_user']['role'];

// ==========================
// GET UNREAD COUNT AND TOTAL COUNT
// ==========================
$notificationService = new NotificationService($conn);
$unreadCount = $notificationService->getUnreadCount($currentUserId);
// RBAC: Admin sees all notifications, others only see their own
$totalCount = $notificationService->getTotalCount($currentUserId, $currentRole);

$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Notification counts retrieved", [
    "unread_count" => $unreadCount,
    "total_count" => $totalCount
]);

