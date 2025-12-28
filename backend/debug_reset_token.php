<?php
// backend/debug_reset_token.php
// Debug script to check password reset tokens

require_once __DIR__ . "/db.php";
require_once __DIR__ . "/core/Response.php";

header("Content-Type: application/json; charset=utf-8");

// Get token from query string
$token = $_GET["token"] ?? "";

if (empty($token)) {
    echo json_encode([
        "status" => "error",
        "message" => "Token is required"
    ]);
    exit;
}

echo "=== DEBUG RESET TOKEN ===\n";
echo "Raw Token: " . $token . "\n";
echo "Token Length: " . strlen($token) . "\n";

// Hash token
$tokenHash = hash("sha256", $token);
echo "Token Hash: " . $tokenHash . "\n";
echo "Token Hash Length: " . strlen($tokenHash) . "\n\n";

// Check if table exists
$tableCheck = $conn->query("SHOW TABLES LIKE 'password_reset_tokens'");
if ($tableCheck->num_rows === 0) {
    echo "ERROR: password_reset_tokens table does not exist!\n";
    exit;
}

// Get all tokens for this hash
$stmt = $conn->prepare("
    SELECT 
        prt.id,
        prt.user_id,
        prt.token_hash,
        prt.expires_at,
        prt.used,
        prt.created_at,
        u.email,
        u.name,
        u.role,
        NOW() as current_time
    FROM password_reset_tokens prt
    LEFT JOIN users u ON prt.user_id = u.id
    WHERE prt.token_hash = ?
");
$stmt->bind_param("s", $tokenHash);
$stmt->execute();
$result = $stmt->get_result();

echo "=== TOKEN SEARCH RESULTS ===\n";
if ($result->num_rows === 0) {
    echo "No token found with this hash.\n\n";
    
    // Show all recent tokens
    echo "=== RECENT TOKENS (Last 10) ===\n";
    $allTokens = $conn->query("
        SELECT 
            prt.id,
            prt.user_id,
            prt.token_hash,
            prt.expires_at,
            prt.used,
            prt.created_at,
            u.email
        FROM password_reset_tokens prt
        LEFT JOIN users u ON prt.user_id = u.id
        ORDER BY prt.created_at DESC
        LIMIT 10
    ");
    
    while ($row = $allTokens->fetch_assoc()) {
        echo "ID: {$row['id']}, User: {$row['email']}, Hash: " . substr($row['token_hash'], 0, 20) . "...";
        echo ", Used: {$row['used']}, Expires: {$row['expires_at']}\n";
    }
} else {
    while ($row = $result->fetch_assoc()) {
        echo "Token ID: {$row['id']}\n";
        echo "User ID: {$row['user_id']}\n";
        echo "User Email: {$row['email']}\n";
        echo "User Name: {$row['name']}\n";
        echo "User Role: {$row['role']}\n";
        echo "Token Hash: {$row['token_hash']}\n";
        echo "Created: {$row['created_at']}\n";
        echo "Expires: {$row['expires_at']}\n";
        echo "Current Time: {$row['current_time']}\n";
        echo "Used: {$row['used']}\n";
        
        // Check if expired
        $expires = strtotime($row['expires_at']);
        $now = strtotime($row['current_time']);
        if ($expires < $now) {
            echo "STATUS: EXPIRED\n";
        } else {
            echo "STATUS: VALID (expires in " . round(($expires - $now) / 60) . " minutes)\n";
        }
        
        if ($row['used'] == 1) {
            echo "STATUS: ALREADY USED\n";
        }
    }
}

$stmt->close();
$conn->close();

