// backend/api/shipper.php

<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Bắt buộc phải có db.php để kết nối DB
// Giả định db.php nằm ở thư mục gốc backend/ hoặc /backend/api/db.php
// Dựa trên hình ảnh, tôi sẽ dùng đường dẫn tuyệt đối (hoặc tương đối)
include "./backend/db.php"; // Thay đổi đường dẫn này nếu db.php nằm ở vị trí khác!

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);

// ----------------------------------------------------
// Tạm thời hardcode Shipper ID là 4 (Phạm Quốc Shipper)
$shipper_id = 4;
// ----------------------------------------------------

if (!$shipper_id) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized access."]);
    exit;
}

// Hàm tiện ích: Ghi lịch sử đơn hàng
function log_order_history($conn, $order_id, $status_id, $user_id, $note = null)
{
    // Role cố định là 'shipper'
    $role = 'shipper';
    $stmt = $conn->prepare("INSERT INTO order_history (order_id, status_id, user_id, role, note) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("iisis", $order_id, $status_id, $user_id, $role, $note);
    $stmt->execute();
    $stmt->close();
}


switch ($method) {
    case 'GET':
        // ===============================================
        // GÓI 2.1.3: Lấy Danh sách Đơn Chờ Nhận (Status = 2)
        // ===============================================
        if (isset($_GET['action']) && $_GET['action'] === 'list_to_pickup') {

            $status_to_fetch = 2; // Mã trạng thái: Agent đã duyệt đơn

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

        // ==================================================
        // GÓI 2.1.4: Lấy Chi tiết Đơn hàng
        // ==================================================
        if (isset($_GET['action']) && $_GET['action'] === 'order_detail' && isset($_GET['order_id'])) {
            $order_id = (int)$_GET['order_id'];

            // Lấy thông tin cơ bản
            $sql_order = "SELECT 
                            o.*, 
                            s.description AS status_desc,
                            u_cust.name AS customer_name 
                          FROM orders o
                          JOIN statuses s ON o.status = s.id
                          LEFT JOIN users u_cust ON o.customer_id = u_cust.id
                          WHERE o.id = ? AND o.shipper_id = ?";

            $stmt_order = $conn->prepare($sql_order);
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

            // Lấy chi tiết phí
            $sql_fees = "SELECT of.amount, f.name, f.type 
                         FROM order_fees of
                         JOIN fees f ON of.fee_id = f.id
                         WHERE of.order_id = ?";
            $stmt_fees = $conn->prepare($sql_fees);
            $stmt_fees->bind_param("i", $order_id);
            $stmt_fees->execute();
            $result_fees = $stmt_fees->get_result();
            $fees_list = [];
            while ($row = $result_fees->fetch_assoc()) {
                $fees_list[] = $row;
            }
            $stmt_fees->close();

            // Lấy hình ảnh (sẽ cần cho việc kiểm tra)
            $sql_images = "SELECT image_url, type, created_at 
                           FROM order_images
                           WHERE order_id = ?";
            $stmt_images = $conn->prepare($sql_images);
            $stmt_images->bind_param("i", $order_id);
            $stmt_images->execute();
            $result_images = $stmt_images->get_result();
            $images_list = [];
            while ($row = $result_images->fetch_assoc()) {
                $images_list[] = $row;
            }
            $stmt_images->close();

            // Kết hợp dữ liệu và trả về
            $order_detail['fees'] = $fees_list;
            $order_detail['images'] = $images_list;

            echo json_encode(["status" => "success", "data" => $order_detail]);
            exit;
        }

        // ==================================================
        // API GET: Lấy Đơn hàng Đang Giao/Đang Lấy (Status 4, 5)
        // ==================================================
        if (isset($_GET['action']) && $_GET['action'] === 'list_in_progress') {

            // Logic: Lấy các đơn status = 4 HOẶC 5
            $status_list = [4, 5];
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
                    WHERE o.shipper_id = ? AND o.status IN (?, ?)";

            $stmt_ip = $conn->prepare($in_progress_sql);
            $stmt_ip->bind_param("iii", $shipper_id, $status_list[0], $status_list[1]);
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


        // Nếu không có action phù hợp
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid action or missing ID."]);
        break;

    case 'PUT':
        // ===============================================
        // GÓI 2.2.4: Shipper xác nhận nhận đơn (Status 2 -> 4)
        // ===============================================
        if (isset($_GET['action']) && $_GET['action'] === 'confirm_pickup') {

            $order_id = $data['order_id'] ?? null;

            if (!$order_id) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Thiếu mã đơn hàng."]);
                exit;
            }

            // 1. Cập nhật trạng thái trong bảng orders (Status 4 = pickup_pending)
            $new_status = 4; // Mã trạng thái: Shipper đang đi lấy hàng

            // Chỉ cho phép Shipper (ID 4) cập nhật đơn đang ở trạng thái 2 (approved)
            $sql_update_order = "UPDATE orders 
                                 SET status = ?
                                 WHERE id = ? AND shipper_id = ? AND status = 2";

            $stmt_update = $conn->prepare($sql_update_order);
            $stmt_update->bind_param("iii", $new_status, $order_id, $shipper_id);

            if ($stmt_update->execute() && $stmt_update->affected_rows > 0) {
                // 2. Ghi lịch sử đơn hàng (Đây sẽ là mốc thời gian pickup_time chính thức)
                $note = "Shipper (ID: {$shipper_id}) đã xác nhận nhận đơn, đang trên đường đi lấy hàng.";
                log_order_history($conn, $order_id, $new_status, $shipper_id, $note);

                echo json_encode([
                    "status" => "success",
                    "message" => "Đã xác nhận nhận đơn. Trạng thái: Đang tới lấy hàng.",
                    "new_status" => $new_status
                ]);
            } else {
                http_response_code(409); // Conflict
                echo json_encode(["status" => "error", "message" => "Không thể xác nhận đơn hàng. Có thể đơn đã được xử lý hoặc không được gán cho bạn."]);
            }
            $stmt_update->close();
            exit;
        }

        // CÁC API PUT/POST KHÁC SẼ ĐƯỢC BỔ SUNG VÀO ĐÂY SAU

    default:
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method not allowed"]);
        break;
}
?>