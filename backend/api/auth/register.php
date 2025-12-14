<?php
// backend/api/auth/register.php
// REGISTER API – chuẩn kiến trúc CourierXpress

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ OPTIONS phải exit sớm TRƯỚC middleware
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================
// METHOD CHECK
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "status"  => "error",
        "message" => "Chỉ hỗ trợ POST."
    ]);
    exit();
}

// ==========================
// CORE & DB
// ==========================
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";

// Load NotificationService - wrap in try-catch để không block nếu lỗi
$hasNotificationService = false;
try {
    if (file_exists(__DIR__ . "/../../services/NotificationService.php")) {
        require_once __DIR__ . "/../../services/NotificationService.php";
        $hasNotificationService = class_exists("NotificationService");
    }
} catch (Exception $e) {
    error_log("Failed to load NotificationService: " . $e->getMessage());
}

$conn->set_charset("utf8mb4");

// ==========================
// READ INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);

$name            = trim($data["name"] ?? "");
$email           = trim($data["email"] ?? "");
$password        = $data["password"] ?? "";
$confirmPassword = $data["confirmPassword"] ?? "";
$requestedRole   = trim($data["role"] ?? ""); // Role từ frontend (query param hoặc body)

// Debug: log role để kiểm tra
error_log("Register - Requested role: " . $requestedRole);
error_log("Register - Full data: " . json_encode($data));

// ==========================
// VALIDATION
// ==========================
if ($name === "" || $email === "" || $password === "" || $confirmPassword === "") {
    Response::error("Vui lòng nhập đầy đủ thông tin!");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::error("Email không hợp lệ!");
}

if ($password !== $confirmPassword) {
    Response::error("Mật khẩu xác nhận không khớp!");
}

if (strlen($password) < 6) {
    Response::error("Mật khẩu phải từ 6 ký tự trở lên!");
}

// ==========================
// CHECK EMAIL EXISTS
// ==========================
$check = $conn->prepare(
    "SELECT id FROM users WHERE email = ?"
);
$check->bind_param("s", $email);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    Response::error("Email đã được sử dụng!");
}

// ==========================
// CREATE USER
// ==========================
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// ❗ SECURITY: Chỉ cho phép customer và shipper tự đăng ký
// Admin và agent chỉ được tạo bởi admin
$allowedRoles = ["customer", "shipper"];
$role = strtolower(trim($requestedRole));

// Validate role: nếu không có hoặc không hợp lệ → mặc định là customer
if (empty($role) || !in_array($role, $allowedRoles)) {
    error_log("Register - Invalid role '{$role}', defaulting to 'customer'");
    $role = "customer";
} else {
    error_log("Register - Valid role '{$role}' accepted");
}

$status = "active";

// Debug: log final role
error_log("Register - Final role to insert: " . $role);

$insert = $conn->prepare(
    "INSERT INTO users (name, email, password, role, status, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())"
);

$insert->bind_param(
    "sssss",
    $name,
    $email,
    $hashedPassword,
    $role,
    $status
);

if (!$insert->execute()) {
    Response::serverError("Không thể tạo tài khoản!");
}

// ==========================
// SYSTEM LOG (OPTIONAL)
// ==========================
if ($hasNotificationService) {
    try {
        $notify = new NotificationService($conn);
        $notify->log(
            "REGISTER",
            "user",
            $insert->insert_id,
            $insert->insert_id
        );
    } catch (Exception $e) {
        error_log("NotificationService REGISTER error: " . $e->getMessage());
    } catch (Error $e) {
        error_log("NotificationService REGISTER fatal error: " . $e->getMessage());
    }
}

// ==========================
// RESPONSE
// ==========================
// Debug: log role trước khi response
error_log("Register - Final response with role: " . $role);

Response::success("Đăng ký tài khoản thành công!", [
    "id"    => $insert->insert_id,
    "name"  => $name,
    "email" => $email,
    "role"  => $role,
    "status" => $status
]);

$conn->close();
