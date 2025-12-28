<?php
// backend/api/agent/get_coverage.php
// Get agent coverage areas (districts) - READ ONLY

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";

// ==========================
// AUTH
// ==========================
require_login();
require_role(["agent", "admin"]); // Agent xem coverage của mình, Admin có thể xem của agent khác

$currentUserId = (int)$GLOBALS['auth_user']['id'];
$currentUserRole = (string)$GLOBALS['auth_user']['role'];

// ==========================
// GET AGENT ID
// ==========================
// If admin, can query specific agent_id (optional)
// If agent, use current user id
$agentId = $currentUserId;
if ($currentUserRole === "admin" && isset($_GET["agent_id"]) && (int)$_GET["agent_id"] > 0) {
    $agentId = (int)$_GET["agent_id"];
} elseif ($currentUserRole === "agent") {
    // Agent can only see their own coverage
    $agentId = $currentUserId;
}

// ==========================
// QUERY COVERAGE AREAS
// ==========================
$stmt = $conn->prepare("
    SELECT 
        aa.id,
        aa.district_id,
        aa.ward_id,
        aa.priority,
        aa.active,
        d.name AS district_name,
        w.name AS ward_name
    FROM agent_areas aa
    INNER JOIN districts d ON aa.district_id = d.id
    LEFT JOIN wards w ON aa.ward_id = w.id
    WHERE aa.agent_id = ? AND aa.active = 1
    ORDER BY aa.priority ASC, d.name ASC
");

$stmt->bind_param("i", $agentId);
$stmt->execute();
$result = $stmt->get_result();

$areas = [];
while ($row = $result->fetch_assoc()) {
    $areas[] = [
        "id" => (int)$row["id"],
        "district_id" => (int)$row["district_id"],
        "district_name" => $row["district_name"],
        "ward_id" => $row["ward_id"] ? (int)$row["ward_id"] : null,
        "ward_name" => $row["ward_name"] ? $row["ward_name"] : null,
        "priority" => (int)$row["priority"],
        "active" => (bool)$row["active"]
    ];
}

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Agent coverage areas", [
    "agent_id" => $agentId,
    "areas" => $areas,
    "total_districts" => count($areas)
]);

