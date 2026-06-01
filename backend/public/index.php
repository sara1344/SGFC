<?php
/**
 * SGFC — Front controller del backend.
 *
 * Resuelve la ruta solicitada y delega al router de api.php.
 * URL base esperada: http://localhost/sgfc/backend/public/api/...
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/Helpers/Autoloader.php';
require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\App;
use App\Middlewares\CorsMiddleware;

App::boot(__DIR__ . '/../.env');

// CORS PRIMERO (responde preflight OPTIONS)
CorsMiddleware::handle();

// Parsear path relativo (quita /SGFC/backend/public si está en la URL).
// En Windows el filesystem es case-insensitive: el cliente puede pedir /sgfc/...
// y $_SERVER['SCRIPT_NAME'] viene como /SGFC/...  → comparar case-insensitive.
$uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$script = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));

if ($script !== '' && $script !== '/' && $script !== '\\') {
    if (stripos($uri, $script) === 0) {
        $uri = substr($uri, strlen($script));
    }
}
// Recortar el "/api" alternativo: si llega "/api/..." dejamos tal cual;
// si llega "/backend/public/api/..." (sin que SCRIPT_NAME haya coincidido)
// recortamos también ese prefijo conocido.
foreach (['/backend/public', '/public'] as $prefix) {
    if (stripos($uri, $prefix . '/') === 0) {
        $uri = substr($uri, strlen($prefix));
    }
}
$uri = '/' . trim($uri, '/');

// Cargar router y resolver
require __DIR__ . '/../routes/api.php';

\App\Routes\Router::dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $uri);
