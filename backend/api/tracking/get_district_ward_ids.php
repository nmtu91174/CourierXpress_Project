<?php
// backend/api/tracking/get_district_ward_ids.php
// Get district_id and ward_id from names

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";

$data = json_decode(file_get_contents("php://input"), true);

$districtName = trim($data["district_name"] ?? "");
$wardName = trim($data["ward_name"] ?? "");

if (empty($districtName)) {
    Response::error("district_name is required");
}

// Get district_id
$stmt = $conn->prepare("SELECT id FROM districts WHERE name = ? LIMIT 1");
$stmt->bind_param("s", $districtName);
$stmt->execute();
$districtResult = $stmt->get_result();
$districtRow = $districtResult->fetch_assoc();
$stmt->close();

if (!$districtRow) {
    Response::error("District not found: {$districtName}");
}

$districtId = (int)$districtRow["id"];

// Get ward_id if ward_name provided
$wardId = null;
if (!empty($wardName)) {
    $stmt = $conn->prepare("
        SELECT w.id 
        FROM wards w
        JOIN districts d ON w.district_id = d.id
        WHERE w.name = ? AND d.id = ?
        LIMIT 1
    ");
    $stmt->bind_param("si", $wardName, $districtId);
    $stmt->execute();
    $wardResult = $stmt->get_result();
    $wardRow = $wardResult->fetch_assoc();
    $stmt->close();
    
    if ($wardRow) {
        $wardId = (int)$wardRow["id"];
    }
    // If ward not found, still return district_id (ward is optional)
}

Response::success("District and ward IDs", [
    "district_id" => $districtId,
    "ward_id" => $wardId
]);

$conn->close();

