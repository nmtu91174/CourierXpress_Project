<?php
// backend/api/users/get_user.php

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
require_role(["admin", "agent", "shipper", "customer"]);

$currentUserId = $GLOBALS['auth_user']['id'];
$currentRole   = $GLOBALS['auth_user']['role'];

// ==========================
// INPUT
// ==========================
$userId = isset($_GET["user_id"]) ? (int)$_GET["user_id"] : 0;

if ($userId <= 0) {
    Response::error("Thiếu user_id");
}

// ==========================
// PERMISSION CHECK
// ==========================
if ($currentRole !== "admin" && $userId !== $currentUserId) {
    Response::error("Không có quyền xem thông tin user này", 403);
}

// ==========================
// QUERY
// ==========================
$stmt = $conn->prepare("
    SELECT 
        id,
        name,
        email,
        phone,
        role,
        status,
        created_at
    FROM users
    WHERE id = ?
    LIMIT 1
");
$stmt->bind_param("i", $userId);
$stmt->execute();

$result = $stmt->get_result();
$user = $result->fetch_assoc();

$stmt->close();
$conn->close();

if (!$user) {
    Response::error("Không tìm thấy user", 404);
}

// ==========================
// RESPONSE
// ==========================
Response::success("Lấy thông tin user thành công", $user);
