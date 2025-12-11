<?php
$host = "localhost";  
$user = "root";         
$pass = "root";             
$dbname = "eproject"; 

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die(json_encode([
        "status" => "error",
        "message" => "Kết nối database không thành công: " . $conn->connect_error
    ]));
}

$conn->set_charset("utf8mb4");
?>
