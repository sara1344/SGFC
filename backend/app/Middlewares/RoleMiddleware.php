<?php
namespace App\Middlewares;

use App\Config\App;
use App\Services\PermissionService;

/**
 * Restringe el endpoint a roles específicos.
 *
 * Usage:
 *   RoleMiddleware::requireRole(['Super Admin', 'Administrativo']);
 *
 * Los nombres deben coincidir con `perfil.nombre_perfil` (canonical lower-snake)
 * o con el `rol_label` mapeado en AuthService (Super Admin / Administrativo /
 * Contratista).
 */
final class RoleMiddleware
{
    /**
     * Mapa de `perfil.nombre_perfil` (canónico en BD) ↔ label visible al frontend.
     *   - administrador  → Super Admin  (tipo_perfil = 1)
     *   - administrativo_centro → Administrativo de Centro (tipo_perfil = 4)
     *   - contratista    → Contratista (tipo_perfil = 3)
     */
    public const LABELS = [
        'administrador'  => 'Super Admin',
        'administrativo_centro' => 'Administrativo de Centro',
        'administrador_regional' => 'Administrativo de Centro',
        'contratista'    => 'Contratista',
        // Aliases por compatibilidad
        'super_admin'    => 'Super Admin',
    ];

    public static function requireStaff(): void
    {
        self::requireRole(PermissionService::STAFF_LABELS);
    }

    public static function requireRole(array $allowed): void
    {
        $user = AuthMiddleware::check();
        $rol  = $user['rol_label'] ?? '';

        // Permitir referirse al rol con el label visible o con el nombre BD
        $allowedSet = [];
        foreach ($allowed as $a) {
            $allowedSet[] = $a;
            // Si pasaron 'super_admin' añadimos 'Super Admin'
            foreach (self::LABELS as $k => $v) {
                if ($a === $k) {
                    $allowedSet[] = $v;
                }
                if ($a === $v) {
                    $allowedSet[] = $k;
                }
            }
        }

        if (!in_array($rol, $allowedSet, true)) {
            App::error("Acceso denegado: el rol '{$rol}' no tiene permiso para este recurso.", 403);
        }
    }

    public static function hasRole(array $user, array $allowed): bool
    {
        $rol = $user['rol_label'] ?? '';
        $allowedSet = [];
        foreach ($allowed as $a) {
            $allowedSet[] = $a;
            foreach (self::LABELS as $k => $v) {
                if ($a === $k) {
                    $allowedSet[] = $v;
                }
                if ($a === $v) {
                    $allowedSet[] = $k;
                }
            }
        }
        return in_array($rol, $allowedSet, true);
    }
}
