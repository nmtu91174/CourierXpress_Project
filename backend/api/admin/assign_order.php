<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "../../db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['order_id']) || empty($data['agent_id'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Thiếu Order ID hoặc Agent ID"]);
    exit;
}

$order_id = $data['order_id'];
$agent_id = $data['agent_id'];

// Cập nhật agent_id cho đơn hàng
$sql = "UPDATE orders SET agent_id = ? WHERE id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $agent_id, $order_id);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Phân công đại lý thành công"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Lỗi: " . $stmt->error]);
}

$stmt->close();
$conn->close();
