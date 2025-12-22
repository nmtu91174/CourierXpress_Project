<?php
// backend/api/shipper/get_profile.php


ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../logs/php_errors.log');



require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";

require_login();
require_role(["shipper"]);

$shipperId = (int)($GLOBALS["auth_user"]["id"] ?? 0);
if ($shipperId <= 0) {
    Response::error("Unauthorized.");
}

try {
    $sql = "
        SELECT 
            id,
            name,
            email,
            phone,
            address,
            avatar,
            gender,
            birthday,
            citizen_id,
            vehicle_plate,
            role,
            status,
            last_login,
            created_at,
            updated_at
        FROM users
        WHERE id = ? AND role = 'shipper'
        LIMIT 1
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        Response::serverError("SQL prepare failed: " . $conn->error);
    }

    $stmt->bind_param("i", $shipperId);
    $stmt->execute();
    $rs = $stmt->get_result();

    if ($rs->num_rows === 0) {
        $stmt->close();
        Response::error("Shipper account not found.");
    }

    $profile = $rs->fetch_assoc();
    $stmt->close();

    // Optional: normalize nulls
    $profile["phone"] = $profile["phone"] ?? "";
    $profile["address"] = $profile["address"] ?? "";
    $profile["avatar"] = $profile["avatar"] ?? "";
    $profile["gender"] = $profile["gender"] ?? "";
    $profile["birthday"] = $profile["birthday"] ?? null;
    $profile["citizen_id"] = $profile["citizen_id"] ?? "";
    $profile["vehicle_plate"] = $profile["vehicle_plate"] ?? "";

    Response::success("Profile fetched.", $profile);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
} finally {
    $conn->close();
}
