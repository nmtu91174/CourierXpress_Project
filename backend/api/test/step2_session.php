<?php
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

require_once __DIR__ . "/../../core/SessionHelper.php";
SessionHelper::start();

echo json_encode([
    "step" => 2,
    "session_id" => session_id(),
    "session_data" => $_SESSION ?? null
]);
