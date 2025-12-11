<?php
// 1. Cấu hình Headers (Cho phép React gọi API)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Xử lý request kiểm tra (Preflight) của trình duyệt
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Kết nối Database
require_once "../../db.php";

// 3. Viết câu SQL lấy dữ liệu
// - SELECT: Chọn các cột cần thiết (id, mã đơn, người gửi/nhận, ngày tạo, trạng thái)
// - ORDER BY created_at DESC: Sắp xếp giảm dần theo ngày tạo (mới nhất lên đầu)
// - LIMIT 5: Chỉ lấy 5 dòng đầu tiên
$sql = "SELECT 
            id, 
            order_code, 
            sender_name AS sender, 
            receiver_name AS receiver, 
            created_at, 
            status 
        FROM orders 
        ORDER BY created_at DESC 
        LIMIT 5";

$result = $conn->query($sql);

$orders = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        // Chuyển status về dạng số nguyên để Frontend dễ so sánh (1, 2, 7...)
        $row['status'] = (int)$row['status'];
        $orders[] = $row;
    }
}

// 4. Trả về kết quả JSON
echo json_encode(["status" => "success", "data" => $orders]);

$conn->close();
