<?php
// =====================================================
// SHIPPER CONFIRM DELIVERY FAILED (FULL HARDENED)
// =====================================================

// ==========================
// ERROR HANDLING
// ==========================
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// ==========================
// CORS
// ==========================
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================
// METHOD CHECK
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
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
// AUTH
// ==========================
require_login();
require_role(["shipper"]);

$shipperId = (int)$GLOBALS["auth_user"]["id"];

// ==========================
// INPUT
// ==========================
$orderId = (int)($_POST["order_id"] ?? 0);
$reason  = trim($_POST["reason"] ?? "");
$note    = trim($_POST["note"] ?? "");

// GPS (optional)
$latitude  = isset($_POST["latitude"])  ? (float)$_POST["latitude"]  : null;
$longitude = isset($_POST["longitude"]) ? (float)$_POST["longitude"] : null;
$accuracy  = isset($_POST["accuracy"])  ? (float)$_POST["accuracy"]  : null;

// ==========================
// VALIDATION
// ==========================
if ($orderId <= 0) {
    Response::error("Thiếu order_id");
}

// ENUM đúng theo DB
$allowedReasons = [
    "customer_unreachable",
    "customer_refused",
    "package_damaged",
    "weather_delay",
    "other"
];

if (!in_array($reason, $allowedReasons, true)) {
    Response::error("Lý do giao hàng thất bại không hợp lệ");
}

if (!isset($_FILES["image"])) {
    Response::error("Thiếu ảnh bằng chứng");
}

// ==========================
// VERIFY ORDER (LOCK)
// ==========================
$conn->begin_transaction();

$check = $conn->prepare("
    SELECT id, status, is_locked
    FROM orders
    WHERE id = ?
      AND shipper_id = ?
    FOR UPDATE
");
$check->bind_param("ii", $orderId, $shipperId);
$check->execute();
$order = $check->get_result()->fetch_assoc();
$check->close();

if (!$order) {
    $conn->rollback();
    Response::error("Đơn hàng không tồn tại hoặc không thuộc shipper");
}

if ((int)$order["is_locked"] === 1) {
    $conn->rollback();
    Response::error("Đơn hàng đã bị khóa");
}

if ((int)$order["status"] !== 4) {
    $conn->rollback();
    Response::error("Chỉ được báo giao thất bại khi đơn đang giao");
}

// ==========================
// HANDLE IMAGE UPLOAD (HARDENED)
// ==========================
$uploadDir = __DIR__ . "/../../uploads/delivery_failed/";
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$tmp  = $_FILES["image"]["tmp_name"];
$size = (int)$_FILES["image"]["size"];

if ($size <= 0 || $size > 5 * 1024 * 1024) {
    $conn->rollback();
    Response::error("File ảnh không hợp lệ hoặc vượt quá 5MB");
}

// MIME check (server-side)
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $tmp);
finfo_close($finfo);

$mimeMap = [
    "image/jpeg" => "jpg",
    "image/png"  => "png",
    "image/webp" => "webp"
];

if (!isset($mimeMap[$mime])) {
    $conn->rollback();
    Response::error("Định dạng ảnh không được hỗ trợ");
}

$filename = "delivery_fail_{$orderId}_" . time() . "." . $mimeMap[$mime];
$target   = $uploadDir . $filename;

if (!move_uploaded_file($tmp, $target)) {
    $conn->rollback();
    Response::serverError("Không thể lưu ảnh");
}

$imageUrl = "/uploads/delivery_failed/" . $filename;

// ==========================
// TRANSACTION LOGIC
// ==========================
try {
    // 1️⃣ delivery_issues
    $issue = $conn->prepare("
        INSERT INTO delivery_issues
            (order_id, shipper_id, issue_type, description,
             latitude, longitude, accuracy, is_final)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ");
    $issue->bind_param(
        "iissddd",
        $orderId,
        $shipperId,
        $reason,
        $note,
        $latitude,
        $longitude,
        $accuracy
    );
    $issue->execute();
    $issueId = $issue->insert_id;
    $issue->close();

    // 2️⃣ orders
    $update = $conn->prepare("
        UPDATE orders
        SET
            previous_status = status,
            status = 6,
            failed_at = NOW(),
            failed_by = ?,
            failed_issue_id = ?,
            is_locked = 1
        WHERE id = ?
    ");
    $update->bind_param("iii", $shipperId, $issueId, $orderId);
    $update->execute();
    $update->close();

    // 3️⃣ order_images
    $img = $conn->prepare("
        INSERT INTO order_images (order_id, image_url, type)
        VALUES (?, ?, 'delivery_failed')
    ");
    $img->bind_param("is", $orderId, $imageUrl);
    $img->execute();
    $img->close();

    // 4️⃣ order_history
    $his = $conn->prepare("
        INSERT INTO order_history
            (order_id, status_id, user_id, role, note)
        VALUES (?, 6, ?, 'shipper', ?)
    ");
    $his->bind_param("iis", $orderId, $shipperId, $note);
    $his->execute();
    $his->close();

    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    @unlink($target);
    error_log("DELIVERY_FAILED_ERROR: " . $e->getMessage());
    Response::serverError("Xác nhận giao hàng thất bại không thành công");
}

// ==========================
// RESPONSE
// ==========================
Response::success("Đã ghi nhận giao hàng thất bại");

$conn->close();
