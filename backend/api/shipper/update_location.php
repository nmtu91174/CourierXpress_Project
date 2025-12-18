<?php
// backend/api/shipper/update_location.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once '../../db.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->shipper_id) || !isset($data->lat) || !isset($data->lng)) {
    http_response_code(400);
    exit();
}

$shipper_id = intval($data->shipper_id);
$lat = floatval($data->lat);
$lng = floatval($data->lng);

// Insert or Update (Upsert)
$sql = "INSERT INTO shipper_locations (shipper_id, latitude, longitude) 
        VALUES (?, ?, ?) 
        ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude)";

$stmt = $conn->prepare($sql);
$stmt->bind_param("idd", $shipper_id, $lat, $lng);
$stmt->execute();

echo json_encode(["status" => "ok"]);
$conn->close();
