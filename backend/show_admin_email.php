<?php
$host="localhost"; $user="root"; $pass="root"; $dbname="eproject";
$conn = new mysqli($host,$user,$pass,$dbname);
if($conn->connect_error) die("DB connection failed: ".$conn->connect_error.PHP_EOL);

$rs = $conn->query("SELECT id, email, role FROM users WHERE id=1");
$row = $rs ? $rs->fetch_assoc() : null;

if(!$row){
  echo "User id=1 not found\n";
} else {
  echo "ID: {$row['id']}\n";
  echo "Email: {$row['email']}\n";
  echo "Role: {$row['role']}\n";
}
$conn->close();
