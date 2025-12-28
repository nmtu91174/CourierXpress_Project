<?php
// backend/api/admin/create_agent.php
// CREATE AGENT – Admin tạo đại lý mới (Enterprise Safe)

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

// ==========================
// VALIDATION
// ==========================
$name = trim($data["name"] ?? "");
$email = trim($data["email"] ?? "");
$password = $data["password"] ?? "";
$phone = trim($data["phone"] ?? "");
$address = trim($data["address"] ?? "");
$citizenId = trim($data["citizen_id"] ?? "");
$status = $data["status"] ?? "active";

// Required fields
if (empty($name)) {
    Response::error("Tên agent là bắt buộc");
}

if (empty($email)) {
    Response::error("Email là bắt buộc");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    Response::error("Email không hợp lệ");
}

if (empty($password)) {
    Response::error("Mật khẩu là bắt buộc");
}

if (strlen($password) < 6) {
    Response::error("Mật khẩu phải từ 6 ký tự trở lên");
}

// Validate status
if (!in_array($status, ['active', 'inactive'])) {
    $status = 'active';
}

// ==========================
// CHECK EMAIL EXISTS
// ==========================
$checkEmail = $conn->prepare("SELECT id FROM users WHERE email = ?");
$checkEmail->bind_param("s", $email);
$checkEmail->execute();
$result = $checkEmail->get_result();

if ($result->num_rows > 0) {
    $checkEmail->close();
    Response::error("Email đã được sử dụng");
}
$checkEmail->close();

// ==========================
// CREATE AGENT
// ==========================
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);
$role = "agent";

// Handle empty strings - use empty string instead of null for MySQLi
$phoneValue = !empty($phone) ? $phone : "";
$addressValue = !empty($address) ? $address : "";
$citizenIdValue = !empty($citizenId) ? $citizenId : "";

$stmt = $conn->prepare("
    INSERT INTO users (
        name, email, password, role, status, 
        phone, address, citizen_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
");

if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi chuẩn bị truy vấn: " . $conn->error);
}

// Bind parameters - all strings
$stmt->bind_param(
    "ssssssss",
    $name,
    $email,
    $hashedPassword,
    $role,
    $status,
    $phoneValue,
    $addressValue,
    $citizenIdValue
);

if (!$stmt->execute()) {
    $errorMsg = $stmt->error;
    error_log("Create agent failed: " . $errorMsg);
    error_log("SQL: INSERT INTO users (name, email, password, role, status, phone, address, citizen_id, created_at)");
    error_log("Values: name={$name}, email={$email}, role={$role}, status={$status}");
    $stmt->close();
    Response::serverError("Không thể tạo agent: " . $errorMsg);
}

$agentId = $stmt->insert_id;
$stmt->close();

if (!$agentId) {
    error_log("Create agent: insert_id is empty");
    Response::serverError("Không thể lấy ID agent vừa tạo");
}

// ==========================
// CREATE AGENT COVERAGE (agent_areas)
// ==========================
// ENTERPRISE: Coverage is REQUIRED for auto-routing
// If coverage_districts is provided, create agent_areas records
$coverageDistricts = $data["coverage_districts"] ?? [];
$coverageCreated = 0;

if (!empty($coverageDistricts) && is_array($coverageDistricts)) {
    // Start transaction for atomicity
    $conn->begin_transaction();
    
    try {
        $priority = 1; // Default priority, can be adjusted later
        
        foreach ($coverageDistricts as $districtId) {
            $districtId = (int)$districtId;
            
            // Validate district exists
            $checkDistrict = $conn->prepare("SELECT id FROM districts WHERE id = ? LIMIT 1");
            $checkDistrict->bind_param("i", $districtId);
            $checkDistrict->execute();
            $districtResult = $checkDistrict->get_result();
            
            if ($districtResult->num_rows === 0) {
                $checkDistrict->close();
                throw new Exception("District ID {$districtId} không tồn tại");
            }
            $checkDistrict->close();
            
            // Insert agent_areas record
            $areaStmt = $conn->prepare("
                INSERT INTO agent_areas (agent_id, district_id, ward_id, priority, active, created_at)
                VALUES (?, ?, NULL, ?, 1, NOW())
            ");
            
            if (!$areaStmt) {
                throw new Exception("Prepare agent_areas failed: " . $conn->error);
            }
            
            $areaStmt->bind_param("iii", $agentId, $districtId, $priority);
            
            if (!$areaStmt->execute()) {
                $errorMsg = $areaStmt->error;
                $areaStmt->close();
                throw new Exception("Không thể tạo coverage cho district {$districtId}: {$errorMsg}");
            }
            
            $areaStmt->close();
            $coverageCreated++;
            $priority++; // Increment priority for next district
        }
        
        // Commit transaction
        $conn->commit();
        error_log("CREATE AGENT: Created {$coverageCreated} coverage areas for agent_id {$agentId}");
        
    } catch (Exception $e) {
        // Rollback on error
        $conn->rollback();
        error_log("CREATE AGENT: Failed to create coverage - " . $e->getMessage());
        // Don't fail agent creation if coverage fails - log and continue
        // In production, you might want to fail the entire operation
    }
}

// ==========================
// LOG SYSTEM ACTION
// ==========================
$logStmt = $conn->prepare("INSERT INTO system_logs (user_id, action, entity, entity_id, created_at) VALUES (?, ?, 'users', ?, NOW())");
$action = "Tạo agent mới: {$name}" . ($coverageCreated > 0 ? " (Coverage: {$coverageCreated} districts)" : "");
$logStmt->bind_param("isi", $userId, $action, $agentId);
$logStmt->execute();
$logStmt->close();

$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Tạo agent thành công", [
    "agent_id" => $agentId,
    "name" => $name,
    "email" => $email,
    "coverage_districts_created" => $coverageCreated,
    "has_coverage" => $coverageCreated > 0
]);

