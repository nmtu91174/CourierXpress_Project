<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ==================== CORS FIX ====================
header("Access-Control-Allow-Origin: http://localhost:5173"); 
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// ============================================================

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/SessionHelper.php";

SessionHelper::start();
$logged_in_user_id = SessionHelper::getCurrentUserId();
$logged_in_user_role = SessionHelper::getCurrentUserRole();

// 1. XÁC THỰC SHIPPER
if ($logged_in_user_id === 0 || $logged_in_user_role !== 'shipper') {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized: Chỉ Shipper mới có quyền truy cập."]);
    exit;
}

// 2. TRUY VẤN CƠ SỞ DỮ LIỆU
// Lấy tất cả đơn hàng được gán cho shipper này, trừ đơn đã hủy.
$sql = "
    SELECT 
        o.id,
        o.order_code,
        o.sender_name,
        o.sender_address,
        o.receiver_name,
        o.receiver_address,
        o.status,
        o.created_at,
        o.estimated_delivery_time,
        o.total_fee,
        o.payment_method
    FROM 
        orders o
    WHERE 
        o.shipper_id = ? AND o.status != 'cancelled'
    ORDER BY 
        o.created_at DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $logged_in_user_id);
$stmt->execute();
$result = $stmt->get_result();
$orders = [];

// Chuyển kết quả sang mảng PHP
while ($row = $result->fetch_assoc()) {
    $orders[] = $row;
}

// 3. TRẢ VỀ DỮ LIỆU
http_response_code(200);
echo json_encode([
    "status" => "success",
    "message" => "Lấy danh sách đơn hàng thành công.",
    "orders" => $orders
]);
exit;
?>