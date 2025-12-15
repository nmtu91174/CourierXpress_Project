<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ==================== CORS FIX CHO API PUBLIC ====================
// Khách hàng đang gọi, nên vẫn cần CORS chuẩn
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

// Khởi động Session để kiểm tra người dùng có đăng nhập hay không
SessionHelper::start();
$logged_in_user_id = SessionHelper::getCurrentUserId();
$logged_in_user_role = SessionHelper::getCurrentUserRole();

// 1. KIỂM TRA ĐĂNG NHẬP
// Mặc dù là API công khai, ta chỉ cho phép người dùng ĐÃ ĐĂNG NHẬP xem
if ($logged_in_user_id === 0) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Vui lòng đăng nhập để xem thông tin shipper."]);
    exit;
}

// 2. LẤY ID SHIPPER TỪ URL QUERY
$shipper_id = intval($_GET['id'] ?? 0);

if ($shipper_id === 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Thiếu ID shipper cần tìm."]);
    exit;
}

// 3. TRUY VẤN CƠ SỞ DỮ LIỆU (CHỈ LẤY CÁC TRƯỜNG CÔNG KHAI)
$sql = "
    SELECT 
        id, 
        name, 
        avatar, 
        vehicle_plate, 
        created_at 
    FROM users 
    WHERE id = ? AND role = 'shipper'
";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$result = $stmt->get_result();
$shipper_info = $result->fetch_assoc();

if (!$shipper_info) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Không tìm thấy thông tin shipper."]);
    exit;
}

// 4. TRẢ VỀ THÔNG TIN CÔNG KHAI
http_response_code(200);
echo json_encode([
    "status" => "success",
    "message" => "Lấy thông tin công khai của shipper thành công",
    "shipper" => $shipper_info // Chỉ chứa các trường công khai
]);
exit;
?>