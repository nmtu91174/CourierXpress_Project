<?php
// backend/api/shipper/confirm_pickup.php
// Shipper xác nhận đã pickup hàng

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
        "status" => "error",
        "message" => "Method not allowed"
    ]);
    exit();
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
require_role(["shipper"]);

$shipperId = $GLOBALS['auth_user']['id'];
$role      = $GLOBALS['auth_user']['role'];

// ==========================
// READ INPUT
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
    SELECT id, order_code, status, shipper_id
    FROM orders
    WHERE id = ?
");
$check->bind_param("i", $orderId);
$check->execute();
$result = $check->get_result();

if ($result->num_rows === 0) {
    Response::error("Đơn hàng không tồn tại");
}

$order = $result->fetch_assoc();

// Sai shipper
if ((int)$order["shipper_id"] !== $shipperId) {
    Response::error("Bạn không được phép pickup đơn này");
}

// Sai trạng thái
if ((int)$order["status"] !== 3) {
    Response::error("Đơn hàng không ở trạng thái chờ pickup");
}

// ==========================
// UPDATE STATUS → 4
// ==========================
try {
    $service = new OrderService($conn);

    $service->updateStatus(
        $orderId,
        4,                  // in progress
        $shipperId,
        "shipper",
        "Shipper đã pickup hàng"
    );

    Response::success("Pickup thành công", [
        "order_id"   => $orderId,
        "order_code" => $order["order_code"],
        "status"     => 4
    ]);

} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

$conn->close();
