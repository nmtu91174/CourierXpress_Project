<?php
// backend/api/users/disable_user.php

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
require_once __DIR__ . "/../../middleware/require_role.php";

// ==========================
// AUTH
// ==========================
require_login();
require_role(["admin"]);

$adminId = $GLOBALS['auth_user']['id'];

// ==========================
// INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);

if (empty($data["user_id"]) || empty($data["status"])) {
    Response::error("Thiếu user_id hoặc status");
}

$userId = (int)$data["user_id"];
$status = $data["status"];

if (!in_array($status, ["active", "inactive"])) {
    Response::error("Status không hợp lệ");
}

// ==========================
// UPDATE
// ==========================
$stmt = $conn->prepare("UPDATE users SET status = ? WHERE id = ?");
$stmt->bind_param("si", $status, $userId);

if (!$stmt->execute()) {
    Response::serverError("Không thể cập nhật trạng thái user");
}

// ==========================
// AUDIT LOG
// ==========================
$audit = sprintf(
    "time=%s event=DISABLE_USER actor_id=%d target_user=%d new_status=%s\n",
    date("c"),
    $adminId,
    $userId,
    $status
);
file_put_contents(__DIR__ . "/../../logs/audit.log", $audit, FILE_APPEND | LOCK_EX);

$stmt->close();
$conn->close();

Response::success("Cập nhật trạng thái user thành công");
