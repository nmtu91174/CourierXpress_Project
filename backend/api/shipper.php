<?php
// backend/api/shipper.php

require_once __DIR__ . "/../core/Cors.php";
Cors::handlePreflight();
Cors::setHeaders();

// ✅ DB (đúng đường dẫn)
require_once __DIR__ . "/../db.php";

// Nếu anh có Response.php thì dùng, không có thì bỏ
// require_once __DIR__ . "/../core/Response.php";

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = json_decode(file_get_contents("php://input"), true) ?: [];

// ----------------------------------------------------
// ✅ DEV MODE: tạm hardcode shipper_id để test UI
// ----------------------------------------------------
$shipper_id = 4;
// ----------------------------------------------------

if (!$shipper_id) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized access."]);
    exit;
}

// ===== Utility: log history =====
function log_order_history($conn, $order_id, $status_id, $user_id, $note = null)
{
    $role = 'shipper';
    $stmt = $conn->prepare("INSERT INTO order_history (order_id, status_id, user_id, role, note) VALUES (?, ?, ?, ?, ?)");
    if (!$stmt) {
        error_log("log_order_history prepare error: " . $conn->error);
        return;
    }
    $stmt->bind_param("iisis", $order_id, $status_id, $user_id, $role, $note);
    $stmt->execute();
    $stmt->close();
}

switch ($method) {

    // ==========================
    // GET
    // ==========================
    case 'GET': {

        // 2.1.3: list_to_pickup
        if (isset($_GET['action']) && $_GET['action'] === 'list_to_pickup') {

            $status_to_fetch = 2;

            $sql = "SELECT 
                        o.id, 
                        o.order_code, 
                        o.receiver_name, 
                        o.receiver_address,
                        o.total_shipping_fee,
                        s.description AS status_desc,
                        o.created_at
                    FROM orders o
                    JOIN statuses s ON o.status = s.id
                    WHERE o.shipper_id = ? AND o.status = ?";

            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "DB prepare error"]);
                exit;
            }

            $stmt->bind_param("ii", $shipper_id, $status_to_fetch);
            $stmt->execute();
            $result = $stmt->get_result();

            $orders_list = [];
            while ($row = $result->fetch_assoc()) {
                $orders_list[] = $row;
            }

            echo json_encode(["status" => "success", "data" => $orders_list]);
            $stmt->close();
            exit;
        }

        // 2.1.4: order_detail
        if (
            isset($_GET['action']) && $_GET['action'] === 'order_detail'
            && isset($_GET['order_id'])
        ) {
            $order_id = (int)$_GET['order_id'];

            $sql_order = "SELECT 
                            o.*, 
                            s.description AS status_desc,
                            u_cust.name AS customer_name 
                          FROM orders o
                          JOIN statuses s ON o.status = s.id
                          LEFT JOIN users u_cust ON o.customer_id = u_cust.id
                          WHERE o.id = ? AND o.shipper_id = ?";

            $stmt_order = $conn->prepare($sql_order);
            if (!$stmt_order) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "DB prepare error"]);
                exit;
            }

            $stmt_order->bind_param("ii", $order_id, $shipper_id);
            $stmt_order->execute();
            $result_order = $stmt_order->get_result();
            $order_detail = $result_order->fetch_assoc();
            $stmt_order->close();

            if (!$order_detail) {
                http_response_code(404);
                echo json_encode(["status" => "error", "message" => "Order not found or not assigned to you."]);
                exit;
            }

            // fees
            $sql_fees = "SELECT of.amount, f.name, f.type 
                         FROM order_fees of
                         JOIN fees f ON of.fee_id = f.id
                         WHERE of.order_id = ?";
            $stmt_fees = $conn->prepare($sql_fees);
            if (!$stmt_fees) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "DB prepare error"]);
                exit;
            }

            $stmt_fees->bind_param("i", $order_id);
            $stmt_fees->execute();
            $result_fees = $stmt_fees->get_result();
            $fees_list = [];
            while ($row = $result_fees->fetch_assoc()) {
                $fees_list[] = $row;
            }
            $stmt_fees->close();

            // images
            $sql_images = "SELECT image_url, type, created_at 
                           FROM order_images
                           WHERE order_id = ?";
            $stmt_images = $conn->prepare($sql_images);
            if (!$stmt_images) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "DB prepare error"]);
                exit;
            }

            $stmt_images->bind_param("i", $order_id);
            $stmt_images->execute();
            $result_images = $stmt_images->get_result();
            $images_list = [];
            while ($row = $result_images->fetch_assoc()) {
                $images_list[] = $row;
            }
            $stmt_images->close();

            $order_detail['fees'] = $fees_list;
            $order_detail['images'] = $images_list;

            echo json_encode(["status" => "success", "data" => $order_detail]);
            exit;
        }

        // list_in_progress
        if (isset($_GET['action']) && $_GET['action'] === 'list_in_progress') {

            $in_progress_sql = "SELECT 
                        o.id, 
                        o.order_code, 
                        o.receiver_name, 
                        o.receiver_address,
                        s.description AS status_desc,
                        o.total_shipping_fee,
                        o.status
                    FROM orders o
                    JOIN statuses s ON o.status = s.id
                    WHERE o.shipper_id = ? AND o.status IN (4, 5)";

            $stmt_ip = $conn->prepare($in_progress_sql);
            if (!$stmt_ip) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "DB prepare error"]);
                exit;
            }

            $stmt_ip->bind_param("i", $shipper_id);
            $stmt_ip->execute();
            $result_ip = $stmt_ip->get_result();

            $in_progress_orders = [];
            while ($row = $result_ip->fetch_assoc()) {
                $in_progress_orders[] = $row;
            }

            echo json_encode(["status" => "success", "data" => $in_progress_orders]);
            $stmt_ip->close();
            exit;
        }

        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid action or missing ID."]);
        exit;
    }

    // ==========================
    // PUT
    // ==========================
    case 'PUT': {

        if (isset($_GET['action']) && $_GET['action'] === 'confirm_pickup') {

            $order_id = isset($data['order_id']) ? (int)$data['order_id'] : 0;

            if (!$order_id) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Thiếu mã đơn hàng."]);
                exit;
            }

            $new_status = 4;

            $sql_update_order = "UPDATE orders 
                                 SET status = ?
                                 WHERE id = ? AND shipper_id = ? AND status = 2";

            $stmt_update = $conn->prepare($sql_update_order);
            if (!$stmt_update) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "DB prepare error"]);
                exit;
            }

            $stmt_update->bind_param("iii", $new_status, $order_id, $shipper_id);

            if ($stmt_update->execute() && $stmt_update->affected_rows > 0) {
                $note = "Shipper (ID: {$shipper_id}) đã xác nhận nhận đơn, đang trên đường đi lấy hàng.";
                log_order_history($conn, $order_id, $new_status, $shipper_id, $note);

                echo json_encode([
                    "status" => "success",
                    "message" => "Đã xác nhận nhận đơn. Trạng thái: Đang tới lấy hàng.",
                    "new_status" => $new_status
                ]);
            } else {
                http_response_code(409);
                echo json_encode(["status" => "error", "message" => "Không thể xác nhận đơn hàng. Có thể đơn đã xử lý hoặc không được gán cho bạn."]);
            }

            $stmt_update->close();
            exit;
        }

        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid action"]);
        exit;
    }

    default:
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method not allowed"]);
        exit;
}
