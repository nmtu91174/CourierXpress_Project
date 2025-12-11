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

// 1. Nhận dữ liệu JSON từ Admin Frontend
$data = json_decode(file_get_contents("php://input"), true);

// 2. Validate cơ bản
if (
    empty($data['sender_name']) || empty($data['receiver_name']) ||
    empty($data['weight']) || empty($data['item_name']) || empty($data['delivery_date'])
) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Thiếu thông tin bắt buộc"]);
    exit;
}

// 3. Tạo mã vận đơn tự động (Ví dụ: CX + timestamp)
$tracking_id = "CX" . time();

// 4. Tính phí đơn giản (Ví dụ: 15k + 5k * kg)
$weight = floatval($data['weight']);
$shipping_fee = 15000 + ($weight * 5000);

// 5. Insert vào DB
$stmt = $conn->prepare("INSERT INTO orders 
    (order_code, sender_name, sender_phone, sender_address, 
     receiver_name, receiver_phone, receiver_address, 
     item_name, weight, total_shipping_fee, delivery_date, status, customer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)"); // status 1 = Booked, customer_id tạm để 1 (Admin)

// Bind params: s = string, d = double
$stmt->bind_param(
    "ssssssssdds",
    $tracking_id,
    $data['sender_name'],
    $data['sender_phone'],
    $data['sender_address'],
    $data['receiver_name'],
    $data['receiver_phone'],
    $data['receiver_address'],
    $data['item_name'],
    $weight,
    $shipping_fee,
    $data['delivery_date']
);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success",
        "message" => "Tạo đơn thành công",
        "tracking_id" => $tracking_id,
        "fee" => $shipping_fee
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Lỗi Database: " . $stmt->error]);
}

$stmt->close();
$conn->close();
