<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

// ======================
// DB CONNECT
// ======================
$conn = new mysqli("localhost", "root", "root", "eproject");
$conn->set_charset("utf8mb4");

if ($conn->connect_error) {
    echo json_encode([
        "status" => "error",
        "message" => "Không thể kết nối database"
    ]);
    exit;
}

// ======================
// INPUT
// ======================
$data = json_decode(file_get_contents("php://input"), true);

$user_id    = $data['user_id'] ?? null;
$order_code = $data['order_code'] ?? null;

if (!$user_id || !$order_code) {
    echo json_encode([
        "status" => "error",
        "message" => "Thiếu user_id hoặc order_code"
    ]);
    exit;
}

// ======================
// 1. ORDER INFO
// ======================
$sql = "
SELECT 
    o.*,
    s.description AS status_text,
    st.name AS service_type_name,
    pm.name AS payment_method_name,
    c.name AS category_name
FROM orders o
LEFT JOIN statuses s ON o.status = s.id
LEFT JOIN service_types st ON o.service_type = st.id
LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
LEFT JOIN item_categories c ON o.category_id = c.id
WHERE o.customer_id = ? AND o.order_code = ?
LIMIT 1
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("is", $user_id, $order_code);
$stmt->execute();
$result = $stmt->get_result();

$order = $result->fetch_assoc();

if (!$order) {
    echo json_encode([
        "status" => "error",
        "message" => "Không tìm thấy đơn hàng hoặc không có quyền truy cập"
    ]);
    exit;
}

$order_id = $order['id'];

// ======================
// 2. ORDER HISTORY (TIMELINE)
// ======================
$historySql = "
SELECT 
    oh.status_id,
    s.description,
    oh.created_at
FROM order_history oh
JOIN statuses s ON oh.status_id = s.id
WHERE oh.order_id = ?
ORDER BY oh.created_at ASC
";

$historyStmt = $conn->prepare($historySql);
$historyStmt->bind_param("i", $order_id);
$historyStmt->execute();
$historyResult = $historyStmt->get_result();

$timeline = [];
while ($row = $historyResult->fetch_assoc()) {
    $timeline[] = [
        "statusId" => $row['status_id'],
        "label"    => $row['description'],
        "time"     => date("d/m/Y H:i", strtotime($row['created_at']))
    ];
}

// ======================
// 3. ORDER FEES
// ======================
$feeSql = "
SELECT 
    f.name,
    of.amount
FROM order_fees of
JOIN fees f ON of.fee_id = f.id
WHERE of.order_id = ?
";

$feeStmt = $conn->prepare($feeSql);
$feeStmt->bind_param("i", $order_id);
$feeStmt->execute();
$feeResult = $feeStmt->get_result();

$fees = [];
while ($row = $feeResult->fetch_assoc()) {
    $fees[] = $row;
}

// ======================
// 4. ORDER IMAGES
// ======================
$imgSql = "
SELECT image_url, type
FROM order_images
WHERE order_id = ?
";

$imgStmt = $conn->prepare($imgSql);
$imgStmt->bind_param("i", $order_id);
$imgStmt->execute();
$imgResult = $imgStmt->get_result();

$images = [];
while ($row = $imgResult->fetch_assoc()) {
    $images[] = $row;
}

$statusSql = "
SELECT id, description AS label
FROM statuses
ORDER BY id ASC
";

$statusRes = $conn->query($statusSql);

$statuses = [];
while ($row = $statusRes->fetch_assoc()) {
    $statuses[] = [
        "id"    => $row['id'],
        "label" => $row['label']
    ];
}

// ======================
// RESPONSE
// ======================
echo json_encode([
    "status" => "success",
    "order" => [
        "order_code"        => $order['order_code'],
        "sender"            => $order['sender_name'] . " - " . $order['sender_phone'],
        "receiver"          => $order['receiver_name'] . " - " . $order['receiver_phone'],
        "statusId"          => $order['status'],
        "statusDesc"        => $order['status_text'],
        "serviceTypeName"   => $order['service_type_name'],
        "weight"            => $order['weight'],
        "length"            => $order['length'],
        "width"             => $order['width'],
        "height"            => $order['height'],
        "total_amount"      => $order['total_amount'],
        "cod_amount"        => $order['cod_amount'],
        "notes"             => $order['notes'],
        "created_at"        => $order['created_at'],

        "statusId"          => $order['status'],
        "statuses"          => $statuses,
        "timeline"          => $timeline,

        "fees"              => $fees,
        "images"            => $images
    ]
]);

