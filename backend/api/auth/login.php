<?php
// backend/api/auth/login.php
// LOGIN API – CourierXpress (SESSION + CORS FIXED)

// =====================================================
// ERROR HANDLING (LOG ONLY – PROD SAFE)
// =====================================================
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// =====================================================
// CORS (PHẢI ĐẶT TRƯỚC)
// =====================================================
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ OPTIONS phải exit sớm
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// =====================================================
// METHOD CHECK
// =====================================================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "status"  => "error",
        "message" => "Chỉ hỗ trợ POST."
    ]);
    exit;
}

// =====================================================
// CORE & DB
// =====================================================
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../core/SessionHelper.php";

// =====================================================
// START SESSION (QUAN TRỌNG)
// =====================================================
SessionHelper::start();

// =====================================================
// READ JSON INPUT
// =====================================================
$data = json_decode(file_get_contents("php://input"), true);

$email    = trim($data["email"] ?? "");
$password = $data["password"] ?? "";

// =====================================================
// VALIDATION
// =====================================================
if ($email === "" || $password === "") {
    Response::error("Thiếu email hoặc mật khẩu!");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::error("Email không hợp lệ!");
}

// =====================================================
// QUERY USER
// =====================================================
$stmt = $conn->prepare("
    SELECT id, name, email, password, role, phone, status, avatar
    FROM users
    WHERE email = ?
    LIMIT 1
");

if (!$stmt) {
    error_log("LOGIN PREPARE ERROR: " . $conn->error);
    Response::serverError("Lỗi hệ thống");
}

$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    Response::error("Email không tồn tại!");
}

$user = $result->fetch_assoc();
$stmt->close();

// =====================================================
// PASSWORD VERIFY
// =====================================================
if (!password_verify($password, $user["password"])) {
    Response::error("Sai mật khẩu!");
}

// =====================================================
// ACCOUNT STATUS
// =====================================================
if ($user["status"] !== "active") {
    Response::error("Tài khoản đã bị khóa!");
}

// 🔒 HARDEN SESSION (PREVENT FIXATION)
session_regenerate_id(true);

// =====================================================
// UPDATE LAST LOGIN
// =====================================================
$update = $conn->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
$update->bind_param("i", $user["id"]);
$update->execute();
$update->close();

// =====================================================
// SET SESSION (MIDDLEWARE DÙNG)
// =====================================================
$_SESSION["user"] = [
    "id"     => (int)$user["id"],
    "name"   => $user["name"],
    "email"  => $user["email"],
    "role"   => $user["role"],
    "phone"  => $user["phone"],
    "status" => $user["status"],
];

// ⭐ QUAN TRỌNG: Đảm bảo session được lưu
// PHP tự động lưu session khi script kết thúc, nhưng có thể lưu sớm
// để đảm bảo cookie được gửi trong response header
session_write_close();

// =====================================================
// RESPONSE
// =====================================================
Response::success("Đăng nhập thành công!", [
    "id"     => (int)$user["id"],
    "name"   => $user["name"],
    "email"  => $user["email"],
    "role"   => $user["role"],
    "phone"  => $user["phone"],
    "status" => $user["status"],
    "avatar" => $user["avatar"] ?? null,
]);

$conn->close();
