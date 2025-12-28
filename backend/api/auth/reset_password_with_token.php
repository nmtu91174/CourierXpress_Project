<?php
// backend/api/auth/validate_reset_token.php
// VALIDATE RESET TOKEN – enterprise standard (clean version)

// ==========================
// CORS
// ==========================
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// OPTIONS exit early
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================
// METHOD CHECK
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode([
        "status"  => "error",
        "message" => "Only GET method is supported."
    ]);
    exit;
}

// ==========================
// CORE & DB
// ==========================
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";

// ==========================
// READ INPUT
// ==========================
$token = trim($_GET["token"] ?? "");

// ==========================
// VALIDATION
// ==========================
if ($token === "") {
    Response::error("Token is required.");
}

if (strlen($token) !== 64) {
    Response::error("Invalid token format.");
}

// ==========================
// HASH TOKEN
// ==========================
$tokenHash = hash("sha256", $token);

// ==========================
// LOOKUP TOKEN
// ==========================
$sql = "
    SELECT
        prt.id,
        prt.user_id,
        prt.expires_at,
        prt.used,
        u.email,
        u.name,
        u.role,
        u.status
    FROM password_reset_tokens prt
    INNER JOIN users u ON prt.user_id = u.id
    WHERE prt.token_hash = ?
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

// ==========================
// BUSINESS CHECKS
// ==========================

// User must be active
if ($tokenData["status"] !== "active") {
    Response::error("User account is not active.");
}

// Token already used
if ((int)$tokenData["used"] === 1) {
    Response::error("This reset link has already been used.");
}

// Token expired
if (strtotime($tokenData["expires_at"]) < time()) {
    Response::error("This reset link has expired. Please request a new one.");
}

// ==========================
// RESPONSE
// ==========================
Response::success("Token is valid.", [
    "user_id" => $tokenData["user_id"],
    "email"   => $tokenData["email"],
    "name"    => $tokenData["name"]
]);

$conn->close();
