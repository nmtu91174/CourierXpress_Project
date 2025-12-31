<?php
// backend/api/admin/get_business_logs.php
// Business Logs - Real-time warnings from database (not from log files)

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ OPTIONS phải exit sớm TRƯỚC middleware
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ==========================
// METHOD CHECK
// ==========================
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        "status"  => "error",
        "message" => "Method not allowed"
    ]);
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
require_role(["admin"]); // Chỉ admin mới xem business logs

// ==========================
// BUSINESS LOGS RULES (Real-time queries)
// ==========================
$warnings = [];

// ==========================
// RULE 1: Approved quá lâu nhưng chưa assign shipper (>30 phút)
// ==========================
$sql1 = "
    SELECT 
        o.id,
        o.order_code,
        TIMESTAMPDIFF(MINUTE, 
            COALESCE(
                (SELECT MIN(oh.created_at) 
                 FROM order_history oh 
                 WHERE oh.order_id = o.id AND oh.status_id = 2),
                o.created_at
            ),
            NOW()
        ) AS minutes_pending
    FROM orders o
    WHERE o.status = 2
    AND o.shipper_id IS NULL
    AND (
        COALESCE(
            (SELECT MIN(oh.created_at) 
             FROM order_history oh 
             WHERE oh.order_id = o.id AND oh.status_id = 2),
            o.created_at
        ) <= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    )
    ORDER BY minutes_pending DESC
    LIMIT 20
";

$result1 = $conn->query($sql1);
if ($result1) {
    while ($row = $result1->fetch_assoc()) {
        $warnings[] = [
            "level" => "warning",
            "message" => "Order #{$row['order_code']} approved for over {$row['minutes_pending']} minutes but no shipper assigned",
            "order_id" => (int)$row['id'],
            "order_code" => $row['order_code'],
            "type" => "approved_no_shipper",
            "minutes_pending" => (int)$row['minutes_pending']
        ];
    }
}

// ==========================
// RULE 2: Booked quá lâu nhưng chưa được agent xử lý (>1 giờ)
// ==========================
$sql2 = "
    SELECT 
        o.id,
        o.order_code,
        TIMESTAMPDIFF(HOUR, o.created_at, NOW()) AS hours_pending
    FROM orders o
    WHERE o.status = 1
    AND (o.agent_id IS NULL OR o.agent_id = 0)
    AND o.created_at <= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ORDER BY hours_pending DESC
    LIMIT 20
";

$result2 = $conn->query($sql2);
if ($result2) {
    while ($row = $result2->fetch_assoc()) {
        $warnings[] = [
            "level" => "warning",
            "message" => "Order #{$row['order_code']} pending agent assignment for more than {$row['hours_pending']} hour(s)",
            "order_id" => (int)$row['id'],
            "order_code" => $row['order_code'],
            "type" => "booked_no_agent",
            "hours_pending" => (int)$row['hours_pending']
        ];
    }
}

// ==========================
// RULE 3: Shipper được assign nhưng chưa pickup quá lâu (>1 giờ)
// ==========================
$sql3 = "
    SELECT 
        o.id,
        o.order_code,
        TIMESTAMPDIFF(HOUR, 
            COALESCE(
                (SELECT MIN(oh.created_at) 
                 FROM order_history oh 
                 WHERE oh.order_id = o.id AND oh.status_id = 3),
                o.created_at
            ),
            NOW()
        ) AS hours_pending
    FROM orders o
    WHERE o.status = 3
    AND o.shipper_id IS NOT NULL
    AND (
        COALESCE(
            (SELECT MIN(oh.created_at) 
             FROM order_history oh 
             WHERE oh.order_id = o.id AND oh.status_id = 3),
            o.created_at
        ) <= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    )
    ORDER BY hours_pending DESC
    LIMIT 20
";

$result3 = $conn->query($sql3);
if ($result3) {
    while ($row = $result3->fetch_assoc()) {
        $warnings[] = [
            "level" => "warning",
            "message" => "Order #{$row['order_code']} assigned to shipper but pickup delayed for {$row['hours_pending']} hour(s)",
            "order_id" => (int)$row['id'],
            "order_code" => $row['order_code'],
            "type" => "assigned_not_picked",
            "hours_pending" => (int)$row['hours_pending']
        ];
    }
}

// ==========================
// RULE 4: Shipper quá tải (>10 active orders)
// ==========================
$sql4 = "
    SELECT 
        u.id AS shipper_id,
        u.name AS shipper_name,
        COUNT(DISTINCT o.id) AS active_orders_count
    FROM users u
    INNER JOIN orders o ON u.id = o.shipper_id
    WHERE u.role = 'shipper'
    AND o.status IN (3, 4) -- assigned, picked_up
    GROUP BY u.id, u.name
    HAVING active_orders_count > 10
    ORDER BY active_orders_count DESC
    LIMIT 10
";

$result4 = $conn->query($sql4);
if ($result4) {
    while ($row = $result4->fetch_assoc()) {
        $warnings[] = [
            "level" => "warning",
            "message" => "Shipper {$row['shipper_name']} currently handling {$row['active_orders_count']} active orders",
            "shipper_id" => (int)$row['shipper_id'],
            "shipper_name" => $row['shipper_name'],
            "type" => "shipper_overloaded",
            "active_orders_count" => (int)$row['active_orders_count']
        ];
    }
}

// ==========================
// RULE 5: COD cao bất thường (>50,000,000)
// ==========================
$sql5 = "
    SELECT 
        o.id,
        o.order_code,
        o.cod_amount
    FROM orders o
    WHERE o.cod_amount > 50000000
    AND o.status NOT IN (5, 6, 7) -- Not delivered, failed, cancelled
    ORDER BY o.cod_amount DESC
    LIMIT 20
";

$result5 = $conn->query($sql5);
if ($result5) {
    while ($row = $result5->fetch_assoc()) {
        $codFormatted = number_format($row['cod_amount'], 0, ',', '.');
        $warnings[] = [
            "level" => "warning",
            "message" => "High COD order detected: #{$row['order_code']} (COD {$codFormatted}₫)",
            "order_id" => (int)$row['id'],
            "order_code" => $row['order_code'],
            "type" => "high_cod",
            "cod_amount" => (float)$row['cod_amount']
        ];
    }
}

// ==========================
// SORT BY PRIORITY (newest first, then by type priority)
// ==========================
usort($warnings, function($a, $b) {
    // Priority order: approved_no_shipper > booked_no_agent > assigned_not_picked > shipper_overloaded > high_cod
    $priority = [
        "approved_no_shipper" => 1,
        "booked_no_agent" => 2,
        "assigned_not_picked" => 3,
        "shipper_overloaded" => 4,
        "high_cod" => 5
    ];
    
    $priorityA = $priority[$a['type']] ?? 99;
    $priorityB = $priority[$b['type']] ?? 99;
    
    if ($priorityA !== $priorityB) {
        return $priorityA - $priorityB;
    }
    
    // Same priority: sort by order_id descending (newer first)
    return ($b['order_id'] ?? 0) - ($a['order_id'] ?? 0);
});

// ==========================
// PAGINATION
// ==========================
$page = isset($_GET["page"]) ? (int)$_GET["page"] : 1;
$page = max(1, $page);

$pageSize = isset($_GET["page_size"]) ? (int)$_GET["page_size"] : 10;
$pageSize = min(100, max(1, $pageSize));

$totalWarnings = count($warnings);
$totalPages = $totalWarnings > 0 ? ceil($totalWarnings / $pageSize) : 0;

$offset = ($page - 1) * $pageSize;
$paginatedWarnings = array_slice($warnings, $offset, $pageSize);

// ==========================
// RESPONSE
// ==========================
Response::success("Business logs loaded", [
    "warnings" => $paginatedWarnings,
    "pagination" => [
        "page" => $page,
        "page_size" => $pageSize,
        "total_count" => $totalWarnings,
        "total_pages" => $totalPages,
        "has_next" => $page < $totalPages,
        "has_prev" => $page > 1
    ]
]);

$conn->close();

