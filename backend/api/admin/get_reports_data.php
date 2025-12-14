<?php
// backend/api/admin/get_reports_data.php
// API endpoint để lấy dữ liệu reports từ database

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
// GET PARAMETERS
// ==========================
$period = $_GET["period"] ?? "7d"; // 7d, 30d, 12m
$view = $_GET["view"] ?? "overall"; // overall, service, payment, workflow
$service = $_GET["service"] ?? "all";
$payment = $_GET["payment"] ?? "all";
$status = $_GET["status"] ?? "all";

// ==========================
// BUILD DATE RANGE
// ==========================
$dateCondition = "";
$dateFormat = "";

switch ($period) {
    case "7d":
        $dateCondition = "DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        $dateFormat = "%Y-%m-%d";
        break;
    case "30d":
        $dateCondition = "DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        $dateFormat = "%Y-%m-%d";
        break;
    case "12m":
        $dateCondition = "DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)";
        $dateFormat = "%Y-%m";
        break;
    default:
        $dateCondition = "DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        $dateFormat = "%Y-%m-%d";
}

// ==========================
// BUILD WHERE CONDITIONS
// ==========================
$whereConditions = [$dateCondition];

if ($view === "service" && $service !== "all") {
    $serviceMap = ["standard" => 1, "express" => 2, "sameday" => 3];
    if (isset($serviceMap[$service])) {
        $whereConditions[] = "o.service_type = " . (int)$serviceMap[$service];
    }
}

if ($view === "payment" && $payment !== "all") {
    $paymentMap = ["cash" => 1, "banking" => 2, "wallet" => 3];
    if (isset($paymentMap[$payment])) {
        $whereConditions[] = "o.payment_method_id = " . (int)$paymentMap[$payment];
    }
}

if ($view === "workflow" && $status !== "all") {
    $statusMap = [
        "BOOKED" => 1,
        "APPROVED" => 2,
        "ASSIGNED" => 3,
        "IN_PROGRESS" => 4,
        "DELIVERED" => 5,
        "FAILED" => 6,
    ];
    if (isset($statusMap[$status])) {
        $whereConditions[] = "o.status = " . (int)$statusMap[$status];
    }
}

$whereClause = "WHERE " . implode(" AND ", $whereConditions);

// ==========================
// KPI STATS
// ==========================
$kpiSql = "
    SELECT 
        COUNT(*) AS total_orders,
        SUM(CASE WHEN o.status = 5 THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN o.status = 6 THEN 1 ELSE 0 END) AS failed,
        COALESCE(SUM(o.total_shipping_fee), 0) AS total_revenue
    FROM orders o
    $whereClause
";

$kpiResult = $conn->query($kpiSql);
$kpiData = $kpiResult->fetch_assoc();

$totalOrders = (int)$kpiData["total_orders"];
$delivered = (int)$kpiData["delivered"];
$failed = (int)$kpiData["failed"];
$totalRevenue = (float)$kpiData["total_revenue"];

// Tỷ lệ giao thành công: tính trên những đơn Delivered
$deliveredRate = $totalOrders > 0 ? round(($delivered / $totalOrders) * 100) : 0;
// Tỷ lệ thất bại: tính trên đơn Failed
$cancelRate = $totalOrders > 0 ? round(($failed / $totalOrders) * 100) : 0;

// ==========================
// ORDERS BY STATUS OVER TIME
// ==========================
$statusTimeSql = "
    SELECT 
        DATE_FORMAT(o.created_at, '$dateFormat') AS date_bucket,
        o.status,
        COUNT(*) AS count
    FROM orders o
    $whereClause
    GROUP BY date_bucket, o.status
    ORDER BY date_bucket ASC, o.status ASC
";

$statusTimeResult = $conn->query($statusTimeSql);
$statusTimeData = [];
while ($row = $statusTimeResult->fetch_assoc()) {
    $statusTimeData[] = $row;
}

// ==========================
// REVENUE & ORDERS OVER TIME
// ==========================
$revenueTimeSql = "
    SELECT 
        DATE_FORMAT(o.created_at, '$dateFormat') AS date_bucket,
        COUNT(*) AS orders_count,
        COALESCE(SUM(o.total_shipping_fee), 0) AS revenue
    FROM orders o
    $whereClause
    GROUP BY date_bucket
    ORDER BY date_bucket ASC
";

$revenueTimeResult = $conn->query($revenueTimeSql);
$revenueTimeData = [];
while ($row = $revenueTimeResult->fetch_assoc()) {
    $revenueTimeData[] = $row;
}

// ==========================
// SERVICE DISTRIBUTION
// ==========================
$serviceDistSql = "
    SELECT 
        st.name AS service_name,
        COUNT(*) AS count
    FROM orders o
    LEFT JOIN service_types st ON o.service_type = st.id
    $whereClause
    GROUP BY st.id, st.name
    ORDER BY count DESC
";

$serviceDistResult = $conn->query($serviceDistSql);
$serviceDistData = [];
while ($row = $serviceDistResult->fetch_assoc()) {
    $serviceDistData[] = $row;
}

// ==========================
// PAYMENT DISTRIBUTION
// ==========================
$paymentDistSql = "
    SELECT 
        pm.name AS payment_name,
        COUNT(*) AS count
    FROM orders o
    LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
    $whereClause
    GROUP BY pm.id, pm.name
    ORDER BY count DESC
";

$paymentDistResult = $conn->query($paymentDistSql);
$paymentDistData = [];
while ($row = $paymentDistResult->fetch_assoc()) {
    $paymentDistData[] = $row;
}

// ==========================
// WORKFLOW CONVERSION
// ==========================
$workflowSql = "
    SELECT 
        s.id AS status_id,
        s.description AS status_name,
        COUNT(*) AS count
    FROM orders o
    LEFT JOIN statuses s ON o.status = s.id
    $whereClause
    GROUP BY s.id, s.description
    ORDER BY s.id ASC
";

$workflowResult = $conn->query($workflowSql);
$workflowData = [];
while ($row = $workflowResult->fetch_assoc()) {
    $workflowData[] = $row;
}

// ==========================
// AGING BACKLOG (WIP only - status 1,2,3,4)
// ==========================
$agingSql = "
    SELECT 
        o.status,
        s.description AS status_name,
        CASE
            WHEN TIMESTAMPDIFF(HOUR, o.created_at, NOW()) < 2 THEN '<2h'
            WHEN TIMESTAMPDIFF(HOUR, o.created_at, NOW()) < 6 THEN '2-6h'
            WHEN TIMESTAMPDIFF(HOUR, o.created_at, NOW()) < 12 THEN '6-12h'
            WHEN TIMESTAMPDIFF(HOUR, o.created_at, NOW()) < 24 THEN '12-24h'
            WHEN TIMESTAMPDIFF(DAY, o.created_at, NOW()) < 2 THEN '1-2d'
            ELSE '>2d'
        END AS aging_bucket,
        COUNT(*) AS count
    FROM orders o
    LEFT JOIN statuses s ON o.status = s.id
    WHERE o.status IN (1,2,3,4) AND ($dateCondition)
    GROUP BY o.status, s.description, aging_bucket
    ORDER BY o.status ASC, aging_bucket ASC
";

$agingResult = $conn->query($agingSql);
$agingData = [];
while ($row = $agingResult->fetch_assoc()) {
    $agingData[] = $row;
}

// ==========================
// AGENT QUALITY
// ==========================
$agentSql = "
    SELECT 
        u.id AS agent_id,
        u.name AS agent_name,
        SUM(CASE WHEN o.status = 5 THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN o.status IN (1,2,3,4) THEN 1 ELSE 0 END) AS wip,
        SUM(CASE WHEN o.status = 6 THEN 1 ELSE 0 END) AS failed
    FROM users u
    LEFT JOIN orders o ON o.agent_id = u.id AND ($dateCondition)
    WHERE u.role = 'agent'
    GROUP BY u.id, u.name
    HAVING (delivered + wip + failed) > 0
    ORDER BY delivered DESC
    LIMIT 10
";

$agentResult = $conn->query($agentSql);
$agentData = [];
while ($row = $agentResult->fetch_assoc()) {
    $agentData[] = $row;
}

// ==========================
// SHIPPER LEAD TIME (Boxplot data)
// ==========================
$shipperSql = "
    SELECT 
        u.id AS shipper_id,
        u.name AS shipper_name,
        TIMESTAMPDIFF(HOUR, 
            MIN(CASE WHEN oh1.status_id = 3 THEN oh1.created_at END),
            MIN(CASE WHEN oh2.status_id = 5 THEN oh2.created_at END)
        ) AS lead_time_hours
    FROM users u
    LEFT JOIN orders o ON o.shipper_id = u.id AND ($dateCondition)
    LEFT JOIN order_history oh1 ON oh1.order_id = o.id AND oh1.status_id = 3
    LEFT JOIN order_history oh2 ON oh2.order_id = o.id AND oh2.status_id = 5
    WHERE u.role = 'shipper' AND o.status = 5
    GROUP BY u.id, u.name, o.id
    HAVING lead_time_hours IS NOT NULL
    ORDER BY u.name
    LIMIT 10
";

$shipperResult = $conn->query($shipperSql);
$shipperData = [];
while ($row = $shipperResult->fetch_assoc()) {
    $shipperData[] = $row;
}

// ==========================
// FAILED RISK MATRIX
// ==========================
$failedRiskSql = "
    SELECT 
        st.id AS service_type_id,
        st.name AS service_name,
        pm.id AS payment_method_id,
        pm.name AS payment_name,
        COUNT(*) AS total_orders,
        SUM(CASE WHEN o.status = 6 THEN 1 ELSE 0 END) AS failed_orders
    FROM orders o
    LEFT JOIN service_types st ON o.service_type = st.id
    LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
    $whereClause
    GROUP BY st.id, st.name, pm.id, pm.name
    HAVING total_orders > 0
";

$failedRiskResult = $conn->query($failedRiskSql);
$failedRiskData = [];
while ($row = $failedRiskResult->fetch_assoc()) {
    $failedRate = $row['total_orders'] > 0 ? round(($row['failed_orders'] / $row['total_orders']) * 100, 1) : 0;
    $failedRiskData[] = [
        'service_id' => $row['service_type_id'],
        'service_name' => $row['service_name'],
        'payment_id' => $row['payment_method_id'],
        'payment_name' => $row['payment_name'],
        'failed_rate' => $failedRate,
    ];
}

// ==========================
// RESPONSE
// ==========================
Response::success("Reports data", [
    "kpi" => [
        "total_revenue" => $totalRevenue, // Tổng doanh thu (VNĐ) - format như dashboard
        "orders" => $totalOrders,
        "deliveredRate" => $deliveredRate, // Tỷ lệ giao thành công: delivered / total_orders
        "cancelRate" => $cancelRate, // Tỷ lệ thất bại: failed / total_orders
    ],
    "statusTimeData" => $statusTimeData,
    "revenueTimeData" => $revenueTimeData,
    "serviceDist" => $serviceDistData,
    "paymentDist" => $paymentDistData,
    "workflowData" => $workflowData,
    "agingData" => $agingData,
    "agentData" => $agentData,
    "shipperData" => $shipperData,
    "failedRiskData" => $failedRiskData,
]);

