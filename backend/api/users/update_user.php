<?php
// backend/api/users/update_user.php

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
require_once __DIR__ . "/../../services/NotificationService.php";

// ==========================
// AUTH
// ==========================
require_login();

$currentUserId = $GLOBALS['auth_user']['id'];
$currentRole   = $GLOBALS['auth_user']['role'];

// ==========================
// INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);

if (empty($data["user_id"])) {
    Response::error("Thiếu user_id");
}

$userId = (int)$data["user_id"];

// ==========================
// PHÂN QUYỀN
// ==========================
// Admin: sửa tất cả
// User thường: chỉ sửa chính mình
if ($currentRole !== "admin" && $userId !== $currentUserId) {
    Response::forbidden("Không có quyền cập nhật user này");
}

// ==========================
// BUILD UPDATE FIELDS
// ==========================
$fields = [];
$params = [];
$types  = "";

// Tên
if (!empty($data["name"])) {
    $fields[] = "name = ?";
    $params[] = $data["name"];
    $types   .= "s";
}

// Phone
if (!empty($data["phone"])) {
    $fields[] = "phone = ?";
    $params[] = $data["phone"];
    $types   .= "s";
}

// Email (chỉ admin)
if ($currentRole === "admin" && !empty($data["email"])) {
    $fields[] = "email = ?";
    $params[] = $data["email"];
    $types   .= "s";
}

// Role (chỉ admin)
if ($currentRole === "admin" && !empty($data["role"])) {
    $allowedRoles = ["admin", "agent", "shipper", "customer"];
    if (!in_array($data["role"], $allowedRoles)) {
        Response::error("Role không hợp lệ");
    }
    $fields[] = "role = ?";
    $params[] = $data["role"];
    $types   .= "s";
}

// Status (chỉ admin)
if ($currentRole === "admin" && isset($data["status"])) {
    $fields[] = "status = ?";
    $params[] = $data["status"];
    $types   .= "s";
}

if (empty($fields)) {
    Response::error("Không có dữ liệu cần cập nhật");
}

// ==========================
// EXECUTE UPDATE
// ==========================
$sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ?";
$params[] = $userId;
$types   .= "i";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);

if (!$stmt->execute()) {
    Response::serverError("Không thể cập nhật user");
}

// ==========================
// LOG
// ==========================
$notify = new NotificationService($conn);

$notify->log(
    "UPDATE_USER",
    "users",
    $userId,
    $currentUserId
);

// Audit log (file)
$auditLine = sprintf(
    "time=%s event=UPDATE_USER actor_id=%d actor_role=%s target_user=%d\n",
    date("c"),
    $currentUserId,
    $currentRole,
    $userId
);
file_put_contents(__DIR__ . "/../../logs/audit.log", $auditLine, FILE_APPEND | LOCK_EX);

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Cập nhật user thành công");
