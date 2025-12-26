<?php
// backend/api/admin/assign_agent.php
// ASSIGN AGENT – Admin phân công agent (Enterprise Safe)

// ==========================
// CORS
// ==========================
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// OPTIONS exit sớm
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
require_role(["admin"]);

$adminId = (int)$GLOBALS['auth_user']['id'];
$role    = (string)$GLOBALS['auth_user']['role']; // admin

// ==========================
// INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);

$orderId = (int)($data["order_id"] ?? 0);
$agentId = (int)($data["agent_id"] ?? 0);

if ($orderId <= 0 || $agentId <= 0) {
    Response::error("Thiếu order_id hoặc agent_id");
}

// ==========================
// ASSIGN AGENT
// ==========================
try {
    // Get order info before assignment
    $getOrder = $conn->prepare("SELECT order_code, customer_id, status FROM orders WHERE id = ?");
    $getOrder->bind_param("i", $orderId);
    $getOrder->execute();
    $orderResult = $getOrder->get_result();
    $orderData = $orderResult->fetch_assoc();
    $getOrder->close();

    if (!$orderData) {
        Response::error("Order not found");
    }

    $orderCode = $orderData["order_code"];
    $customerId = (int)$orderData["customer_id"];
    $oldStatus = (int)$orderData["status"];

    $service = new OrderService($conn);

    // Giao toàn bộ transaction cho Service
    $service->assignAgentByAdmin(
        $orderId,
        $agentId,
        $adminId
    );

    // ==========================
    // CREATE NOTIFICATIONS (RBAC)
    // ==========================
    $notificationService = new NotificationService($conn);
    $notificationService->emit('agent_assigned', $orderId, $adminId, $role);

    Response::success("Admin phân công agent thành công");

} catch (Exception $e) {
    error_log("ASSIGN AGENT ERROR: " . $e->getMessage());
    Response::serverError($e->getMessage());
} catch (Error $e) {
    error_log("ASSIGN AGENT FATAL: " . $e->getMessage());
    Response::serverError("Lỗi hệ thống");
}

