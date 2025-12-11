<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "../../db.php";

// Lấy ID và Tên của các user là 'agent' và đang hoạt động
$sql = "SELECT id, name, email FROM users WHERE role = 'agent' AND status = 'active'";
$result = $conn->query($sql);

$agents = [];
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $agents[] = $row;
    }
}

echo json_encode(["status" => "success", "data" => $agents]);

$conn->close();
