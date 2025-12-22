-- ============================================
--  SCHEMA UPDATE: Add Cancel Metadata Support
-- ============================================


-- 1. Add 'cancelled' status (ID = 7)
INSERT INTO statuses (code, description)
VALUES ('cancelled', 'Đơn hàng đã bị hủy')
ON DUPLICATE KEY UPDATE description = 'Đơn hàng đã bị hủy';

-- 2. Add cancel metadata columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS previous_status INT NULL COMMENT 'Status before cancellation (for reopen)',
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL COMMENT 'When order was cancelled',
ADD COLUMN IF NOT EXISTS cancelled_by INT NULL COMMENT 'User ID who cancelled the order';

-- 3. Add index for faster queries on cancelled orders
CREATE INDEX IF NOT EXISTS idx_orders_cancelled ON orders(cancelled_at, cancelled_by);

-
