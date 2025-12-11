<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "../../db.php";

// Query lấy đơn hàng mới nhất lên đầu (DESC)
// Chúng ta dùng AS để đổi tên cột cho khớp với Frontend React đang dùng (sender, receiver, address...)
$sql = "SELECT 
            id, 
            order_code, 
            sender_name AS sender, 
            receiver_name AS receiver, 
            receiver_address AS address, 
            status, 
            created_at 
        FROM orders 
        ORDER BY created_at DESC";

$result = $conn->query($sql);

$orders = [];
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Chuyển status về kiểu số (int) để Frontend dễ so sánh
        $row['status'] = (int)$row['status'];
        $orders[] = $row;
    }
}

echo json_encode(["status" => "success", "data" => $orders]);

$conn->close();
