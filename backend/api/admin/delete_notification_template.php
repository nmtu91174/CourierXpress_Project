<?php
// backend/api/admin/delete_notification_template.php
// Admin - Delete notification template

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

if ($templateId <= 0) {
    Response::error("Template ID is required and must be a positive integer");
}

// ==========================
// DELETE TEMPLATE
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

    $sql = "DELETE FROM notification_templates WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $templateId);

    if (!$stmt->execute()) {
        throw new Exception("Failed to delete template: " . $conn->error);
    }

    $stmt->close();

    Response::success("Xóa template thành công");

} catch (Exception $e) {
    error_log("DELETE TEMPLATE ERROR: " . $e->getMessage());
    Response::serverError($e->getMessage());
}

