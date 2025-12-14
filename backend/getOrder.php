<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET");
header("Content-Type: application/json");

$host = "localhost";
$user = "root";
$pass = "root";
$dbname = "eproject";

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    die(json_encode(["status"=>"error","message"=>"Không thể kết nối DB!"]));
}
$conn->set_charset("utf8mb4");

$order_code = $_GET['order_code'] ?? '';
if (!$order_code) {
    echo json_encode(["status"=>"error","message"=>"Thiếu mã vận đơn"]);
    exit();
}

$sql = "SELECT o.*, s.description as status_desc, st.name as service_type_name
        FROM orders o
        LEFT JOIN statuses s ON o.status = s.id
        LEFT JOIN service_types st ON o.service_type = st.id
        WHERE o.order_code = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $order_code);
$stmt->execute();
$result = $stmt->get_result();

if($result->num_rows === 0){
    echo json_encode(["status"=>"error","message"=>"Mã vận đơn không tồn tại"]);
    exit();
}

$order = $result->fetch_assoc();

$sqlHistory = "SELECT oh.*, s.description as status_desc, u.name as user_name 
               FROM order_history oh 
               LEFT JOIN statuses s ON oh.status_id = s.id 
               LEFT JOIN users u ON oh.user_id = u.id 
               WHERE oh.order_id = ? 
               ORDER BY oh.created_at ASC";
$stmtHist = $conn->prepare($sqlHistory);
$stmtHist->bind_param("i", $order['id']);
$stmtHist->execute();
$resHist = $stmtHist->get_result();
$timeline = [];
while($row = $resHist->fetch_assoc()){
    $timeline[] = [
        "statusId" => (int)$row['status_id'],
        "event" => $row['status_desc'] . ($row['note'] ? " ({$row['note']})" : ""),
        "time" => $row['created_at']
    ];
}

$resImages = $conn->query("SELECT * FROM order_images WHERE order_id={$order['id']}");
$images = [];
while($row = $resImages->fetch_assoc()){
    $images[] = $row;
}

$sqlFees = "SELECT of.id, f.name, of.amount
            FROM order_fees of
            LEFT JOIN fees f ON of.fee_id = f.id
            WHERE of.order_id = ?";
$stmtFees = $conn->prepare($sqlFees);
$stmtFees->bind_param("i", $order['id']);
$stmtFees->execute();
$resFees = $stmtFees->get_result();
$fees = [];
while($row = $resFees->fetch_assoc()){
    $fees[] = $row;
}

$resStatus = $conn->query("SELECT * FROM statuses ORDER BY id ASC");
$statuses = [];
while($row = $resStatus->fetch_assoc()){
    $statuses[] = [
        "id" => (int)$row['id'],
        "label" => $row['description']
    ];
}

echo json_encode([
    "status" => "success",
    "order" => [
        "order_code" => $order['order_code'],
        "statusId" => (int)$order['status'],
        "statusDesc" => $order['status_desc'],
        "sender" => "{$order['sender_name']} - {$order['sender_address']}",
        "receiver" => "{$order['receiver_name']} - {$order['receiver_address']}",
        "notes" => $order['notes'],
        "weight" => $order['weight'],
        "length" => $order['length'],
        "width" => $order['width'],
        "height" => $order['height'],
        "serviceTypeName" => $order['service_type_name'],
        "total_amount" => $order['total_amount'],
        "cod_amount" => $order['cod_amount'],
        "timeline" => $timeline,
        "statuses" => $statuses,
        "images" => $images,
        "fees" => $fees
    ]
]);
?>
