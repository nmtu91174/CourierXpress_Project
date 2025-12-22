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
// [FIX] Use o.* to get all fields, then add joined fields
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
        // [RBAC STRICT] Shipper ONLY sees orders assigned to them
        // Must have: o.shipper_id = current_shipper_id
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
try {
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        error_log("Prepare failed (orders): " . $conn->error);
        Response::serverError("SQL prepare failed (orders): " . $conn->error);
    }

    if (!empty($params) && !empty($types)) {
        if (!$stmt->bind_param($types, ...$params)) {
            error_log("Bind param failed (orders): " . $stmt->error);
            $stmt->close();
            Response::serverError("SQL bind_param failed (orders): " . $stmt->error);
        }
    }

    if (!$stmt->execute()) {
        error_log("Execute failed (orders): " . $stmt->error);
        $stmt->close();
        Response::serverError("SQL execute failed (orders): " . $stmt->error);
    }

    $result = $stmt->get_result();
    if (!$result) {
        error_log("Get result failed (orders): " . $stmt->error);
        $stmt->close();
        Response::serverError("SQL get_result failed (orders): " . $stmt->error);
    }

    if ($result->num_rows === 0) {
        $stmt->close();
        // [RBAC] Explicit error message based on role
        if ($role === "shipper") {
            Response::error("Order not assigned to this shipper");
        } else {
            Response::error("Không tìm thấy đơn hàng hoặc không có quyền");
        }
    }

    $order = $result->fetch_assoc();
    $stmt->close();
    
    // Ensure weight is integer (grams)
    if (isset($order["weight"])) {
        $order["weight"] = (int)$order["weight"];
    }
    
} catch (Exception $e) {
    error_log("Exception in order_detail.php (orders): " . $e->getMessage());
    if (isset($stmt) && $stmt) {
        $stmt->close();
    }
    Response::serverError("Lỗi khi lấy chi tiết đơn hàng: " . $e->getMessage());
}

// ==========================
// ORDER IMAGES (pickup / delivery)
// ==========================
// [FIX] Dùng đúng bảng order_images theo DB
try {
    $imgStmt = $conn->prepare("
        SELECT id, image_url, type, created_at
        FROM order_images
        WHERE order_id = ?
        ORDER BY type, created_at ASC
    ");

    if (!$imgStmt) {
        error_log("Prepare failed (order_images): " . $conn->error);
        $order["images"] = [];
    } else {
        $imgStmt->bind_param("i", $orderId);
        if (!$imgStmt->execute()) {
            error_log("Execute failed (order_images): " . $imgStmt->error);
            $order["images"] = [];
        } else {
            $result = $imgStmt->get_result();
            $order["images"] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        }
        $imgStmt->close();
    }
} catch (Exception $e) {
    error_log("Exception loading order_images: " . $e->getMessage());
    $order["images"] = [];
}

// ==========================
// ORDER HISTORY (TIMELINE)
// ==========================
try {
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

    if (!$hisStmt) {
        error_log("Prepare failed (order_history): " . $conn->error);
        $order["history"] = [];
    } else {
        $hisStmt->bind_param("i", $orderId);
        if (!$hisStmt->execute()) {
            error_log("Execute failed (order_history): " . $hisStmt->error);
            $order["history"] = [];
        } else {
            $result = $hisStmt->get_result();
            $order["history"] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        }
        $hisStmt->close();
    }
} catch (Exception $e) {
    error_log("Exception loading order_history: " . $e->getMessage());
    $order["history"] = [];
}

// ==========================
// ORDER FEES
// ==========================
try {
    $feeStmt = $conn->prepare("
        SELECT 
            of.amount,
            f.name AS fee_name,
            f.type AS fee_type,
            f.code AS fee_code
        FROM order_fees of
        INNER JOIN fees f ON of.fee_id = f.id
        WHERE of.order_id = ?
        ORDER BY f.type, f.id ASC
    ");

    if (!$feeStmt) {
        error_log("Prepare failed (order_fees): " . $conn->error);
        $order["fees"] = [];
    } else {
        $feeStmt->bind_param("i", $orderId);
        if (!$feeStmt->execute()) {
            error_log("Execute failed (order_fees): " . $feeStmt->error);
            $order["fees"] = [];
        } else {
            $result = $feeStmt->get_result();
            $order["fees"] = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
        }
        $feeStmt->close();
    }
} catch (Exception $e) {
    error_log("Exception loading order_fees: " . $e->getMessage());
    $order["fees"] = [];
}

// ==========================
// RESPONSE
// ==========================
Response::success("Lấy chi tiết đơn hàng thành công", $order);

$conn->close();
