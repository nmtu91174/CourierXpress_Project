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

// Danh sách mật khẩu cho các user tương ứng ID
$accounts = [
    1 => "Admin2024!",
    2 => "tuan12345",
    3 => "anh67890",
    4 => "longship1",
    5 => "phucship2"
];

foreach ($accounts as $id => $plainPassword) {
    $newHash = password_hash($plainPassword, PASSWORD_DEFAULT);

    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    
    if (!$stmt) {
        die("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("si", $newHash, $id);

    if (!$stmt->execute()) {
        die("Execute failed for user $id: " . $stmt->error);
    }

    echo "✔ User $id updated!<br>";
    
    $stmt->close();
}

echo "<br><strong>DONE — Passwords have been re-hashed successfully.</strong>";
