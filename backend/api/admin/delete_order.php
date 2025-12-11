<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "../../db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['order_id'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Thiếu Order ID"]);
    exit;
}

$id = $data['order_id'];

// Bắt đầu Transaction (Xóa hết hoặc không xóa gì cả)
$conn->begin_transaction();

try {
    // 1. Xóa các bảng phụ trước (Thứ tự quan trọng)
    $conn->query("DELETE FROM order_fees WHERE order_id = $id");
    $conn->query("DELETE FROM order_history WHERE order_id = $id");
    $conn->query("DELETE FROM order_approvals WHERE order_id = $id");
    $conn->query("DELETE FROM order_images WHERE order_id = $id");

    // Riêng invoices và payments có thể liên kết, xóa payments của invoice thuộc order này trước
    // (Tạm thời bỏ qua payments nếu logic chưa phức tạp, ta xóa invoices)
    $conn->query("DELETE FROM invoices WHERE order_id = $id");

    // 2. Cuối cùng mới xóa bảng chính Orders
    $stmt = $conn->prepare("DELETE FROM orders WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Đã xóa đơn hàng vĩnh viễn"]);
    } else {
        throw new Exception("Không tìm thấy đơn hàng để xóa");
    }
    $stmt->close();
} catch (Exception $e) {
    $conn->rollback(); // Hoàn tác nếu có lỗi
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Lỗi xóa đơn: " . $e->getMessage()]);
}

$conn->close();
