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
            
            // ⭐ QUAN TRỌNG: Dùng session_set_cookie_params() để đảm bảo cookie được set đúng cách
            $lifetime = 0; // Session cookie (expires khi đóng browser)
            $path = '/';
            $domain = ''; // Để trống để dùng domain hiện tại (localhost)
            $secure = $isHttps; // Secure chỉ khi HTTPS
            $httponly = true; // HttpOnly để bảo vệ khỏi XSS
            
            // ⭐ FIX: Trên localhost HTTP, vẫn dùng None (browsers hiện đại cho phép)
            // Vì cần CORS với credentials từ frontend (port 5173) đến backend (port 8888)
            if ($isHttps) {
                $samesite = 'None'; // HTTPS: dùng None với Secure=1
            } elseif ($isLocalhost) {
                $samesite = 'None'; // Localhost HTTP: dùng None với Secure=0 (browsers cho phép)
            } else {
                $samesite = 'Lax'; // Fallback: dùng Lax
            }
            
            // PHP 7.3+ hỗ trợ SameSite trong session_set_cookie_params
            if (PHP_VERSION_ID >= 70300) {
                session_set_cookie_params([
                    'lifetime' => $lifetime,
                    'path' => $path,
                    'domain' => $domain,
                    'secure' => $secure,
                    'httponly' => $httponly,
                    'samesite' => $samesite
                ]);
            } else {
                // PHP < 7.3: dùng cách cũ + set SameSite qua ini_set
                session_set_cookie_params($lifetime, $path, $domain, $secure, $httponly);
                ini_set('session.cookie_samesite', $samesite);
            }
            
            // ⭐ QUAN TRỌNG: Start session
            // PHP sẽ tự động write session khi script kết thúc
            session_start();
            
        } catch (Exception $e) {
            error_log("SessionHelper::start() error: " . $e->getMessage());
            // Không throw exception, chỉ log để không block request
        }
    }
}

