<?php
// backend/api/admin/reopen_order.php
// REOPEN ORDER – Enterprise Standard
// Reopens soft-cancelled orders (only before assignment)

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
require_role(["admin", "agent"]); // Admin and Agent can reopen

$userId = $GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);
$orderId = (int)($data["order_id"] ?? 0);
$reopenReason = trim($data["reopen_reason"] ?? "Order reopened by " . $role);

if ($orderId <= 0) {
    Response::error("Missing order_id");
}

// ==========================
// REOPEN ORDER
// ==========================
try {
    $conn->begin_transaction();

    // 1️⃣ Kiểm tra tồn tại và lấy thông tin đơn (include previous_status)
    $check = $conn->prepare(
        "SELECT id, order_code, status, agent_id, shipper_id, previous_status, cancelled_at, cancelled_by FROM orders WHERE id = ?"
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
    
    // 2️⃣ Guard: Only CANCELLED (7) orders can be reopened
    if ($currentStatus !== 7) {
        $conn->rollback();
        Response::error("Only cancelled orders can be reopened");
    }
    
    // 3️⃣ Get previous status from orders table (Enterprise: primary source)
    // Fallback to order_history if previous_status is NULL
    $previousStatus = null;
    $cancelType = "soft";
    
    // First: Try to get from orders.previous_status (most reliable)
    if (isset($order["previous_status"]) && !empty($order["previous_status"])) {
        $previousStatus = (int)$order["previous_status"];
    } else {
        // Fallback: Get from order_history
        $historyQuery = $conn->prepare(
            "SELECT h1.status_id as cancel_status, h1.note as cancel_note, h1.created_at as cancel_time,
                    h2.status_id as previous_status, h2.created_at as previous_time
             FROM order_history h1
             LEFT JOIN order_history h2 ON h1.order_id = h2.order_id 
                AND h2.created_at < h1.created_at
             WHERE h1.order_id = ? AND h1.status_id = 7
             ORDER BY h1.created_at DESC, h2.created_at DESC
             LIMIT 1"
        );
        $historyQuery->bind_param("i", $orderId);
        $historyQuery->execute();
        $historyRes = $historyQuery->get_result();
        
        if ($historyRes->num_rows > 0) {
            $history = $historyRes->fetch_assoc();
            $note = $history["cancel_note"] ?? "";
            
            // Get from previous status entry
            if (!empty($history["previous_status"])) {
                $previousStatus = (int)$history["previous_status"];
            } else {
                // Parse from note: "previous_status: X"
                if (preg_match('/previous_status:\s*(\d+)/', $note, $matches)) {
                    $previousStatus = (int)$matches[1];
                }
            }
            
            // Parse cancel_type from note: "type: X"
            if (preg_match('/type:\s*(\w+)/', $note, $matches)) {
                $cancelType = $matches[1];
            }
        }
        $historyQuery->close();
    }
    
    // Default to BOOKED if still not found
    if ($previousStatus === null || $previousStatus < 1) {
        $previousStatus = 1; // BOOKED
    }
    
    // 4️⃣ Enterprise Rules: Only soft cancels can be reopened
    if ($cancelType !== "soft") {
        $conn->rollback();
        Response::error("Only soft-cancelled orders (before assignment) can be reopened");
    }
    
    // 5️⃣ Guard: Previous status must be valid (Booked or Approved)
    if ($previousStatus < 1 || $previousStatus > 2) {
        $conn->rollback();
        Response::error("Cannot reopen: previous status is invalid or too advanced");
    }
    
    // 6️⃣ Guard: Cannot reopen if shipper was assigned
    if (!empty($order["shipper_id"])) {
        $conn->rollback();
        Response::error("Cannot reopen: order was already assigned to shipper");
    }
    
    // 7️⃣ Update order status to previous_status + Clear cancel metadata
    $stmt = $conn->prepare(
        "UPDATE orders 
         SET 
            status = ?,
            previous_status = NULL,
            cancelled_at = NULL,
            cancelled_by = NULL
         WHERE id = ?"
    );
    
    if ($stmt) {
        $stmt->bind_param("ii", $previousStatus, $orderId);
        $stmt->execute();
        $stmt->close();
    } else {
        // Fallback: Update only status
        $stmtFallback = $conn->prepare(
            "UPDATE orders SET status = ? WHERE id = ?"
        );
        if ($stmtFallback) {
            $stmtFallback->bind_param("ii", $previousStatus, $orderId);
            $stmtFallback->execute();
            $stmtFallback->close();
        }
    }

    // 8️⃣ Order history - Log reopen action
    $historyNote = sprintf(
        "Order reopened from CANCELLED to status %d. Reason: %s",
        $previousStatus,
        $reopenReason
    );
    
    $history = $conn->prepare(
        "INSERT INTO order_history (order_id, status_id, user_id, role, note)
         VALUES (?, ?, ?, ?, ?)"
    );
    $historyRole = $role === "admin" ? "system" : $role;
    $history->bind_param("iiiss", $orderId, $previousStatus, $userId, $historyRole, $historyNote);
    $history->execute();

    // 9️⃣ DB system log
    $notify = new NotificationService($conn);
    $notify->log(
        "REOPEN_ORDER",
        "orders",
        $orderId,
        $userId
    );

    // 🔟 AUDIT LOG (FILE – ISO 27001)
    $auditLine = sprintf(
        "time=%s event=REOPEN_ORDER actor_id=%d actor_role=%s resource=order resource_id=%d previous_status=%d new_status=%d outcome=SUCCESS message=\"Reopen order %s\"\n",
        date("c"),
        $userId,
        $role,
        $orderId,
        7, // from CANCELLED
        $previousStatus,
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

    Response::success("Order reopened successfully", [
        "new_status" => $previousStatus,
        "status_label" => $previousStatus === 1 ? "Booked" : "Approved"
    ]);

} catch (Exception $e) {
    if (isset($conn)) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackEx) {
            // Ignore rollback errors
        }
    }
    error_log("REOPEN ORDER ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError($e->getMessage());
} catch (Error $e) {
    if (isset($conn)) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackEx) {
            // Ignore rollback errors
        }
    }
    error_log("REOPEN ORDER FATAL ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError("System error: " . $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

