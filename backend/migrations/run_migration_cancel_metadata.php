<?php
// Migration Script: Add cancel metadata to orders table
// Run this once to add previous_status, cancelled_at, cancelled_by columns

require_once __DIR__ . "/../db.php";

echo "Starting migration: Add cancel metadata to orders table...\n";

try {
    // Check if columns already exist
    $check = $conn->query("SHOW COLUMNS FROM orders LIKE 'previous_status'");
    if ($check->num_rows > 0) {
        echo "✓ Column 'previous_status' already exists\n";
    } else {
        $conn->query("ALTER TABLE orders ADD COLUMN previous_status INT NULL COMMENT 'Status before cancellation (for reopen)'");
        echo "✓ Added column 'previous_status'\n";
    }
    
    $check = $conn->query("SHOW COLUMNS FROM orders LIKE 'cancelled_at'");
    if ($check->num_rows > 0) {
        echo "✓ Column 'cancelled_at' already exists\n";
    } else {
        $conn->query("ALTER TABLE orders ADD COLUMN cancelled_at TIMESTAMP NULL COMMENT 'When order was cancelled'");
        echo "✓ Added column 'cancelled_at'\n";
    }
    
    $check = $conn->query("SHOW COLUMNS FROM orders LIKE 'cancelled_by'");
    if ($check->num_rows > 0) {
        echo "✓ Column 'cancelled_by' already exists\n";
    } else {
        $conn->query("ALTER TABLE orders ADD COLUMN cancelled_by INT NULL COMMENT 'User ID who cancelled the order'");
        echo "✓ Added column 'cancelled_by'\n";
    }
    
    // Add index
    $check = $conn->query("SHOW INDEX FROM orders WHERE Key_name = 'idx_orders_cancelled'");
    if ($check->num_rows > 0) {
        echo "✓ Index 'idx_orders_cancelled' already exists\n";
    } else {
        $conn->query("CREATE INDEX idx_orders_cancelled ON orders(cancelled_at, cancelled_by)");
        echo "✓ Added index 'idx_orders_cancelled'\n";
    }
    
    echo "\n✅ Migration completed successfully!\n";
    
} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

$conn->close();

