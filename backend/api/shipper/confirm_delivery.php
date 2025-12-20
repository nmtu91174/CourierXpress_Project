<?php
// backend/api/shipper/confirm_delivery.php
// Shipper confirms delivery (Status 4 -> 5)

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
// [UPDATED] Allow all headers/origins for multipart/form-data
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// ✅ OPTIONS must exit early
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

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

// ==========================
// INPUT (UPDATED)
// ==========================
// [OLD CODE COMMENTED OUT]
/*
$data = json_decode(file_get_contents("php://input"), true);
$orderId = (int)($data["order_id"] ?? 0);
*/

// [NEW CODE] Read from $_POST because we are uploading files
$orderId = isset($_POST["order_id"]) ? (int)$_POST["order_id"] : 0;

if ($orderId <= 0) {
    Response::error("Missing order_id");
}

// ==========================
// CHECK ORDER
// ==========================
$check = $conn->prepare("
    SELECT id, status, shipper_id, order_code
    FROM orders
    WHERE id = ?
");
$check->bind_param("i", $orderId);
$check->execute();
$order = $check->get_result()->fetch_assoc();

if (!$order) {
    Response::error("Order not found");
}

if ((int)$order["shipper_id"] !== $shipperId) {
    Response::error("You are not assigned to this order");
}

// [UPDATED] Ensure status is 4 (In Transit)
if ((int)$order["status"] !== 4) {
    Response::error("Order is not in 'In Transit' status (Current: " . $order["status"] . ")");
}

// ------------------------------------------------------
// [NEW] HANDLE IMAGE UPLOAD (DELIVERY PROOF)
// ------------------------------------------------------
$deliveryProofPath = null;

if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . "/../../uploads/proofs/";

    // Create directory if not exists
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileExt = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp'];

    if (in_array($fileExt, $allowed)) {
        // Filename: delivery_ORDERID_TIMESTAMP.ext
        $newFileName = "delivery_" . $orderId . "_" . time() . "." . $fileExt;
        $destPath = $uploadDir . $newFileName;

        if (move_uploaded_file($_FILES['image']['tmp_name'], $destPath)) {
            // Save relative path
            $deliveryProofPath = "uploads/proofs/" . $newFileName;
        } else {
            Response::error("Failed to save uploaded image");
        }
    } else {
        Response::error("Invalid file type (JPG, PNG, WEBP only)");
    }
} else {
    // Require proof of delivery
    Response::error("Proof of delivery image is required");
}

// ==========================
// UPDATE STATUS → DELIVERED (ATOMIC)
// ==========================
try {
    $service = new OrderService($conn);

    // [UPDATED] Use the new specific method in OrderService
    /* OLD CODE:
    $service->updateStatus(
        $orderId,
        5, // delivered
        $shipperId,
        "shipper",
        "Giao hàng thành công"
    );
    */

    // [NEW CODE]
    $service->confirmDelivery($orderId, $shipperId, $deliveryProofPath);

    Response::success("Delivery confirmed successfully", [
        "order_id"   => $orderId,
        "order_code" => $order["order_code"],
        "status"     => 5,
        "image_url"  => $deliveryProofPath
    ]);
} catch (Exception $e) {
    error_log("CONFIRM DELIVERY ERROR: " . $e->getMessage());
    Response::serverError($e->getMessage());
} catch (Error $e) {
    error_log("CONFIRM DELIVERY FATAL ERROR: " . $e->getMessage());
    Response::serverError("System error: " . $e->getMessage());
}

$conn->close();
