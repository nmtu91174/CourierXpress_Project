<?php
// backend/api/admin/toggle_agent_status.php
// API endpoint để Enable/Disable agent (Enterprise Safe)

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

$userId = $GLOBALS['auth_user']['id'];

// ==========================
// READ INPUT
// ==========================
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE || $data === null) {
    Response::error("Invalid JSON input");
}

$agentId = (int)($data["agent_id"] ?? 0);
$newStatus = $data["status"] ?? null; // 'active' or 'inactive'

if ($agentId <= 0) {
    Response::error("Thiếu agent_id");
}

if (!in_array($newStatus, ['active', 'inactive'])) {
    Response::error("Status không hợp lệ. Chỉ chấp nhận: active, inactive");
}

// ==========================
// VERIFY AGENT EXISTS & IS AGENT
// ==========================
$stmt = $conn->prepare("SELECT id, name, status, role FROM users WHERE id = ? AND role = 'agent'");
$stmt->bind_param("i", $agentId);
$stmt->execute();
$result = $stmt->get_result();
$agent = $result->fetch_assoc();
$stmt->close();

if (!$agent) {
    Response::error("Agent không tồn tại hoặc không phải agent");
}

// ==========================
// UPDATE STATUS
// ==========================
$stmt = $conn->prepare("UPDATE users SET status = ? WHERE id = ? AND role = 'agent'");
$stmt->bind_param("si", $newStatus, $agentId);

if (!$stmt->execute()) {
    error_log("Update agent status failed: " . $stmt->error);
    Response::serverError("Không thể cập nhật trạng thái agent");
}

$stmt->close();

// ==========================
// LOG SYSTEM ACTION
// ==========================
$action = $newStatus === 'active' ? "Kích hoạt agent" : "Vô hiệu hóa agent";
$logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, entity, entity_id, created_at) VALUES (?, ?, 'users', ?, NOW())");
$logStmt->bind_param("isi", $userId, $action, $agentId);
$logStmt->execute();
$logStmt->close();

$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Cập nhật trạng thái agent thành công", [
    "agent_id" => $agentId,
    "new_status" => $newStatus,
    "agent_name" => $agent["name"],
]);

