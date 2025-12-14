<?php
// backend/api/shipper/confirm_delivery.php
// Shipper xác nhận đã giao hàng

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
require_once __DIR__ . "/../../services/OrderService.php";

// ==========================
// AUTH
// ==========================
require_login();
require_role(["shipper"]);

$shipperId = $GLOBALS['auth_user']['id'];

// ==========================
// INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);
$orderId = (int)($data["order_id"] ?? 0);

if ($orderId <= 0) {
    Response::error("Thiếu order_id");
}

// ==========================
// CHECK ORDER
// ==========================
$check = $conn->prepare("
    SELECT id, status, shipper_id, order_code
    FROM orders
    WHERE id = ?
");
$check->bind_param("i", $orderId);
$check->execute();
$order = $check->get_result()->fetch_assoc();

if (!$order) {
    Response::error("Đơn hàng không tồn tại");
}

if ((int)$order["shipper_id"] !== $shipperId) {
    Response::error("Bạn không được phép giao đơn này");
}

if ((int)$order["status"] !== 4) {
    Response::error("Đơn hàng chưa ở trạng thái đang giao");
}

// ==========================
// UPDATE STATUS → DELIVERED
// ==========================
try {
    $service = new OrderService($conn);

    $service->updateStatus(
        $orderId,
        5, // delivered
        $shipperId,
        "shipper",
        "Giao hàng thành công"
    );

    Response::success("Xác nhận giao hàng thành công", [
        "order_id"   => $orderId,
        "order_code" => $order["order_code"],
        "status"     => 5
    ]);

} catch (Exception $e) {
    error_log("CONFIRM DELIVERY ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError($e->getMessage());
} catch (Error $e) {
    error_log("CONFIRM DELIVERY FATAL ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError("Lỗi hệ thống: " . $e->getMessage());
}

$conn->close();
