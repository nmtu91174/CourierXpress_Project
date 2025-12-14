<?php
// backend/services/NotificationService.php
// Chuẩn enterprise – match system_logs table

require_once __DIR__ . "/../core/BaseService.php";

class NotificationService extends BaseService
{
    /* =====================================================
     * GHI SYSTEM LOG (DB)
     * ===================================================== */
    public function log(
        string $action,
        string $entity = null,
        int $entityId = null,
        int $userId = null
    ): bool {
        try {
            // Xử lý null values - MySQLi bind_param cần biến tham chiếu
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
            // Log error nhưng không throw để không block flow
            error_log("NotificationService::log() error: " . $e->getMessage());
            return false;
        } catch (Error $e) {
            error_log("NotificationService::log() fatal error: " . $e->getMessage());
            return false;
        }
    }

    /* =====================================================
     * LOG LIÊN QUAN ĐƠN HÀNG
     * ===================================================== */
    public function orderEvent(
        int $orderId,
        string $action,
        int $userId
    ): bool {
        return $this->log(
            $action,
            "orders",
            $orderId,
            $userId
        );
    }

    /* =====================================================
     * DEMO EMAIL (KHÔNG GỬI THẬT)
     * ===================================================== */
    public function emailDemo(
        string $to,
        string $subject,
        int $userId = null
    ): bool {
        return $this->log(
            "Send email to {$to} | {$subject}",
            "email",
            null,
            $userId
        );
    }

    /* =====================================================
     * DEMO PUSH (FUTURE)
     * ===================================================== */
    public function pushDemo(
        int $userId,
        string $title
    ): bool {
        return $this->log(
            "Push notification: {$title}",
            "push",
            null,
            $userId
        );
    }

    /* =====================================================
     * ADMIN DASHBOARD – LOG GẦN ĐÂY
     * ===================================================== */
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
