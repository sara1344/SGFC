<?php
namespace App\Middlewares;

use App\Config\App;

/**
 * Verifica que exista una sesión activa válida.
 *
 *  - Se basa en $_SESSION['user'] (creada por AuthController::login).
 *  - Devuelve 401 JSON si no hay sesión, deteniendo la ejecución.
 *  - Refresca el timestamp de actividad y expira si excede SESSION_LIFETIME.
 */
final class AuthMiddleware
{
    public static function check(): array
    {
        if (empty($_SESSION['user']) || empty($_SESSION['user']['id'])) {
            App::error('No autenticado. Inicie sesión.', 401);
        }

        // Timeout de inactividad
        $lifetime = 120;
        try {
            $lifetime = \App\Services\SecurityConfigService::sessionLifetimeMinutes();
        } catch (\Throwable) {
            $lifetime = (int) (\App\Config\Env::get('SESSION_LIFETIME', 120));
        }
        $lifetime *= 60;
        $last = $_SESSION['last_activity'] ?? time();
        if (time() - $last > $lifetime) {
            session_unset();
            session_destroy();
            App::error('La sesión expiró por inactividad.', 401);
        }
        $_SESSION['last_activity'] = time();

        return $_SESSION['user'];
    }

    public static function user(): ?array
    {
        return $_SESSION['user'] ?? null;
    }
}
