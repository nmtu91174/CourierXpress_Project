<?php
// backend/api/admin/cancel_order.php
// CANCEL ORDER (Soft Cancel) – Enterprise Standard
// Replaces delete_order.php with proper soft cancel logic

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
require_role(["admin", "agent"]); // Admin and Agent can cancel

$userId = $GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);
$orderId = (int)($data["order_id"] ?? 0);
$cancelReason = trim($data["cancel_reason"] ?? "Order cancelled by " . $role);

if ($orderId <= 0) {
    Response::error("Missing order_id");
}

// ==========================
// CANCEL ORDER (Soft Cancel)
// ==========================
try {
    $conn->begin_transaction();

    // 1️⃣ Kiểm tra tồn tại và lấy thông tin đơn
    $check = $conn->prepare(
        "SELECT id, order_code, status, agent_id, shipper_id, customer_id FROM orders WHERE id = ?"
    );
    $check->bind_param("i", $orderId);
    $check->execute();
    $res = $check->get_result();

    if ($res->num_rows === 0) {
        $conn->rollback();
        Response::error("Order not found");
    }

    $order = $res->fetch_assoc();
    $currentStatus = (int)$order["status"];
    $hasShipper = !empty($order["shipper_id"]);
    
    // 2️⃣ Enterprise Rules: Cancel is ONLY allowed for BOOKED (1) or APPROVED (2)
    // Cancel is NOT allowed when status >= ASSIGNED (3) or has shipper
    if ($currentStatus >= 3 || $hasShipper) {
        $conn->rollback();
        Response::error("Cannot cancel order: Order is already assigned to shipper or in progress. Only BOOKED or APPROVED orders can be cancelled.");
    }
    
    // 3️⃣ Guard: Cannot cancel terminal statuses
    if ($currentStatus === 5 || $currentStatus === 6 || $currentStatus === 7) {
        $conn->rollback();
        Response::error("Cannot cancel order in terminal status (Delivered/Failed/Cancelled)");
    }
    
    // 4️⃣ Enterprise: All cancels are "soft" (before assignment)
    // Cancel type is always "soft" since we only allow cancel for BOOKED/APPROVED
    $cancelType = "soft";
    
    // 5️⃣ Update order status to CANCELLED (7) + Store metadata
    // Enterprise: Store previous_status, cancelled_at, cancelled_by
    // Try to update with metadata first (if columns exist)
    $stmt = $conn->prepare(
        "UPDATE orders 
         SET 
            previous_status = ?,
            status = 7,
            cancelled_at = NOW(),
            cancelled_by = ?
         WHERE id = ?"
    );
    
    if ($stmt) {
        $stmt->bind_param("iii", $currentStatus, $userId, $orderId);
        $stmt->execute();
        
        // If columns don't exist, the above will fail - try without them as fallback
        if ($stmt->errno) {
            $stmt->close();
            // Fallback: Update only status (for backward compatibility)
            $stmtFallback = $conn->prepare(
                "UPDATE orders SET status = 7 WHERE id = ?"
            );
            if ($stmtFallback) {
                $stmtFallback->bind_param("i", $orderId);
                $stmtFallback->execute();
                $stmtFallback->close();
            }
        } else {
            $stmt->close();
        }
    } else {
        // If prepare fails, try fallback
        $stmtFallback = $conn->prepare(
            "UPDATE orders SET status = 7 WHERE id = ?"
        );
        if ($stmtFallback) {
            $stmtFallback->bind_param("i", $orderId);
            $stmtFallback->execute();
            $stmtFallback->close();
        }
    }

    // 6️⃣ Order history - Store previous status and cancel type in note
    $historyNote = sprintf(
        "Order cancelled (type: %s, previous_status: %d). Reason: %s",
        $cancelType,
        $currentStatus,
        $cancelReason
    );
    
    $history = $conn->prepare(
        "INSERT INTO order_history (order_id, status_id, user_id, role, note)
         VALUES (?, 7, ?, ?, ?)"
    );
    $historyRole = $role === "admin" ? "system" : $role; // order_history.role enum
    $history->bind_param("iiss", $orderId, $userId, $historyRole, $historyNote);
    $history->execute();

    // 7️⃣ DB system log
    $notify = new NotificationService($conn);
    $notify->log(
        "CANCEL_ORDER",
        "orders",
        $orderId,
        $userId
    );

    // 7️⃣.5 CREATE NOTIFICATIONS (RBAC)
    $notify->emit('order_cancelled', $orderId, $userId, $role, ['reason' => $cancelReason]);

    // 8️⃣ AUDIT LOG (FILE – ISO 27001)
    $auditLine = sprintf(
        "time=%s event=CANCEL_ORDER actor_id=%d actor_role=%s resource=order resource_id=%d cancel_type=%s previous_status=%d outcome=SUCCESS message=\"Cancel order %s\"\n",
        date("c"),
        $userId,
        $role,
        $orderId,
        $cancelType,
        $currentStatus,
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

    Response::success("Order cancelled successfully", [
        "cancel_type" => $cancelType,
        "previous_status" => $currentStatus,
        "can_clone" => true, // Cancelled orders can be cloned
        "can_create_followup" => true // Cancelled orders can have follow-up orders
    ]);

} catch (Exception $e) {
    if (isset($conn)) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackEx) {
            // Ignore rollback errors
        }
    }
    error_log("CANCEL ORDER ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError($e->getMessage());
} catch (Error $e) {
    if (isset($conn)) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackEx) {
            // Ignore rollback errors
        }
    }
    error_log("CANCEL ORDER FATAL ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError("System error: " . $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

