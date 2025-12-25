<?php
// =====================================================
// SHIPPER CONFIRM DELIVERY FAILED (FINAL SAFE VERSION)
// =====================================================

error_reporting(E_ALL);
ini_set('display_errors', 0); // Tắt hiển thị ra HTML để không làm hỏng JSON
ini_set('log_errors', 1);

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";

try {
    require_login();
    require_role(["shipper"]);
} catch (Exception $e) {
    Response::unauthorized($e->getMessage());
}

$shipperId = (int)$GLOBALS["auth_user"]["id"];

$orderId = (int)($_POST["order_id"] ?? 0);
$reason  = trim($_POST["reason"] ?? "");
$note    = trim($_POST["note"] ?? "");

// Xử lý GPS input an toàn
$latitude  = (isset($_POST["latitude"]) && $_POST["latitude"] !== "") ? $_POST["latitude"] : null;
$longitude = (isset($_POST["longitude"]) && $_POST["longitude"] !== "") ? $_POST["longitude"] : null;
$accuracy  = (isset($_POST["accuracy"]) && $_POST["accuracy"] !== "") ? $_POST["accuracy"] : null;

if ($orderId <= 0) Response::error("Thiếu order_id");

$allowedReasons = ["customer_unreachable", "customer_refused", "package_damaged", "weather_delay", "other"];
if (!in_array($reason, $allowedReasons, true)) Response::error("Lý do không hợp lệ");

if (!isset($_FILES["image"])) Response::error("Thiếu ảnh bằng chứng");

// --- TRANSACTION START ---
$conn->begin_transaction();

try {
    // 1. Check Order Lock
    $check = $conn->prepare("SELECT id, status, is_locked FROM orders WHERE id = ? AND shipper_id = ? FOR UPDATE");
    if (!$check) throw new Exception("Prepare Check Order Failed: " . $conn->error);

    $check->bind_param("ii", $orderId, $shipperId);
    $check->execute();
    $order = $check->get_result()->fetch_assoc();
    $check->close();

    if (!$order) throw new Exception("Đơn hàng không tồn tại hoặc không thuộc về bạn");
    if ((int)$order["is_locked"] === 1) throw new Exception("Đơn hàng đã bị khóa");
    if ((int)$order["status"] !== 4) throw new Exception("Đơn hàng không ở trạng thái đang giao (Status: " . $order["status"] . ")");

    // 2. Handle Image
    $uploadDir = __DIR__ . "/../../uploads/delivery_failed/";
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) throw new Exception("Lỗi Server: Không thể tạo thư mục upload");
    }

    $tmp  = $_FILES["image"]["tmp_name"];
    $size = (int)$_FILES["image"]["size"];
    if ($size > 5 * 1024 * 1024) throw new Exception("Ảnh quá lớn (>5MB)");

    // MIME Check An Toàn (Fix lỗi 500 do thiếu extension)
    $mime = '';
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime  = finfo_file($finfo, $tmp);
        finfo_close($finfo);
    } elseif (function_exists('getimagesize')) {
        $imgInfo = @getimagesize($tmp);
        $mime = $imgInfo['mime'] ?? '';
    } else {
        $mime = $_FILES["image"]["type"]; // Fallback cuối cùng
    }

    $mimeMap = ["image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp"];
    if (!isset($mimeMap[$mime])) throw new Exception("Định dạng ảnh không hỗ trợ ($mime)");

    $filename = "fail_{$orderId}_" . time() . "." . $mimeMap[$mime];
    $target   = $uploadDir . $filename;

    if (!move_uploaded_file($tmp, $target)) throw new Exception("Lỗi Server: Không thể lưu file ảnh");

    $imageUrl = "uploads/delivery_failed/" . $filename;

    // 3. Insert Delivery Issue (Fix lỗi prepare false)
    $sqlIssue = "INSERT INTO delivery_issues (order_id, shipper_id, issue_type, description, proof_image, latitude, longitude, accuracy, is_final) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)";
    $issue = $conn->prepare($sqlIssue);
    if (!$issue) throw new Exception("Lỗi Database (Issue): " . $conn->error); // Bắt lỗi cột proof_image thiếu

    // Bind param logic (đơn giản hóa)
    $issue->bind_param("iissssss", $orderId, $shipperId, $reason, $note, $imageUrl, $latitude, $longitude, $accuracy);
    if (!$issue->execute()) throw new Exception("Execute Issue Failed: " . $issue->error);
    $issueId = $issue->insert_id;
    $issue->close();

    // 4. Update Order
    $update = $conn->prepare("UPDATE orders SET previous_status = status, status = 6, failed_at = NOW(), failed_by = ?, failed_issue_id = ?, failed_reason = ?, is_locked = 1 WHERE id = ?");
    if (!$update) throw new Exception("Prepare Update Order Failed: " . $conn->error);
    $update->bind_param("iisi", $shipperId, $issueId, $reason, $orderId);
    $update->execute();
    $update->close();

    // 5. Insert Image Log
    $imgLog = $conn->prepare("INSERT INTO order_images (order_id, image_url, type, uploaded_by, role) VALUES (?, ?, 'delivery_failed', ?, 'shipper')");
    if (!$imgLog) throw new Exception("Prepare Image Log Failed");
    $imgLog->bind_param("isi", $orderId, $imageUrl, $shipperId);
    $imgLog->execute();
    $imgLog->close();

    // 6. History
    $his = $conn->prepare("INSERT INTO order_history (order_id, status_id, user_id, role, note) VALUES (?, 6, ?, 'shipper', ?)");
    $hNote = "Giao thất bại: $reason. $note";
    $his->bind_param("iis", $orderId, $shipperId, $hNote);
    $his->execute();
    $his->close();

    $conn->commit();
    Response::success("Đã báo cáo giao hàng thất bại", ["issue_id" => $issueId]);
} catch (Throwable $e) {
    $conn->rollback();
    if (isset($target) && file_exists($target)) @unlink($target);
    error_log("Delivery Failed Error: " . $e->getMessage());
    Response::serverError($e->getMessage()); // Trả về lỗi chi tiết để debug frontend
}

$conn->close();
