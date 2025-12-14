<?php
// backend/api/users/reset_user_password.php

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
require_once __DIR__ . "/../../middleware/require_role.php";

require_login();
require_role(["admin"]);

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data["user_id"]) || empty($data["new_password"])) {
    Response::error("Thiếu user_id hoặc mật khẩu mới");
}

$userId = (int)$data["user_id"];
$newPass = password_hash($data["new_password"], PASSWORD_BCRYPT);

// ==========================
// UPDATE PASSWORD
// ==========================
$stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
$stmt->bind_param("si", $newPass, $userId);

if (!$stmt->execute()) {
    Response::serverError("Không thể reset password");
}

// ==========================
// AUDIT LOG
// ==========================
$audit = sprintf(
    "time=%s event=RESET_PASSWORD actor_role=admin target_user=%d\n",
    date("c"),
    $userId
);
file_put_contents(__DIR__ . "/../../logs/audit.log", $audit, FILE_APPEND | LOCK_EX);

$stmt->close();
$conn->close();

Response::success("Reset mật khẩu thành công");
