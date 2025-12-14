<?php
// backend/api/admin/view_logs.php
// XEM LOGS – Chỉ admin

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
require_role(["admin"]); // Chỉ admin được xem logs

// ==========================
// READ LOGS
// ==========================
$logType = $_GET["type"] ?? "app"; // app, audit, error
$lines = (int)($_GET["lines"] ?? 100); // Số dòng cuối cùng
$lines = min(1000, max(1, $lines)); // Giới hạn 1-1000 dòng

$logFiles = [
    "app" => __DIR__ . "/../../logs/app.log",
    "audit" => __DIR__ . "/../../logs/audit.log",
    "error" => ini_get("error_log") ?: __DIR__ . "/../../logs/php_error.log"
];

$logFile = $logFiles[$logType] ?? $logFiles["app"];

if (!file_exists($logFile)) {
    Response::error("Log file không tồn tại: {$logType}");
}

// Đọc n dòng cuối cùng
$content = file_get_contents($logFile);
$allLines = explode("\n", $content);
$recentLines = array_slice($allLines, -$lines);
$recentContent = implode("\n", $recentLines);

Response::success("Logs loaded", [
    "type" => $logType,
    "file" => basename($logFile),
    "total_lines" => count($allLines),
    "showing_lines" => count($recentLines),
    "content" => $recentContent
]);






