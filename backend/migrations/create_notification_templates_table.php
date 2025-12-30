<?php
// backend/migrations/create_notification_templates_table.php
// Migration: Create notification_templates table

require_once __DIR__ . "/../db.php";

echo "Running migration: Create notification_templates table...\n";

// Check if table already exists
$checkTable = $conn->query("
    SELECT COUNT(*) as count 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'notification_templates'
");

$exists = $checkTable->fetch_assoc()['count'] > 0;

if ($exists) {
    echo "Table 'notification_templates' already exists. Skipping migration.\n";
    exit(0);
}

// Create table
$sql = "
CREATE TABLE notification_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('order', 'system', 'warning') NOT NULL DEFAULT 'order',
    title_template VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
";

if ($conn->query($sql)) {
    echo "✅ Migration successful: Created notification_templates table.\n";
} else {
    echo "❌ Migration failed: " . $conn->error . "\n";
    exit(1);
}

$conn->close();

