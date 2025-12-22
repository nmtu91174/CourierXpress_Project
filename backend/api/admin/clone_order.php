<?php
// backend/api/admin/clone_order.php
// CLONE ORDER – Enterprise Standard
// Creates a NEW order from a cancelled order (does NOT restore the original)

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
require_role(["admin", "agent"]); // Admin and Agent can clone

$userId = $GLOBALS['auth_user']['id'];
$role   = $GLOBALS['auth_user']['role'];

// ==========================
// INPUT
// ==========================
$data = json_decode(file_get_contents("php://input"), true);
$orderId = (int)($data["order_id"] ?? 0);
$cloneReason = trim($data["clone_reason"] ?? "Order cloned by " . $role);

if ($orderId <= 0) {
    Response::error("Missing order_id");
}

// ==========================
// CLONE ORDER (Create NEW order)
// ==========================
try {
    $conn->begin_transaction();

    // 1️⃣ Get original order data
    // Note: distance_km is not stored in DB, we'll use a default or calculate from addresses
    $check = $conn->prepare(
        "SELECT 
            id, order_code, customer_id, agent_id, shipper_id,
            sender_name, sender_phone, sender_address,
            receiver_name, receiver_phone, receiver_address,
            category_id, weight, length, width, height,
            service_type, notes, payer_type,
            payment_method_id, cod_amount, total_shipping_fee,
            status, previous_status
         FROM orders WHERE id = ?"
    );
    $check->bind_param("i", $orderId);
    $check->execute();
    $res = $check->get_result();

    if ($res->num_rows === 0) {
        $conn->rollback();
        Response::error("Order not found");
    }

    $originalOrder = $res->fetch_assoc();
    
    // 2️⃣ Guard: Only CANCELLED (7) orders at ASSIGNED (previous_status = 3) can be cloned
    // Enterprise Rule: Clone only when assigned but not yet picked up
    $currentStatus = (int)$originalOrder["status"];
    $previousStatus = isset($originalOrder["previous_status"]) ? (int)$originalOrder["previous_status"] : null;
    
    if ($currentStatus !== 7) {
        $conn->rollback();
        Response::error("Only cancelled orders can be cloned");
    }
    
    // Must be cancelled at ASSIGNED (previous_status = 3) and NOT picked up
    if ($previousStatus === null || $previousStatus !== 3) {
        $conn->rollback();
        Response::error("Clone is only allowed for orders cancelled at ASSIGNED status (before pickup). Use Reopen for BOOKED/APPROVED, or Follow-up for orders after pickup.");
    }
    
    // 3️⃣ Create NEW order with copied data
    // Enterprise: New order starts fresh (status = BOOKED, no agent/shipper)
    $orderService = new OrderService($conn);
    
    // Calculate or estimate distance_km from addresses
    // Since distance_km is not stored in DB, we estimate based on addresses
    // Default to 5.0 km if addresses are in same district, 10.0 km if different districts
    $distanceKm = 5.0; // Default distance
    $senderAddress = $originalOrder["sender_address"] ?? "";
    $receiverAddress = $originalOrder["receiver_address"] ?? "";
    
    // Simple estimation: If addresses contain same district name, use 5km, else 10km
    if (!empty($senderAddress) && !empty($receiverAddress)) {
        // Extract district names (simple extraction)
        $senderParts = explode(",", $senderAddress);
        $receiverParts = explode(",", $receiverAddress);
        $senderDistrict = trim(end($senderParts));
        $receiverDistrict = trim(end($receiverParts));
        
        if ($senderDistrict === $receiverDistrict) {
            $distanceKm = 5.0; // Same district
        } else {
            $distanceKm = 10.0; // Different districts
        }
    }
    
    $newOrderData = [
        "customer_id" => (int)$originalOrder["customer_id"],
        "actor_id" => $userId,
        "actor_role" => $role,
        "sender_name" => $originalOrder["sender_name"],
        "sender_phone" => $originalOrder["sender_phone"],
        "sender_address" => $originalOrder["sender_address"],
        "receiver_name" => $originalOrder["receiver_name"],
        "receiver_phone" => $originalOrder["receiver_phone"],
        "receiver_address" => $originalOrder["receiver_address"],
        "category_id" => $originalOrder["category_id"] ? (int)$originalOrder["category_id"] : null,
        "weight" => (int)$originalOrder["weight"],
        "length" => $originalOrder["length"] ? (float)$originalOrder["length"] : null,
        "width" => $originalOrder["width"] ? (float)$originalOrder["width"] : null,
        "height" => $originalOrder["height"] ? (float)$originalOrder["height"] : null,
        "service_type" => $originalOrder["service_type"] ? (int)$originalOrder["service_type"] : null,
        "notes" => ($originalOrder["notes"] ?? "") . " [Cloned from " . $originalOrder["order_code"] . "]",
        "payer_type" => (int)$originalOrder["payer_type"],
        "payment_method_id" => $originalOrder["payment_method_id"] ? (int)$originalOrder["payment_method_id"] : null,
        "cod_amount" => $originalOrder["cod_amount"] ? (float)$originalOrder["cod_amount"] : 0,
        "distance_km" => $distanceKm, // Add distance_km (estimated from addresses)
    ];
    
    // Create new order (status = BOOKED, no agent/shipper)
    // Note: OrderService::create() returns an array with order_id, order_code, shipping_fee
    $createResult = $orderService->create($newOrderData, []);
    
    if (!$createResult || !isset($createResult["order_id"])) {
        $conn->rollback();
        Response::error("Failed to create cloned order");
    }
    
    $newOrderId = (int)$createResult["order_id"];
    $newOrderCode = $createResult["order_code"] ?? null;
    
    // 4️⃣ Get new order code for response (if not already in result)
    if (!$newOrderCode) {
        $newOrderCheck = $conn->prepare("SELECT id, order_code FROM orders WHERE id = ?");
        $newOrderCheck->bind_param("i", $newOrderId);
        $newOrderCheck->execute();
        $newOrderRes = $newOrderCheck->get_result();
        $newOrder = $newOrderRes->fetch_assoc();
        $newOrderCode = $newOrder["order_code"] ?? null;
    } else {
        $newOrder = ["order_code" => $newOrderCode];
    }
    
    // 5️⃣ DB system log
    $notify = new NotificationService($conn);
    $notify->log(
        "CLONE_ORDER",
        "orders",
        $newOrderId, // Now correctly an int
        $userId
    );
    
    // 6️⃣ AUDIT LOG (FILE – ISO 27001)
    $auditLine = sprintf(
        "time=%s event=CLONE_ORDER actor_id=%d actor_role=%s resource=order resource_id=%d original_order_id=%d outcome=SUCCESS message=\"Clone order %s from %s\"\n",
        date("c"),
        $userId,
        $role,
        $newOrderId,
        $orderId,
        $newOrderCode,
        $originalOrder["order_code"]
    );

    $logFile = __DIR__ . "/../../logs/audit.log";
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }

    file_put_contents(
        $logFile,
        $auditLine,
        FILE_APPEND | LOCK_EX
    );

    $conn->commit();

    Response::success("Order cloned successfully", [
        "new_order_id" => $newOrderId,
        "new_order_code" => $newOrderCode,
        "original_order_id" => $orderId,
        "original_order_code" => $originalOrder["order_code"]
    ]);

} catch (Exception $e) {
    if (isset($conn)) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackEx) {
            // Ignore rollback errors
        }
    }
    error_log("CLONE ORDER ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError($e->getMessage());
} catch (Error $e) {
    if (isset($conn)) {
        try {
            $conn->rollback();
        } catch (Exception $rollbackEx) {
            // Ignore rollback errors
        }
    }
    error_log("CLONE ORDER FATAL ERROR: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    Response::serverError("System error: " . $e->getMessage());
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

