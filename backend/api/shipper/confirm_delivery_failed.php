<?php
/**
 * backend/api/shipper/confirm_delivery_failed.php
 * ------------------------------------------------
 * Shipper xác nhận giao hàng thất bại (status 4 → 6)
 * - Upload ảnh bằng chứng
 * - Insert delivery_issues
 * - Update orders (status, failed_*, is_locked)
 * - Ghi order_images + order_history
 * - Transaction + auto cleanup file khi lỗi
 */

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
require_once __DIR__ . "/../../services/NotificationService.php";

// ==========================
// AUTH
// ==========================
try {
    require_login();
    require_role(["shipper"]);
} catch (Exception $e) {
    Response::unauthorized($e->getMessage());
}

$shipperId = (int)$GLOBALS["auth_user"]["id"];

// ==========================
// INPUT VALIDATION
// ==========================
$orderId = isset($_POST["order_id"]) ? (int)$_POST["order_id"] : 0;
$reason  = isset($_POST["reason"]) ? trim($_POST["reason"]) : "";
$detail  = isset($_POST["note"]) ? trim($_POST["note"]) : "";

$latitude  = isset($_POST["latitude"]) && $_POST["latitude"] !== "" ? $_POST["latitude"] : null;
$longitude = isset($_POST["longitude"]) && $_POST["longitude"] !== "" ? $_POST["longitude"] : null;
$accuracy  = isset($_POST["accuracy"]) && $_POST["accuracy"] !== "" ? $_POST["accuracy"] : null;

if ($orderId <= 0) {
    Response::error("Thiếu order_id");
}

$allowedReasons = [
    "customer_unreachable",
    "customer_refused",
    "package_damaged",
    "weather_delay",
    "other"
];

if (!in_array($reason, $allowedReasons, true)) {
    Response::error("Lý do không hợp lệ");
}

if (!isset($_FILES["image"]) || $_FILES["image"]["error"] !== UPLOAD_ERR_OK) {
    Response::error("Ảnh bằng chứng là bắt buộc");
}

// ==========================
// CHECK ORDER
// ==========================
$checkStmt = $conn->prepare("
    SELECT id, status, is_locked, shipper_id, order_code, customer_id
    FROM orders
    WHERE id = ? AND shipper_id = ?
    FOR UPDATE
");

if (!$checkStmt) {
    Response::serverError("Database error: " . $conn->error);
}

$checkStmt->bind_param("ii", $orderId, $shipperId);
$checkStmt->execute();
$order = $checkStmt->get_result()->fetch_assoc();
$checkStmt->close();

if (!$order) {
    Response::error("Đơn hàng không tồn tại hoặc không thuộc về bạn");
}

if ((int)$order["is_locked"] === 1) {
    Response::error("Đơn hàng đã bị khóa");
}

if ((int)$order["status"] !== 4) {
    Response::error("Đơn hàng không ở trạng thái đang giao (status phải = 4)");
}

// ==========================
// UPLOAD IMAGE
// ==========================
$uploadDir = __DIR__ . "/../../uploads/delivery_failed/";

if (!is_dir($uploadDir) && !mkdir($uploadDir, 0777, true)) {
    Response::serverError("Không thể tạo thư mục upload");
}

$tmpPath = $_FILES["image"]["tmp_name"];
$fileSize = (int)$_FILES["image"]["size"];

if ($fileSize > 5 * 1024 * 1024) {
    Response::error("Ảnh quá lớn (tối đa 5MB)");
}

// Get file extension
$ext = strtolower(pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION));
$allowedExt = ["jpg", "jpeg", "png", "webp"];

if (!in_array($ext, $allowedExt, true)) {
    Response::error("Định dạng ảnh không hợp lệ (chỉ chấp nhận jpg, png, webp)");
}

$filename = "failed_{$orderId}_" . time() . "." . $ext;
$absolutePath = $uploadDir . $filename;
$relativePath = "uploads/delivery_failed/" . $filename;

if (!move_uploaded_file($tmpPath, $absolutePath)) {
    Response::serverError("Không thể lưu file ảnh");
}

// ==========================
// DB TRANSACTION
// ==========================
$conn->begin_transaction();

try {
    // ==========================
    // 1. INSERT delivery_issues
    // ==========================
    // Convert GPS values to DECIMAL (or NULL)
    // Schema: latitude DECIMAL(10,8), longitude DECIMAL(11,8), accuracy DECIMAL(10,2)
    $latVal = ($latitude !== null) ? (float)$latitude : null;
    $lngVal = ($longitude !== null) ? (float)$longitude : null;
    $accVal = ($accuracy !== null) ? (float)$accuracy : null;

    $issueStmt = $conn->prepare("
        INSERT INTO delivery_issues (
            order_id,
            reported_by,
            role,
            reason,
            detail,
            latitude,
            longitude,
            accuracy,
            attempt_no,
            resolved,
            is_final
        )
        VALUES (?, ?, 'shipper', ?, ?, ?, ?, ?, 1, 0, 1)
    ");

    if (!$issueStmt) {
        throw new Exception("Prepare delivery_issues failed: " . $conn->error);
    }

    // Handle NULL for GPS values - use conditional binding
    // If any GPS value is NULL, we'll use 0.0 (DECIMAL accepts 0.0)
    $lat = $latVal ?? 0.0;
    $lng = $lngVal ?? 0.0;
    $acc = $accVal ?? 0.0;

    $issueStmt->bind_param(
        "iissddd",
        $orderId,
        $shipperId,
        $reason,
        $detail,
        $lat,
        $lng,
        $acc
    );

    if (!$issueStmt->execute()) {
        throw new Exception("Insert delivery_issues failed: " . $issueStmt->error);
    }

    $issueId = $issueStmt->insert_id;
    $issueStmt->close();

    // ==========================
    // 2. UPDATE orders
    // ==========================
    $updateStmt = $conn->prepare("
        UPDATE orders
        SET
            previous_status = status,
            status = 6,
            failed_at = NOW(),
            failed_by = ?,
            failed_issue_id = ?,
            failed_reason = ?,
            is_locked = 1
        WHERE id = ?
    ");

    if (!$updateStmt) {
        throw new Exception("Prepare update orders failed: " . $conn->error);
    }

    $updateStmt->bind_param("iisi", $shipperId, $issueId, $reason, $orderId);

    if (!$updateStmt->execute()) {
        throw new Exception("Update orders failed: " . $updateStmt->error);
    }

    $updateStmt->close();

    // ==========================
    // 3. INSERT order_images
    // ==========================
    $imgStmt = $conn->prepare("
        INSERT INTO order_images (order_id, image_url, type, uploaded_by, role)
        VALUES (?, ?, 'delivery_failed', ?, 'shipper')
    ");

    if (!$imgStmt) {
        throw new Exception("Prepare order_images failed: " . $conn->error);
    }

    $imgStmt->bind_param("isi", $orderId, $relativePath, $shipperId);

    if (!$imgStmt->execute()) {
        throw new Exception("Insert order_images failed: " . $imgStmt->error);
    }

    $imgStmt->close();

    // ==========================
    // 4. INSERT order_history
    // ==========================
    $historyNote = "Giao thất bại: {$reason}. " . ($detail ? $detail : "");
    
    $hisStmt = $conn->prepare("
        INSERT INTO order_history (order_id, status_id, user_id, role, note)
        VALUES (?, 6, ?, 'shipper', ?)
    ");

    if (!$hisStmt) {
        throw new Exception("Prepare order_history failed: " . $conn->error);
    }

    $hisStmt->bind_param("iis", $orderId, $shipperId, $historyNote);

    if (!$hisStmt->execute()) {
        throw new Exception("Insert order_history failed: " . $hisStmt->error);
    }

    $hisStmt->close();

    // ==========================
    // COMMIT
    // ==========================
    $conn->commit();

    // ==========================
    // CREATE NOTIFICATIONS (RBAC)
    // ==========================
    $notificationService = new NotificationService($conn);
    $notificationService->emit('delivery_failed', $orderId, $shipperId, 'shipper', ['reason' => $reason]);

    Response::success("Đã báo cáo giao hàng thất bại", [
        "order_id" => $orderId,
        "issue_id" => $issueId
    ]);

} catch (Throwable $e) {
    // ==========================
    // ROLLBACK + CLEANUP
    // ==========================
    $conn->rollback();

    // Delete uploaded file if exists
    if (isset($absolutePath) && file_exists($absolutePath)) {
        @unlink($absolutePath);
    }

    error_log("[CONFIRM_DELIVERY_FAILED] " . $e->getMessage());
    Response::serverError("Lỗi hệ thống: " . $e->getMessage());
}

$conn->close();
