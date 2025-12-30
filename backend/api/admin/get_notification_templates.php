<?php
// backend/api/admin/get_notification_templates.php
// Admin - Get all notification templates

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
// GET ALL TEMPLATES
// ==========================
$sql = "
    SELECT 
        id,
        name,
        type,
        title_template,
        message_template,
        created_at
    FROM notification_templates
    ORDER BY created_at DESC
";

$result = $conn->query($sql);

if (!$result) {
    Response::serverError("Lỗi truy vấn database: " . $conn->error);
}

$templates = [];
while ($row = $result->fetch_assoc()) {
    $templates[] = [
        "id" => (int)$row["id"],
        "name" => $row["name"],
        "type" => $row["type"],
        "title_template" => $row["title_template"],
        "message_template" => $row["message_template"],
        "created_at" => $row["created_at"],
    ];
}

Response::success("Lấy danh sách template thành công", [
    "templates" => $templates,
    "total" => count($templates),
]);

