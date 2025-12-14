<?php
// backend/api/tracking/get_tracking_history.php
// Lấy timeline trạng thái đơn hàng

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
require_once __DIR__ . "/../../services/TrackingService.php";

// ==========================
// AUTH
// ==========================
require_login();
require_role(["admin", "agent", "shipper", "customer"]);

// ==========================
// INPUT
// ==========================
$orderId = isset($_GET["order_id"]) ? (int)$_GET["order_id"] : 0;

if ($orderId <= 0) {
    Response::error("Thiếu order_id");
}

// ==========================
// CHECK ORDER EXIST
// ==========================
$check = $conn->prepare("SELECT id FROM orders WHERE id = ?");
$check->bind_param("i", $orderId);
$check->execute();
$res = $check->get_result();

if ($res->num_rows === 0) {
    Response::error("Đơn hàng không tồn tại");
}

// ==========================
// GET TRACKING
// ==========================
try {
    $service  = new TrackingService($conn);
    $timeline = $service->getOrderTracking($orderId);

    Response::success("Lấy lịch sử đơn hàng thành công", [
        "order_id" => $orderId,
        "timeline" => $timeline
    ]);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

$conn->close();
