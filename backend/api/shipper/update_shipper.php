<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ==================== CORS FIX HOÀN CHỈNH ====================
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Xử lý preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// ============================================================

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/SessionHelper.php";

// =========================================================
// 1. XÁC THỰC VÀ ĐỌC DỮ LIỆU TỪ $_POST
// =========================================================
SessionHelper::start();
$logged_in_user_id = SessionHelper::getCurrentUserId();
$logged_in_user_role = SessionHelper::getCurrentUserRole();

// Đọc dữ liệu từ $_POST (vì Frontend gửi FormData)
$id = intval($_POST['id'] ?? 0);
$name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$address = trim($_POST['address'] ?? '');
$citizen_id = trim($_POST['citizen_id'] ?? '');
$vehicle_plate = trim($_POST['vehicle_plate'] ?? '');
$avatar_url_old = trim($_POST['avatar'] ?? ''); // URL cũ nếu không upload file mới
$vehicle_type = trim($_POST['vehicle_type'] ?? ''); // ✅ TRƯỜNG MỚI

// 2. KIỂM TRA QUYỀN SỞ HỮU (KHẮC PHỤC LỖI BẢO MẬT 401/403)
if ($logged_in_user_id === 0 || $logged_in_user_role !== 'shipper') {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized access. Please log in."]);
    exit;
}
if ($id !== $logged_in_user_id) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Permission denied. You can only update your own profile."]);
    exit;
}

// 3. KIỂM TRA CÁC TRƯỜNG BẮT BUỘC
if (!$phone || !$citizen_id || !$vehicle_plate) {
    echo json_encode(["status" => "error", "message" => "Vui lòng nhập đầy đủ SĐT, CCCD và biển số xe"]);
    exit;
}

// 4. XỬ LÝ FILE UPLOAD (CHO TÍNH NĂNG AVATAR)
$new_avatar_url = $avatar_url_old; // Mặc định giữ lại cái cũ

if (isset($_FILES['avatarFile']) && $_FILES['avatarFile']['error'] === UPLOAD_ERR_OK) {
    $upload_dir = __DIR__ . "/../../../public/uploads/avatars/"; 
    
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true); 
    }

    $file = $_FILES['avatarFile'];
    $file_ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed_ext = ['jpg', 'jpeg', 'png', 'gif'];

    if (in_array($file_ext, $allowed_ext)) {
        $file_name = $id . '_' . time() . '.' . $file_ext;
        $target_file = $upload_dir . $file_name;

        if (move_uploaded_file($file['tmp_name'], $target_file)) {
            // URL tương đối mà Frontend sẽ sử dụng để hiển thị ảnh
            $new_avatar_url = "/public/uploads/avatars/" . $file_name; 
        } else {
             error_log("Failed to move uploaded file for shipper ID: " . $id);
        }
    }
}
// ✅ LOGIC GÁN AVATAR MẶC ĐỊNH KHI KHÔNG CÓ FILE UPLOAD MỚI VÀ KHÔNG CÓ ẢNH CŨ
else if (empty($avatar_url_old)) {
    // Đường dẫn phải khớp với ảnh mặc định trong Frontend
    $new_avatar_url = "/assets/images/avatar.jpg"; 
}


// 5. UPDATE DỮ LIỆU
// Cập nhật câu lệnh SQL để bao gồm 'name' và 'vehicle_type'
$sql = "UPDATE users SET name = ?, phone = ?, address = ?, citizen_id = ?, vehicle_plate = ?, avatar = ?, vehicle_type = ? WHERE id = ? AND role = 'shipper'";

$stmt = $conn->prepare($sql);

// ssssss si => 7 chuỗi (name, phone, address, cccd, plate, avatar, type) và 1 integer (id)
$stmt->bind_param("sssssssi", $name, $phone, $address, $citizen_id, $vehicle_plate, $new_avatar_url, $vehicle_type, $id);

if ($stmt->execute()) {
    
    // 6. TRẢ VỀ DỮ LIỆU ĐÃ CẬP NHẬT ĐỂ FRONTEND LƯU VÀO LOCALSTORAGE
    // Bổ sung vehicle_type và name vào SELECT
    $new_info_stmt = $conn->prepare("
        SELECT id, name, email, phone, address, avatar, citizen_id, vehicle_plate, vehicle_type, role, created_at
        FROM users 
        WHERE id = ?
    ");
    $new_info_stmt->bind_param("i", $id);
    $new_info_stmt->execute();
    $new_info = $new_info_stmt->get_result()->fetch_assoc();

    echo json_encode([
        "status" => "success", 
        "message" => "Cập nhật thông tin shipper thành công",
        "user_data" => $new_info // Frontend sẽ dùng cái này để cập nhật localStorage
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Cập nhật thất bại. Lỗi SQL: " . $stmt->error]);
}
exit;