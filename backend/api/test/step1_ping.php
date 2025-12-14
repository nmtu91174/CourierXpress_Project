<?php
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

echo json_encode([
    "step" => 1,
    "status" => "OK",
    "message" => "PHP + CORS hoạt động"
]);
