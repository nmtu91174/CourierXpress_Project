<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Nếu là request OPTIONS → browser kiểm tra CORS → trả OK
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

include "./db.php";

$input = json_decode(file_get_contents("php://input"), true);

$name = trim($input["name"] ?? "");
$email = trim($input["email"] ?? "");
$password = trim($input["password"] ?? "");
$confirmPassword = trim($input["confirmPassword"] ?? "");
$role = trim($input["role"] ?? "customer"); 

// Kiểm tra dữ liệu bắt buộc
if (!$name || !$email || !$password || !$confirmPassword) {
    echo json_encode(["status" => "error", "message" => "Vui lòng nhập đầy đủ thông tin"]);
    exit;
}

// Kiểm tra email hợp lệ
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["status" => "error", "message" => "Email không hợp lệ"]);
    exit;
}

// Kiểm tra confirm password
if ($password !== $confirmPassword) {
    echo json_encode(["status" => "error", "message" => "Mật khẩu xác nhận không khớp"]);
    exit;
}

// Kiểm tra role hợp lệ
$validRoles = ['admin', 'customer', 'shipper'];
if (!in_array($role, $validRoles)) {
    $role = 'customer'; 
}

// Kiểm tra email trùng
$check = $conn->prepare("SELECT id FROM users WHERE email = ?");
$check->bind_param("s", $email);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Email đã được sử dụng"]);
    exit;
}

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Lưu user mới với role
$insert = $conn->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
$insert->bind_param("ssss", $name, $email, $hashedPassword, $role);

if ($insert->execute()) {
    echo json_encode(["status" => "success", "message" => "Tạo tài khoản thành công"]);
} else {
    echo json_encode(["status" => "error", "message" => "Lỗi server"]);
}
?>
