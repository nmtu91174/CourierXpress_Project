<?php

mysqli_report(MYSQLI_REPORT_OFF); 

$host   = "localhost";
$user   = "root";
$pass   = "root";
$dbname = "eproject";

$conn = new mysqli($host, $user, $pass, $dbname);


if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => "Kết nối database không thành công"

    ]);
    exit;
}


$conn->set_charset("utf8mb4");
$conn->query("SET time_zone = '+07:00'");
