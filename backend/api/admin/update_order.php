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

// Validate bắt buộc phải có ID đơn hàng
if (empty($data['order_id'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Thiếu Order ID"]);
    exit;
}

// Xây dựng câu SQL động (chỉ cập nhật trường nào được gửi lên)
$fields = [];
$params = [];
$types = "";

// Ví dụ: Admin muốn sửa địa chỉ nhận
if (isset($data['receiver_address'])) {
    $fields[] = "receiver_address = ?";
    $params[] = $data['receiver_address'];
    $types .= "s";
}

// Ví dụ: Admin muốn sửa trạng thái (1=Booked, 2=Approved...)
if (isset($data['status'])) {
    $fields[] = "status = ?";
    $params[] = $data['status'];
    $types .= "i";
}

if (empty($fields)) {
    echo json_encode(["status" => "error", "message" => "Không có dữ liệu cần cập nhật"]);
    exit;
}

// Ghép câu lệnh SQL
$sql = "UPDATE orders SET " . implode(", ", $fields) . " WHERE id = ?";
$params[] = $data['order_id'];
$types .= "i";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Cập nhật thành công"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Lỗi: " . $stmt->error]);
}

$stmt->close();
$conn->close();
