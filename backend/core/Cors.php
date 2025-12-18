<?php
/**
 * Cors.php
 * ------------------------------------
 * Helper để set CORS headers đúng cách
 * Hỗ trợ credentials mode (cookie/session)
 *
 * RULE:
 * - Khi dùng credentials => Access-Control-Allow-Origin KHÔNG ĐƯỢC là '*'
 * - Chỉ cho phép Origin nằm trong whitelist
 * - OPTIONS phải exit sớm
 */

class Cors
{
    /**
     * Danh sách Origin được phép (DEV)
     * (Team bắt buộc thống nhất dùng localhost hoặc 127.0.0.1 để tránh lệch cookie)
     */
    private static function allowedOrigins()
    {
        return [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
        ];
    }

    /**
     * Set CORS headers (credentials-safe)
     */
    public static function setHeaders()
    {
        $allowedOrigins = self::allowedOrigins();
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // ✅ IMPORTANT: prevent caches mixing responses for different origins
        header("Vary: Origin");

        if ($origin && in_array($origin, $allowedOrigins, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header("Access-Control-Allow-Credentials: true");
        } else {
            /**
             * ✅ SAFE MODE:
             * - Không set Allow-Origin nếu origin không nằm whitelist
             * - Tránh “defaultOrigin” vì có thể vô tình mở dữ liệu cho origin lạ
             *
             * (Nếu request là same-origin / tool nội bộ thì không cần CORS)
             */
        }

        // Methods
        header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");

        // Headers: ưu tiên echo lại đúng request headers nếu có (preflight)
        $reqHeaders = $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ?? '';
        if ($reqHeaders) {
            header("Access-Control-Allow-Headers: {$reqHeaders}");
        } else {
            header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        }

        // Optional: cache preflight (giảm lag)
        header("Access-Control-Max-Age: 600");

        // Content-Type (chỉ set khi response JSON; nếu có endpoint trả file thì endpoint đó tự set)
        header("Content-Type: application/json; charset=utf-8");
    }

    /**
     * Handle OPTIONS preflight
     * MUST exit before middleware
     */
    public static function handlePreflight()
    {
        if (($_SERVER["REQUEST_METHOD"] ?? '') === "OPTIONS") {
            self::setHeaders();
            http_response_code(200);
            exit();
        }
    }
}
