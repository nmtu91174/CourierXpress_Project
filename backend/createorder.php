<?php
// createorder.php - VER 2.6 (HỖ TRỢ UPLOAD FILE ẢNH THỰC TẾ)

header("Access-Control-Allow-Origin: *");
// LƯU Ý: Không cần Content-Type, Access-Control-Allow-Headers với FormData
header("Access-Control-Allow-Methods: POST, GET, OPTIONS"); 

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); 
    exit();
}

// Cấu hình thư mục upload (Đảm bảo thư mục này tồn tại và có quyền ghi)
$upload_dir = __DIR__ . "/uploads/order_images/";
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

// THAY THẾ THÔNG TIN DB CỦA BẠN
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

// *** THAY ĐỔI LỚN: ĐỌC DỮ LIỆU TỪ $_POST VÀ $_FILES THAY VÌ JSON ***
// Lấy dữ liệu từ $_POST (dữ liệu form)
$data = $_POST; 

// --- KIỂM TRA DỮ LIỆU INPUT ---
$required_fields = ['sender_name', 'sender_phone', 'sender_address', 
                    'receiver_name', 'receiver_phone', 'receiver_address', 
                    'receiver_email', 'item_name', 'weight', 
                    'length', 'width', 'height', 'service_type', 
                    'payment_method_id']; 

foreach ($required_fields as $field) {
    // Điều chỉnh kiểm tra: đọc từ $data
    if (empty($data[$field]) && $field !== 'cod_amount') { 
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Thiếu trường bắt buộc: " . $field]);
        exit();
    }
}

// Lấy dữ liệu và làm sạch
$customer_id = 6; 
$sender_name = $conn->real_escape_string($data['sender_name']);
$sender_phone = $conn->real_escape_string($data['sender_phone']);
$sender_address = $conn->real_escape_string($data['sender_address']);
$receiver_name = $conn->real_escape_string($data['receiver_name']);
$receiver_phone = $conn->real_escape_string($data['receiver_phone']);
$receiver_address = $conn->real_escape_string($data['receiver_address']);
$receiver_email = $conn->real_escape_string($data['receiver_email']); 
$item_name = $conn->real_escape_string($data['item_name']);
$weight = (float) $data['weight'];
$length = (float) $data['length'];   
$width = (float) $data['width'];     
$height = (float) $data['height'];   
$service_type = (int) $data['service_type']; 
$cod_amount = isset($data['cod_amount']) ? (float) $data['cod_amount'] : 0.00; 
$payment_method_id = (int) $data['payment_method_id'];
// $images: Sẽ được xử lý sau

// --- XỬ LÝ UPLOAD FILE ---
$uploaded_image_urls = [];
// Lặp qua mảng file được gửi lên từ Frontend (name="images[]")
if (isset($_FILES['images'])) {
    foreach ($_FILES['images']['error'] as $key => $error) {
        if ($error === UPLOAD_ERR_OK) {
            $file_tmp_name = $_FILES['images']['tmp_name'][$key];
            $file_name = $_FILES['images']['name'][$key];
            $file_ext = pathinfo($file_name, PATHINFO_EXTENSION);
            
            // Tạo tên file duy nhất để tránh trùng lặp
            $new_file_name = uniqid('img_') . '.' . $file_ext;
            $file_destination = $upload_dir . $new_file_name;
            
            if (move_uploaded_file($file_tmp_name, $file_destination)) {
                // Lưu URL tương đối của ảnh để đưa vào DB
                // Điều chỉnh đường dẫn này tùy theo cấu hình web server của bạn
                $base_url = "http://localhost:8888/uploads/order_images/"; 
                $uploaded_image_urls[] = $base_url . $new_file_name;
            } else {
                // Xử lý lỗi: Không thể di chuyển file
                // Có thể rollback và báo lỗi nếu upload file là bắt buộc
            }
        } else if ($error !== UPLOAD_ERR_NO_FILE) {
             // Xử lý các lỗi upload khác (quá kích thước, lỗi server,...)
             // Để đơn giản, ta chỉ log lỗi này và không break
        }
    }
}
$images = $uploaded_image_urls; // Dùng mảng URL đã upload để đưa vào DB

// --- LOGIC CHỈ ĐỊNH AGENT --- (Giữ nguyên)
$assigned_agent_id = null; 

// --- HÀM HỖ TRỢ (Giữ nguyên) ---
function generateOrderCode($conn) {
    // ... (Giữ nguyên)
    do {
        $prefix = "ORD";
        $number = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
        $code = $prefix . $number;
        $check = $conn->query("SELECT id FROM orders WHERE order_code = '$code'");
    } while ($check->num_rows > 0);
    return $code;
}

function generateInvoiceNumber($conn) {
    // ... (Giữ nguyên)
    do {
        $prefix = "INV";
        $number = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
        $code = $prefix . $number;
        $check = $conn->query("SELECT id FROM invoices WHERE invoice_number = '$code'");
    } while ($check->num_rows > 0);
    return $code;
}

// --- BƯỚC 1 & 2: MÃ VẬN ĐƠN VÀ TÍNH TOÁN PHÍ (Giữ nguyên) ---
$order_code = generateOrderCode($conn);
$invoice_number = generateInvoiceNumber($conn);

$base_fee_id = 0;
$base_amount = 0;
$weight_fee_id = 0; 
$extra_weight_fee = 0;
$total_shipping_fee = 0;
$cod_fee_id = 4;

$stmt_fee = $conn->prepare("SELECT id, amount FROM fees WHERE code = 'base_fee'");
$stmt_fee->execute();
$result_fee = $stmt_fee->get_result();

if ($result_fee->num_rows > 0) {
    $fee_row = $result_fee->fetch_assoc();
    $base_fee_id = $fee_row['id'];
    $base_amount = $fee_row['amount'];
    $total_shipping_fee += $base_amount;

    if ($weight > 2.0) {
        $stmt_weight_fee = $conn->prepare("SELECT id, amount FROM fees WHERE code = 'weight_fee'");
        $stmt_weight_fee->execute();
        $result_weight_fee = $stmt_weight_fee->get_result();
        
        if ($result_weight_fee->num_rows > 0) {
            $weight_fee_row = $result_weight_fee->fetch_assoc();
            $weight_fee_id = $weight_fee_row['id'];
            $extra_weight_fee = $weight_fee_row['amount'] * ceil($weight - 2.0); 
            $total_shipping_fee += $extra_weight_fee;
        }
    }
    
    // Xử lý phí dịch vụ Hỏa tốc
    if ($service_type === 2) {
        $rush_fee_amount = 10000.00; 
        $total_shipping_fee += $rush_fee_amount;
    }

} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Không tìm thấy phí cơ bản (base_fee) trong hệ thống."]);
    exit();
}

$total_amount_with_cod = $total_shipping_fee + $cod_amount;

// --- BƯỚC 3-9: TRANSACTION ---
$conn->begin_transaction();
try {
    // 3. TẠO ĐƠN HÀNG (orders)
    $stmt_order = $conn->prepare("INSERT INTO orders (customer_id, agent_id, order_code, sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, weight, item_name, length, width, height, service_type, status, total_amount, cod_amount, total_shipping_fee, payment_method_id)
                                 VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)");
    
    $stmt_order->bind_param("isssssssdsdddidddi", 
        $customer_id, $order_code, $sender_name, $sender_phone, $sender_address, 
        $receiver_name, $receiver_phone, $receiver_address, $weight, $item_name, 
        $length, $width, $height, $service_type, 
        $total_amount_with_cod, $cod_amount, $total_shipping_fee, $payment_method_id); 
    
    $stmt_order->execute();
    $order_id = $conn->insert_id;

    if ($stmt_order->affected_rows === 0) {
        throw new Exception("Không thể tạo đơn hàng.");
    }
    
    // 4. LƯU PHÍ CƠ BẢN (order_fees) 
    $stmt_fee_base = $conn->prepare("INSERT INTO order_fees (order_id, fee_id, amount) VALUES (?, ?, ?)");
    $stmt_fee_base->bind_param("iid", $order_id, $base_fee_id, $base_amount);
    $stmt_fee_base->execute();

    if ($weight_fee_id > 0 && $extra_weight_fee > 0) {
        $stmt_fee_weight = $conn->prepare("INSERT INTO order_fees (order_id, fee_id, amount) VALUES (?, ?, ?)");
        $stmt_fee_weight->bind_param("iid", $order_id, $weight_fee_id, $extra_weight_fee);
        $stmt_fee_weight->execute();
    }
    
    // 5. LƯU TIỀN THU HỘ (COD) - Nếu có
    if ($cod_amount > 0) {
        $stmt_cod = $conn->prepare("INSERT INTO order_fees (order_id, fee_id, amount) VALUES (?, ?, ?)");
        $stmt_cod->bind_param("iid", $order_id, $cod_fee_id, $cod_amount); 
        $stmt_cod->execute();
    }

    // 6. TẠO HÓA ĐƠN (invoices) 
    $stmt_invoice = $conn->prepare("INSERT INTO invoices (order_id, invoice_number, total_amount, status, payment_method_id) 
                                     VALUES (?, ?, ?, 'unpaid', ?)");
    $stmt_invoice->bind_param("isdi", $order_id, $invoice_number, $total_shipping_fee, $payment_method_id); 
    $stmt_invoice->execute();
    
    // 7. LƯU LỊCH SỬ ĐƠN HÀNG (order_history) 
    $stmt_history = $conn->prepare("INSERT INTO order_history (order_id, status_id, user_id, role, note) VALUES (?, 1, ?, 'customer', 'Khách vãng lai tạo đơn hàng')");
    $stmt_history->bind_param("ii", $order_id, $customer_id);
    $stmt_history->execute();

    // 8. TẠO YÊU CẦU DUYỆT ĐƠN (order_approvals) - agent_id là NULL
    $stmt_approval = $conn->prepare("INSERT INTO order_approvals (order_id, agent_id, status, note) VALUES (?, NULL, 'pending', 'Chờ Agent duyệt đơn')");
    $stmt_approval->bind_param("i", $order_id); 
    $stmt_approval->execute();
    
    // 9. LƯU ORDER IMAGES (Dùng $images đã được cập nhật từ file upload)
    if (!empty($images) && is_array($images)) {
        $stmt_image = $conn->prepare("INSERT INTO order_images (order_id, image_url, type) VALUES (?, ?, 'pickup')");
        foreach ($images as $image_url) {
            $stmt_image->bind_param("is", $order_id, $image_url);
            $stmt_image->execute();
        }
    }
    
    $conn->commit();

    // GỬI EMAIL THÔNG BÁO
    send_email_notification($receiver_email, $order_code, $total_shipping_fee, $cod_amount);

    // --- TRẢ KẾT QUẢ VỀ FRONTEND ---
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
    // ... (Giữ nguyên)
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