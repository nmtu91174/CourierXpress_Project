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
require_login();
require_role(["admin", "agent", "shipper", "customer"]);

$userId = (int)$GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// VALIDATE INPUT
// ==========================
$orderId = (int)($_GET["order_id"] ?? 0);
if ($orderId <= 0) {
    Response::error("order_id không hợp lệ");
}

// ==========================
// GET ORDER DETAIL
// ==========================
$sql = "
    SELECT 
        o.*,
        s.description AS status_desc,
        s.code AS status_code,
        pm.name AS payment_method_name,
        pm.code AS payment_method_code,
        ic.name AS category_name,
        st.name AS service_type_name,
        st.fee AS service_type_fee,
        u_agent.name AS agent_name,
        u_shipper.name AS shipper_name,
        u_customer.name AS customer_name
    FROM orders o
    LEFT JOIN statuses s ON o.status = s.id
    LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
    LEFT JOIN item_categories ic ON o.category_id = ic.id
    LEFT JOIN service_types st ON o.service_type = st.id
    LEFT JOIN users u_agent ON o.agent_id = u_agent.id
    LEFT JOIN users u_shipper ON o.shipper_id = u_shipper.id
    LEFT JOIN users u_customer ON o.customer_id = u_customer.id
    WHERE o.id = ?
";

// Role-based access control
switch ($role) {
    case "admin":
        // Admin thấy tất cả
        break;
    
    case "agent":
        $sql .= " AND o.agent_id = ?";
        break;
    
    case "shipper":
        $sql .= " AND o.shipper_id = ?";
        break;
    
    case "customer":
        $sql .= " AND o.customer_id = ?";
        break;
}

$stmt = $conn->prepare($sql);
if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi truy vấn database");
}

// Bind parameters based on role
if ($role === "admin") {
    $stmt->bind_param("i", $orderId);
} else {
    $stmt->bind_param("ii", $orderId, $userId);
}

if (!$stmt->execute()) {
    error_log("Execute failed: " . $stmt->error);
    Response::serverError("Lỗi thực thi truy vấn");
}

$result = $stmt->get_result();
$order = $result->fetch_assoc();
$stmt->close();

if (!$order) {
    Response::error("Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn hàng này");
}

// ==========================
// GET ORDER IMAGES
// ==========================
$sqlImages = "
    SELECT 
        id,
        image_url,
        type,
        created_at
    FROM order_images
    WHERE order_id = ?
    ORDER BY type, created_at ASC
";

$stmtImages = $conn->prepare($sqlImages);
if (!$stmtImages) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi truy vấn database");
}

$stmtImages->bind_param("i", $orderId);
if (!$stmtImages->execute()) {
    error_log("Execute failed: " . $stmtImages->error);
    Response::serverError("Lỗi thực thi truy vấn");
}

$resultImages = $stmtImages->get_result();
$images = [];
while ($row = $resultImages->fetch_assoc()) {
    $images[] = $row;
}
$stmtImages->close();

// ==========================
// GET ORDER FEES
// ==========================
$sqlFees = "
    SELECT 
        of.amount,
        f.name,
        f.type,
        f.code
    FROM order_fees of
    JOIN fees f ON of.fee_id = f.id
    WHERE of.order_id = ?
    ORDER BY f.type, f.id ASC
";

$stmtFees = $conn->prepare($sqlFees);
if (!$stmtFees) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi truy vấn database");
}

$stmtFees->bind_param("i", $orderId);
if (!$stmtFees->execute()) {
    error_log("Execute failed: " . $stmtFees->error);
    Response::serverError("Lỗi thực thi truy vấn");
}

$resultFees = $stmtFees->get_result();
$fees = [];
while ($row = $resultFees->fetch_assoc()) {
    $fees[] = $row;
}
$stmtFees->close();

// ==========================
// GET ORDER HISTORY
// ==========================
$sqlHistory = "
    SELECT 
        oh.id,
        oh.status_id,
        oh.user_id,
        oh.role,
        oh.note,
        oh.created_at,
        s.description AS status_desc,
        s.code AS status_code,
        u.name AS user_name
    FROM order_history oh
    LEFT JOIN statuses s ON oh.status_id = s.id
    LEFT JOIN users u ON oh.user_id = u.id
    WHERE oh.order_id = ?
    ORDER BY oh.created_at ASC
";

$stmtHistory = $conn->prepare($sqlHistory);
if (!$stmtHistory) {
    error_log("Prepare failed: " . $conn->error);
    Response::serverError("Lỗi truy vấn database");
}

$stmtHistory->bind_param("i", $orderId);
if (!$stmtHistory->execute()) {
    error_log("Execute failed: " . $stmtHistory->error);
    Response::serverError("Lỗi thực thi truy vấn");
}

$resultHistory = $stmtHistory->get_result();
$history = [];
while ($row = $resultHistory->fetch_assoc()) {
    $history[] = $row;
}
$stmtHistory->close();

// ==========================
// CALCULATE PERMISSION FLAGS (Enterprise - State-driven actions)
// ==========================
// Check if order has been picked up (status 4 = IN_PROGRESS in history)
$hasBeenPickedUp = false;
foreach ($history as $h) {
    if ((int)$h["status_id"] === 4) { // IN_PROGRESS
        $hasBeenPickedUp = true;
        break;
    }
}

$currentStatus = (int)$order["status"];
$previousStatus = isset($order["previous_status"]) ? (int)$order["previous_status"] : null;
$hasAgent = !empty($order["agent_id"]) && (int)$order["agent_id"] > 0;
$hasShipper = !empty($order["shipper_id"]) && (int)$order["shipper_id"] > 0;

// Enterprise Action Matrix (State-driven)
$permissions = [
    "can_assign_agent" => false,
    "can_assign_shipper" => false,
    "can_reassign_shipper" => false,
    "can_edit" => false,
    "can_cancel" => false,
    "can_reopen" => false,
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
if ($currentStatus === 3) {
    if (!$hasBeenPickedUp) {
        $permissions["can_reassign_shipper"] = true;
    }
    $permissions["can_edit"] = true;
    $permissions["can_cancel"] = true;
}

// IN_PROGRESS (4): No assign actions allowed
if ($currentStatus === 4) {
    $permissions["can_edit"] = false;
    $permissions["can_cancel"] = false;
}

// DELIVERED (5) / FAILED (6): No actions allowed
if ($currentStatus === 5 || $currentStatus === 6) {
    $permissions["can_edit"] = false;
    $permissions["can_cancel"] = false;
}

// CANCELLED (7): Can reopen if soft cancel (previous_status = BOOKED or APPROVED)
if ($currentStatus === 7) {
    if ($previousStatus === 1 || $previousStatus === 2) {
        $permissions["can_reopen"] = true;
    }
}

$conn->close();

// ==========================
// RESPONSE
// ==========================
$order["status"] = (int)$order["status"];
$order["weight"] = (int)$order["weight"];
$order["images"] = $images;
$order["fees"] = $fees;
$order["history"] = $history;
$order["permissions"] = $permissions; // Add permission flags

Response::success("Chi tiết đơn hàng", $order);

