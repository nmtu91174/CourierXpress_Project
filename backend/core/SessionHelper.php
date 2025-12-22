<?php
/**
 * SessionHelper.php
 * -------------------------------------------------
 * FINAL, PRODUCTION-GRADE SESSION HANDLER
 *
 * Goals:
 * - Cross-browser safe (Chrome / Firefox / Edge / Safari)
 * - RFC-compliant (SameSite / Secure rules)
 * - Works with FE/BE different ports or domains
 * - Safe for HTTP dev & HTTPS production
 * - Passes security review / audit
 *
 * Rules:
 * - HTTP (dev): SameSite=Lax, Secure=false
 * - HTTPS:
 *   - same-host: SameSite=Lax
 *   - cross-host: SameSite=None + Secure (MANDATORY)
 */

class SessionHelper
{
    public static function start(): void
    {
        if (session_status() !== PHP_SESSION_NONE) {
            return;
        }

        try {
            /* -----------------------------------------
             * Security hardening
             * ---------------------------------------*/
            ini_set('session.use_strict_mode', '1');
            ini_set('session.use_only_cookies', '1');

            /* -----------------------------------------
             * Detect HTTPS (proxy-safe)
             * ---------------------------------------*/
            $isHttps =
                (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
                || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);

            /* -----------------------------------------
             * Resolve server host (strip port)
             * ---------------------------------------*/
            $hostHeader = $_SERVER['HTTP_HOST'] ?? '';
            $serverHost = strtolower(preg_replace('/:\d+$/', '', trim($hostHeader)));

            /* -----------------------------------------
             * Resolve origin host (strip port)
             * ---------------------------------------*/
            $originHost = '';
            if (!empty($_SERVER['HTTP_ORIGIN'])) {
                $parsed = parse_url($_SERVER['HTTP_ORIGIN']);
                $originHost = strtolower(trim($parsed['host'] ?? ''));
            }

            /* -----------------------------------------
             * Decide SameSite policy
             * ---------------------------------------*/
            $sameSite = 'Lax';

            if ($isHttps && $originHost !== '' && $originHost !== $serverHost) {
                // Cross-host over HTTPS
                $sameSite = 'None';
            }

            /* -----------------------------------------
             * Secure flag (RFC-compliant)
             * ---------------------------------------*/
            // RFC: SameSite=None REQUIRES Secure=true
            $secure = $isHttps || ($sameSite === 'None');

            /* -----------------------------------------
             * Cookie params
             * ---------------------------------------*/
            $params = [
                'lifetime' => 0,
                'path'     => '/',
                'domain'   => '',      // host-only cookie
                'secure'   => $secure,
                'httponly' => true,
                'samesite' => $sameSite,
            ];

            /* -----------------------------------------
             * Apply cookie params
             * ---------------------------------------*/
            if (PHP_VERSION_ID >= 70300) {
                session_set_cookie_params($params);
            } else {
                session_set_cookie_params(
                    $params['lifetime'],
                    $params['path'],
                    $params['domain'],
                    $params['secure'],
                    $params['httponly']
                );
                ini_set('session.cookie_samesite', $sameSite);
            }

            session_start();

        } catch (Throwable $e) {
            error_log('SessionHelper::start() fatal error: ' . $e->getMessage());
        }
    }
}
