<?php
// backend/api/admin/set_delivery_date.php
// Admin - Set Expected Delivery Date for Order

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

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
// AUTH - Admin only
// ==========================
require_login();
require_role(["admin"]);

$userId = (int)$GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// VALIDATE INPUT
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    Response::error("Method not allowed. Use POST.");
}

$input = json_decode(file_get_contents("php://input"), true);
$orderId = (int)($input["order_id"] ?? 0);
$expectedDeliveryDate = trim($input["expected_delivery_date"] ?? "");

if ($orderId <= 0) {
    Response::error("order_id is required and must be a positive integer");
}

// Validate date format (YYYY-MM-DD)
if (!empty($expectedDeliveryDate)) {
    $dateParts = explode("-", $expectedDeliveryDate);
    if (count($dateParts) !== 3 || !checkdate((int)$dateParts[1], (int)$dateParts[2], (int)$dateParts[0])) {
        Response::error("Invalid date format. Use YYYY-MM-DD");
    }
}

// ==========================
// UPDATE ORDER
// ==========================
try {
    // Check if order exists
    $checkOrder = $conn->prepare("SELECT id, order_code FROM orders WHERE id = ?");
    $checkOrder->bind_param("i", $orderId);
    $checkOrder->execute();
    $orderResult = $checkOrder->get_result();
    $orderData = $orderResult->fetch_assoc();
    $checkOrder->close();

    if (!$orderData) {
        Response::error("Order not found");
    }

    // Update expected_delivery_date
    if (empty($expectedDeliveryDate)) {
        // Set to NULL if empty
        $updateSql = "UPDATE orders SET expected_delivery_date = NULL WHERE id = ?";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param("i", $orderId);
    } else {
        $updateSql = "UPDATE orders SET expected_delivery_date = ? WHERE id = ?";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param("si", $expectedDeliveryDate, $orderId);
    }

    if (!$updateStmt->execute()) {
        throw new Exception("Failed to update delivery date: " . $conn->error);
    }

    $updateStmt->close();

    Response::success("Cập nhật ngày giao dự kiến thành công", [
        "order_id" => $orderId,
        "order_code" => $orderData["order_code"],
        "expected_delivery_date" => $expectedDeliveryDate ?: null,
    ]);

} catch (Exception $e) {
    error_log("SET DELIVERY DATE ERROR: " . $e->getMessage());
    Response::serverError($e->getMessage());
}

