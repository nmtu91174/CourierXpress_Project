<?php
// backend/api/shipper/order_detail.php
// Xem chi tiết đơn hàng (phân quyền theo role)

// ==========================
// CORS Headers
// ==========================
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ OPTIONS phải exit sớm TRƯỚC middleware
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================
// METHOD CHECK
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode([
        "status" => "error",
        "message" => "Method not allowed"
    ]);
    exit();
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
require_role(["admin", "agent", "shipper", "customer"]);

$userId = $GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// READ INPUT
// ==========================
$orderId = (int)($_GET["order_id"] ?? 0);

if ($orderId <= 0) {
    Response::error("Thiếu order_id");
}

// ==========================
// BASE ORDER QUERY
// ==========================
// [FIX] Chỉ select field cần thiết cho Order Detail
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
        o.weight,
        o.actual_weight,
        o.status,
        o.cod_amount,
        o.total_amount,
        o.penalty_fee,
        o.total_shipping_fee,
        o.notes,
        o.created_at,
        o.pickup_proof,
        o.delivery_proof,
        c.name AS customer_name,
        a.name AS agent_name,
        s.name AS shipper_name
    FROM orders o
    LEFT JOIN users c ON o.customer_id = c.id
    LEFT JOIN users a ON o.agent_id = a.id
    LEFT JOIN users s ON o.shipper_id = s.id
    WHERE o.id = ?
";

// ==========================
// PERMISSION CHECK
// ==========================
$whereClause = "";
$params = [$orderId];
$types  = "i";

switch ($role) {
    case "admin":
        // không filter
        break;

    case "agent":
        $whereClause = " AND o.agent_id = ?";
        $params[] = $userId;
        $types .= "i";
        break;

    case "shipper":
        // [QUAN TRỌNG] Shipper chỉ xem được đơn của mình
        $whereClause = " AND o.shipper_id = ?";
        $params[] = $userId;
        $types .= "i";
        break;

    case "customer":
        $whereClause = " AND o.customer_id = ?";
        $params[] = $userId;
        $types .= "i";
        break;

    default:
        Response::error("Không có quyền truy cập");
}

$sql .= $whereClause;

// ==========================
// EXECUTE ORDER QUERY
// ==========================
$stmt = $conn->prepare($sql);
if (!$stmt) {
    Response::serverError("SQL prepare failed (orders)");
}

$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    Response::error("Không tìm thấy đơn hàng hoặc không có quyền");
}

$order = $result->fetch_assoc();
$stmt->close();

// ==========================
// ORDER IMAGES (pickup / delivery)
// ==========================
// [FIX] Dùng đúng bảng order_images theo DB
$imgStmt = $conn->prepare("
    SELECT image_url, type
    FROM order_images
    WHERE order_id = ?
    ORDER BY created_at ASC
");

if (!$imgStmt) {
    Response::serverError("SQL prepare failed (order_images)");
}

$imgStmt->bind_param("i", $orderId);
$imgStmt->execute();
$order["images"] = $imgStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$imgStmt->close();

// ==========================
// ORDER HISTORY (TIMELINE)
// ==========================
$hisStmt = $conn->prepare("
    SELECT 
        oh.status_id,
        s.code AS status_code,
        s.description AS status_label,
        oh.note,
        oh.role,
        oh.created_at,
        u.name AS actor_name
    FROM order_history oh
    LEFT JOIN statuses s ON oh.status_id = s.id
    LEFT JOIN users u ON oh.user_id = u.id
    WHERE oh.order_id = ?
    ORDER BY oh.created_at ASC
");

if (!$hisStmt) {
    Response::serverError("SQL prepare failed (order_history)");
}

$hisStmt->bind_param("i", $orderId);
$hisStmt->execute();
$order["history"] = $hisStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$hisStmt->close();

// ==========================
// ORDER FEES
// ==========================
$feeStmt = $conn->prepare("
    SELECT 
        of.amount,
        f.name AS fee_name,
        f.type AS fee_type,
        f.code AS fee_code
    FROM order_fees of
    INNER JOIN fees f ON of.fee_id = f.id
    WHERE of.order_id = ?
");

if (!$feeStmt) {
    Response::serverError("SQL prepare failed (order_fees)");
}

$feeStmt->bind_param("i", $orderId);
$feeStmt->execute();
$order["fees"] = $feeStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$feeStmt->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Lấy chi tiết đơn hàng thành công", $order);

$conn->close();
