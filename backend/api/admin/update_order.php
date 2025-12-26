<?php
// backend/api/admin/update_order.php
// UPDATE ORDER – chuẩn kiến trúc + audit + history

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
require_once __DIR__ . "/../../services/NotificationService.php";

// ==========================
// AUTH
// ==========================
require_login();
require_role(["admin", "agent", "shipper", "customer"]);

$userId = $GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// READ INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);

$orderId = (int)($data["order_id"] ?? 0);
$newStatus = isset($data["status"]) ? (int)$data["status"] : null;
$note = trim($data["note"] ?? "Cập nhật đơn hàng");

if ($orderId <= 0) {
    Response::error("Thiếu order_id");
}

// ==========================
// ROLE RULES
// ==========================
if ($role === "customer" && $newStatus !== null) {
    Response::error("Khách hàng không được tự ý đổi trạng thái");
}

// ==========================
// UPDATE
// ==========================
try {
    // Get current order info before update
    $getOrder = $conn->prepare("SELECT status, order_code, customer_id FROM orders WHERE id = ?");
    $getOrder->bind_param("i", $orderId);
    $getOrder->execute();
    $orderResult = $getOrder->get_result();
    $orderData = $orderResult->fetch_assoc();
    $getOrder->close();

    if (!$orderData) {
        Response::error("Order not found");
    }

    $oldStatus = (int)$orderData["status"];
    $orderCode = $orderData["order_code"];
    $customerId = (int)$orderData["customer_id"];

    $service = new OrderService($conn);

    // 👉 Update status (workflow)
    if ($newStatus !== null) {
        $service->updateStatus(
            $orderId,
            $newStatus,
            $userId,
            $role,
            $note
        );
        
        // ==========================
        // CREATE NOTIFICATIONS FOR STATUS CHANGES (RBAC)
        // ==========================
        if ($newStatus !== $oldStatus) {
            $notificationService = new NotificationService($conn);
            
            // Status 1 -> 2: Order Approved
            if ($oldStatus === 1 && $newStatus === 2) {
                $notificationService->emit('agent_approved', $orderId, $userId, $role);
            }
        }
    }

    Response::success("Cập nhật đơn hàng thành công");

} catch (Exception $e) {
    error_log("UPDATE ORDER ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError($e->getMessage());
} catch (Error $e) {
    error_log("UPDATE ORDER FATAL ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError("Lỗi hệ thống: " . $e->getMessage());
}

