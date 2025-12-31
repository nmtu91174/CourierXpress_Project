<?php
// backend/api/admin/update_notification_template.php
// Admin - Update notification template

// Suppress any output before JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ob_start(); // Start output buffering - MUST be first

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
try {
    Cors::handlePreflight();
    Cors::setHeaders();
} catch (Exception $e) {
    ob_end_clean();
    error_log("UPDATE TEMPLATE CORS ERROR: " . $e->getMessage());
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode([
        "status" => "error",
        "message" => "CORS error: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

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

// Check database connection
if (!isset($conn) || !$conn) {
    ob_end_clean();
    error_log("UPDATE TEMPLATE: Database connection not available");
    Response::serverError("Database connection error");
}

// ==========================
// AUTH - Admin only
// ==========================
require_login();
require_role(["admin"]);

$userId = (int)($GLOBALS['auth_user']['id'] ?? 0);
$role   = $GLOBALS['auth_user']['role'] ?? '';

// ==========================
// VALIDATE INPUT
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    Response::error("Method not allowed. Use POST.");
}

$rawInput = file_get_contents("php://input");
if (empty($rawInput)) {
    ob_end_clean();
    Response::error("Request body is empty");
}

$input = json_decode($rawInput, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    ob_end_clean();
    Response::error("Invalid JSON: " . json_last_error_msg());
}

$templateId = (int)($input["id"] ?? 0);
$name = trim($input["name"] ?? "");
$type = trim($input["type"] ?? "order");
$titleTemplate = trim($input["title_template"] ?? "");
$messageTemplate = trim($input["message_template"] ?? "");

if ($templateId <= 0) {
    ob_end_clean();
    Response::error("Template ID is required and must be a positive integer");
}

if (empty($name)) {
    ob_end_clean();
    Response::error("Template name is required");
}

if (empty($titleTemplate)) {
    ob_end_clean();
    Response::error("Title template is required");
}

if (empty($messageTemplate)) {
    ob_end_clean();
    Response::error("Message template is required");
}

// Validate type
$allowedTypes = ["order", "system", "warning"];
if (!in_array($type, $allowedTypes)) {
    ob_end_clean();
    Response::error("Invalid type. Allowed: " . implode(", ", $allowedTypes));
}

// ==========================
// UPDATE TEMPLATE
// ==========================
try {
    // Check if template exists
    $checkTemplate = $conn->prepare("SELECT id FROM notification_templates WHERE id = ?");
    if (!$checkTemplate) {
        error_log("UPDATE TEMPLATE CHECK PREPARE ERROR: " . $conn->error);
        ob_end_clean();
        Response::serverError("Database error: " . $conn->error);
    }
    
    $checkTemplate->bind_param("i", $templateId);
    if (!$checkTemplate->execute()) {
        error_log("UPDATE TEMPLATE CHECK EXECUTE ERROR: " . $checkTemplate->error);
        $checkTemplate->close();
        ob_end_clean();
        Response::serverError("Database error: " . $checkTemplate->error);
    }
    
    $templateResult = $checkTemplate->get_result();
    $templateData = $templateResult->fetch_assoc();
    $checkTemplate->close();

    if (!$templateData) {
        ob_end_clean();
        Response::error("Template not found");
    }

    $sql = "
        UPDATE notification_templates
        SET name = ?, type = ?, title_template = ?, message_template = ?
        WHERE id = ?
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        error_log("UPDATE TEMPLATE PREPARE ERROR: " . $conn->error);
        ob_end_clean();
        Response::serverError("Database error: " . $conn->error);
    }
    
    if (!$stmt->bind_param("ssssi", $name, $type, $titleTemplate, $messageTemplate, $templateId)) {
        error_log("UPDATE TEMPLATE BIND ERROR: " . $stmt->error);
        $stmt->close();
        ob_end_clean();
        Response::serverError("Database error: " . $stmt->error);
    }

    if (!$stmt->execute()) {
        error_log("UPDATE TEMPLATE SQL ERROR: " . $stmt->error);
        $stmt->close();
        ob_end_clean();
        Response::serverError("Database error: " . $stmt->error);
    }

    $stmt->close();

    ob_end_clean(); // Clear any output before JSON
    Response::success("Cập nhật template thành công", [
        "id" => $templateId,
        "name" => $name,
        "type" => $type,
        "title_template" => $titleTemplate,
        "message_template" => $messageTemplate,
    ]);

} catch (Exception $e) {
    error_log("UPDATE TEMPLATE EXCEPTION: " . $e->getMessage());
    error_log("UPDATE TEMPLATE STACK: " . $e->getTraceAsString());
    ob_end_clean(); // Clear any output before JSON
    Response::serverError("Lỗi cập nhật template: " . $e->getMessage());
} catch (Error $e) {
    error_log("UPDATE TEMPLATE FATAL ERROR: " . $e->getMessage());
    error_log("UPDATE TEMPLATE STACK: " . $e->getTraceAsString());
    ob_end_clean(); // Clear any output before JSON
    Response::serverError("Lỗi hệ thống: " . $e->getMessage());
}

