<?php
// backend/api/admin/terminate_workflow.php
// TERMINATE WORKFLOW (Internal Close) – Enterprise Standard
// Separates "Workflow Termination" from "Business Cancellation"
// Workflow Termination is allowed from ASSIGNED onward, used to enable clone/follow-up

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
require_role(["admin", "agent"]); // Admin and Agent can terminate workflow

$userId = $GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);
$orderId = (int)($data["order_id"] ?? 0);
$terminationReason = trim($data["termination_reason"] ?? "Workflow terminated by " . $role);

if ($orderId <= 0) {
    Response::error("Missing order_id");
}

// ==========================
// TERMINATE WORKFLOW (Internal Close)
// ==========================
try {
    $conn->begin_transaction();

    // 1️⃣ Kiểm tra tồn tại và lấy thông tin đơn
    $check = $conn->prepare(
        "SELECT id, order_code, status, agent_id, shipper_id, previous_status FROM orders WHERE id = ?"
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
    
    // 2️⃣ Enterprise Rules: Workflow Termination is ONLY allowed from ASSIGNED (3) onward
    // NOT allowed for BOOKED (1) or APPROVED (2) - use Cancel for those
    // NOT allowed for terminal statuses (DELIVERED, FAILED, CANCELLED)
    if ($currentStatus < 3) {
        $conn->rollback();
        Response::error("Cannot terminate workflow: Order is in BOOKED or APPROVED status. Use Cancel for business cancellation before assignment.");
    }
    
    if ($currentStatus === 5 || $currentStatus === 6 || $currentStatus === 7) {
        $conn->rollback();
        Response::error("Cannot terminate workflow: Order is in terminal status (Delivered/Failed/Cancelled)");
    }
    
    // 3️⃣ Enterprise: Workflow Termination sets status to CANCELLED (7) with previous_status = current status
    // This distinguishes it from Business Cancellation (which has previous_status < ASSIGNED)
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

    // 4️⃣ Order history - Store workflow termination (not business cancellation)
    $historyNote = sprintf(
        "Workflow terminated (internal close, previous_status: %d). Reason: %s",
        $currentStatus,
        $terminationReason
    );
    
    $history = $conn->prepare(
        "INSERT INTO order_history (order_id, status_id, user_id, role, note)
         VALUES (?, 7, ?, ?, ?)"
    );
    $historyRole = $role === "admin" ? "system" : $role; // order_history.role enum
    $history->bind_param("iiss", $orderId, $userId, $historyRole, $historyNote);
    $history->execute();

    // 5️⃣ DB system log
    $notify = new NotificationService($conn);
    $notify->log(
        "TERMINATE_WORKFLOW",
        "orders",
        $orderId,
        $userId
    );

    // 6️⃣ AUDIT LOG (FILE – ISO 27001)
    $auditLine = sprintf(
        "time=%s event=TERMINATE_WORKFLOW actor_id=%d actor_role=%s resource=order resource_id=%d previous_status=%d outcome=SUCCESS message=\"Terminate workflow for order %s\"\n",
        date("c"),
        $userId,
        $role,
        $orderId,
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

    // 7️⃣ Determine available actions after termination
    $canClone = ($currentStatus === 3); // ASSIGNED
    $canCreateFollowup = ($currentStatus >= 4); // IN_PROGRESS or later

    Response::success("Workflow terminated successfully", [
        "termination_type" => "workflow_termination",
        "previous_status" => $currentStatus,
        "can_clone" => $canClone,
        "can_create_followup" => $canCreateFollowup
    ]);

} catch (Exception $e) {
    if (isset($conn)) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackEx) {
            // Ignore rollback errors
        }
    }
    error_log("TERMINATE WORKFLOW ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError($e->getMessage());
} catch (Error $e) {
    if (isset($conn)) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackEx) {
            // Ignore rollback errors
        }
    }
    error_log("TERMINATE WORKFLOW FATAL ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError("System error: " . $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

