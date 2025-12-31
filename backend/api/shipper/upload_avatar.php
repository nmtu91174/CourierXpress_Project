<?php
// backend/api/shipper/upload_avatar.php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(200);
  exit;
}

require_once __DIR__ . "/../../db.php";
require_once __DIR__ . "/../../core/Response.php";
require_once __DIR__ . "/../../middleware/require_login.php";
require_once __DIR__ . "/../../middleware/require_role.php";

require_login();
require_role(["shipper"]);

$shipperId = $GLOBALS["auth_user"]["id"] ?? null;
if (!$shipperId) Response::error("Unauthenticated.");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  Response::error("Invalid method.");
}

if (!isset($_FILES["avatar"])) {
  Response::error("Missing avatar file (field name: avatar).");
}

$file = $_FILES["avatar"];
if ($file["error"] !== UPLOAD_ERR_OK) {
  Response::error("Upload error code: " . $file["error"]);
}

// --- PHẦN SỬA LỖI ---
$allowed_mimes = ["image/jpeg", "image/png", "image/webp"];
$fileInfo = @getimagesize($file["tmp_name"]); // Sử dụng hàm này an toàn hơn mime_content_type

if (!$fileInfo) {
    Response::error("File is not a valid image.");
}

$mime = $fileInfo['mime'];

if (!in_array($mime, $allowed_mimes)) {
    Response::error("Invalid image type. Only JPG/PNG/WebP allowed.");
}

// Xác định đuôi file dựa trên mime type
$ext = ($mime === "image/jpeg") ? "jpg" : (($mime === "image/png") ? "png" : "webp");
// Đã xóa dòng $ext = $allowed[$mime]; gây lỗi xung đột
// --------------------

// Validate size (2MB)
if ($file["size"] > 2 * 1024 * 1024) {
  Response::error("File too large. Max 2MB.");
}

// Save file
$uploadDir = realpath(__DIR__ . "/../../uploads");
if ($uploadDir === false) {
  $uploadDir = __DIR__ . "/../../uploads";
  @mkdir($uploadDir, 0777, true);
}

$avatarDir = $uploadDir . "/avatars";
if (!is_dir($avatarDir)) {
  @mkdir($avatarDir, 0777, true);
}

$filename = "shipper_" . $shipperId . "_" . time() . "." . $ext;
$destPath = $avatarDir . "/" . $filename;

if (!move_uploaded_file($file["tmp_name"], $destPath)) {
  Response::serverError("Cannot save uploaded file.");
}

// Path lưu DB (để frontend load)
$publicPath = "/CourierXpress_Project/backend/uploads/avatars/" . $filename;

$stmt = $conn->prepare("UPDATE users SET avatar = ? WHERE id = ? AND role = 'shipper' LIMIT 1");
if (!$stmt) {
  error_log("UPLOAD_AVATAR PREPARE ERROR: " . $conn->error);
  Response::serverError("SQL prepare failed.");
}

$stmt->bind_param("si", $publicPath, $shipperId);

if (!$stmt->execute()) {
  error_log("UPLOAD_AVATAR EXECUTE ERROR: " . $stmt->error);
  Response::serverError("SQL execute failed: " . $stmt->error);
}

$stmt->close();

Response::success("Avatar updated successfully.", [
  "avatar" => $publicPath
]);
