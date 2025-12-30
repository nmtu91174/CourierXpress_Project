<?php
// backend/migrations/run_all_migrations.php
// Run all migrations for the 4 new features

echo "========================================\n";
echo "Running Migrations for 4 New Features\n";
echo "========================================\n\n";

// Migration 1: Add expected_delivery_date column
echo "1. Adding expected_delivery_date column to orders table...\n";
require_once __DIR__ . "/add_expected_delivery_date.php";
echo "\n";

// Migration 2: Create notification_templates table
echo "2. Creating notification_templates table...\n";
require_once __DIR__ . "/create_notification_templates_table.php";
echo "\n";

echo "========================================\n";
echo "✅ All migrations completed!\n";
echo "========================================\n";

