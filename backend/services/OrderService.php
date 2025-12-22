<?php
// backend/services/OrderService.php
// FULL WORKFLOW – SAFE VERSION (Atomic Transactions)

require_once __DIR__ . "/../core/BaseService.php";
require_once __DIR__ . "/FeeService.php";
require_once __DIR__ . "/NotificationService.php";

class OrderService extends BaseService
{
    /* ================= STATUS MAP ================= */
    public const STATUS_BOOKED    = 1;
    public const STATUS_APPROVED  = 2;
    public const STATUS_ASSIGNED  = 3;
    public const STATUS_PICKED    = 4;
    public const STATUS_DELIVERED = 5;

    /* =====================================================
     * CREATE ORDER (customer / admin / agent)
     * ===================================================== */
    // Giữ nguyên code cũ của bạn
    public function create(array $data, array $images = [])
    {
        return $this->transaction(function () use ($data, $images) {

            /* ---------- 1. BASIC DATA ---------- */
            $orderCode   = $this->generateOrderCode();
            $invoiceCode = $this->generateInvoiceNumber();

            $customerId = (int)($data["customer_id"] ?? 0);
            if ($customerId <= 0) throw new Exception("customer_id is required");

            $actorId   = (int)($data["actor_id"] ?? 0);
            $actorRole = (string)($data["actor_role"] ?? "");
            if ($actorId <= 0 || $actorRole === "") {
                throw new Exception("actor_id / actor_role is required");
            }

            if (!in_array($actorRole, ["customer", "admin", "agent"], true)) {
                throw new Exception("Role {$actorRole} not allowed");
            }

            /* ---------- 2. STATUS FLOW ---------- */
            $agentId   = null;
            $shipperId = null;
            $status    = self::STATUS_BOOKED;

            if ($actorRole === "agent") {
                $agentId = $actorId;
                $status  = self::STATUS_APPROVED;
            }

            /* ---------- 3. PACKAGE INFO ---------- */
            // Weight is now in GRAMS (INT) instead of KG (FLOAT)
            $weight = (int)($data["weight"] ?? 0);
            if ($weight <= 0) throw new Exception("weight is required");

            $length = (float)($data["length"] ?? 0);
            $width  = (float)($data["width"] ?? 0);
            $height = (float)($data["height"] ?? 0);

            $distanceKm = (float)($data["distance_km"] ?? 0);
            if ($distanceKm <= 0) throw new Exception("distance_km is required");

            // Category logic
            $categoryId = null;
            if (isset($data["category_id"]) && (int)$data["category_id"] > 0) {
                $catId = (int)$data["category_id"];
                $checkCat = $this->prepare("SELECT id FROM item_categories WHERE id = ?");
                $checkCat->bind_param("i", $catId);
                $checkCat->execute();
                if ($checkCat->get_result()->num_rows > 0) {
                    $categoryId = $catId;
                }
                $checkCat->close();
            }

            $serviceType = (int)($data["service_type"] ?? 0);
            $paymentId   = (int)($data["payment_method_id"] ?? 0);
            $codAmount   = (float)($data["cod_amount"] ?? 0);

            if ($serviceType <= 0 || $paymentId <= 0) {
                throw new Exception("service_type / payment_method_id is required");
            }

            // Validate service_type
            $checkService = $this->prepare("SELECT id FROM service_types WHERE id = ?");
            $checkService->bind_param("i", $serviceType);
            $checkService->execute();
            if ($checkService->get_result()->num_rows === 0) {
                $checkService->close();
                throw new Exception("service_type does not exist");
            }
            $checkService->close();

            // Validate payment_method_id
            $checkPayment = $this->prepare("SELECT id FROM payment_methods WHERE id = ?");
            $checkPayment->bind_param("i", $paymentId);
            $checkPayment->execute();
            if ($checkPayment->get_result()->num_rows === 0) {
                $checkPayment->close();
                throw new Exception("payment_method_id does not exist");
            }
            $checkPayment->close();

            // Validate status
            $checkStatus = $this->prepare("SELECT id FROM statuses WHERE id = ?");
            $checkStatus->bind_param("i", $status);
            $checkStatus->execute();
            if ($checkStatus->get_result()->num_rows === 0) {
                $checkStatus->close();
                throw new Exception("status does not exist");
            }
            $checkStatus->close();

            /* ---------- 4. FEE ---------- */
            $feeService = new FeeService($this->conn);
            $feeResult  = $feeService->calculate([
                "distance_km"  => $distanceKm,
                "weight"       => $weight,
                "length"       => $length,
                "width"        => $width,
                "height"       => $height,
                "cod_amount"   => $codAmount,
                "service_type" => $serviceType
            ]);

            $shippingFee = (float)$feeResult["shipping_fee"];
            $totalAmount = (float)($feeResult["total_with_cod"] ?? $feeResult["shipping_fee"]);

            /* ---------- 5. SENDER / RECEIVER ---------- */
            $senderName    = trim($data["sender_name"] ?? "");
            $senderPhone   = trim($data["sender_phone"] ?? "");
            $senderAddress = trim($data["sender_address"] ?? "");

            $receiverName    = trim($data["receiver_name"] ?? "");
            $receiverPhone   = trim($data["receiver_phone"] ?? "");
            $receiverAddress = trim($data["receiver_address"] ?? "");

            if ($senderName === "" || $senderPhone === "" || $senderAddress === "") {
                throw new Exception("Sender info required");
            }
            if ($receiverName === "" || $receiverPhone === "" || $receiverAddress === "") {
                throw new Exception("Receiver info required");
            }

            $notes = (string)($data["notes"] ?? "");

            /* ---------- 3.5. PAYER TYPE ---------- */
            // payer_type: 1 = Người gửi trả, 2 = Người nhận trả
            $payerType = (int)($data["payer_type"] ?? 1);
            if (!in_array($payerType, [1, 2], true)) {
                throw new Exception("payer_type phải là 1 (Người gửi trả) hoặc 2 (Người nhận trả)");
            }

            /* ---------- 6. INSERT ORDER ---------- */
            $stmt = $this->prepare("
                INSERT INTO orders (
                    customer_id, agent_id, shipper_id, order_code,
                    sender_name, sender_phone, sender_address,
                    receiver_name, receiver_phone, receiver_address,
                    category_id,
                    weight, length, width, height,
                    service_type, notes, payer_type,
                    status,
                    total_amount, cod_amount, total_shipping_fee,
                    payment_method_id
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?,
                    ?, ?, ?,
                    ?
                )
            ");

            // Type string: 23 parameters - đếm cẩn thận
            // 1-3: customer_id(i), agent_id(i), shipper_id(i) = iii
            // 4-10: order_code(s), sender_name(s), sender_phone(s), sender_address(s), receiver_name(s), receiver_phone(s), receiver_address(s) = sssssss
            // 11: category_id(i) = i
            // 12-15: weight(d), length(d), width(d), height(d) = dddd (weight là DECIMAL trong DB)
            // 16: service_type(i) = i
            // 17: notes(s) = s
            // 18: payer_type(i) = i
            // 19: status(i) = i
            // 20-22: total_amount(d), cod_amount(d), total_shipping_fee(d) = ddd
            // 23: payment_method_id(i) = i
            // Tổng: iii(3) + sssssss(7) + i(1) + dddd(4) + i(1) + s(1) + i(1) + i(1) + ddd(3) + i(1) = 23
            // Type string: "iiisssssssiddddissidddi" = 23 ký tự
            // Xử lý NULL cho category_id, agent_id, shipper_id
            $categoryIdParam = $categoryId;
            $agentIdParam = $agentId;
            $shipperIdParam = $shipperId;
            
            // Convert weight to float for binding (DB accepts DECIMAL)
            $weightFloat = (float)$weight;
            
            $typeString = "iiisssssssiddddissidddi";
            
            $bindResult = $stmt->bind_param(
                $typeString,
                $customerId,
                $agentIdParam,
                $shipperIdParam,
                $orderCode,
                $senderName,
                $senderPhone,
                $senderAddress,
                $receiverName,
                $receiverPhone,
                $receiverAddress,
                $categoryIdParam,
                $weightFloat,
                $length,
                $width,
                $height,
                $serviceType,
                $notes,
                $payerType,
                $status,
                $totalAmount,
                $codAmount,
                $shippingFee,
                $paymentId
            );
            
            if (!$bindResult) {
                $typeStrLen = strlen($typeString);
                throw new Exception("bind_param failed: " . $stmt->error . " | Type string: '{$typeString}' | Length: {$typeStrLen} | Expected: 23 params");
            }

            $stmt->execute();
            $orderId = (int)$this->conn->insert_id;

            /* ---------- 7. FEES + INVOICE ---------- */
            $feeService->saveOrderFees($orderId, $feeResult["fees"] ?? []);

            $inv = $this->prepare("
                INSERT INTO invoices (order_id, invoice_number, total_amount, status, payment_method_id)
                VALUES (?, ?, ?, 'unpaid', ?)
            ");
            $inv->bind_param("isdi", $orderId, $invoiceCode, $shippingFee, $paymentId);
            $inv->execute();

            /* ---------- 8. APPROVAL ---------- */
            if ($agentId) {
                $ap = $this->prepare("
                    INSERT INTO order_approvals (order_id, agent_id, status)
                    VALUES (?, ?, 'approved')
                ");
                $ap->bind_param("ii", $orderId, $agentId);
                $ap->execute();
            }

            /* ---------- 9. HISTORY + IMAGES ---------- */
            $this->logHistory($orderId, $status, $actorId, $actorRole, "Create order {$orderCode}");

            foreach ($images as $url) {
                $url = trim((string)$url);
                if ($url === "") continue;

                $img = $this->prepare("
                    INSERT INTO order_images (order_id, image_url, type)
                    VALUES (?, ?, 'pickup')
                ");
                $img->bind_param("is", $orderId, $url);
                $img->execute();
            }

            // Optional: Call logAudit if exists
            if (method_exists($this, 'logAudit')) {
                $this->logAudit($actorId, $actorRole, "CREATE_ORDER", $orderId, $orderCode);
            }

            return [
                "order_id"     => $orderId,
                "order_code"   => $orderCode,
                "shipping_fee" => $shippingFee
            ];
        });
    }

    /* =====================================================
     * UPDATE STATUS
     * ===================================================== */
    // Giữ nguyên logic, sửa thông báo lỗi sang Tiếng Anh
    public function updateStatus(int $orderId, int $newStatus, int $actorId, string $actorRole, string $note)
    {
        return $this->transaction(function () use ($orderId, $newStatus, $actorId, $actorRole, $note) {

            $this->ensureOrderExists($orderId);

            $checkStatus = $this->prepare("SELECT id FROM statuses WHERE id = ?");
            $checkStatus->bind_param("i", $newStatus);
            $checkStatus->execute();
            if ($checkStatus->get_result()->num_rows === 0) {
                $checkStatus->close();
                throw new Exception("Status {$newStatus} not found. Allowed: 1..6");
            }
            $checkStatus->close();

            // [LƯU Ý QUAN TRỌNG] Cột trong DB là 'status', không phải 'status_id'
            $stmt = $this->prepare("UPDATE orders SET status = ? WHERE id = ?");
            $stmt->bind_param("ii", $newStatus, $orderId);
            $stmt->execute();

            $this->logHistory($orderId, $newStatus, $actorId, $actorRole, $note);

            if (method_exists($this, 'logAudit')) {
                $this->logAudit($actorId, $actorRole, "UPDATE_STATUS", $orderId, $note);
            }

            return true;
        });
    }

    /* =====================================================
     * [NEW METHOD] CONFIRM PICKUP (ATOMIC TRANSACTION)
     * =====================================================
     * Nhiệm vụ: Cập nhật status -> 4, lưu ảnh, cập nhật cân nặng và tính tiền.
     * Tất cả diễn ra trong 1 transaction để đảm bảo an toàn.
     */
    public function confirmPickup(int $orderId, int $shipperId, float $actualWeight, string $proofUrl, float $penaltyFee, float $newTotalAmount)
    {
        return $this->transaction(function () use ($orderId, $shipperId, $actualWeight, $proofUrl, $penaltyFee, $newTotalAmount) {

            // 1. Kiểm tra quyền sở hữu và Status hiện tại (Phải là 3 - Assigned)
            $check = $this->prepare("SELECT status FROM orders WHERE id = ? AND shipper_id = ?");
            $check->bind_param("ii", $orderId, $shipperId);
            $check->execute();
            $res = $check->get_result()->fetch_assoc();

            if (!$res) throw new Exception("Order not found or not assigned to you.");
            // 3 = STATUS_ASSIGNED
            if ((int)$res['status'] !== self::STATUS_ASSIGNED) throw new Exception("Order is not in 'Assigned' status (Must be 3).");

            // 2. Cập nhật thông tin Pickup
            // status -> 4 (STATUS_PICKED)
            $statusPicked = self::STATUS_PICKED;

            // Sử dụng đúng tên cột trong database: 'status', 'actual_weight', 'pickup_proof', 'penalty_fee'
            $stmt = $this->prepare("
                UPDATE orders SET 
                    actual_weight = ?, 
                    pickup_proof = ?, 
                    penalty_fee = ?, 
                    total_amount = ?, 
                    status = ?
                WHERE id = ?
            ");

            // Bind: d(double), s(string), d, d, i(int), i
            $stmt->bind_param("dsddii", $actualWeight, $proofUrl, $penaltyFee, $newTotalAmount, $statusPicked, $orderId);

            if (!$stmt->execute()) {
                throw new Exception("Database update failed: " . $stmt->error);
            }

            // 3. Ghi lịch sử đơn hàng (Tiếng Anh)
            $note = "Shipper picked up package. Actual Weight: {$actualWeight}g.";
            if ($penaltyFee > 0) $note .= " Penalty Fee Applied: {$penaltyFee}";

            $this->logHistory($orderId, $statusPicked, $shipperId, 'shipper', $note);

            // 4. Log Audit hệ thống
            if (method_exists($this, 'logAudit')) {
                $this->logAudit($shipperId, 'shipper', "CONFIRM_PICKUP", $orderId, "Weight: $actualWeight, Penalty: $penaltyFee");
            }

            return true;
        });
    }

    /* =====================================================
     * ASSIGN AGENT (ADMIN)
     * ===================================================== */
    public function assignAgentByAdmin(int $orderId, int $agentId, int $adminId, string $note = "Assign agent")
    {
        return $this->transaction(function () use ($orderId, $agentId, $adminId, $note) {

            $stmt = $this->prepare("
                UPDATE orders SET agent_id = ?, status = ?
                WHERE id = ? AND agent_id IS NULL
            ");
            $statusApproved = self::STATUS_APPROVED;
            $stmt->bind_param("iii", $agentId, $statusApproved, $orderId);
            $stmt->execute();

            if ($stmt->affected_rows === 0) {
                throw new Exception("Order already has agent");
            }

            $this->logHistory($orderId, self::STATUS_APPROVED, $adminId, "system", $note);

            if (method_exists($this, 'logAudit')) {
                $this->logAudit($adminId, "admin", "ASSIGN_AGENT", $orderId, "agent={$agentId}");
            }

            return true;
        });
    }

    /* =====================================================
     * ASSIGN SHIPPER (ADMIN / AGENT)
     * ===================================================== */
    public function assignShipper(int $orderId, int $shipperId, int $actorId, string $role, string $note = "Assign shipper")
    {
        return $this->transaction(function () use ($orderId, $shipperId, $actorId, $role, $note) {

            // ... (Đoạn kiểm tra logic cũ giữ nguyên) ...
            $check = $this->prepare("SELECT status, agent_id FROM orders WHERE id = ?");
            $check->bind_param("i", $orderId);
            $check->execute();
            $row = $check->get_result()->fetch_assoc();

            if (!$row) throw new Exception("Order not found");

            // Đơn hàng phải ở trạng thái 2 (Approved) mới được gán Shipper
            if ((int)$row["status"] !== self::STATUS_APPROVED) {
                throw new Exception("Order not approved (Status must be 2)");
            }

            if ($role === "agent" && (int)$row["agent_id"] !== $actorId) {
                throw new Exception("Order not belong to agent");
            }

            // [SỬA ĐOẠN NÀY]
            // Cập nhật shipper_id nhưng GIỮ NGUYÊN STATUS LÀ 2 (Approved)
            // Để Shipper thấy đơn ở Dashboard và bấm "Nhận đơn" (chuyển sang 3)
            $stmt = $this->prepare("
                UPDATE orders SET shipper_id = ?, status = ?
                WHERE id = ? AND shipper_id IS NULL
            ");

            // [THAY ĐỔI QUAN TRỌNG] 
            // Cũ: $statusAssigned = self::STATUS_ASSIGNED; (Là 3 - Sai luồng)
            // Mới: $statusAssigned = self::STATUS_APPROVED; (Là 2 - Đúng luồng)
            $statusAssigned = self::STATUS_APPROVED;

            $stmt->bind_param("iii", $shipperId, $statusAssigned, $orderId);
            $stmt->execute();

            if ($stmt->affected_rows === 0) {
                throw new Exception("Order already has shipper or update failed");
            }

            // Ghi log
            $this->logHistory($orderId, self::STATUS_APPROVED, $actorId, $role, $note);

            if (method_exists($this, 'logAudit')) {
                $this->logAudit($actorId, $role, "ASSIGN_SHIPPER", $orderId, "shipper={$shipperId}");
            }

            return true;
        });
    }

    /* ================= HELPERS ================= */

    private function ensureOrderExists(int $orderId): void
    {
        $stmt = $this->prepare("SELECT id FROM orders WHERE id = ?");
        $stmt->bind_param("i", $orderId);
        $stmt->execute();

        if ($stmt->get_result()->num_rows === 0) {
            throw new Exception("Order {$orderId} not found");
        }
    }

    private function logHistory(int $orderId, int $statusId, int $userId, string $role, string $note)
    {
        if ($role === "admin") {
            $role = "system";
        }

        $stmt = $this->prepare("
            INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->bind_param("iiiss", $orderId, $statusId, $userId, $role, $note);
        $stmt->execute();
    }

    private function generateOrderCode(): string
    {
        $stmt = $this->prepare("SELECT MAX(id) AS max_id FROM orders");
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $nextNumber = ($row && $row['max_id']) ? (int)$row['max_id'] + 1 : 1;

        $code = "ORD" . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        $check = $this->prepare("SELECT id FROM orders WHERE order_code = ?");
        $check->bind_param("s", $code);
        $check->execute();

        if ($check->get_result()->num_rows > 0) {
            $stmt2 = $this->prepare("SELECT MAX(CAST(SUBSTRING(order_code, 4) AS UNSIGNED)) AS max_num FROM orders WHERE order_code LIKE 'ORD%'");
            $stmt2->execute();
            $result2 = $stmt2->get_result();
            $row2 = $result2->fetch_assoc();
            $maxNum = ($row2 && $row2['max_num']) ? (int)$row2['max_num'] : 0;
            $nextNumber = $maxNum + 1;
            $code = "ORD" . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
        }

        return $code;
    }

    private function generateInvoiceNumber(): string
    {
        do {
            $code = "INV" . rand(1000, 9999);
            $stmt = $this->prepare("SELECT id FROM invoices WHERE invoice_number = ?");
            $stmt->bind_param("s", $code);
            $stmt->execute();
        } while ($stmt->get_result()->num_rows > 0);

        return $code;
    }

    /**
     * Update order status and log history using MySQLi Transaction
     * [FIXED] Corrected column name 'status_id' to 'status' to match 'orders' table
     */
    public function updateOrderStatusWithHistory($orderId, $newStatusId, $userId, $userRole, $note)
    {
        global $conn;

        $conn->begin_transaction();

        try {
            // [FIXED] 'status_id' -> 'status' (Khớp với SQL eproject.sql)
            $sqlOrder = "UPDATE orders SET status = ? WHERE id = ?";

            $stmtOrder = $conn->prepare($sqlOrder);
            if (!$stmtOrder) {
                throw new Exception("Prepare failed (Order): " . $conn->error);
            }

            $stmtOrder->bind_param("ii", $newStatusId, $orderId);

            if (!$stmtOrder->execute()) {
                throw new Exception("Execute failed (Order): " . $stmtOrder->error);
            }
            $stmtOrder->close();

            $sqlHistory = "INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at) 
                           VALUES (?, ?, ?, ?, ?, NOW())";

            $stmtHistory = $conn->prepare($sqlHistory);
            if (!$stmtHistory) {
                throw new Exception("Prepare failed (History): " . $conn->error);
            }

            $stmtHistory->bind_param("iiiss", $orderId, $newStatusId, $userId, $userRole, $note);

            if (!$stmtHistory->execute()) {
                throw new Exception("Execute failed (History): " . $stmtHistory->error);
            }
            $stmtHistory->close();

            $conn->commit();
            return true;
        } catch (Exception $e) {
            $conn->rollback();
            throw $e;
        }
    }

    /* =====================================================
     * [NEW METHOD] CONFIRM DELIVERY (ATOMIC TRANSACTION)
     * =====================================================
     */
    public function confirmDelivery(int $orderId, int $shipperId, string $proofUrl)
    {
        return $this->transaction(function () use ($orderId, $shipperId, $proofUrl) {

            // 1. Validate Order Status (Must be 4 - In Transit/Picked Up)
            $check = $this->prepare("SELECT status FROM orders WHERE id = ? AND shipper_id = ?");
            $check->bind_param("ii", $orderId, $shipperId);
            $check->execute();
            $res = $check->get_result()->fetch_assoc();

            if (!$res) throw new Exception("Order not found or not assigned to you.");

            // STATUS_PICKED = 4
            if ((int)$res['status'] !== self::STATUS_PICKED) throw new Exception("Order is not in 'In Transit' status (Must be 4).");

            // 2. Update Order to Delivered (5) and save Proof Image
            $statusDelivered = self::STATUS_DELIVERED; // 5

            $stmt = $this->prepare("
                UPDATE orders SET 
                    status = ?, 
                    delivery_proof = ?
                WHERE id = ?
            ");

            // Bind: i(int), s(string), i(int)
            $stmt->bind_param("isi", $statusDelivered, $proofUrl, $orderId);

            if (!$stmt->execute()) {
                throw new Exception("Database update failed: " . $stmt->error);
            }

            // 3. Log History
            $note = "Shipper delivered successfully.";
            $this->logHistory($orderId, $statusDelivered, $shipperId, 'shipper', $note);

            // 4. Log Audit
            if (method_exists($this, 'logAudit')) {
                $this->logAudit($shipperId, 'shipper', "CONFIRM_DELIVERY", $orderId, "Delivered successfully");
            }

            return true;
        });
    }
}
