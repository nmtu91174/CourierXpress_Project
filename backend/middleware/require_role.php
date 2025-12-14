<?php
// middleware/require_role.php

require_once __DIR__ . "/../core/Response.php";

function require_role($roles = [])
{
    // ==========================
    // AUTH CHECK
    // ==========================
    if (!isset($GLOBALS['auth_user']) || empty($GLOBALS['auth_user'])) {
        Response::unauthorized("Chưa xác thực");
        exit; // 
    }

    $userRole = $GLOBALS['auth_user']['role'] ?? null;

    // ==========================
    // ROLE CHECK
    // ==========================
    if (!$userRole || !in_array($userRole, (array)$roles, true)) {
        Response::forbidden("Không có quyền truy cập");
        exit; // 
    }

}
