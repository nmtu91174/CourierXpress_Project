<?php
// backend/api/shipper/confirm_pickup.php
// Shipper confirms pickup

// CORS Headers
require_once __DIR__ . "/../../core/Cors.php";
Cors::handlePreflight();
// [UPDATED] Remove Content-Type requirement for multipart/form-data support
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// ✅ OPTIONS must exit early
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
// READ INPUT (POST & FILES)
// ==========================
// We use $_POST instead of php://input because of File Upload
$orderId = isset($_POST["order_id"]) ? (int)$_POST["order_id"] : 0;
$actualWeight = isset($_POST["actual_weight"]) ? (float)$_POST["actual_weight"] : 0;

if ($orderId <= 0) {
    Response::error("Missing order_id");
}

// ==========================
// CHECK ORDER & DATA
// ==========================
$check = $conn->prepare("
    SELECT id, order_code, status, shipper_id, weight, total_amount
    FROM orders
    WHERE id = ?
");
$check->bind_param("i", $orderId);
$check->execute();
$result = $check->get_result();

if ($result->num_rows === 0) {
    Response::error("Order not found");
}

$order = $result->fetch_assoc();

// Check Ownership
if ((int)$order["shipper_id"] !== $shipperId) {
    Response::error("You are not assigned to this order");
}

// Check Status (Must be 3 - Assigned)
if ((int)$order["status"] !== 3) {
    Response::error("Order is not in 'Assigned' status (Status is not 3)");
}

// ------------------------------------------------------
// 1. HANDLE IMAGE UPLOAD (Proof)
// ------------------------------------------------------
$pickupProofPath = null;
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = __DIR__ . "/../../uploads/proofs/";

    // Create directory if not exists
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
            // Relative path for DB
            $pickupProofPath = "uploads/proofs/" . $newFileName;
        } else {
            Response::error("Failed to save uploaded image");
        }
    } else {
        Response::error("Invalid file type (only JPG, PNG, WEBP allowed)");
    }
} else {
    // Optional: Force image? Uncomment if required.
    // Response::error("Pickup proof image is required");
}

// ------------------------------------------------------
// 2. CALCULATE PENALTY (Weight Logic)
// ------------------------------------------------------
$originalWeight = (float)$order['weight']; // Unit: Grams (based on your DB)
$weightDiff = $actualWeight - $originalWeight;
$penaltyFee = 0;
$newTotalAmount = (float)$order['total_amount'];

// Rule: If difference > 1000g (1kg), apply penalty
if ($weightDiff >= 1000) {
    // Logic: 5000 VND per extra 1kg
    $extraKg = ceil(($weightDiff - 1000) / 1000);
    $penaltyFee = 5000 * $extraKg;

    if ($penaltyFee < 5000) $penaltyFee = 5000; // Minimum penalty

    $newTotalAmount += $penaltyFee;
}

// ==========================
// CALL SERVICE (Atomic)
// ==========================
try {
    $service = new OrderService($conn);

    // Call the new atomic method we created
    $service->confirmPickup(
        $orderId,
        $shipperId,
        $actualWeight,
        $pickupProofPath, // Can be null
        $penaltyFee,
        $newTotalAmount
    );

    Response::success("Pickup confirmed successfully", [
        "order_id"    => $orderId,
        "order_code"  => $order["order_code"],
        "status"      => 4,
        "penalty_fee" => $penaltyFee,
        "new_total"   => $newTotalAmount,
        "image_url"   => $pickupProofPath
    ]);
} catch (Exception $e) {
    Response::serverError($e->getMessage());
}

$conn->close();
