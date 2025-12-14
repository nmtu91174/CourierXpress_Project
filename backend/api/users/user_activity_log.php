<?php
// backend/api/users/user_activity_log.php

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ OPTIONS phải exit sớm TRƯỚC middleware
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";

require_login();
require_role(["admin"]);

$logFile = __DIR__ . "/../../logs/audit.log";

if (!file_exists($logFile)) {
    Response::success("Chưa có log", []);
}

$lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

// Lấy 100 dòng cuối
$logs = array_slice(array_reverse($lines), 0, 100);

Response::success("Lấy log thành công", $logs);
