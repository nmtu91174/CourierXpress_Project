<?php
// backend/api/admin/update_payment_method.php

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

require_login();
require_role(["admin"]);

$data = json_decode(file_get_contents("php://input"), true);

$id   = (int)($data["id"] ?? 0);
$code = trim($data["code"] ?? "");
$name = trim($data["name"] ?? "");

if ($id <= 0) {
    Response::error("Invalid payment method id");
}

if ($code === "" || $name === "") {
    Response::error("Code and name are required");
}

// Update
$stmt = $conn->prepare("
    UPDATE payment_methods
    SET code = ?, name = ?
    WHERE id = ?
");
$stmt->bind_param("ssi", $code, $name, $id);

if (!$stmt->execute()) {
    Response::serverError("Failed to update payment method");
}

if ($stmt->affected_rows === 0) {
    Response::error("Payment method not found", 404);
}

Response::success("Payment method updated successfully");
