<?php
// backend/api/users/update_user.php

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
require_once __DIR__ . "/../../services/NotificationService.php";

// ==========================
// AUTH
// ==========================
require_login();

$currentUserId = $GLOBALS['auth_user']['id'];
$currentRole   = $GLOBALS['auth_user']['role'];

// ==========================
// INPUT
// ==========================
// Check if this is FormData (file upload) or JSON
$isFormData = !empty($_FILES["avatar"]);

if ($isFormData) {
    // FormData - handle avatar upload
    $userId = !empty($_POST["user_id"]) ? (int)$_POST["user_id"] : 0;
    // Get all form fields from POST (including empty strings)
    $data = $_POST; // $_POST already contains all form fields
} else {
    // JSON - regular update
$data = json_decode(file_get_contents("php://input"), true);
    $userId = !empty($data["user_id"]) ? (int)$data["user_id"] : 0;
}

if (empty($userId)) {
    Response::error("Thiếu user_id");
}

// ==========================
// PHÂN QUYỀN
// ==========================
// Admin: sửa tất cả
// User thường: chỉ sửa chính mình
if ($currentRole !== "admin" && $userId !== $currentUserId) {
    Response::forbidden("Không có quyền cập nhật user này");
}

// ==========================
// BUILD UPDATE FIELDS
// ==========================
$fields = [];
$params = [];
$types  = "";

// Tên
if (!empty($data["name"])) {
    $fields[] = "name = ?";
    $params[] = $data["name"];
    $types   .= "s";
}

// Phone
if (!empty($data["phone"])) {
    $fields[] = "phone = ?";
    $params[] = $data["phone"];
    $types   .= "s";
}

// Email (chỉ admin)
if ($currentRole === "admin" && !empty($data["email"])) {
    $fields[] = "email = ?";
    $params[] = $data["email"];
    $types   .= "s";
}

// Role (chỉ admin)
if ($currentRole === "admin" && !empty($data["role"])) {
    $allowedRoles = ["admin", "agent", "shipper", "customer"];
    if (!in_array($data["role"], $allowedRoles)) {
        Response::error("Role không hợp lệ");
    }
    $fields[] = "role = ?";
    $params[] = $data["role"];
    $types   .= "s";
}

// Status (chỉ admin)
if ($currentRole === "admin" && isset($data["status"])) {
    $fields[] = "status = ?";
    $params[] = $data["status"];
    $types   .= "s";
}

// Address - allow empty string (check both isset and array_key_exists for FormData)
if (isset($data["address"]) || array_key_exists("address", $data)) {
    $fields[] = "address = ?";
    $addressValue = !empty($data["address"]) ? $data["address"] : "";
    $params[] = $addressValue;
    $types   .= "s";
}

// Avatar upload handling
$avatarUrl = null;
if ($isFormData && !empty($_FILES["avatar"]["tmp_name"])) {
    $uploadDir = __DIR__ . "/../../uploads/user_avatars/";
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Security: Allowed file types
    $allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $maxFileSize = 5 * 1024 * 1024; // 5MB

    $originalName = $_FILES["avatar"]["name"];
    $fileSize = $_FILES["avatar"]["size"];
    $fileType = $_FILES["avatar"]["type"];
    $tmpName = $_FILES["avatar"]["tmp_name"];
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    // Security checks
    if ($fileSize > $maxFileSize) {
        Response::error("File quá lớn. Tối đa 5MB");
    }

    if (!in_array($ext, $allowedExtensions)) {
        Response::error("Định dạng không hợp lệ. Chỉ chấp nhận: JPG, PNG, GIF, WEBP");
    }

    if (!in_array($fileType, $allowedMimeTypes)) {
        Response::error("Loại file không hợp lệ");
    }

    // Verify it's actually an image
    $imageInfo = @getimagesize($tmpName);
    if ($imageInfo === false) {
        Response::error("File không phải là ảnh hợp lệ");
    }

    // Generate secure filename
    $safeFilename = "avatar_" . $userId . "_" . time() . "_" . bin2hex(random_bytes(8)) . "." . $ext;
    $targetPath = $uploadDir . $safeFilename;

    // Prevent path traversal
    $realUploadDir = realpath($uploadDir);
    $realTargetPath = realpath(dirname($targetPath));
    if ($realTargetPath !== $realUploadDir) {
        Response::error("Đường dẫn file không hợp lệ");
    }

    // Delete old avatar if exists
    $oldAvatarStmt = $conn->prepare("SELECT avatar FROM users WHERE id = ?");
    $oldAvatarStmt->bind_param("i", $userId);
    $oldAvatarStmt->execute();
    $oldAvatarResult = $oldAvatarStmt->get_result();
    if ($oldAvatar = $oldAvatarResult->fetch_assoc()) {
        if (!empty($oldAvatar["avatar"]) && strpos($oldAvatar["avatar"], "/uploads/user_avatars/") !== false) {
            $oldFilePath = __DIR__ . "/../.." . $oldAvatar["avatar"];
            if (file_exists($oldFilePath)) {
                @unlink($oldFilePath);
            }
        }
    }
    $oldAvatarStmt->close();

    // Move uploaded file
    if (!move_uploaded_file($tmpName, $targetPath)) {
        Response::error("Không thể lưu file avatar");
    }

    $avatarUrl = "/uploads/user_avatars/" . $safeFilename;
    $fields[] = "avatar = ?";
    $params[] = $avatarUrl;
    $types   .= "s";
}

if (empty($fields)) {
    Response::error("Không có dữ liệu cần cập nhật");
}

// ==========================
// EXECUTE UPDATE
// ==========================
$sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ?";
$params[] = $userId;
$types   .= "i";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);

if (!$stmt->execute()) {
    Response::serverError("Không thể cập nhật user");
}

// ==========================
// LOG
// ==========================
$notify = new NotificationService($conn);

$notify->log(
    "UPDATE_USER",
    "users",
    $userId,
    $currentUserId
);

// Audit log (file)
$auditLine = sprintf(
    "time=%s event=UPDATE_USER actor_id=%d actor_role=%s target_user=%d\n",
    date("c"),
    $currentUserId,
    $currentRole,
    $userId
);
file_put_contents(__DIR__ . "/../../logs/audit.log", $auditLine, FILE_APPEND | LOCK_EX);

// ==========================
// FETCH UPDATED USER DATA (for response)
// ==========================
$fetchStmt = $conn->prepare("SELECT id, name, email, phone, address, avatar, role, status, created_at FROM users WHERE id = ?");
$fetchStmt->bind_param("i", $userId);
$fetchStmt->execute();
$updatedUser = $fetchStmt->get_result()->fetch_assoc();
$fetchStmt->close();

$stmt->close();
$conn->close();

// ==========================
// RESPONSE (include updated user data, especially avatar URL)
// ==========================
Response::success("Cập nhật user thành công", $updatedUser);
