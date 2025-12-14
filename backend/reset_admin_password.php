<?php
// ===========================
//  CONFIG GIỐNG db.php
// ===========================
$host = "localhost";
$user = "root";
$pass = "root";
$dbname = "eproject";

// Kết nối DB
$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    die("❌ Lỗi kết nối: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");

// ===========================
//  Mật khẩu mới
// ===========================
$newPlain = "Admin2024!";
$newHash = password_hash($newPlain, PASSWORD_DEFAULT);

// ===========================
//  UPDATE PASSWORD
// ===========================
$sql = "UPDATE users SET password = ? WHERE id = 1";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    die("❌ Lỗi PREPARE SQL: " . $conn->error);
}

$stmt->bind_param("s", $newHash);

if (!$stmt->execute()) {
    die("❌ Lỗi EXECUTE SQL: " . $stmt->error);
}

// ===========================
//  KIỂM TRA KẾT QUẢ
// ===========================
if ($stmt->affected_rows > 0) {
    echo "✅ Reset mật khẩu admin thành công!<br>";
    echo "👉 Mật khẩu mới: <b>{$newPlain}</b>";
} else {
    echo "⚠️ Không có dòng nào thay đổi!<br>";
    echo "Có 3 nguyên nhân:\n";
    echo "<ul>
            <li>Admin ID=1 không tồn tại</li>
            <li>Mật khẩu mới giống mật khẩu cũ → Bcrypt hash trùng salt hiếm khi xảy ra nhưng vẫn có thể</li>
            <li>DB đang dùng KHÔNG phải DB FE đang kết nối</li>
          </ul>";
}

$stmt->close();
$conn->close();
?>
