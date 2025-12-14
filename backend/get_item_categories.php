<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$conn = new mysqli("localhost", "root", "root", "eproject");
$conn->set_charset("utf8mb4");

$result = $conn->query("SELECT id, name FROM item_categories ORDER BY id ASC");

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode($data);
?>
