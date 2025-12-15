<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ==================== CORS FIX ====================
header("Access-Control-Allow-Origin: http://localhost:5173"); 
header("Access-Control-Allow-Methods: POST, OPTIONS");
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
    echo json_encode(["status" => "error", "message" => "Unauthorized: Chỉ Shipper mới có quyền cập nhật."]);
    exit;
}

// 2. ĐỌC DỮ LIỆU TỪ CLIENT
$data = json_decode(file_get_contents("php://input"), true);

$order_id = intval($data['order_id'] ?? 0);
$new_status = trim($data['new_status'] ?? '');

if ($order_id === 0 || empty($new_status)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Thiếu ID đơn hàng hoặc trạng thái mới."]);
    exit;
}

// 3. KIỂM TRA TRẠNG THÁI HỢP LỆ
$allowed_statuses = [
    'picked_up',       // Đã nhận hàng từ người gửi
    'in_transit',      // Đang trên đường giao
    'delivered',       // Giao hàng thành công
    'delivery_failed'  // Giao hàng thất bại
];

if (!in_array($new_status, $allowed_statuses)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Trạng thái mới không hợp lệ."]);
    exit;
}

// 4. CẬP NHẬT TRẠNG THÁI VÀ XÁC MINH SỞ HỮU
// Đảm bảo chỉ cập nhật đơn hàng đã được gán cho chính shipper này
$sql = "
    UPDATE orders 
    SET status = ? 
    WHERE id = ? AND shipper_id = ? AND status != 'cancelled' AND status != 'delivered'
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("sii", $new_status, $order_id, $logged_in_user_id);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        http_response_code(200);
        echo json_encode([
            "status" => "success",
            "message" => "Cập nhật trạng thái đơn hàng #{$order_id} thành công: {$new_status}"
        ]);
    } else {
        // Có thể đơn hàng đã hoàn thành/hủy hoặc không thuộc về shipper này
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Không thể cập nhật trạng thái đơn hàng này (không tìm thấy hoặc không có quyền)."]);
    }
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Lỗi cập nhật SQL: " . $stmt->error]);
}
exit;
?>