<?php
// backend/api/admin/get_quick_assign_orders.php
// API riêng cho Quick Assign Modal - Fetch TẤT CẢ orders booked/approved (KHÔNG pagination)

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
require_role(["admin"]); // Chỉ admin mới có quyền assign

// ==========================
// GET PARAMETERS
// ==========================
$type = $_GET["type"] ?? "all"; // "booked", "approved", "all"

// ==========================
// QUERY – LẤY TẤT CẢ ORDERS (KHÔNG PAGINATION)
// ==========================
$whereConditions = [];
$params = [];
$types = "";

if ($type === "booked") {
    // Chỉ lấy orders booked (status = 1)
    $whereConditions[] = "o.status = 1";
} elseif ($type === "approved") {
    // Chỉ lấy orders approved (status = 2) và đã có agent
    $whereConditions[] = "o.status = 2";
    $whereConditions[] = "o.agent_id IS NOT NULL AND o.agent_id != 0";
} else {
    // Lấy cả booked và approved
    $whereConditions[] = "o.status IN (1, 2)";
}

$whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

$sql = "
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
        o.agent_id,
        o.shipper_id,
        o.service_type,
        o.total_shipping_fee,
        o.cod_amount,
        o.weight,
        o.length,
        o.width,
        o.height,
        o.notes,
        o.payment_method_id,
        pm.name AS payment_method_name,
        st.name AS service_type_name,
        u_agent.name AS agent_name
    FROM orders o
    LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
    LEFT JOIN service_types st ON o.service_type = st.id
    LEFT JOIN users u_agent ON o.agent_id = u_agent.id
    " . $whereClause . "
    ORDER BY o.updated_at DESC, o.created_at DESC
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    Response::serverError("Database query error: " . $conn->error);
}

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

$orders = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row["id"]         = (int)$row["id"];
        $row["status"]     = (int)$row["status"];
        $row["agent_id"]   = $row["agent_id"] ? (int)$row["agent_id"] : null;
        $row["shipper_id"] = $row["shipper_id"] ? (int)$row["shipper_id"] : null;
        $row["service_type"] = $row["service_type"] ? (int)$row["service_type"] : null;
        $row["total_shipping_fee"] = (float)($row["total_shipping_fee"] ?? 0);
        $row["cod_amount"] = (float)($row["cod_amount"] ?? 0);
        $row["weight"] = $row["weight"] ? (int)$row["weight"] : null; // weight is INT in DB
        $row["length"] = $row["length"] ? (float)$row["length"] : null;
        $row["width"] = $row["width"] ? (float)$row["width"] : null;
        $row["height"] = $row["height"] ? (float)$row["height"] : null;
        $row["notes"] = $row["notes"] ?? null; // notes field
        $row["created_at"] = date("Y-m-d H:i:s", strtotime($row["created_at"]));
        $orders[] = $row;
    }
} else {
    error_log("get_quick_assign_orders.php: Query returned no result");
}
$stmt->close();

// ==========================
// RESPONSE
// ==========================
// Log for debugging
error_log("get_quick_assign_orders.php: type=$type, found " . count($orders) . " orders");

Response::success("Quick assign orders loaded", [
    "items" => $orders,
    "total" => count($orders),
    "type" => $type
]);

$conn->close();

