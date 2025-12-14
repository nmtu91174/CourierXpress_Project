<?php
// backend/services/OrderService.php
// FULL WORKFLOW – SAFE VERSION (NO 500)

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
            $weight = (float)($data["weight"] ?? 0);
            if ($weight <= 0) throw new Exception("weight is required");

            $length = (float)($data["length"] ?? 0);
            $width  = (float)($data["width"] ?? 0);
            $height = (float)($data["height"] ?? 0);

            $distanceKm = (float)($data["distance_km"] ?? 0);
            if ($distanceKm <= 0) throw new Exception("distance_km is required");

            // category_id: nếu <= 0 hoặc không tồn tại thì set NULL (foreign key constraint)
            $categoryId = null;
            if (isset($data["category_id"]) && (int)$data["category_id"] > 0) {
                $catId = (int)$data["category_id"];
                // Validate category_id tồn tại trong item_categories
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
            
            // Validate foreign keys tồn tại trong database
            // Validate service_type
            $checkService = $this->prepare("SELECT id FROM service_types WHERE id = ?");
            $checkService->bind_param("i", $serviceType);
            $checkService->execute();
            if ($checkService->get_result()->num_rows === 0) {
                $checkService->close();
                throw new Exception("service_type không tồn tại trong database");
            }
            $checkService->close();
            
            // Validate payment_method_id
            $checkPayment = $this->prepare("SELECT id FROM payment_methods WHERE id = ?");
            $checkPayment->bind_param("i", $paymentId);
            $checkPayment->execute();
            if ($checkPayment->get_result()->num_rows === 0) {
                $checkPayment->close();
                throw new Exception("payment_method_id không tồn tại trong database");
            }
            $checkPayment->close();
            
            // Validate status (đã được set ở trên, nhưng đảm bảo tồn tại)
            $checkStatus = $this->prepare("SELECT id FROM statuses WHERE id = ?");
            $checkStatus->bind_param("i", $status);
            $checkStatus->execute();
            if ($checkStatus->get_result()->num_rows === 0) {
                $checkStatus->close();
                throw new Exception("status không tồn tại trong database");
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
            $totalAmount = (float)$feeResult["total_fee"];

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

            /* ---------- 6. INSERT ORDER ---------- */
            $stmt = $this->prepare("
                INSERT INTO orders (
                    customer_id, agent_id, shipper_id, order_code,
                    sender_name, sender_phone, sender_address,
                    receiver_name, receiver_phone, receiver_address,
                    category_id,
                    weight, length, width, height,
                    service_type, notes,
                    status,
                    total_amount, cod_amount, total_shipping_fee,
                    payment_method_id
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?,
                    ?, ?, ?, ?,
                    ?, ?,
                    ?,
                    ?, ?, ?,
                    ?
                )
            ");

            // Type string: 22 parameters - đếm theo thứ tự
            // 1-3: customer_id(i), agent_id(i), shipper_id(i) = iii
            // 4-10: order_code(s), sender_name(s), sender_phone(s), sender_address(s), receiver_name(s), receiver_phone(s), receiver_address(s) = sssssss
            // 11: category_id(i) = i
            // 12-15: weight(d), length(d), width(d), height(d) = dddd
            // 16: service_type(i) = i
            // 17: notes(s) = s
            // 18: status(i) = i
            // 19-21: total_amount(d), cod_amount(d), total_shipping_fee(d) = ddd
            // 22: payment_method_id(i) = i
            // Tổng: "iiisssssssiddddisidddi" = 22 ký tự
            // Xử lý NULL cho category_id - cần biến riêng để bind_param có thể thay đổi
            $categoryIdParam = $categoryId;
            $stmt->bind_param(
                "iiisssssssiddddisidddi",
                $customerId,
                $agentId,
                $shipperId,
                $orderCode,
                $senderName,
                $senderPhone,
                $senderAddress,
                $receiverName,
                $receiverPhone,
                $receiverAddress,
                $categoryIdParam,
                $weight,
                $length,
                $width,
                $height,
                $serviceType,
                $notes,
                $status,
                $totalAmount,
                $codAmount,
                $shippingFee,
                $paymentId
            );

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

            $this->logAudit($actorId, $actorRole, "CREATE_ORDER", $orderId, $orderCode);

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
    public function updateStatus(int $orderId, int $newStatus, int $actorId, string $actorRole, string $note)
    {
        return $this->transaction(function () use ($orderId, $newStatus, $actorId, $actorRole, $note) {

            $this->ensureOrderExists($orderId);

            // Validate status tồn tại trong bảng statuses (foreign key constraint)
            $checkStatus = $this->prepare("SELECT id FROM statuses WHERE id = ?");
            $checkStatus->bind_param("i", $newStatus);
            $checkStatus->execute();
            if ($checkStatus->get_result()->num_rows === 0) {
                $checkStatus->close();
                throw new Exception("Status {$newStatus} không tồn tại trong database. Chỉ chấp nhận các status: 1 (booked), 2 (approved), 3 (assigned), 4 (picked_up), 5 (delivered), 6 (failed)");
            }
            $checkStatus->close();

            $stmt = $this->prepare("UPDATE orders SET status = ? WHERE id = ?");
            $stmt->bind_param("ii", $newStatus, $orderId);
            $stmt->execute();

            $this->logHistory($orderId, $newStatus, $actorId, $actorRole, $note);
            $this->logAudit($actorId, $actorRole, "UPDATE_STATUS", $orderId, $note);

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
            $statusApproved = self::STATUS_APPROVED; // Phải gán vào biến để bind_param
            $stmt->bind_param("iii", $agentId, $statusApproved, $orderId);
            $stmt->execute();

            if ($stmt->affected_rows === 0) {
                throw new Exception("Order already has agent");
            }

            $this->logHistory($orderId, self::STATUS_APPROVED, $adminId, "system", $note);
            $this->logAudit($adminId, "admin", "ASSIGN_AGENT", $orderId, "agent={$agentId}");

            return true;
        });
    }

    /* =====================================================
     * ASSIGN SHIPPER (ADMIN / AGENT)
     * ===================================================== */
    public function assignShipper(int $orderId, int $shipperId, int $actorId, string $role, string $note = "Assign shipper")
    {
        return $this->transaction(function () use ($orderId, $shipperId, $actorId, $role, $note) {

            $check = $this->prepare("SELECT status, agent_id FROM orders WHERE id = ?");
            $check->bind_param("i", $orderId);
            $check->execute();
            $row = $check->get_result()->fetch_assoc();

            if (!$row) throw new Exception("Order not found");
            if ((int)$row["status"] !== self::STATUS_APPROVED) {
                throw new Exception("Order not approved");
            }

            // Agent chỉ có thể assign shipper cho đơn của mình
            // Admin có thể assign shipper cho bất kỳ đơn nào
            if ($role === "agent" && (int)$row["agent_id"] !== $actorId) {
                throw new Exception("Order not belong to agent");
            }

            $stmt = $this->prepare("
                UPDATE orders SET shipper_id = ?, status = ?
                WHERE id = ? AND shipper_id IS NULL
            ");
            $statusAssigned = self::STATUS_ASSIGNED; // Phải gán vào biến để bind_param
            $stmt->bind_param("iii", $shipperId, $statusAssigned, $orderId);
            $stmt->execute();

            if ($stmt->affected_rows === 0) {
                throw new Exception("Order already has shipper");
            }

            // logHistory sẽ tự động convert 'admin' thành 'system'
            $this->logHistory($orderId, self::STATUS_ASSIGNED, $actorId, $role, $note);
            $this->logAudit($actorId, $role, "ASSIGN_SHIPPER", $orderId, "shipper={$shipperId}");

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
        // order_history.role chỉ có: 'customer','agent','shipper','system'
        // Convert 'admin' thành 'system'
        if ($role === "admin") {
            $role = "system";
        }
        
        $stmt = $this->prepare("
            INSERT INTO order_history (order_id, status_id, user_id, role, note)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("iiiss", $orderId, $statusId, $userId, $role, $note);
        $stmt->execute();
    }

    private function generateOrderCode(): string
    {
        // Lấy số thứ tự từ database để tạo mã theo thứ tự
        $stmt = $this->prepare("SELECT MAX(id) AS max_id FROM orders");
            $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        $nextNumber = ($row && $row['max_id']) ? (int)$row['max_id'] + 1 : 1;
        
        // Tạo mã theo format ORD + số thứ tự (4 chữ số, có padding 0)
        $code = "ORD" . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
        
        // Kiểm tra xem mã đã tồn tại chưa (phòng trường hợp có xóa đơn)
        $check = $this->prepare("SELECT id FROM orders WHERE order_code = ?");
        $check->bind_param("s", $code);
        $check->execute();
        
        // Nếu mã đã tồn tại, tìm số tiếp theo
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
}
