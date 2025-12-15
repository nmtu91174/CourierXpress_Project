<?php
// Bật error reporting để debug
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ==============================================================
// 1. SỬA LỖI CORS HEADER VÀ NHÚNG SESSION HELPER
// ==============================================================
// ❌ Sửa CORS: Cần chỉ định Allow-Origin cụ thể và Allow-Credentials để gửi Cookie Session
header("Access-Control-Allow-Origin: http://localhost:5173"); 
header("Access-Control-Allow-Credentials: true"); // BẮT BUỘC để gửi Cookie Session
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

// Xử lý preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// ✅ NHÚNG SESSION HELPER
require_once __DIR__ . "/../../core/SessionHelper.php"; 
// ==============================================================


$host = "localhost";
$user = "root";
$pass = "root";
$dbname = "eproject";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die(json_encode([
        "status" => "error",
        "message" => "Không thể kết nối database!"
    ]));
}

$conn->set_charset("utf8mb4");

$data = json_decode(file_get_contents("php://input"), true);

$email = $data["email"] ?? "";
$password = $data["password"] ?? "";

if (!$email || !$password) {
    http_response_code(400); 
    echo json_encode(["status" => "error", "message" => "Thiếu email hoặc mật khẩu!"]);
    exit();
}

$sql = "SELECT * FROM users WHERE email = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows == 0) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Email không tồn tại!"]);
    exit();
}

$user = $result->fetch_assoc();

if (!password_verify($password, $user["password"])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Sai mật khẩu!"]);
    exit();
}


// ==============================================================
// 2. THIẾT LẬP SESSION (SAU KHI XÁC THỰC THÀNH CÔNG)
// ==============================================================
SessionHelper::start(); 

$_SESSION['user_id'] = $user["id"];
$_SESSION['role'] = $user["role"];
// ==============================================================


$update = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
$update->bind_param("i", $user["id"]);
$update->execute();

// Trả về 200 OK
http_response_code(200);
echo json_encode([
    "status" => "success",
    "message" => "Đăng nhập thành công!",
    "user" => [
        "id" => $user["id"],
        "name" => $user["name"],
        "email" => $user["email"],
        "role" => $user["role"],
        "last_login" => date("Y-m-d H:i:s")
    ]
]);
exit;