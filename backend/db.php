<?php
header("Content-Type: application/json; charset=UTF-8");

$host = "localhost";
$user = "root";
$pass = "root"; 
$dbname = "eproject";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Kết nối database không thành công"
    ]);
    exit;
}

$conn->set_charset("utf8mb4");
?>