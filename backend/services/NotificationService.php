<?php
// backend/services/NotificationService.php
// Enterprise Notification Service – RBAC-based notifications

require_once __DIR__ . "/../core/BaseService.php";

class NotificationService extends BaseService
{
    /* =====================================================
     * CORE: CREATE NOTIFICATION
     * ===================================================== */
    public function create(
        int $userId,
        string $title,
        string $message,
        string $type = "system", // 'order', 'system', 'warning'
        ?int $relatedOrderId = null,
        ?array $metadata = null
    ): bool {
        try {
            $metadataJson = $metadata ? json_encode($metadata) : null;

            $stmt = $this->prepare(
                "INSERT INTO notifications (user_id, title, message, type, related_order_id, metadata)
                 VALUES (?, ?, ?, ?, ?, ?)"
            );

            if (!$stmt) {
                error_log("NotificationService::create() prepare failed: " . $this->conn->error);
                return false;
            }

            $stmt->bind_param(
                "isssis",
                $userId,
                $title,
                $message,
                $type,
                $relatedOrderId,
                $metadataJson
            );

            $result = $stmt->execute();
            
            if (!$result) {
                error_log("NotificationService::create() execute failed: " . $stmt->error);
            }
            
            $stmt->close();
            return $result;
        } catch (Exception $e) {
            error_log("NotificationService::create() error: " . $e->getMessage());
            return false;
        } catch (Error $e) {
            error_log("NotificationService::create() fatal error: " . $e->getMessage());
            return false;
        }
    }

    /* =====================================================
     * ENTERPRISE: EMIT NOTIFICATIONS (RBAC-based)
     * ===================================================== */
    /**
     * Emit notifications for an order event based on RBAC matrix
     * 
     * @param string $event Event type: 'order_created', 'agent_assigned', 'agent_approved', 
     *                     'shipper_assigned', 'shipper_pickup', 'shipper_delivered', 
     *                     'delivery_failed', 'order_cancelled', 'order_reopened'
     * @param int $orderId Order ID
     * @param int $actorId User ID who performed the action
     * @param string $actorRole Role of the actor
     * @param array $context Additional context (e.g., reason, note)
     */
    public function emit(string $event, int $orderId, int $actorId, string $actorRole, array $context = []): bool
    {
        try {
            // Get order info
            $orderStmt = $this->prepare("
                SELECT o.id, o.order_code, o.status, o.customer_id, o.agent_id, o.shipper_id,
                       c.name AS customer_name, a.name AS agent_name, s.name AS shipper_name
                FROM orders o
                LEFT JOIN users c ON o.customer_id = c.id
                LEFT JOIN users a ON o.agent_id = a.id
                LEFT JOIN users s ON o.shipper_id = s.id
                WHERE o.id = ?
            ");
            $orderStmt->bind_param("i", $orderId);
            $orderStmt->execute();
            $order = $orderStmt->get_result()->fetch_assoc();
            $orderStmt->close();

            if (!$order) {
                error_log("NotificationService::emit() - Order {$orderId} not found");
                return false;
            }

            $orderCode = $order["order_code"];
            $customerId = (int)$order["customer_id"];
            $agentId = $order["agent_id"] ? (int)$order["agent_id"] : null;
            $shipperId = $order["shipper_id"] ? (int)$order["shipper_id"] : null;

            $notifications = [];

            // ========== EVENT HANDLERS ==========
            switch ($event) {
                case 'order_created':
                    // Customer created order (BOOKED)
                    if ($customerId > 0) {
                        $notifications[] = [
                            'user_id' => $customerId,
                            'title' => 'Order Created',
                            'message' => "Your order {$orderCode} has been created successfully.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'customer',
                        ];
                    }
                    // Admin: New order in system
                    $adminStmt = $this->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
                    $adminStmt->execute();
                    $adminResult = $adminStmt->get_result();
                    if ($adminRow = $adminResult->fetch_assoc()) {
                        $notifications[] = [
                            'user_id' => (int)$adminRow['id'],
                            'title' => 'New Order',
                            'message' => "New order {$orderCode} has been created.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'admin',
                        ];
                    }
                    $adminStmt->close();
                    break;

                case 'agent_assigned':
                    // Agent: New order assigned
                    if ($agentId && $agentId !== $actorId) {
                        $notifications[] = [
                            'user_id' => $agentId,
                            'title' => 'New Order Assigned',
                            'message' => "Order {$orderCode} has been assigned to you for approval.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'agent',
                        ];
                    }
                    // Customer: Agent assigned
                    if ($customerId > 0) {
                        $notifications[] = [
                            'user_id' => $customerId,
                            'title' => 'Agent Assigned',
                            'message' => "An agent has been assigned to manage your order {$orderCode}.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'customer',
                        ];
                    }
                    // Admin: Self-action (skip)
                    break;

                case 'agent_approved':
                    // Admin: Agent approved order (system-level)
                    if ($actorRole !== 'admin') {
                        $adminStmt = $this->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
                        $adminStmt->execute();
                        $adminResult = $adminStmt->get_result();
                        if ($adminRow = $adminResult->fetch_assoc()) {
                            $notifications[] = [
                                'user_id' => (int)$adminRow['id'],
                                'title' => 'Order Approved',
                                'message' => "Order {$orderCode} has been approved by agent.",
                                'type' => 'order',
                                'order_id' => $orderId,
                                'role' => 'admin',
                            ];
                        }
                        $adminStmt->close();
                    }
                    // Customer: Order approved
                    if ($customerId > 0) {
                        $notifications[] = [
                            'user_id' => $customerId,
                            'title' => 'Order Approved',
                            'message' => "Your order {$orderCode} has been approved and is ready for shipping.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'customer',
                        ];
                    }
                    // Agent: Self-action (skip)
                    break;

                case 'shipper_assigned':
                    $shipperName = $order["shipper_name"] ?? "a shipper";
                    
                    // Admin: Order assigned to shipper (system-level message)
                    $adminStmt = $this->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
                    $adminStmt->execute();
                    $adminResult = $adminStmt->get_result();
                    if ($adminRow = $adminResult->fetch_assoc()) {
                        $notifications[] = [
                            'user_id' => (int)$adminRow['id'],
                            'title' => 'Shipper Assigned',
                            'message' => "Order {$orderCode} has been assigned to shipper {$shipperName}.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'admin',
                        ];
                    }
                    $adminStmt->close();
                    
                    // Agent: Order managed by agent now has shipper
                    if ($agentId) {
                        $notifications[] = [
                            'user_id' => $agentId,
                            'title' => 'Shipper Assigned',
                            'message' => "Order {$orderCode} that you manage now has a shipper assigned.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'agent',
                        ];
                    }
                    
                    // Shipper: New order assigned for pickup
                    if ($shipperId && $shipperId !== $actorId) {
                        $notifications[] = [
                            'user_id' => $shipperId,
                            'title' => 'New Order Assigned',
                            'message' => "You have been assigned to order {$orderCode} for pickup.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'shipper',
                        ];
                    }
                    
                    // Customer: Shipper assigned to deliver
                    if ($customerId > 0) {
                        $notifications[] = [
                            'user_id' => $customerId,
                            'title' => 'Shipper Assigned',
                            'message' => "Your order {$orderCode} is now being delivered by a shipper.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'customer',
                        ];
                    }
                    break;

                case 'shipper_pickup':
                    // Agent: Order picked up
                    if ($agentId) {
                        $notifications[] = [
                            'user_id' => $agentId,
                            'title' => 'Order Picked Up',
                            'message' => "Order {$orderCode} has been picked up and is on the way.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'agent',
                        ];
                    }
                    // Customer: Order picked up
                    if ($customerId > 0) {
                        $notifications[] = [
                            'user_id' => $customerId,
                            'title' => 'Order Picked Up',
                            'message' => "Your order {$orderCode} has been picked up and is on the way.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'customer',
                        ];
                    }
                    // Admin: Not notified for successful pickup
                    // Shipper: Self-action (skip)
                    break;

                case 'shipper_delivered':
                    // Admin: Order delivered (final status)
                    $adminStmt = $this->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
                    $adminStmt->execute();
                    $adminResult = $adminStmt->get_result();
                    if ($adminRow = $adminResult->fetch_assoc()) {
                        $notifications[] = [
                            'user_id' => (int)$adminRow['id'],
                            'title' => 'Order Delivered',
                            'message' => "Order {$orderCode} has been delivered successfully.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'admin',
                        ];
                    }
                    $adminStmt->close();
                    // Agent: Order delivered
                    if ($agentId) {
                        $notifications[] = [
                            'user_id' => $agentId,
                            'title' => 'Order Delivered',
                            'message' => "Order {$orderCode} has been delivered successfully.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'agent',
                        ];
                    }
                    // Customer: Order delivered
                    if ($customerId > 0) {
                        $notifications[] = [
                            'user_id' => $customerId,
                            'title' => 'Order Delivered',
                            'message' => "Your order {$orderCode} has been delivered successfully.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'customer',
                        ];
                    }
                    // Shipper: Self-action (skip)
                    break;

                case 'delivery_failed':
                    $reason = $context['reason'] ?? 'Delivery failed';
                    // Admin: Delivery failed (system-level)
                    $adminStmt = $this->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
                    $adminStmt->execute();
                    $adminResult = $adminStmt->get_result();
                    if ($adminRow = $adminResult->fetch_assoc()) {
                        $notifications[] = [
                            'user_id' => (int)$adminRow['id'],
                            'title' => 'Delivery Failed',
                            'message' => "Order {$orderCode} delivery failed. Reason: {$reason}",
                            'type' => 'warning',
                            'order_id' => $orderId,
                            'role' => 'admin',
                        ];
                    }
                    $adminStmt->close();
                    // Agent: Delivery failed
                    if ($agentId) {
                        $notifications[] = [
                            'user_id' => $agentId,
                            'title' => 'Delivery Failed',
                            'message' => "Order {$orderCode} delivery failed. Reason: {$reason}",
                            'type' => 'warning',
                            'order_id' => $orderId,
                            'role' => 'agent',
                        ];
                    }
                    // Shipper: Delivery failed (self-action, but notify for awareness)
                    if ($shipperId) {
                        $notifications[] = [
                            'user_id' => $shipperId,
                            'title' => 'Delivery Failed',
                            'message' => "Order {$orderCode} delivery failed. Reason: {$reason}",
                            'type' => 'warning',
                            'order_id' => $orderId,
                            'role' => 'shipper',
                        ];
                    }
                    // Customer: Delivery failed
                    if ($customerId > 0) {
                        $notifications[] = [
                            'user_id' => $customerId,
                            'title' => 'Delivery Failed',
                            'message' => "Your order {$orderCode} delivery failed. Reason: {$reason}",
                            'type' => 'warning',
                            'order_id' => $orderId,
                            'role' => 'customer',
                        ];
                    }
                    break;

                case 'order_cancelled':
                    $reason = $context['reason'] ?? 'Order cancelled';
                    // Customer: Order cancelled
                    if ($customerId > 0) {
                        $notifications[] = [
                            'user_id' => $customerId,
                            'title' => 'Order Cancelled',
                            'message' => "Your order {$orderCode} has been cancelled. Reason: {$reason}",
                            'type' => 'warning',
                            'order_id' => $orderId,
                            'role' => 'customer',
                        ];
                    }
                    // Agent: Order cancelled (if was managing it)
                    if ($agentId && $agentId !== $actorId) {
                        $notifications[] = [
                            'user_id' => $agentId,
                            'title' => 'Order Cancelled',
                            'message' => "Order {$orderCode} has been cancelled.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'agent',
                        ];
                    }
                    // Admin: Self-action (skip)
                    break;

                case 'order_reopened':
                    // Customer: Order reopened
                    if ($customerId > 0) {
                        $statusName = $context['new_status'] === 1 ? 'Booked' : ($context['new_status'] === 2 ? 'Approved' : 'Status ' . $context['new_status']);
                        $notifications[] = [
                            'user_id' => $customerId,
                            'title' => 'Order Reopened',
                            'message' => "Your order {$orderCode} has been reopened and is now in '{$statusName}' status.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'customer',
                        ];
                    }
                    // Agent: Order reopened (if was managing it)
                    if ($agentId && $agentId !== $actorId) {
                        $notifications[] = [
                            'user_id' => $agentId,
                            'title' => 'Order Reopened',
                            'message' => "Order {$orderCode} has been reopened.",
                            'type' => 'order',
                            'order_id' => $orderId,
                            'role' => 'agent',
                        ];
                    }
                    // Admin: Self-action (skip)
                    break;

                default:
                    error_log("NotificationService::emit() - Unknown event: {$event}");
                    return false;
            }

            // Create all notifications
            $success = true;
            foreach ($notifications as $notif) {
                // Build metadata with role-specific action_url
                $metadata = ['order_code' => $orderCode];
                $userRole = $notif['role'] ?? null;
                
                // Add role-specific action_url
                if ($userRole && isset($notif['order_id'])) {
                    if ($userRole === 'customer') {
                        $metadata['action_url'] = "/user/orders/{$orderCode}";
                    } elseif ($userRole === 'shipper') {
                        $metadata['action_url'] = "/shipper/order/{$notif['order_id']}";
                    } elseif ($userRole === 'agent') {
                        $metadata['action_url'] = "/agent/orders?highlight={$notif['order_id']}";
                    } elseif ($userRole === 'admin') {
                        $metadata['action_url'] = "/admin/orders?focus={$notif['order_id']}";
                    }
                }
                
                if (!$this->create(
                    $notif['user_id'],
                    $notif['title'],
                    $notif['message'],
                    $notif['type'],
                    $notif['order_id'],
                    $metadata
                )) {
                    $success = false;
                }
            }

            return $success;

        } catch (Exception $e) {
            error_log("NotificationService::emit() error: " . $e->getMessage());
            return false;
        } catch (Error $e) {
            error_log("NotificationService::emit() fatal error: " . $e->getMessage());
            return false;
        }
    }

    /* =====================================================
     * MARK NOTIFICATION AS READ
     * ===================================================== */
    public function markAsRead(int $notificationId, int $userId): bool
    {
        try {
            $stmt = $this->prepare(
                "UPDATE notifications 
                 SET is_read = 1, read_at = NOW()
                 WHERE id = ? AND user_id = ? AND is_read = 0"
            );

            if (!$stmt) {
                error_log("NotificationService::markAsRead() prepare failed: " . $this->conn->error);
                return false;
            }

            $stmt->bind_param("ii", $notificationId, $userId);
            $result = $stmt->execute();
            $stmt->close();
            
            return $result;
        } catch (Exception $e) {
            error_log("NotificationService::markAsRead() error: " . $e->getMessage());
            return false;
        }
    }

    /* =====================================================
     * MARK ALL AS READ FOR USER
     * ===================================================== */
    public function markAllAsRead(int $userId): bool
    {
        try {
            $stmt = $this->prepare(
                "UPDATE notifications 
                 SET is_read = 1, read_at = NOW()
                 WHERE user_id = ? AND is_read = 0"
            );

            if (!$stmt) {
                error_log("NotificationService::markAllAsRead() prepare failed: " . $this->conn->error);
                return false;
            }

            $stmt->bind_param("i", $userId);
            $result = $stmt->execute();
            $stmt->close();
            
            return $result;
        } catch (Exception $e) {
            error_log("NotificationService::markAllAsRead() error: " . $e->getMessage());
            return false;
        }
    }

    /* =====================================================
     * GET UNREAD COUNT
     * ===================================================== */
    public function getUnreadCount(int $userId): int
    {
        try {
            $stmt = $this->prepare(
                "SELECT COUNT(*) as count
                 FROM notifications
                 WHERE user_id = ? AND is_read = 0"
            );

            if (!$stmt) {
                error_log("NotificationService::getUnreadCount() prepare failed: " . $this->conn->error);
                return 0;
            }

            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();

            return (int)($row['count'] ?? 0);
        } catch (Exception $e) {
            error_log("NotificationService::getUnreadCount() error: " . $e->getMessage());
            return 0;
        }
    }

    /* =====================================================
     * GET TOTAL COUNT (all notifications for user or all for admin)
     * ===================================================== */
    public function getTotalCount(int $userId, string $userRole = "customer"): int
    {
        try {
            // RBAC: Admin sees ALL notifications, others only see their own
            if ($userRole === "admin") {
                $stmt = $this->prepare(
                    "SELECT COUNT(*) as count
                     FROM notifications"
                );

                if (!$stmt) {
                    error_log("NotificationService::getTotalCount() prepare failed: " . $this->conn->error);
                    return 0;
                }

                $stmt->execute();
            } else {
                $stmt = $this->prepare(
                    "SELECT COUNT(*) as count
                     FROM notifications
                     WHERE user_id = ?"
                );

                if (!$stmt) {
                    error_log("NotificationService::getTotalCount() prepare failed: " . $this->conn->error);
                    return 0;
                }

                $stmt->bind_param("i", $userId);
                $stmt->execute();
            }

            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();

            return (int)($row['count'] ?? 0);
        } catch (Exception $e) {
            error_log("NotificationService::getTotalCount() error: " . $e->getMessage());
            return 0;
        }
    }

    /* =====================================================
     * BACKWARD COMPATIBILITY: Log to system_logs
     * ===================================================== */
    public function log(
        string $action,
        string $entity = null,
        int $entityId = null,
        int $userId = null
    ): bool {
        try {
            $userIdParam = $userId;
            $entityParam = $entity;
            $entityIdParam = $entityId;

            $stmt = $this->prepare(
                "INSERT INTO system_logs (user_id, action, entity, entity_id)
                 VALUES (?, ?, ?, ?)"
            );

            if (!$stmt) {
                error_log("NotificationService::log() prepare failed: " . $this->conn->error);
                return false;
            }

            $stmt->bind_param(
                "issi",
                $userIdParam,
                $action,
                $entityParam,
                $entityIdParam
            );

            $result = $stmt->execute();
            
            if (!$result) {
                error_log("NotificationService::log() execute failed: " . $stmt->error);
            }
            
            $stmt->close();
            return $result;
        } catch (Exception $e) {
            error_log("NotificationService::log() error: " . $e->getMessage());
            return false;
        }
    }

    public function orderEvent(int $orderId, string $action, int $userId): bool
    {
        return $this->log($action, "orders", $orderId, $userId);
    }

    public function getRecentLogs(int $limit = 50): array
    {
        $stmt = $this->prepare(
            "SELECT sl.*, u.name AS user_name
             FROM system_logs sl
             LEFT JOIN users u ON sl.user_id = u.id
             ORDER BY sl.created_at DESC
             LIMIT ?"
        );

        $stmt->bind_param("i", $limit);
        $stmt->execute();

        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
}
