<?php
namespace App\Middlewares;

use App\Config\Env;

/**
 * CORS restrictivo SGFC.
 *
 *  - Solo permite el origen definido en CORS_ALLOWED_ORIGIN.
 *  - Maneja preflight OPTIONS y termina la respuesta inmediatamente.
 *  - Permite credenciales (cookies / sesión PHP) cuando CORS_ALLOW_CREDENTIALS=true.
 */
final class CorsMiddleware
{
    public static function handle(): void
    {
        $allowedOrigin = (string) Env::get('CORS_ALLOWED_ORIGIN', '');
        $allowCreds    = (bool)   Env::get('CORS_ALLOW_CREDENTIALS', true);

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // Si la petición viene del mismo XAMPP (mismo host), tolerar localhost variations.
        $allowedSet = array_filter([$allowedOrigin]);
        // En desarrollo, permitir también 127.0.0.1 equivalente
        if ($allowedOrigin && str_contains($allowedOrigin, 'localhost')) {
            $allowedSet[] = str_replace('localhost', '127.0.0.1', $allowedOrigin);
        }

        if ($origin && in_array($origin, $allowedSet, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
            header('Vary: Origin');
        } elseif ($origin === '' && !empty($allowedSet)) {
            // Mismo origen / archivo local - no añadimos cabecera.
        } else {
            // Origen no permitido - aún así enviamos cabeceras vacías para que el navegador rechace.
            header('Vary: Origin');
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
        header('Access-Control-Max-Age: 600');

        if ($allowCreds) {
            header('Access-Control-Allow-Credentials: true');
        }

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
