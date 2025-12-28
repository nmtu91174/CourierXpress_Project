<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS"); 

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); 
    exit();
}

$upload_dir = __DIR__ . "/uploads/order_images/";
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$host = "localhost";
$user = "root";
$pass = "root"; 
$dbname = "eproject";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode([
        "status" => "error",
        "message" => "Không thể kết nối database: " . $conn->connect_error
    ]));
}

$conn->set_charset("utf8mb4");

$data = $_POST; 

// --- KIỂM TRA DỮ LIỆU INPUT ---
$required_fields = [
    'sender_name', 'sender_phone', 'sender_address',
    'receiver_name', 'receiver_phone', 'receiver_address',
    'receiver_email', 
    'category_id',
    'weight',
    'length', 'width', 'height',
    'service_type_id',
    'payment_method_id',
    'payer_type',
    'total_shipping_fee', 
    'total_amount_with_cod'
];


foreach ($required_fields as $field) {
    if (empty($data[$field]) && $field !== 'cod_amount') { 
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Thiếu trường bắt buộc hoặc giá trị không hợp lệ: " . $field]);
        exit();
    }
}

// ENTERPRISE: Get Guest Customer ID dynamically from DB (not hard-coded)
// Guest Customer is identified by email 'guest@system.local'
function getGuestCustomerId($conn) {
    $email = 'guest@system.local';
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND role = 'customer' LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        $stmt->close();
        return (int)$row['id'];
    }
    
    $stmt->close();
    throw new Exception("Guest Customer user not found in database (email: {$email}). Please ensure guest customer record exists.");
}

// Get customer_id: use provided ID or fetch Guest Customer ID from DB
$customer_id = isset($data['customer_id']) && (int)$data['customer_id'] > 0 
    ? (int)$data['customer_id'] 
    : getGuestCustomerId($conn); // Dynamically fetch Guest Customer ID from DB
$sender_name = $conn->real_escape_string($data['sender_name']);
$sender_phone = $conn->real_escape_string($data['sender_phone']);
$sender_address = $conn->real_escape_string($data['sender_address']);
$receiver_name = $conn->real_escape_string($data['receiver_name']);
$receiver_phone = $conn->real_escape_string($data['receiver_phone']);
$receiver_address = $conn->real_escape_string($data['receiver_address']);
$receiver_email = $conn->real_escape_string($data['receiver_email']); 
$category_id = (int) $data['category_id'];
$weight = (float) $data['weight'];
$length = (float) $data['length'];   
$width = (float) $data['width'];     
$height = (float) $data['height'];   
$service_type_id = (int) $data['service_type_id'];
$cod_amount = isset($data['cod_amount']) ? (float) $data['cod_amount'] : 0.00; 
$payment_method_id = (int) $data['payment_method_id'];
$notes = isset($data['note']) && trim($data['note']) !== '' 
         ? $conn->real_escape_string($data['note']) 
         : null;
$payer_type = isset($data['payer_type']) ? (int)$data['payer_type'] : 1;
if (!in_array($payer_type, [1, 2])) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Giá trị payer_type không hợp lệ (chỉ chấp nhận 1 hoặc 2)"
    ]);
    exit();
}

// ENTERPRISE GUARD: Receiver Pay = Cash only
// If payer_type = 2 (receiver pays), payment_method_id MUST be 1 (cash)
if ($payer_type === 2 && $payment_method_id !== 1) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Receiver Pay requires Cash payment method only. Payment method must be Cash (ID: 1)."
    ]);
    exit();
}

$total_shipping_fee = (float) $data['total_shipping_fee'];
$total_amount_with_cod = (float) $data['total_amount_with_cod'];


// --- XỬ LÝ UPLOAD FILE ---
$uploaded_image_urls = [];
if (isset($_FILES['images'])) {
    foreach ($_FILES['images']['error'] as $key => $error) {
        if ($error === UPLOAD_ERR_OK) {
            $file_tmp_name = $_FILES['images']['tmp_name'][$key];
            $file_name = $_FILES['images']['name'][$key];
            $file_ext = pathinfo($file_name, PATHINFO_EXTENSION);
            $new_file_name = uniqid('img_') . '.' . $file_ext;
            $file_destination = $upload_dir . $new_file_name;
            
            if (move_uploaded_file($file_tmp_name, $file_destination)) {
                $base_url = "http://localhost:8888/uploads/order_images/"; 
                $uploaded_image_urls[] = $base_url . $new_file_name;
            } 
        } 
    }
}
$images = $uploaded_image_urls;

$fee_ids = isset($_POST['fee_ids']) ? (array)$_POST['fee_ids'] : [];
$fee_amounts = isset($_POST['fee_amounts']) ? (array)$_POST['fee_amounts'] : [];

if (count($fee_ids) !== count($fee_amounts)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Dữ liệu chi tiết phí không đồng bộ."]);
    exit();
}

// ==========================
// ENTERPRISE: Use OrderService (no direct SQL)
// ==========================
require_once __DIR__ . "/services/OrderService.php";
require_once __DIR__ . "/services/FeeService.php";

// Extract pickup_district_id and pickup_ward_id for auto-routing
$pickup_district_id = null;
$pickup_ward_id = null;

// Method 1: Use provided IDs from frontend
if (isset($data['pickup_district_id']) && (int)$data['pickup_district_id'] > 0) {
    $pickup_district_id = (int)$data['pickup_district_id'];
}
if (isset($data['pickup_ward_id']) && (int)$data['pickup_ward_id'] > 0) {
    $pickup_ward_id = (int)$data['pickup_ward_id'];
}

// Method 2: Fallback - Lookup district_id from district name in sender_address
if ($pickup_district_id === null && !empty($sender_address)) {
    // Extract district name from sender_address (format: "street, ward, district, Hà Nội")
    $addressParts = explode(',', $sender_address);
    if (count($addressParts) >= 3) {
        $possibleDistrictName = trim($addressParts[count($addressParts) - 2]); // Second to last part
        
        // Try to find district by name
        $districtStmt = $conn->prepare("SELECT id FROM districts WHERE name = ? LIMIT 1");
        $districtStmt->bind_param("s", $possibleDistrictName);
        $districtStmt->execute();
        $districtResult = $districtStmt->get_result();
        if ($districtRow = $districtResult->fetch_assoc()) {
            $pickup_district_id = (int)$districtRow['id'];
            error_log("AUTO-ROUTING: Found district_id {$pickup_district_id} from district name: {$possibleDistrictName}");
        }
        $districtStmt->close();
    }
}

// Calculate distance_km if not provided (required by OrderService)
$distance_km = isset($data['distance_km']) && (float)$data['distance_km'] > 0
    ? (float)$data['distance_km']
    : 0; // Will be calculated by FeeService if needed

try {
    // Build data array for OrderService
    $orderData = [
        "customer_id" => $customer_id,
        "actor_id" => 0, // Guest: actor_id = 0
        "actor_role" => "guest", // ENTERPRISE: Guest role
        "sender_name" => $sender_name,
        "sender_phone" => $sender_phone,
        "sender_address" => $sender_address,
        "receiver_name" => $receiver_name,
        "receiver_phone" => $receiver_phone,
        "receiver_address" => $receiver_address,
        "receiver_email" => $receiver_email,
        "category_id" => $category_id,
        "weight" => (int)$weight, // OrderService expects INT (grams)
        "length" => $length,
        "width" => $width,
        "height" => $height,
        "service_type" => $service_type_id,
        "service_type_id" => $service_type_id, // Support both
        "payment_method_id" => $payment_method_id,
        "cod_amount" => $cod_amount,
        "payer_type" => $payer_type,
        "notes" => $notes,
        "pickup_district_id" => $pickup_district_id,
        "pickup_ward_id" => $pickup_ward_id,
        "distance_km" => $distance_km > 0 ? $distance_km : 10.0, // Default 10km if not provided
        // Fee IDs and amounts (if provided, OrderService will use them)
        "fee_ids" => $fee_ids,
        "fee_amounts" => $fee_amounts
    ];
        
    // Call OrderService to create order (handles all SQL, routing, approvals, history)
    $orderService = new OrderService($conn);
    $result = $orderService->create($orderData, $images);

    // Extract results
    $order_code = $result["order_code"];
    $order_id = $result["order_id"];
    $shipping_fee = $result["shipping_fee"];
    $total_amount = $result["total_with_cod"] ?? $shipping_fee;
    $auto_routed = isset($result["auto_routed"]) ? $result["auto_routed"] : false;
    $agent_id = isset($result["agent_id"]) ? $result["agent_id"] : null;

    // Send email notification
    send_email_notification($receiver_email, $order_code, $shipping_fee, $cod_amount);
    
    $success_message = $auto_routed
        ? "Đơn hàng đã được tạo thành công và đã tự động gán Agent."
        : "Đơn hàng đã được tạo thành công và đang chờ Agent duyệt.";
    
        echo json_encode([
            "status" => "success",
        "message" => $success_message,
            "order_code" => $order_code,
        "order_id" => $order_id,
            "receiver_email" => $receiver_email,  
        "total_shipping_fee" => $shipping_fee,
        "shipping_fee" => $shipping_fee, // Alias
            "cod_amount" => $cod_amount,
        "total_amount_with_cod" => $total_amount,
        "image_urls" => $uploaded_image_urls,
        "auto_routed" => $auto_routed,
        "agent_id" => $agent_id
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        $error_message = strstr($e->getMessage(), "Cannot add or update a child row") !== false 
            ? "Lỗi hệ thống: Vui lòng kiểm tra lại ID khóa ngoại (Foreign Key) hoặc cấu trúc dữ liệu."
            : "Lỗi hệ thống: " . $e->getMessage();
        echo json_encode(["status" => "error", "message" => $error_message]);
    }

$conn->close();

function send_email_notification($to_email, $order_code, $shipping_fee, $cod_amount) {
    $total = $shipping_fee + $cod_amount;
    $subject = "Xác nhận Đơn hàng: " . $order_code;
    $body = "Xin chào, \n\n";
    $body .= "Bạn đã tạo thành công một đơn hàng vận chuyển. \n\n";
    $body .= "Mã Vận Đơn (Tracking Code) của bạn là: " . $order_code . "\n";
    $body .= "Phí vận chuyển tạm tính: " . number_format($shipping_fee) . " VNĐ\n";
    $body .= "Tiền thu hộ (COD): " . number_format($cod_amount) . " VNĐ\n";
    $body .= "Tổng tiền thu (Phí Ship + COD): " . number_format($total) . " VNĐ\n\n";
    $body .= "Đơn hàng của bạn đang chờ Agent duyệt. Bạn sẽ nhận được thông báo tiếp theo sau khi duyệt.\n\n";
    $body .= "Trân trọng.";
    return true; 
}
?>