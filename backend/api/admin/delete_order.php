<?php
// backend/api/admin/delete_order.php
// DELETE ORDER – Đánh dấu đơn hàng là failed (status 6) thay vì xóa

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
// CORE
// ==========================
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";
require_once __DIR__ . "/../../services/OrderService.php";
require_once __DIR__ . "/../../services/NotificationService.php";

// ==========================
// AUTH
// ==========================
require_login();
require_role(["admin"]);

$userId = $GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);
$orderId = (int)($data["order_id"] ?? 0);

if ($orderId <= 0) {
    Response::error("Thiếu order_id");
}

// ==========================
// DELETE ORDER (Đánh dấu failed)
// ==========================
try {
    $conn->begin_transaction();

    // 1️⃣ Kiểm tra tồn tại
    $check = $conn->prepare(
        "SELECT id, order_code, status FROM orders WHERE id = ?"
    );
    $check->bind_param("i", $orderId);
    $check->execute();
    $res = $check->get_result();

    if ($res->num_rows === 0) {
        $conn->rollback();
        Response::error("Đơn hàng không tồn tại");
    }

    $order = $res->fetch_assoc();
    
    // Không cho xóa đơn đã giao thành công (status 5)
    if ((int)$order["status"] === 5) {
        $conn->rollback();
        Response::error("Không thể xóa đơn hàng đã giao thành công");
    }

    // 2️⃣ Đánh dấu đơn hàng là failed (status 6)
    $stmt = $conn->prepare(
        "UPDATE orders SET status = 6 WHERE id = ?"
    );
    $stmt->bind_param("i", $orderId);
    $stmt->execute();

    // 3️⃣ Order history - role phải là 'system' vì order_history.role không có 'admin'
    $history = $conn->prepare(
        "INSERT INTO order_history (order_id, status_id, user_id, role, note)
         VALUES (?, 6, ?, 'system', ?)"
    );
    $note = "Admin đã xóa/hủy đơn hàng";
    $history->bind_param("iis", $orderId, $userId, $note);
    $history->execute();

    // 4️⃣ DB system log
    $notify = new NotificationService($conn);
    $notify->log(
        "DELETE_ORDER",
        "orders",
        $orderId,
        $userId
    );

    // 5️⃣ AUDIT LOG (FILE – ISO 27001)
    $auditLine = sprintf(
        "time=%s event=DELETE_ORDER actor_id=%d actor_role=%s resource=order resource_id=%d outcome=SUCCESS message=\"Delete order %s\"\n",
        date("c"),
        $userId,
        $role,
        $orderId,
        $order["order_code"]
    );

    $logFile = __DIR__ . "/../../logs/audit.log";
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }

    file_put_contents(
        $logFile,
        $auditLine,
        FILE_APPEND | LOCK_EX
    );

    $conn->commit();

    Response::success("Đã xóa đơn hàng thành công");

} catch (Exception $e) {
    if (isset($conn)) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackEx) {
            // Ignore rollback errors
        }
    }
    error_log("DELETE ORDER ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError($e->getMessage());
} catch (Error $e) {
    if (isset($conn)) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackEx) {
            // Ignore rollback errors
        }
    }
    error_log("DELETE ORDER FATAL ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError("Lỗi hệ thống: " . $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
