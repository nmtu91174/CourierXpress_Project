<?php
// backend/api/admin/payment_methods_create.php

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

$code = trim($data["code"] ?? "");
$name = trim($data["name"] ?? "");

if ($code === "" || $name === "") {
    Response::error("Code and name are required", 400);
}

// CHECK UNIQUE CODE
$check = $conn->prepare("SELECT id FROM payment_methods WHERE code = ? LIMIT 1");
$check->bind_param("s", $code);
$check->execute();
$exists = $check->get_result()->fetch_assoc();
$check->close();

if ($exists) {
    Response::error("Code already exists", 409);
}

// INSERT
$stmt = $conn->prepare("INSERT INTO payment_methods (code, name) VALUES (?, ?)");
$stmt->bind_param("ss", $code, $name);

if (!$stmt->execute()) {
    Response::serverError("Failed to create payment method");
}

$newId = $stmt->insert_id;
$stmt->close();

// LOG (optional but matches your update_user.php)
$notify = new NotificationService($conn);
$notify->log("CREATE_PAYMENT_METHOD", "payment_methods", $newId, $currentUserId);

Response::success("Created payment method", [
    "id" => $newId,
    "code" => $code,
    "name" => $name
]);
