<?php
// backend/api/auth/forgot_password.php
// FORGOT PASSWORD – Stateful token (DB-based)
// FIXED: Inserts hashed token into 'reset_token' column

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
// EmailService removed - frontend handles email sending via EmailJS (Option B)

$data  = json_decode(file_get_contents("php://input"), true);
$email = trim($data["email"] ?? "");

if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::success("If the email exists, a password reset link has been sent.");
}

$stmt = $conn->prepare(
    "SELECT id, email, name, role, status
     FROM users
     WHERE email = ?
     LIMIT 1"
);
$stmt->bind_param("s", $email);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    Response::success("If the email exists, a password reset link has been sent.");
}

$user = $res->fetch_assoc();
$stmt->close();

if ($user["status"] !== "active") {
    Response::success("If the email exists, a password reset link has been sent.");
}

$allowedRoles = ["customer", "agent", "shipper"];
if (!in_array($user["role"], $allowedRoles, true)) {
    Response::success("If the email exists, a password reset link has been sent.");
}

// ==========================
// GENERATE TOKEN (STATEFUL - DB)
// ==========================
$rawToken = bin2hex(random_bytes(32)); // 64 character hex string
$tokenHash = hash("sha256", $rawToken); // Hash for storage in DB

// Invalidate any existing unused tokens for this user
$invalidate = $conn->prepare(
    "UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0"
);
$invalidate->bind_param("i", $user["id"]);
$invalidate->execute();
$invalidate->close();

// Insert new token (hashed) into 'reset_token' column
// FIXED: Use MySQL NOW() + INTERVAL to avoid timezone mismatch
// DB timezone is +07:00, let DB calculate expires_at to ensure consistency
$insert = $conn->prepare(
    "INSERT INTO password_resets (user_id, reset_token, expires_at) 
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))"
);
$insert->bind_param("is", $user["id"], $tokenHash);

if (!$insert->execute()) {
    error_log("Failed to insert reset token: " . $insert->error);
    $insert->close();
    Response::serverError("Unable to process request. Please try again.");
}

$insert->close();

// ==========================
// BUILD RESET LINK (use raw token in URL)
// ==========================
$resetLink = "http://localhost:5173/reset-password?token=" . urlencode($rawToken);

// ==========================
// RESPONSE (Frontend will send email via EmailJS)
// ==========================
$response = [
    "status"  => "success",
    "message" => "If the email exists, a password reset link has been sent.",
    "email"   => $user["email"], // For frontend EmailJS
    "user_name" => $user["name"] ?? "User", // For frontend EmailJS
    "reset_link" => $resetLink // For frontend EmailJS
];

// In development, also include dev_reset_link for debugging
if (($_ENV["APP_ENV"] ?? "development") === "development") {
    $response["dev_reset_link"] = $resetLink;
}

echo json_encode($response);
$conn->close();
