<?php
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

require_once __DIR__ . "/../../middleware/require_login.php";

echo json_encode([
    "step" => 3,
    "auth_user" => $GLOBALS['auth_user'] ?? null
]);
