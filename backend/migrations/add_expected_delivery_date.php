<?php
// backend/migrations/add_expected_delivery_date.php
// Migration: Add expected_delivery_date column to orders table

require_once __DIR__ . "/../db.php";

echo "Running migration: Add expected_delivery_date column to orders table...\n";

// Check if column already exists
$checkColumn = $conn->query("
    SELECT COUNT(*) as count 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'orders' 
    AND COLUMN_NAME = 'expected_delivery_date'
");

$exists = $checkColumn->fetch_assoc()['count'] > 0;

if ($exists) {
    echo "Column 'expected_delivery_date' already exists. Skipping migration.\n";
    exit(0);
}

// Add column
$sql = "ALTER TABLE orders ADD COLUMN expected_delivery_date DATE NULL AFTER created_at";

if ($conn->query($sql)) {
    echo "✅ Migration successful: Added expected_delivery_date column to orders table.\n";
} else {
    echo "❌ Migration failed: " . $conn->error . "\n";
    exit(1);
}

$conn->close();

