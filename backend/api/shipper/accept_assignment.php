<?php
// backend/api/shipper/accept_assignment.php
// Shipper accepts the assignment (Status 2 -> 3)

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ OPTIONS must exit early
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
// CORE IMPORTS
// ==========================
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";
require_once __DIR__ . "/../../services/OrderService.php";

// ==========================
// AUTH & PERMISSION
// ==========================
require_login(); // Bắt buộc đăng nhập
require_role(["shipper"]); // Chỉ Shipper mới được gọi

$shipperId = $GLOBALS['auth_user']['id'];
$role      = $GLOBALS['auth_user']['role'];

// ==========================
// READ INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);
$orderId = isset($data["order_id"]) ? (int)$data["order_id"] : 0;

if ($orderId <= 0) {
    Response::error("Missing order_id");
}

// ==========================
// VALIDATION
// ==========================
// 1. Check if order exists and belongs to this shipper
// 2. Check if status is 2 (Approved/Assigned)
// [NOTE]: Column name in DB is 'status', NOT 'status_id'
$check = $conn->prepare("SELECT id, status, shipper_id FROM orders WHERE id = ?");
$check->bind_param("i", $orderId);
$check->execute();
$result = $check->get_result();

if ($result->num_rows === 0) {
    Response::error("Order not found");
}

$order = $result->fetch_assoc();

if ((int)$order['shipper_id'] !== $shipperId) {
    Response::error("You are not assigned to this order");
}

if ((int)$order['status'] !== 2) {
    Response::error("Order is not in 'Assigned' status (Current status: " . $order['status'] . ")");
}

// ==========================
// PROCESS: UPDATE STATUS 2 -> 3
// ==========================
try {
    $service = new OrderService($conn);

    // Use OrderService to handle Transaction and History Logging automatically
    // Status 3 = Assigned/Picking Up
    $service->updateStatus(
        $orderId,
        3,
        $shipperId,
        $role,
        "Shipper accepted assignment, heading to pickup."
    );

    Response::success("Order accepted. Status updated to Picking Up (3).", [
        "order_id" => $orderId,
        "status" => 3
    ]);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

$conn->close();
