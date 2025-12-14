<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "A\n";

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

echo "B\n";

require_once __DIR__ . "/../../middleware/require_login.php";
echo "C\n";

require_once __DIR__ . "/../../middleware/require_role.php";
echo "D\n";

require_login();
echo "E\n";

require_role(["admin", "agent", "shipper", "customer"]);
echo "F\n";

echo json_encode([
    "ok" => true,
    "auth_user" => $GLOBALS['auth_user'] ?? null
]);
