<?php
// backend/api/admin/send_notification.php
// Admin - Send Manual Notification (Template-driven)

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

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
require_once __DIR__ . "/../../middleware/require_role.php";
require_once __DIR__ . "/../../services/NotificationService.php";

// ==========================
// AUTH - Admin only
// ==========================
require_login();
require_role(["admin"]);

$userId = (int)$GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// VALIDATE INPUT
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    Response::error("Method not allowed. Use POST.");
}

$input = json_decode(file_get_contents("php://input"), true);
$templateName = trim($input["template_name"] ?? "");
$targetType = trim($input["target_type"] ?? ""); // 'single', 'role', 'all'
$targetUserId = isset($input["target_user_id"]) ? (int)$input["target_user_id"] : null;
$targetRole = trim($input["target_role"] ?? ""); // 'customer', 'agent', 'shipper'
$extraMessage = trim($input["extra_message"] ?? "");
$customTitle = trim($input["custom_title"] ?? "");
$customMessage = trim($input["custom_message"] ?? "");

// Validate: either template_name OR custom_title+custom_message
if (empty($templateName) && (empty($customTitle) || empty($customMessage))) {
    Response::error("Either template_name or both custom_title and custom_message are required");
}

// Validate target_type
$allowedTargetTypes = ["single", "role", "all"];
if (!in_array($targetType, $allowedTargetTypes)) {
    Response::error("Invalid target_type. Allowed: " . implode(", ", $allowedTargetTypes));
}

// Validate based on target_type
if ($targetType === "single" && (!$targetUserId || $targetUserId <= 0)) {
    Response::error("target_user_id is required when target_type is 'single'");
}

if ($targetType === "role") {
    $allowedRoles = ["customer", "agent", "shipper"];
    if (empty($targetRole) || !in_array($targetRole, $allowedRoles)) {
        Response::error("target_role is required and must be one of: " . implode(", ", $allowedRoles));
    }
}

// ==========================
// VERIFY TEMPLATE EXISTS (if using template)
// ==========================
$template = null;
$notificationType = "system"; // default type

if (!empty($templateName)) {
    $templateStmt = $conn->prepare("
        SELECT id, name, type, title_template, message_template
        FROM notification_templates
        WHERE name = ?
        LIMIT 1
    ");
    $templateStmt->bind_param("s", $templateName);
    $templateStmt->execute();
    $templateResult = $templateStmt->get_result();
    $template = $templateResult->fetch_assoc();
    $templateStmt->close();

    if (!$template) {
        Response::error("Template '{$templateName}' not found");
    }
    
    $notificationType = $template['type'];
}

// ==========================
// GET TARGET USERS
// ==========================
$targetUsers = [];

if ($targetType === "single") {
    // Single user
    $userStmt = $conn->prepare("SELECT id FROM users WHERE id = ? AND status = 'active' LIMIT 1");
    $userStmt->bind_param("i", $targetUserId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    if ($user = $userResult->fetch_assoc()) {
        $targetUsers[] = (int)$user['id'];
    }
    $userStmt->close();
    
    if (empty($targetUsers)) {
        Response::error("Target user not found or inactive");
    }
    
} elseif ($targetType === "role") {
    // All users with specific role
    $roleStmt = $conn->prepare("SELECT id FROM users WHERE role = ? AND status = 'active'");
    $roleStmt->bind_param("s", $targetRole);
    $roleStmt->execute();
    $roleResult = $roleStmt->get_result();
    while ($user = $roleResult->fetch_assoc()) {
        $targetUsers[] = (int)$user['id'];
    }
    $roleStmt->close();
    
    if (empty($targetUsers)) {
        Response::error("No active users found with role '{$targetRole}'");
    }
    
} else {
    // All active users
    $allStmt = $conn->query("SELECT id FROM users WHERE status = 'active'");
    while ($user = $allStmt->fetch_assoc()) {
        $targetUsers[] = (int)$user['id'];
    }
    
    if (empty($targetUsers)) {
        Response::error("No active users found");
    }
}

// ==========================
// SEND NOTIFICATIONS
// ==========================
$notificationService = new NotificationService($conn);
$successCount = 0;
$failCount = 0;

foreach ($targetUsers as $targetUserId) {
    $success = false;
    
    if (!empty($customTitle) && !empty($customMessage)) {
        // Use custom title and message directly
        $success = $notificationService->create(
            $targetUserId,
            $customTitle,
            $customMessage,
            $notificationType,
            null // related_order_id = NULL for manual notifications
        );
    } else {
        // Use template with placeholders
        $placeholders = [];
        if (!empty($extraMessage)) {
            $placeholders['extra_message'] = $extraMessage;
        }
        
        $success = $notificationService->sendFromTemplate(
            $templateName,
            $targetUserId,
            null, // related_order_id = NULL for manual notifications
            $placeholders
        );
    }
    
    if ($success) {
        $successCount++;
    } else {
        $failCount++;
    }
}

// ==========================
// RESPONSE
// ==========================
if ($failCount > 0 && $successCount === 0) {
    Response::error("Failed to send notifications to all users");
} elseif ($failCount > 0) {
    Response::success("Notifications sent with some failures", [
        "success_count" => $successCount,
        "fail_count" => $failCount,
        "total_targets" => count($targetUsers),
    ]);
} else {
    Response::success("Notifications sent successfully", [
        "success_count" => $successCount,
        "total_targets" => count($targetUsers),
        "template_name" => $templateName,
        "target_type" => $targetType,
    ]);
}

