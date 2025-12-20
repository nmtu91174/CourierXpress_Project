<?php
// backend/api/shipper/update_location.php
// Shipper sends GPS coordinates here periodically

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit();
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";

// 1. Auth Check
require_login();
require_role(["shipper"]);

$shipperId = $GLOBALS['auth_user']['id'];

// 2. Read Input
$data = json_decode(file_get_contents("php://input"), true);
$lat  = isset($data['lat']) ? (float)$data['lat'] : 0;
$lng  = isset($data['lng']) ? (float)$data['lng'] : 0;

if ($lat == 0 && $lng == 0) {
    Response::error("Invalid coordinates");
}

// 3. Upsert Location (Insert or Update if exists)
// Table `shipper_locations` must exist (shipper_id is PK)
$stmt = $conn->prepare("
    INSERT INTO shipper_locations (shipper_id, latitude, longitude, updated_at) 
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE 
        latitude = VALUES(latitude), 
        longitude = VALUES(longitude), 
        updated_at = NOW()
");

$stmt->bind_param("idd", $shipperId, $lat, $lng);

if ($stmt->execute()) {
    Response::success("Location updated");
} else {
    Response::serverError("Database error: " . $stmt->error);
}

$conn->close();
