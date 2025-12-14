<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

$host = "localhost";
$user = "root";
$pass = "root";
$dbname = "eproject";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die(json_encode([
        "status" => "error",
        "message" => "Không thể kết nối database!"
    ]));
}

$conn->set_charset("utf8mb4");

$data = json_decode(file_get_contents("php://input"), true);

$user_id = $data["user_id"] ?? null;

if (!$user_id) {
    echo json_encode([
        "status" => "error",
        "message" => "Thiếu user_id!"
    ]);
    exit();
}

// SQL lấy đơn hàng của user
$sql = "
   SELECT 
    o.*,
    s.description AS status_text,
    pm.name AS payment_method_name,
    c.name AS category_name,
    st.name AS service_type_name,
    st.fee AS service_fee,
    st.description AS service_description
FROM orders o
LEFT JOIN statuses s ON o.status = s.id
LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
LEFT JOIN item_categories c ON o.category_id = c.id
LEFT JOIN service_types st ON o.service_type = st.id
WHERE o.customer_id = ?
ORDER BY o.id DESC;
";



$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$orders = [];

while ($row = $result->fetch_assoc()) {
    $orders[] = $row;
}

echo json_encode([
    "status" => "success",
    "message" => "Lấy đơn hàng thành công!",
    "orders" => $orders
]);
