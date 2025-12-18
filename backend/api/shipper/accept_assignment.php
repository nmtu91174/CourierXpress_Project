<?php
// backend/api/shipper/accept_assignment.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../../db.php';

// Check HTTP Method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["message" => "Method not allowed."]);
    exit;
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->order_id) || !isset($data->shipper_id)) {
    http_response_code(400);
    echo json_encode(["message" => "Incomplete data."]);
    exit;
}

$order_id = intval($data->order_id);
$shipper_id = intval($data->shipper_id);

// 1. Verify that the order is currently assigned to this shipper AND status is 2 (Assigned)
// We must prevent jumping status strictly.
$sql_check = "SELECT id FROM orders WHERE id = ? AND shipper_id = ? AND status_id = 2";
$stmt = $conn->prepare($sql_check);
$stmt->bind_param("ii", $order_id, $shipper_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(400);
    echo json_encode(["message" => "Invalid order status or not assigned to you."]);
    exit;
}

// 2. Update status to 3 (Picking Up / Đã xác nhận và đi lấy hàng)
$sql_update = "UPDATE orders SET status_id = 3, updated_at = NOW() WHERE id = ?";
$stmt_update = $conn->prepare($sql_update);
$stmt_update->bind_param("i", $order_id);

if ($stmt_update->execute()) {
    // Log history
    $log_sql = "INSERT INTO order_history (order_id, status_id, user_id, description) VALUES (?, 3, ?, 'Shipper accepted assignment, heading to pickup.')";
    $log_stmt = $conn->prepare($log_sql);
    $log_stmt->bind_param("ii", $order_id, $shipper_id);
    $log_stmt->execute();

    echo json_encode(["message" => "Order accepted. Status updated to Picking Up (3)."]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Database error."]);
}

$conn->close();
