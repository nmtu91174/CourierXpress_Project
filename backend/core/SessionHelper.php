<?php
/**
 * SessionHelper.php
 * ------------------------------------
 * Cross-browser safe session cookie policy
 * - HTTP (dev): SameSite=Lax (Firefox/Chrome/Edge đều nhận)
 * - HTTPS:
 *    - same-host: Lax
 *    - cross-host (frontend khác domain): None + Secure
 */

class SessionHelper
{
    public static function start()
    {
        if (session_status() !== PHP_SESSION_NONE) {
            return;
        }

        try {
            // Detect HTTPS
            $isHttps =
                (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
                (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);

            // Server host (strip port)
            $hostHeader = $_SERVER['HTTP_HOST'] ?? '';
            $serverHost = strtolower(trim(preg_replace('/:\d+$/', '', $hostHeader)));

            // Origin host (strip port) if present
            $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
            $originHost = '';
            if ($origin) {
                $parsed = parse_url($origin);
                $originHost = strtolower(trim($parsed['host'] ?? ''));
            }

            // Decide SameSite policy
            // - HTTP: ALWAYS Lax (this fixes Firefox reject)
            // - HTTPS: if cross-host then None+Secure else Lax
            $sameSite = 'Lax';
            if ($isHttps) {
                if ($originHost !== '' && $originHost !== $serverHost) {
                    $sameSite = 'None';
                } else {
                    $sameSite = 'Lax';
                }
            } else {
                $sameSite = 'Lax';
            }

            $lifetime = 0;
            $path = '/';
            $domain = '';          // keep default host-only cookie
            $secure = $isHttps;    // Secure only on HTTPS
            $httponly = true;

            if (PHP_VERSION_ID >= 70300) {
                session_set_cookie_params([
                    'lifetime' => $lifetime,
                    'path' => $path,
                    'domain' => $domain,
                    'secure' => $secure,
                    'httponly' => $httponly,
                    'samesite' => $sameSite,
                ]);
            } else {
                session_set_cookie_params($lifetime, $path, $domain, $secure, $httponly);
                ini_set('session.cookie_samesite', $sameSite);
            }

            session_start();

        } catch (Throwable $e) {
            error_log("SessionHelper::start() error: " . $e->getMessage());
        }
    }
}
