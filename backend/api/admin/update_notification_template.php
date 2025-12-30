<?php
// backend/api/admin/update_notification_template.php
// Admin - Update notification template

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
// AUTH - Admin only
// ==========================
require_login();
require_role(["admin"]);

$userId = (int)$GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// VALIDATE INPUT
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    Response::error("Method not allowed. Use POST.");
}

$input = json_decode(file_get_contents("php://input"), true);
$templateId = (int)($input["id"] ?? 0);
$name = trim($input["name"] ?? "");
$type = trim($input["type"] ?? "order");
$titleTemplate = trim($input["title_template"] ?? "");
$messageTemplate = trim($input["message_template"] ?? "");

if ($templateId <= 0) {
    Response::error("Template ID is required and must be a positive integer");
}

if (empty($name)) {
    Response::error("Template name is required");
}

if (empty($titleTemplate)) {
    Response::error("Title template is required");
}

if (empty($messageTemplate)) {
    Response::error("Message template is required");
}

// Validate type
$allowedTypes = ["order", "system", "warning"];
if (!in_array($type, $allowedTypes)) {
    Response::error("Invalid type. Allowed: " . implode(", ", $allowedTypes));
}

// ==========================
// UPDATE TEMPLATE
// ==========================
try {
    // Check if template exists
    $checkTemplate = $conn->prepare("SELECT id FROM notification_templates WHERE id = ?");
    $checkTemplate->bind_param("i", $templateId);
    $checkTemplate->execute();
    $templateResult = $checkTemplate->get_result();
    $templateData = $checkTemplate->fetch_assoc();
    $checkTemplate->close();

    if (!$templateData) {
        Response::error("Template not found");
    }

    $sql = "
        UPDATE notification_templates
        SET name = ?, type = ?, title_template = ?, message_template = ?
        WHERE id = ?
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssssi", $name, $type, $titleTemplate, $messageTemplate, $templateId);

    if (!$stmt->execute()) {
        throw new Exception("Failed to update template: " . $conn->error);
    }

    $stmt->close();

    Response::success("Cập nhật template thành công", [
        "id" => $templateId,
        "name" => $name,
        "type" => $type,
        "title_template" => $titleTemplate,
        "message_template" => $messageTemplate,
    ]);

} catch (Exception $e) {
    error_log("UPDATE TEMPLATE ERROR: " . $e->getMessage());
    Response::serverError($e->getMessage());
}

