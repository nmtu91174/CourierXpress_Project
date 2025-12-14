<?php
// backend/api/shipper/order_detail.php
// Xem chi tiết đơn hàng (phân quyền theo role)

// CORS Headers
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
$sql = "
    SELECT 
        o.*,
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
$types = "i";

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

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    Response::error("Không tìm thấy đơn hàng hoặc không có quyền");
}

$order = $result->fetch_assoc();
$stmt->close();

// ==========================
// ORDER IMAGES
// ==========================
$imgStmt = $conn->prepare("
    SELECT image_url, type
    FROM order_images
    WHERE order_id = ?
");
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
        oh.note,
        oh.role,
        oh.created_at,
        u.name AS actor_name
    FROM order_history oh
    LEFT JOIN users u ON oh.user_id = u.id
    WHERE oh.order_id = ?
    ORDER BY oh.created_at ASC
");
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
$feeStmt->bind_param("i", $orderId);
$feeStmt->execute();
$order["fees"] = $feeStmt->get_result()->fetch_all(MYSQLI_ASSOC);
$feeStmt->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Lấy chi tiết đơn hàng thành công", $order);

$conn->close();
