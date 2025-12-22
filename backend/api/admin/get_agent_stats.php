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
// Enterprise KPI Mapping:
// - Total Agents: Tổng số agents
// - Active Agents: users.status = 'active'
// - Total Pending Approvals: Tổng số order_approvals.status = 'pending' (workload chờ agent duyệt)
// - Inactive Agents: users.status = 'inactive'
// 
// NOTE: Không có "pending_agents" vì users.status chỉ có 'active'/'inactive'
// Thay vào đó, dùng "total_pending_approvals" để phản ánh workload thực tế
// FIX: Tách query để tránh duplicate khi LEFT JOIN order_approvals
// Query 1: Count agents (không join order_approvals)
$stmt = $conn->prepare("
    SELECT 
        COUNT(*) AS total_agents,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_agents,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_agents
    FROM users
    WHERE role = 'agent'
");

$stmt->execute();
$result = $stmt->get_result();
$stats = $result->fetch_assoc();
$stmt->close();

// Query 2: Count pending approvals (riêng biệt để tránh duplicate)
$stmt2 = $conn->prepare("
    SELECT COUNT(*) AS total_pending_approvals
    FROM order_approvals
    WHERE status = 'pending'
");

$stmt2->execute();
$result2 = $stmt2->get_result();
$approvalStats = $result2->fetch_assoc();
$stmt2->close();

$response = [
    "total_agents" => (int)$stats["total_agents"],
    "active_agents" => (int)$stats["active_agents"],
    "total_pending_approvals" => (int)$approvalStats["total_pending_approvals"],
    "inactive_agents" => (int)$stats["inactive_agents"],
];

$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Agent statistics", $response);

