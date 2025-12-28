<?php
// backend/api/auth/validate_reset_token.php
// VALIDATE RESET TOKEN – Stateful (DB-based)
// FIXED: Uses correct column name 'reset_token'

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode([
        "status"  => "error",
        "message" => "Only GET method is supported."
    ]);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";

$token = trim($_GET["token"] ?? "");

// Validate token format (must be 64 character hex string)
if ($token === "" || strlen($token) !== 64) {
    Response::error("Invalid or expired reset token.");
}

// Hash the raw token to match what's stored in DB
$tokenHash = hash("sha256", $token);

// Query using correct column name 'reset_token'
$sql = "
    SELECT
        pr.id,
        pr.user_id,
        pr.expires_at,
        pr.used,
        u.email,
        u.name,
        u.role,
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
    error_log("validate_reset_token prepare failed: " . $conn->error);
    Response::serverError("Database error. Please try again.");
}

$stmt->bind_param("s", $tokenHash);

if (!$stmt->execute()) {
    error_log("validate_reset_token execute failed: " . $stmt->error);
    $stmt->close();
    Response::serverError("Database error. Please try again.");
}

$res = $stmt->get_result();
$stmt->close();

if ($res->num_rows === 0) {
    Response::error("Invalid or expired reset token.");
}

$tokenData = $res->fetch_assoc();

// Check user status
if ($tokenData["status"] !== "active") {
    Response::error("User account is not active.");
}

// Return success with user info
Response::success("Token is valid.", [
    "user_id" => $tokenData["user_id"],
    "email"   => $tokenData["email"],
    "name"    => $tokenData["name"]
]);

$conn->close();
