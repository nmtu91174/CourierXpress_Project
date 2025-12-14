<?php
// Simple Rate Limit: 60 requests / 1 minute / IP

$limit = 60;
$window = 60; // seconds

$ip = $_SERVER['REMOTE_ADDR'];
$key = "rate_" . md5($ip);

session_start();

if (!isset($_SESSION[$key])) {
    $_SESSION[$key] = [
        "count" => 1,
        "start" => time()
    ];
    return;
}

$elapsed = time() - $_SESSION[$key]["start"];

if ($elapsed <= $window) {
    if ($_SESSION[$key]["count"] >= $limit) {
        http_response_code(429);
        echo json_encode([
            "status" => "error",
            "message" => "Too many requests. Please try again later."
        ]);
        exit;
    }
    $_SESSION[$key]["count"]++;
} else {
    $_SESSION[$key] = [
        "count" => 1,
        "start" => time()
    ];
}

