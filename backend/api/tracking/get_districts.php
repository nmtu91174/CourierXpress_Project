<?php
// backend/api/tracking/get_districts.php
// Get all districts for coverage assignment

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";

// ==========================
// QUERY DISTRICTS
// ==========================
$stmt = $conn->prepare("
    SELECT 
        id,
        name
    FROM districts
    ORDER BY name ASC
");

$stmt->execute();
$result = $stmt->get_result();

$districts = [];
while ($row = $result->fetch_assoc()) {
    $districts[] = [
        "id" => (int)$row["id"],
        "name" => $row["name"]
    ];
}

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Districts list", $districts);

