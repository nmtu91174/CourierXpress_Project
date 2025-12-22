<?php
// backend/api/shipper/list_to_pickup.php
// Shipper – Danh sách đơn cần lấy hàng

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
// METHOD CHECK
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    http_response_code(405);
    echo json_encode([
        "status"  => "error",
        "message" => "Method not allowed"
    ]);
    exit();
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
require_role(["shipper"]);

$shipperId = $GLOBALS['auth_user']['id'];

// ==========================
// QUERY – ĐƠN CẦN PICKUP
// status = 3 → đã assign shipper, chưa pickup
// ==========================
$sql = "
    SELECT
        o.id,
        o.order_code,
        o.sender_name,
        o.sender_phone,
        o.sender_address,
        o.receiver_name,
        o.receiver_phone,
        o.receiver_address,
        o.weight,
        o.cod_amount,
        o.created_at
    FROM orders o
    WHERE o.shipper_id = ?
      AND o.status = 3
    ORDER BY o.created_at ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $shipperId);
$stmt->execute();

$result = $stmt->get_result();
$orders = [];

while ($row = $result->fetch_assoc()) {
    $row["id"]         = (int)$row["id"];
    // [FIX] Weight is now in GRAMS (INT) in database
    $row["weight"]     = (int)$row["weight"];
    $row["cod_amount"] = (float)$row["cod_amount"];
    $row["created_at"] = date("Y-m-d H:i", strtotime($row["created_at"]));
    $orders[] = $row;
}

$stmt->close();
$conn->close();

// ==========================
// RESPONSE
// ==========================
Response::success("Orders to pickup", $orders);


// goi y frontend:
// orders.map(o => (
//  <Card key={o.id}>
//    <h6>{o.order_code}</h6>
//    <p>Sender: {o.sender_name}</p>
//    <p>Address: {o.sender_address}</p>
//    <Button onClick={() => confirmPickup(o.id)}>
//      Confirm Pickup
//    </Button>
//  </Card>
// ))
