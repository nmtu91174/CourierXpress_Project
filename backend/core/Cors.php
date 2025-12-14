<?php
/**
 * Cors.php
 * ------------------------------------
 * Helper để set CORS headers đúng cách
 * Hỗ trợ credentials mode
 */

class Cors
{
    /**
     * Set CORS headers với support credentials
     * QUY TẮC VÀNG: Khi dùng credentials, PHẢI set origin cụ thể, KHÔNG được dùng *
     */
    public static function setHeaders()
    {
        $allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000'
        ];

        $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
        
        // ⭐ QUAN TRỌNG: Luôn set origin cụ thể khi có trong whitelist
        // Không được fallback về * vì sẽ conflict với credentials
        if ($origin && in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: $origin");
            header("Access-Control-Allow-Credentials: true");
        } else {
            // Nếu origin không có trong whitelist, vẫn set origin cụ thể (không dùng *)
            // Hoặc có thể set origin đầu tiên trong whitelist làm default
            $defaultOrigin = $allowedOrigins[0]; // http://localhost:5173
            header("Access-Control-Allow-Origin: $defaultOrigin");
            header("Access-Control-Allow-Credentials: true");
        }

        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        header("Content-Type: application/json; charset=utf-8");
    }

    /**
     * Handle preflight OPTIONS request
     * QUAN TRỌNG: Phải exit() ngay để không chạy vào middleware
     */
    public static function handlePreflight()
    {
        if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
            self::setHeaders();
            http_response_code(200);
            exit(); // BẮT BUỘC exit để không chạy vào middleware
        }
    }
}

