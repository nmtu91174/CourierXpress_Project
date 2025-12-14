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

$customer_id = isset($data['customer_id']) ? intval($data['customer_id']) : 6;
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

$assigned_agent_id = null; 

function generateOrderCode($conn) {  
    do {
        $prefix = "ORD";
        $number = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
        $code = $prefix . $number;
        $check = $conn->query("SELECT id FROM orders WHERE order_code = '$code'");
    } while ($check->num_rows > 0);
    return $code;
}

function generateInvoiceNumber($conn) { 
    do {
        $prefix = "INV";
        $number = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
        $code = $prefix . $number;
        $check = $conn->query("SELECT id FROM invoices WHERE invoice_number = '$code'");
    } while ($check->num_rows > 0);
    return $code;
}

$order_code = generateOrderCode($conn);
$invoice_number = generateInvoiceNumber($conn);

$conn->begin_transaction();
    try {
        // 3. TẠO ĐƠN HÀNG (orders)
        $stmt_order = $conn->prepare("INSERT INTO orders (
    customer_id, agent_id, order_code,
    sender_name, sender_phone, sender_address,
    receiver_name, receiver_phone, receiver_address,
    weight, category_id,
    length, width, height,
    service_type, status,
    total_amount, cod_amount, total_shipping_fee,
    payment_method_id,
    notes
) VALUES (
    ?, NULL, ?,
    ?, ?, ?,
    ?, ?, ?,
    ?, ?,
    ?, ?, ?,
    ?, 1,
    ?, ?, ?,
    ?, ?
)");
            $stmt_order->bind_param(
            "isssssssdidddidddss",
            $customer_id, $order_code,
            $sender_name, $sender_phone, $sender_address,
            $receiver_name, $receiver_phone, $receiver_address,
            $weight, $category_id,
            $length, $width, $height,
            $service_type_id,
            $total_amount_with_cod, $cod_amount, $total_shipping_fee,
            $payment_method_id,
            $notes
        );
        
        $stmt_order->execute();
        $order_id = $conn->insert_id;

        if ($stmt_order->affected_rows === 0) {
            throw new Exception("Không thể tạo đơn hàng.");
        }

        $stmt_order_fee = $conn->prepare("INSERT INTO order_fees (order_id, fee_id, amount) VALUES (?, ?, ?)");

        for ($i = 0; $i < count($fee_ids); $i++) {
            $fee_id = (int)$fee_ids[$i];
            $amount = (float)$fee_amounts[$i];
            if ($fee_id > 0 && $amount > 0) {
                $stmt_order_fee->bind_param("iid", $order_id, $fee_id, $amount);
                if (!$stmt_order_fee->execute()) {
                    throw new Exception("Lỗi khi chèn chi tiết phí (Fee ID: $fee_id) vào order_fees.");
                }
            }
        }
        
        // 5. TẠO HÓA ĐƠN (invoices) 
        $stmt_invoice = $conn->prepare("INSERT INTO invoices (order_id, invoice_number, total_amount, status, payment_method_id) 
                                        VALUES (?, ?, ?, 'unpaid', ?)");
        $stmt_invoice->bind_param("isdi", $order_id, $invoice_number, $total_shipping_fee, $payment_method_id); 
        $stmt_invoice->execute();
        
        // 6. LƯU LỊCH SỬ ĐƠN HÀNG (order_history) 
        if ($customer_id == 6) {
        $noteText = "Khách vãng lai tạo đơn hàng";
        } else {
            $getUser = $conn->prepare("SELECT name FROM users WHERE id = ?");
            $getUser->bind_param("i", $customer_id);
            $getUser->execute();
            $resultUser = $getUser->get_result();
            $userRow = $resultUser->fetch_assoc();

            $customerName = $userRow ? $userRow['name'] : "Khách hàng";

            $noteText = "Khách hàng $customerName đã tạo đơn hàng";
        }


        $stmt_history = $conn->prepare("
            INSERT INTO order_history (order_id, status_id, user_id, role, note) 
            VALUES (?, 1, ?, 'customer', ?)
        ");
        $stmt_history->bind_param("iis", $order_id, $customer_id, $noteText);
        $stmt_history->execute();


        // 7. TẠO YÊU CẦU DUYỆT ĐƠN (order_approvals) - agent_id là NULL
        $stmt_approval = $conn->prepare("INSERT INTO order_approvals (order_id, agent_id, status, note) VALUES (?, NULL, 'pending', 'Chờ Agent duyệt đơn')");
        $stmt_approval->bind_param("i", $order_id); 
        $stmt_approval->execute();
        
        // 8. LƯU ORDER IMAGES
        if (!empty($images) && is_array($images)) {
            $stmt_image = $conn->prepare("INSERT INTO order_images (order_id, image_url, type) VALUES (?, ?, 'pickup')");
            foreach ($images as $image_url) {
                $stmt_image->bind_param("is", $order_id, $image_url);
                $stmt_image->execute();
            }
        }
        
        $conn->commit();

        send_email_notification($receiver_email, $order_code, $total_shipping_fee, $cod_amount);
        echo json_encode([
            "status" => "success",
            "message" => "Đơn hàng đã được tạo thành công và đang chờ Agent duyệt.",
            "order_code" => $order_code,
            "receiver_email" => $receiver_email,  
            "total_shipping_fee" => $total_shipping_fee,
            "cod_amount" => $cod_amount,
            "total_amount_with_cod" => $total_amount_with_cod,
            "image_urls" => $uploaded_image_urls
        ]);

    } catch (Exception $e) {
        $conn->rollback();
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