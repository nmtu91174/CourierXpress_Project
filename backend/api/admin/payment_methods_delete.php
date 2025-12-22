<?php
// backend/api/admin/payment_methods_delete.php

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";
require_once __DIR__ . "/../../services/NotificationService.php";

require_login();
require_role(["admin"]);

$currentUserId = $GLOBALS["auth_user"]["id"];

// INPUT
$data = json_decode(file_get_contents("php://input"), true);
$id = (int)($data["id"] ?? 0);

if ($id <= 0) {
    Response::error("Invalid id", 400);
}

// CHECK EXISTS
$check = $conn->prepare("SELECT id FROM payment_methods WHERE id = ? LIMIT 1");
$check->bind_param("i", $id);
$check->execute();
$exists = $check->get_result()->fetch_assoc();
$check->close();

if (!$exists) {
    Response::error("Payment method not found", 404);
}

// BUSINESS RULE: prevent delete if used in orders
// (Nếu DB bạn chưa có payment_method_id trong orders thì comment đoạn này)
$chkUsed = $conn->prepare("SELECT COUNT(*) AS cnt FROM orders WHERE payment_method_id = ?");
$chkUsed->bind_param("i", $id);
$chkUsed->execute();
$row = $chkUsed->get_result()->fetch_assoc();
$chkUsed->close();

if (($row["cnt"] ?? 0) > 0) {
    Response::error("Cannot delete: payment method is used in orders", 409);
}

// DELETE
$stmt = $conn->prepare("DELETE FROM payment_methods WHERE id = ?");
$stmt->bind_param("i", $id);

if (!$stmt->execute()) {
    Response::serverError("Failed to delete payment method");
}

$stmt->close();

// LOG
$notify = new NotificationService($conn);
$notify->log("DELETE_PAYMENT_METHOD", "payment_methods", $id, $currentUserId);

Response::success("Deleted payment method");
