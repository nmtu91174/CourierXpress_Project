<?php
// backend/api/users/get_shippers.php

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

// ==========================
// AUTH
// ==========================
require_login();
require_role(["admin", "agent"]);

// ==========================
// QUERY
// ==========================
$stmt = $conn->prepare("
    SELECT 
        id,
        name,
        email,
        phone
    FROM users
    WHERE role = 'shipper'
      AND status = 'active'
    ORDER BY name ASC
");

$stmt->execute();
$result = $stmt->get_result();

$shippers = [];
while ($row = $result->fetch_assoc()) {
    $row["id"] = (int)$row["id"];
    $shippers[] = $row;
}

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Danh sách shipper đang hoạt động", $shippers);
