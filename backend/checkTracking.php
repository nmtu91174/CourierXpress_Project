<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

$host = "localhost";
$user = "root";
$pass = "root";
$dbname = "eproject";

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    die(json_encode([
        "status" => "error",
        "message" => "Không thể kết nối database!"
    ]));
}
$conn->set_charset("utf8mb4");

$data = json_decode(file_get_contents("php://input"), true);
$trackingid = $data["trackingid"] ?? "";

if (!$trackingid) {
    echo json_encode(["status" => "error", "message" => "Thiếu mã vận đơn!"]);
    exit();
}

$sql = "SELECT id FROM orders WHERE order_code = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $trackingid);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo json_encode(["status" => "success", "exists" => true]);
} else {
    echo json_encode(["status" => "error", "exists" => false, "message" => "Mã vận đơn không tồn tại!"]);
}
?>
