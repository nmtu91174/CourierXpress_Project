<?php
// backend/api/users/mark_notification_read.php
// Mark notification(s) as read

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

// ==========================
// REQUEST METHOD
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "POST" && $_SERVER["REQUEST_METHOD"] !== "PUT") {
    Response::error("Method not allowed", 405);
}

// ==========================
// GET JSON DATA
// ==========================
$input = json_decode(file_get_contents("php://input"), true);

if (!$input) {
    Response::error("Invalid JSON data");
}

// ==========================
// PARAMETERS
// ==========================
$notificationId = isset($input["notification_id"]) ? (int)$input["notification_id"] : null;
$markAll = isset($input["mark_all"]) && $input["mark_all"] === true;

// ==========================
// VALIDATE
// ==========================
if (!$markAll && !$notificationId) {
    Response::error("Either notification_id or mark_all must be provided");
}

// ==========================
// EXECUTE
// ==========================
if ($markAll) {
    // Mark all notifications as read for current user
    $stmt = $conn->prepare(
        "UPDATE notifications 
         SET is_read = 1, read_at = NOW()
         WHERE user_id = ? AND is_read = 0"
    );
    
    if (!$stmt) {
        Response::serverError("Failed to prepare query: " . $conn->error);
    }
    
    $stmt->bind_param("i", $currentUserId);
    
    if (!$stmt->execute()) {
        Response::serverError("Failed to update notifications: " . $stmt->error);
    }
    
    $affectedRows = $stmt->affected_rows;
    $stmt->close();
    
    Response::success("All notifications marked as read", [
        "affected_rows" => $affectedRows
    ]);
} else {
    // Mark single notification as read
    $stmt = $conn->prepare(
        "UPDATE notifications 
         SET is_read = 1, read_at = NOW()
         WHERE id = ? AND user_id = ? AND is_read = 0"
    );
    
    if (!$stmt) {
        Response::serverError("Failed to prepare query: " . $conn->error);
    }
    
    $stmt->bind_param("ii", $notificationId, $currentUserId);
    
    if (!$stmt->execute()) {
        Response::serverError("Failed to update notification: " . $stmt->error);
    }
    
    $affectedRows = $stmt->affected_rows;
    $stmt->close();
    
    if ($affectedRows === 0) {
        Response::error("Notification not found or already read", 404);
    }
    
    Response::success("Notification marked as read", [
        "notification_id" => $notificationId
    ]);
}

$conn->close();

