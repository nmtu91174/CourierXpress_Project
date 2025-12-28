<?php
// backend/api/admin/reset_agent_password.php
// RESET AGENT PASSWORD – Admin reset password cho agent (Enterprise Safe)
// IMPORTANT: This does NOT affect assigned orders - only updates credentials

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================
// CORE
// ==========================
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";

// ==========================
// AUTH
// ==========================
require_login();
require_role(["admin"]);

$adminId = (int)$GLOBALS['auth_user']['id'];

// ==========================
// READ INPUT
// ==========================
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE || $data === null) {
    Response::error("Invalid JSON input");
}

// ==========================
// VALIDATION
// ==========================
$agentId = isset($data["agent_id"]) ? (int)$data["agent_id"] : 0;
$newPassword = trim($data["new_password"] ?? "");

if ($agentId <= 0) {
    Response::error("agent_id is required");
}

if (empty($newPassword)) {
    Response::error("Mật khẩu mới là bắt buộc");
}

if (strlen($newPassword) < 6) {
    Response::error("Mật khẩu phải từ 6 ký tự trở lên");
}

// ==========================
// VERIFY AGENT EXISTS AND IS AGENT ROLE
// ==========================
$checkAgent = $conn->prepare("SELECT id, name, email, role FROM users WHERE id = ? AND role = 'agent' LIMIT 1");
$checkAgent->bind_param("i", $agentId);
$checkAgent->execute();
$agentResult = $checkAgent->get_result();
$agentData = $agentResult->fetch_assoc();
$checkAgent->close();

if (!$agentData) {
    Response::error("Agent not found or invalid role");
}

$agentName = $agentData['name'];
$agentEmail = $agentData['email'];

// ==========================
// UPDATE PASSWORD
// ==========================
$hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

$stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ? AND role = 'agent'");

if (!$stmt) {
    error_log("Reset agent password: Prepare failed: " . $conn->error);
    Response::serverError("Lỗi chuẩn bị truy vấn: " . $conn->error);
}

$stmt->bind_param("si", $hashedPassword, $agentId);

if (!$stmt->execute()) {
    $errorMsg = $stmt->error;
    error_log("Reset agent password failed: " . $errorMsg);
    $stmt->close();
    Response::serverError("Không thể reset mật khẩu: " . $errorMsg);
}

$stmt->close();

// ==========================
// LOG SYSTEM ACTION (AUDIT)
// ==========================
$logStmt = $conn->prepare("
    INSERT INTO system_logs (user_id, action, entity, entity_id, created_at) 
    VALUES (?, ?, 'users', ?, NOW())
");
$action = "Reset password for agent: {$agentName} ({$agentEmail})";
$logStmt->bind_param("isi", $adminId, $action, $agentId);
$logStmt->execute();
$logStmt->close();

$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Reset mật khẩu thành công", [
    "agent_id" => $agentId,
    "agent_name" => $agentName,
    "agent_email" => $agentEmail,
    "message" => "Mật khẩu đã được reset. Agent có thể đăng nhập với mật khẩu mới."
]);

