<?php
/**
 * SessionHelper.php
 * ------------------------------------
 * Helper để config và start session đúng cách cho CORS
 */

class SessionHelper
{
    /**
     * Start session với config phù hợp cho CORS và credentials
     */
    public static function start()
    {
        if (session_status() !== PHP_SESSION_NONE) {
            return; // Session đã được start
        }

        try {
            // Config session cookie để hoạt động với CORS và credentials
            ini_set('session.cookie_httponly', 1);
            
            // Kiểm tra nếu đang dùng HTTPS
            $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') 
                          || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
            
            // Kiểm tra nếu là localhost (để nới lỏng SameSite)
            // Lấy HOST hiện tại để kiểm tra
            $httpHost = $_SERVER['HTTP_HOST'] ?? '';
            $isLocalhost = strpos($httpHost, 'localhost') !== false || strpos($httpHost, '127.0.0.1') !== false;
            
            if ($isHttps) {
                // Production HTTPS: dùng SameSite=None với Secure=1
                ini_set('session.cookie_samesite', 'None');
                ini_set('session.cookie_secure', 1);
            } elseif ($isLocalhost) {
                // SỬA CHỮA LỖI COOKIE/CORS: 
                // Sử dụng 'Lax' cho HTTP Localhost để tránh chặn cookie session
                ini_set('session.cookie_samesite', 'Lax'); 
                ini_set('session.cookie_secure', 0);
            } else {
                // Fallback: dùng Lax
                ini_set('session.cookie_samesite', 'Lax');
                ini_set('session.cookie_secure', 0);
            }
            
            // Set domain và path
            ini_set('session.cookie_path', '/');
            
            session_start();
        } catch (Exception $e) {
            error_log("SessionHelper::start() error: " . $e->getMessage());
        }
    }

    // =========================================================
    // ✅ BỔ SUNG: CÁC PHƯƠNG THỨC THAO TÁC SESSION QUAN TRỌNG
    // =========================================================

    /**
     * Lưu thông tin người dùng vào session sau khi đăng nhập thành công
     * @param array $user Thông tin user (cần có 'id' và 'role')
     */
    public static function setCurrentUser(array $user): void
    {
        self::start(); // BẮT BUỘC: phải start session trước khi gán
        $_SESSION['user_id'] = $user['id'];
        // Bạn đã sử dụng user_role trong các API, đảm bảo lưu đúng tên key
        $_SESSION['user_role'] = $user['role']; 
    }

    /**
     * Trả về ID người dùng đang đăng nhập
     */
    public static function getCurrentUserId(): int
    {
        self::start(); // BẮT BUỘC: phải start session trước khi đọc
        return $_SESSION['user_id'] ?? 0;
    }
    
    /**
     * Trả về Role người dùng đang đăng nhập
     */
    public static function getCurrentUserRole(): string
    {
        self::start(); // BẮT BUỘC: phải start session trước khi đọc
        // Bạn đã sử dụng user_role trong các API, đảm bảo đọc đúng tên key
        return $_SESSION['user_role'] ?? 'guest'; 
    }
    
    /**
     * Hủy session
     */
    public static function logout(): void
    {
        self::start();
        session_unset();
        session_destroy();
    }
}
?>