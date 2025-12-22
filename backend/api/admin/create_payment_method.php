<?php
// backend/api/admin/create_payment_method.php

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

$code = trim($data["code"] ?? "");
$name = trim($data["name"] ?? "");

if ($code === "" || $name === "") {
    Response::error("Code and name are required");
}

// Check duplicate code
$check = $conn->prepare("SELECT id FROM payment_methods WHERE code = ?");
$check->bind_param("s", $code);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    Response::error("Payment method code already exists");
}
$check->close();

// Insert
$stmt = $conn->prepare("
    INSERT INTO payment_methods (code, name)
    VALUES (?, ?)
");
$stmt->bind_param("ss", $code, $name);

if (!$stmt->execute()) {
    Response::serverError("Failed to create payment method");
}

Response::success("Payment method created successfully", [
    "id" => $stmt->insert_id,
    "code" => $code,
    "name" => $name
]);
