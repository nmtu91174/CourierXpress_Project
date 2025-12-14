<?php
// backend/services/TrackingService.php
// READ-ONLY service cho tracking timeline

require_once __DIR__ . "/../core/BaseService.php";

class TrackingService extends BaseService
{
    /**
     * Lấy lịch sử trạng thái của 1 đơn hàng
     */
    public function getOrderTracking(int $orderId): array
    {
        $stmt = $this->prepare("
            SELECT
                oh.id,
                oh.status_id,
                s.code        AS status_code,
                s.description AS status_label,
                oh.user_id,
                u.name        AS actor_name,
                oh.role,
                oh.note,
                oh.created_at
            FROM order_history oh
            INNER JOIN statuses s ON s.id = oh.status_id
            LEFT JOIN users u ON u.id = oh.user_id
            WHERE oh.order_id = ?
            ORDER BY oh.created_at ASC
        ");

        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $result = $stmt->get_result();

        $timeline = [];
        while ($row = $result->fetch_assoc()) {
            $timeline[] = [
                "status_id"    => (int)$row["status_id"],
                "status_code"  => $row["status_code"],
                "status_label" => $row["status_label"],
                "actor"        => [
                    "id"   => $row["user_id"] ? (int)$row["user_id"] : null,
                    "name" => $row["actor_name"],
                    "role" => $row["role"]
                ],
                "note"        => $row["note"],
                "created_at"  => $row["created_at"]
            ];
        }

        return $timeline;
    }
}
