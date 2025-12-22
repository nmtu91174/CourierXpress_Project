<?php
$host="localhost";
$user="root";
$pass="root";
$dbname="eProject"; // đúng như script bạn gửi (chữ P hoa)

$conn = new mysqli($host,$user,$pass,$dbname);
if($conn->connect_error) die("DB connect failed: ".$conn->connect_error.PHP_EOL);
$conn->set_charset("utf8mb4");

$newPlain = "Admin2024!";
$newHash = password_hash($newPlain, PASSWORD_DEFAULT);

$stmt = $conn->prepare("UPDATE users SET password=?, role='admin' WHERE email='admin@gmail.com'");
$stmt->bind_param("s",$newHash);

if($stmt->execute()){
  echo "SUCCESS\n";
  echo "Email: admin@gmail.com\n";
  echo "Password: {$newPlain}\n";
} else {
  echo "FAILED: ".$stmt->error."\n";
}

$stmt->close();
$conn->close();
