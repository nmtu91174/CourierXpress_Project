<?php
// backend/api/admin/payment_methods_update.php

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

$id   = (int)($data["id"] ?? 0);
$code = trim($data["code"] ?? "");
$name = trim($data["name"] ?? "");

if ($id <= 0 || $code === "" || $name === "") {
    Response::error("Invalid input", 400);
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

// CHECK UNIQUE CODE (exclude current id)
$check2 = $conn->prepare("SELECT id FROM payment_methods WHERE code = ? AND id <> ? LIMIT 1");
$check2->bind_param("si", $code, $id);
$check2->execute();
$dup = $check2->get_result()->fetch_assoc();
$check2->close();

if ($dup) {
    Response::error("Code already exists", 409);
}

// UPDATE
$stmt = $conn->prepare("UPDATE payment_methods SET code = ?, name = ? WHERE id = ?");
$stmt->bind_param("ssi", $code, $name, $id);

if (!$stmt->execute()) {
    Response::serverError("Failed to update payment method");
}

$stmt->close();

// LOG
$notify = new NotificationService($conn);
$notify->log("UPDATE_PAYMENT_METHOD", "payment_methods", $id, $currentUserId);

Response::success("Updated payment method", [
    "id" => $id,
    "code" => $code,
    "name" => $name
]);
