<?php
namespace App\Services;

use App\Config\App;
use App\Helpers\IpHelper;
use App\Models\AuditLog;
use App\Middlewares\AuthMiddleware;

final class AuditService
{
    public static function log(string $accion, ?string $entidad = null, mixed $entidadId = null, mixed $detalles = null): void
    {
        try {
            $user = AuthMiddleware::user();
            (new AuditLog())->insert([
                'id_persona'  => $user['id']      ?? null,
                'usuario'     => $user['usuario'] ?? null,
                'accion'      => $accion,
                'entidad'     => $entidad,
                'entidad_id'  => $entidadId !== null ? (string) $entidadId : null,
                'detalles'    => is_array($detalles) ? json_encode($detalles, JSON_UNESCAPED_UNICODE) : (string) $detalles,
                'ip'          => IpHelper::clientAddress(),
                'user_agent'  => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
            ]);
        } catch (\Throwable $e) {
            App::logError('AUDIT_LOG_FAILED', $accion . ' | ' . $e->getMessage());
        }
    }
}
