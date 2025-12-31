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

// Mật khẩu chung cho TẤT CẢ user
$plainPassword = "123456";
$newHash = password_hash($plainPassword, PASSWORD_DEFAULT);

// Update toàn bộ users
$stmt = $conn->prepare("UPDATE users SET password = ?");

if (!$stmt) {
    die("Prepare failed: " . $conn->error);
}

$stmt->bind_param("s", $newHash);

if (!$stmt->execute()) {
    die("Execute failed: " . $stmt->error);
}

$affected = $stmt->affected_rows;
$stmt->close();

echo "<strong>DONE</strong><br>";
echo "✔ All user passwords have been reset to <b>123456</b><br>";
echo "✔ Affected rows: $affected";
