<?php
// backend/api/users/change_password.php
// Change Password API - User changes their own password

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ OPTIONS phải exit sớm TRƯỚC middleware
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";

// Require user to be logged in
require_login();

// Get current user from session
$currentUser = $_SESSION["user"];
$userId = (int)$currentUser["id"];

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);

// Validate input
if (empty($data["current_password"]) || empty($data["new_password"])) {
    Response::error("Current password and new password are required");
}

$currentPassword = $data["current_password"];
$newPassword = $data["new_password"];

// Validate new password strength (minimum 8 characters)
if (strlen($newPassword) < 8) {
    Response::error("New password must be at least 8 characters long");
}

// ==========================
// VERIFY CURRENT PASSWORD
// ==========================
$stmt = $conn->prepare("SELECT password FROM users WHERE id = ? LIMIT 1");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $stmt->close();
    Response::error("User not found");
}

$user = $result->fetch_assoc();
$stmt->close();

// Verify current password
if (!password_verify($currentPassword, $user["password"])) {
    Response::error("Current password is incorrect");
}

// ==========================
// UPDATE PASSWORD
// ==========================
$hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
$updateStmt = $conn->prepare("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?");
$updateStmt->bind_param("si", $hashedPassword, $userId);

if (!$updateStmt->execute()) {
    $updateStmt->close();
    Response::serverError("Failed to update password");
}

$updateStmt->close();

// ==========================
// SYSTEM LOG (Optional)
// ==========================
if (file_exists(__DIR__ . "/../../services/NotificationService.php")) {
    try {
        require_once __DIR__ . "/../../services/NotificationService.php";
        if (class_exists("NotificationService")) {
            $notify = new NotificationService($conn);
            $notify->log(
                "Changed password",
                "security",
                null,
                $userId
            );
        }
    } catch (Exception $e) {
        error_log("NotificationService change_password error: " . $e->getMessage());
    }
}

$conn->close();

Response::success("Password changed successfully");

