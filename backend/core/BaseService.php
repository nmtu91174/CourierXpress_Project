<?php
// backend/core/BaseService.php

/**
 * BaseService.php
 * ------------------------------------------------
 * Base class cho toàn bộ Service layer
 *
 * Chức năng:
 * - Giữ DB connection (mysqli)
 * - Quản lý transaction (BEGIN / COMMIT / ROLLBACK)
 * - Chuẩn hoá prepare SQL
 * - Ghi log hệ thống (app.log)
 * - Ghi audit log nghiệp vụ (audit.log)
 *
 * KHÔNG chứa business logic
 * An toàn cho PHP 7.x / 8.x
 */

// ⚠️ KHÔNG require db.php ở đây
// db.php chỉ include ở API layer rồi truyền $conn vào constructor

class BaseService
{
    /** @var mysqli */
    protected $conn;

    public function __construct($conn)
    {
        if (!$conn instanceof mysqli) {
            throw new Exception("Invalid database connection");
        }
        $this->conn = $conn;
    }

    /* =====================================================
     * TRANSACTION WRAPPER
     * ===================================================== */
    protected function transaction(callable $callback)
    {
        $this->conn->begin_transaction();

        try {
            $result = $callback();
            $this->conn->commit();
            return $result;
        } catch (Throwable $e) {
            $this->conn->rollback();
            $this->logApp("ERROR", $e->getMessage());
            throw $e;
        }
    }

    /* =====================================================
     * PREPARE STATEMENT
     * ===================================================== */
    protected function prepare($sql)
    {
        $stmt = $this->conn->prepare($sql);

        if (!$stmt) {
            $this->logApp("SQL_ERROR", $this->conn->error);
            throw new Exception("Database prepare failed");
        }

        return $stmt;
    }

    /* =====================================================
     * SYSTEM LOG
     * ===================================================== */
    protected function logApp($level, $message)
    {
        $line = sprintf(
            "[%s] [%s] %s\n",
            date("Y-m-d H:i:s"),
            strtoupper($level),
            $message
        );

        $logFile = __DIR__ . "/../logs/app.log";

        if (!is_dir(dirname($logFile))) {
            mkdir(dirname($logFile), 0777, true);
        }

        file_put_contents($logFile, $line, FILE_APPEND);
    }

    /* =====================================================
     * AUDIT LOG (BUSINESS)
     * ===================================================== */
    protected function logAudit(
        $userId,
        $role,
        $action,
        $orderId = null,
        $note = ""
    ) {
        $line = sprintf(
            "[%s] user=%s role=%s action=%s order=%s note=%s\n",
            date("Y-m-d H:i:s"),
            $userId,
            $role,
            $action,
            $orderId !== null ? $orderId : "N/A",
            $note
        );

        $logFile = __DIR__ . "/../logs/audit.log";

        if (!is_dir(dirname($logFile))) {
            mkdir(dirname($logFile), 0777, true);
        }

        file_put_contents($logFile, $line, FILE_APPEND);
    }
}
