<?php
$host = "localhost";
$user = "root";
$pass = "root";
$dbname = "eproject";

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    die("DB ERROR: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");

// Mật khẩu mới muốn dùng cho admin
$newPlain = "Admin2024!";

// Tạo hash
$newHash = password_hash($newPlain, PASSWORD_DEFAULT);

// Update cho user id = 1
$stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = 1");
$stmt->bind_param("s", $newHash);
$stmt->execute();

echo "Done. New admin password = {$newPlain}";
