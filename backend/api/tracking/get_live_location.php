<?php
// backend/api/tracking/get_live_location.php
// Public API for customer to track shipper location by Order Code

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";

// 1. Get Order Code
$orderCode = isset($_GET['order_code']) ? $_GET['order_code'] : '';

if (empty($orderCode)) {
    Response::error("Missing order_code");
}

// 2. Find Shipper assigned to this order and their location
// Join orders -> shipper_locations
$sql = "
    SELECT 
        sl.latitude, 
        sl.longitude, 
        sl.updated_at,
        u.name as shipper_name,
        u.phone as shipper_phone
    FROM orders o
    JOIN shipper_locations sl ON o.shipper_id = sl.shipper_id
    JOIN users u ON o.shipper_id = u.id
    WHERE o.order_code = ? 
      AND o.status IN (3, 4) -- Only track if Picking Up (3) or In Transit (4)
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $orderCode);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $data = $result->fetch_assoc();
    Response::success("Location found", $data);
} else {
    // Return success with null data means: Order exists but no shipper location yet (or status not tracking)
    Response::success("No active location data", null);
}

$conn->close();
