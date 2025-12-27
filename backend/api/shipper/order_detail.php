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
$sql = "
    SELECT 
        o.*,
        c.name AS customer_name,
        a.name AS agent_name,
        s.name AS shipper_name,
        ic.name AS category_name,
        p.code AS payment_method
    FROM orders o
    LEFT JOIN users c ON o.customer_id = c.id
    LEFT JOIN users a ON o.agent_id = a.id
    LEFT JOIN users s ON o.shipper_id = s.id
    LEFT JOIN item_categories ic ON o.category_id = ic.id
    LEFT JOIN payment_methods p ON o.payment_method_id = p.id
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

$order["weight"] = isset($order["weight"]) ? (int)$order["weight"] : null;

// ==========================
// ORDER IMAGES
// ==========================
$order["images"] = [];
$imgStmt = $conn->prepare("
    SELECT id, image_url, type, created_at
    FROM order_images
    WHERE order_id = ?
    ORDER BY type, created_at ASC
");
if ($imgStmt) {
    $imgStmt->bind_param("i", $orderId);
    $imgStmt->execute();
    $res = $imgStmt->get_result();
    $order["images"] = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    $imgStmt->close();
}

// ==========================
// ORDER HISTORY
// ==========================
$order["history"] = [];
$hisStmt = $conn->prepare("
    SELECT 
        oh.id,
        oh.status_id,
        oh.user_id,
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
if ($hisStmt) {
    $hisStmt->bind_param("i", $orderId);
    $hisStmt->execute();
    $res = $hisStmt->get_result();
    $order["history"] = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    $hisStmt->close();
}

// ==========================
// ORDER FEES
// ==========================
$order["fees"] = [];
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
if ($feeStmt) {
    $feeStmt->bind_param("i", $orderId);
    $feeStmt->execute();
    $res = $feeStmt->get_result();
    $order["fees"] = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    $feeStmt->close();
}

// =======================================================
// [FIXED] DELIVERY FAILED DATA – MUST BE BEFORE RESPONSE
// =======================================================

// [ADDED] DELIVERY ISSUE (ONLY FOR DELIVERY FAILED)
$order["delivery_issue"] = null;
if ((int)$order["status"] === 6 && !empty($order["failed_issue_id"])) {
    $issueStmt = $conn->prepare("
        SELECT id, reason, detail, latitude, longitude, accuracy, created_at
        FROM delivery_issues
        WHERE id = ?
        LIMIT 1
    ");
    if ($issueStmt) {
        $issueStmt->bind_param("i", $order["failed_issue_id"]);
        $issueStmt->execute();
        $res = $issueStmt->get_result();
        $order["delivery_issue"] = $res ? $res->fetch_assoc() : null;
        $issueStmt->close();
    }
}

// [ADDED] DELIVERY FAILED IMAGES
$order["failed_images"] = [];
$failImgStmt = $conn->prepare("
    SELECT id, image_url, created_at
    FROM order_images
    WHERE order_id = ?
      AND type = 'delivery_failed'
");
if ($failImgStmt) {
    $failImgStmt->bind_param("i", $orderId);
    $failImgStmt->execute();
    $res = $failImgStmt->get_result();
    $order["failed_images"] = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    $failImgStmt->close();
}

// [ADDED] NORMALIZED FAILED FIELDS FOR UI
if ((int)$order["status"] === 6) {
    $order["delivery_fail_reason"] =
        $order["delivery_issue"]["reason"] ?? $order["failed_reason"] ?? null;

    $order["delivery_fail_note"] =
        $order["delivery_issue"]["detail"] ?? null;

    // Normalize failed_at for frontend
    $order["delivery_fail_at"] = $order["failed_at"] ?? null;

    // Add full URL for failed images if they exist
    if (!empty($order["failed_images"])) {
        $baseUrl = "http://localhost:8888/";
        foreach ($order["failed_images"] as &$img) {
            if (!empty($img["image_url"]) && strpos($img["image_url"], "http") !== 0) {
                $img["image_url"] = $baseUrl . ltrim($img["image_url"], "/");
            }
        }
        unset($img);
    }
}

// ==========================
// RESPONSE (ONLY ONCE – PRODUCTION SAFE)
// ==========================
Response::success("Lấy chi tiết đơn hàng thành công", $order);

$conn->close();
