<?php
// backend/api/admin/get_agent_stats.php
// API endpoint để lấy KPI statistics cho agents

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

// ==========================
// QUERY AGENT STATS
// ==========================
$stmt = $conn->prepare("
    SELECT 
        COUNT(*) AS total_agents,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_agents,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_agents,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_agents
    FROM users
    WHERE role = 'agent'
");

$stmt->execute();
$result = $stmt->get_result();
$stats = $result->fetch_assoc();

$response = [
    "total_agents" => (int)$stats["total_agents"],
    "active_agents" => (int)$stats["active_agents"],
    "pending_agents" => (int)$stats["pending_agents"],
    "inactive_agents" => (int)$stats["inactive_agents"],
];

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Agent statistics", $response);

