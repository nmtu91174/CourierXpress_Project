<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ FIX 1: Cho OPTIONS thoát sớm TRƯỚC middleware
// Frontend React luôn gửi OPTIONS trước, middleware không được chặn
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
// AUTH - Sử dụng middleware
// ==========================
// Middleware sẽ tự start session và kiểm tra authentication
// Nếu không có session, middleware sẽ trả về 401 và exit
require_login();
require_role(["admin", "agent", "shipper", "customer"]);

// ⭐ QUY TẮC VÀNG: Middleware là single source of truth
// Không cần check $_SESSION hay fallback - middleware đã xử lý rồi
$userId = (int)$GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];


// ==========================
// PAGINATION
// ==========================
$page  = max(1, (int)($_GET["page"]  ?? 1));
$limit = min(100, max(1, (int)($_GET["limit"] ?? 10)));
$offset = ($page - 1) * $limit;

// ==========================
// BASE SQL (Enterprise - Join invoices)
// Note: For list query, we use full JOIN in $sqlList
// For count, we only need orders table
// ==========================
$baseSql = "
    FROM orders o
";

// ==========================
// ROLE FILTER (RBAC-aware)
// ==========================
$where   = [];
$params = [];
$types  = "";

switch ($role) {
    case "admin":
        // Admin thấy tất cả
        break;

    case "agent":
        // Agent có thể xem orders trong team scope (đơn của mình, đơn chưa có agent, đơn của agent khác để điều phối)
        // Nếu có filter agent_id cụ thể, dùng filter đó
        // Nếu không, agent thấy tất cả để điều phối (backend sẽ check quyền action khi thao tác)
        $agentFilter = $_GET["agent_id"] ?? null;
        if ($agentFilter && $agentFilter !== "all") {
            // Filter cụ thể theo agent_id từ frontend
            $where[] = "o.agent_id = ?";
            $params[] = (int)$agentFilter;
            $types   .= "i";
        }
        // Nếu không có filter agent_id, agent thấy tất cả orders (team scope) - không thêm WHERE clause
        break;

    case "shipper":
        $where[] = "o.shipper_id = ?";
        $params[] = $userId;
        $types   .= "i";
        break;

    case "customer":
        $where[] = "o.customer_id = ?";
        $params[] = $userId;
        $types   .= "i";
        break;
}

// ==========================
// ENTERPRISE FILTERS
// ==========================

// 1. Status Group Filter
$statusGroup = $_GET["status_group"] ?? null;
if ($statusGroup && $statusGroup !== "all") {
    $statusGroups = [
        "pending" => [1],
        "approved" => [2],
        "handling" => [3, 4],
        "completed" => [5],
        "exception" => [6, 7],
    ];
    
    if (isset($statusGroups[$statusGroup])) {
        $statusList = $statusGroups[$statusGroup];
        $placeholders = implode(",", array_fill(0, count($statusList), "?"));
        $where[] = "o.status IN ($placeholders)";
        foreach ($statusList as $s) {
            $params[] = $s;
            $types .= "i";
        }
    }
}

// 2. Specific Status Filter
$status = $_GET["status"] ?? null;
if ($status && $status !== "all") {
    $where[] = "o.status = ?";
    $params[] = (int)$status;
    $types .= "i";
}

// 3. Agent Filter
$agentId = $_GET["agent_id"] ?? null;
if ($agentId && $agentId !== "all") {
    $where[] = "o.agent_id = ?";
    $params[] = (int)$agentId;
    $types .= "i";
}

// 4. Shipper Filter
$shipperId = $_GET["shipper_id"] ?? null;
if ($shipperId && $shipperId !== "all") {
    $where[] = "o.shipper_id = ?";
    $params[] = (int)$shipperId;
    $types .= "i";
}

// 5. Payment Method Filter
$paymentMethod = $_GET["payment_method_id"] ?? null;
if ($paymentMethod && $paymentMethod !== "all") {
    $where[] = "o.payment_method_id = ?";
    $params[] = (int)$paymentMethod;
    $types .= "i";
}

// 6. Payment Status Filter (Finance)
$paymentStatus = $_GET["payment_status"] ?? null;
if ($paymentStatus && $paymentStatus !== "all") {
    $where[] = "inv.status = ?";
    $params[] = $paymentStatus;
    $types .= "s";
}

// 7. COD Filter
$codFilter = $_GET["cod"] ?? null;
if ($codFilter === "has_cod") {
    $where[] = "o.cod_amount > 0";
} elseif ($codFilter === "no_cod") {
    $where[] = "(o.cod_amount IS NULL OR o.cod_amount = 0)";
}

// 8. Workflow Filters
$noAgent = isset($_GET["no_agent"]) && $_GET["no_agent"] === "1";
if ($noAgent) {
    $where[] = "(o.agent_id IS NULL OR o.agent_id = 0)";
}

$noShipper = isset($_GET["no_shipper"]) && $_GET["no_shipper"] === "1";
if ($noShipper) {
    $where[] = "(o.shipper_id IS NULL OR o.shipper_id = 0)";
}

$assignedNotPicked = isset($_GET["assigned_not_picked"]) && $_GET["assigned_not_picked"] === "1";
if ($assignedNotPicked) {
    $where[] = "o.status = 3"; // ASSIGNED
}

// 9. Date Range Filter
$dateFrom = $_GET["date_from"] ?? null;
if ($dateFrom) {
    $where[] = "DATE(o.created_at) >= ?";
    $params[] = $dateFrom;
    $types .= "s";
}

$dateTo = $_GET["date_to"] ?? null;
if ($dateTo) {
    $where[] = "DATE(o.created_at) <= ?";
    $params[] = $dateTo;
    $types .= "s";
}

// 10. Advanced Search (Enterprise)
$search = $_GET["search"] ?? null;
if ($search && trim($search) !== "") {
    $searchTerm = "%" . trim($search) . "%";
    $where[] = "(
        o.order_code LIKE ? 
        OR o.sender_phone LIKE ? 
        OR o.receiver_phone LIKE ?
        OR inv.invoice_number LIKE ?
    )";
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $types .= "ssss";
}

// Build WHERE clause
$whereClause = "";
if (!empty($where)) {
    $whereClause = " WHERE " . implode(" AND ", $where);
}

// ==========================
// COUNT
// ==========================
$sqlCount = "SELECT COUNT(*) AS total " . $baseSql . $whereClause;
$stmtCount = $conn->prepare($sqlCount);
if (!$stmtCount) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi truy vấn database");
}
if ($params && !empty($types)) {
    $stmtCount->bind_param($types, ...$params);
}
$stmtCount->execute();
$resultCount = $stmtCount->get_result();
if (!$resultCount) {
    error_log("Execute failed: " . $stmtCount->error);
    Response::serverError("Lỗi thực thi truy vấn");
}
$total = (int)$resultCount->fetch_assoc()["total"];
$stmtCount->close();

// ==========================
// LIST (Enterprise - Include invoice info + JOIN names)
// ==========================
$sqlList = "
    SELECT 
        o.id,
        o.order_code,
        o.sender_name,
        o.sender_phone,
        o.sender_address,
        o.receiver_name,
        o.receiver_phone,
        o.receiver_address,
        o.status,
        o.created_at,
        o.customer_id,
        o.agent_id,
        o.shipper_id,
        o.cod_amount,
        o.total_shipping_fee,
        o.notes,
        o.payment_method_id,
        o.previous_status,
        o.cancelled_at,
        o.cancelled_by,
        o.weight,
        o.service_type,
        inv.invoice_number,
        inv.status AS invoice_status,
        pm.name AS payment_method_name,
        pm.code AS payment_method_code,
        u_agent.name AS agent_name,
        u_shipper.name AS shipper_name,
        st.name AS service_type_name
    FROM orders o
    LEFT JOIN invoices inv ON o.id = inv.order_id
    LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
    LEFT JOIN users u_agent ON o.agent_id = u_agent.id
    LEFT JOIN users u_shipper ON o.shipper_id = u_shipper.id
    LEFT JOIN service_types st ON o.service_type = st.id
    " . $whereClause . "
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
";

$paramsList = $params;
$typesList  = $types . "ii";
$paramsList[] = $limit;
$paramsList[] = $offset;

$stmt = $conn->prepare($sqlList);
if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi truy vấn database");
}
$stmt->bind_param($typesList, ...$paramsList);
if (!$stmt->execute()) {
    error_log("Execute failed: " . $stmt->error);
    Response::serverError("Lỗi thực thi truy vấn");
}

$data = [];
$res = $stmt->get_result();
if ($res) {
while ($row = $res->fetch_assoc()) {
    $row["status"] = (int)$row["status"];
    if (isset($row["weight"])) {
        $row["weight"] = (int)$row["weight"]; // Ensure weight is integer (grams)
    }
    
    // ==========================
    // CALCULATE PERMISSION FLAGS (Enterprise - State-driven actions)
    // ==========================
    $currentStatus = (int)$row["status"];
    $previousStatus = isset($row["previous_status"]) ? (int)$row["previous_status"] : null;
    $hasAgent = !empty($row["agent_id"]) && (int)$row["agent_id"] > 0;
    $hasShipper = !empty($row["shipper_id"]) && (int)$row["shipper_id"] > 0;
    
    // Check if order has been picked up: status >= 4 means already picked up
    $hasBeenPickedUp = $currentStatus >= 4;
    
    // Enterprise Action Matrix (State-driven)
    $permissions = [
        "can_assign_agent" => false,
        "can_assign_shipper" => false,
        "can_reassign_shipper" => false,
        "can_edit" => false,
        "can_cancel" => false,
        "can_terminate_workflow" => false, // NEW: Workflow Termination (from ASSIGNED onward)
        "can_reopen" => false,
        "can_clone" => false,
        "can_create_followup" => false,
    ];
    
    // BOOKED (1): Can assign agent, cannot assign shipper
    if ($currentStatus === 1) {
        $permissions["can_assign_agent"] = !$hasAgent;
        $permissions["can_edit"] = true;
        $permissions["can_cancel"] = true;
    }
    
    // APPROVED (2): Can assign agent and shipper (if not picked up)
    if ($currentStatus === 2) {
        if (!$hasBeenPickedUp) {
            $permissions["can_assign_agent"] = !$hasAgent;
            $permissions["can_assign_shipper"] = !$hasShipper;
        }
        $permissions["can_edit"] = true;
        $permissions["can_cancel"] = true;
    }
    
    // ASSIGNED (3): Can reassign shipper only if not picked up
    // IMPORTANT: Do NOT set can_assign_shipper for ASSIGNED status
    // can_assign_shipper is ONLY for APPROVED (2) status
    if ($currentStatus === 3) {
        if (!$hasBeenPickedUp) {
            $permissions["can_reassign_shipper"] = true; // Separate action from can_assign_shipper
        }
        // Do NOT set can_assign_shipper = true here (that's only for APPROVED)
        $permissions["can_edit"] = true;
        // Enterprise: Cannot cancel ASSIGNED orders (only BOOKED/APPROVED)
        $permissions["can_cancel"] = false;
        // Enterprise: Can terminate workflow (internal close) from ASSIGNED onward
        $permissions["can_terminate_workflow"] = true;
    }
    
    // IN_PROGRESS (4): No assign actions allowed, but can terminate workflow
    if ($currentStatus === 4) {
        $permissions["can_edit"] = false;
        $permissions["can_cancel"] = false;
        // Enterprise: Can terminate workflow (internal close) from ASSIGNED onward
        $permissions["can_terminate_workflow"] = true;
    }
    
    // DELIVERED (5) / FAILED (6): No actions allowed
    if ($currentStatus === 5 || $currentStatus === 6) {
        $permissions["can_edit"] = false;
        $permissions["can_cancel"] = false;
    }
    
    // CANCELLED (7): Action depends on previous_status
    if ($currentStatus === 7) {
        // Reopen: Only if cancelled at BOOKED/APPROVED (previous_status < ASSIGNED = 3)
        // Enterprise Rule: Reopen only before assignment
        if ($previousStatus !== null && $previousStatus < 3) {
            $permissions["can_reopen"] = true;
        }
        // Clone: Only if cancelled at ASSIGNED (previous_status = ASSIGNED = 3) and NOT picked up
        // Enterprise Rule: Clone only when assigned but not yet picked up
        if ($previousStatus !== null && $previousStatus === 3) {
            $permissions["can_clone"] = true;
        }
        // Follow-up: Only if cancelled AFTER pickup (previous_status >= IN_PROGRESS = 4)
        // Enterprise Rule: Follow-up only after real-world operation occurred
        if ($previousStatus !== null && $previousStatus >= 4) {
            $permissions["can_create_followup"] = true;
        }
    }
    
    // FAILED (6): Only follow-up allowed (no reopen, no clone)
    // Enterprise Rule: Failed = operational failure, must continue via follow-up
    if ($currentStatus === 6) {
        // Follow-up: Only if failed after pickup (check from order_history or assume IN_PROGRESS+)
        // Since FAILED typically occurs after pickup, allow follow-up
        $permissions["can_create_followup"] = true;
    }
    
    $row["permissions"] = $permissions; // Add permission flags
    $data[] = $row;
    }
}

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Danh sách đơn hàng", [
    "items" => $data,
    "pagination" => [
        "page"        => $page,
        "limit"       => $limit,
        "total"       => $total,
        "total_pages" => ceil($total / $limit)
    ]
]);
