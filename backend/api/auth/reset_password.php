<?php
// backend/api/auth/reset_password.php
// RESET PASSWORD – admin reset / user đổi mật khẩu

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
// METHOD CHECK
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "status"  => "error",
        "message" => "Chỉ hỗ trợ POST."
    ]);
    exit();
}

// ==========================
// CORE & DB
// ==========================
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../services/NotificationService.php";

// ==========================
// READ INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);

$userId      = (int)($data["user_id"] ?? 0);
$newPassword = $data["new_password"] ?? "";
$actorId     = (int)($data["actor_id"] ?? 0);   // admin / user thực hiện
$actorRole   = $data["actor_role"] ?? null;

// ==========================
// VALIDATION
// ==========================
if ($userId <= 0 || $newPassword === "") {
    Response::error("Thiếu dữ liệu reset mật khẩu!");
}

if (strlen($newPassword) < 6) {
    Response::error("Mật khẩu phải từ 6 ký tự trở lên!");
}

// ==========================
// CHECK USER EXIST
// ==========================
$check = $conn->prepare(
    "SELECT id, email, role FROM users WHERE id = ?"
);
$check->bind_param("i", $userId);
$check->execute();
$res = $check->get_result();

if ($res->num_rows === 0) {
    Response::error("User không tồn tại!");
}

$user = $res->fetch_assoc();

// ==========================
// HASH PASSWORD
// ==========================
$hashed = password_hash($newPassword, PASSWORD_DEFAULT);

// ==========================
// UPDATE PASSWORD
// ==========================
$update = $conn->prepare(
    "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?"
);
$update->bind_param("si", $hashed, $userId);
$update->execute();

// ==========================
// AUDIT LOG
// ==========================
$notify = new NotificationService($conn);
$notify->log(
    "RESET_PASSWORD",
    "users",
    $userId,
    $actorId ?: $userId
);

// ==========================
// RESPONSE
// ==========================
Response::success("Reset mật khẩu thành công!");

$conn->close();
