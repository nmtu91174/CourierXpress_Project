<?php
$host = "localhost";
$user = "root";
$pass = "root";
$dbname = "eproject";

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    die("DB connection failed: " . $conn->connect_error . PHP_EOL);
}
$conn->set_charset("utf8mb4");

$adminId = 1;
$newPlain = "Admin2024!";
$newHash = password_hash($newPlain, PASSWORD_DEFAULT);

// Ensure admin role is lowercase because frontend checks 'admin'
$sql = "UPDATE users SET role='admin', password=? WHERE id=?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    die("Prepare failed: " . $conn->error . PHP_EOL);
}
$stmt->bind_param("si", $newHash, $adminId);

if ($stmt->execute()) {
    echo "SUCCESS\n";
    echo "Admin ID: {$adminId}\n";
    echo "Password: {$newPlain}\n";
} else {
    echo "FAILED: " . $stmt->error . "\n";
}

$stmt->close();
$conn->close();
