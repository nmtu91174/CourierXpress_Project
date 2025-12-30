<?php
// backend/api/admin/invoices/mark_paid.php
// Mark invoice as paid - Strict business rules implementation
// Only Admin or Agent can mark invoice as PAID
// Invoice must be 'unpaid' and related order must be 'delivered' (status = 5)

// CORS Headers
require_once __DIR__ . "/../../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================
// CORE
// ==========================
require_once __DIR__ . "/../../../db.php";
require_once __DIR__ . "/../../../core/Response.php";
require_once __DIR__ . "/../../../middleware/require_login.php";
require_once __DIR__ . "/../../../middleware/require_role.php";

// ==========================
// AUTH - Only Admin or Agent (Shipper must NOT have permission)
// ==========================
require_login();
require_role(["admin", "agent"]);

$userId = (int)$GLOBALS['auth_user']['id'];
$role = $GLOBALS['auth_user']['role'];

// ==========================
// VALIDATE INPUT
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    Response::error("Method not allowed. Use POST.");
}

$input = json_decode(file_get_contents("php://input"), true);
$invoiceId = (int)($input["invoice_id"] ?? 0);
$paymentMethodId = isset($input["payment_method_id"]) ? (int)$input["payment_method_id"] : null;
$amount = isset($input["amount"]) ? (float)$input["amount"] : null;

if ($invoiceId <= 0) {
    Response::error("invoice_id is required and must be a positive integer");
}

// ==========================
// START TRANSACTION
// ==========================
$conn->begin_transaction();

try {
    // ==========================
    // STEP 1: Lock invoice row FOR UPDATE
    // ==========================
    $lockStmt = $conn->prepare("
        SELECT 
            inv.id,
            inv.status,
            inv.order_id,
            inv.total_amount,
            inv.payment_method_id,
            o.status AS order_status
        FROM invoices inv
        INNER JOIN orders o ON inv.order_id = o.id
        WHERE inv.id = ?
        FOR UPDATE
    ");
    $lockStmt->bind_param("i", $invoiceId);
    $lockStmt->execute();
    $result = $lockStmt->get_result();
    $invoice = $result->fetch_assoc();
    $lockStmt->close();

    if (!$invoice) {
        throw new Exception("Invoice not found");
    }

    // ==========================
    // STEP 2: Validate invoice.status = 'unpaid'
    // ==========================
    if ($invoice["status"] === "paid") {
        $conn->rollback();
        Response::error("Invoice is already marked as paid");
    }

    if ($invoice["status"] === "cancelled") {
        $conn->rollback();
        Response::error("Cannot mark cancelled invoice as paid");
    }

    if ($invoice["status"] !== "unpaid") {
        $conn->rollback();
        Response::error("Invoice status must be 'unpaid' to mark as paid. Current status: " . $invoice["status"]);
    }

    // ==========================
    // STEP 3: Validate related order.status = 5 (delivered)
    // ==========================
    if ((int)$invoice["order_status"] !== 5) {
        $conn->rollback();
        Response::error("Order must be delivered (status = 5) before marking invoice as paid. Current order status: " . $invoice["order_status"]);
    }

    // ==========================
    // STEP 4: UPDATE invoices SET status='paid', updated_at=NOW()
    // ==========================
    $updateStmt = $conn->prepare("
        UPDATE invoices 
        SET status = 'paid', updated_at = NOW()
        WHERE id = ?
    ");
    $updateStmt->bind_param("i", $invoiceId);

    if (!$updateStmt->execute()) {
        throw new Exception("Failed to update invoice: " . $updateStmt->error);
    }
    $updateStmt->close();

    // ==========================
    // STEP 5: INSERT INTO payments
    // ==========================
    // Use provided payment_method_id or fallback to invoice's payment_method_id
    $finalPaymentMethodId = $paymentMethodId ?? $invoice["payment_method_id"];
    // Use provided amount or fallback to invoice's total_amount
    $finalAmount = $amount ?? $invoice["total_amount"];

    if ($finalPaymentMethodId) {
        $paymentStmt = $conn->prepare("
            INSERT INTO payments (invoice_id, method_id, amount, created_at)
            VALUES (?, ?, ?, NOW())
        ");
        $paymentStmt->bind_param("iid", $invoiceId, $finalPaymentMethodId, $finalAmount);

        if (!$paymentStmt->execute()) {
            throw new Exception("Failed to create payment record: " . $paymentStmt->error);
        }
        $paymentStmt->close();
    }

    // ==========================
    // STEP 6: INSERT INTO system_logs
    // ==========================
    $logStmt = $conn->prepare("
        INSERT INTO system_logs (user_id, action, entity, entity_id, scope, created_at)
        VALUES (?, ?, 'invoices', ?, 'BILLING', NOW())
    ");
    $action = "Mark invoice as paid";
    $logStmt->bind_param("isi", $userId, $action, $invoiceId);

    if (!$logStmt->execute()) {
        throw new Exception("Failed to create system log: " . $logStmt->error);
    }
    $logStmt->close();

    // ==========================
    // STEP 7: INSERT INTO audit_log
    // ==========================
    $auditPayload = json_encode([
        "invoice_id" => $invoiceId,
        "order_id" => $invoice["order_id"],
        "amount" => $finalAmount,
        "payment_method_id" => $finalPaymentMethodId,
        "previous_status" => "unpaid",
        "new_status" => "paid",
    ]);

    $auditStmt = $conn->prepare("
        INSERT INTO audit_log (
            actor_user_id,
            actor_role,
            action,
            entity,
            entity_id,
            payload,
            created_at
        )
        VALUES (?, ?, 'MARK_INVOICE_PAID', 'invoice', ?, ?, NOW())
    ");
    $auditStmt->bind_param("isis", $userId, $role, $invoiceId, $auditPayload);

    if (!$auditStmt->execute()) {
        // Log error but don't fail transaction (audit_log is optional)
        error_log("Failed to create audit log: " . $auditStmt->error);
    }
    $auditStmt->close();

    // ==========================
    // COMMIT TRANSACTION
    // ==========================
    $conn->commit();

    Response::success("Invoice marked as paid successfully", [
        "invoice_id" => $invoiceId,
        "order_id" => $invoice["order_id"],
        "status" => "paid",
        "amount" => $finalAmount,
        "payment_method_id" => $finalPaymentMethodId,
    ]);
} catch (Throwable $e) {
    $conn->rollback();
    error_log("MARK_INVOICE_PAID_ERROR: " . $e->getMessage());
    Response::serverError("Failed to mark invoice as paid: " . $e->getMessage());
}

$conn->close();

