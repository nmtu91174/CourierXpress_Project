<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/SessionHelper.php";

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid shipper id"]);
    exit;
}

$stmt = $conn->prepare("
    SELECT id, name, email, phone, address, avatar, citizen_id, vehicle_plate, created_at
    FROM users
    WHERE id = ? AND role = 'shipper'
");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Shipper not found"]);
    exit;
}

$shipper = $result->fetch_assoc();

// tính kinh nghiệm
$created = new DateTime($shipper['created_at']);
$now = new DateTime();
$diff = $now->diff($created);

$shipper['experience'] = $diff->y > 0
    ? "{$diff->y} năm {$diff->m} tháng"
    : "{$diff->m} tháng";

echo json_encode([
    "status" => "success",
    "shipper" => $shipper
]);
