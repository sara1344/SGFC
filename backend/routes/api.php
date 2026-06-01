<?php
/**
 * SGFC — Definición de rutas REST y router minimalista.
 *
 * Patrones soportados:
 *   /api/auth/login
 *   /api/users
 *   /api/users/{id}            (id se convierte automáticamente a int)
 *   /api/pdf/admin-sign
 *
 * Cada ruta declara: método HTTP, patrón, controlador, acción.
 */

namespace App\Routes;

use App\Config\App;
use App\Controllers\AuthController;
use App\Controllers\UserController;
use App\Controllers\CatalogController;
use App\Controllers\ContractController;
use App\Controllers\PeriodController;
use App\Controllers\EvidenceController;
use App\Controllers\UploadController;
use App\Controllers\ReviewController;
use App\Controllers\PdfController;
use App\Controllers\ZipController;
use App\Controllers\NotificationController;
use App\Controllers\DashboardController;
use App\Controllers\SuperAdminController;
use App\Controllers\SystemConfigController;
use App\Middlewares\AuthMiddleware;

final class Router
{
    private const ROUTES = [
        // Auth (públicas)
        ['GET',    '/api/auth/recaptcha-config',     AuthController::class,         'recaptchaConfig', false],
        ['POST',   '/api/auth/login',                AuthController::class,         'login',     false],
        ['POST',   '/api/auth/logout',               AuthController::class,         'logout',    true ],
        ['GET',    '/api/auth/me',                   AuthController::class,         'me',        true ],

        // Catálogos
        ['GET',    '/api/catalog/regionales-centros', CatalogController::class,    'regionalesCentros', true ],

        // Usuarios
        ['GET',    '/api/users',                     UserController::class,         'index',     true ],
        ['POST',   '/api/users',                     UserController::class,         'store',     true ],
        ['GET',    '/api/users/{id}',                UserController::class,         'show',      true ],
        ['PUT',    '/api/users/{id}',                UserController::class,         'update',    true ],
        ['DELETE', '/api/users/{id}',                UserController::class,         'destroy',   true ],

        // Contratos
        ['GET',    '/api/contracts',                 ContractController::class,     'index',     true ],
        ['POST',   '/api/contracts',                 ContractController::class,     'store',     true ],
        ['GET',    '/api/contracts/{id}',            ContractController::class,     'show',      true ],
        ['PUT',    '/api/contracts/{id}',            ContractController::class,     'update',    true ],
        ['DELETE', '/api/contracts/{id}',            ContractController::class,     'destroy',   true ],

        // Periodos
        ['GET',    '/api/periods',                   PeriodController::class,       'index',     true ],
        ['GET',    '/api/periods/{id}',              PeriodController::class,       'show',      true ],
        ['PUT',    '/api/periods/{id}',              PeriodController::class,       'update',    true ],
        ['POST',   '/api/periods/{id}/assign',       PeriodController::class,       'assignEvidences', true],

        // Evidencias (catálogo master)
        ['GET',    '/api/evidences',                 EvidenceController::class,     'index',     true ],
        ['GET',    '/api/evidences/tree',            EvidenceController::class,     'tree',      true ],
        ['POST',   '/api/evidences',                 EvidenceController::class,     'store',     true ],
        ['PUT',    '/api/evidences/{id}',            EvidenceController::class,     'update',    true ],
        ['DELETE', '/api/evidences/{id}',            EvidenceController::class,     'destroy',   true ],
        ['POST',   '/api/subgroups',                 EvidenceController::class,     'createSubgroup', true],

        // Uploads (carga de evidencias)
        ['POST',   '/api/uploads/evidence',          UploadController::class,       'store',     true ],
        ['GET',    '/api/uploads/evidence/{id}',     UploadController::class,       'show',      true ],
        ['GET',    '/api/uploads/evidence/{id}/view',     UploadController::class,  'viewInline',true ],
        ['GET',    '/api/uploads/evidence/{id}/preview',  UploadController::class,  'previewHtml', true ],
        ['GET',    '/api/uploads/evidence/{id}/download', UploadController::class,  'download',  true ],

        // Revisión
        ['GET',    '/api/reviews',                   ReviewController::class,       'index',     true ],
        ['POST',   '/api/reviews/{id}/approve',      ReviewController::class,       'approve',   true ],
        ['POST',   '/api/reviews/{id}/reject',       ReviewController::class,       'reject',    true ],
        ['GET',    '/api/reviews/{id}/history',      ReviewController::class,       'history',   true ],

        // PDF unificado y firmas
        ['POST',   '/api/pdf/merge',                 PdfController::class,          'merge',           true],
        ['GET',    '/api/pdf/pending-admin',         PdfController::class,          'pendingForAdmin', true],
        ['GET',    '/api/pdf/signed',                PdfController::class,          'signed',          true],
        ['GET',    '/api/pdf/mine',                  PdfController::class,          'mine',            true],
        ['POST',   '/api/pdf/admin-sign',            PdfController::class,          'adminSign',       true],
        ['POST',   '/api/pdf/contractor-sign',       PdfController::class,          'contractorSign',  true],
        ['GET',    '/api/pdf/unified/{id}',          PdfController::class,          'viewUnified',     true],
        ['GET',    '/api/pdf/final/{id}/download',   PdfController::class,          'downloadFinal',   true],

        // Paquetes ZIP GC
        ['POST',   '/api/zip/pack-gc',               ZipController::class,          'packGc',          true],
        ['GET',    '/api/zip/mine',                  ZipController::class,          'mine',            true],
        ['GET',    '/api/zip/admin',                 ZipController::class,          'adminList',       true],
        ['GET',    '/api/zip/{id}/download',         ZipController::class,          'download',        true],

        // Notificaciones
        ['GET',    '/api/notifications',             NotificationController::class, 'index',     true ],
        ['GET',    '/api/notifications/{id}',        NotificationController::class, 'show',      true ],
        ['PUT',    '/api/notifications/{id}/read',   NotificationController::class, 'markRead',  true ],
        ['PUT',    '/api/notifications/read-all',    NotificationController::class, 'markAllRead', true],

        // Dashboards
        ['GET',    '/api/dashboard/admin',           DashboardController::class,    'admin',     true ],
        ['GET',    '/api/dashboard/avance-regionales', DashboardController::class,  'avanceRegionales', true ],
        ['GET',    '/api/dashboard/contractor',      DashboardController::class,    'contractor',true ],
        ['GET',    '/api/dashboard/superadmin',      DashboardController::class,    'superAdmin',true ],
        ['GET',    '/api/dashboard/export',          DashboardController::class,    'exportExcel', true ],

        // Auditoría
        ['GET',    '/api/audit-logs',                SuperAdminController::class,   'audit',       true ],
        ['GET',    '/api/audit-logs/meta',           SuperAdminController::class,   'auditMeta',   true ],
        ['GET',    '/api/audit-logs/export',         SuperAdminController::class,   'auditExport', true ],

        // Configuración del sistema
        ['GET',    '/api/public/institucional',      SystemConfigController::class, 'institutionalPublic', false ],
        ['GET',    '/api/system-config/institucional', SystemConfigController::class, 'institutionalShow',   true ],
        ['PUT',    '/api/system-config/institucional', SystemConfigController::class, 'institutionalUpdate', true ],
        ['GET',    '/api/system-config/seguridad',   SystemConfigController::class, 'securityShow',   true ],
        ['PUT',    '/api/system-config/seguridad',   SystemConfigController::class, 'securityUpdate', true ],
        ['GET',    '/api/system-config/calendario',  SystemConfigController::class, 'calendarShow',   true ],
        ['PUT',    '/api/system-config/calendario',  SystemConfigController::class, 'calendarUpdate', true ],
        ['GET',    '/api/system-config/notificaciones', SystemConfigController::class, 'notificationsShow',   true ],
        ['PUT',    '/api/system-config/notificaciones', SystemConfigController::class, 'notificationsUpdate', true ],
        ['POST',   '/api/system-config/notificaciones/test-email', SystemConfigController::class, 'notificationsTestEmail', true ],
        ['GET',    '/api/system-config/modulos',       SystemConfigController::class, 'modulesShow',   true ],
        ['PUT',    '/api/system-config/modulos',       SystemConfigController::class, 'modulesUpdate', true ],

        // Health check
        ['GET',    '/api/ping',                      AuthController::class,         'me',        false], // si no hay sesión también retorna info
    ];

    public static function dispatch(string $method, string $uri): void
    {
        $method = strtoupper($method);

        // Health check sin sesión
        if ($uri === '/api/ping' && $method === 'GET') {
            App::success([
                'ok' => true,
                'time' => date('c'),
                'app' => 'SGFC',
            ]);
        }

        foreach (self::ROUTES as [$m, $pattern, $ctrl, $action, $auth]) {
            if ($m !== $method) {
                continue;
            }
            $regex = self::patternToRegex($pattern);
            if (preg_match($regex, $uri, $matches)) {
                if ($auth) {
                    AuthMiddleware::check();
                }
                $args = [];
                foreach ($matches as $k => $v) {
                    if (!is_int($k)) {
                        $args[] = ctype_digit($v) ? (int) $v : $v;
                    }
                }
                $instance = new $ctrl();
                call_user_func_array([$instance, $action], $args);
                return;
            }
        }

        // 404
        App::error('Endpoint no encontrado: ' . $method . ' ' . $uri, 404);
    }

    private static function patternToRegex(string $pattern): string
    {
        $regex = preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern);
        return '#^' . $regex . '$#';
    }
}
