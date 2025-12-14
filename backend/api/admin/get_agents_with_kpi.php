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
$sql = "
    SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.status,
        u.created_at,
        
        COUNT(DISTINCT o.id) AS total_orders,
        
        SUM(CASE WHEN o.status IN (1,2,3,4) THEN 1 ELSE 0 END) AS active_orders,
        SUM(CASE WHEN o.status = 5 THEN 1 ELSE 0 END) AS completed_orders,
        SUM(CASE WHEN o.status = 6 THEN 1 ELSE 0 END) AS failed_orders,
        
        COALESCE(SUM(CASE WHEN oa.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_approvals
        
    FROM users u
    LEFT JOIN orders o ON o.agent_id = u.id
    LEFT JOIN order_approvals oa ON oa.agent_id = u.id
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

// Build HAVING clause for workload and approval filters
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

if ($approvalFilter && $approvalFilter !== "all") {
    if ($approvalFilter === "has_pending") {
        $havingConditions[] = "pending_approvals > 0";
    } elseif ($approvalFilter === "no_pending") {
        $havingConditions[] = "pending_approvals = 0";
    }
}

if (!empty($havingConditions)) {
    $sql .= " HAVING " . implode(" AND ", $havingConditions);
}

$sql .= " ORDER BY active_orders DESC, total_orders DESC";

// Execute query
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
        "pending_approvals" => (int)$row["pending_approvals"],
    ];
}

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Danh sách agents với KPI", $agents);

