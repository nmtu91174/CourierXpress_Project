<?php
// backend/api/admin/create_order.php
// CREATE ORDER – dùng chung cho admin / agent / shipper / customer

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ OPTIONS phải exit sớm TRƯỚC middleware
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
require_once __DIR__ . "/../../services/OrderService.php";

// ==========================
// AUTH
// ==========================
require_login();
require_role(["admin", "agent", "shipper", "customer"]);

$userId = $GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// READ INPUT
// ==========================
// Hỗ trợ cả JSON và form-data
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

// Nếu không phải JSON, fallback về $_POST (cho upload ảnh)
if (json_last_error() !== JSON_ERROR_NONE || $data === null) {
    $data = $_POST;
}

// ==========================
// VALIDATION CƠ BẢN
// ==========================
$required = [
    "sender_name",
    "sender_phone",
    "sender_address",
    "receiver_name",
    "receiver_phone",
    "receiver_address",
    "item_name",
    "weight",
    "distance_km",
    "payment_method_id"
];

foreach ($required as $field) {
    if (empty($data[$field])) {
        Response::error("Thiếu dữ liệu: {$field}");
    }
}

// ==========================
// CUSTOMER_ID THEO ROLE
// ==========================
if ($role === "customer") {
    $data["customer_id"] = $userId;
} else {
    // admin / agent / shipper tạo hộ
    // Nếu không có customer_id, có thể tạo customer mới hoặc yêu cầu
    $data["customer_id"] = (int)($data["customer_id"] ?? 0);
    
    // Nếu admin tạo đơn mà không có customer_id, có thể:
    // Option 1: Yêu cầu customer_id (strict)
    // Option 2: Tự động tạo customer từ thông tin người nhận (nếu có)
    // Option 3: Cho phép tạo đơn không có customer (guest order)
    
    // Hiện tại: Yêu cầu customer_id nếu không phải customer
    // Nhưng nếu admin tạo đơn mới, có thể không có customer_id sẵn
    // → Cho phép admin tạo đơn mà không cần customer_id (sẽ tạo customer mới sau)
    if ($data["customer_id"] <= 0 && $role !== "admin") {
        Response::error("Thiếu customer_id");
    }
    
    // Nếu admin tạo đơn mà không có customer_id, set = 0 (sẽ xử lý sau)
    if ($data["customer_id"] <= 0 && $role === "admin") {
        // Admin có thể tạo đơn mà không cần customer_id
        // OrderService sẽ xử lý logic này
        $data["customer_id"] = 0; // Hoặc có thể tạo customer mới từ thông tin
    }
}

// ==========================
// UPLOAD ẢNH (NẾU CÓ) - SECURITY ENHANCED
// ==========================
$imageUrls = [];

if (!empty($_FILES["images"])) {
    $uploadDir = __DIR__ . "/../../uploads/order_images/";
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true); // More secure permissions
    }

    // Security: Allowed file types
    $allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
    ];
    
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $maxFileSize = 5 * 1024 * 1024; // 5MB per file
    $maxFiles = 5;

    // Validate file count
    $fileCount = count($_FILES["images"]["name"]);
    if ($fileCount > $maxFiles) {
        Response::error("Chỉ được upload tối đa {$maxFiles} ảnh");
    }

    foreach ($_FILES["images"]["tmp_name"] as $i => $tmp) {
        // Check upload error
        if ($_FILES["images"]["error"][$i] !== UPLOAD_ERR_OK) {
            continue;
        }

        $originalName = $_FILES["images"]["name"][$i];
        $fileSize = $_FILES["images"]["size"][$i];
        $fileType = $_FILES["images"]["type"][$i];
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        // Security Check 1: File size
        if ($fileSize > $maxFileSize) {
            Response::error("File '{$originalName}' quá lớn. Tối đa 5MB/file");
        }

        // Security Check 2: File extension
        if (!in_array($ext, $allowedExtensions)) {
            Response::error("File '{$originalName}' có định dạng không hợp lệ. Chỉ chấp nhận: JPG, PNG, GIF, WEBP");
        }

        // Security Check 3: MIME type
        if (!in_array($fileType, $allowedMimeTypes)) {
            Response::error("File '{$originalName}' có loại MIME không hợp lệ");
        }

        // Security Check 4: Verify it's actually an image (prevent fake extensions)
        $imageInfo = @getimagesize($tmp);
        if ($imageInfo === false) {
            Response::error("File '{$originalName}' không phải là ảnh hợp lệ");
        }

        // Security Check 5: Verify MIME type matches image type
        $detectedMime = $imageInfo['mime'];
        if (!in_array($detectedMime, $allowedMimeTypes)) {
            Response::error("File '{$originalName}' có định dạng không khớp");
        }

        // Generate secure filename (prevent path traversal)
        $safeFilename = "order_" . time() . "_" . bin2hex(random_bytes(8)) . "." . $ext;
        $targetPath = $uploadDir . $safeFilename;

        // Security Check 6: Prevent path traversal
        $realUploadDir = realpath($uploadDir);
        $realTargetPath = realpath(dirname($targetPath));
        if ($realTargetPath !== $realUploadDir) {
            Response::error("Đường dẫn file không hợp lệ");
        }

        // Move uploaded file
        if (!move_uploaded_file($tmp, $targetPath)) {
            Response::error("Không thể lưu file '{$originalName}'");
        }

        $imageUrls[] = "/uploads/order_images/" . $safeFilename;
    }
}

// ==========================
// CREATE ORDER
// ==========================
try {
    // Thêm actor_id và actor_role vào data để OrderService xử lý
    $data["actor_id"] = $userId;
    $data["actor_role"] = $role;
    
    // Thêm service_type mặc định nếu không có (OrderService yêu cầu)
    if (empty($data["service_type"])) {
        $data["service_type"] = 1; // Default service type
    }
    
    // Nếu admin tạo đơn mà không có customer_id, tạo customer mới từ thông tin người nhận
    if ($role === "admin" && ($data["customer_id"] ?? 0) <= 0) {
        // Tạo customer mới từ thông tin người nhận (hoặc người gửi)
        $phone = $data["receiver_phone"] ?? $data["sender_phone"] ?? "";
        if (!$phone) {
            Response::error("Thiếu số điện thoại để tạo customer");
        }
        
        $customerEmail = $phone . "@guest.courierxpress.com";
        $customerName = $data["receiver_name"] ?? $data["sender_name"] ?? "Guest Customer";
        
        // Kiểm tra xem customer đã tồn tại chưa (theo phone)
        $checkCustomer = $conn->prepare("SELECT id FROM users WHERE phone = ? AND role = 'customer' LIMIT 1");
        if (!$checkCustomer) {
            error_log("CREATE ORDER: Prepare checkCustomer failed: " . $conn->error);
            Response::serverError("Lỗi kiểm tra customer");
        }
        
        $checkCustomer->bind_param("s", $phone);
        if (!$checkCustomer->execute()) {
            error_log("CREATE ORDER: Execute checkCustomer failed: " . $checkCustomer->error);
            $checkCustomer->close();
            Response::serverError("Lỗi kiểm tra customer");
        }
        
        $customerResult = $checkCustomer->get_result();
        if ($customerResult->num_rows > 0) {
            $customerRow = $customerResult->fetch_assoc();
            $data["customer_id"] = (int)$customerRow["id"];
        } else {
            // Tạo customer mới
            $createCustomer = $conn->prepare("
                INSERT INTO users (name, email, password, role, phone, status, created_at)
                VALUES (?, ?, ?, 'customer', ?, 'active', NOW())
            ");
            if (!$createCustomer) {
                error_log("CREATE ORDER: Prepare createCustomer failed: " . $conn->error);
                $checkCustomer->close();
                Response::serverError("Lỗi tạo customer");
            }
            
            $defaultPassword = password_hash("guest123", PASSWORD_DEFAULT);
            $createCustomer->bind_param("ssss", $customerName, $customerEmail, $defaultPassword, $phone);
            if (!$createCustomer->execute()) {
                error_log("CREATE ORDER: Execute createCustomer failed: " . $createCustomer->error);
                $createCustomer->close();
                $checkCustomer->close();
                Response::serverError("Không thể tạo customer mới: " . $createCustomer->error);
            }
            
            $data["customer_id"] = $createCustomer->insert_id;
            $createCustomer->close();
        }
        $checkCustomer->close();
    }
    
    $service = new OrderService($conn);
    $result = $service->create(
        $data,
        $imageUrls
    );

    // Đảm bảo response có đầy đủ thông tin về phí vận chuyển
    $responseData = [
        "order_id" => $result["order_id"],
        "order_code" => $result["order_code"],
        "total_shipping_fee" => $result["shipping_fee"],
        "shipping_fee" => $result["shipping_fee"] // Alias để tương thích
    ];

    Response::success("Tạo đơn thành công!", $responseData);

} catch (Exception $e) {
    error_log("CREATE ORDER ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError("Lỗi tạo đơn: " . $e->getMessage());
} catch (Error $e) {
    error_log("CREATE ORDER FATAL ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError("Lỗi hệ thống: " . $e->getMessage());
}

$conn->close();
