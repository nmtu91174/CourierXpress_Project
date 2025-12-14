<?php
/**
 * =====================================================
 * MIDDLEWARE: REQUIRE LOGIN
 * - Ưu tiên SESSION
 * - Fallback TOKEN (Authorization: Bearer xxx)
 * - SET $GLOBALS['auth_user'] DUY NHẤT
 * - KHÔNG auto-exit khi require file
 * - GỌI QUA function require_login()
 * =====================================================
 */

require_once __DIR__ . "/../db.php";
require_once __DIR__ . "/../core/Response.php";
require_once __DIR__ . "/../core/SessionHelper.php";

if (!function_exists("require_login")) {

    function require_login()
    {
        // ==========================
        // START SESSION (SAFE)
        // ==========================
        SessionHelper::start();

        // ==========================
        // 1️⃣ AUTH VIA SESSION
        // ==========================
        if (isset($_SESSION["user"]) && is_array($_SESSION["user"])) {
            $GLOBALS["auth_user"] = $_SESSION["user"];
            return;
        }

        // ==========================
        // 2️⃣ AUTH VIA BEARER TOKEN
        // ==========================
        $headers = function_exists("getallheaders") ? getallheaders() : [];

        $authHeader =
            $headers["Authorization"]
            ?? $headers["authorization"]
            ?? "";

        if ($authHeader && stripos($authHeader, "Bearer ") === 0) {
            $token = trim(substr($authHeader, 7));

            if ($token !== "") {
                global $conn;

                $stmt = $conn->prepare("
                    SELECT id, role, status, name, email, phone
                    FROM users
                    WHERE token = ? AND status = 'active'
                    LIMIT 1
                ");

                if (!$stmt) {
                    error_log("AUTH PREPARE ERROR: " . $conn->error);
                    Response::serverError("Authentication error");
                }

                $stmt->bind_param("s", $token);
                $stmt->execute();
                $res  = $stmt->get_result();
                $user = $res->fetch_assoc();
                $stmt->close();

                if ($user) {
                    $GLOBALS["auth_user"] = $user;
                    return;
                }
            }
        }

        // ==========================
        // 3️⃣ AUTH FAILED
        // ==========================
        Response::unauthorized("Chưa đăng nhập hoặc phiên đăng nhập không hợp lệ");
    }
}
