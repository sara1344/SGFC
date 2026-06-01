<?php
namespace App\Config;

/**
 * Bootstrap general del backend SGFC.
 *
 *  - Carga el .env, configura cabeceras de seguridad y sesión segura.
 *  - Centraliza utilidades de respuesta JSON y logging mínimo.
 */
final class App
{
    public static function boot(string $envPath): void
    {
        Env::load($envPath);

        date_default_timezone_set('America/Bogota');

        // Errores: solo a log
        $debug = (bool) Env::get('APP_DEBUG', false);
        error_reporting($debug ? E_ALL : E_ALL & ~E_DEPRECATED & ~E_NOTICE);
        ini_set('display_errors', $debug ? '1' : '0');
        ini_set('log_errors', '1');
        $logPath = self::storagePath('logs/php-error.log');
        if (!is_dir(dirname($logPath))) {
            @mkdir(dirname($logPath), 0775, true);
        }
        ini_set('error_log', $logPath);

        // Cabeceras de seguridad básicas
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('X-XSS-Protection: 1; mode=block');

        // Sesión segura
        $sessionName = (string) Env::get('SESSION_NAME', 'SGFC_SESSION');
        session_name($sessionName);
        $lifetimeMinutes = (int) Env::get('SESSION_LIFETIME', 120);
        try {
            $lifetimeMinutes = \App\Services\SecurityConfigService::sessionLifetimeMinutes();
        } catch (\Throwable) {
            // Tabla aún no migrada o BD no disponible: usar .env
        }
        $lifetime = max(900, $lifetimeMinutes * 60);
        session_set_cookie_params([
            'lifetime' => $lifetime,
            'path'     => '/',
            'secure'   => false, // Cambiar a true en producción con HTTPS
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    public static function basePath(string $sub = ''): string
    {
        $base = dirname(__DIR__, 2);
        return $sub ? $base . DIRECTORY_SEPARATOR . ltrim($sub, '/\\') : $base;
    }

    public static function storagePath(string $sub = ''): string
    {
        return self::basePath('storage' . ($sub ? '/' . ltrim($sub, '/\\') : ''));
    }

    public static function json(array $payload, int $status = 200): never
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success(mixed $data = null, string $msg = 'OK', int $status = 200): never
    {
        self::json(['success' => true, 'message' => $msg, 'data' => $data], $status);
    }

    public static function error(string $msg = 'Error', int $status = 400, mixed $extra = null): never
    {
        $r = ['success' => false, 'message' => $msg];
        if ($extra !== null) {
            $r['errors'] = $extra;
        }
        self::json($r, $status);
    }

    public static function logError(string $tag, string $msg): void
    {
        $line = sprintf("[%s] %s | %s\n", date('c'), $tag, $msg);
        @error_log($line, 3, self::storagePath('logs/app.log'));
    }

    public static function logAccess(string $msg): void
    {
        $line = sprintf("[%s] %s\n", date('c'), $msg);
        @error_log($line, 3, self::storagePath('logs/access.log'));
    }

    public static function input(): array
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        if (!in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return [];
        }

        // CONTENT_TYPE a veces viene vacío según SAPI/proxy; HTTP_CONTENT_TYPE como respaldo.
        $ct = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

        $raw = file_get_contents('php://input');
        $trim = is_string($raw) ? ltrim($raw) : '';

        $declaresJson = stripos($ct, 'application/json') !== false;
        // Si el cuerpo empieza como JSON pero PHP no rellenó $_POST (cabecera rara / charset distinto).
        $looksLikeJson = $trim !== '' && ($trim[0] === '{' || $trim[0] === '[');

        if ($declaresJson || $looksLikeJson) {
            if ($trim === '') {
                return [];
            }
            $j = json_decode($trim, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                self::error('JSON inválido en el cuerpo de la petición.', 400);
            }
            return is_array($j) ? $j : [];
        }

        return $_POST;
    }
}
