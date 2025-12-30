<?php
// backend/api/admin/get_customers.php
// Admin Customer Search - REAL DATA from users + orders tables

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================
// CORE
// ==========================
require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";

// ==========================
// AUTH - Admin only
// ==========================
require_login();
require_role(["admin"]);

$userId = (int)$GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// QUERY CUSTOMERS WITH ORDER COUNT
// ==========================
$sql = "
    SELECT 
        u.id,
        u.name,
        u.phone,
        u.email,
        u.status,
        u.created_at,
        COUNT(o.id) AS total_orders
    FROM users u
    LEFT JOIN orders o ON u.id = o.customer_id
    WHERE u.role = 'customer'
    GROUP BY u.id, u.name, u.phone, u.email, u.status, u.created_at
    ORDER BY u.created_at DESC
";

$result = $conn->query($sql);

if (!$result) {
    Response::serverError("Lỗi truy vấn database: " . $conn->error);
}

$customers = [];
while ($row = $result->fetch_assoc()) {
    $customers[] = [
        "id" => (int)$row["id"],
        "name" => $row["name"],
        "phone" => $row["phone"],
        "email" => $row["email"],
        "status" => $row["status"],
        "created_at" => $row["created_at"],
        "total_orders" => (int)$row["total_orders"],
    ];
}

Response::success("Lấy danh sách khách hàng thành công", [
    "customers" => $customers,
    "total" => count($customers),
]);

