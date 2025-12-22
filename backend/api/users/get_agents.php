<?php
// backend/api/users/get_agents.php

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
require_role(["admin", "agent"]); // Agent cần xem danh sách agents để filter orders trong team scope

// ==========================
// QUERY - Include active_orders_count
// ==========================
$stmt = $conn->prepare("
    SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.status,
        COUNT(DISTINCT CASE WHEN o.status IN (1, 2, 3, 4) THEN o.id ELSE NULL END) AS active_orders_count
    FROM users u
    LEFT JOIN orders o ON o.agent_id = u.id
    WHERE u.role = 'agent'
    GROUP BY u.id, u.name, u.email, u.phone, u.status
    ORDER BY u.name ASC
");

$stmt->execute();
$result = $stmt->get_result();

$agents = [];
while ($row = $result->fetch_assoc()) {
    $row["id"] = (int)$row["id"];
    $row["active_orders_count"] = (int)$row["active_orders_count"];
    $agents[] = $row;
}

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Danh sách agent đang hoạt động", $agents);
