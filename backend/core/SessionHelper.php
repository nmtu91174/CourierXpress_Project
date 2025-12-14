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
            
            // Kiểm tra nếu là localhost
            $isLocalhost = in_array($_SERVER['HTTP_HOST'] ?? '', [
                'localhost',
                'localhost:8888',
                '127.0.0.1',
                '127.0.0.1:8888'
            ]);
            
            if ($isHttps) {
                // Production HTTPS: dùng SameSite=None với Secure
                ini_set('session.cookie_samesite', 'None');
                ini_set('session.cookie_secure', 1);
            } elseif ($isLocalhost) {
                // Localhost HTTP: dùng Lax (không cần None vì không có cross-site issue)
                // Lax hoạt động tốt hơn trên localhost và không cần Secure flag
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
            // Không throw exception, chỉ log để không block request
        }
    }
}

