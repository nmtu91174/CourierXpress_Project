<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include "./db.php";

$id = intval($_GET['shipper_id'] ?? 0);
if (!$id) { echo json_encode(["status"=>"error","message"=>"Missing shipper_id"]); exit; }

$data = [
  "pending" => 0,
  "assigned" => 0,
  "delivering" => 0,
  "completed" => 0
];

$stmt = $conn->prepare("SELECT status, COUNT(*) as c FROM orders WHERE shipper_id = ? GROUP BY status");
$stmt->bind_param("i",$id);
$stmt->execute();
$res = $stmt->get_result();
while ($r = $res->fetch_assoc()) {
  $data[$r['status']] = intval($r['c']);
}

echo json_encode(["status"=>"success","stats"=>$data]);
