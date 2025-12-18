<?php
// backend/api/shipper/confirm_pickup.php
// Shipper xác nhận đã pickup hàng

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
// [UPDATED] - CORS: Remove 'Content-Type: application/json' requirement 
// because standard FormData doesn't send it the same way.
// We allow the browser to set the boundary automatically.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// ✅ OPTIONS phải exit sớm TRƯỚC middleware
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ==========================
// METHOD CHECK
// ==========================
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "status" => "error",
        "message" => "Method not allowed"
    ]);
    exit();
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
require_role(["shipper"]);

$shipperId = $GLOBALS['auth_user']['id'];
$role      = $GLOBALS['auth_user']['role'];

// ==========================
// READ INPUT
// ==========================
// [UPDATED START] - Switch from JSON to POST/FILES for multipart/form-data support
/* OLD CODE (Commented out):
$data = json_decode(file_get_contents("php://input"), true);
$orderId = (int)($data["order_id"] ?? 0);
*/

// NEW CODE: Read from $_POST because we are uploading files
$orderId = isset($_POST["order_id"]) ? (int)$_POST["order_id"] : 0;
$actualWeight = isset($_POST["actual_weight"]) ? (float)$_POST["actual_weight"] : 0;
// [UPDATED END]

if ($orderId <= 0) {
    Response::error("Thiếu order_id");
}

// ==========================
// CHECK ORDER
// ==========================
// [UPDATED] - Added 'weight' and 'total_amount' to SELECT to calculate penalty
$check = $conn->prepare("
    SELECT id, order_code, status, shipper_id, weight, total_amount
    FROM orders
    WHERE id = ?
");
$check->bind_param("i", $orderId);
$check->execute();
$result = $check->get_result();

if ($result->num_rows === 0) {
    Response::error("Đơn hàng không tồn tại");
}

$order = $result->fetch_assoc();

// Sai shipper
if ((int)$order["shipper_id"] !== $shipperId) {
    Response::error("Bạn không được phép pickup đơn này");
}

// Sai trạng thái
// Status 3 means "Assigned/Shipper Accepted" -> Ready to Pickup
if ((int)$order["status"] !== 3) {
    Response::error("Đơn hàng không ở trạng thái chờ pickup (Status phải là 3)");
}

// ==========================
// [NEW SECTION] - PROCESS LOGIC (Image & Weight)
// ==========================

// 1. Handle Image Upload (pickup_proof)
$pickupProofPath = null;
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . "/../../uploads/proofs/";
    // Ensure directory exists
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileExt = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp'];

    if (in_array($fileExt, $allowed)) {
        // Filename: pickup_ORDERID_TIMESTAMP.ext
        $newFileName = "pickup_" . $orderId . "_" . time() . "." . $fileExt;
        $destPath = $uploadDir . $newFileName;

        if (move_uploaded_file($_FILES['image']['tmp_name'], $destPath)) {
            // Save relative path for DB
            $pickupProofPath = "uploads/proofs/" . $newFileName;
        } else {
            Response::error("Lỗi khi lưu ảnh upload.");
        }
    } else {
        Response::error("Định dạng ảnh không hợp lệ (chỉ jpg, png, webp).");
    }
} else {
    // Force shipper to take photo? If yes, uncomment below:
    // Response::error("Bắt buộc phải chụp ảnh xác nhận lấy hàng.");
}

// 2. Handle Weight Penalty Logic
$originalWeight = (float)$order['weight']; // Unit: gram (based on DB data like 1500, 800)
// Convert actual weight to gram if frontend sends kg, or assume frontend sends gram. 
// Assuming DB weight is in GRAMS.
// If input actual_weight is in KG (common for UI), convert to Grams:
// $actualWeightGram = $actualWeight * 1000; 

// Let's assume standardization: Everything is in GRAMS.
$weightDiff = $actualWeight - $originalWeight;
$penaltyFee = 0;
$newTotalAmount = (float)$order['total_amount'];

// Rule: If difference > 1000g (1kg), apply penalty.
// You can adjust this threshold logic.
if ($weightDiff >= 1000) {
    // Example Penalty: 5000 VND per extra kg or flat fee.
    // Let's look at `fees` table in your DB, id 2 is 'weight_fee' (5000.00).
    // We will apply a fixed penalty or calculated one.
    $penaltyFee = 5000 * ceil(($weightDiff - 1000) / 1000); // 5000 for every extra kg above threshold
    if ($penaltyFee < 5000) $penaltyFee = 5000; // Minimum penalty

    $newTotalAmount += $penaltyFee;
}

// ==========================
// [NEW SECTION] - UPDATE DATA BEFORE SERVICE CALL
// ==========================
// We manually update extra fields because OrderService->updateStatus likely implies only status change.
$updateSql = "UPDATE orders SET 
                actual_weight = ?, 
                pickup_proof = ?, 
                penalty_fee = ?, 
                total_amount = ? 
              WHERE id = ?";
$stmtUpdate = $conn->prepare($updateSql);
$stmtUpdate->bind_param("dsddi", $actualWeight, $pickupProofPath, $penaltyFee, $newTotalAmount, $orderId);

if (!$stmtUpdate->execute()) {
    Response::serverError("Lỗi database khi cập nhật thông tin đơn hàng.");
}

// ==========================
// UPDATE STATUS → 4
// ==========================
try {
    $service = new OrderService($conn);

    $service->updateStatus(
        $orderId,
        4,                  // picked_up (Status 4 in your DB dump)
        $shipperId,
        "shipper",
        "Shipper đã lấy hàng. Cân nặng thực tế: {$actualWeight}g." . ($penaltyFee > 0 ? " Phạt quá cân: {$penaltyFee}đ" : "")
    );

    Response::success("Pickup thành công", [
        "order_id"   => $orderId,
        "order_code" => $order["order_code"],
        "status"     => 4,
        "penalty_fee" => $penaltyFee,
        "new_total"  => $newTotalAmount,
        "image_url"  => $pickupProofPath
    ]);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

$conn->close();
