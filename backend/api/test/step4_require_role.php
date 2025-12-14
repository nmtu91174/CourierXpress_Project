<?php
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

echo "A\n";

// ⚠️ BẮT BUỘC: require_login TRƯỚC
require_once __DIR__ . "/../../middleware/require_login.php";
require_login();

echo "B\n";

// Sau đó mới test require_role
require_once __DIR__ . "/../../middleware/require_role.php";
require_role(["admin"]);

echo "C\n";

echo json_encode([
    "step" => 4,
    "role_ok" => true,
    "auth_user" => $GLOBALS['auth_user']
]);
