<?php
// backend/api/admin/get_reports_data.php
// Enterprise Reports API (English) - Workflow aligned
// - 4 KPI
// - 8 meaningful reports
// - Removed SLA compliance
// - Revenue in VND (e.g., 262.000 ₫)

// ==========================
// CORS HEADERS
// ==========================
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
// HELPERS
// ==========================
function vnd_format($amount)
{
    $n = (float)$amount;
    return number_format($n, 0, ",", ".") . " ₫";
}

function clamp_period($p)
{
    $ok = ["7d", "30d", "12m", "1y"];
    return in_array($p, $ok, true) ? $p : "7d";
}

// ==========================
// GET PARAMETERS
// ==========================
$period  = clamp_period($_GET["period"] ?? "7d");
$service = $_GET["service"] ?? "all";  // all|standard|express|sameday
$payment = $_GET["payment"] ?? "all";  // all|cash|banking|momo
$status  = $_GET["status"]  ?? "all";  // all|BOOKED|APPROVED|ASSIGNED|PICKED_UP|DELIVERED|FAILED

// Accept view for compatibility (not required)
$view = $_GET["view"] ?? "overall";

// ==========================
// MAP FILTERS (safe ints)
// ==========================
$serviceMap = [
    "standard" => 1,
    "express"  => 2,
    "sameday"  => 3,
];

$paymentMap = [
    "cash"    => 1,
    "banking" => 2,
    "momo"    => 3,
];

$statusMap = [
    "BOOKED"    => 1,
    "APPROVED"  => 2,
    "ASSIGNED"  => 3,
    "PICKED_UP" => 4,
    "DELIVERED" => 5,
    "FAILED"    => 6,
];

// ==========================
// BUILD DATE RANGE + BUCKETS
// ==========================
$now = new DateTime("now");
$today = new DateTime("today");

$dateFormat = "%Y-%m-%d";
$timeBuckets = [];

if ($period === "12m") {
    // last 12 months incl current month
    $start = new DateTime("first day of this month 00:00:00");
    $start->modify("-11 months");
    $end = new DateTime("first day of next month 00:00:00");

    $dateFormat = "%Y-%m";

    $cursor = clone $start;
    while ($cursor < $end) {
        $timeBuckets[] = $cursor->format("Y-m");
        $cursor->modify("+1 month");
    }
} else if ($period === "1y") {
    // Current year (from Jan 1st of current year to now)
    $start = new DateTime("first day of January " . $now->format("Y") . " 00:00:00");
    $end = (clone $today);
    $end->modify("+1 day"); // exclusive

    $dateFormat = "%Y-%m";

    $cursor = clone $start;
    while ($cursor < $end) {
        $timeBuckets[] = $cursor->format("Y-m");
        $cursor->modify("+1 month");
    }
} else {
    $days = ($period === "30d") ? 30 : 7;
    // Make exactly N buckets ending today
    $start = (clone $today);
    $start->modify("-" . ($days - 1) . " days");
    $end = (clone $today);
    $end->modify("+1 day"); // exclusive

    $dateFormat = "%Y-%m-%d";

    $cursor = clone $start;
    while ($cursor < $end) {
        $timeBuckets[] = $cursor->format("Y-m-d");
        $cursor->modify("+1 day");
    }
}

$startSql = $start->format("Y-m-d H:i:s");
$endSql   = $end->format("Y-m-d H:i:s");

// ==========================
// WHERE CONDITIONS
// ==========================
$where = [];
$where[] = "o.created_at >= '$startSql' AND o.created_at < '$endSql'";

// Apply service filter
if ($service !== "all" && isset($serviceMap[$service])) {
    $where[] = "o.service_type = " . (int)$serviceMap[$service];
}

// Apply payment filter
if ($payment !== "all" && isset($paymentMap[$payment])) {
    $where[] = "o.payment_method_id = " . (int)$paymentMap[$payment];
}

// Apply status filter
if ($status !== "all" && isset($statusMap[$status])) {
    $where[] = "o.status = " . (int)$statusMap[$status];
}

$whereClause = "WHERE " . implode(" AND ", $where);

// ==========================
// KPI
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
$kpiRow = $kpiResult ? $kpiResult->fetch_assoc() : null;

$totalOrders  = (int)($kpiRow["total_orders"] ?? 0);
$delivered    = (int)($kpiRow["delivered"] ?? 0);
$failed       = (int)($kpiRow["failed"] ?? 0);
$totalRevenue = (float)($kpiRow["total_revenue"] ?? 0);

$deliveredRate = $totalOrders > 0 ? round(($delivered / $totalOrders) * 100, 1) : 0;
$failedRate    = $totalOrders > 0 ? round(($failed / $totalOrders) * 100, 1) : 0;

// ==========================
// STATUS OVER TIME
// ==========================
$statusTimeSql = "
    SELECT
        DATE_FORMAT(o.created_at, '$dateFormat') AS bucket,
        o.status AS status,
        COUNT(*) AS count
    FROM orders o
    $whereClause
    GROUP BY bucket, o.status
    ORDER BY bucket ASC, o.status ASC
";

$statusTimeData = [];
$statusTimeResult = $conn->query($statusTimeSql);
if ($statusTimeResult) {
    while ($row = $statusTimeResult->fetch_assoc()) {
        $statusTimeData[] = [
            "bucket" => $row["bucket"],
            "status" => (int)$row["status"],
            "count"  => (int)$row["count"],
        ];
    }
}

// ==========================
// REVENUE & ORDERS OVER TIME
// ==========================
$revenueTimeSql = "
    SELECT
        DATE_FORMAT(o.created_at, '$dateFormat') AS bucket,
        COUNT(*) AS orders,
        COALESCE(SUM(o.total_shipping_fee), 0) AS revenue
    FROM orders o
    $whereClause
    GROUP BY bucket
    ORDER BY bucket ASC
";

$revenueTimeData = [];
$revenueTimeResult = $conn->query($revenueTimeSql);
if ($revenueTimeResult) {
    while ($row = $revenueTimeResult->fetch_assoc()) {
        $revenueTimeData[] = [
            "bucket"  => $row["bucket"],
            "orders"  => (int)$row["orders"],
            "revenue" => (float)$row["revenue"],
        ];
    }
}

// ==========================
// SERVICE MIX (English labels)
// ==========================
$serviceMixSql = "
    SELECT
        o.service_type AS service_type_id,
        COUNT(*) AS count
    FROM orders o
    $whereClause
    GROUP BY o.service_type
    ORDER BY count DESC
";

$serviceMix = [];
$serviceMixResult = $conn->query($serviceMixSql);
if ($serviceMixResult) {
    while ($row = $serviceMixResult->fetch_assoc()) {
        $sid = (int)($row["service_type_id"] ?? 0);
        $name = "Unknown";
        if ($sid === 1) $name = "Standard";
        else if ($sid === 2) $name = "Express";
        else if ($sid === 3) $name = "Same-day";

        $serviceMix[] = [
            "id"    => $sid,
            "name"  => $name,
            "count" => (int)$row["count"],
        ];
    }
}

// ==========================
// PAYMENT MIX (English labels)
// ==========================
$paymentMixSql = "
    SELECT
        o.payment_method_id AS payment_method_id,
        COUNT(*) AS count
    FROM orders o
    $whereClause
    GROUP BY o.payment_method_id
    ORDER BY count DESC
";

$paymentMix = [];
$paymentMixResult = $conn->query($paymentMixSql);
if ($paymentMixResult) {
    while ($row = $paymentMixResult->fetch_assoc()) {
        $pid = (int)($row["payment_method_id"] ?? 0);
        $name = "Unknown";
        if ($pid === 1) $name = "Cash";
        else if ($pid === 2) $name = "Bank Transfer";
        else if ($pid === 3) $name = "MoMo";

        $paymentMix[] = [
            "id"    => $pid,
            "name"  => $name,
            "count" => (int)$row["count"],
        ];
    }
}

// ==========================
// WORKFLOW FUNNEL (ensure all stages exist)
// ==========================
$wfSql = "
    SELECT o.status AS status_id, COUNT(*) AS count
    FROM orders o
    $whereClause
    GROUP BY o.status
";

$wfCounts = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0, 6 => 0];
$wfResult = $conn->query($wfSql);
if ($wfResult) {
    while ($row = $wfResult->fetch_assoc()) {
        $sid = (int)($row["status_id"] ?? 0);
        if (isset($wfCounts[$sid])) $wfCounts[$sid] = (int)$row["count"];
    }
}

$workflowFunnel = [
    ["id" => 1, "stage" => "Booked",    "count" => $wfCounts[1]],
    ["id" => 2, "stage" => "Approved",  "count" => $wfCounts[2]],
    ["id" => 3, "stage" => "Assigned",  "count" => $wfCounts[3]],
    ["id" => 4, "stage" => "Picked Up", "count" => $wfCounts[4]],
    ["id" => 5, "stage" => "Delivered", "count" => $wfCounts[5]],
    ["id" => 6, "stage" => "Failed",    "count" => $wfCounts[6]],
];

// ==========================
// BACKLOG AGING (WIP only, within same timeframe)
// ==========================
$agingSql = "
    SELECT
        o.status AS status_id,
        CASE
            WHEN TIMESTAMPDIFF(HOUR, o.created_at, NOW()) < 2  THEN '<2h'
            WHEN TIMESTAMPDIFF(HOUR, o.created_at, NOW()) < 6  THEN '2-6h'
            WHEN TIMESTAMPDIFF(HOUR, o.created_at, NOW()) < 12 THEN '6-12h'
            WHEN TIMESTAMPDIFF(HOUR, o.created_at, NOW()) < 24 THEN '12-24h'
            WHEN TIMESTAMPDIFF(DAY,  o.created_at, NOW()) < 2  THEN '1-2d'
            ELSE '>2d'
        END AS aging_bucket,
        COUNT(*) AS count
    FROM orders o
    $whereClause
      AND o.status IN (1,2,3,4)
    GROUP BY o.status, aging_bucket
    ORDER BY o.status ASC
";

$agingData = [];
$agingResult = $conn->query($agingSql);
if ($agingResult) {
    while ($row = $agingResult->fetch_assoc()) {
        $sid = (int)$row["status_id"];
        $statusName = "Unknown";
        if ($sid === 1) $statusName = "Booked";
        else if ($sid === 2) $statusName = "Approved";
        else if ($sid === 3) $statusName = "Assigned";
        else if ($sid === 4) $statusName = "Picked Up";

        $agingData[] = [
            "status_id"    => $sid,
            "status_name"  => $statusName,
            "aging_bucket" => $row["aging_bucket"],
            "count"        => (int)$row["count"],
        ];
    }
}

// ==========================
// TOP AGENTS (highlight)
// ==========================
$agentSql = "
    SELECT
        u.id AS agent_id,
        u.name AS agent_name,
        SUM(CASE WHEN o.status = 5 AND o.created_at >= '$startSql' AND o.created_at < '$endSql' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN o.status IN (1,2,3,4) AND o.created_at >= '$startSql' AND o.created_at < '$endSql' THEN 1 ELSE 0 END) AS wip,
        SUM(CASE WHEN o.status = 6 AND o.created_at >= '$startSql' AND o.created_at < '$endSql' THEN 1 ELSE 0 END) AS failed,
        COUNT(CASE WHEN o.created_at >= '$startSql' AND o.created_at < '$endSql' THEN o.id ELSE NULL END) AS total
    FROM users u
    LEFT JOIN orders o
      ON o.agent_id = u.id
" . (
    ($service !== "all" && isset($serviceMap[$service])) ? " AND o.service_type = " . (int)$serviceMap[$service] : ""
) . (
    ($payment !== "all" && isset($paymentMap[$payment])) ? " AND o.payment_method_id = " . (int)$paymentMap[$payment] : ""
) . "
    WHERE u.role = 'agent'
    GROUP BY u.id, u.name
    ORDER BY delivered DESC, total DESC, u.id DESC
    LIMIT 10
";

$topAgents = [];
$agentResult = $conn->query($agentSql);
if ($agentResult) {
    while ($row = $agentResult->fetch_assoc()) {
        $del = (int)$row["delivered"];
        $fail = (int)$row["failed"];
        $sr = ($del + $fail) > 0 ? round(($del / ($del + $fail)) * 100, 1) : null;

        $topAgents[] = [
            "agent_id"      => (int)$row["agent_id"],
            "agent_name"    => $row["agent_name"] ?: "Unknown",
            "delivered"     => $del,
            "wip"           => (int)$row["wip"],
            "failed"        => $fail,
            "total"         => (int)$row["total"],
            "success_rate"  => $sr,
        ];
    }
}

// ==========================
// TOP SHIPPERS (highlight) - delivered + avg lead time
// Lead time = first ASSIGNED(3) -> first DELIVERED(5) per order
// ==========================
$topShippersSql = "
    SELECT
        u.id AS shipper_id,
        u.name AS shipper_name,
        COUNT(CASE WHEN o.status = 5 AND o.created_at >= '$startSql' AND o.created_at < '$endSql' THEN o.id ELSE NULL END) AS delivered,
        AVG(CASE 
            WHEN o.status = 5 
             AND o.created_at >= '$startSql' AND o.created_at < '$endSql'
             AND a.assigned_at IS NOT NULL 
             AND d.delivered_at IS NOT NULL 
             AND TIMESTAMPDIFF(HOUR, a.assigned_at, d.delivered_at) >= 0
            THEN TIMESTAMPDIFF(HOUR, a.assigned_at, d.delivered_at)
            ELSE NULL
        END) AS avg_lead_time_hours
    FROM users u
    LEFT JOIN orders o
      ON o.shipper_id = u.id
     AND o.status = 5
" . (
    ($service !== "all" && isset($serviceMap[$service])) ? " AND o.service_type = " . (int)$serviceMap[$service] : ""
) . (
    ($payment !== "all" && isset($paymentMap[$payment])) ? " AND o.payment_method_id = " . (int)$paymentMap[$payment] : ""
) . "
    LEFT JOIN (
        SELECT order_id, MIN(created_at) AS assigned_at
        FROM order_history
        WHERE status_id = 3
        GROUP BY order_id
    ) a ON a.order_id = o.id
    LEFT JOIN (
        SELECT order_id, MIN(created_at) AS delivered_at
        FROM order_history
        WHERE status_id = 5
        GROUP BY order_id
    ) d ON d.order_id = o.id
    WHERE u.role = 'shipper'
    GROUP BY u.id, u.name
    ORDER BY delivered DESC, u.id DESC
    LIMIT 10
";

$topShippers = [];
$shipperResult = $conn->query($topShippersSql);
if ($shipperResult) {
    while ($row = $shipperResult->fetch_assoc()) {
        $avgLeadTime = null;
        if ($row["avg_lead_time_hours"] !== null && $row["avg_lead_time_hours"] !== "") {
            $avgLeadTime = round((float)$row["avg_lead_time_hours"], 1);
        }
        
        $topShippers[] = [
            "shipper_id" => (int)$row["shipper_id"],
            "shipper_name" => $row["shipper_name"] ?: "Unknown",
            "delivered" => (int)$row["delivered"],
            "avg_lead_time_hours" => $avgLeadTime,
        ];
    }
} else {
    // Log error for debugging
    error_log("Top Shippers Query Error: " . $conn->error);
}

// ==========================
// RESPONSE
// ==========================
Response::success("Reports data", [
    "meta" => [
        "period" => $period,
        "service" => $service,
        "payment" => $payment,
        "status" => $status,
        "generatedAt" => $now->format(DateTime::ATOM),
    ],
    "kpi" => [
        "revenueRaw" => $totalRevenue,
        "revenueFormatted" => vnd_format($totalRevenue),
        "orders" => $totalOrders,
        "deliveredRate" => $deliveredRate,
        "failedRate" => $failedRate,
    ],
    "timeBuckets" => $timeBuckets,
    "revenueTimeData" => $revenueTimeData,
    "statusTimeData" => $statusTimeData,
    "serviceMix" => $serviceMix,
    "paymentMix" => $paymentMix,
    "workflowFunnel" => $workflowFunnel,
    "backlogAging" => $agingData,
    "topAgents" => $topAgents,
    "topShippers" => $topShippers,
]);
