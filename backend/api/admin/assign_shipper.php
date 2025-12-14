<?php
// backend/api/admin/assign_shipper.php
// ASSIGN SHIPPER – Agent phân công shipper

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
require_once __DIR__ . "/../../services/OrderService.php";

// ==========================
// AUTH
// ==========================
require_login();
require_role(["admin", "agent"]); // Admin và Agent đều có thể phân công shipper

$actorId = $GLOBALS['auth_user']['id'];
$role    = $GLOBALS['auth_user']['role'];

// ==========================
// INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);

$orderId   = (int)($data["order_id"] ?? 0);
$shipperId = (int)($data["shipper_id"] ?? 0);
$note      = trim($data["note"] ?? "Phân công shipper");

if ($orderId <= 0 || $shipperId <= 0) {
    Response::error("Thiếu order_id hoặc shipper_id");
}

// ==========================
// ASSIGN SHIPPER
// ==========================
try {
    $service = new OrderService($conn);
    // Gọi với role gốc, OrderService sẽ tự xử lý convert 'admin' -> 'system' trong logHistory
    $service->assignShipper($orderId, $shipperId, $actorId, $role, $note);

    Response::success("Phân công shipper thành công");

} catch (Exception $e) {
    error_log("ASSIGN SHIPPER ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError($e->getMessage());
} catch (Error $e) {
    error_log("ASSIGN SHIPPER FATAL ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError("Lỗi hệ thống: " . $e->getMessage());
}

$conn->close();
