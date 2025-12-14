<?php
// backend/api/auth/logout.php
// LOGOUT API – chuẩn kiến trúc CourierXpress

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

// Load NotificationService - wrap in try-catch để không block nếu lỗi
$hasNotificationService = false;
try {
    if (file_exists(__DIR__ . "/../../services/NotificationService.php")) {
        require_once __DIR__ . "/../../services/NotificationService.php";
        $hasNotificationService = class_exists("NotificationService");
    }
} catch (Exception $e) {
    error_log("Failed to load NotificationService: " . $e->getMessage());
}

// ==========================
// READ USER (OPTIONAL)
// frontend có thể gửi user_id + role
// ==========================
$data = json_decode(file_get_contents("php://input"), true);

$userId = $data["user_id"] ?? null;
$role   = $data["role"] ?? null;

// ==========================
// SYSTEM LOG (OPTIONAL)
// ==========================
if ($userId && $hasNotificationService) {
    try {
        $notify = new NotificationService($conn);
        $notify->log(
            "LOGOUT",
            "user",
            $userId,
            $userId
        );
    } catch (Exception $e) {
        error_log("NotificationService LOGOUT error: " . $e->getMessage());
    } catch (Error $e) {
        error_log("NotificationService LOGOUT fatal error: " . $e->getMessage());
    }
}

// ==========================
// RESPONSE
// ==========================
Response::success("Đăng xuất thành công!");

$conn->close();
