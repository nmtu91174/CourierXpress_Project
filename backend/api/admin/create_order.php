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
require_once __DIR__ . "/../../services/NotificationService.php";

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
    "weight",
    // distance_km is NOT required - will be calculated automatically if not provided
    "payment_method_id",
    "payer_type"
];

foreach ($required as $field) {
    if (empty($data[$field]) && $field !== "cod_amount") {
        Response::error("Thiếu dữ liệu: {$field}");
    }
}

// Validate payer_type
$payerType = (int)($data["payer_type"] ?? 1);
if (!in_array($payerType, [1, 2], true)) {
    Response::error("payer_type phải là 1 (Người gửi trả) hoặc 2 (Người nhận trả)");
}

// ENTERPRISE GUARD: Receiver Pay = Cash only
// If payer_type = 2 (receiver pays), payment_method_id MUST be 1 (cash)
$paymentMethodId = (int)($data["payment_method_id"] ?? 1);
if ($payerType === 2 && $paymentMethodId !== 1) {
    Response::error("Receiver Pay requires Cash payment method only. Payment method must be Cash (ID: 1).");
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
    if (empty($data["service_type"]) && empty($data["service_type_id"])) {
        $data["service_type"] = 1; // Default service type
    } elseif (!empty($data["service_type_id"])) {
        // Support both service_type and service_type_id
        $data["service_type"] = $data["service_type_id"];
    }
    
    // Ensure payer_type is set (default to 1 = Người gửi trả)
    if (empty($data["payer_type"])) {
        $data["payer_type"] = 1;
    }
    
    // Frontend always sends weight in GRAMS (INT)
    // No conversion needed - just ensure it's an integer
    if (isset($data["weight"])) {
        $data["weight"] = (int)$data["weight"];
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
    
    // Extract pickup_district_id and pickup_ward_id if provided
    // These are used for auto-routing
    $pickupDistrictId = null;
    $pickupWardId = null;
    
    if (isset($data["pickup_district_id"]) && (int)$data["pickup_district_id"] > 0) {
        $pickupDistrictId = (int)$data["pickup_district_id"];
        $data["pickup_district_id"] = $pickupDistrictId;
    }
    if (isset($data["pickup_ward_id"]) && (int)$data["pickup_ward_id"] > 0) {
        $pickupWardId = (int)$data["pickup_ward_id"];
        $data["pickup_ward_id"] = $pickupWardId;
    }
    
    // Fallback: Lookup district_id from sender_address if not provided
    if ($pickupDistrictId === null && !empty($data["sender_address"])) {
        // Extract district name from sender_address (format: "street, ward, district, Hà Nội")
        $addressParts = explode(',', $data["sender_address"]);
        if (count($addressParts) >= 3) {
            $possibleDistrictName = trim($addressParts[count($addressParts) - 2]); // Second to last part
            
            // Try to find district by name
            $districtStmt = $conn->prepare("SELECT id FROM districts WHERE name = ? LIMIT 1");
            $districtStmt->bind_param("s", $possibleDistrictName);
            $districtStmt->execute();
            $districtResult = $districtStmt->get_result();
            if ($districtRow = $districtResult->fetch_assoc()) {
                $pickupDistrictId = (int)$districtRow['id'];
                $data["pickup_district_id"] = $pickupDistrictId;
                error_log("AUTO-ROUTING: Found district_id {$pickupDistrictId} from district name: {$possibleDistrictName}");
            }
            $districtStmt->close();
        }
    }
    
    // ==========================
    // DISTANCE HANDLING - SAME AS createorder.php
    // ==========================
    // ENTERPRISE: Use distance_km from frontend if provided, otherwise default to 10.0
    // Do NOT calculate automatically - let frontend handle distance calculation
    // (Same logic as createorder.php - no auto-calculation)
    $distanceKm = isset($data["distance_km"]) && (float)$data["distance_km"] > 0
        ? (float)$data["distance_km"]
        : 0;
    
    // Set distance_km: use provided value or default 10.0 (same as createorder.php)
    $data["distance_km"] = $distanceKm > 0 ? $distanceKm : 10.0;
    
    $service = new OrderService($conn);
    $result = $service->create(
        $data,
        $imageUrls
    );

    // ==========================
    // GỬI EMAIL THÔNG BÁO
    // ==========================
    // Lấy email từ customer hoặc từ receiver_email
    $customerEmail = null;
    if ($data["customer_id"] > 0) {
        // Lấy email từ customer account
        $getCustomerEmail = $conn->prepare("SELECT email FROM users WHERE id = ? LIMIT 1");
        if ($getCustomerEmail) {
            $getCustomerEmail->bind_param("i", $data["customer_id"]);
            if ($getCustomerEmail->execute()) {
                $customerResult = $getCustomerEmail->get_result();
                if ($customerRow = $customerResult->fetch_assoc()) {
                    $customerEmail = $customerRow["email"];
                }
            }
            $getCustomerEmail->close();
        }
    }
    
    // Ưu tiên: receiver_email từ form > customer email
    $emailToSend = !empty($data["receiver_email"]) ? $data["receiver_email"] : $customerEmail;
    
    if ($emailToSend && filter_var($emailToSend, FILTER_VALIDATE_EMAIL)) {
        send_email_notification(
            $emailToSend,
            $result["order_code"],
            $result["shipping_fee"],
            $data["cod_amount"] ?? 0
        );
    }

    // ==========================
    // CREATE NOTIFICATIONS (RBAC)
    // ==========================
    $notificationService = new NotificationService($conn);
    $notificationService->emit(
        'order_created',
        $result["order_id"],
        $userId,
        $role
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

// ==========================
// HÀM TÍNH KHOẢNG CÁCH (GEOAPIFY API - GIỐNG OrderNoAccount)
// ==========================
/**
 * Calculate distance between two addresses using Geoapify API
 * Same logic as OrderNoAccount.js
 */
function calculateDistanceFromAddresses(string $senderAddress, string $receiverAddress): float
{
    $API_KEY = "9aed6a93b4d540e6b3b740a688d9921e";
    
    // Helper: Geocode address to lat/lon
    $geocodeAddress = function($address) use ($API_KEY) {
        $parts = [];
        $parts[] = trim($address);
        $parts[] = "Hà Nội";
        $parts[] = "Vietnam";
        $full = implode(", ", $parts);
        
        $url = "https://api.geoapify.com/v1/geocode/search?text=" . urlencode($full) . "&filter=countrycode:vn&format=json&apiKey=" . $API_KEY;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("Geoapify geocode error: HTTP {$httpCode}");
        }
        
        $data = json_decode($response, true);
        if (!$data || !isset($data['results']) || count($data['results']) === 0) {
            throw new Exception("Address not found: " . $full);
        }
        
        $selected = null;
        foreach ($data['results'] as $result) {
            $txt = strtolower(($result['formatted'] ?? "") . " " . ($result['city'] ?? "") . " " . ($result['state'] ?? ""));
            if (strpos($txt, "hà nội") !== false || strpos($txt, "ha noi") !== false) {
                $selected = $result;
                break;
            }
        }
        if (!$selected) {
            $selected = $data['results'][0];
        }
        
        $lat = (float)($selected['lat'] ?? 0);
        $lon = (float)($selected['lon'] ?? 0);
        
        if (!$lat || !$lon) {
            throw new Exception("Cannot get coordinates from: " . $full);
        }
        
        return ['lat' => $lat, 'lon' => $lon];
    };
    
    // Helper: Get route distance
    $getRouteDistance = function($start, $end) use ($API_KEY) {
        $url = "https://api.geoapify.com/v1/routing?waypoints={$start['lat']},{$start['lon']}|{$end['lat']},{$end['lon']}&mode=drive&apiKey={$API_KEY}";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("Geoapify routing error: HTTP {$httpCode}");
        }
        
        $data = json_decode($response, true);
        if (!$data || !isset($data['features']) || count($data['features']) === 0) {
            throw new Exception("Cannot find route");
        }
        
        $props = $data['features'][0]['properties'] ?? null;
        if (!$props || !isset($props['distance']) || !is_numeric($props['distance'])) {
            throw new Exception("Invalid routing result");
        }
        
        return (float)$props['distance'] / 1000; // Convert meters to km
    };
    
    try {
        $fromCoord = $geocodeAddress($senderAddress);
        $toCoord = $geocodeAddress($receiverAddress);
        $distanceKm = $getRouteDistance($fromCoord, $toCoord);
        return round($distanceKm, 2);
    } catch (Exception $e) {
        error_log("Distance calculation error: " . $e->getMessage());
        return 0; // Return 0 on error, will use fallback
    }
}

// ==========================
// HÀM GỬI EMAIL THÔNG BÁO
// ==========================
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
    
    // TODO: Thực hiện gửi email thật (hiện tại chỉ log)
    // Có thể sử dụng PHPMailer, SendGrid, hoặc email service khác
    error_log("EMAIL NOTIFICATION: To: {$to_email} | Subject: {$subject} | Order: {$order_code}");
    
    return true;
}
