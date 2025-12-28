<?php
// backend/api/auth/reset_password.php
// RESET PASSWORD – Stateful token (DB-based)
// FIXED: Uses correct column name 'reset_token' and marks token as used

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "status"  => "error",
        "message" => "Only POST method is supported."
    ]);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../services/NotificationService.php";

$data = json_decode(file_get_contents("php://input"), true);

$token       = trim($data["token"] ?? "");
$newPassword = $data["new_password"] ?? "";

// Validate token format
if ($token === "" || strlen($token) !== 64) {
    Response::error("Invalid or missing reset token.");
}

if ($newPassword === "" || strlen($newPassword) < 6) {
    Response::error("Password must be at least 6 characters long.");
}

// Hash the raw token to match what's stored in DB
$tokenHash = hash("sha256", $token);

// Query using correct column name 'reset_token'
$sql = "
    SELECT 
        pr.id AS token_id,
        pr.user_id,
        pr.used,
        u.email,
        u.status
    FROM password_resets pr
    INNER JOIN users u ON pr.user_id = u.id
    WHERE pr.reset_token = ?
      AND pr.used = 0
      AND pr.expires_at > NOW()
    LIMIT 1
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    error_log("Reset password prepare failed: " . $conn->error);
    Response::serverError("Database error. Please try again.");
}

$stmt->bind_param("s", $tokenHash);

if (!$stmt->execute()) {
    error_log("Reset password execute failed: " . $stmt->error);
    $stmt->close();
    Response::serverError("Database error. Please try again.");
}

$res = $stmt->get_result();
$stmt->close();

if ($res->num_rows === 0) {
    Response::error("Invalid or expired reset token!");
}

$tokenData = $res->fetch_assoc();

// Double-check token is not used (redundant but safe)
if ($tokenData["used"] == 1) {
    Response::error("This reset link has already been used.");
}

// Check user status
if ($tokenData["status"] !== "active") {
    Response::error("User account is not active!");
}

$userId = (int)$tokenData["user_id"];
$tokenId = (int)$tokenData["token_id"];

// Start transaction for atomicity
$conn->begin_transaction();

try {
    // Update user password
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    $updateUser = $conn->prepare(
        "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?"
    );
    
    if (!$updateUser) {
        throw new Exception("Update password prepare failed: " . $conn->error);
    }
    
    $updateUser->bind_param("si", $hashedPassword, $userId);
    
    if (!$updateUser->execute()) {
        throw new Exception("Update password execute failed: " . $updateUser->error);
    }
    
    $updateUser->close();
    
    // Mark token as used (THIS IS THE ONLY PLACE WHERE used = 1)
    $markUsed = $conn->prepare(
        "UPDATE password_resets SET used = 1 WHERE id = ?"
    );
    
    if (!$markUsed) {
        throw new Exception("Mark token used prepare failed: " . $conn->error);
    }
    
    $markUsed->bind_param("i", $tokenId);
    
    if (!$markUsed->execute()) {
        throw new Exception("Mark token used execute failed: " . $markUsed->error);
    }
    
    $markUsed->close();
    
    // Commit transaction
    $conn->commit();
    
    // Log audit
    $notify = new NotificationService($conn);
    $notify->log(
        "RESET_PASSWORD",
        "users",
        $userId,
        $userId
    );
    
    Response::success("Password has been reset successfully.");
    
} catch (Exception $e) {
    // Rollback on any error
    $conn->rollback();
    error_log("Reset password transaction failed: " . $e->getMessage());
    Response::serverError("Failed to reset password. Please try again.");
}

$conn->close();
