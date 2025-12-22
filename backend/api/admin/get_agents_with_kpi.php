<?php
// backend/api/admin/get_agents_with_kpi.php
// API endpoint để lấy danh sách agents với KPI statistics (Enterprise)

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
// FILTERS
// ==========================
$statusFilter = $_GET["status"] ?? null; // 'active', 'inactive', 'all'
$workloadFilter = $_GET["workload"] ?? null; // 'has_active', 'no_orders', 'overloaded', 'all'
$approvalFilter = $_GET["approval"] ?? null; // 'has_pending', 'no_pending', 'all'
$search = $_GET["search"] ?? null;

// ==========================
// QUERY AGENTS WITH KPI
// ==========================
// FIX: Tách query để tránh duplicate khi LEFT JOIN order_approvals
// Query chính: Orders stats (không join order_approvals để tránh duplicate)
$sql = "
    SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.status,
        u.created_at,
        
        COUNT(DISTINCT o.id) AS total_orders,
        
        COUNT(DISTINCT CASE WHEN o.status IN (3,4) THEN o.id ELSE NULL END) AS active_orders, -- In Progress: ASSIGNED (3) and PICKED (4)
        COUNT(DISTINCT CASE WHEN o.status = 5 THEN o.id ELSE NULL END) AS completed_orders, -- DELIVERED (5)
        COUNT(DISTINCT CASE WHEN o.status = 6 THEN o.id ELSE NULL END) AS failed_orders -- FAILED (6)
        
    FROM users u
    LEFT JOIN orders o ON o.agent_id = u.id
    WHERE u.role = 'agent'
";

$params = [];
$types = "";

// Apply filters
if ($statusFilter && $statusFilter !== "all") {
    $sql .= " AND u.status = ?";
    $params[] = $statusFilter;
    $types .= "s";
}

if ($search && trim($search) !== "") {
    $searchTerm = "%" . trim($search) . "%";
    $sql .= " AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $types .= "sss";
}

$sql .= " GROUP BY u.id";

// Build HAVING clause for workload filters (pending_approvals sẽ được thêm sau)
$havingConditions = [];

if ($workloadFilter && $workloadFilter !== "all") {
    switch ($workloadFilter) {
        case "has_active":
            $havingConditions[] = "active_orders > 0";
            break;
        case "no_orders":
            $havingConditions[] = "total_orders = 0";
            break;
        case "overloaded":
            $havingConditions[] = "active_orders >= 5"; // Threshold: 5 active orders
            break;
    }
}

if (!empty($havingConditions)) {
    $sql .= " HAVING " . implode(" AND ", $havingConditions);
}

$sql .= " ORDER BY active_orders DESC, total_orders DESC";

// Execute main query
$stmt = $conn->prepare($sql);
if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi truy vấn database");
}

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

if (!$stmt->execute()) {
    error_log("Execute failed: " . $stmt->error);
    Response::serverError("Lỗi thực thi truy vấn");
}

$result = $stmt->get_result();
$agents = [];

// Fetch agents with order stats
while ($row = $result->fetch_assoc()) {
    $agents[] = [
        "id" => (int)$row["id"],
        "name" => $row["name"],
        "email" => $row["email"],
        "phone" => $row["phone"] ?? "",
        "status" => $row["status"],
        "created_at" => $row["created_at"],
        "total_orders" => (int)$row["total_orders"],
        "active_orders" => (int)$row["active_orders"],
        "completed_orders" => (int)$row["completed_orders"],
        "failed_orders" => (int)$row["failed_orders"],
        "pending_approvals" => 0, // Will be filled in next query
    ];
}

$stmt->close();

// Query 2: Get pending_approvals for each agent (separate to avoid duplicate)
$pendingApprovalsMap = [];
if (!empty($agents)) {
    $agentIds = array_map(function($a) { return $a["id"]; }, $agents);
    $placeholders = implode(",", array_fill(0, count($agentIds), "?"));
    
    $sqlPending = "
        SELECT 
            agent_id,
            COUNT(*) AS pending_count
        FROM order_approvals
        WHERE agent_id IN ($placeholders) AND status = 'pending'
        GROUP BY agent_id
    ";
    
    $stmtPending = $conn->prepare($sqlPending);
    if ($stmtPending) {
        $typesPending = str_repeat("i", count($agentIds));
        $stmtPending->bind_param($typesPending, ...$agentIds);
        
        if ($stmtPending->execute()) {
            $resultPending = $stmtPending->get_result();
            while ($rowPending = $resultPending->fetch_assoc()) {
                $pendingApprovalsMap[(int)$rowPending["agent_id"]] = (int)$rowPending["pending_count"];
            }
        }
        $stmtPending->close();
    }
}

// Update pending_approvals for each agent
foreach ($agents as &$agent) {
    $agent["pending_approvals"] = $pendingApprovalsMap[$agent["id"]] ?? 0;
}

// Apply approval filter if needed
if ($approvalFilter && $approvalFilter !== "all") {
    $agents = array_filter($agents, function($agent) use ($approvalFilter) {
        if ($approvalFilter === "has_pending") {
            return $agent["pending_approvals"] > 0;
        } elseif ($approvalFilter === "no_pending") {
            return $agent["pending_approvals"] === 0;
        }
        return true;
    });
    $agents = array_values($agents); // Re-index array
}
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Danh sách agents với KPI", $agents);

