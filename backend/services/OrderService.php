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

    /* ================= GUEST CUSTOMER ID ================= */
    // ENTERPRISE: Guest Customer is identified by email 'guest@system.local'
    // We fetch ID dynamically from DB to avoid hard-coding (works across environments)

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

            // ENTERPRISE: Extract actor info first (needed for guest check)
            $actorId   = (int)($data["actor_id"] ?? 0);
            $actorRole = (string)($data["actor_role"] ?? "");
            
            // ENTERPRISE: Allow guest role for public order creation
            // Guest: actor_id = 0, actor_role = 'guest', customer_id will be set to GUEST_CUSTOMER_ID
            if ($actorRole === "guest") {
                // Guest orders: allow with actor_id = 0 (will use GUEST_CUSTOMER_ID for FK)
                $actorId = 0;
            } elseif ($actorId <= 0 || $actorRole === "") {
                throw new Exception("actor_id / actor_role is required");
            }

            if (!in_array($actorRole, ["customer", "admin", "agent", "guest"], true)) {
                throw new Exception("Role {$actorRole} not allowed");
            }

            $customerId = (int)($data["customer_id"] ?? 0);
            // ENTERPRISE: Guest orders use Guest Customer ID from DB for FK integrity
            if ($customerId <= 0 && $actorRole !== "guest") {
                throw new Exception("customer_id is required");
            }
            // For guest, fetch Guest Customer ID dynamically from DB (identified by email)
            if ($customerId <= 0 && $actorRole === "guest") {
                $customerId = $this->getGuestCustomerId(); // Guest Customer (guest@system.local)
            }

            /* ---------- 2. STATUS FLOW + AUTO-ROUTING ---------- */
            $agentId   = null;
            $shipperId = null;
            $status    = self::STATUS_BOOKED;
            $routingStatus = 'auto';
            $assignedBy = 'agent'; // Default: agent workflow

            // If agent creates order directly, auto-approve
            if ($actorRole === "agent") {
                $agentId = $actorId;
                $status  = self::STATUS_APPROVED;
            }
            // Otherwise: customer/admin creates -> BOOKED, will auto-route after insert

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

            // ENTERPRISE GUARD: Receiver Pay = Cash only
            // If payer_type = 2 (receiver pays), payment_method_id MUST be 1 (cash)
            if ($payerType === 2 && $paymentId !== 1) {
                throw new Exception("Receiver Pay requires Cash payment method only. Payment method must be Cash (ID: 1).");
            }

            /* ---------- 3.6. AREA ROUTING DATA ---------- */
            $pickupDistrictId = isset($data["pickup_district_id"]) && (int)$data["pickup_district_id"] > 0 
                ? (int)$data["pickup_district_id"] 
                : null;
            $pickupWardId = isset($data["pickup_ward_id"]) && (int)$data["pickup_ward_id"] > 0 
                ? (int)$data["pickup_ward_id"] 
                : null;

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
                    payment_method_id,
                    pickup_district_id, pickup_ward_id,
                    routing_status, assigned_by
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?,
                    ?, ?, ?,
                    ?,
                    ?, ?,
                    ?, ?
                )
            ");

            // ENTERPRISE: Build types and params together to prevent mismatch
            // Mapping: 1 param = 1 type character, built in EXACT order
            $types = '';
            $params = [];
            
            // Field 1-3: customer_id(i), agent_id(i), shipper_id(i)
            $types .= 'i'; $params[] = $customerId;
            $types .= 'i'; $params[] = $agentId ?? null;
            $types .= 'i'; $params[] = $shipperId ?? null;
            
            // Field 4-10: order_code(s), sender_name(s), sender_phone(s), sender_address(s), receiver_name(s), receiver_phone(s), receiver_address(s)
            $types .= 's'; $params[] = $orderCode;
            $types .= 's'; $params[] = $senderName;
            $types .= 's'; $params[] = $senderPhone;
            $types .= 's'; $params[] = $senderAddress;
            $types .= 's'; $params[] = $receiverName;
            $types .= 's'; $params[] = $receiverPhone;
            $types .= 's'; $params[] = $receiverAddress;
            
            // Field 11: category_id(i)
            $types .= 'i'; $params[] = $categoryId ?? null;
            
            // Field 12-15: weight(d), length(d), width(d), height(d)
            $weightFloat = (float)$weight;
            $types .= 'd'; $params[] = $weightFloat;
            $types .= 'd'; $params[] = (float)$length;
            $types .= 'd'; $params[] = (float)$width;
            $types .= 'd'; $params[] = (float)$height;
            
            // Field 16: service_type(i)
            $types .= 'i'; $params[] = $serviceType;
            
            // Field 17: notes(s)
            $types .= 's'; $params[] = $notes ?? '';
            
            // Field 18: payer_type(i) - FIXED: was 's', must be 'i'
            $types .= 'i'; $params[] = $payerType;
            
            // Field 19: status(i)
            $types .= 'i'; $params[] = $status;
            
            // Field 20-22: total_amount(d), cod_amount(d), total_shipping_fee(d)
            $types .= 'd'; $params[] = (float)$totalAmount;
            $types .= 'd'; $params[] = (float)$codAmount;
            $types .= 'd'; $params[] = (float)$shippingFee;
            
            // Field 23: payment_method_id(i)
            $types .= 'i'; $params[] = $paymentId;
            
            // Field 24-25: pickup_district_id(i), pickup_ward_id(i)
            $types .= 'i'; $params[] = $pickupDistrictId ?? null;
            $types .= 'i'; $params[] = $pickupWardId ?? null;
            
            // Field 26-27: routing_status(s), assigned_by(s)
            $types .= 's'; $params[] = $routingStatus;
            $types .= 's'; $params[] = $assignedBy;
            
            // ENTERPRISE: Hard guard - this will throw if mismatch
            $this->bindParamsChecked($stmt, $types, $params);

            $stmt->execute();
            $orderId = (int)$this->conn->insert_id;

            /* ---------- 6.5. AUTO-ROUTING (if not agent-created) ---------- */
            // Auto-route agent based on pickup_district_id
            if ($actorRole !== "agent" && $pickupDistrictId !== null) {
                $routedAgentId = $this->autoRouteAgent($pickupDistrictId);
                if ($routedAgentId !== null) {
                    // Update order with routed agent
                    $updateStmt = $this->prepare("
                        UPDATE orders 
                        SET agent_id = ?, status = ?, routing_status = 'auto', assigned_by = 'agent'
                        WHERE id = ?
                    ");
                    $statusApproved = self::STATUS_APPROVED;
                    $updateStmt->bind_param("iii", $routedAgentId, $statusApproved, $orderId);
                    $updateStmt->execute();
                    $updateStmt->close();
                    
                    // Update local variables
                    $agentId = $routedAgentId;
                    $status = self::STATUS_APPROVED;
                    $routingStatus = 'auto';
                    
                    // Log auto-routing (use Guest Customer ID for system actions to ensure FK integrity)
                    $systemUserId = $this->getGuestCustomerId();
                    $this->logHistory($orderId, self::STATUS_APPROVED, $systemUserId, 'system', "Auto-routed to agent {$routedAgentId} by district");
                    
                    // Create approval record
                    $ap = $this->prepare("
                        INSERT INTO order_approvals (order_id, agent_id, status)
                        VALUES (?, ?, 'approved')
                    ");
                    $ap->bind_param("ii", $orderId, $routedAgentId);
                    $ap->execute();
                    $ap->close();
                } else {
                    error_log("AUTO-ROUTING: Failed to route order {$orderId} - no agent found for district_id {$pickupDistrictId}");
                }
            } else {
                if ($actorRole === "agent") {
                    error_log("AUTO-ROUTING: Skipped for order {$orderId} - order created by agent");
                } else {
                    error_log("AUTO-ROUTING: Skipped for order {$orderId} - pickup_district_id is null");
                }
            }

            /* ---------- 7. FEES + INVOICE ---------- */
            $feeService->saveOrderFees($orderId, $feeResult["fees"] ?? []);

            $inv = $this->prepare("
                INSERT INTO invoices (order_id, invoice_number, total_amount, status, payment_method_id)
                VALUES (?, ?, ?, 'unpaid', ?)
            ");
            $inv->bind_param("isdi", $orderId, $invoiceCode, $shippingFee, $paymentId);
            $inv->execute();

            /* ---------- 8. APPROVAL (only if not auto-routed above) ---------- */
            // If agent was set before auto-routing (agent-created order), create approval
            if ($agentId && $actorRole === "agent") {
                $ap = $this->prepare("
                    INSERT INTO order_approvals (order_id, agent_id, status)
                    VALUES (?, ?, 'approved')
                ");
                $ap->bind_param("ii", $orderId, $agentId);
                $ap->execute();
                $ap->close();
            }

            /* ---------- 9. HISTORY + IMAGES ---------- */
            // ENTERPRISE: For guest orders, use Guest Customer ID instead of actor_id (0)
            $historyUserId = ($actorRole === "guest") ? $customerId : $actorId;
            $this->logHistory($orderId, $status, $historyUserId, $actorRole, "Create order {$orderCode}");

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

            /* ---------- 10. FINAL UPDATE: Ensure updated_at = NOW() ---------- */
            // Đảm bảo updated_at = NOW() sau khi tạo xong tất cả để order mới luôn hiển thị ở đầu danh sách
            $updateTimeStmt = $this->prepare("UPDATE orders SET updated_at = NOW() WHERE id = ?");
            if ($updateTimeStmt) {
                $updateTimeStmt->bind_param("i", $orderId);
                $updateTimeStmt->execute();
                $updateTimeStmt->close();
            }

            /* ---------- 11. NOTIFICATIONS ---------- */
            // Create notifications for customer
            try {
                $notificationService = new NotificationService($this->conn);
                
                // Always notify customer when order is created
                $notificationService->emit('order_created', $orderId, $actorId, $actorRole);
                
                // If agent was auto-assigned, notify customer about agent assignment and approval
                if ($agentId !== null && $routingStatus === 'auto' && $status === self::STATUS_APPROVED) {
                    $notificationService->emit('agent_assigned', $orderId, $this->getGuestCustomerId(), 'system');
                    $notificationService->emit('agent_approved', $orderId, $this->getGuestCustomerId(), 'system');
                }
            } catch (Exception $e) {
                // Log but don't fail order creation if notification fails
                error_log("NotificationService error in OrderService::create(): " . $e->getMessage());
            }

            // ENTERPRISE: Return auto-routing info for frontend
            return [
                "order_id"     => $orderId,
                "order_code"   => $orderCode,
                "shipping_fee" => $shippingFee,
                "total_with_cod" => $totalAmount,
                "auto_routed"  => ($agentId !== null && $routingStatus === 'auto'),
                "agent_id"     => $agentId
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

            // Get current order state
            $currentOrder = $this->prepare("SELECT status, agent_id, shipper_id FROM orders WHERE id = ?");
            $currentOrder->bind_param("i", $orderId);
            $currentOrder->execute();
            $orderData = $currentOrder->get_result()->fetch_assoc();
            
            if (!$orderData) {
                $currentOrder->close();
                throw new Exception("Order not found");
            }
            
            $currentStatus = (int)$orderData["status"];
            $currentOrder->close();

            $checkStatus = $this->prepare("SELECT id FROM statuses WHERE id = ?");
            $checkStatus->bind_param("i", $newStatus);
            $checkStatus->execute();
            if ($checkStatus->get_result()->num_rows === 0) {
                $checkStatus->close();
                throw new Exception("Status {$newStatus} not found. Allowed: 1..7");
            }
            $checkStatus->close();

            // Enterprise: Reset agent_id/shipper_id when rolling back to earlier statuses
            // Rollback APPROVED → BOOKED: Reset agent_id
            // Rollback ASSIGNED → APPROVED: Reset shipper_id
            $resetAgentId = false;
            $resetShipperId = false;
            
            // If rolling back from APPROVED (2) to BOOKED (1), reset agent_id
            if ($currentStatus === self::STATUS_APPROVED && $newStatus === self::STATUS_BOOKED) {
                $resetAgentId = true;
            }
            
            // If rolling back from ASSIGNED (3) to APPROVED (2) or BOOKED (1), reset shipper_id
            if ($currentStatus === self::STATUS_ASSIGNED && ($newStatus === self::STATUS_APPROVED || $newStatus === self::STATUS_BOOKED)) {
                $resetShipperId = true;
            }
            
            // If rolling back from any status to BOOKED (1), reset both
            if ($newStatus === self::STATUS_BOOKED && $currentStatus > self::STATUS_BOOKED) {
                $resetAgentId = true;
                $resetShipperId = true;
            }

            // Build UPDATE query with conditional resets
            if ($resetAgentId && $resetShipperId) {
                $stmt = $this->prepare("UPDATE orders SET status = ?, agent_id = NULL, shipper_id = NULL WHERE id = ?");
                $stmt->bind_param("ii", $newStatus, $orderId);
            } elseif ($resetAgentId) {
                $stmt = $this->prepare("UPDATE orders SET status = ?, agent_id = NULL WHERE id = ?");
                $stmt->bind_param("ii", $newStatus, $orderId);
            } elseif ($resetShipperId) {
                $stmt = $this->prepare("UPDATE orders SET status = ?, shipper_id = NULL WHERE id = ?");
                $stmt->bind_param("ii", $newStatus, $orderId);
            } else {
                $stmt = $this->prepare("UPDATE orders SET status = ? WHERE id = ?");
                $stmt->bind_param("ii", $newStatus, $orderId);
            }
            
            $stmt->execute();
            $stmt->close();

            $this->logHistory($orderId, $newStatus, $actorId, $actorRole, $note);

            if (method_exists($this, 'logAudit')) {
                $this->logAudit($actorId, $actorRole, "UPDATE_STATUS", $orderId, $note);
            }

            // Create notifications for customer when status changes to important states
            try {
                $notificationService = new NotificationService($this->conn);
                
                // Map status changes to notification events
                if ($newStatus === self::STATUS_APPROVED && $currentStatus !== self::STATUS_APPROVED) {
                    // Status changed to APPROVED (if not already approved)
                    $notificationService->emit('agent_approved', $orderId, $actorId, $actorRole);
                } elseif ($newStatus === self::STATUS_DELIVERED && $currentStatus !== self::STATUS_DELIVERED) {
                    // Status changed to DELIVERED
                    $notificationService->emit('shipper_delivered', $orderId, $actorId, $actorRole);
                } elseif ($newStatus === self::STATUS_PICKED && $currentStatus !== self::STATUS_PICKED) {
                    // Status changed to PICKED UP
                    $notificationService->emit('shipper_pickup', $orderId, $actorId, $actorRole);
                } elseif ($newStatus === self::STATUS_FAILED && $currentStatus !== self::STATUS_FAILED) {
                    // Status changed to FAILED
                    $notificationService->emit('delivery_failed', $orderId, $actorId, $actorRole, ['reason' => $note]);
                }
            } catch (Exception $e) {
                error_log("NotificationService error in OrderService::updateStatus(): " . $e->getMessage());
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

            // 5. Create notifications for customer
            try {
                $notificationService = new NotificationService($this->conn);
                $notificationService->emit('shipper_pickup', $orderId, $shipperId, 'shipper');
            } catch (Exception $e) {
                error_log("NotificationService error in OrderService::confirmPickup(): " . $e->getMessage());
            }

            return true;
        });
    }

    /* =====================================================
     * AUTO-ROUTE AGENT (SYSTEM)
     * ===================================================== */
    private function autoRouteAgent(int $districtId): ?int
    {
        // Query agent_areas to find agent for this district
        // Also check that the agent user is active
        $stmt = $this->prepare("
            SELECT aa.agent_id 
            FROM agent_areas aa
            INNER JOIN users u ON aa.agent_id = u.id
            WHERE aa.district_id = ? 
              AND aa.active = 1 
              AND u.status = 'active'
              AND u.role = 'agent'
            ORDER BY aa.priority ASC 
            LIMIT 1
        ");
        $stmt->bind_param("i", $districtId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $agentId = (int)$row['agent_id'];
            $stmt->close();
            
            // Log for debugging
            error_log("AUTO-ROUTING: Found agent_id {$agentId} for district_id {$districtId}");
            
            return $agentId;
        }
        
        $stmt->close();
        
        // Log for debugging
        error_log("AUTO-ROUTING: No active agent found for district_id {$districtId}");
        
        return null; // No agent found for this district
    }

    /* =====================================================
     * ASSIGN AGENT (ADMIN - FALLBACK ONLY)
     * ===================================================== */
    public function assignAgentByAdmin(int $orderId, int $agentId, int $adminId, string $note = "Assign agent")
    {
        return $this->transaction(function () use ($orderId, $agentId, $adminId, $note) {

            // Check order exists and get routing_status
            $check = $this->prepare("SELECT agent_id, routing_status FROM orders WHERE id = ?");
            $check->bind_param("i", $orderId);
            $check->execute();
            $orderData = $check->get_result()->fetch_assoc();
            $check->close();

            if (!$orderData) {
                throw new Exception("Order not found");
            }

            // ENTERPRISE RULE: Admin can only assign agent in fallback scenarios
            // 1. routing_status = 'fallback_admin'
            // 2. OR agent_id IS NULL (auto-routing failed)
            $currentAgentId = $orderData['agent_id'];
            $routingStatus = $orderData['routing_status'] ?? 'auto';

            if ($currentAgentId !== null) {
                throw new Exception("Order already has agent. Admin can only assign in fallback scenarios.");
            }

            if ($routingStatus !== 'fallback_admin' && $routingStatus !== null) {
                // If routing_status is 'auto' and agent_id is NULL, allow admin fallback
                // But set routing_status to 'fallback_admin' to mark it
            }

            $stmt = $this->prepare("
                UPDATE orders 
                SET agent_id = ?, status = ?, routing_status = 'fallback_admin', assigned_by = 'admin'
                WHERE id = ? AND agent_id IS NULL
            ");
            $statusApproved = self::STATUS_APPROVED;
            $stmt->bind_param("iii", $agentId, $statusApproved, $orderId);
            $stmt->execute();

            if ($stmt->affected_rows === 0) {
                throw new Exception("Order already has agent or update failed");
            }
            $stmt->close();

            // Create approval record
            $ap = $this->prepare("
                INSERT INTO order_approvals (order_id, agent_id, status)
                VALUES (?, ?, 'approved')
            ");
            $ap->bind_param("ii", $orderId, $agentId);
            $ap->execute();
            $ap->close();

            $this->logHistory($orderId, self::STATUS_APPROVED, $adminId, "admin", $note);

            if (method_exists($this, 'logAudit')) {
                $this->logAudit($adminId, "admin", "ASSIGN_AGENT_FALLBACK", $orderId, "agent={$agentId}");
            }

            // Create notifications for customer
            try {
                $notificationService = new NotificationService($this->conn);
                $notificationService->emit('agent_assigned', $orderId, $adminId, 'admin');
                $notificationService->emit('agent_approved', $orderId, $adminId, 'admin');
            } catch (Exception $e) {
                error_log("NotificationService error in OrderService::assignAgentByAdmin(): " . $e->getMessage());
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

            // Check order and get agent_id
            $check = $this->prepare("SELECT status, agent_id FROM orders WHERE id = ?");
            $check->bind_param("i", $orderId);
            $check->execute();
            $row = $check->get_result()->fetch_assoc();
            $check->close();

            if (!$row) throw new Exception("Order not found");

            // Đơn hàng phải ở trạng thái 2 (Approved) mới được gán Shipper
            if ((int)$row["status"] !== self::STATUS_APPROVED) {
                throw new Exception("Order not approved (Status must be 2)");
            }

            $orderAgentId = (int)$row["agent_id"];
            
            // ENTERPRISE RULE: Agent can only assign shipper to their own orders
            if ($role === "agent" && $orderAgentId !== $actorId) {
                throw new Exception("Order not belong to agent");
            }

            // ENTERPRISE RULE: Shipper must belong to the order's agent
            // Check if shipper exists and is active
            // TODO: Future enhancement - Add agent_id to users table for shippers to enforce shipper-agent relationship
            $checkShipper = $this->prepare("
                SELECT id, role, status FROM users 
                WHERE id = ? AND role = 'shipper' AND status = 'active'
            ");
            
            if (!$checkShipper) {
                throw new Exception("Database prepare failed: " . $this->conn->error);
            }
            
            $checkShipper->bind_param("i", $shipperId);
            $checkShipper->execute();
            $shipperData = $checkShipper->get_result()->fetch_assoc();
            $checkShipper->close();
            
            if (!$shipperData) {
                throw new Exception("Shipper not found or inactive");
            }
            
            // ENTERPRISE: If agent assigns, shipper should belong to that agent
            // Since we don't have shipper.agent_id yet, we'll allow for now but log it
            // In production, add agent_id to users table for shippers

            // Enterprise: Assign shipper automatically bumps status to ASSIGNED (3)
            // This ensures proper workflow: APPROVED (2) → ASSIGNED (3) when shipper is assigned
            $stmt = $this->prepare("
                UPDATE orders SET shipper_id = ?, status = ?
                WHERE id = ? AND shipper_id IS NULL
            ");

            if (!$stmt) {
                throw new Exception("Database prepare failed: " . $this->conn->error);
            }

            // Enterprise workflow: Assign shipper → Status becomes ASSIGNED (3)
            $statusAssigned = self::STATUS_ASSIGNED; // 3

            $stmt->bind_param("iii", $shipperId, $statusAssigned, $orderId);
            
            if (!$stmt->execute()) {
                $errorMsg = $stmt->error;
                $stmt->close();
                throw new Exception("Failed to assign shipper: " . $errorMsg);
            }

            if ($stmt->affected_rows === 0) {
                $stmt->close();
                throw new Exception("Order already has shipper or update failed");
            }
            
            $stmt->close();

            // Ghi log với status mới (ASSIGNED)
            $this->logHistory($orderId, self::STATUS_ASSIGNED, $actorId, $role, $note);

            if (method_exists($this, 'logAudit')) {
                $this->logAudit($actorId, $role, "ASSIGN_SHIPPER", $orderId, "shipper={$shipperId}");
            }

            // Create notifications for customer
            try {
                $notificationService = new NotificationService($this->conn);
                $notificationService->emit('shipper_assigned', $orderId, $actorId, $role);
            } catch (Exception $e) {
                error_log("NotificationService error in OrderService::assignShipper(): " . $e->getMessage());
            }

            return true;
        });
    }

    /* ================= HELPERS ================= */

    /**
     * ENTERPRISE: Safe bind_param with validation to prevent mismatch errors
     * Ensures type string length matches parameter count
     */
    private function bindParamsChecked($stmt, string $types, array $params): void
    {
        $typeLen = strlen($types);
        $paramCount = count($params);
        
        if ($typeLen !== $paramCount) {
            throw new Exception(
                "bind_param mismatch: type string length ({$typeLen}) != param count ({$paramCount}). " .
                "Types: '{$types}' | Params: " . json_encode(array_map(function($p) {
                    return is_null($p) ? 'NULL' : (is_string($p) ? substr($p, 0, 20) : gettype($p));
                }, $params))
            );
        }
        
        // Create references array for bind_param (required by mysqli)
        $refs = [];
        foreach ($params as $key => $value) {
            $refs[$key] = &$params[$key];
        }
        
        if (!$stmt->bind_param($types, ...$refs)) {
            throw new Exception("bind_param failed: " . $stmt->error);
        }
    }

    /**
     * ENTERPRISE: Get Guest Customer ID from database dynamically
     * Uses email 'guest@system.local' to identify the guest customer record
     * This avoids hard-coding IDs and works across different environments
     */
    private function getGuestCustomerId(): int
    {
        $email = 'guest@system.local';
        
        $stmt = $this->prepare("SELECT id FROM users WHERE email = ? AND role = 'customer' LIMIT 1");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            $stmt->close();
            return (int)$row['id'];
        }
        
        $stmt->close();
        throw new Exception("Guest Customer user not found in database (email: {$email}). Please ensure guest customer record exists.");
    }

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
        // ENTERPRISE: Map logical roles to database roles
        // Guest is a logical concept, not a DB role - map to 'customer'
        $dbRole = $role;
        if ($role === "admin") {
            $dbRole = "system";
        } elseif ($role === "guest") {
            // Guest orders are stored as 'customer' in DB (guest = customer without account)
            $dbRole = "customer";
        }

        $stmt = $this->prepare("
            INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->bind_param("iiiss", $orderId, $statusId, $userId, $dbRole, $note);
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
        require_once __DIR__ . "/../utils/InvoiceNumberGenerator.php";
        global $conn;
        return InvoiceNumberGenerator::generate($conn);
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

            // ENTERPRISE: Map logical roles to database roles
            // Guest is a logical concept, not a DB role - map to 'customer'
            $dbRole = $userRole;
            if ($userRole === "admin") {
                $dbRole = "system";
            } elseif ($userRole === "guest") {
                // Guest orders are stored as 'customer' in DB (guest = customer without account)
                $dbRole = "customer";
            }

            $sqlHistory = "INSERT INTO order_history (order_id, status_id, user_id, role, note, created_at) 
                           VALUES (?, ?, ?, ?, ?, NOW())";

            $stmtHistory = $conn->prepare($sqlHistory);
            if (!$stmtHistory) {
                throw new Exception("Prepare failed (History): " . $conn->error);
            }

            $stmtHistory->bind_param("iiiss", $orderId, $newStatusId, $userId, $dbRole, $note);

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

            // 5. Create notifications for customer
            try {
                $notificationService = new NotificationService($this->conn);
                $notificationService->emit('shipper_delivered', $orderId, $shipperId, 'shipper');
            } catch (Exception $e) {
                error_log("NotificationService error in OrderService::confirmDelivery(): " . $e->getMessage());
            }

            return true;
        });
    }
}
