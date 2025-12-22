<?php

/**
 * backend/api/shipper/confirm_delivery.php
 * ---------------------------------------
 * Shipper xác nhận giao hàng (status 4 → 5)
 * - Upload ảnh bằng chứng giao hàng
 * - Ghi order_images + order_history
 * - Update orders.status
 * - Transaction + auto cleanup file khi lỗi
 */

// ==========================
// DEBUG (TẮT Ở PROD)
// ==========================
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ==========================
// CORS
// ==========================
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ==========================
// METHOD CHECK
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "status" => "error",
        "message" => "Method not allowed"
    ]);
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

$shipperId = (int)$GLOBALS['auth_user']['id'];

// ==========================
// INPUT
// ==========================
$orderId = isset($_POST["order_id"]) ? (int)$_POST["order_id"] : 0;

if ($orderId <= 0) {
    Response::error("Thiếu order_id");
}

if (!isset($_FILES["image"]) || $_FILES["image"]["error"] !== UPLOAD_ERR_OK) {
    Response::error("Ảnh bằng chứng giao hàng là bắt buộc");
}

// ==========================
// CHECK ORDER
// ==========================
$orderStmt = $conn->prepare("
    SELECT id, shipper_id, status
    FROM orders
    WHERE id = ?
");
$orderStmt->bind_param("i", $orderId);
$orderStmt->execute();
$order = $orderStmt->get_result()->fetch_assoc();
$orderStmt->close();

if (!$order) {
    Response::error("Không tìm thấy đơn hàng");
}

if ((int)$order["shipper_id"] !== $shipperId) {
    Response::error("Bạn không được phân công đơn này");
}

if ((int)$order["status"] !== 4) {
    Response::error("Đơn hàng chưa ở trạng thái đang giao (status = 4)");
}

// ==========================
// UPLOAD IMAGE (HARDENED)
// ==========================
$uploadBase = __DIR__ . "/../../uploads/proofs/";
if (!is_dir($uploadBase) && !mkdir($uploadBase, 0777, true)) {
    Response::error("Không thể tạo thư mục upload");
}

$tmpPath = $_FILES["image"]["tmp_name"];
$ext = strtolower(pathinfo($_FILES["image"]["name"], PATHINFO_EXTENSION));

// Fallback MIME – không phụ thuộc fileinfo
$allowedExt = ["jpg", "jpeg", "png", "webp"];
if (!in_array($ext, $allowedExt, true)) {
    Response::error("Định dạng ảnh không hợp lệ (jpg, png, webp)");
}

$newFileName = "delivery_{$orderId}_" . time() . "." . $ext;
$absolutePath = $uploadBase . $newFileName;
$relativePath = "uploads/proofs/" . $newFileName;

if (!move_uploaded_file($tmpPath, $absolutePath)) {
    Response::error("Upload ảnh thất bại");
}

// ==========================
// DB TRANSACTION (STRICT)
// ==========================
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn->begin_transaction();

    // 1. Update orders
    $updateStmt = $conn->prepare("
        UPDATE orders
        SET
            status = 5,
            delivered_at = NOW(),
            delivery_proof = ?
        WHERE id = ?
    ");
    $updateStmt->bind_param("si", $relativePath, $orderId);
    $updateStmt->execute();
    $updateStmt->close();

    // 2. Insert order_images
    $imgStmt = $conn->prepare("
        INSERT INTO order_images (order_id, image_url, type)
        VALUES (?, ?, 'delivery')
    ");
    $imgStmt->bind_param("is", $orderId, $relativePath);
    $imgStmt->execute();
    $imgStmt->close();

    // 3. Insert order_history
    $hisStmt = $conn->prepare("
        INSERT INTO order_history (order_id, status_id, user_id, role, note)
        VALUES (?, 5, ?, 'shipper', 'Shipper xác nhận đã giao hàng')
    ");
    $hisStmt->bind_param("ii", $orderId, $shipperId);
    $hisStmt->execute();
    $hisStmt->close();

    $conn->commit();

    Response::success("Xác nhận giao hàng thành công", [
        "order_id" => $orderId,
        "status" => 5,
        "delivery_proof" => $relativePath
    ]);
} catch (Throwable $e) {
    $conn->rollback();

    // 🔥 AUTO CLEANUP FILE
    if (file_exists($absolutePath)) {
        unlink($absolutePath);
    }

    error_log("CONFIRM_DELIVERY_ERROR: " . $e->getMessage());
    Response::serverError("Lỗi hệ thống khi xác nhận giao hàng");
}

$conn->close();
