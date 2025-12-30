<?php
// backend/api/admin/mark_invoice_paid.php
// Mark invoice as paid - Update invoice status from 'unpaid' to 'paid'

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

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
// AUTH
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

if ($invoiceId <= 0) {
    Response::error("invoice_id is required and must be a positive integer");
}

// ==========================
// CHECK INVOICE EXISTS
// ==========================
$checkStmt = $conn->prepare("SELECT id, status, order_id FROM invoices WHERE id = ?");
$checkStmt->bind_param("i", $invoiceId);
$checkStmt->execute();
$result = $checkStmt->get_result();
$invoice = $result->fetch_assoc();
$checkStmt->close();

if (!$invoice) {
    Response::error("Invoice not found");
}

// ==========================
// VALIDATE STATUS
// ==========================
if ($invoice["status"] === "paid") {
    Response::error("Invoice is already marked as paid");
}

if ($invoice["status"] === "cancelled") {
    Response::error("Cannot mark cancelled invoice as paid");
}

// ==========================
// ROLE-BASED ACCESS CONTROL
// ==========================
if ($role === "agent") {
    // Agent can only mark invoices for orders they are assigned to
    $orderStmt = $conn->prepare("SELECT agent_id FROM orders WHERE id = ?");
    $orderStmt->bind_param("i", $invoice["order_id"]);
    $orderStmt->execute();
    $orderResult = $orderStmt->get_result();
    $order = $orderResult->fetch_assoc();
    $orderStmt->close();

    if (!$order || (int)$order["agent_id"] !== $userId) {
        Response::error("You don't have permission to mark this invoice as paid");
    }
}

// ==========================
// UPDATE INVOICE STATUS
// ==========================
$conn->begin_transaction();

try {
    // Update invoice status to 'paid'
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

    // Optional: Create payment record if payment_method_id exists
    $invoiceDetailStmt = $conn->prepare("
        SELECT payment_method_id, total_amount 
        FROM invoices 
        WHERE id = ?
    ");
    $invoiceDetailStmt->bind_param("i", $invoiceId);
    $invoiceDetailStmt->execute();
    $invoiceDetail = $invoiceDetailStmt->get_result()->fetch_assoc();
    $invoiceDetailStmt->close();

    // Create payment record if payment method exists
    if ($invoiceDetail && $invoiceDetail["payment_method_id"]) {
        $paymentStmt = $conn->prepare("
            INSERT INTO payments (invoice_id, method_id, amount, created_at)
            VALUES (?, ?, ?, NOW())
        ");
        $paymentStmt->bind_param(
            "iid",
            $invoiceId,
            $invoiceDetail["payment_method_id"],
            $invoiceDetail["total_amount"]
        );

        if (!$paymentStmt->execute()) {
            // Log error but don't fail the transaction
            error_log("Failed to create payment record: " . $paymentStmt->error);
        }
        $paymentStmt->close();
    }

    // Log the action
    $logStmt = $conn->prepare("
        INSERT INTO system_logs (user_id, action, entity, entity_id, scope, created_at)
        VALUES (?, ?, 'invoices', ?, 'BILLING', NOW())
    ");
    $action = "Marked invoice as paid";
    $logStmt->bind_param("isi", $userId, $action, $invoiceId);
    $logStmt->execute();
    $logStmt->close();

    $conn->commit();

    Response::success("Invoice marked as paid successfully", [
        "invoice_id" => $invoiceId,
        "status" => "paid",
    ]);
} catch (Throwable $e) {
    $conn->rollback();
    error_log("MARK_INVOICE_PAID_ERROR: " . $e->getMessage());
    Response::serverError("Failed to mark invoice as paid: " . $e->getMessage());
}

$conn->close();

