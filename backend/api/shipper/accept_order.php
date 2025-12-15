<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include "./db.php";

$input = json_decode(file_get_contents("php://input"), true);
$order_id = intval($input['order_id'] ?? 0);
$shipper_id = intval($input['shipper_id'] ?? 0);

if (!$order_id || !$shipper_id) {
  echo json_encode(["status"=>"error","message"=>"Missing params"]);
  exit;
}

$stmt = $conn->prepare("UPDATE orders SET shipper_id=?, status='assigned', pickup_time=NOW() WHERE id=?");
$stmt->bind_param("ii",$shipper_id,$order_id);
if ($stmt->execute()) echo json_encode(["status"=>"success","message"=>"Order accepted"]);
else echo json_encode(["status"=>"error","message"=>$conn->error]);
