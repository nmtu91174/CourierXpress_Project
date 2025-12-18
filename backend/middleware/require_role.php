<?php
// middleware/require_role.php
// =====================================================
// MIDDLEWARE: REQUIRE ROLE (ENTERPRISE SAFE)
// - Normalize role (lowercase + trim)
// - Support multiple roles
// - Strict RBAC, no magic
// =====================================================

require_once __DIR__ . "/../core/Response.php";

function require_role($roles = [])
{
    // ==========================
    // AUTH CHECK
    // ==========================
    if (!isset($GLOBALS['auth_user']) || empty($GLOBALS['auth_user'])) {
        Response::unauthorized("Chưa xác thực");
        exit;
    }

    // ==========================
    // NORMALIZE USER ROLE
    // ==========================
    $rawUserRole = $GLOBALS['auth_user']['role'] ?? "";
    $userRole = strtolower(trim($rawUserRole));

    // ==========================
    // NORMALIZE ALLOWED ROLES
    // ==========================
    $allowedRoles = array_map(
        function ($r) {
            return strtolower(trim($r));
        },
        (array)$roles
    );

    // ==========================
    // ROLE CHECK
    // ==========================
    if ($userRole === "" || !in_array($userRole, $allowedRoles, true)) {
        Response::forbidden("Không có quyền truy cập");
        exit;
    }
}
